// CU003 Paso 6 / FA 6 – Reglas de validación (caja negra) y comportamiento de IGU_ERROR_DATOS
// Cada caso parte del servicio válido del fixture y modifica solo lo indicado.

const casosInvalidos = [
  // Criterio 4 – valores límite inválidos
  { titulo: 'nombre de 26 caracteres', cambios: { nombre: 'A'.repeat(26) }, campo: 'nombre', mensaje: 'El nombre no puede superar de 25 caracteres' },
  { titulo: 'descripción de 351 caracteres', cambios: { descripcion: 'a'.repeat(351) }, campo: 'descripcion', mensaje: 'La descripcion no puede superar los 350 caracteres' },
  { titulo: 'hora inválida "24:30"', cambios: { horaDesde: '24:30' }, campo: 'horaDesde', mensaje: 'Horario de inicio con hora invalida' },
  { titulo: 'minutos inválidos "05:60"', cambios: { horaDesde: '05:60' }, campo: 'horaDesde', mensaje: 'Horario de inicio con minutos invalidos' },
  { titulo: 'hasta con hora inválida "25:00"', cambios: { horaHasta: '25:00' }, campo: 'horaHasta', mensaje: 'Horario de finalizacion con hora invalida' },
  { titulo: 'hasta con minutos inválidos "12:75"', cambios: { horaHasta: '12:75' }, campo: 'horaHasta', mensaje: 'Horario de finalizacion con minutos invalidos' },
  { titulo: 'precio mínimo de 21 caracteres', cambios: { precioMin: '1'.repeat(21) }, campo: 'precioMin', mensaje: 'El precio minimo no puede superar los 20 caracteres' },
  { titulo: 'precio máximo de 21 caracteres', cambios: { precioMax: '1'.repeat(21) }, campo: 'precioMax', mensaje: 'El precio maximo no puede superar los 20 caracteres' },
  // Criterio 5 – formato inválido
  { titulo: 'nombre "Pastas263&"', cambios: { nombre: 'Pastas263&' }, campo: 'nombre', mensaje: 'El nombre solo puede contener letras' },
  { titulo: 'descripción "Entrada y plato 256&"', cambios: { descripcion: 'Entrada y plato 256&' }, campo: 'descripcion', mensaje: 'La descripcion solo puede contener letras y signos de puntuacion basicos' },
  { titulo: 'horario desde "0823"', cambios: { horaDesde: '0823' }, campo: 'horaDesde', mensaje: 'Horario de inicio debe estar en formato HH:MM' },
  { titulo: 'horario hasta "1200"', cambios: { horaHasta: '1200' }, campo: 'horaHasta', mensaje: 'Horario de finalizacion debe estar en formato HH:MM' },
  { titulo: 'precio mínimo "A"', cambios: { precioMin: 'A' }, campo: 'precioMin', mensaje: 'El precio minimo debe ser un numero decimal' },
  { titulo: 'precio máximo "A"', cambios: { precioMax: 'A' }, campo: 'precioMax', mensaje: 'El precio maximo debe ser un numero decimal' },
  { titulo: 'precio mínimo negativo', cambios: { precioMin: '-5' }, campo: 'precioMin', mensaje: 'El precio no puede ser negativo' },
  { titulo: 'precio máximo negativo', cambios: { precioMin: '0', precioMax: '-5' }, campo: 'precioMax', mensaje: 'El precio no puede ser negativo' },
  // Criterio 6 – campos vacíos
  { titulo: 'nombre vacío', cambios: { nombre: '' }, campo: 'nombre', mensaje: 'El campo nombre es obligatorio' },
  { titulo: 'nombre solo con espacios', cambios: { nombre: '    ' }, campo: 'nombre', mensaje: 'El campo nombre es obligatorio' },
  { titulo: 'descripción vacía', cambios: { descripcion: '' }, campo: 'descripcion', mensaje: 'El campo descripcion es obligatorio' },
  { titulo: 'horario desde vacío', cambios: { horaDesde: '' }, campo: 'horaDesde', mensaje: 'El campo Horario de inicio es obligatorio' },
  { titulo: 'horario hasta vacío', cambios: { horaHasta: '' }, campo: 'horaHasta', mensaje: 'El campo Horario de finalizacion es obligatorio' },
  { titulo: 'precio mínimo vacío', cambios: { precioMin: '' }, campo: 'precioMin', mensaje: 'El campo precio minimo es obligatorio' },
  { titulo: 'precio máximo vacío', cambios: { precioMax: '' }, campo: 'precioMax', mensaje: 'El campo precio maximo es obligatorio' },
  // Criterio 7 – ningún día
  { titulo: 'ningún día seleccionado', cambios: { dias: [] }, campo: 'dias', mensaje: 'Se debe seleccionar al menos un dia disponible' },
  // Criterio 8 / 8d – hasta <= desde
  { titulo: 'hasta anterior al desde (18:00 a 09:00)', cambios: { horaDesde: '18:00', horaHasta: '09:00' }, campo: 'horaHasta', mensaje: 'El horario de finalizacion debe ser posterior al de inicio' },
  { titulo: 'hasta igual al desde (12:00 a 12:00)', cambios: { horaDesde: '12:00', horaHasta: '12:00' }, campo: 'horaHasta', mensaje: 'El horario de finalizacion debe ser posterior al de inicio' },
  { titulo: 'medianoche sin rango (00:00 a 00:00)', cambios: { horaDesde: '00:00', horaHasta: '00:00' }, campo: 'horaHasta', mensaje: 'El horario de finalizacion debe ser posterior al de inicio' },
  { titulo: 'rango que cruza medianoche (22:00 a 02:00)', cambios: { horaDesde: '22:00', horaHasta: '02:00' }, campo: 'horaHasta', mensaje: 'El horario de finalizacion debe ser posterior al de inicio' },
  // Criterio 9 – mínimo > máximo
  { titulo: 'precio mínimo mayor al máximo (500 / 100)', cambios: { precioMin: '500', precioMax: '100' }, campo: 'precioMax', mensaje: 'El precio minimo no puede ser mayor al precio maximo' },
  // Criterio 8c – foto con formato inválido
  { titulo: 'foto1.jpg + menu.pdf', cambios: { fotos: ['foto1.jpg', 'menu.pdf'] }, campo: 'fotos', mensaje: 'La foto debe estar en formato .png o .jpg' },
];

