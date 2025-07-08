// validationsLogin.js

export function validarNombre(nombre) {
  if (!nombre || nombre.trim() === '') {
    return 'El nombre es obligatorio';
  }
  if (nombre.length < 3) {
    return 'El nombre debe tener al menos 3 caracteres';
  }
  return null; // válido
}

export function validarContraseña(contraseña) {
  if (!contraseña || contraseña.trim() === '') {
    return 'La contraseña es obligatoria';
  }
  if (contraseña.length < 6) {
    return 'La contraseña debe tener al menos 6 caracteres';
  }
  return null; // válido
}
