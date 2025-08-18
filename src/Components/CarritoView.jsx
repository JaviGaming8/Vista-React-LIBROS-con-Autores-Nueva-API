// CarritoView.jsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../Carrito.css';

// Ajusta el endpoint de carrito a tu entorno:
const API_CARRITO = process.env.REACT_APP_CARRITO_API ?? 'https://localhost:7277/api/Carrito';
const API_LIBROS  = 'https://microserviciolibros.somee.com/api/LibroMaterial';

// Helper headers (token + JSON)
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

const CarritoView = () => {
  // /orden devuelve { total, items }
  const [orden, setOrden] = useState({ total: 0, items: [] });
  const [loading, setLoading] = useState(false);
  const [comprando, setComprando] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [titulosCache, setTitulosCache] = useState({}); // { libreriaMaterialId: titulo }

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

  // ---------------------------
  // Cargar carrito
  // ---------------------------
  const fetchOrden = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_CARRITO}/orden`, tokenConfig);
      const data = res?.data && typeof res.data === 'object'
        ? res.data
        : { total: 0, items: [] };

      setOrden({
        total: Number(data.total || 0),
        items: Array.isArray(data.items) ? data.items : []
      });
      setMensaje({ texto: '', tipo: '' });

      // Enriquecer títulos (solo UI)
      enrichTitulos(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      manejarError(error);
    } finally {
      setLoading(false);
    }
  }, [tokenConfig, manejarError]);

  useEffect(() => {
    fetchOrden();
  }, [fetchOrden]);

  // ---------------------------
  // Enriquecer títulos de libros (UI)
  // ---------------------------
  const enrichTitulos = async (items) => {
    const toFetch = items
      .map(i => i.libreriaMaterialId)
      .filter(id => id && !titulosCache[id]);

    if (toFetch.length === 0) return;

    try {
      const newCache = {};
      await Promise.all(
        toFetch.map(async (id) => {
          try {
            const r = await axios.get(`${API_LIBROS}/${id}`, tokenConfig);
            const titulo = r?.data?.titulo || '';
            if (titulo) newCache[id] = titulo;
          } catch {
            // ignorar error puntual
          }
        })
      );
      if (Object.keys(newCache).length > 0) {
        setTitulosCache(prev => ({ ...prev, ...newCache }));
      }
    } catch {
      // ignorar
    }
  };

  const tituloLibro = (id) => titulosCache[id] || id;

  // ---------------------------
  // Helper: obtener autor GUID desde Libros si el item no lo trae
  // ---------------------------
  const obtenerAutorGuid = async (libreriaMaterialId) => {
    try {
      const r = await axios.get(`${API_LIBROS}/${libreriaMaterialId}`, tokenConfig);
      // En tu API de Libros, el GUID del autor viene en el campo 'autorLibro'
      return r?.data?.autorLibro || null;
    } catch {
      return null;
    }
  };

  // ---------------------------
  // Totales (si backend ya da total, se usa; si no, calculamos)
  // ---------------------------
  const totalGeneral = useMemo(() => {
    const totalBackend = Number(orden.total || 0);
    if (totalBackend > 0) return totalBackend;
    return (orden.items || []).reduce((acc, it) => acc + Number(it.precioTotal || 0), 0);
  }, [orden]);

  // ---------------------------
  // Eliminar un ítem
  // ---------------------------
  const eliminarItem = async (libreriaMaterialId) => {
    if (!window.confirm('¿Eliminar este artículo del carrito?')) return;
    try {
      await axios.delete(`${API_CARRITO}/eliminar/${libreriaMaterialId}`, tokenConfig);
      setMensaje({ texto: 'Artículo eliminado.', tipo: 'exito' });
      await fetchOrden();
    } catch (error) {
      manejarError(error);
    }
  };

  // ---------------------------
  // Vaciar carrito (eliminar todos one-by-one)
  // ---------------------------
  const vaciarCarrito = async () => {
    if (!orden.items.length) return;
    if (!window.confirm('¿Vaciar el carrito completo?')) return;
    try {
      for (const it of orden.items) {
        await axios.delete(`${API_CARRITO}/eliminar/${it.libreriaMaterialId}`, tokenConfig);
      }
      setMensaje({ texto: 'Carrito vacío.', tipo: 'exito' });
      await fetchOrden();
    } catch (error) {
      manejarError(error);
    }
  };

  // ---------------------------
  // Cambiar cantidad usando POST /agregar (upsert)
  //   -> Enviar SIEMPRE autorLibroGuid (no autorLibroId)
  //   -> fechaCompra sin 'Z' (yyyy-MM-ddTHH:mm:ss)
  // ---------------------------
  const setCantidad = async (item, nuevaCantidad) => {
    const cantidad = Math.max(1, Number(nuevaCantidad || 1));
    try {
      const precioUnitario = Number(item.precioUnitario ?? 0);

      // 1) intentar usar el GUID si viniera en el item (por si actualizas backend para incluirlo)
      let autorGuid = item.autorLibroGuid;

      // 2) si no está en el item, lo traemos desde el microservicio de libros
      if (!autorGuid) {
        autorGuid = await obtenerAutorGuid(item.libreriaMaterialId);
      }

      if (!autorGuid) {
        throw new Error('No se pudo obtener autorLibroGuid para este artículo.');
      }

      const payload = {
        libreriaMaterialId: item.libreriaMaterialId,
        cantidad,
        autorLibroGuid: String(autorGuid),           // <-- SOLO GUID
        precioUnitario,
        precioTotal: +(precioUnitario * cantidad).toFixed(2),
        fechaCompra: new Date().toISOString().slice(0, 19) // yyyy-MM-ddTHH:mm:ss
      };

      await axios.post(`${API_CARRITO}/agregar`, payload, tokenConfig);
      await fetchOrden();
    } catch (error) {
      manejarError(error);
    }
  };

  const incrementar = (item) => setCantidad(item, (Number(item.cantidad || 1) + 1));
  const decrementar = (item) => setCantidad(item, (Number(item.cantidad || 1) - 1));

  // ---------------------------
  // Comprar todo
  // ---------------------------
  const comprarTodo = async () => {
    if (!orden.items.length) return;
    setComprando(true);
    try {
      await axios.post(`${API_CARRITO}/comprar`, {}, tokenConfig);
      setMensaje({ texto: '¡Compra realizada con éxito!', tipo: 'exito' });
      await fetchOrden();
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
          <button className="btn btn-danger" onClick={vaciarCarrito} disabled={loading || !orden.items.length}>
            Vaciar carrito
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
          <button className="btn btn-primary" onClick={() => navigate('/libros')}>
            Ver libros
          </button>
        </div>
      ) : (
        <>
          <div className="tabla-wrapper">
            <table className="tabla-carrito">
              <thead>
                <tr>
                  <th>Libro</th>
                  <th>Autor</th>
                  <th>Fecha</th>
                  <th>Cantidad</th>
                  <th>Precio Unit.</th>
                  <th>Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orden.items.map((item) => (
                  <tr key={item.libreriaMaterialId}>
                    <td>
                      <div className="celda-libro">
                        <div className="titulo">{tituloLibro(item.libreriaMaterialId)}</div>
                        <div className="sub-id">#{item.libreriaMaterialId}</div>
                      </div>
                    </td>
                    <td>
                      <div className="celda-autor">
                        {/* si backend luego añade autorLibroId/Guid al /orden, los mostramos */}
                        {item.autorLibroId ? `ID: ${item.autorLibroId}` : null}
                        <div className="sub-guid">{item.autorLibroGuid || '-'}</div>
                      </div>
                    </td>
                    <td>{item.fechaCompra ? new Date(item.fechaCompra).toLocaleDateString() : '-'}</td>
                    <td>
                      <div className="qty-control">
                        <button className="btn btn-sm" onClick={() => decrementar(item)}>-</button>
                        <input
                          className="qty-input"
                          type="number"
                          min={1}
                          value={Number(item.cantidad ?? 1)}
                          onChange={(e) => setCantidad(item, e.target.value)}
                        />
                        <button className="btn btn-sm" onClick={() => incrementar(item)}>+</button>
                      </div>
                    </td>
                    <td>${Number(item.precioUnitario ?? 0).toFixed(2)}</td>
                    <td><strong>${Number(item.precioTotal ?? 0).toFixed(2)}</strong></td>
                    <td>
                      <button className="btn btn-outline btn-sm" onClick={() => eliminarItem(item.libreriaMaterialId)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} style={{ textAlign: 'right' }}>
                    <strong>Total:</strong>
                  </td>
                  <td colSpan={2}>
                    <strong>${totalGeneral.toFixed(2)}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="carrito-actions-bottom">
            <button className="btn" onClick={() => navigate('/libros')}>Seguir comprando</button>
            <button
              className="btn btn-primary"
              onClick={comprarTodo}
              disabled={comprando || !orden.items.length}
            >
              {comprando ? 'Procesando...' : 'Comprar ahora'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default CarritoView;
