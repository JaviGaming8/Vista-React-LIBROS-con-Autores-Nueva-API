import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { validarLibro } from '../validaciones';
import '../Libros.css';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'https://microserviciolibros.somee.com/api/LibroMaterial';
const API_AUTOR = 'https://microservicioautoresapi.somee.com/api/Autor';
const API_CARRITO = 'https://localhost:7277/api/Carrito';

const App = () => {
  const [libros, setLibros] = useState([]);
  const [form, setForm] = useState({
    titulo: '',
    fechaPublicacion: '',
    autorLibro: '',
    precioUnitario: '',
    stock: ''
  });
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [libroBuscado, setLibroBuscado] = useState(null);
  const [idBusqueda, setIdBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [idEditar, setIdEditar] = useState(null);

  // Modal compra/carrito
  const [modalAbierto, setModalAbierto] = useState(false);
  const [libroSeleccionado, setLibroSeleccionado] = useState(null);
  const [autorSeleccionado, setAutorSeleccionado] = useState(null);
  const [cantCompra, setCantCompra] = useState(1);
  const [cargandoAutor, setCargandoAutor] = useState(false);

  const [modalDatosAbierto, setModalDatosAbierto] = useState(false);
  const [datosCompra, setDatosCompra] = useState({
    nombreCompleto: '',
    email: '',
    direccion: '',
    curp: '',
    rfc: '',
    tipoIdentificacion: 'curp'
  });

  const navigate = useNavigate();

  // ✅ Manejador único para los inputs del modal de datos del cliente
  const handleDatosChange = (e) => {
    const { name: field, value } = e.target; // evita 'name' global
    setDatosCompra((prev) => {
      if (field === 'tipoIdentificacion') {
        return {
          ...prev,
          tipoIdentificacion: value,
          // resetea el campo que no aplica
          curp: value === 'curp' ? prev.curp : '',
          rfc: value === 'rfc' ? prev.rfc : ''
        };
      }
      return { ...prev, [field]: value };
    });
  };

  const getTokenConfig = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    };
  };

  const nowLocalDateTime = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const manejarError = useCallback((error) => {
    let detalle = 'Error en la operación. Intente nuevamente.';
    if (error?.response) {
      const { status, statusText, data } = error.response;
      if (typeof data === 'string' && data.trim() !== '') detalle = `HTTP ${status} ${statusText || ''} — ${data}`;
      else if (data?.title) {
        detalle = data.title;
        if (data?.errors) {
          const flat = Object.entries(data.errors).map(([k, arr]) => `${k}: ${arr.join(', ')}`).join(' | ');
          if (flat) detalle += ` — ${flat}`;
        }
      } else if (data && Object.keys(data).length > 0) detalle = `HTTP ${status} ${statusText || ''} — ${JSON.stringify(data)}`;
      else detalle = `HTTP ${status} ${statusText || ''}`;
    } else if (error?.code || error?.message) {
      detalle = `${error.code || 'ERR'}: ${error.message}`;
    }
    console.error('AXIOS ERROR:', error);
    setMensaje({ texto: detalle, tipo: 'error' });
    if (error?.response?.status === 401) {
      alert('Sesión expirada. Por favor inicia sesión de nuevo.');
      localStorage.removeItem('token');
      navigate('/login');
    }
  }, [navigate]);

  const fetchLibros = useCallback(async () => {
    setCargando(true);
    try {
      const response = await axios.get(API_BASE, getTokenConfig());
      setLibros(Array.isArray(response.data) ? response.data : []);
      setMensaje({ texto: '', tipo: '' });
    } catch (error) {
      manejarError(error);
    } finally { setCargando(false); }
  }, [manejarError]);

  useEffect(() => { fetchLibros(); }, [fetchLibros]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const prepararEdicion = (libro) => {
    setForm({
      titulo: libro.titulo,
      fechaPublicacion: new Date(libro.fechaPublicacion).toISOString().slice(0, 10),
      autorLibro: libro.autorLibro,
      precioUnitario: libro.precioUnitario ?? '',
      stock: libro.stock ?? ''
    });
    setModoEdicion(true);
    setIdEditar(libro.libreriaMaterialId);
    setMostrarFormulario(true);
    setMensaje({ texto: '', tipo: '' });
  };

  const resetForm = () => setForm({ titulo: '', fechaPublicacion: '', autorLibro: '', precioUnitario: '', stock: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    const validacion = validarLibro ? validarLibro(form) : { esValido: true, errores: [] };
    if (!validacion.esValido) {
      setMensaje({ texto: validacion.errores.join(' | '), tipo: 'error' });
      setCargando(false);
      return;
    }

    try {
      const payload = {
        titulo: form.titulo.trim(),
        fechaPublicacion: new Date(form.fechaPublicacion).toISOString(),
        autorLibro: form.autorLibro,
        precioUnitario: Number(form.precioUnitario ?? 0),
        stock: Number(form.stock ?? 0)
      };
      if (modoEdicion) {
        await axios.put(`${API_BASE}/${idEditar}`, payload, getTokenConfig());
        setMensaje({ texto: 'Libro actualizado exitosamente', tipo: 'exito' });
      } else {
        await axios.post(API_BASE, payload, getTokenConfig());
        setMensaje({ texto: 'Libro registrado exitosamente', tipo: 'exito' });
      }
      resetForm();
      setMostrarFormulario(false);
      setModoEdicion(false);
      setIdEditar(null);
      await fetchLibros();
    } catch (error) {
      manejarError(error);
    } finally { setCargando(false); }
  };

  const buscarPorId = async () => {
    if (!idBusqueda.trim()) { setMensaje({ texto: 'Por favor ingrese un ID válido', tipo: 'advertencia' }); return; }
    setCargando(true);
    try {
      const response = await axios.get(`${API_BASE}/${idBusqueda}`, getTokenConfig());
      setLibroBuscado(response.data);
      setMensaje({ texto: '', tipo: '' });
    } catch (error) {
      if (error.response?.status === 404) setMensaje({ texto: 'Libro no encontrado', tipo: 'error' });
      else manejarError(error);
      setLibroBuscado(null);
    } finally { setCargando(false); }
  };

  const eliminarLibro = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este libro?')) return;
    setCargando(true);
    try {
      await axios.delete(`${API_BASE}/${id}`, getTokenConfig());
      setMensaje({ texto: 'Libro eliminado correctamente', tipo: 'exito' });
      if (modoEdicion && id === idEditar) { setModoEdicion(false); setMostrarFormulario(false); resetForm(); }
      await fetchLibros();
    } catch (error) { manejarError(error); } finally { setCargando(false); }
  };

  // Modal compra
  const abrirModalCompra = async (libro) => {
    setLibroSeleccionado(libro);
    setAutorSeleccionado(null);
    setCantCompra(1);
    setModalAbierto(true);
    setCargandoAutor(true);
    try {
      const resp = await axios.get(API_AUTOR, getTokenConfig());
      const autores = Array.isArray(resp.data) ? resp.data : [];
      const encontrado = autores.find(a => (a.autorLibroGuid || '').toLowerCase() === String(libro.autorLibro || '').toLowerCase()) || null;
      setAutorSeleccionado(encontrado);
    } catch (err) {
      console.warn('No se pudo cargar autor', err);
    } finally { setCargandoAutor(false); }
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setLibroSeleccionado(null);
    setAutorSeleccionado(null);
    setCantCompra(1);
  };

  const postAgregarCarrito = async () => {
    if (!libroSeleccionado) return false;
    const cantidad = Math.max(1, parseInt(cantCompra, 10) || 1);
    const payload = {
      libreriaMaterialId: String(libroSeleccionado.libreriaMaterialId),
      cantidad,
      autorLibroGuid: String(libroSeleccionado.autorLibro),
      precioUnitario: Number(libroSeleccionado.precioUnitario ?? 0),
      precioTotal: +(Number(libroSeleccionado.precioUnitario ?? 0) * cantidad).toFixed(2),
      fechaCompra: nowLocalDateTime()
    };
    const res = await axios.post(`${API_CARRITO}/agregar`, payload, getTokenConfig());
    return res.status >= 200 && res.status < 300;
  };

  const manejarAgregarAlCarrito = async () => {
    try {
      const ok = await postAgregarCarrito();
      if (ok) {
        setMensaje({ texto: 'Agregado al carrito', tipo: 'exito' });
        cerrarModal();
        navigate('/carrito');
      }
    } catch (err) { manejarError(err); }
  };

  const manejarComprarAhora = async () => {
    const ok = await postAgregarCarrito();
    if (!ok) return;
    cerrarModal();
    setModalDatosAbierto(true);
  };

  const confirmarCompra = async () => {
    const { nombreCompleto, email, direccion, tipoIdentificacion, curp, rfc } = datosCompra;
    if (!nombreCompleto?.trim()) { setMensaje({ texto: 'El nombre completo es obligatorio.', tipo: 'error' }); return; }
    if (!email?.trim() || !email.includes('@')) { setMensaje({ texto: 'Email inválido.', tipo: 'error' }); return; }
    if (!direccion?.trim()) { setMensaje({ texto: 'La dirección es obligatoria.', tipo: 'error' }); return; }
    if (tipoIdentificacion === 'curp' && !curp?.trim()) { setMensaje({ texto: 'La CURP es obligatoria según el tipo seleccionado.', tipo: 'error' }); return; }
    if (tipoIdentificacion === 'rfc' && !rfc?.trim()) { setMensaje({ texto: 'El RFC es obligatorio según el tipo seleccionado.', tipo: 'error' }); return; }

    const payload = { nombreCompleto: nombreCompleto.trim(), email: email.trim(), direccion: direccion.trim() };
    if (tipoIdentificacion === 'curp') payload.curp = curp.trim();
    else payload.rfc = rfc.trim();

    try {
      const r = await axios.post(`${API_CARRITO}/comprar`, payload, getTokenConfig());
      if (r.status >= 200 && r.status < 300) {
        setMensaje({ texto: '¡Compra realizada con éxito!', tipo: 'exito' });
        setModalDatosAbierto(false);
        setDatosCompra({ nombreCompleto: '', email: '', direccion: '', curp: '', rfc: '', tipoIdentificacion: 'curp' });
      }
    } catch (err) { manejarError(err); }
  };

  const botonesBloqueados = cargandoAutor || !libroSeleccionado;

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h1>Sistema de Gestión Bibliográfica</h1>
          <p className="app-description">Administre su catálogo de libros de manera eficiente</p>
          <div style={{ marginTop: 8 }}>
            <button className="btn btn-primary" onClick={() => navigate('/carrito')}>
              🛒 Ver carrito
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        {mensaje.texto && <div className={`app-mensaje ${mensaje.tipo}`}>{mensaje.texto}</div>}

        <div className="app-grid">
          <section className="app-panel">
            <h2 className="panel-title">Acciones</h2>
            <div className="action-buttons">
              <button
                type="button"
                onClick={() => {
                  setMostrarFormulario(!mostrarFormulario);
                  if (mostrarFormulario) {
                    setModoEdicion(false);
                    resetForm();
                    setIdEditar(null);
                    setMensaje({ texto: '', tipo: '' });
                  }
                }}
                className="btn btn-primary"
              >
                {mostrarFormulario ? 'Cancelar' : (modoEdicion ? 'Editar Libro' : 'Nuevo Libro')}
              </button>
              <button
                type="button"
                onClick={fetchLibros}
                className="btn btn-secondary"
                disabled={cargando}
              >
                {cargando ? 'Actualizando...' : 'Actualizar Lista'}
              </button>
            </div>

            {mostrarFormulario && (
              <div className="form-container">
                <h3>{modoEdicion ? 'Editar Libro' : 'Registrar Nuevo Libro'}</h3>
                <form onSubmit={handleSubmit} className="libro-form">
                  <div className="form-group">
                    <label>Título del Libro</label>
                    <input
                      type="text"
                      name="titulo"
                      value={form.titulo}
                      onChange={handleChange}
                      required
                      className="form-input"
                      placeholder="Ingrese el título completo"
                    />
                  </div>

                  <div className="form-group">
                    <label>Fecha de Publicación</label>
                    <input
                      type="date"
                      name="fechaPublicacion"
                      value={form.fechaPublicacion}
                      onChange={handleChange}
                      required
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Identificación del Autor (GUID)</label>
                    <input
                      type="text"
                      name="autorLibro"
                      value={form.autorLibro}
                      onChange={handleChange}
                      required
                      className="form-input"
                      placeholder="GUID del autor"
                    />
                  </div>

                  <div className="form-group">
                    <label>Precio Unitario</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="precioUnitario"
                      value={form.precioUnitario}
                      onChange={handleChange}
                      required
                      className="form-input"
                      placeholder="Ej. 350.50"
                    />
                  </div>

                  <div className="form-group">
                    <label>Stock</label>
                    <input
                      type="number"
                      min="0"
                      name="stock"
                      value={form.stock}
                      onChange={handleChange}
                      required
                      className="form-input"
                      placeholder="Ej. 25"
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-block"
                    disabled={cargando}
                  >
                    {cargando
                      ? (modoEdicion ? 'Actualizando...' : 'Guardando...')
                      : (modoEdicion ? 'Actualizar Libro' : 'Guardar Libro')}
                  </button>
                </form>
              </div>
            )}

            <div className="search-container">
              <h3>Búsqueda Avanzada</h3>
              <div className="search-group">
                <input
                  type="text"
                  placeholder="Buscar por ID"
                  value={idBusqueda}
                  onChange={e => setIdBusqueda(e.target.value)}
                  className="form-input"
                />
                <button
                  type="button"
                  onClick={buscarPorId}
                  className="btn btn-secondary btn-block"
                  disabled={cargando}
                >
                  {cargando ? 'Buscando...' : 'Buscar Libro'}
                </button>
              </div>

              {libroBuscado && (
                <div className="search-results">
                  <h4>Resultados de Búsqueda</h4>
                  <div className="result-item">
                    <span className="result-label">ID:</span>
                    <span className="result-value">{libroBuscado.libreriaMaterialId}</span>
                  </div>
                  <div className="result-item">
                    <span className="result-label">Título:</span>
                    <span className="result-value">{libroBuscado.titulo}</span>
                  </div>
                  <div className="result-item">
                    <span className="result-label">Publicación:</span>
                    <span className="result-value">
                      {new Date(libroBuscado.fechaPublicacion).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="result-item">
                    <span className="result-label">Autor GUID:</span>
                    <span className="result-value code">{libroBuscado.autorLibro}</span>
                  </div>
                  <div className="result-item">
                    <span className="result-label">Precio:</span>
                    <span className="result-value">${Number(libroBuscado.precioUnitario ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="result-item">
                    <span className="result-label">Stock:</span>
                    <span className="result-value">{Number(libroBuscado.stock ?? 0)}</span>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="libros-container">
            <div className="libros-header">
              <h2>Catálogo de Libros</h2>
              <span className="libros-count">{libros.length} libros registrados</span>
            </div>

            {cargando && libros.length === 0 ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Cargando catálogo...</p>
              </div>
            ) : libros.length === 0 ? (
              <div className="empty-state">
                <p>No se encontraron libros registrados</p>
                <button type="button" onClick={() => setMostrarFormulario(true)} className="btn btn-primary">
                  Agregar Primer Libro
                </button>
              </div>
            ) : (
              <div className="libros-grid">
                {libros.map(libro => (
                  <div key={libro.libreriaMaterialId} className="libro-card">
                    <div className="libro-header">
                      <h3>{libro.titulo}</h3>
                      <span className="libro-id">#{libro.libreriaMaterialId}</span>
                    </div>
                    <div className="libro-body">
                      <div className="libro-meta">
                        <span className="meta-item">
                          <i className="icon-calendar"></i>
                          {new Date(libro.fechaPublicacion).toLocaleDateString()}
                        </span>
                        <span className="meta-item">
                          <i className="icon-author"></i>
                          <span className="code">{libro.autorLibro}</span>
                        </span>
                        <span className="meta-item">
                          💲 {Number(libro.precioUnitario ?? 0).toFixed(2)}
                        </span>
                        <span className="meta-item">
                          📦 Stock: {Number(libro.stock ?? 0)}
                        </span>
                      </div>
                    </div>
                    <div className="libro-actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => prepararEdicion(libro)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => eliminarLibro(libro.libreriaMaterialId)}
                      >
                        Eliminar
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => abrirModalCompra(libro)}
                      >
                        Comprar / Agregar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="app-footer">
        <p>Sistema de Gestión Bibliográfica &copy; {new Date().getFullYear()}</p>
        <p className="version">Versión 1.0.0</p>
      </footer>

      {/* =========================
          Modal de Compra/Carrito
      ========================== */}
      {modalAbierto && libroSeleccionado && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3>Confirmar artículo</h3>
              <button type="button" style={styles.closeBtn} onClick={cerrarModal}>✕</button>
            </div>

            <div style={styles.modalBody}>
              <div style={{ marginBottom: 8 }}>
                <strong>Libro:</strong> {libroSeleccionado.titulo}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Autor:</strong>{' '}
                {cargandoAutor
                  ? 'Cargando autor...'
                  : autorSeleccionado
                    ? `${autorSeleccionado.nombre} ${autorSeleccionado.apellido} (ID: ${autorSeleccionado.autorLibroId})`
                    : `GUID: ${libroSeleccionado.autorLibro}`}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Fecha publicación:</strong>{' '}
                {new Date(libroSeleccionado.fechaPublicacion).toLocaleDateString()}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Precio unitario:</strong>{' '}
                ${Number(libroSeleccionado.precioUnitario ?? 0).toFixed(2)}
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={{ marginRight: 8 }}><strong>Cantidad:</strong></label>
                <input
                  type="number"
                  min={1}
                  value={cantCompra}
                  onChange={(e) => setCantCompra(Math.max(1, Number(e.target.value)))}
                  style={styles.input}
                />
              </div>

              <div style={{ marginTop: 12 }}>
                <strong>Total:</strong>{' '}
                ${(Number(libroSeleccionado.precioUnitario ?? 0) * Number(cantCompra ?? 1)).toFixed(2)}
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button type="button" className="btn btn-secondary" onClick={cerrarModal}>Cancelar</button>
              <button
                type="button"
                className="btn"
                onClick={manejarAgregarAlCarrito}
                disabled={botonesBloqueados}
                title={botonesBloqueados ? 'Cargando...' : undefined}
              >
                Agregar al carrito
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={manejarComprarAhora}
                disabled={botonesBloqueados}
                title={botonesBloqueados ? 'Cargando...' : undefined}
              >
                Comprar ahora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================
          Modal de Datos del Cliente
      ========================== */}
      {modalDatosAbierto && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3>Datos del Cliente</h3>
              <button type="button" style={styles.closeBtn} onClick={() => setModalDatosAbierto(false)}>✕</button>
            </div>

            <div style={styles.modalBody}>
              <div className="form-group">
                <label>Nombre Completo</label>
                <input
                  type="text"
                  name="nombreCompleto"
                  value={datosCompra.nombreCompleto}
                  onChange={handleDatosChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={datosCompra.email}
                  onChange={handleDatosChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label>Dirección</label>
                <input
                  type="text"
                  name="direccion"
                  value={datosCompra.direccion}
                  onChange={handleDatosChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label>Tipo de Identificación</label>
                <select
                  name="tipoIdentificacion"
                  value={datosCompra.tipoIdentificacion}
                  onChange={handleDatosChange}
                  className="form-input"
                >
                  <option value="curp">CURP</option>
                  <option value="rfc">RFC</option>
                </select>
              </div>

              {/* Render condicional: SOLO se muestra el campo seleccionado */}
              {datosCompra.tipoIdentificacion === 'curp' && (
                <div className="form-group">
                  <label>CURP</label>
                  <input
                    type="text"
                    name="curp"
                    value={datosCompra.curp}
                    onChange={handleDatosChange}
                    className="form-input"
                    placeholder="Ej. ABCD001122HDFLLL09"
                    required
                  />
                </div>
              )}

              {datosCompra.tipoIdentificacion === 'rfc' && (
                <div className="form-group">
                  <label>RFC</label>
                  <input
                    type="text"
                    name="rfc"
                    value={datosCompra.rfc}
                    onChange={handleDatosChange}
                    className="form-input"
                    placeholder="Ej. ABCD001122XYZ"
                    required
                  />
                </div>
              )}
            </div>

            <div style={styles.modalFooter}>
              <button type="button" className="btn btn-secondary" onClick={() => setModalDatosAbierto(false)}>Cancelar</button>
              <button type="button" className="btn btn-primary" onClick={confirmarCompra}>
                Confirmar Compra
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Estilos inline simples para el modal
const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 2000
  },
  modal: {
    width: '100%',
    maxWidth: 520,
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    overflow: 'hidden'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
  },
  closeBtn: {
    border: 'none',
    background: 'transparent',
    fontSize: 18,
    cursor: 'pointer'
  },
  modalBody: {
    padding: 16
  },
  modalFooter: {
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end',
    padding: 16,
    borderTop: '1px solid #eee'
  },
  input: {
    width: 100,
    padding: '6px 8px'
  }
};

export default App;
