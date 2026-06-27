// Lógica de negocio del módulo de Importación: define la "plantilla" de
// columnas esperada por cada módulo importable, valida fila por fila
// (tipos, requeridos, duplicados, referencias a otras tablas) y finalmente
// inserta las filas válidas reutilizando los modelos ya existentes para
// mantener la misma lógica de creación (y así no duplicar reglas).
const miembrosModel = require('../models/miembros.model');
const nivelesModel = require('../models/niveles.model');
const horariosModel = require('../models/horarios.model');
const pagosModel = require('../models/pagos.model');
const { parsearFecha, parsearHora, parsearBooleano } = require('../utils/importador');

const DIAS_VALIDOS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
const TIPOS_DOCUMENTO_VALIDOS = ['CC', 'TI', 'CE', 'PASAPORTE'];

const PLANTILLAS = {
  miembros: {
    titulo: 'Miembros',
    columnas: [
      { titulo: 'Nombres completos*', campo: 'nombres_completos', tipo: 'texto', requerido: true },
      { titulo: 'Tipo documento* (CC/TI/CE/PASAPORTE)', campo: 'tipo_documento', tipo: 'enum', enumValores: TIPOS_DOCUMENTO_VALIDOS, requerido: true },
      { titulo: 'Número documento*', campo: 'numero_documento', tipo: 'texto', requerido: true },
      { titulo: 'WhatsApp*', campo: 'whatsapp', tipo: 'texto', requerido: true },
      { titulo: 'Email', campo: 'email', tipo: 'texto', requerido: false },
      { titulo: 'Fecha nacimiento (AAAA-MM-DD)', campo: 'fecha_nacimiento', tipo: 'fecha', requerido: false },
      { titulo: 'Dirección', campo: 'direccion', tipo: 'texto', requerido: false },
      { titulo: 'Tipo sangre', campo: 'tipo_sangre', tipo: 'texto', requerido: false },
      { titulo: 'EPS', campo: 'eps', tipo: 'texto', requerido: false },
      { titulo: 'Padece enfermedad (Si/No)', campo: 'padece_enfermedad', tipo: 'booleano', requerido: false },
      { titulo: 'Enfermedad cuál', campo: 'enfermedad_cual', tipo: 'texto', requerido: false },
      { titulo: 'Sufre alergia (Si/No)', campo: 'sufre_alergia', tipo: 'booleano', requerido: false },
      { titulo: 'Alergia cuál', campo: 'alergia_cual', tipo: 'texto', requerido: false },
      { titulo: 'Toma medicamentos (Si/No)', campo: 'toma_medicamentos', tipo: 'booleano', requerido: false },
      { titulo: 'Medicamentos cuáles', campo: 'medicamentos_cuales', tipo: 'texto', requerido: false },
      { titulo: 'Restricciones físicas', campo: 'restricciones_fisicas', tipo: 'texto', requerido: false },
      { titulo: 'Exento de pago (Si/No)', campo: 'exento_pago', tipo: 'booleano', requerido: false },
      { titulo: 'Asistencia obligatoria (Si/No)', campo: 'asistencia_obligatoria', tipo: 'booleano', requerido: false },
    ],
  },
  niveles: {
    titulo: 'Niveles',
    columnas: [
      { titulo: 'Nombre*', campo: 'nombre', tipo: 'texto', requerido: true },
      { titulo: 'Descripción', campo: 'descripcion', tipo: 'texto', requerido: false },
    ],
  },
  horarios: {
    titulo: 'Horarios',
    columnas: [
      { titulo: 'Nivel* (nombre exacto)', campo: 'nivel_nombre', tipo: 'texto', requerido: true },
      { titulo: 'Día semana* (LUNES..DOMINGO)', campo: 'dia_semana', tipo: 'enum', enumValores: DIAS_VALIDOS, requerido: true },
      { titulo: 'Hora inicio* (HH:MM)', campo: 'hora_inicio', tipo: 'hora', requerido: true },
      { titulo: 'Hora fin* (HH:MM)', campo: 'hora_fin', tipo: 'hora', requerido: true },
      { titulo: 'Tolerancia minutos', campo: 'tolerancia_minutos', tipo: 'numero', requerido: false },
    ],
  },
  pagos: {
    titulo: 'Pagos',
    columnas: [
      { titulo: 'Número documento miembro*', campo: 'numero_documento', tipo: 'texto', requerido: true },
      { titulo: 'Valor*', campo: 'valor', tipo: 'numero', requerido: true },
      { titulo: 'Fecha pago* (AAAA-MM-DD)', campo: 'fecha_pago', tipo: 'fecha', requerido: true },
      { titulo: 'Mes correspondiente* (1-12)', campo: 'mes_correspondiente', tipo: 'numero', requerido: true },
      { titulo: 'Año correspondiente*', campo: 'anio_correspondiente', tipo: 'numero', requerido: true },
      { titulo: 'Observaciones', campo: 'observaciones', tipo: 'texto', requerido: false },
    ],
  },
};

