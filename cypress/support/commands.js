// Comandos reutilizables. Los selectores usan los id de index.html.

export const CLAVE_STORAGE = 'provecho.cu003.servicios.v1';

export const CAMPOS_TEXTO = {
  nombre: '#nombre',
  descripcion: '#descripcion',
  horaDesde: '#horaDesde',
  horaHasta: '#horaHasta',
  precioMin: '#precioMin',
  precioMax: '#precioMax',
};

/**
 * Abre la app. Opciones:
 *  - servicios: array a precargar en localStorage ([] = estado vacío). Si se omite, se usan los de ejemplo.
 */
Cypress.Commands.add('visitarApp', ({ servicios } = {}) => {
  cy.visit('index.html', {
    onBeforeLoad(win) {
      win.localStorage.clear();
      if (servicios !== undefined) win.localStorage.setItem(CLAVE_STORAGE, JSON.stringify(servicios));
    },
  });
  cy.get('#pantalla-mis-servicios').should('be.visible');
});

/** CU003 - Pasos 3 y 4: botón "+" → formulario. */
Cypress.Commands.add('irAPublicar', () => {
  cy.get('#btn-nuevo-servicio').click();
  cy.get('#pantalla-publicar').should('be.visible');
});

/** Escribe en un campo de texto (vacío = solo limpia). */
Cypress.Commands.add('escribir', (selector, valor) => {
  cy.get(selector).clear();
  if (valor) {
    // Textos largos: se asignan directo para no hacer lento el test (el input dispara la misma lógica)
    if (valor.length > 60) cy.get(selector).invoke('val', valor).trigger('input');
    else cy.get(selector).type(valor, { delay: 0, parseSpecialCharSequences: false });
  }
});

/** Completa el formulario con los datos indicados (campos omitidos quedan como están). */
Cypress.Commands.add('completarFormulario', (datos = {}) => {
  Object.entries(CAMPOS_TEXTO).forEach(([campo, selector]) => {
    if (campo in datos) cy.escribir(selector, datos[campo]);
  });
  if (datos.dias) {
    datos.dias.forEach((dia) => cy.get(`.dia[data-dia="${dia}"]`).click());
  }
  if (datos.fotos && datos.fotos.length) {
    cy.get('#input-fotos').selectFile(datos.fotos.map((f) => `cypress/fixtures/${f}`), { force: true });
    cy.get('#lista-fotos .miniatura').should('have.length', datos.fotos.length);
  }
});

/** Completa con el servicio válido del fixture más las modificaciones indicadas. */
Cypress.Commands.add('completarValido', (cambios = {}) => {
  cy.fixture('servicio-valido.json').then((base) => cy.completarFormulario({ ...base, ...cambios }));
});

Cypress.Commands.add('publicar', () => {
  cy.get('#btn-publicar').click();
});

/** Verifica que IGU_ERROR_DATOS esté abierto y contenga (todos) los mensajes indicados. */
Cypress.Commands.add('debeMostrarErrores', (mensajes) => {
  cy.get('#modal-error').should('be.visible');
  mensajes.forEach((m) => cy.get('#lista-errores').should('contain.text', m));
});

/** Verifica el resaltado de un campo (FA 6.3): borde/clase, mensaje debajo y aria-invalid. */
Cypress.Commands.add('campoDebeTenerError', (campo, mensaje) => {
  cy.get(`#campo-${campo}`).should('have.class', 'campo--error');
  cy.get(`#error-${campo}`).should('be.visible');
  if (mensaje) cy.get(`#error-${campo}`).should('contain.text', mensaje);
  if (CAMPOS_TEXTO[campo]) {
    cy.get(CAMPOS_TEXTO[campo])
      .should('have.attr', 'aria-invalid', 'true')
      .and('have.attr', 'aria-describedby')
      .and('contain', `error-${campo}`);
  }
});

Cypress.Commands.add('campoSinError', (campo) => {
  cy.get(`#campo-${campo}`).should('not.have.class', 'campo--error');
  cy.get(`#error-${campo}`).should('not.be.visible');
  if (CAMPOS_TEXTO[campo]) cy.get(CAMPOS_TEXTO[campo]).should('not.have.attr', 'aria-invalid');
});

/** Lee los servicios persistidos en localStorage. */
Cypress.Commands.add('serviciosGuardados', () =>
  cy.window().then((win) => JSON.parse(win.localStorage.getItem(CLAVE_STORAGE) || '[]')));

/** Verifica que el elemento con foco coincida con el selector. */
Cypress.Commands.add('focoEn', (selector) => {
  cy.focused().should('match', selector);
});
