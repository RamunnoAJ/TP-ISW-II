// IGU_MIS_SERVICIOS – CU003 Pasos 1 y 2
describe('IGU_MIS_SERVICIOS', () => {
  context('con los servicios de ejemplo', () => {
    beforeEach(() => cy.visitarApp());

    it('muestra el header común con logo, notificaciones y perfil del Cocinero', () => {
      cy.get('.encabezado .marca').should('have.text', 'Provecho');
      cy.get('.encabezado [aria-label="Notificaciones"]').should('be.visible');
      cy.get('.encabezado [aria-label="Perfil de Ramiro Staropoli"]')
        .should('be.visible')
        .and('have.attr', 'data-tooltip', 'Ramiro Staropoli');
    });

    it('muestra el título y los 3 servicios precargados en orden', () => {
      cy.title().should('eq', 'Mis servicios · Provecho');
      cy.get('#titulo-mis-servicios').should('have.text', 'Servicios publicados');
      cy.get('.tarjeta').should('have.length', 3);
      cy.get('.tarjeta__nombre').then(($n) => {
        expect([...$n].map((n) => n.textContent)).to.deep.equal([
          'Pastas caseras a la pomarola',
          'Cocina tailandesa',
          'Sushi',
        ]);
      });
      cy.get('#estado-vacio').should('not.be.visible');
    });

    it('cada tarjeta tiene miniatura/placeholder, nombre, descripción truncada, chip "Activo", días y horario, y menú', () => {
      cy.get('.tarjeta').first().within(() => {
        cy.get('.tarjeta__placeholder[aria-label="Sin foto"] svg').should('exist');
        cy.get('.tarjeta__nombre').should('have.text', 'Pastas caseras a la pomarola');
        cy.get('.chip--activo').should('have.text', 'Activo');
        cy.get('.tarjeta__horario').should('have.text', 'Lu. a Vi. 12:30hs a 15:00hs');
        cy.get('.tarjeta__descripcion')
          .should('have.css', 'text-overflow', 'ellipsis')
          .and('have.css', 'white-space', 'nowrap')
          .and(($p) => {
            // la descripción completa no entra en una línea → se trunca con "…"
            expect($p[0].scrollWidth).to.be.greaterThan($p[0].clientWidth);
            expect($p.attr('title')).to.contain('Entrada, plato principal y postre');
          });
        cy.get('.tarjeta__btn-menu').should('have.attr', 'aria-label', 'Opciones de Pastas caseras a la pomarola');
      });
      cy.get('.tarjeta').eq(1).find('.tarjeta__horario').should('have.text', 'Vi., Sá. 20:00hs a 00:00hs');
      cy.get('.tarjeta').eq(2).find('.tarjeta__horario').should('have.text', 'Ju. a Do. 19:30hs a 23:30hs');
    });

    it('el botón flotante "+" tiene aria-label y tooltip "Publicar nuevo servicio"', () => {
      cy.get('#btn-nuevo-servicio')
        .should('be.visible')
        .and('have.attr', 'aria-label', 'Publicar nuevo servicio')
        .and('have.attr', 'data-tooltip', 'Publicar nuevo servicio')
        .and('have.css', 'position', 'fixed');
    });

    it('el menú ☰ muestra opciones deshabilitadas y la leyenda de fuera de alcance', () => {
      cy.get('.tarjeta__btn-menu').first().as('btnMenu').should('have.attr', 'aria-expanded', 'false').click();
      cy.get('@btnMenu').should('have.attr', 'aria-expanded', 'true');
      cy.get('.menu-contextual:visible').within(() => {
        cy.get('[role="menuitem"]').should('have.length', 2).each(($i) => {
          expect($i).to.have.attr('aria-disabled', 'true');
        });
        cy.contains('[role="menuitem"]', 'Editar');
        cy.contains('[role="menuitem"]', 'Configurar checklist');
        cy.contains('No disponible en este prototipo');
      });
      // las opciones no hacen nada
      cy.contains('[role="menuitem"]', 'Editar').click();
      cy.get('#pantalla-mis-servicios').should('be.visible');
      // clic afuera lo cierra
      cy.get('#titulo-mis-servicios').click();
      cy.get('.menu-contextual:visible').should('not.exist');
      cy.get('@btnMenu').should('have.attr', 'aria-expanded', 'false');
    });

    it('abrir un menú cierra el otro', () => {
      // se abre primero el de abajo: el menú desplegado tapa la tarjeta siguiente, no la anterior
      cy.get('.tarjeta__btn-menu').eq(1).click();
      cy.get('.tarjeta__btn-menu').eq(0).click();
      cy.get('.menu-contextual:visible').should('have.length', 1);
      cy.get('.tarjeta__btn-menu').eq(1).should('have.attr', 'aria-expanded', 'false');
      cy.get('.tarjeta__btn-menu').eq(0).should('have.attr', 'aria-expanded', 'true');
    });

    it('"Reiniciar datos de prueba" restaura los 3 servicios de ejemplo', () => {
      cy.irAPublicar();
      cy.completarValido();
      cy.publicar();
      cy.get('#btn-ir-mis-servicios').click();
      cy.get('.tarjeta').should('have.length', 4);
      cy.get('#btn-reiniciar').click();
      cy.get('.tarjeta').should('have.length', 3);
      cy.serviciosGuardados().should('have.length', 3);
      cy.get('#anuncio').should('have.text', 'Se reiniciaron los datos de prueba');
    });
  });

  context('sin servicios publicados', () => {
    beforeEach(() => cy.visitarApp({ servicios: [] }));

    it('muestra el estado vacío con llamado a la acción', () => {
      cy.get('.tarjeta').should('not.exist');
      cy.get('#estado-vacio').should('be.visible').and('contain.text', 'Todavía no publicaste servicios');
      cy.get('#btn-publicar-primero').click();
      cy.get('#pantalla-publicar').should('be.visible');
    });

    it('al publicar el primero desaparece el estado vacío', () => {
      cy.get('#btn-publicar-primero').click();
      cy.completarValido();
      cy.publicar();
      cy.get('#btn-ir-mis-servicios').click();
      cy.get('#estado-vacio').should('not.be.visible');
      cy.get('.tarjeta').should('have.length', 1);
    });
  });
});
