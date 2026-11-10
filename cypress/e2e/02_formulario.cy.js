// IGU_PUBLICAR_SERVICIO – CU003 Paso 4 (estructura y comportamiento de los controles)
describe('IGU_PUBLICAR_SERVICIO – formulario', () => {
  beforeEach(() => {
    cy.visitarApp();
    cy.irAPublicar();
  });

  it('muestra título, foco inicial en Nombre y título de documento', () => {
    cy.get('#titulo-publicar').should('have.text', 'Publicar nuevo servicio');
    cy.title().should('eq', 'Publicar nuevo servicio · Provecho');
    cy.focoEn('#nombre');
    cy.get('#pantalla-mis-servicios').should('not.be.visible');
  });

  it('tiene los campos en el orden de la IGU con etiquetas visibles y placeholders', () => {
    const esperados = ['nombre', 'descripcion', 'dias', 'horaDesde', 'horaHasta', 'precioMin', 'precioMax', 'fotos'];
    cy.get('#campo-nombre, #campo-descripcion, #campo-dias, #campo-horaDesde, #campo-horaHasta, #campo-precioMin, #campo-precioMax, #campo-fotos')
      .then(($c) => {
        // jQuery devuelve en orden de documento
        expect([...$c].map((c) => c.id.replace('campo-', ''))).to.deep.equal(esperados);
      });

    cy.get('label[for="nombre"]').should('be.visible').and('contain.text', 'Nombre del servicio');
    cy.get('#nombre').should('have.attr', 'placeholder', 'Menu de pastas caseras');
    cy.get('label[for="descripcion"]').should('contain.text', 'Descripción del menú / platos ofrecidos');
    cy.get('#descripcion').should('have.attr', 'placeholder', 'Entrada, plato principal y postre. Detalle de ingredientes y variantes…');
    cy.contains('legend', 'Días de disponibilidad').should('be.visible');
    cy.contains('legend', 'Horario disponible').should('be.visible');
    cy.get('label[for="horaDesde"]').should('have.text', 'Desde');
    cy.get('label[for="horaHasta"]').should('have.text', 'Hasta');
    cy.contains('legend', 'Rango de precios estimado (p/ persona)').should('be.visible');
    cy.get('#precioMin').should('have.attr', 'placeholder', '$ mínimo');
    cy.get('#precioMax').should('have.attr', 'placeholder', '$ máximo');
    cy.contains('#campo-fotos', 'Fotos (opcional)');
    cy.get('#btn-agregar-fotos').should('contain.text', 'Agregar fotos del menú');
    cy.get('.zona-fotos').should('have.css', 'border-style', 'dashed');
  });

  it('marca los obligatorios con * y muestra la leyenda', () => {
    cy.get('.formulario .obligatorio').should('have.length.at.least', 5);
    cy.contains('.leyenda-obligatorios', 'Campos obligatorios');
    cy.contains('#campo-fotos', '*').should('not.exist');
  });

  it('usa inputs de texto (no time/number) y sin maxlength para poder probar inválidos', () => {
    ['#nombre', '#horaDesde', '#horaHasta', '#precioMin', '#precioMax'].forEach((s) => {
      cy.get(s).should('have.attr', 'type', 'text').and('not.have.attr', 'maxlength');
    });
    cy.get('#descripcion').should('not.have.attr', 'maxlength');
    cy.get('#horaDesde').should('have.attr', 'placeholder', 'HH:MM');
    cy.get('#horaHasta').should('have.attr', 'placeholder', 'HH:MM');
    cy.get('#form-publicar').should('have.attr', 'novalidate');
  });

  it('muestra textos de ayuda (Nielsen #10)', () => {
    cy.get('#ayuda-horaDesde').should('contain.text', 'Formato 24 hs, por ejemplo 12:00');
    cy.get('#ayuda-horaHasta').should('have.text', 'Usá 00:00 para indicar medianoche');
    cy.get('#ayuda-precios').should('contain.text', 'Precio estimado por persona');
    cy.get('#horaHasta').should('have.attr', 'aria-describedby').and('contain', 'ayuda-horaHasta');
  });

  it('los botones Cancelar (secundario) y Publicar (primario) están abajo a la derecha', () => {
    cy.get('.acciones-formulario').should('have.css', 'justify-content', 'flex-end');
    cy.get('.acciones-formulario .btn').then(($b) => {
      expect($b.eq(0)).to.have.id('btn-cancelar').and.to.have.class('btn--secundario');
      expect($b.eq(1)).to.have.id('btn-publicar').and.to.have.class('btn--primario');
      expect($b.eq(1).attr('type')).to.eq('submit');
    });
  });

  describe('contadores de caracteres', () => {
    it('cuentan nombre (x/25) y descripción (x/350)', () => {
      cy.get('#contador-nombre').should('have.text', '0/25');
      cy.get('#contador-descripcion').should('have.text', '0/350');
      cy.get('#nombre').type('Ñoquis');
      cy.get('#contador-nombre').should('have.text', '6/25');
      cy.get('#descripcion').type('Entrada y postre');
      cy.get('#contador-descripcion').should('have.text', '16/350');
    });

    it('se marcan al exceder el límite pero NO limitan la escritura', () => {
      cy.escribir('#nombre', 'A'.repeat(26));
      cy.get('#nombre').should('have.value', 'A'.repeat(26));
      cy.get('#contador-nombre').should('have.text', '26/25').and('have.class', 'contador--excedido');
      cy.escribir('#descripcion', 'a'.repeat(351));
      cy.get('#contador-descripcion').should('have.text', '351/350').and('have.class', 'contador--excedido');
    });
  });

  describe('días de disponibilidad (toggles)', () => {
    it('son 7 botones L M X J V S D con aria-label del día completo', () => {
      const dias = [['L', 'Lunes'], ['M', 'Martes'], ['X', 'Miércoles'], ['J', 'Jueves'], ['V', 'Viernes'], ['S', 'Sábado'], ['D', 'Domingo']];
      cy.get('.dia').should('have.length', 7).each(($b, i) => {
        expect($b.text()).to.eq(dias[i][0]);
        expect($b).to.have.attr('aria-label', dias[i][1]);
        expect($b).to.have.attr('aria-pressed', 'false');
        expect($b).to.have.attr('type', 'button');
      });
    });

    it('se seleccionan (relleno de color) y se deseleccionan', () => {
      cy.get('.dia[data-dia="X"]').as('mie').click();
      cy.get('@mie').should('have.attr', 'aria-pressed', 'true')
        .and('have.css', 'background-color', 'rgb(166, 61, 36)')
        .and('have.css', 'color', 'rgb(255, 255, 255)');
      cy.get('@mie').click().should('have.attr', 'aria-pressed', 'false')
        .and('have.css', 'background-color', 'rgb(255, 255, 255)');
    });

    it('tocar un día no envía el formulario', () => {
      cy.get('.dia[data-dia="L"]').click();
      cy.get('#modal-error').should('not.be.visible');
    });
  });

  describe('fotos (opcional)', () => {
    it('agrega varias imágenes por selector y muestra miniaturas con botón para quitar', () => {
      cy.get('#input-fotos').should('have.attr', 'multiple');
      cy.get('#input-fotos').should('have.attr', 'accept').and('contain', '.png').and('contain', '.jpg');
      cy.completarFormulario({ fotos: ['foto1.jpg', 'foto2.png'] });
      cy.get('#lista-fotos .miniatura').should('have.length', 2);
      cy.get('#lista-fotos .miniatura__imagen').should('have.length', 2)
        .first().should('have.attr', 'src').and('match', /^data:image\/jpeg;base64,/);
      cy.get('#lista-fotos .miniatura__nombre').first().should('have.text', 'foto1.jpg');
      cy.get('[aria-label="Quitar foto1.jpg"]').click();
      cy.get('#lista-fotos .miniatura').should('have.length', 1);
      cy.get('#lista-fotos .miniatura__nombre').should('have.text', 'foto2.png');
      cy.get('#anuncio').should('have.text', 'Se quitó foto1.jpg');
    });

    it('acepta arrastrar y soltar en la zona de fotos (Nielsen #7)', () => {
      cy.get('#zona-fotos').selectFile(['cypress/fixtures/foto1.jpg', 'cypress/fixtures/foto2.png'], { action: 'drag-drop' });
      cy.get('#lista-fotos .miniatura').should('have.length', 2);
    });

    it('un archivo no imagen se lista con ícono genérico', () => {
      cy.completarFormulario({ fotos: ['menu.pdf'] });
      cy.get('#lista-fotos .miniatura__icono').should('exist');
      cy.get('#lista-fotos .miniatura__nombre').should('have.text', 'menu.pdf');
    });

    it('el botón "Agregar fotos del menú" abre el selector de archivos', () => {
      cy.get('#input-fotos').then(($i) => cy.stub($i[0], 'click').as('abrirSelector'));
      cy.get('#btn-agregar-fotos').click();
      cy.get('@abrirSelector').should('have.been.calledOnce');
    });
  });
});
