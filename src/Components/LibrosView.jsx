import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { validarLibro } from '../validaciones';
import '../Libros.css';
import { useNavigate } from 'react-router-dom';

const API_BASE  = 'https://microserviciolibros.somee.com/api/LibroMaterial';
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
  const [autorSeleccionado, setAutorSeleccionado] = useState(null); // { autorLibroId, autorLibroGuid, ... }
  const [cantCompra, setCantCompra] = useState(1);
  const [cargandoAutor, setCargandoAutor] = useState(false);

  const navigate = useNavigate();

  // Config headers (token + JSON)
  const getTokenConfig = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    };
  };

  // Util: DateTime local sin 'Z' (yyyy-MM-ddTHH:mm:ss)
  const nowLocalDateTime = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${yyyy}-${MM}-${dd}T${hh}:${mm}:${ss}`;
  };

  const manejarError = useCallback((error) => {
    let detalle = 'Error en la operación. Intente nuevamente.';
    if (error?.response) {
      const { status, statusText, data } = error.response;
      if (typeof data === 'string' && data.trim() !== '') {
        detalle = `HTTP ${status} ${statusText || ''} — ${data}`;
      } else if (data?.title) {
        detalle = `${data.title}`;
        if (data?.errors) {
          const flat = Object.entries(data.errors)
            .map(([k, arr]) => `${k}: ${arr.join(', ')}`).join(' | ');
          if (flat) detalle += ` — ${flat}`;
        }
      } else if (data && Object.keys(data).length > 0) {
        detalle = `HTTP ${status} ${statusText || ''} — ${JSON.stringify(data)}`;
      } else {
        detalle = `HTTP ${status} ${statusText || ''}`;
      }
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
    } finally {
      setCargando(false);
    }
  }, [manejarError]);

  useEffect(() => {
    fetchLibros();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const resetForm = () => {
    setForm({ titulo: '', fechaPublicacion: '', autorLibro: '', precioUnitario: '', stock: '' });
  };

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
    } finally {
      setCargando(false);
    }
  };

  const buscarPorId = async () => {
    if (!idBusqueda.trim()) {
      setMensaje({ texto: 'Por favor ingrese un ID válido', tipo: 'advertencia' });
      return;
    }

    setCargando(true);
    try {
      const response = await axios.get(`${API_BASE}/${idBusqueda}`, getTokenConfig());
      setLibroBuscado(response.data);
      setMensaje({ texto: '', tipo: '' });
    } catch (error) {
      if (error.response?.status === 404) {
        setMensaje({ texto: 'Libro no encontrado', tipo: 'error' });
      } else {
        manejarError(error);
      }
      setLibroBuscado(null);
    } finally {
      setCargando(false);
    }
  };

  const eliminarLibro = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este libro?')) return;

    setCargando(true);
    try {
      await axios.delete(`${API_BASE}/${id}`, getTokenConfig());
      setMensaje({ texto: 'Libro eliminado correctamente', tipo: 'exito' });
      if (modoEdicion && id === idEditar) {
        setModoEdicion(false);
        setMostrarFormulario(false);
        resetForm();
      }
      await fetchLibros();
    } catch (error) {
      manejarError(error);
    } finally {
      setCargando(false);
    }
  };

  // =========================
  // Modal: abrir y cargar autor (opcional, para mostrar nombre)
  // =========================
  const abrirModalCompra = async (libro) => {
    setLibroSeleccionado(libro);
    setAutorSeleccionado(null);
    setCantCompra(1);
    setModalAbierto(true); // abrir aunque falle autor

    // Cargar autor SOLO para mostrar nombre; NO es requisito para llamar al backend
    setCargandoAutor(true);
    try {
      const resp = await axios.get(API_AUTOR, getTokenConfig());
      const autores = Array.isArray(resp.data) ? resp.data : [];
      const encontrado =
        autores.find(a =>
          (a.autorLibroGuid || '').toLowerCase() === String(libro.autorLibro || '').toLowerCase()
        ) || null;
      setAutorSeleccionado(encontrado || null);
    } catch (error) {
      console.warn('No se pudo cargar autor', error);
    } finally {
      setCargandoAutor(false);
    }
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setLibroSeleccionado(null);
    setAutorSeleccionado(null);
    setCantCompra(1);
  };

  // =========================
  // Acciones del modal
  // =========================
const postAgregarCarrito = async () => {
  if (!libroSeleccionado) return false;

  const precioUnitario = Number(libroSeleccionado.precioUnitario ?? 0);
  const cantidad = Math.max(1, parseInt(cantCompra, 10) || 1);
  const precioTotal = +(precioUnitario * cantidad).toFixed(2);

  // Usar SIEMPRE el GUID que ya trae el libro (campo autorLibro)
  const payload = {
    libreriaMaterialId: String(libroSeleccionado.libreriaMaterialId),
    cantidad,
    autorLibroGuid: String(libroSeleccionado.autorLibro), // <-- SOLO GUID
    precioUnitario,
    precioTotal,
    fechaCompra: nowLocalDateTime() // <-- sin 'Z'
  };

  console.log('POST /agregar payload:', payload);
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
    } catch (error) {
      manejarError(error);
    }
  };

  const manejarComprarAhora = async () => {
    try {
      const ok = await postAgregarCarrito();
      if (!ok) return;
      const r = await axios.post(`${API_CARRITO}/comprar`, {}, getTokenConfig());
      if (r.status >= 200 && r.status < 300) {
        setMensaje({ texto: '¡Compra realizada con éxito!', tipo: 'exito' });
        cerrarModal();
        // navigate('/carrito'); // si quieres ir al carrito vacío después
      }
    } catch (error) {
      manejarError(error);
    }
  };

  // Ya no bloqueamos por autorLibroId; sólo evitamos clicks durante carga del autor
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
                ${(
                  Number(libroSeleccionado.precioUnitario ?? 0) * Number(cantCompra ?? 1)
                ).toFixed(2)}
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