function obtenerPlantilla(modulo) {
  return PLANTILLAS[modulo] || null;
}

// Valida y normaliza el valor de UNA celda según el tipo de su columna.
// Devuelve { valor } si es válida o { error: 'mensaje' } si no lo es.
function validarCelda(columna, valorCrudo) {
  const vacio = valorCrudo === undefined || valorCrudo === null || String(valorCrudo).trim() === '';

  if (vacio) {
    if (columna.requerido) return { error: `"${columna.titulo}" es obligatorio` };
    if (columna.tipo === 'booleano') return { valor: 0 };
    return { valor: null };
  }

  switch (columna.tipo) {
    case 'numero': {
      const numero = Number(String(valorCrudo).replace(',', '.'));
      if (!Number.isFinite(numero)) return { error: `"${columna.titulo}" debe ser un número` };
      return { valor: numero };
    }
    case 'fecha': {
      const fecha = parsearFecha(valorCrudo);
      if (fecha === undefined) return { error: `"${columna.titulo}" tiene un formato de fecha inválido` };
      return { valor: fecha };
    }
    case 'hora': {
      const hora = parsearHora(valorCrudo);
      if (hora === undefined) return { error: `"${columna.titulo}" tiene un formato de hora inválido` };
      return { valor: hora };
    }
    case 'enum': {
      const texto = String(valorCrudo).trim().toUpperCase();
      if (!columna.enumValores.includes(texto)) {
        return { error: `"${columna.titulo}" debe ser uno de: ${columna.enumValores.join(', ')}` };
      }
      return { valor: texto };
    }
    case 'booleano':
      return { valor: parsearBooleano(valorCrudo) };
    default:
      return { valor: String(valorCrudo).trim() };
  }
}

