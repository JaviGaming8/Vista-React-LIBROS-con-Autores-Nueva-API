// validaciones.js

/**
 * Valida un objeto libro.
 * @param {Object} libro - Contiene título, fechaPublicacion y autorLibro.
 * @returns {Object} Resultado de la validación.
 */
export function validarLibro(libro) {
  const errores = [];

  // Validar título
  if (!libro.titulo || libro.titulo.trim().length < 3) {
    errores.push('El título es obligatorio y debe tener al menos 3 caracteres.');
  }

  // Validar fecha de publicación
  if (!libro.fechaPublicacion) {
    errores.push('La fecha de publicación es obligatoria.');
  } else {
    const fecha = new Date(libro.fechaPublicacion);
    const hoy = new Date();
    if (isNaN(fecha.getTime())) {
      errores.push('La fecha de publicación no es válida.');
    } else if (fecha > hoy) {
      errores.push('La fecha de publicación no puede ser futura.');
    }
  }

  // Validar autorLibro como UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!libro.autorLibro || !uuidRegex.test(libro.autorLibro)) {
    errores.push('El identificador del autor no es válido. Debe tener formato UUID.');
  }

  return {
    esValido: errores.length === 0,
    errores
  };
}
