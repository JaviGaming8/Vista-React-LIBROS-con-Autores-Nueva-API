// validationsRegistrar.js

// Validar nombre: obligatorio, mínimo 3 caracteres
export function validarNombre(nombre) {
  if (!nombre || nombre.trim() === '') {
    return 'El nombre es obligatorio';
  }
  if (nombre.trim().length < 3) {
    return 'El nombre debe tener al menos 3 caracteres';
  }
  return null;
}

// Validar contraseña: obligatorio, mínimo 6 caracteres, al menos 1 número y 1 letra
export function validarContraseña(contraseña) {
  if (!contraseña || contraseña.trim() === '') {
    return 'La contraseña es obligatoria';
  }
  if (contraseña.length < 6) {
    return 'La contraseña debe tener al menos 6 caracteres';
  }
  if (!/[A-Za-z]/.test(contraseña) || !/\d/.test(contraseña)) {
    return 'La contraseña debe contener al menos una letra y un número';
  }
  return null;
}

// Validar pregunta de recuperación: obligatorio, mínimo 5 caracteres
export function validarPregunta(pregunta) {
  if (!pregunta || pregunta.trim() === '') {
    return 'La pregunta de recuperación es obligatoria';
  }
  if (pregunta.trim().length < 5) {
    return 'La pregunta debe tener al menos 5 caracteres';
  }
  return null;
}

// Validar respuesta: obligatorio, mínimo 3 caracteres
export function validarRespuesta(respuesta) {
  if (!respuesta || respuesta.trim() === '') {
    return 'La respuesta es obligatoria';
  }
  if (respuesta.trim().length < 3) {
    return 'La respuesta debe tener al menos de 3 caracteres';
  }
  return null;
}
