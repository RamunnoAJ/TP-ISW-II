'use strict';
/**
 * CU 003 – Publicar Servicio
 * Capa de control y dominio: Cocinero (mock), Servicio, persistencia simulada
 * y ControladorPublicarServicio (orquesta el Paso 6 del CU).
 */

// ---------------------------------------------------------------------------
// Precondiciones (datos mock, sin login real)
// ---------------------------------------------------------------------------
/** Precondiciones 1, 2 y 3: Cocinero autenticado, documentación validada y vigente, radio de cobertura configurado. */
const COCINERO_ACTUAL = Object.freeze({
  id: 'coc-001',
  nombre: 'Ramiro Staropoli',
  documentacionValidada: true,
  documentacionVigente: true,
  radioCoberturaKm: 5,
});

const ESTADO_SERVICIO = Object.freeze({ ACTIVO: 'Activo' });

const CLAVE_ALMACENAMIENTO = 'provecho.cu003.servicios.v1';
const DEMORA_VERIFICACION_MS = 800;

/** Días en orden de calendario. Nielsen #2 – abreviaturas como en un calendario. */
// SUPUESTO: se usan abreviaturas de 2 letras consistentes ("Vi.", no "Vie.") tanto en rangos como en listas.
const DIAS_SEMANA = Object.freeze([
  { codigo: 'L', nombre: 'Lunes', abrev: 'Lu.' },
  { codigo: 'M', nombre: 'Martes', abrev: 'Ma.' },
  { codigo: 'X', nombre: 'Miércoles', abrev: 'Mi.' },
  { codigo: 'J', nombre: 'Jueves', abrev: 'Ju.' },
  { codigo: 'V', nombre: 'Viernes', abrev: 'Vi.' },
  { codigo: 'S', nombre: 'Sábado', abrev: 'Sá.' },
  { codigo: 'D', nombre: 'Domingo', abrev: 'Do.' },
]);

// ---------------------------------------------------------------------------
// Formato para la UI (Nielsen #2 – relación con el mundo real)
// ---------------------------------------------------------------------------
const Formato = {
  /** "Lu. a Vi." si hay 3+ días consecutivos; si no, lista "Lu., Mi., Vi.". */
  dias(codigos) {
    const indices = DIAS_SEMANA
      .map((d, i) => (codigos.includes(d.codigo) ? i : -1))
      .filter((i) => i >= 0);
    // Agrupa en tramos consecutivos
    const tramos = [];
    indices.forEach((i) => {
      const ultimo = tramos[tramos.length - 1];
      if (ultimo && i === ultimo[ultimo.length - 1] + 1) ultimo.push(i);
      else tramos.push([i]);
    });
    // SUPUESTO: un tramo de 3 o más días se muestra como rango ("Lu. a Mi."); 2 días seguidos se listan.
    return tramos
      .map((t) => (t.length >= 3
        ? `${DIAS_SEMANA[t[0]].abrev} a ${DIAS_SEMANA[t[t.length - 1]].abrev}`
        : t.map((i) => DIAS_SEMANA[i].abrev).join(', ')))
      .join(', ');
  },

  horario(desde, hasta) {
    return `${desde}hs a ${hasta}hs`;
  },

  diasYHorario(servicio) {
    return `${Formato.dias(servicio.dias)} ${Formato.horario(servicio.horaDesde, servicio.horaHasta)}`;
  },

  /** Formato de miles argentino: 15000 → "$15.000" */
  precio(numero) {
    return '$' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(numero);
  },

  rangoPrecios(min, max) {
    return `${Formato.precio(min)} - ${Formato.precio(max)} por persona`;
  },
};

