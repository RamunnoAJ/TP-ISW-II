// FA 5 – El Cocinero cancela la operación (IGU_POPUP_CANCELACION)
describe('FA 5 – Cancelar', () => {
  beforeEach(() => {
    cy.visitarApp();
    cy.irAPublicar();
  });

  it('con el formulario vacío vuelve directo a Mis servicios sin pedir confirmación', () => {
    cy.get('#btn-cancelar').click();
    cy.get('#modal-cancelar').should('not.be.visible');
    cy.get('#pantalla-mis-servicios').should('be.visible');
    cy.get('.tarjeta').should('have.length', 3);
  });

  it('un formulario con solo espacios se considera vacío', () => {
    cy.get('#nombre').type('   ');
    cy.get('#btn-cancelar').click();
    cy.get('#pantalla-mis-servicios').should('be.visible');
  });

  // Cualquier dato cargado (texto, día o foto) exige confirmación
  [
    { titulo: 'un texto', datos: { nombre: 'Sushi' } },
    { titulo: 'un día', datos: { dias: ['D'] } },
    { titulo: 'una foto', datos: { fotos: ['foto1.jpg'] } },
  ].forEach(({ titulo, datos }) => {
    it(`con ${titulo} cargado pide confirmación (FA 5.2)`, () => {
      cy.completarFormulario(datos);
      cy.get('#btn-cancelar').click();
      cy.get('#modal-cancelar').should('be.visible');
    });
  });

  describe('IGU_POPUP_CANCELACION', () => {
    beforeEach(() => {
      cy.completarValido({ fotos: ['foto1.jpg'] });
      cy.get('#btn-cancelar').click();
    });

    it('muestra la pregunta, la aclaración y los botones con el estilo correcto', () => {
      cy.get('#modal-cancelar').within(() => {
        cy.get('[role="dialog"]').should('have.attr', 'aria-modal', 'true')
          .and('have.attr', 'aria-labelledby', 'titulo-cancelar');
        cy.get('#titulo-cancelar').should('have.text', '¿Está seguro que desea cancelar?');
        cy.get('#texto-cancelar').should('have.text', 'Se perderán los datos ingresados');
        cy.get('#btn-cancelar-no').should('have.text', 'No, volver').and('have.class', 'btn--primario');
        cy.get('#btn-cancelar-si').should('have.text', 'Sí, cancelar').and('have.class', 'btn--destructivo');
      });
      // la opción segura tiene el foco inicial
      cy.focoEn('#btn-cancelar-no');
    });

    it('Criterio 11: "Sí, cancelar" descarta los datos y vuelve sin registrar (FA 5.3/5.4)', () => {
      cy.get('#btn-cancelar-si').click();
      cy.get('#modal-cancelar').should('not.be.visible');
      cy.get('#pantalla-mis-servicios').should('be.visible');
      cy.get('.tarjeta').should('have.length', 3);
      cy.contains('.tarjeta__nombre', 'Pastas Caseras').should('not.exist');
      cy.serviciosGuardados().should('have.length', 3);
      // los datos fueron descartados
      cy.irAPublicar();
      cy.get('#nombre').should('have.value', '');
      cy.get('.dia[aria-pressed="true"]').should('not.exist');
      cy.get('#lista-fotos .miniatura').should('not.exist');
    });

    it('Criterio 12: "No, volver" cierra el popup y conserva todos los datos', () => {
      cy.get('#btn-cancelar-no').click();
      cy.get('#modal-cancelar').should('not.be.visible');
      cy.get('#pantalla-publicar').should('be.visible');
      cy.get('#nombre').should('have.value', 'Pastas Caseras');
      cy.get('#descripcion').should('have.value', 'Entrada y plato principal');
      cy.get('.dia[aria-pressed="true"]').should('have.length', 2);
      cy.get('#horaDesde').should('have.value', '05:30');
      cy.get('#horaHasta').should('have.value', '12:00');
      cy.get('#precioMin').should('have.value', '255');
      cy.get('#precioMax').should('have.value', '255');
      cy.get('#lista-fotos .miniatura').should('have.length', 1);
      cy.focoEn('#btn-cancelar'); // el foco vuelve al elemento que abrió el popup
    });

    it('la X equivale a "No, volver"', () => {
      cy.get('#modal-cancelar .modal__cerrar').click();
      cy.get('#modal-cancelar').should('not.be.visible');
      cy.get('#nombre').should('have.value', 'Pastas Caseras');
    });

    it('Esc equivale a "No, volver"', () => {
      cy.get('body').type('{esc}');
      cy.get('#modal-cancelar').should('not.be.visible');
      cy.get('#pantalla-publicar').should('be.visible');
      cy.get('#nombre').should('have.value', 'Pastas Caseras');
    });

    it('después de "No, volver" se puede publicar normalmente', () => {
      cy.get('#btn-cancelar-no').click();
      cy.publicar();
      cy.get('#modal-comprobante').should('be.visible');
    });
  });
});