// Convierte las filas crudas (array de arrays, incluye encabezado en [0])
// en { validas: [{ fila, datos }], errores: [{ fila, mensajes }], totalFilas }.
// `fila` es el número de fila tal como aparece en Excel (encabezado = 1).
async function validarFilas(modulo, filasCrudas) {
  const plantilla = obtenerPlantilla(modulo);
  const columnas = plantilla.columnas;
  const filasDatos = filasCrudas.slice(1).filter((fila) => fila.some((c) => String(c ?? '').trim() !== ''));

  const validas = [];
  const errores = [];

  const documentosEnArchivo = new Set();
  const nombresEnArchivo = new Set();
  const horariosEnArchivo = new Set();
  const pagosEnArchivo = new Set();
  const cacheNiveles = new Map();
  const cacheMiembros = new Map();

  for (let i = 0; i < filasDatos.length; i++) {
    const fila = filasDatos[i];
    const numeroFila = i + 2;
    const mensajes = [];
    const datos = {};

    columnas.forEach((columna, indice) => {
      const resultado = validarCelda(columna, fila[indice]);
      if (resultado.error) mensajes.push(resultado.error);
      else datos[columna.campo] = resultado.valor;
    });

    if (mensajes.length === 0) {
      if (modulo === 'miembros') {
        const doc = datos.numero_documento;
        if (documentosEnArchivo.has(doc)) {
          mensajes.push('Número de documento duplicado en el archivo');
        } else {
          documentosEnArchivo.add(doc);
          // eslint-disable-next-line no-await-in-loop
          const existente = await miembrosModel.obtenerPorDocumento(doc);
          if (existente) mensajes.push(`Ya existe un miembro con el documento ${doc}`);
        }
      }

      if (modulo === 'niveles') {
        const clave = datos.nombre.toLowerCase();
        if (nombresEnArchivo.has(clave)) {
          mensajes.push('Nombre de nivel duplicado en el archivo');
        } else {
          nombresEnArchivo.add(clave);
          // eslint-disable-next-line no-await-in-loop
          const existente = await nivelesModel.obtenerPorNombre(datos.nombre);
          if (existente) mensajes.push(`Ya existe un nivel llamado "${datos.nombre}"`);
        }
      }

      if (modulo === 'horarios') {
        const claveNivel = datos.nivel_nombre.toLowerCase();
        let nivel = cacheNiveles.get(claveNivel);
        if (nivel === undefined) {
          // eslint-disable-next-line no-await-in-loop
          nivel = (await nivelesModel.obtenerPorNombre(datos.nivel_nombre)) || null;
          cacheNiveles.set(claveNivel, nivel);
        }
        if (!nivel) {
          mensajes.push(`No existe un nivel llamado "${datos.nivel_nombre}"`);
        } else {
          datos.nivel_id = nivel.id;
        }

        const claveHorario = `${claveNivel}|${datos.dia_semana}|${datos.hora_inicio}`;
        if (horariosEnArchivo.has(claveHorario)) mensajes.push('Horario duplicado en el archivo');
        else horariosEnArchivo.add(claveHorario);
      }

      if (modulo === 'pagos') {
        const doc = datos.numero_documento;
        let miembro = cacheMiembros.get(doc);
        if (miembro === undefined) {
          // eslint-disable-next-line no-await-in-loop
          miembro = (await miembrosModel.obtenerPorDocumento(doc)) || null;
          cacheMiembros.set(doc, miembro);
        }
        if (!miembro) {
          mensajes.push(`No existe un miembro con el documento ${doc}`);
        } else {
          datos.miembro_id = miembro.id;
        }

        if (datos.mes_correspondiente < 1 || datos.mes_correspondiente > 12) {
          mensajes.push('"Mes correspondiente*" debe estar entre 1 y 12');
        }

        const clavePago = `${doc}|${datos.valor}|${datos.fecha_pago}|${datos.mes_correspondiente}|${datos.anio_correspondiente}`;
        if (pagosEnArchivo.has(clavePago)) mensajes.push('Pago duplicado en el archivo (mismo miembro, valor y periodo)');
        else pagosEnArchivo.add(clavePago);
      }
    }

    if (mensajes.length > 0) errores.push({ fila: numeroFila, mensajes });
    else validas.push({ fila: numeroFila, datos });
  }

  return { validas, errores, totalFilas: filasDatos.length };
}

// Inserta las filas válidas reutilizando los modelos existentes. Si una
// fila puntual falla al guardar (p. ej. una condición de carrera de
// duplicado), se registra como error y se continúa con las siguientes en
// vez de abortar todo el lote.
async function insertarFilas(modulo, validas, { usuarioId } = {}) {
  let insertadas = 0;
  const erroresInsercion = [];

  for (const { fila, datos } of validas) {
    try {
      if (modulo === 'miembros') {
        // eslint-disable-next-line no-await-in-loop
        await miembrosModel.crear(datos);
      } else if (modulo === 'niveles') {
        // eslint-disable-next-line no-await-in-loop
        await nivelesModel.crear(datos);
      } else if (modulo === 'horarios') {
        // eslint-disable-next-line no-await-in-loop
        await horariosModel.crear(datos);
      } else if (modulo === 'pagos') {
        // eslint-disable-next-line no-await-in-loop
        await pagosModel.crear({ ...datos, registrado_por: usuarioId });
      }
      insertadas++;
    } catch (err) {
      erroresInsercion.push({ fila, mensajes: [err.message || 'Error al guardar el registro'] });
    }
  }

  return { insertadas, erroresInsercion };
}

module.exports = { PLANTILLAS, obtenerPlantilla, validarFilas, insertarFilas };
