import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_CARRITO = 'https://localhost:7277/api/Carrito';

const useTokenConfig = () =>
  useMemo(() => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    };
  }, []);

const HistorialView = () => {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [expanded, setExpanded] = useState(() => new Set());
  const [busquedaId, setBusquedaId] = useState('');

  const navigate = useNavigate();
  const tokenConfig = useTokenConfig();

  const manejarError = useCallback(
    (error) => {
      if (error?.response?.status === 401) {
        alert('Sesión expirada. Por favor inicia sesión de nuevo.');
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      let detalle = 'Ocurrió un error. Intenta nuevamente.';
      const data = error?.response?.data;
      if (typeof data === 'string' && data.trim()) detalle = data;
      else if (data?.mensaje) detalle = data.mensaje;
      else if (data?.title) detalle = data.title;

      console.error('AXIOS ERROR:', error);
      setMensaje({ texto: detalle, tipo: 'error' });
    },
    [navigate]
  );

  const fetchHistorial = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_CARRITO}/historial`, tokenConfig);
      const list = Array.isArray(res.data) ? res.data : [];
      list.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setHistorial(list);
      setMensaje({ texto: '', tipo: '' });
      setExpanded(new Set());
    } catch (err) {
      manejarError(err);
    } finally {
      setLoading(false);
    }
  }, [tokenConfig, manejarError]);

  useEffect(() => {
    fetchHistorial();
  }, [fetchHistorial]);

  const fetchDetalle = useCallback(
    async (compraId) => {
      try {
        const res = await axios.get(`${API_CARRITO}/historial/${compraId}`, tokenConfig);
        const detalle = res?.data;
        if (!detalle) return;

        setHistorial((prev) => {
          const idx = prev.findIndex((c) => c.compraId === compraId);
          if (idx === -1) return prev;
          const copy = [...prev];
          copy[idx] = detalle;
          return copy;
        });
      } catch (err) {
        manejarError(err);
      }
    },
    [tokenConfig, manejarError]
  );

  const buscar = async () => {
    if (!busquedaId.trim()) {
      await fetchHistorial();
      return;
    }
    const id = Number(busquedaId);
    if (!Number.isInteger(id) || id <= 0) {
      setMensaje({ texto: 'Ingrese un id de compra válido.', tipo: 'error' });
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`${API_CARRITO}/historial/${id}`, tokenConfig);
      if (!res?.data) {
        setHistorial([]);
        setMensaje({ texto: 'Compra no encontrada.', tipo: 'error' });
      } else {
        setHistorial([res.data]);
        setMensaje({ texto: '', tipo: '' });
        setExpanded(new Set([id]));
      }
    } catch (err) {
      if (err?.response?.status === 404) {
        setHistorial([]);
        setMensaje({ texto: 'Compra no encontrada.', tipo: 'error' });
      } else {
        manejarError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const fmtMoney = (n) =>
    (Number(n || 0)).toLocaleString(undefined, { style: 'currency', currency: 'USD' });

  const toggleExpand = async (id) => {
    const next = new Set(expanded);
    if (next.has(id)) {
      next.delete(id);
      setExpanded(next);
    } else {
      await fetchDetalle(id);
      next.add(id);
      setExpanded(next);
    }
  };

  const totalHistorial = useMemo(
    () => historial.reduce((acc, c) => acc + Number(c.total || 0), 0),
    [historial]
  );

  return (
    <div className="carrito-container">
      <header className="carrito-header">
        <h2>📜 Historial de compras</h2>
        <div className="carrito-actions-top">
          <button className="btn" onClick={() => navigate('/libros')}>Ver libros</button>
          <button className="btn btn-secondary" onClick={fetchHistorial} disabled={loading}>
            {loading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </header>

      <div className="search-group" style={{ marginBottom: 12 }}>
        <input
          type="number"
          placeholder="Buscar por CompraId"
          value={busquedaId}
          onChange={(e) => setBusquedaId(e.target.value)}
          className="form-input"
          style={{ maxWidth: 220, marginRight: 8 }}
        />
        <button className="btn btn-secondary" onClick={buscar} disabled={loading}>
          Buscar
        </button>
        {!!busquedaId && (
          <button
            className="btn btn-outline"
            style={{ marginLeft: 8 }}
            onClick={() => { setBusquedaId(''); fetchHistorial(); }}
          >
            Limpiar
          </button>
        )}
      </div>

      {mensaje.texto && <div className={`app-mensaje ${mensaje.tipo}`}>{mensaje.texto}</div>}

      {loading && !historial.length ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Cargando historial...</p>
        </div>
      ) : !historial.length ? (
        <div className="empty-state">
          <p>No hay compras registradas.</p>
          <button className="btn btn-primary" onClick={() => navigate('/libros')}>
            Ir al catálogo
          </button>
        </div>
      ) : (
        <>
          <div className="tabla-wrapper">
            <table className="tabla-carrito">
              <thead>
                <tr>
                  <th></th>
                  <th>CompraId</th>
                  <th>Fecha</th>
                  <th>Monto</th>
                  <th>Items</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((c) => {
                  const abierto = expanded.has(c.compraId);
                  return (
                    <React.Fragment key={c.compraId}>
                      <tr>
                        <td style={{ width: 56 }}>
                          <button className="btn btn-sm" onClick={() => toggleExpand(c.compraId)}>
                            {abierto ? '−' : '+'}
                          </button>
                        </td>
                        <td><strong>#{c.compraId}</strong></td>
                        <td>{new Date(c.fecha).toLocaleString()}</td>
                        <td><strong>{fmtMoney(c.total)}</strong></td>
                        <td>{Array.isArray(c.items) ? c.items.length : 0}</td>
                      </tr>

                      {abierto && Array.isArray(c.items) && c.items.length > 0 && (
                        <tr>
                          <td colSpan={5} style={{ background: '#fafafa' }}>
                            <div className="tabla-wrapper" style={{ marginTop: 8 }}>
                              <table className="tabla-carrito">
                                <thead>
                                  <tr>
                                    <th>ItemId</th>
                                    <th>Libro (GUID)</th>
                                    <th>AutorId</th>
                                    <th>AutorGuid</th>
                                    <th>Cantidad</th>
                                    <th>Precio Unit.</th>
                                    <th>Subtotal</th>
                                    <th>Fecha Compra</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {c.items.map((it) => (
                                    <tr key={it.id}>
                                      <td>{it.id}</td>
                                      <td className="code">{it.libreriaMaterialId}</td>
                                      <td>{it.autorLibroId ?? '-'}</td>
                                      <td className="code">{it.autorLibroGuid ?? '-'}</td>
                                      <td>{it.cantidad}</td>
                                      <td>{fmtMoney(it.precioUnitario)}</td>
                                      <td><strong>{fmtMoney(it.precioTotal)}</strong></td>
                                      <td>{it.fechaCompra ? new Date(it.fechaCompra).toLocaleString() : '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} />
                  <td colSpan={2} style={{ textAlign: 'right' }}>
                    <strong>Total historial: {fmtMoney(totalHistorial)}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default HistorialView;
