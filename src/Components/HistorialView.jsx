// HistorialView.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Endpoints (alineados con tus otras vistas)
const API_CARRITO = 'https://localhost:7277/api/Carrito';
const API_LIBROS = 'https://microserviciolibros.somee.com/api/LibroMaterial';
const API_AUTOR = 'https://microservicioautoresapi.somee.com/api/Autor';

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

const norm = (s) => String(s ?? '').trim().toLowerCase();

const HistorialView = () => {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [expanded, setExpanded] = useState(() => new Set());
  const [busquedaId, setBusquedaId] = useState('');

  // caches
  const [autoresMap, setAutoresMap] = useState(null); // guid -> nombre
  const [titulosCache, setTitulosCache] = useState({}); // libroId -> titulo

  const navigate = useNavigate();
  const tokenConfig = useTokenConfig();

  const manejarError = useCallback((error) => {
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
  }, [navigate]);

  // Cargar historial
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

  // Cargar autores una sola vez
  const cargarAutoresMap = useCallback(async () => {
    try {
      const r = await axios.get(API_AUTOR, tokenConfig);
      const lista = Array.isArray(r.data) ? r.data : [];
      const map = {};
      for (const a of lista) {
        const guid = norm(a.autorLibroGuid || a.id || a.autorLibroId);
        const nombre =
          a.nombreCompleto ||
          [a.nombre, a.apellido].filter(Boolean).join(' ').trim() ||
          'Desconocido';
        if (guid) map[guid] = nombre;
      }
      setAutoresMap(map);
    } catch (e) {
      console.error('No se pudo cargar autores', e);
      setAutoresMap({}); // evita reintentos infinitos
    }
  }, [tokenConfig]);

  useEffect(() => {
    if (autoresMap === null) {
      cargarAutoresMap();
    }
  }, [autoresMap, cargarAutoresMap]);

  // Resolver títulos en lote con cache
  const enrichTitulos = useCallback(async (items) => {
    const pendientes = Array.from(
      new Set(
        (items || [])
          .map(it => it.libreriaMaterialId)
          .filter(id => id && !titulosCache[id])
      )
    );
    if (!pendientes.length) return;

    const nuevos = {};
    await Promise.all(
      pendientes.map(async (id) => {
        try {
          const r = await axios.get(`${API_LIBROS}/${id}`, tokenConfig);
          if (r?.data?.titulo) nuevos[id] = r.data.titulo;
        } catch (err) {
          // si falla, lo dejamos sin título (se mostrará el id)
        }
      })
    );
    if (Object.keys(nuevos).length) {
      setTitulosCache(prev => ({ ...prev, ...nuevos }));
    }
  }, [titulosCache, tokenConfig]);

  // Obtener detalle de una compra, con nombreAutor y título
  const fetchDetalle = useCallback(async (compraId) => {
    try {
      const res = await axios.get(`${API_CARRITO}/orden/${compraId}`, tokenConfig);
      const detalle = res?.data;
      if (!detalle) return;

      // Resolver nombres de autores desde el mapa
      if (Array.isArray(detalle.items)) {
        // asegurar títulos cacheados
        await enrichTitulos(detalle.items);

        for (const item of detalle.items) {
          const guid = norm(item.autorLibroGuid);
          item.nombreAutor =
            (guid && autoresMap && autoresMap[guid]) ? autoresMap[guid] : (item.nombreAutor || 'Desconocido');

          // título desde cache si ya está
          if (item.libreriaMaterialId && titulosCache[item.libreriaMaterialId]) {
            item.titulo = titulosCache[item.libreriaMaterialId];
          } else {
            // si no está en cache (por si se llamó antes de enrichTitulos)
            try {
              const r = await axios.get(`${API_LIBROS}/${item.libreriaMaterialId}`, tokenConfig);
              item.titulo = r?.data?.titulo || item.libreriaMaterialId;
              setTitulosCache(prev => ({ ...prev, [item.libreriaMaterialId]: item.titulo }));
            } catch {
              item.titulo = item.libreriaMaterialId;
            }
          }
        }
      }

      // Reemplazar en historial
      setHistorial(prev => {
        const idx = prev.findIndex(c => c.compraId === compraId);
        if (idx === -1) return prev;
        const copy = [...prev];
        copy[idx] = detalle;
        return copy;
      });
    } catch (err) {
      manejarError(err);
    }
  }, [tokenConfig, manejarError, autoresMap, enrichTitulos, titulosCache]);

  // Buscar por id
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
        // precargar detalle desplegado
        await fetchDetalle(id);
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
      // asegurar que autores están cargados y títulos cacheados al abrir
      if (autoresMap === null) await cargarAutoresMap();
      await fetchDetalle(id);
      next.add(id);
      setExpanded(next);
    }
  };

  // Descargar PDF del backend; si no existe, fallback a impresión
  const descargarPDF = async (compra) => {
    try {
      const res = await axios.get(`${API_CARRITO}/orden/${compra.compraId}/pdf`, {
        ...tokenConfig,
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compra_${compra.compraId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.warn('No se pudo descargar PDF del backend, usando vista imprimible...', err);
      // Fallback: abrir nueva ventana imprimible
      const html = buildPrintableHTML(compra);
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
        win.focus();
        // Espera un tick para render y manda a imprimir
        setTimeout(() => win.print(), 50);
      } else {
        alert('No se pudo abrir la ventana de impresión.');
      }
    }
  };

  const buildPrintableHTML = (compra) => {
    const filas = (compra.items || []).map((it, idx) => `
    <tr>
      <td class="text-clip">${escapeHtml(it.titulo || it.libreriaMaterialId)}</td>
      <td class="num">${Number(it.cantidad || 0)}</td>
      <td class="num">${fmtMoney(it.precioUnitario)}</td>
      <td class="num strong">${fmtMoney(it.precioTotal)}</td>
    </tr>
  `).join('');

    // Datos de “empresa”/marca (ajústalos si quieres)
    const brand = {
      nombre: 'Sistema de Gestión Bibliográfica',
      slogan: 'Comprobante de compra',
      telefono: '',
      sitio: '',
      direccion: ''
    };

    return `
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Compra #${compra.compraId}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root{
      --bg:#f6f7fb;
      --paper:#ffffff;
      --ink:#0f172a;
      --muted:#64748b;
      --primary:#4f46e5;   /* índigo */
      --primary-weak:#eef2ff;
      --border:#e5e7eb;
      --success:#16a34a;
    }
    @page { size: A4; margin: 18mm; }
    @media print {
      .no-print { display: none !important; }
      .page { box-shadow: none; margin: 0; }
      header .logo { filter: grayscale(1) contrast(1.1); }
    }
    html, body { background: var(--bg); }
    body {
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial;
      color: var(--ink);
      margin: 0; padding: 24px;
    }
    .page {
      max-width: 900px;
      margin: 0 auto;
      background: var(--paper);
      border: 1px solid var(--border);
      border-radius: 16px;
      box-shadow: 0 6px 30px rgba(0,0,0,.06);
      overflow: hidden;
    }
    header {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 16px;
      align-items: center;
      padding: 24px 28px;
      background: linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%);
      color: white;
    }
    .logo {
      width: 64px; height: 64px;
      display: grid; place-items: center;
      border-radius: 12px;
      background: rgba(255,255,255,.12);
      border: 1px solid rgba(255,255,255,.25);
      font-weight: 700;
    }
    .brand h1 { margin:0; font-size: 20px; letter-spacing:.2px; }
    .brand p  { margin:2px 0 0; font-size: 12px; opacity:.9; }
    .doc-meta {
      text-align: right; font-size: 12px; line-height: 1.3;
    }
    .doc-meta .tag {
      display:inline-block; padding:4px 8px; font-size: 11px;
      background: rgba(255,255,255,.15); border-radius: 999px; margin-bottom: 6px;
    }

    .content { padding: 20px 28px 28px; }
    .grid-2 {
      display: grid; gap: 16px;
      grid-template-columns: 1fr 1fr;
    }
    .card {
      border: 1px solid var(--border); border-radius: 12px; background: #fff;
    }
    .card h3 {
      margin:0; font-size: 13px; color: var(--muted);
      padding: 10px 12px; border-bottom: 1px solid var(--border);
      background: #fafbff;
    }
    .card .body { padding: 12px; font-size: 14px; }
    .row { display:flex; gap:8px; margin:4px 0; }
    .row .k { min-width: 120px; color: var(--muted); }
    .code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }

    table {
      width: 100%; border-collapse: collapse; margin-top: 16px;
      border: 1px solid var(--border); border-radius: 12px; overflow: hidden;
    }
    thead th {
      font-size: 12px; text-transform: uppercase; letter-spacing: .02em;
      background: var(--primary-weak); color: var(--ink);
      border-bottom: 1px solid var(--border); padding: 10px;
    }
    tbody td {
      padding: 10px; border-bottom: 1px solid var(--border); font-size: 14px;
    }
    tbody tr:nth-child(even) td { background: #fbfcff; }
    .num { text-align: right; white-space: nowrap; }
    .strong { font-weight: 700; }

    .totals {
      margin-top: 10px; display: grid; grid-template-columns: 1fr auto; align-items: end;
    }
    .tot-box {
      min-width: 260px; border:1px solid var(--border); border-radius:12px; overflow:hidden;
    }
    .tot-box .rowp {
      display: grid; grid-template-columns: 1fr auto; gap:12px;
      padding:10px 12px; border-bottom:1px solid var(--border);
      font-size: 14px;
    }
    .tot-box .rowp:last-child { border-bottom:none; background:#fafbff; }
    .tot-box .rowp.total { font-size: 16px; font-weight: 800; background: #f8f9ff; }

    footer {
      padding: 14px 28px 24px; color: var(--muted); font-size: 12px; display:flex; justify-content: space-between;
    }
    .text-clip { max-width: 520px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pill {
      display:inline-block; padding: 2px 8px; font-size: 11px;
      border-radius: 999px; background: #ecfeff; color:#155e75; border:1px solid #cffafe;
    }

    /* Evitar cortes feos en impresión */
    tr, td, th { page-break-inside: avoid; }
    table { break-inside: avoid; }
  </style>
</head>
<body>
  <div class="page">
    <header>
      <div class="logo">SB</div>
      <div class="brand">
        <h1>${escapeHtml(brand.nombre)}</h1>
        <p>${escapeHtml(brand.slogan)}</p>
      </div>
      <div class="doc-meta">
        <div class="tag">Compra #${compra.compraId}</div>
        <div><strong>Fecha:</strong> ${new Date(compra.fecha).toLocaleString()}</div>
        <div><strong>Moneda:</strong> USD</div>
      </div>
    </header>

    <div class="content">
      <div class="grid-2">
        <div class="card">
          <h3>Cliente</h3>
          <div class="body">
            <div class="row"><div class="k">Nombre</div><div>${escapeHtml(compra.nombreCompleto || '-')}</div></div>
            <div class="row"><div class="k">Email</div><div>${escapeHtml(compra.email || '-')}</div></div>
            <div class="row"><div class="k">Dirección</div><div>${escapeHtml(compra.direccion || '-')}</div></div>
            <div class="row">
              <div class="k">
                ${
                  compra.curp && compra.rfc
                    ? 'CURP / RFC'
                    : compra.curp
                    ? 'CURP'
                    : compra.rfc
                    ? 'RFC'
                    : ''
                }
              </div>
              <div>
                ${
                  compra.curp && compra.rfc
                    ? `${escapeHtml(compra.curp)} / ${escapeHtml(compra.rfc)}`
                    : compra.curp
                    ? escapeHtml(compra.curp)
                    : compra.rfc
                    ? escapeHtml(compra.rfc)
                    : '-'
                }
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <h3>Documento</h3>
          <div class="body">
            <div class="row"><div class="k">CompraId</div><div class="code">#${compra.compraId}</div></div>
            <div class="row"><div class="k">Generado</div><div>${new Date().toLocaleString()}</div></div>
            <div class="row"><div class="k">Estado</div><div><span class="pill">Pagada</span></div></div>
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Libro</th>
            <th class="num">Cantidad</th>
            <th class="num">Precio Unit.</th>
            <th class="num">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${filas}
        </tbody>
      </table>

      <div class="totals">
        <div></div>
        <div class="tot-box">
          <div class="rowp"><div>Subtotal</div><div class="num">${fmtMoney((compra.items || []).reduce((a, i) => a + Number(i.precioTotal || 0), 0))}</div></div>
          <div class="rowp"><div>Impuestos</div><div class="num">${fmtMoney(0)}</div></div>
          <div class="rowp total"><div>Total</div><div class="num">${fmtMoney(compra.total)}</div></div>
        </div>
      </div>
    </div>

    <footer>
      <div>Documento generado automáticamente • ${new Date().toLocaleDateString()}</div>
      <div>${escapeHtml(brand.sitio || '')}</div>
    </footer>
  </div>
</body>
</html>`;
  };

  const escapeHtml = (str) => String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

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

                      {abierto && (
                        <tr>
                          <td colSpan={5} style={{ background: '#fafafa' }}>
                            <div style={{ marginTop: 8 }}>

                              {/* Acciones del desglose */}
                              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginBottom: 8 }}>
                                <button className="btn btn-outline" onClick={() => descargarPDF(c)}>
                                  Descargar PDF
                                </button>
                              </div>

                              {/* Datos del cliente */}
                              <div className="cliente-info" style={{ marginBottom: 12 }}>
                                <h4>👤 Datos del Cliente</h4>
                                <p><strong>Nombre:</strong> {c.nombreCompleto}</p>
                                <p><strong>Email:</strong> {c.email}</p>
                                <p><strong>Dirección:</strong> {c.direccion}</p>
                                {c.curp ? (
                                  <p><strong>CURP:</strong> {c.curp}</p>
                                ) : c.rfc ? (
                                  <p><strong>RFC:</strong> {c.rfc}</p>
                                ) : (
                                  <p><strong>CURP / RFC:</strong> -</p>
                                )}
                              </div>


                              {/* Tabla de items */}
                              {Array.isArray(c.items) && c.items.length > 0 ? (
                                <div className="tabla-wrapper">
                                  <table className="tabla-carrito">
                                    <thead>
                                      <tr>
                                        <th>Libro</th>
                                        <th>Autor</th>
                                        <th>Cantidad</th>
                                        <th>Precio Unit.</th>
                                        <th>Subtotal</th>
                                        <th>Fecha Compra</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {c.items.map((it, idx) => (
                                        <tr key={idx}>
                                          <td>{it.titulo || it.libreriaMaterialId}</td>
                                          <td>{it.nombreAutor || '-'}</td>
                                          <td>{it.cantidad}</td>
                                          <td>{fmtMoney(it.precioUnitario)}</td>
                                          <td><strong>{fmtMoney(it.precioTotal)}</strong></td>
                                          <td>{it.fechaCompra ? new Date(it.fechaCompra).toLocaleString() : '-'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p>No hay items en esta orden.</p>
                              )}
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
