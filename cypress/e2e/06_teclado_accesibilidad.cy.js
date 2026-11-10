// Criterio 15 – Teclado, foco y accesibilidad (Shneiderman #2, Nielsen #3/#4/#7)
// Usa cypress-real-events (eventos reales por CDP): requiere Electron/Chrome.

/** Presiona Tab hasta que el foco quede en el selector (máximo 40 intentos). */
const tabHasta = (selector, intentos = 40) => {
  // document.activeElement en vez de cy.focused(): al inicio el foco está en <body> y cy.focused() fallaría
  cy.document({ log: false }).then((doc) => {
    if (doc.activeElement && doc.activeElement.matches(selector)) return;
    if (intentos === 0) throw new Error(`No se llegó con Tab a ${selector}`);
    cy.realPress('Tab');
    tabHasta(selector, intentos - 1);
  });
};

describe('Teclado y accesibilidad', () => {
  beforeEach(() => cy.visitarApp());

  it('Criterio 15: todo el flujo de publicación se completa sin mouse', () => {
    tabHasta('#btn-nuevo-servicio');
    cy.realPress('Enter');
    cy.focoEn('#nombre');
    cy.realType('Empanadas caseras');
    cy.realPress('Tab');
    cy.focoEn('#descripcion');
    cy.realType('Empanadas de carne cortada a cuchillo, al horno.');
    cy.realPress('Tab');
    // toggles de días con Space y Enter
    cy.focoEn('.dia[data-dia="L"]');
    cy.realPress('Space');
    cy.realPress('Tab');
    cy.realPress('Enter');
    cy.get('.dia[data-dia="L"]').should('have.attr', 'aria-pressed', 'true');
    cy.get('.dia[data-dia="M"]').should('have.attr', 'aria-pressed', 'true');
    tabHasta('#horaDesde');
    cy.realType('11:00');
    cy.realPress('Tab');
    cy.focoEn('#horaHasta');
    cy.realType('15:30');
    cy.realPress('Tab');
    cy.focoEn('#precioMin');
    cy.realType('9000');
    cy.realPress('Tab');
    cy.focoEn('#precioMax');
    cy.realType('12000');
    cy.realPress('Enter'); // Enter envía el formulario
    cy.get('#modal-comprobante').should('be.visible');
    cy.focoEn('#btn-ir-mis-servicios');
    cy.realPress('Enter');
    cy.get('#pantalla-mis-servicios').should('be.visible');
    cy.focused().should('have.class', 'tarjeta').and('contain.text', 'Empanadas caseras');
    cy.get('.tarjeta').first().find('.tarjeta__horario').should('have.text', 'Lu., Ma. 11:00hs a 15:30hs');
  });

  it('FA 6 por teclado: Enter con errores → Esc acepta, resalta y enfoca el primer error', () => {
    cy.irAPublicar();
    cy.focoEn('#nombre');
    cy.realPress('Enter');
    cy.get('#modal-error').should('be.visible');
    cy.focoEn('#btn-error-aceptar');
    cy.realPress('Escape');
    cy.get('#modal-error').should('not.be.visible');
    cy.get('.campo--error').should('have.length', 7);
    cy.focoEn('#nombre');
  });

  it('FA 6 por teclado: Enter sobre "Aceptar"', () => {
    cy.irAPublicar();
    cy.realPress('Enter');
    cy.focoEn('#btn-error-aceptar');
    cy.realPress('Enter');
    cy.get('#modal-error').should('not.be.visible');
    cy.focoEn('#nombre');
  });

  it('FA 5 por teclado: Cancelar → Esc vuelve al formulario con el foco en Cancelar', () => {
    cy.irAPublicar();
    cy.realType('Sushi');
    tabHasta('#btn-cancelar');
    cy.realPress('Enter');
    cy.get('#modal-cancelar').should('be.visible');
    cy.focoEn('#btn-cancelar-no');
    cy.realPress('Escape');
    cy.get('#modal-cancelar').should('not.be.visible');
    cy.focoEn('#btn-cancelar');
    cy.get('#nombre').should('have.value', 'Sushi');
    // y confirmar con teclado
    cy.realPress('Enter');
    cy.realPress(['Shift', 'Tab']);
    cy.focoEn('#btn-cancelar-si');
    cy.realPress('Enter');
    cy.get('#pantalla-mis-servicios').should('be.visible');
    cy.get('.tarjeta').should('have.length', 3);
  });

  it('Esc en el comprobante equivale a "Cerrar"', () => {
    cy.irAPublicar();
    cy.completarValido();
    cy.publicar();
    cy.get('#modal-comprobante').should('be.visible');
    cy.realPress('Escape');
    cy.get('#pantalla-mis-servicios').should('be.visible');
    cy.get('.tarjeta').should('have.length', 4);
  });

  it('el foco queda atrapado dentro del popup (Tab y Shift+Tab)', () => {
    cy.irAPublicar();
    cy.completarValido();
    cy.publicar();
    cy.focoEn('#btn-ir-mis-servicios');
    cy.realPress('Tab');
    cy.focoEn('#btn-comprobante-cerrar');
    cy.realPress('Tab');
    cy.focoEn('#modal-comprobante .modal__cerrar'); // vuelve al primero
    cy.realPress(['Shift', 'Tab']);
    cy.focoEn('#btn-comprobante-cerrar'); // y al revés al último
    for (let i = 0; i < 6; i++) cy.realPress('Tab');
    cy.focused().closest('#modal-comprobante').should('exist');
  });

  it('con un popup abierto el contenido de fondo queda inerte y el body no scrollea', () => {
    cy.irAPublicar();
    cy.publicar();
    cy.get('#app').should('have.prop', 'inert', true);
    cy.get('body').should('have.class', 'con-modal');
    cy.get('#btn-error-aceptar').click();
    cy.get('#app').should('have.prop', 'inert', false);
    cy.get('body').should('not.have.class', 'con-modal');
  });

  it('menú ☰ por teclado: Enter abre, flechas navegan, Esc cierra y devuelve el foco', () => {
    tabHasta('.tarjeta__btn-menu');
    cy.realPress('Enter');
    cy.focused().should('have.attr', 'role', 'menuitem').and('have.text', 'Editar');
    cy.realPress('ArrowDown');
    cy.focused().should('have.text', 'Configurar checklist');
    cy.realPress('ArrowDown');
    cy.focused().should('have.text', 'Editar'); // circular
    cy.realPress('ArrowUp');
    cy.focused().should('have.text', 'Configurar checklist');
    cy.realPress('Escape');
    cy.get('.menu-contextual:visible').should('not.exist');
    cy.focused().should('have.class', 'tarjeta__btn-menu').and('have.attr', 'aria-expanded', 'false');
  });

  it('el tooltip del perfil muestra "Ramiro Staropoli" con foco y con hover', () => {
    const tooltip = ($el) => getComputedStyle($el[0], '::after');
    cy.get('[aria-label="Perfil de Ramiro Staropoli"]').as('perfil');
    cy.get('@perfil').should(($el) => expect(tooltip($el).opacity).to.eq('0'));
    // con foco de teclado
    tabHasta('[aria-label="Perfil de Ramiro Staropoli"]');
    cy.get('@perfil').should(($el) => {
      expect(tooltip($el).opacity).to.eq('1');
      expect(tooltip($el).content).to.eq('"Ramiro Staropoli"');
    });
    cy.realPress('Tab');
    cy.get('@perfil').should(($el) => expect(tooltip($el).opacity).to.eq('0'));
    // con el mouse
    cy.get('@perfil').realHover();
    cy.get('@perfil').should(($el) => expect(tooltip($el).opacity).to.eq('1'));
    cy.get('#titulo-mis-servicios').realHover();
    cy.get('@perfil').should(($el) => expect(tooltip($el).opacity).to.eq('0'));
  });

  it('el foco visible tiene contorno en los controles', () => {
    tabHasta('#btn-nuevo-servicio');
    cy.focused().should('have.css', 'outline-style', 'solid').and('have.css', 'outline-width', '3px');
    cy.realPress('Enter');
    tabHasta('.dia[data-dia="L"]');
    cy.focused().should('have.css', 'outline-style', 'solid');
  });

  it('el link "Saltar al contenido" es el primer elemento enfocable', () => {
    cy.realPress('Tab');
    cy.focused().should('have.class', 'saltar-contenido').and('be.visible');
  });

  describe('semántica ARIA', () => {
    it('cada campo tiene <label> asociado o pertenece a un grupo con leyenda', () => {
      cy.irAPublicar();
      ['nombre', 'descripcion', 'horaDesde', 'horaHasta', 'precioMin', 'precioMax'].forEach((id) => {
        cy.get(`label[for="${id}"]`).should('exist');
        cy.get(`#${id}`).should('have.attr', 'aria-required', 'true');
      });
      cy.get('#campo-dias legend').should('contain.text', 'Días de disponibilidad');
      cy.get('#grupo-dias').should('have.attr', 'role', 'group');
    });

    it('los tres popups son role="dialog" con aria-modal y título asociado', () => {
      ['modal-error', 'modal-cancelar', 'modal-comprobante'].forEach((id) => {
        cy.get(`#${id} .modal`)
          .should('have.attr', 'role', 'dialog')
          .and('have.attr', 'aria-modal', 'true')
          .invoke('attr', 'aria-labelledby')
          .then((tituloId) => cy.get(`#${tituloId}`).should('exist'));
      });
    });

    it('los íconos del header y los botones de ícono tienen aria-label', () => {
      cy.get('button.icono-boton, .fab, .modal__cerrar').each(($b) => {
        expect($b.attr('aria-label'), $b[0].outerHTML.slice(0, 80)).to.be.a('string').and.not.be.empty;
      });
    });

    it('aria-describedby del campo con error incluye el mensaje y se limpia al corregir', () => {
      cy.irAPublicar();
      cy.publicar();
      cy.get('#btn-error-aceptar').click();
      cy.get('#horaDesde').should('have.attr', 'aria-describedby', 'error-horaDesde ayuda-horaDesde');
      cy.get('#grupo-dias').should('have.attr', 'aria-invalid', 'true')
        .and('have.attr', 'aria-describedby').and('contain', 'error-dias');
      cy.get('#horaDesde').type('1');
      cy.get('#horaDesde').should('have.attr', 'aria-describedby', 'ayuda-horaDesde');
    });

    it('anuncia la publicación en la región aria-live', () => {
      cy.get('#anuncio').should('have.attr', 'aria-live', 'polite');
      cy.irAPublicar();
      cy.completarValido();
      cy.publicar();
      cy.get('#anuncio').should('have.text', 'Servicio publicado con éxito');
    });
  });

  describe('responsive (celular 375 px)', () => {
    beforeEach(() => cy.viewport(375, 812));

    it('el formulario no tiene scroll horizontal y los días entran en una fila', () => {
      cy.irAPublicar();
      cy.document().then((doc) => {
        expect(doc.documentElement.scrollWidth).to.be.at.most(375);
      });
      cy.get('.dia').then(($d) => {
        const filas = new Set([...$d].map((d) => Math.round(d.getBoundingClientRect().top)));
        expect(filas.size).to.eq(1);
      });
    });

    it('el comprobante muestra el resumen apilado y entra en pantalla', () => {
      cy.irAPublicar();
      cy.completarValido();
      cy.publicar();
      cy.get('#modal-comprobante .modal').should(($m) => {
        const r = $m[0].getBoundingClientRect();
        expect(r.left).to.be.at.least(0);
        expect(r.right).to.be.at.most(375);
      });
    });
  });
});
