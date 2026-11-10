'use strict';
/**
 * CU 003 – Publicar Servicio
 * Paso 6 / FA 6: validación de campos obligatorios y de formato.
 * Patrón Chain of Responsibility: cada eslabón valida su campo, acumula
 * errores { campo, mensaje } y SIEMPRE delega al siguiente (no corta en el
 * primer error, así se muestran todos juntos en IGU_ERROR_DATOS).
 */

const LIMITES = Object.freeze({
  NOMBRE_MAX: 25,
  DESCRIPCION_MAX: 350,
  PRECIO_MAX_CARACTERES: 20,
});

const MINUTOS_FIN_DEL_DIA = 24 * 60; // "00:00" en Hasta = medianoche = 1440 min
const MEDIANOCHE = '00:00';

// Letras de cualquier alfabeto (incluye acentos, ñ, ü) y espacios.
const REGEX_NOMBRE = /^[\p{L} ]+$/u;
// Letras, espacios (incluye saltos de línea) y puntuación básica , . ; : ( ) -
const REGEX_DESCRIPCION = /^[\p{L}\s,.;:()\-]+$/u;
const REGEX_HORA = /^(\d{2}):(\d{2})$/;
// SUPUESTO: número decimal = dígitos con separador decimal opcional (punto o coma) y dígitos después.
// Se acepta el signo "-" solo para poder informar "El precio no puede ser negativo".
const REGEX_DECIMAL = /^-?\d+([.,]\d+)?$/;
const REGEX_EXTENSION_FOTO = /\.(png|jpe?g)$/i;

/** SUPUESTO: se ignoran los espacios al inicio y al final de cada campo de texto. */
function textoNormalizado(valor) {
  return String(valor ?? '').normalize('NFC').trim();
}

/** Cuenta caracteres reales (code points), no unidades UTF-16. */
function contarCaracteres(texto) {
  return [...String(texto ?? '').normalize('NFC')].length;
}

function convertirANumero(texto) {
  return Number(String(texto).replace(',', '.'));
}

// ---------------------------------------------------------------------------
// Clase base de la cadena
// ---------------------------------------------------------------------------
class ValidadorBase {
  constructor() {
    this.siguiente = null;
  }

  /** Enlaza el siguiente eslabón. Devuelve el validador recibido para encadenar: a.setSiguiente(b).setSiguiente(c) */
  setSiguiente(validador) {
    this.siguiente = validador;
    return validador;
  }

  /** Ejecuta el chequeo propio y delega al siguiente eslabón. */
  validar(datos, errores = []) {
    this.verificar(datos, errores);
    return this.siguiente ? this.siguiente.validar(datos, errores) : errores;
  }

  /** Cada validador concreto implementa su regla. */
  verificar(_datos, _errores) {
    throw new Error('ValidadorBase.verificar() debe implementarse en la subclase');
  }

  agregarError(errores, campo, mensaje) {
    errores.push({ campo, mensaje });
  }
}

// ---------------------------------------------------------------------------
// Validadores concretos
// ---------------------------------------------------------------------------
class ValidadorNombre extends ValidadorBase {
  verificar(datos, errores) {
    const nombre = textoNormalizado(datos.nombre);
    if (!nombre) {
      this.agregarError(errores, 'nombre', 'El campo nombre es obligatorio');
      return;
    }
    if (contarCaracteres(nombre) > LIMITES.NOMBRE_MAX) {
      this.agregarError(errores, 'nombre', 'El nombre no puede superar de 25 caracteres');
    }
    if (!REGEX_NOMBRE.test(nombre)) {
      this.agregarError(errores, 'nombre', 'El nombre solo puede contener letras');
    }
  }
}

class ValidadorDescripcion extends ValidadorBase {
  verificar(datos, errores) {
    const descripcion = textoNormalizado(datos.descripcion);
    if (!descripcion) {
      this.agregarError(errores, 'descripcion', 'El campo descripcion es obligatorio');
      return;
    }
    if (contarCaracteres(descripcion) > LIMITES.DESCRIPCION_MAX) {
      this.agregarError(errores, 'descripcion', 'La descripcion no puede superar los 350 caracteres');
    }
    if (!REGEX_DESCRIPCION.test(descripcion)) {
      this.agregarError(errores, 'descripcion', 'La descripcion solo puede contener letras y signos de puntuacion basicos');
    }
  }
}

class ValidadorDias extends ValidadorBase {
  verificar(datos, errores) {
    if (!Array.isArray(datos.dias) || datos.dias.length === 0) {
      this.agregarError(errores, 'dias', 'Se debe seleccionar al menos un dia disponible');
    }
  }
}

