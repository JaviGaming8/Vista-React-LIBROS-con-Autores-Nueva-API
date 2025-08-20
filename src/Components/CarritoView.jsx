// CarritoView.jsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../Carrito.css';

const API_CARRITO = process.env.REACT_APP_CARRITO_API ?? 'https://localhost:7277/api/Carrito';
const API_LIBROS  = 'https://microserviciolibros.somee.com/api/LibroMaterial';

const useTokenConfig = () => {
  return useMemo(() => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      }
    };
  }, []);
};

// Helpers
const norm = (s) => String(s ?? '').trim().toLowerCase();
const getLibroId = (it) => {
  const raw = it?.libreriaMaterialId ?? it?.libroId ?? it?.idLibro ?? it?.id ?? null;
  return raw != null ? String(raw) : '';
};

// Validaciones
const validarEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());
const validarRFC = (rfc) => /^([A-ZÑ&]{3,4}\d{6}[A-Z\d]{3})$/i.test(rfc.trim());
const validarCURP = (curp) => /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z\d]{2}$/i.test(curp.trim());

const CarritoView = () => {
  const [orden, setOrden] = useState({ total: 0, items: [] });
  const [loading, setLoading] = useState(false);
  const [comprando, setComprando] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [titulosCache, setTitulosCache] = useState({});
  const [mostrarDetalleCompra, setMostrarDetalleCompra] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [datosComprador, setDatosComprador] = useState({
    nombreCompleto: '',
    email: '',
    direccion: '',
    rfc: '',
    curp: '',
    tipoIdentificacion: ''
  });

  const navigate = useNavigate();
  const tokenConfig = useTokenConfig();

  const manejarError = useCallback((error) => {
    console.error('AXIOS ERROR:', error);
    if (error?.response?.status === 401) {
      alert('Sesión expirada. Por favor inicia sesión de nuevo.');
      localStorage.removeItem('token');
      navigate('/login');
      return;
    }
    let detalle = 'Ocurrió un error. Intenta nuevamente.';
    if (error?.response?.data) {
      if (typeof error.response.data === 'string') detalle = error.response.data;
      else if (error.response.data?.title) detalle = error.response.data.title;
      else if (error.response.data?.mensaje) detalle = error.response.data.mensaje;
    }
    setMensaje({ texto: detalle, tipo: 'error' });
  }, [navigate]);

  const fetchOrden = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_CARRITO}/orden`, tokenConfig);
      const data = res?.data && typeof res.data === 'object' ? res.data : { total: 0, items: [] };
      const items = Array.isArray(data.items) ? data.items : [];
      setOrden({ total: Number(data.total || 0), items });
      setMensaje({ texto: '', tipo: '' });
      await enrichTitulos(items);
    } catch (error) {
      manejarError(error);
    } finally {
      setLoading(false);
    }
  }, [tokenConfig, manejarError]);

  useEffect(() => { fetchOrden(); }, [fetchOrden]);

  const enrichTitulos = useCallback(async (items) => {
    const pendientes = Array.from(new Set((items || []).map(getLibroId).filter(id => id && !titulosCache[id])));
    if (!pendientes.length) return;
    const nuevos = {};
    await Promise.all(pendientes.map(async (id) => {
      try {
        const r = await axios.get(`${API_LIBROS}/${id}`, tokenConfig);
        if (r?.data?.titulo) nuevos[id] = r.data.titulo;
      } catch {}
    }));
    if (Object.keys(nuevos).length) setTitulosCache(prev => ({ ...prev, ...nuevos }));
  }, [titulosCache, tokenConfig]);

  const tituloLibroByItem = (it) => titulosCache[getLibroId(it)] || getLibroId(it) || '—';

  const totalGeneral = useMemo(() => {
    const totalBackend = Number(orden.total || 0);
    if (totalBackend > 0) return totalBackend;
    return (orden.items || []).reduce((acc, it) => acc + Number(it.precioTotal || 0), 0);
  }, [orden]);

  const eliminarItem = async (libreriaMaterialIdRaw) => {
    const libreriaMaterialId = String(libreriaMaterialIdRaw);
    if (!window.confirm('¿Eliminar este artículo del carrito?')) return;
    try {
      await axios.delete(`${API_CARRITO}/eliminar/${libreriaMaterialId}`, tokenConfig);
      setMensaje({ texto: 'Artículo eliminado.', tipo: 'exito' });
      await fetchOrden();
    } catch (error) {
      manejarError(error);
    }
  };

  const comprarAhora = () => setMostrarDetalleCompra(true);
  const abrirFormulario = () => setMostrarFormulario(true);

  const confirmarCompra = async () => {
    const { nombreCompleto, email, direccion, rfc, curp, tipoIdentificacion } = datosComprador;

    if (!nombreCompleto.trim()) { setMensaje({ texto: 'El nombre completo es obligatorio.', tipo: 'error' }); return; }
    if (!email.trim() || !validarEmail(email)) { setMensaje({ texto: 'El email no es válido.', tipo: 'error' }); return; }
    if (!direccion.trim()) { setMensaje({ texto: 'La dirección es obligatoria.', tipo: 'error' }); return; }
    if (!tipoIdentificacion) { setMensaje({ texto: 'Selecciona un tipo de identificación.', tipo: 'error' }); return; }
    if (tipoIdentificacion === 'rfc' && !validarRFC(rfc)) { setMensaje({ texto: 'El RFC no tiene un formato válido.', tipo: 'error' }); return; }
    if (tipoIdentificacion === 'curp' && !validarCURP(curp)) { setMensaje({ texto: 'La CURP no tiene un formato válido.', tipo: 'error' }); return; }

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

  return (
    <div className="carrito-container">
      <header className="carrito-header">
        <h2>🛒 Carrito</h2>
        <div className="carrito-actions-top">
          <button className="btn btn-secondary" onClick={fetchOrden} disabled={loading}>
            {loading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </header>

      {mensaje.texto && <div className={`app-mensaje ${mensaje.tipo}`}>{mensaje.texto}</div>}

      {loading && !orden.items.length ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Cargando carrito...</p>
        </div>
      ) : !orden.items.length ? (
        <div className="empty-state">
          <p>Tu carrito está vacío.</p>
          <button className="btn btn-primary" onClick={() => navigate('/libros')}>Ver libros</button>
        </div>
      ) : (
        <>
          {!mostrarDetalleCompra && (
            <div className="tabla-wrapper">
              <table className="tabla-carrito">
                <thead>
                  <tr>
                    <th>Libro</th>
                    <th>Cantidad</th>
                    <th>Precio Unit.</th>
                    <th>Subtotal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {orden.items.map((item, idx) => (
                    <tr key={`${getLibroId(item)}-${idx}`}>
                      <td>{tituloLibroByItem(item)}</td>
                      <td>{item.cantidad}</td>
                      <td>{Number(item.precioUnitario).toFixed(2)}</td>
                      <td>{Number(item.precioTotal).toFixed(2)}</td>
                      <td>
                        <button className="btn btn-outline btn-sm" onClick={() => eliminarItem(getLibroId(item))}>Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'right' }}>Total:</td>
                    <td colSpan={2}><strong>{totalGeneral.toFixed(2)}</strong></td>
                  </tr>
                </tfoot>
              </table>
              <div className="carrito-actions-bottom">
                <button className="btn" onClick={() => navigate('/libros')}>Seguir comprando</button>
                <button className="btn btn-primary" onClick={comprarAhora}>Comprar ahora</button>
              </div>
            </div>
          )}

          {mostrarDetalleCompra && !mostrarFormulario && (
            <div className="detalle-compra">
              <h3>Detalle de tu compra</h3>
              <table className="tabla-carrito">
                <thead>
                  <tr>
                    <th>Libro</th>
                    <th>Cantidad</th>
                    <th>Precio Unit.</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {orden.items.map((item, idx) => (
                    <tr key={`${getLibroId(item)}-${idx}`}>
                      <td>{tituloLibroByItem(item)}</td>
                      <td>{item.cantidad}</td>
                      <td>{Number(item.precioUnitario).toFixed(2)}</td>
                      <td>{Number(item.precioTotal).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} style={{ textAlign: 'right' }}>Total:</td>
                    <td colSpan={2}><strong>{totalGeneral.toFixed(2)}</strong></td>
                  </tr>
                </tfoot>
              </table>
              <div style={{ marginTop: 16 }}>
                <button className="btn btn-outline" onClick={() => setMostrarDetalleCompra(false)}>Cancelar</button>
                <button className="btn btn-success" onClick={abrirFormulario}>Confirmar compra</button>
              </div>
            </div>
          )}

          {mostrarFormulario && (
            <div className="formulario-compra" style={{ border: '1px solid #ccc', padding: 16, borderRadius: 8, maxWidth: 400 }}>
              <h3>Datos del comprador</h3>
              <form onSubmit={e => { e.preventDefault(); confirmarCompra(); }}>
                <div style={{ marginBottom: 8 }}>
                  <label>Nombre completo*</label>
                  <input type="text" value={datosComprador.nombreCompleto} onChange={e => setDatosComprador({ ...datosComprador, nombreCompleto: e.target.value })} required />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label>Email*</label>
                  <input type="email" value={datosComprador.email} onChange={e => setDatosComprador({ ...datosComprador, email: e.target.value })} required />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label>Dirección*</label>
                  <input type="text" value={datosComprador.direccion} onChange={e => setDatosComprador({ ...datosComprador, direccion: e.target.value })} required />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label>Tipo de identificación*</label>
                  <select value={datosComprador.tipoIdentificacion} onChange={e => setDatosComprador({ ...datosComprador, tipoIdentificacion: e.target.value, rfc: '', curp: '' })} required>
                    <option value="">Selecciona...</option>
                    <option value="rfc">RFC</option>
                    <option value="curp">CURP</option>
                  </select>
                </div>
                {datosComprador.tipoIdentificacion === 'rfc' && (
                  <div style={{ marginBottom: 8 }}>
                    <label>RFC*</label>
                    <input type="text" value={datosComprador.rfc} onChange={e => setDatosComprador({ ...datosComprador, rfc: e.target.value })} required />
                  </div>
                )}
                {datosComprador.tipoIdentificacion === 'curp' && (
                  <div style={{ marginBottom: 8 }}>
                    <label>CURP*</label>
                    <input type="text" value={datosComprador.curp} onChange={e => setDatosComprador({ ...datosComprador, curp: e.target.value })} required />
                  </div>
                )}
                <div style={{ marginTop: 16 }}>
                  <button className="btn btn-outline" onClick={() => setMostrarFormulario(false)}>Cancelar</button>
                  <button className="btn btn-success" type="submit" disabled={comprando}>{comprando ? 'Procesando...' : 'Finalizar compra'}</button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CarritoView;
