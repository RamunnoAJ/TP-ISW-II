'use strict';
/**
 * CU 003 – Publicar Servicio
 * Capa de presentación: navegación SPA, popups, formulario y resaltado de errores.
 */
(function iniciarUI() {
  const controlador = new ControladorPublicarServicio(
    COCINERO_ACTUAL,
    new RepositorioServicios(CLAVE_ALMACENAMIENTO, serviciosDeEjemplo),
  );

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  // ---------------------------------------------------------------------------
  // Referencias al DOM
  // ---------------------------------------------------------------------------
  const app = $('#app');
  const pantallas = {
    misServicios: $('#pantalla-mis-servicios'),
    publicar: $('#pantalla-publicar'),
  };
  const TITULOS_DOCUMENTO = {
    misServicios: 'Mis servicios · Provecho',
    publicar: 'Publicar nuevo servicio · Provecho',
  };

  const listaServicios = $('#lista-servicios');
  const estadoVacio = $('#estado-vacio');

  const form = $('#form-publicar');
  const campos = {
    nombre: $('#nombre'),
    descripcion: $('#descripcion'),
    horaDesde: $('#horaDesde'),
    horaHasta: $('#horaHasta'),
    precioMin: $('#precioMin'),
    precioMax: $('#precioMax'),
  };
  const contadores = {
    nombre: $('#contador-nombre'),
    descripcion: $('#contador-descripcion'),
  };
  const grupoDias = $('#grupo-dias');
  const botonesDias = $$('.dia', grupoDias);
  const btnPublicar = $('#btn-publicar');
  const btnCancelar = $('#btn-cancelar');
  const inputFotos = $('#input-fotos');
  const btnAgregarFotos = $('#btn-agregar-fotos');
  const zonaFotos = $('#zona-fotos');
  const listaFotos = $('#lista-fotos');

  /** Etiquetas usadas como contexto en la lista de IGU_ERROR_DATOS. */
  const ETIQUETAS_CAMPO = {
    nombre: 'Nombre del servicio',
    descripcion: 'Descripción',
    dias: 'Días de disponibilidad',
    horaDesde: 'Horario desde',
    horaHasta: 'Horario hasta',
    precioMin: 'Precio mínimo',
    precioMax: 'Precio máximo',
    fotos: 'Fotos',
  };
  const ORDEN_CAMPOS = Object.keys(ETIQUETAS_CAMPO);

  const ICONOS = {
    camara: '<svg aria-hidden="true" viewBox="0 0 24 24" width="28" height="28"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    menu: '<svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    archivo: '<svg aria-hidden="true" viewBox="0 0 24 24" width="28" height="28"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/></svg>',
    cerrar: '<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  };

  // ---------------------------------------------------------------------------
  // Estado de la UI
  // ---------------------------------------------------------------------------
  /** Fotos del formulario: { id, nombre, tipo, miniatura: string|null, lista: Promise } */
  let fotosCargadas = [];
  let publicando = false;
  let erroresPendientes = [];
  let servicioPublicado = null;

  // ---------------------------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------------------------
  /** Crea nodos con textContent (evita inyección de HTML con datos del usuario). */
  function crear(tag, { clase, texto, attrs = {}, svg } = {}, hijos = []) {
    const nodo = document.createElement(tag);
    if (clase) nodo.className = clase;
    if (texto != null) nodo.textContent = texto;
    if (svg) nodo.innerHTML = svg; // solo íconos SVG constantes
    Object.entries(attrs).forEach(([k, v]) => nodo.setAttribute(k, v));
    hijos.filter(Boolean).forEach((h) => nodo.append(h));
    return nodo;
  }

  /** Nielsen #1 – anuncia cambios de estado a lectores de pantalla. */
  function anunciar(mensaje) {
    const region = $('#anuncio');
    region.textContent = '';
    setTimeout(() => { region.textContent = mensaje; }, 50);
  }

  // ---------------------------------------------------------------------------
  // Gestor de modales: foco atrapado, Esc, foco devuelto al origen
  // ---------------------------------------------------------------------------
  const Modales = (() => {
    const FOCUSABLES = 'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    let activo = null;

    function focusables(contenedor) {
      return $$(FOCUSABLES, contenedor).filter((el) => el.offsetParent !== null);
    }

    function abrir(id, { focoInicial, alEscapar, origen = document.activeElement } = {}) {
      if (activo) cerrar({ devolverFoco: false });
      const fondo = document.getElementById(id);
      fondo.hidden = false;
      app.inert = true; // el contenido de fondo no recibe foco ni clics
      document.body.classList.add('con-modal');
      activo = { fondo, alEscapar, origen };
      const destino = focoInicial ? $(focoInicial, fondo) : focusables(fondo)[0];
      destino?.focus();
    }

    function cerrar({ focoDestino = null, devolverFoco = true } = {}) {
      if (!activo) return;
      const { fondo, origen } = activo;
      fondo.hidden = true;
      app.inert = false;
      document.body.classList.remove('con-modal');
      activo = null;
      const destino = focoDestino || (devolverFoco ? origen : null);
      if (destino && document.contains(destino)) destino.focus();
    }

    document.addEventListener('keydown', (e) => {
      if (!activo) return;
      // Shneiderman #2 – Esc cierra los modales (cada uno define qué significa cerrar)
      if (e.key === 'Escape') {
        e.preventDefault();
        activo.alEscapar?.();
        return;
      }
      // Foco atrapado dentro del popup
      if (e.key === 'Tab') {
        const elementos = focusables(activo.fondo);
        if (elementos.length === 0) return;
        const primero = elementos[0];
        const ultimo = elementos[elementos.length - 1];
        if (!activo.fondo.contains(document.activeElement)) {
          e.preventDefault();
          primero.focus();
        } else if (e.shiftKey && document.activeElement === primero) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primero.focus();
        }
      }
    });

    // El botón X de cada modal ejecuta la misma acción que Esc (Nielsen #4 – X/Esc para cerrar)
    $$('.modal__cerrar').forEach((btn) => btn.addEventListener('click', () => activo?.alEscapar?.()));

    return { abrir, cerrar, estaAbierto: () => activo !== null };
  })();

  // ---------------------------------------------------------------------------
  // Navegación SPA
  // ---------------------------------------------------------------------------
  function mostrarPantalla(clave, { foco } = {}) {
    Object.entries(pantallas).forEach(([k, seccion]) => { seccion.hidden = k !== clave; });
    document.title = TITULOS_DOCUMENTO[clave];
    window.scrollTo(0, 0);
    (foco || $('h1', pantallas[clave])).focus();
  }

  /** CU003 - Paso 1/2: IGU_MIS_SERVICIOS */
  function irAMisServicios({ resaltarId = null } = {}) {
    renderizarServicios(resaltarId);
    const tarjetaNueva = resaltarId ? listaServicios.querySelector(`[data-id="${resaltarId}"] .tarjeta`) : null;
    mostrarPantalla('misServicios', { foco: tarjetaNueva });
    if (tarjetaNueva) tarjetaNueva.scrollIntoView({ block: 'nearest' });
  }

  /** CU003 - Paso 3/4: IGU_PUBLICAR_SERVICIO (formulario limpio) */
  function irAPublicar() {
    limpiarFormulario();
    // Shneiderman #2 – foco directo en el primer campo para empezar a escribir
    mostrarPantalla('publicar', { foco: campos.nombre });
  }

  // ---------------------------------------------------------------------------
  // IGU_MIS_SERVICIOS – listado
  // ---------------------------------------------------------------------------
  function renderizarServicios(resaltarId = null) {
    cerrarMenusContextuales();
    const servicios = controlador.obtenerServicios();
    listaServicios.replaceChildren(...servicios.map((s) => crearTarjeta(s, s.id === resaltarId)));
    const vacio = servicios.length === 0;
    listaServicios.hidden = vacio;
    estadoVacio.hidden = !vacio;
  }

  function crearTarjeta(servicio, esNuevo) {
    const idTitulo = `titulo-${servicio.id}`;
    const idMenu = `menu-${servicio.id}`;

    const foto = servicio.fotos?.[0]
      ? crear('img', { clase: 'tarjeta__imagen', attrs: { src: servicio.fotos[0], alt: `Foto de ${servicio.nombre}` } })
      : crear('span', { clase: 'tarjeta__placeholder', svg: ICONOS.camara, attrs: { role: 'img', 'aria-label': 'Sin foto' } });

    // Nielsen #1 – estado "Activo" visible en cada tarjeta
    const encabezado = crear('div', { clase: 'tarjeta__encabezado' }, [
      crear('h2', { clase: 'tarjeta__nombre', texto: servicio.nombre, attrs: { id: idTitulo } }),
      crear('span', { clase: 'chip chip--activo', texto: servicio.estado }),
    ]);
    const descripcion = crear('p', { clase: 'tarjeta__descripcion', texto: servicio.descripcion, attrs: { title: servicio.descripcion } });
    const horario = crear('p', { clase: 'tarjeta__horario', texto: Formato.diasYHorario(servicio) });

    // Menú ☰ fuera del alcance: opciones deshabilitadas + leyenda
    const btnMenu = crear('button', {
      clase: 'icono-boton tarjeta__btn-menu',
      svg: ICONOS.menu,
      attrs: {
        type: 'button',
        'aria-label': `Opciones de ${servicio.nombre}`,
        'aria-haspopup': 'menu',
        'aria-expanded': 'false',
        'aria-controls': idMenu,
      },
    });
    const menu = crear('div', { clase: 'menu-contextual', attrs: { id: idMenu, role: 'menu', 'aria-label': `Opciones de ${servicio.nombre}` } }, [
      crear('button', { clase: 'menu-contextual__item', texto: 'Editar', attrs: { type: 'button', role: 'menuitem', 'aria-disabled': 'true', tabindex: '-1' } }),
      crear('button', { clase: 'menu-contextual__item', texto: 'Configurar checklist', attrs: { type: 'button', role: 'menuitem', 'aria-disabled': 'true', tabindex: '-1' } }),
      crear('p', { clase: 'menu-contextual__nota', texto: 'No disponible en este prototipo', attrs: { role: 'note' } }),
    ]);
    menu.hidden = true;
    configurarMenu(btnMenu, menu);

    const tarjeta = crear('article', {
      clase: `tarjeta${esNuevo ? ' tarjeta--nueva' : ''}`,
      attrs: { 'aria-labelledby': idTitulo, tabindex: '-1' },
    }, [
      crear('div', { clase: 'tarjeta__foto' }, [foto]),
      crear('div', { clase: 'tarjeta__info' }, [encabezado, descripcion, horario]),
      crear('div', { clase: 'tarjeta__menu' }, [btnMenu, menu]),
    ]);
    if (esNuevo) {
      // Nielsen #1 – el servicio nuevo se resalta brevemente
      tarjeta.addEventListener('animationend', () => tarjeta.classList.remove('tarjeta--nueva'), { once: true });
    }
    return crear('li', { attrs: { 'data-id': servicio.id } }, [tarjeta]);
  }

  // Menú contextual de tarjeta ----------------------------------------------
  function cerrarMenusContextuales(excepto = null) {
    $$('.menu-contextual').forEach((m) => {
      if (m === excepto || m.hidden) return;
      m.hidden = true;
      document.querySelector(`[aria-controls="${m.id}"]`)?.setAttribute('aria-expanded', 'false');
    });
  }

  function configurarMenu(boton, menu) {
    const items = () => $$('[role="menuitem"]', menu);
    const abrir = () => {
      cerrarMenusContextuales(menu);
      menu.hidden = false;
      boton.setAttribute('aria-expanded', 'true');
      items()[0].focus();
    };
    const cerrar = (devolverFoco = true) => {
      menu.hidden = true;
      boton.setAttribute('aria-expanded', 'false');
      if (devolverFoco) boton.focus();
    };
    boton.addEventListener('click', (e) => {
      e.stopPropagation();
      if (menu.hidden) abrir(); else cerrar();
    });
    menu.addEventListener('click', (e) => e.stopPropagation()); // opciones deshabilitadas: no hacen nada
    menu.addEventListener('keydown', (e) => {
      const lista = items();
      const i = lista.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); cerrar(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); lista[(i + 1) % lista.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); lista[(i - 1 + lista.length) % lista.length].focus(); }
      else if (e.key === 'Tab') { cerrar(false); }
    });
  }
  document.addEventListener('click', () => cerrarMenusContextuales());

  // ---------------------------------------------------------------------------
  // IGU_PUBLICAR_SERVICIO – formulario
  // ---------------------------------------------------------------------------
  function diasSeleccionados() {
    return botonesDias.filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.dataset.dia);
  }

  function recolectarDatos() {
    return {
      nombre: campos.nombre.value,
      descripcion: campos.descripcion.value,
      dias: diasSeleccionados(),
      horaDesde: campos.horaDesde.value,
      horaHasta: campos.horaHasta.value,
      precioMin: campos.precioMin.value,
      precioMax: campos.precioMax.value,
      fotos: fotosCargadas.map((f) => ({ nombre: f.nombre, tipo: f.tipo, miniatura: f.miniatura })),
    };
  }

  /** FA 5: si no se cargó nada, "Cancelar" no pide confirmación. */
  function formularioVacio() {
    const textosVacios = Object.values(campos).every((c) => c.value.trim() === '');
    return textosVacios && diasSeleccionados().length === 0 && fotosCargadas.length === 0;
  }

  /** FA 5.4: descarta los datos ingresados. */
  function limpiarFormulario() {
    form.reset();
    botonesDias.forEach((b) => b.setAttribute('aria-pressed', 'false'));
    fotosCargadas = [];
    renderizarFotos();
    limpiarTodosLosErrores();
    Object.keys(contadores).forEach(actualizarContador);
  }

  /** Shneiderman #3 – contador de caracteres; se marca al exceder el límite (prevención, Nielsen #5). */
  function actualizarContador(campo) {
    const contador = contadores[campo];
    const max = Number(contador.dataset.max);
    const cantidad = contarCaracteres(campos[campo].value);
    contador.textContent = `${cantidad}/${max}`;
    contador.classList.toggle('contador--excedido', cantidad > max);
  }

  // Días: toggles con aria-pressed (Shneiderman #6 – se pueden deseleccionar)
  botonesDias.forEach((boton) => {
    boton.addEventListener('click', () => {
      const presionado = boton.getAttribute('aria-pressed') === 'true';
      boton.setAttribute('aria-pressed', String(!presionado));
      limpiarErrorCampo('dias'); // Shneiderman #5 – el resaltado se quita al modificar
    });
  });

  // Campos de texto: contador + quitar resaltado al modificar
  Object.entries(campos).forEach(([clave, input]) => {
    input.addEventListener('input', () => {
      if (contadores[clave]) actualizarContador(clave);
      limpiarErrorCampo(clave);
    });
  });

  // ---------------------------------------------------------------------------
  // Fotos (opcional): clic o arrastrar y soltar, miniaturas, quitar
  // ---------------------------------------------------------------------------
  /** Reduce la imagen a una miniatura JPEG (data URL) para no exceder localStorage. */
  function generarMiniatura(archivo, lado = 320) {
    return new Promise((resolver) => {
      if (!/^image\//.test(archivo.type) && !/\.(png|jpe?g)$/i.test(archivo.name)) {
        resolver(null);
        return;
      }
      const url = URL.createObjectURL(archivo);
      const img = new Image();
      img.onload = () => {
        const escala = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.naturalWidth * escala));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * escala));
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff'; // fondo blanco para PNG con transparencia
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolver(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolver(null); };
      img.src = url;
    });
  }

  function agregarArchivos(listaArchivos) {
    const nuevos = [...listaArchivos].map((archivo) => {
      const foto = {
        id: `foto-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        nombre: archivo.name,
        tipo: archivo.type,
        miniatura: null,
      };
      foto.lista = generarMiniatura(archivo).then((dataUrl) => {
        foto.miniatura = dataUrl;
        renderizarFotos();
      });
      return foto;
    });
    if (nuevos.length === 0) return;
    fotosCargadas = [...fotosCargadas, ...nuevos];
    limpiarErrorCampo('fotos');
    renderizarFotos();
    anunciar(nuevos.length === 1 ? `Se agregó ${nuevos[0].nombre}` : `Se agregaron ${nuevos.length} archivos`);
  }

  /** Shneiderman #6 – reversión: quitar una foto cargada. */
  function quitarFoto(id) {
    const indice = fotosCargadas.findIndex((f) => f.id === id);
    if (indice < 0) return;
    const [quitada] = fotosCargadas.splice(indice, 1);
    limpiarErrorCampo('fotos');
    renderizarFotos();
    anunciar(`Se quitó ${quitada.nombre}`);
    // Mantener el foco en un lugar lógico
    const botones = $$('.miniatura__quitar', listaFotos);
    (botones[indice] || botones[indice - 1] || btnAgregarFotos).focus();
  }

  function renderizarFotos() {
    const enfocado = document.activeElement?.dataset?.fotoId;
    listaFotos.replaceChildren(...fotosCargadas.map((foto) => {
      const vista = foto.miniatura
        ? crear('img', { clase: 'miniatura__imagen', attrs: { src: foto.miniatura, alt: '' } })
        : crear('span', { clase: 'miniatura__icono', svg: ICONOS.archivo });
      const quitar = crear('button', {
        clase: 'miniatura__quitar',
        svg: ICONOS.cerrar,
        attrs: { type: 'button', 'aria-label': `Quitar ${foto.nombre}`, title: 'Quitar', 'data-foto-id': foto.id },
      });
      quitar.addEventListener('click', () => quitarFoto(foto.id));
      return crear('li', { clase: 'miniatura' }, [
        vista,
        crear('span', { clase: 'miniatura__nombre', texto: foto.nombre, attrs: { title: foto.nombre } }),
        quitar,
      ]);
    }));
    listaFotos.hidden = fotosCargadas.length === 0;
    // Si el foco estaba en un botón "quitar" que se re-renderizó, restaurarlo
    if (enfocado) $(`[data-foto-id="${enfocado}"]`, listaFotos)?.focus();
  }

  btnAgregarFotos.addEventListener('click', () => inputFotos.click());
  inputFotos.addEventListener('change', () => {
    agregarArchivos(inputFotos.files);
    inputFotos.value = ''; // permite volver a elegir el mismo archivo
  });

  // Nielsen #7 – arrastrar y soltar
  ['dragenter', 'dragover'].forEach((tipo) => zonaFotos.addEventListener(tipo, (e) => {
    e.preventDefault();
    zonaFotos.classList.add('zona-fotos--arrastrando');
  }));
  ['dragleave', 'dragend'].forEach((tipo) => zonaFotos.addEventListener(tipo, (e) => {
    if (!zonaFotos.contains(e.relatedTarget)) zonaFotos.classList.remove('zona-fotos--arrastrando');
  }));
  zonaFotos.addEventListener('drop', (e) => {
    e.preventDefault();
    zonaFotos.classList.remove('zona-fotos--arrastrando');
    agregarArchivos(e.dataTransfer.files);
  });
  // Nielsen #5 – evitar que soltar un archivo fuera de la zona abra el archivo y se pierdan los datos
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => e.preventDefault());

  // ---------------------------------------------------------------------------
  // Errores: resaltado por campo (FA 6.3)
  // ---------------------------------------------------------------------------
  function controlDeCampo(campo) {
    if (campos[campo]) return campos[campo];
    if (campo === 'dias') return botonesDias[0];
    if (campo === 'fotos') return btnAgregarFotos;
    return null;
  }

  /** Elemento al que se le agrega aria-invalid / aria-describedby. */
  function elementoDescrito(campo) {
    if (campo === 'dias') return grupoDias;
    if (campo === 'fotos') return btnAgregarFotos;
    return campos[campo];
  }

  function aplicarError(campo, mensajes) {
    const contenedor = document.getElementById(`campo-${campo}`);
    const mensaje = document.getElementById(`error-${campo}`);
    const elemento = elementoDescrito(campo);
    if (!contenedor || !mensaje || !elemento) return;
    contenedor.classList.add('campo--error'); // borde rojo
    mensaje.textContent = mensajes.join('\n'); // mensaje debajo del campo
    mensaje.hidden = false;
    if (campo !== 'fotos') elemento.setAttribute('aria-invalid', 'true');
    const descritos = (elemento.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
    if (!descritos.includes(mensaje.id)) {
      // El error se lee primero (Nielsen #9)
      elemento.setAttribute('aria-describedby', [mensaje.id, ...descritos].join(' '));
    }
  }

  function limpiarErrorCampo(campo) {
    const contenedor = document.getElementById(`campo-${campo}`);
    const mensaje = document.getElementById(`error-${campo}`);
    const elemento = elementoDescrito(campo);
    if (!contenedor || !contenedor.classList.contains('campo--error')) return;
    contenedor.classList.remove('campo--error');
    mensaje.textContent = '';
    mensaje.hidden = true;
    elemento.removeAttribute('aria-invalid');
    const descritos = (elemento.getAttribute('aria-describedby') || '').split(' ').filter((id) => id && id !== mensaje.id);
    elemento.setAttribute('aria-describedby', descritos.join(' '));
  }

  function limpiarTodosLosErrores() {
    ORDEN_CAMPOS.forEach(limpiarErrorCampo);
  }

  function agruparPorCampo(errores) {
    const mapa = new Map();
    errores.forEach(({ campo, mensaje }) => {
      if (!mapa.has(campo)) mapa.set(campo, []);
      mapa.get(campo).push(mensaje);
    });
    return mapa;
  }

  /** FA 6.1: IGU_ERROR_DATOS con la lista de todos los errores. */
  function mostrarErrores(errores) {
    erroresPendientes = errores;
    const lista = $('#lista-errores');
    lista.replaceChildren(...errores.map(({ campo, mensaje }) => crear('li', {}, [
      campo ? crear('strong', { texto: `${ETIQUETAS_CAMPO[campo]}: ` }) : null,
      document.createTextNode(mensaje),
    ])));
    Modales.abrir('modal-error', { focoInicial: '#btn-error-aceptar', alEscapar: aceptarErrores });
  }

  /** FA 6.2 / 6.3: cierra el popup, resalta campos, conserva datos y enfoca el primer error. */
  function aceptarErrores() {
    const porCampo = agruparPorCampo(erroresPendientes.filter((e) => e.campo));
    porCampo.forEach((mensajes, campo) => aplicarError(campo, mensajes));
    const primerCampo = ORDEN_CAMPOS.find((c) => porCampo.has(c));
    Modales.cerrar({ focoDestino: primerCampo ? controlDeCampo(primerCampo) : btnPublicar });
    erroresPendientes = [];
    // FA 6.3 → vuelve al paso 5
  }
  $('#btn-error-aceptar').addEventListener('click', aceptarErrores);

  // ---------------------------------------------------------------------------
  // CU003 - Paso 5/6: Publicar
  // ---------------------------------------------------------------------------
  /** Nielsen #1 / #5 – estado de carga y bloqueo de doble envío. */
  function setPublicando(valor) {
    publicando = valor;
    btnPublicar.disabled = valor;
    btnCancelar.disabled = valor;
    btnPublicar.classList.toggle('btn--cargando', valor);
    btnPublicar.setAttribute('aria-busy', String(valor));
    $('.btn__texto', btnPublicar).textContent = valor ? 'Publicando…' : 'Publicar';
    if (valor) anunciar('Publicando servicio…');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (publicando) return; // Nielsen #5 – evita doble envío (también con Enter)
    limpiarTodosLosErrores();
    setPublicando(true);
    let resultado;
    try {
      await Promise.all(fotosCargadas.map((f) => f.lista)); // miniaturas listas antes de registrar
      resultado = await controlador.publicarServicio(recolectarDatos());
    } finally {
      setPublicando(false);
    }
    if (!resultado.ok) {
      mostrarErrores(resultado.errores); // FA 6
      return;
    }
    mostrarComprobante(resultado.servicio);
  });

  /** CU003 - Paso 6: IGU_POPUP_COMPROBANTE_PUBLICACION */
  function mostrarComprobante(servicio) {
    servicioPublicado = servicio;
    $('#comp-nombre').textContent = servicio.nombre;
    $('#comp-estado').textContent = servicio.estado;
    $('#comp-horarios').textContent = Formato.diasYHorario(servicio);
    $('#comp-precios').textContent = Formato.rangoPrecios(servicio.precioMin, servicio.precioMax);
    Modales.abrir('modal-comprobante', { focoInicial: '#btn-ir-mis-servicios', alEscapar: finalizarPublicacion });
    anunciar('Servicio publicado con éxito');
  }

  /** Ambos botones del comprobante finalizan el CU y llevan a Mis servicios. */
  function finalizarPublicacion() {
    const id = servicioPublicado?.id ?? null;
    servicioPublicado = null;
    Modales.cerrar({ devolverFoco: false });
    limpiarFormulario();
    irAMisServicios({ resaltarId: id });
  }
  $('#btn-ir-mis-servicios').addEventListener('click', finalizarPublicacion);
  $('#btn-comprobante-cerrar').addEventListener('click', finalizarPublicacion);

  // ---------------------------------------------------------------------------
  // FA 5: Cancelar
  // ---------------------------------------------------------------------------
  btnCancelar.addEventListener('click', () => {
    if (formularioVacio()) {
      irAMisServicios(); // sin datos no hay nada que perder
      return;
    }
    // FA 5.2 – Shneiderman #7: nada se descarta sin confirmar
    Modales.abrir('modal-cancelar', { focoInicial: '#btn-cancelar-no', alEscapar: () => Modales.cerrar() });
  });

  // "No, volver": cierra el popup y el formulario conserva los datos
  $('#btn-cancelar-no').addEventListener('click', () => Modales.cerrar());

  // FA 5.3 / 5.4: confirma, descarta datos y vuelve sin registrar
  $('#btn-cancelar-si').addEventListener('click', () => {
    Modales.cerrar({ devolverFoco: false });
    limpiarFormulario();
    irAMisServicios();
    anunciar('Se canceló la publicación. No se registró ningún servicio.');
  });

  // ---------------------------------------------------------------------------
  // Otros controles
  // ---------------------------------------------------------------------------
  $('#btn-nuevo-servicio').addEventListener('click', irAPublicar);
  $('#btn-publicar-primero').addEventListener('click', irAPublicar);

  $('#btn-reiniciar').addEventListener('click', () => {
    controlador.reiniciarDatos();
    if (!pantallas.misServicios.hidden) renderizarServicios();
    anunciar('Se reiniciaron los datos de prueba');
  });

  // ---------------------------------------------------------------------------
  // Inicio: el Cocinero entra a "Mis servicios" desde su perfil (Paso 1)
  // SUPUESTO: el prototipo arranca directamente en IGU_MIS_SERVICIOS (el perfil es decorativo).
  // ---------------------------------------------------------------------------
  renderizarServicios();
  renderizarFotos();
})();