class ValidadorHorarios extends ValidadorBase {
  static MENSAJES = {
    horaDesde: {
      vacio: 'El campo Horario de inicio es obligatorio',
      formato: 'Horario de inicio debe estar en formato HH:MM',
      hora: 'Horario de inicio con hora invalida',
      minutos: 'Horario de inicio con minutos invalidos',
    },
    horaHasta: {
      vacio: 'El campo Horario de finalizacion es obligatorio',
      formato: 'Horario de finalizacion debe estar en formato HH:MM',
      hora: 'Horario de finalizacion con hora invalida',
      minutos: 'Horario de finalizacion con minutos invalidos',
    },
  };

  /** Valida una hora HH:MM. Devuelve los minutos desde 00:00 o null si es inválida. */
  validarHora(valor, campo, errores) {
    const msj = ValidadorHorarios.MENSAJES[campo];
    if (!valor) {
      this.agregarError(errores, campo, msj.vacio);
      return null;
    }
    // SUPUESTO: HH y MM deben tener exactamente 2 dígitos ("9:30" es formato inválido, usar "09:30").
    const partes = REGEX_HORA.exec(valor);
    if (!partes) {
      this.agregarError(errores, campo, msj.formato);
      return null;
    }
    const horas = Number(partes[1]);
    const minutos = Number(partes[2]);
    let valido = true;
    if (horas > 23) {
      this.agregarError(errores, campo, msj.hora);
      valido = false;
    }
    if (minutos > 59) {
      this.agregarError(errores, campo, msj.minutos);
      valido = false;
    }
    return valido ? horas * 60 + minutos : null;
  }

  verificar(datos, errores) {
    const desde = textoNormalizado(datos.horaDesde);
    const hasta = textoNormalizado(datos.horaHasta);
    const minDesde = this.validarHora(desde, 'horaDesde', errores);
    const minHasta = this.validarHora(hasta, 'horaHasta', errores);

    // La comparación solo tiene sentido si ambos horarios son válidos.
    if (minDesde === null || minHasta === null) return;

    // Excepción de medianoche: "00:00" en Hasta = fin del día (1440 min).
    // "00:00 a 00:00" no es un rango y sigue siendo inválido. No se permiten rangos que crucen la medianoche.
    const esMedianoche = hasta === MEDIANOCHE;
    const minHastaEfectivo = esMedianoche ? MINUTOS_FIN_DEL_DIA : minHasta;
    const rangoNulo = esMedianoche && minDesde === 0;
    if (rangoNulo || minHastaEfectivo <= minDesde) {
      this.agregarError(errores, 'horaHasta', 'El horario de finalizacion debe ser posterior al de inicio');
    }
  }
}

class ValidadorPrecios extends ValidadorBase {
  static MENSAJES = {
    precioMin: {
      vacio: 'El campo precio minimo es obligatorio',
      noNumerico: 'El precio minimo debe ser un numero decimal',
      largo: 'El precio minimo no puede superar los 20 caracteres',
    },
    precioMax: {
      vacio: 'El campo precio maximo es obligatorio',
      noNumerico: 'El precio maximo debe ser un numero decimal',
      largo: 'El precio maximo no puede superar los 20 caracteres',
    },
  };

  /** Valida un precio. Devuelve el número o null si es inválido. */
  validarPrecio(valor, campo, errores) {
    const msj = ValidadorPrecios.MENSAJES[campo];
    if (!valor) {
      this.agregarError(errores, campo, msj.vacio);
      return null;
    }
    let valido = true;
    if (contarCaracteres(valor) > LIMITES.PRECIO_MAX_CARACTERES) {
      this.agregarError(errores, campo, msj.largo);
      valido = false;
    }
    if (!REGEX_DECIMAL.test(valor)) {
      this.agregarError(errores, campo, msj.noNumerico);
      return null;
    }
    const numero = convertirANumero(valor);
    if (numero < 0) {
      this.agregarError(errores, campo, 'El precio no puede ser negativo');
      valido = false;
    }
    return valido ? numero : null;
  }

  verificar(datos, errores) {
    const minimo = this.validarPrecio(textoNormalizado(datos.precioMin), 'precioMin', errores);
    const maximo = this.validarPrecio(textoNormalizado(datos.precioMax), 'precioMax', errores);
    if (minimo !== null && maximo !== null && minimo > maximo) {
      // SUPUESTO: el error de rango se asocia (y resalta) en el campo "precio máximo".
      this.agregarError(errores, 'precioMax', 'El precio minimo no puede ser mayor al precio maximo');
    }
  }
}

class ValidadorFoto extends ValidadorBase {
  verificar(datos, errores) {
    const fotos = Array.isArray(datos.fotos) ? datos.fotos : [];
    // Fotos opcionales: sin fotos no hay error.
    // SUPUESTO: el formato se determina por la extensión del nombre del archivo; un único mensaje aunque fallen varias.
    const hayInvalidas = fotos.some((foto) => !REGEX_EXTENSION_FOTO.test(String(foto.nombre || '')));
    if (hayInvalidas) {
      this.agregarError(errores, 'fotos', 'La foto debe estar en formato .png o .jpg');
    }
  }
}