describe('Validaciones – FA 6', () => {
  beforeEach(() => {
    cy.visitarApp();
    cy.irAPublicar();
  });

  describe('cada regla inválida muestra su error y resalta solo ese campo', () => {
    casosInvalidos.forEach(({ titulo, cambios, campo, mensaje }) => {
      it(titulo, () => {
        cy.completarValido(cambios);
        cy.publicar();
        cy.debeMostrarErrores([mensaje]);
        cy.get('#lista-errores li').should('have.length', 1);
        cy.get('#btn-error-aceptar').click();
        cy.get('#modal-error').should('not.be.visible');
        cy.campoDebeTenerError(campo, mensaje);
        cy.get('.campo--error').should('have.length', 1);
        cy.serviciosGuardados().should('have.length', 3); // no se registró nada
      });
    });
  });

  it('acumula varios errores de un mismo campo (nombre largo y con números)', () => {
    cy.completarValido({ nombre: 'Pastas caseras numero 12345' });
    cy.publicar();
    cy.debeMostrarErrores(['El nombre no puede superar de 25 caracteres', 'El nombre solo puede contener letras']);
    cy.get('#btn-error-aceptar').click();
    cy.get('#error-nombre').should('contain.text', 'superar').and('contain.text', 'solo puede contener letras');
  });

  it('acumula errores de hora y minutos ("25:61")', () => {
    cy.completarValido({ horaDesde: '25:61' });
    cy.publicar();
    cy.debeMostrarErrores(['Horario de inicio con hora invalida', 'Horario de inicio con minutos invalidos']);
  });

  describe('Criterio 10 – formulario vacío', () => {
    beforeEach(() => {
      cy.publicar();
    });

    it('IGU_ERROR_DATOS lista todos los errores con icono, título y botón Aceptar', () => {
      cy.get('#modal-error').should('be.visible').within(() => {
        cy.get('[role="dialog"]').should('have.attr', 'aria-modal', 'true');
        cy.get('.modal__icono--advertencia').should('exist');
        cy.get('#titulo-error').should('have.text', 'Revisá los datos del servicio');
        cy.get('#btn-error-aceptar').should('have.text', 'Aceptar');
      });
      cy.get('#lista-errores li').should('have.length', 7);
      cy.debeMostrarErrores([
        'El campo nombre es obligatorio',
        'El campo descripcion es obligatorio',
        'Se debe seleccionar al menos un dia disponible',
        'El campo Horario de inicio es obligatorio',
        'El campo Horario de finalizacion es obligatorio',
        'El campo precio minimo es obligatorio',
        'El campo precio maximo es obligatorio',
      ]);
      // cada error indica a qué campo corresponde
      cy.get('#lista-errores li').first().find('strong').should('have.text', 'Nombre del servicio: ');
    });

    it('los errores aparecen en el orden del formulario', () => {
      cy.get('#lista-errores li strong').then(($s) => {
        expect([...$s].map((s) => s.textContent.replace(': ', ''))).to.deep.equal([
          'Nombre del servicio', 'Descripción', 'Días de disponibilidad', 'Horario desde',
          'Horario hasta', 'Precio mínimo', 'Precio máximo',
        ]);
      });
    });

    it('FA 6.3: al Aceptar resalta todos los campos y pone el foco en el primero', () => {
      // el resaltado se aplica recién al cerrar el popup
      cy.get('.campo--error').should('have.length', 0);
      cy.get('#btn-error-aceptar').click();
      cy.get('.campo--error').should('have.length', 7);
      ['nombre', 'descripcion', 'dias', 'horaDesde', 'horaHasta', 'precioMin', 'precioMax'].forEach((c) => cy.campoDebeTenerError(c));
      cy.get('#nombre').should('have.css', 'border-color', 'rgb(179, 38, 30)');
      cy.focoEn('#nombre');
    });
  });

  it('Criterio 10: los datos ya cargados se conservan tras el error', () => {
    cy.completarFormulario({ nombre: 'Pastas', horaDesde: '24:30', precioMin: '100', dias: ['V'], fotos: ['foto1.jpg'] });
    cy.publicar();
    cy.get('#btn-error-aceptar').click();
    cy.get('#nombre').should('have.value', 'Pastas');
    cy.get('#horaDesde').should('have.value', '24:30');
    cy.get('#precioMin').should('have.value', '100');
    cy.get('.dia[data-dia="V"]').should('have.attr', 'aria-pressed', 'true');
    cy.get('#lista-fotos .miniatura').should('have.length', 1);
    cy.get('#pantalla-publicar').should('be.visible');
  });

  it('el foco va al primer campo con error aunque no sea el primero del formulario', () => {
    cy.completarValido({ dias: [], precioMin: 'A' });
    cy.publicar();
    cy.get('#btn-error-aceptar').click();
    cy.focoEn('.dia[data-dia="L"]');
  });

  it('error de fotos: el foco va al botón de agregar fotos', () => {
    cy.completarValido({ fotos: ['menu.pdf'] });
    cy.publicar();
    cy.get('#btn-error-aceptar').click();
    cy.focoEn('#btn-agregar-fotos');
  });

  describe('Criterio 13 – corrección', () => {
    beforeEach(() => {
      cy.completarFormulario({ fotos: ['menu.pdf'] });
      cy.publicar();
      cy.get('#btn-error-aceptar').click();
      cy.get('.campo--error').should('have.length', 8);
    });

    it('cada campo pierde el resaltado apenas se modifica', () => {
      cy.get('#nombre').type('P');
      cy.campoSinError('nombre');
      cy.get('.campo--error').should('have.length', 7);
      cy.get('#descripcion').type('E');
      cy.campoSinError('descripcion');
      cy.get('.dia[data-dia="J"]').click();
      cy.campoSinError('dias');
      cy.get('#horaDesde').type('1');
      cy.campoSinError('horaDesde');
      cy.get('#horaHasta').type('1');
      cy.campoSinError('horaHasta');
      cy.get('#precioMin').type('1');
      cy.campoSinError('precioMin');
      cy.get('#precioMax').type('1');
      cy.campoSinError('precioMax');
      cy.get('[aria-label="Quitar menu.pdf"]').click();
      cy.campoSinError('fotos');
      cy.get('.campo--error').should('have.length', 0);
    });

    it('al corregir todo y publicar se muestra el comprobante', () => {
      cy.get('[aria-label="Quitar menu.pdf"]').click();
      cy.completarValido();
      cy.publicar();
      cy.get('#modal-comprobante').should('be.visible');
    });
  });

  it('un nuevo intento de publicar limpia los resaltados anteriores', () => {
    cy.completarValido({ nombre: '' });
    cy.publicar();
    cy.get('#btn-error-aceptar').click();
    cy.get('#campo-nombre').should('have.class', 'campo--error');
    // corrige el nombre pero rompe el precio sin tocar el nombre de nuevo
    cy.get('#nombre').invoke('val', 'Sushi');
    cy.escribir('#precioMin', 'abc');
    cy.publicar();
    cy.get('#btn-error-aceptar').click();
    cy.get('#campo-nombre').should('not.have.class', 'campo--error');
    cy.campoDebeTenerError('precioMin', 'El precio minimo debe ser un numero decimal');
  });
});
