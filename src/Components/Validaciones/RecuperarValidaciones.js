// validationsRecuperar.js

export function validarNombre(nombre) {
  if (!nombre || nombre.trim() === '') {
    return 'El nombre es obligatorio';
  }
  if (nombre.length < 3) {
    return 'El nombre debe tener al menos 3 caracteres';
  }
  return null; // válido
}

export function validarRespuesta(respuesta, mostrarPregunta) {
  if (!mostrarPregunta) {
    return null; // no se valida aún porque no se mostró la pregunta
  }
  if (!respuesta || respuesta.trim() === '') {
    return 'La respuesta es obligatoria';
  }
  if (respuesta.length < 2) {
    return 'La respuesta debe tener al menos 2 caracteres';
  }
  return null; // válido
}
