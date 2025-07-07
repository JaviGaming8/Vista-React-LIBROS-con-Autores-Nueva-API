import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { validarLibro } from '../validaciones';
import '../Libros.css';

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

  useEffect(() => {
    fetchLibros();
  }, []);

  const fetchLibros = async () => {
    setCargando(true);
    try {
      const response = await axios.get(API_BASE);
      setLibros(response.data);
      setMensaje({ texto: '', tipo: '' });
    } catch (error) {
      console.error('Error al obtener libros:', error);
      setMensaje({ texto: 'Error al cargar los libros. Intente nuevamente.', tipo: 'error' });
    } finally {
      setCargando(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
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

      await axios.post(API_BASE, nuevoLibro);
      setMensaje({ texto: 'Libro registrado exitosamente', tipo: 'exito' });
      setForm({ titulo: '', fechaPublicacion: '', autorLibro: '' });
      setMostrarFormulario(false);
      await fetchLibros();
    } catch (error) {
      console.error('Error al registrar el libro:', error);
      setMensaje({
        texto: error.response?.data?.message || 'Error al registrar el libro',
        tipo: 'error'
      });
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
      const response = await axios.get(`${API_BASE}/${idBusqueda}`);
      setLibroBuscado(response.data);
      setMensaje({ texto: '', tipo: '' });
    } catch (error) {
      console.error('Error al buscar libro por ID:', error);
      setLibroBuscado(null);
      setMensaje({
        texto: error.response?.status === 404
          ? 'Libro no encontrado'
          : 'Error en la búsqueda',
        tipo: 'error'
      });
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
                onClick={() => setMostrarFormulario(!mostrarFormulario)}
                className="btn btn-primary"
              >
                {mostrarFormulario ? 'Cancelar' : 'Nuevo Libro'}
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
                <h3>Registrar Nuevo Libro</h3>
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
                    {cargando ? 'Guardando...' : 'Guardar Libro'}
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
                      <button className="btn btn-sm btn-outline">Detalles</button>
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