// CU003 Paso 6 – flujo normal: publicación exitosa e IGU_POPUP_COMPROBANTE_PUBLICACION
describe('Publicación exitosa – flujo normal', () => {
  beforeEach(() => {
    cy.visitarApp();
    cy.irAPublicar();
  });

  it('Criterio 1: con foto → comprobante "Activo" y el servicio aparece primero con su miniatura', () => {
    cy.completarValido({ fotos: ['foto1.jpg'] });
    cy.publicar();

    cy.get('#modal-comprobante').should('be.visible').within(() => {
      cy.get('[role="dialog"]').should('have.attr', 'aria-modal', 'true');
      cy.get('.modal__icono--exito').should('exist');
      cy.get('#titulo-comprobante').should('have.text', 'Servicio publicado con exito');
      cy.get('#comp-nombre').should('have.text', 'Pastas Caseras');
      cy.get('#comp-estado').should('have.text', 'Activo');
      cy.get('#comp-horarios').should('have.text', 'Lu., Ma. 05:30hs a 12:00hs');
      cy.get('#comp-precios').should('have.text', '$255 - $255 por persona');
      cy.get('#texto-comprobante').should('have.text',
        'Tu oferta gastronomica ya se encuentra disponible para todos los clientes dentro del radio de cobertura');
      cy.get('.resumen dt').then(($dt) => {
        expect([...$dt].map((d) => d.textContent)).to.deep.equal(['Servicio:', 'Estado:', 'Días y horarios:', 'Rango de precios:']);
      });
    });

    cy.get('#btn-ir-mis-servicios').click();
    cy.get('#pantalla-mis-servicios').should('be.visible');
    cy.get('.tarjeta').should('have.length', 4);
    cy.get('.tarjeta').first().within(() => {
      cy.get('.tarjeta__nombre').should('have.text', 'Pastas Caseras');
      cy.get('img.tarjeta__imagen').should('have.attr', 'src').and('match', /^data:image\/jpeg;base64,/);
      cy.get('.chip--activo').should('have.text', 'Activo');
      cy.get('.tarjeta__horario').should('have.text', 'Lu., Ma. 05:30hs a 12:00hs');
    });
  });

  it('Criterio 2: sin foto → la tarjeta muestra el placeholder de cámara', () => {
    cy.completarValido();
    cy.publicar();
    cy.get('#btn-ir-mis-servicios').click();
    cy.get('.tarjeta').first().find('.tarjeta__placeholder').should('exist');
    cy.get('.tarjeta').first().find('img').should('not.exist');
  });

  it('Criterio 3: valores límite válidos se publican', () => {
    cy.completarValido({
      nombre: 'A'.repeat(25),
      descripcion: 'a'.repeat(350),
      horaDesde: '00:00',
      horaHasta: '23:59',
      precioMin: '1'.repeat(20),
      precioMax: '1'.repeat(20),
    });
    cy.publicar();
    cy.get('#modal-comprobante').should('be.visible');
    cy.get('#comp-horarios').should('contain.text', '00:00hs a 23:59hs');
  });

  it('Criterio 8b: descripción con puntuación básica se publica', () => {
    cy.completarValido({ descripcion: 'Entrada, plato principal y postre. Salsa: pomarola (casera) - opcional' });
    cy.publicar();
    cy.get('#modal-comprobante').should('be.visible');
  });

  it('acepta letras con acentos y ñ en nombre y descripción', () => {
    cy.completarValido({ nombre: 'Ñoquis caseros de Güemes', descripcion: 'Ñoquis, salsa de tomate y albahaca. Postre: flan.' });
    cy.publicar();
    cy.get('#modal-comprobante').should('be.visible');
  });

  it('Criterio 8c: varias fotos (jpg + png) se publican y se guardan', () => {
    cy.completarValido({ fotos: ['foto1.jpg', 'foto2.png'] });
    cy.publicar();
    cy.get('#modal-comprobante').should('be.visible');
    cy.serviciosGuardados().then((s) => expect(s[0].fotos).to.have.length(2));
  });

  it('Criterio 8d: 20:00 a 00:00 (medianoche) se publica y muestra "20:00hs a 00:00hs"', () => {
    cy.completarValido({ horaDesde: '20:00', horaHasta: '00:00' });
    cy.publicar();
    cy.get('#comp-horarios').should('have.text', 'Lu., Ma. 20:00hs a 00:00hs');
  });

  it('formatea días consecutivos como rango ("Lu. a Vi.") y precios con miles argentinos', () => {
    cy.completarValido({ dias: ['L', 'M', 'X', 'J', 'V'], precioMin: '15000', precioMax: '20000,5' });
    cy.publicar();
    cy.get('#comp-horarios').should('have.text', 'Lu. a Vi. 05:30hs a 12:00hs');
    cy.get('#comp-precios').should('have.text', '$15.000 - $20.000,5 por persona');
  });

  it('formatea días salteados como lista ("Lu., Mi., Vi.")', () => {
    cy.completarValido({ dias: ['L', 'X', 'V'] });
    cy.publicar();
    cy.get('#comp-horarios').should('have.text', 'Lu., Mi., Vi. 05:30hs a 12:00hs');
  });

  it('muestra "Publicando…" con spinner y el botón deshabilitado mientras verifica disponibilidad', () => {
    cy.completarValido();
    cy.publicar();
    cy.get('#btn-publicar')
      .should('be.disabled')
      .and('have.attr', 'aria-busy', 'true')
      .and('have.class', 'btn--cargando')
      .and('contain.text', 'Publicando…');
    cy.get('#btn-publicar .spinner').should('be.visible');
    cy.get('#btn-cancelar').should('be.disabled');
    cy.get('#modal-comprobante').should('be.visible');
  });

  it('evita el doble envío (Nielsen #5): un segundo submit no registra otro servicio', () => {
    cy.completarValido();
    cy.get('#form-publicar').then(($f) => {
      $f[0].requestSubmit();
      $f[0].requestSubmit();
    });
    cy.get('#modal-comprobante').should('be.visible');
    cy.serviciosGuardados().should('have.length', 4);
  });

  it('Enter en un campo envía el formulario (Shneiderman #2)', () => {
    cy.completarValido();
    cy.get('#precioMax').type('{enter}');
    cy.get('#modal-comprobante').should('be.visible');
  });

  it('Postcondición: el servicio queda persistido como Activo, asociado al Cocinero y visible en su radio', () => {
    cy.completarValido({ horaDesde: '20:00', horaHasta: '00:00', precioMin: '10,5', precioMax: '11.25' });
    cy.publicar();
    cy.get('#modal-comprobante').should('be.visible');
    cy.serviciosGuardados().then((servicios) => {
      const s = servicios[0];
      expect(s).to.include({
        nombre: 'Pastas Caseras',
        estado: 'Activo',
        horaDesde: '20:00',
        horaHasta: '00:00',
        precioMin: 10.5,
        precioMax: 11.25,
        radioVisibilidadKm: 5,
      });
      expect(s.dias).to.deep.equal(['L', 'M']);
      expect(s.cocinero).to.deep.equal({ id: 'coc-001', nombre: 'Ramiro Staropoli' });
      expect(s.fechaPublicacion).to.be.a('string');
    });
  });

  describe('Criterio 14: ambos botones del comprobante llevan a Mis servicios con el nuevo servicio', () => {
    ['#btn-ir-mis-servicios', '#btn-comprobante-cerrar', '.modal__cerrar'].forEach((boton) => {
      it(`con ${boton}`, () => {
        cy.completarValido();
        cy.publicar();
        cy.get(`#modal-comprobante ${boton}`).click();
        cy.get('#modal-comprobante').should('not.be.visible');
        cy.get('#pantalla-mis-servicios').should('be.visible');
        cy.get('#pantalla-publicar').should('not.be.visible');
        cy.get('.tarjeta').should('have.length', 4).first().should('contain.text', 'Pastas Caseras');
      });
    });
  });

  it('el servicio nuevo se resalta brevemente y recibe el foco', () => {
    cy.completarValido();
    cy.publicar();
    cy.get('#btn-ir-mis-servicios').click();
    cy.get('.tarjeta').first().should('have.class', 'tarjeta--nueva');
    cy.focused().should('have.class', 'tarjeta').and('contain.text', 'Pastas Caseras');
    cy.get('.tarjeta').first().should('not.have.class', 'tarjeta--nueva'); // se quita al terminar la animación (3 s)
    cy.get('.tarjeta.tarjeta--nueva').should('not.exist');
  });

  it('al volver a "Publicar nuevo servicio" el formulario está limpio', () => {
    cy.completarValido({ fotos: ['foto1.jpg'] });
    cy.publicar();
    cy.get('#btn-ir-mis-servicios').click();
    cy.irAPublicar();
    cy.get('#nombre').should('have.value', '');
    cy.get('#contador-nombre').should('have.text', '0/25');
    cy.get('.dia[aria-pressed="true"]').should('not.exist');
    cy.get('#lista-fotos .miniatura').should('not.exist');
  });

  it('los servicios publicados persisten al recargar la página', () => {
    cy.completarValido();
    cy.publicar();
    cy.get('#btn-ir-mis-servicios').click();
    cy.reload();
    cy.get('.tarjeta').should('have.length', 4).first().should('contain.text', 'Pastas Caseras');
  });
});
