// ...mantengo el resto del código igual, solo actualizo el formulario y confirmarCompra

const validarEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

const validarRFC = (rfc) => {
  const re = /^([A-ZÑ&]{3,4}\d{6}[A-Z\d]{3})$/i;
  return re.test(rfc.trim());
};

const validarCURP = (curp) => {
  const re = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z\d]{2}$/i;
  return re.test(curp.trim());
};

const confirmarCompra = async () => {
  const { nombreCompleto, email, direccion, rfc, curp, tipoIdentificacion } = datosComprador;

  if (!nombreCompleto.trim()) {
    setMensaje({ texto: 'El nombre completo es obligatorio.', tipo: 'error' });
    return;
  }

  if (!email.trim() || !validarEmail(email)) {
    setMensaje({ texto: 'El email no es válido.', tipo: 'error' });
    return;
  }

  if (!direccion.trim()) {
    setMensaje({ texto: 'La dirección es obligatoria.', tipo: 'error' });
    return;
  }

  if (!tipoIdentificacion) {
    setMensaje({ texto: 'Selecciona un tipo de identificación.', tipo: 'error' });
    return;
  }

  if (tipoIdentificacion === 'rfc' && !validarRFC(rfc)) {
    setMensaje({ texto: 'El RFC no tiene un formato válido.', tipo: 'error' });
    return;
  }

  if (tipoIdentificacion === 'curp' && !validarCURP(curp)) {
    setMensaje({ texto: 'La CURP no tiene un formato válido.', tipo: 'error' });
    return;
  }

  setComprando(true);
  try {
    const payload = {
      nombreCompleto: nombreCompleto.trim(),
      email: email.trim(),
      direccion: direccion.trim(),
      rfc:  tipoIdentificacion === 'rfc'  ? rfc.trim()  : '',
      curp: tipoIdentificacion === 'curp' ? curp.trim() : '',
      items: orden.items,
      total: totalGeneral
    };
    await axios.post(`${API_CARRITO}/comprar`, payload, tokenConfig);
    setMensaje({ texto: '¡Compra realizada con éxito!', tipo: 'exito' });
    setMostrarFormulario(false);
    setMostrarDetalleCompra(false);
    setDatosComprador({ nombreCompleto: '', email: '', direccion: '', rfc: '', curp: '', tipoIdentificacion: '' });
    setOrden({ total: 0, items: [] });
  } catch (error) {
    manejarError(error);
  } finally {
    setComprando(false);
  }
};