// ---------------------------------------------------------------------------
// Entidad Servicio
// ---------------------------------------------------------------------------
class Servicio {
  constructor({
    id = Servicio.generarId(),
    nombre,
    descripcion,
    dias = [],
    horaDesde,
    horaHasta,
    precioMin,
    precioMax,
    fotos = [],
    estado = null,
    cocinero = null,
    radioVisibilidadKm = null,
    fechaPublicacion = null,
  }) {
    this.id = id;
    this.nombre = nombre;
    this.descripcion = descripcion;
    this.dias = dias;
    this.horaDesde = horaDesde;
    this.horaHasta = horaHasta;
    this.precioMin = precioMin;
    this.precioMax = precioMax;
    this.fotos = fotos; // data URLs reducidas
    this.estado = estado;
    this.cocinero = cocinero; // referencia { id, nombre }
    this.radioVisibilidadKm = radioVisibilidadKm;
    this.fechaPublicacion = fechaPublicacion;
  }

  static generarId() {
    return `srv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  /** CU003 - Paso 6 / Postcondición: el servicio queda "Activo" y asociado al Cocinero. */
  activar(cocinero) {
    this.estado = ESTADO_SERVICIO.ACTIVO;
    this.cocinero = { id: cocinero.id, nombre: cocinero.nombre };
    this.fechaPublicacion = new Date().toISOString();
  }

  /** CU003 - Paso 6: visible para los Clientes dentro del radio de cobertura del Cocinero. */
  hacerVisibleEnRadio(radioKm) {
    this.radioVisibilidadKm = radioKm;
  }
}

/** Datos de ejemplo precargados (como en IGU_MIS_SERVICIOS). */
function serviciosDeEjemplo() {
  const base = (datos) => {
    const s = new Servicio(datos);
    s.activar(COCINERO_ACTUAL);
    s.hacerVisibleEnRadio(COCINERO_ACTUAL.radioCoberturaKm);
    return s;
  };
  return [
    base({
      id: 'srv-ejemplo-1',
      nombre: 'Pastas caseras a la pomarola',
      descripcion: 'Entrada, plato principal y postre. Ingredientes: harina, huevo, tomate perita, albahaca y queso rallado.',
      dias: ['L', 'M', 'X', 'J', 'V'],
      horaDesde: '12:30', horaHasta: '15:00',
      precioMin: 15000, precioMax: 20000,
    }),
    base({
      id: 'srv-ejemplo-2',
      nombre: 'Cocina tailandesa',
      descripcion: 'Entrada, plato principal y postre. Ingredientes: arroz jazmín, curry rojo, leche de coco, maní y lima.',
      dias: ['V', 'S'],
      horaDesde: '20:00', horaHasta: '00:00',
      precioMin: 18000, precioMax: 25000,
    }),
    base({
      id: 'srv-ejemplo-3',
      nombre: 'Sushi',
      descripcion: 'Entrada, plato principal y postre. Ingredientes: arroz, salmón rosado, palta, queso crema y alga nori.',
      dias: ['J', 'V', 'S', 'D'],
      horaDesde: '19:30', horaHasta: '23:30',
      precioMin: 22000, precioMax: 30000,
    }),
  ];
}

// ---------------------------------------------------------------------------
// Persistencia simulada (localStorage con try/catch y respaldo en memoria)
// ---------------------------------------------------------------------------
class RepositorioServicios {
  constructor(clave, fabricaSemilla) {
    this.clave = clave;
    this.fabricaSemilla = fabricaSemilla;
    this.servicios = this.cargar();
  }

  cargar() {
    try {
      const crudo = localStorage.getItem(this.clave);
      if (crudo !== null) {
        return JSON.parse(crudo).map((obj) => new Servicio(obj));
      }
    } catch (e) {
      console.warn('No se pudo leer localStorage; se usan datos en memoria.', e);
    }
    const semilla = this.fabricaSemilla();
    this.servicios = semilla;
    this.persistir();
    return semilla;
  }

  persistir() {
    try {
      localStorage.setItem(this.clave, JSON.stringify(this.servicios));
      return true;
    } catch (e) {
      console.warn('No se pudo guardar en localStorage.', e);
      return false;
    }
  }

  listar() {
    return [...this.servicios];
  }

  /** El servicio nuevo se agrega primero en la lista. */
  agregar(servicio) {
    this.servicios.unshift(servicio);
    if (this.persistir()) return;
    // SUPUESTO: si se excede la cuota de almacenamiento, se guarda solo la primera foto; si aún falla, sin fotos.
    // En ese último caso el servicio queda igual en memoria durante la sesión.
    if (servicio.fotos.length > 1) {
      servicio.fotos = servicio.fotos.slice(0, 1);
      if (this.persistir()) return;
    }
    const fotos = servicio.fotos;
    servicio.fotos = [];
    if (!this.persistir()) servicio.fotos = fotos;
  }

  reiniciar() {
    this.servicios = this.fabricaSemilla();
    this.persistir();
  }
}

// ---------------------------------------------------------------------------
// Controlador del caso de uso
// ---------------------------------------------------------------------------
class ControladorPublicarServicio {
  constructor(cocinero, repositorio) {
    this.cocinero = cocinero;
    this.repositorio = repositorio;
    this.cadenaValidacion = this.construirCadenaValidacion();
  }

  /** Arma la cadena: Nombre → Descripción → Días → Horarios → Precios → Foto (mismo orden que el formulario). */
  construirCadenaValidacion() {
    const inicio = new ValidadorNombre();
    inicio
      .setSiguiente(new ValidadorDescripcion())
      .setSiguiente(new ValidadorDias())
      .setSiguiente(new ValidadorHorarios())
      .setSiguiente(new ValidadorPrecios())
      .setSiguiente(new ValidadorFoto());
    return inicio;
  }

  /** CU003 - Paso 6 / FA 6.1: devuelve todos los errores [{ campo, mensaje }]. */
  validarDatos(datos) {
    return this.cadenaValidacion.validar(datos, []);
  }

  /**
   * <<include>> Verificar disponibilidad (simulado).
   * SUPUESTO: comprueba las precondiciones del Cocinero (documentación vigente y radio configurado)
   * con una demora simulada de ~800 ms; con los datos mock siempre resulta disponible.
   */
  verificarDisponibilidad() {
    return new Promise((resolver) => {
      setTimeout(() => {
        const c = this.cocinero;
        resolver(Boolean(c.documentacionValidada && c.documentacionVigente && c.radioCoberturaKm > 0));
      }, DEMORA_VERIFICACION_MS);
    });
  }

  /** CU003 - Paso 6: registra el servicio "Activo", asociado al Cocinero y visible en su radio. */
  registrarServicio(datos) {
    const servicio = new Servicio({
      nombre: textoNormalizado(datos.nombre),
      descripcion: textoNormalizado(datos.descripcion),
      dias: DIAS_SEMANA.map((d) => d.codigo).filter((c) => datos.dias.includes(c)),
      horaDesde: textoNormalizado(datos.horaDesde),
      horaHasta: textoNormalizado(datos.horaHasta),
      precioMin: convertirANumero(textoNormalizado(datos.precioMin)),
      precioMax: convertirANumero(textoNormalizado(datos.precioMax)),
      fotos: (datos.fotos || []).map((f) => f.miniatura).filter(Boolean),
    });
    servicio.activar(this.cocinero);
    servicio.hacerVisibleEnRadio(this.cocinero.radioCoberturaKm);
    this.repositorio.agregar(servicio);
    return servicio;
  }

  /**
   * CU003 - Paso 6 completo.
   * SUPUESTO: se valida primero (localmente, instantáneo) y solo si los datos son correctos se invoca
   * Verificar disponibilidad y se registra; así los errores de FA 6 se informan sin esperar.
   */
  async publicarServicio(datos) {
    const errores = this.validarDatos(datos);
    if (errores.length > 0) return { ok: false, errores };

    const disponible = await this.verificarDisponibilidad();
    if (!disponible) {
      return {
        ok: false,
        errores: [{ campo: null, mensaje: 'No es posible publicar: verificá tu documentación y tu radio de cobertura' }],
      };
    }
    return { ok: true, servicio: this.registrarServicio(datos) };
  }

  obtenerServicios() {
    return this.repositorio.listar();
  }

  reiniciarDatos() {
    this.repositorio.reiniciar();
  }
}
