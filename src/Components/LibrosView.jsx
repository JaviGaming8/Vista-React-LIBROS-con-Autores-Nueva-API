import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { validarLibro } from '../validaciones';
import '../Libros.css';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'https://microserviciolibro.somee.com/api/LibroMaterial';

const App = () => {
  const [libros, setLibros] = useState([]);
  const [form, setForm] = useState({
    titulo: '',
    fechaPublicacion: '',
    autorLibro: ''
  });
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [libroBuscado, setLibroBuscado] = useState(null);
  const [idBusqueda, setIdBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [idEditar, setIdEditar] = useState(null);

  const navigate = useNavigate();

  // Función para obtener el token desde localStorage
  const getTokenConfig = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: token ? `Bearer ${token}` : ''
      }
    };
  };

  const fetchLibros = useCallback(async () => {
    setCargando(true);
    try {
      const response = await axios.get(API_BASE, getTokenConfig());
      setLibros(response.data);
      setMensaje({ texto: '', tipo: '' });
    } catch (error) {
      manejarError(error);
    } finally {
      setCargando(false);
    }
  }, []);

    useEffect(() => {
    fetchLibros();
  }, [fetchLibros]);

  const manejarError = (error) => {
    if (error.response?.status === 401) {
      alert('Sesión expirada. Por favor inicia sesión de nuevo.');
      localStorage.removeItem('token');
      navigate('/login');
    } else {
      console.error(error);
      setMensaje({ texto: 'Error en la operación. Intente nuevamente.', tipo: 'error' });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Función para preparar el formulario para editar
  const prepararEdicion = (libro) => {
    setForm({
      titulo: libro.titulo,
      fechaPublicacion: new Date(libro.fechaPublicacion).toISOString().slice(0, 10),
      autorLibro: libro.autorLibro
    });
    setModoEdicion(true);
    setIdEditar(libro.libreriaMaterialId);
    setMostrarFormulario(true);
    setMensaje({ texto: '', tipo: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);

    const validacion = validarLibro(form);

    if (!validacion.esValido) {
      setMensaje({ texto: validacion.errores.join(' | '), tipo: 'error' });
      setCargando(false);
      return;
    }

    try {
      const nuevoLibro = {
        titulo: form.titulo.trim(),
        fechaPublicacion: new Date(form.fechaPublicacion).toISOString(),
        autorLibro: form.autorLibro
      };

      if (modoEdicion) {
        // Actualizar libro
        await axios.put(`${API_BASE}/${idEditar}`, nuevoLibro, getTokenConfig());
        setMensaje({ texto: 'Libro actualizado exitosamente', tipo: 'exito' });
      } else {
        // Crear nuevo libro
        await axios.post(API_BASE, nuevoLibro, getTokenConfig());
        setMensaje({ texto: 'Libro registrado exitosamente', tipo: 'exito' });
      }

      setForm({ titulo: '', fechaPublicacion: '', autorLibro: '' });
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

  // Función para eliminar un libro
  const eliminarLibro = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este libro?')) return;

    setCargando(true);
    try {
      await axios.delete(`${API_BASE}/${id}`, getTokenConfig());
      setMensaje({ texto: 'Libro eliminado correctamente', tipo: 'exito' });
      // Si estabas editando ese libro, cancela edición
      if (modoEdicion && id === idEditar) {
        setModoEdicion(false);
        setMostrarFormulario(false);
        setForm({ titulo: '', fechaPublicacion: '', autorLibro: '' });
      }
      await fetchLibros();
    } catch (error) {
      manejarError(error);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h1>Sistema de Gestión Bibliográfica</h1>
          <p className="app-description">Administre su catálogo de libros de manera eficiente</p>
        </div>
      </header>

      <main className="app-main">
        {mensaje.texto && (
          <div className={`app-mensaje ${mensaje.tipo}`}>
            {mensaje.texto}
          </div>
        )}

        <div className="app-grid">
          {/* Panel de acciones */}
          <section className="app-panel">
            <h2 className="panel-title">Acciones</h2>
            <div className="action-buttons">
              <button
                onClick={() => {
                  setMostrarFormulario(!mostrarFormulario);
                  if (mostrarFormulario) {
                    setModoEdicion(false);
                    setForm({ titulo: '', fechaPublicacion: '', autorLibro: '' });
                    setIdEditar(null);
                    setMensaje({ texto: '', tipo: '' });
                  }
                }}
                className="btn btn-primary"
              >
                {mostrarFormulario ? 'Cancelar' : modoEdicion ? 'Editar Libro' : 'Nuevo Libro'}
              </button>
              <button
                onClick={fetchLibros}
                className="btn btn-secondary"
                disabled={cargando}
              >
                {cargando ? 'Actualizando...' : 'Actualizar Lista'}
              </button>
            </div>

            {/* Formulario (condicional) */}
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
                    <label>Identificación del Autor</label>
                    <input
                      type="text"
                      name="autorLibro"
                      value={form.autorLibro}
                      onChange={handleChange}
                      required
                      className="form-input"
                      placeholder="ID o GUID del autor"
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-block"
                    disabled={cargando}
                  >
                    {cargando ? (modoEdicion ? 'Actualizando...' : 'Guardando...') : (modoEdicion ? 'Actualizar Libro' : 'Guardar Libro')}
                  </button>
                </form>
              </div>
            )}

            {/* Búsqueda */}
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
                    <span className="result-label">Autor:</span>
                    <span className="result-value code">{libroBuscado.autorLibro}</span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Listado de libros */}
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
                <button onClick={() => setMostrarFormulario(true)} className="btn btn-primary">
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
                      </div>
                    </div>
                    <div className="libro-actions">
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => prepararEdicion(libro)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => eliminarLibro(libro.libreriaMaterialId)}
                      >
                        Eliminar
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
    </div>
  );
};

export default App;
