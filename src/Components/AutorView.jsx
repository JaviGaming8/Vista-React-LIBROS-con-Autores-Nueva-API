import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../Autor.css';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'https://microservicioautoresapi.somee.com/api/Autor';

const AutorView = () => {
  const [autores, setAutores] = useState([]);
  const [form, setForm] = useState({ nombre: '', apellido: '', fechaNacimiento: '' });
  const [idBusqueda, setIdBusqueda] = useState('');
  const [nombreBusqueda, setNombreBusqueda] = useState('');
  const [autorBuscado, setAutorBuscado] = useState(null);
  const [autoresPorNombre, setAutoresPorNombre] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const navigate = useNavigate();

  // Config común (token + JSON)
  const getTokenConfig = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    };
  };

  const limpiarMensaje = () => setMensaje({ texto: '', tipo: '' });

  const manejarError = useCallback((error) => {
    if (error?.response?.status === 401) {
      alert('Sesión expirada. Por favor inicia sesión de nuevo.');
      localStorage.removeItem('token');
      navigate('/login');
      return;
    }
    if (error?.response?.status === 404) {
      setMensaje({ texto: 'No se encontraron resultados.', tipo: 'advertencia' });
      return;
    }
    console.error(error);
    setMensaje({ texto: 'Error en la operación. Intente nuevamente.', tipo: 'error' });
  }, [navigate]);

  const obtenerAutores = useCallback(async () => {
    setCargando(true);
    try {
      const res = await axios.get(API_BASE, getTokenConfig());
      setAutores(Array.isArray(res.data) ? res.data : []);
      limpiarMensaje();
    } catch (err) {
      manejarError(err);
    } finally {
      setCargando(false);
    }
  }, [manejarError]);

  useEffect(() => {
    obtenerAutores();
  }, [obtenerAutores]);

  const crearAutor = async () => {
    // Validación mínima
    if (!form.nombre.trim() || !form.apellido.trim() || !form.fechaNacimiento) {
      setMensaje({ texto: 'Completa nombre, apellido y fecha.', tipo: 'advertencia' });
      return;
    }

    // Normalizar fecha (a medianoche local -> ISO)
    const fechaIso = new Date(form.fechaNacimiento + 'T00:00:00').toISOString();

    setCargando(true);
    try {
      await axios.post(API_BASE, {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        fechaNacimiento: fechaIso
      }, getTokenConfig());

      setMensaje({ texto: 'Autor creado correctamente', tipo: 'exito' });
      setForm({ nombre: '', apellido: '', fechaNacimiento: '' });
      setMostrarFormulario(false);
      await obtenerAutores();
    } catch (err) {
      manejarError(err);
    } finally {
      setCargando(false);
    }
  };

  const buscarPorId = async () => {
    if (!idBusqueda.trim()) {
      setMensaje({ texto: 'Ingrese un ID válido', tipo: 'advertencia' });
      return;
    }
    setCargando(true);
    try {
      const res = await axios.get(`${API_BASE}/${idBusqueda.trim()}`, getTokenConfig());
      setAutorBuscado(res.data || null);
      limpiarMensaje();
    } catch (error) {
      setAutorBuscado(null);
      manejarError(error);
    } finally {
      setCargando(false);
    }
  };

  const buscarPorNombre = async () => {
    const query = nombreBusqueda.trim();
    if (!query) {
      setAutoresPorNombre([]);
      setMensaje({ texto: 'Ingrese un nombre', tipo: 'advertencia' });
      return;
    }
    setCargando(true);
    try {
      const res = await axios.get(`${API_BASE}/Nombre?nombre=${encodeURIComponent(query)}`, getTokenConfig());
      const arr = Array.isArray(res.data) ? res.data : [];
      setAutoresPorNombre(arr);
      if (arr.length === 0) {
        setMensaje({ texto: 'Sin coincidencias para ese nombre.', tipo: 'advertencia' });
      } else {
        limpiarMensaje();
      }
    } catch (error) {
      setAutoresPorNombre([]);
      manejarError(error);
    } finally {
      setCargando(false);
    }
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h1>Gestión de Autores</h1>
          <p className="app-description">Administre los autores registrados en el sistema</p>
        </div>
      </header>

      <main className="app-main">
        {mensaje.texto && <div className={`app-mensaje ${mensaje.tipo}`}>{mensaje.texto}</div>}

        <div className="app-grid">
          <section className="app-panel">
            <h2 className="panel-title">Acciones</h2>
            <div className="action-buttons">
              <button
                onClick={() => setMostrarFormulario(!mostrarFormulario)}
                className="btn btn-primary"
                disabled={cargando}
              >
                {mostrarFormulario ? 'Cancelar' : 'Nuevo Autor'}
              </button>
              <button onClick={obtenerAutores} className="btn btn-secondary" disabled={cargando}>
                {cargando ? 'Actualizando...' : 'Actualizar Lista'}
              </button>
            </div>

            {mostrarFormulario && (
              <div className="form-container">
                <h3>Registrar Nuevo Autor</h3>
                <div className="form-group">
                  <label>Nombre</label>
                  <input
                    type="text"
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Apellido</label>
                  <input
                    type="text"
                    name="apellido"
                    value={form.apellido}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Fecha de Nacimiento</label>
                  <input
                    type="date"
                    name="fechaNacimiento"
                    value={form.fechaNacimiento}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>
                <button onClick={crearAutor} className="btn btn-primary btn-block" disabled={cargando}>
                  {cargando ? 'Guardando...' : 'Guardar Autor'}
                </button>
              </div>
            )}

            <div className="search-container">
              <h3>Búsqueda Avanzada</h3>
              <div className="search-group">
                <input
                  type="text"
                  placeholder="Buscar por ID (numérico)"
                  value={idBusqueda}
                  onChange={e => setIdBusqueda(e.target.value)}
                  className="form-input"
                />
                <button onClick={buscarPorId} className="btn btn-secondary btn-block" disabled={cargando}>
                  {cargando ? 'Buscando...' : 'Buscar por ID'}
                </button>
              </div>

              {autorBuscado && (
                <div className="search-results">
                  <h4>Resultado</h4>
                  <p><strong>ID:</strong> {autorBuscado.autorLibroId}</p>
                  <p><strong>Nombre:</strong> {autorBuscado.nombre} {autorBuscado.apellido}</p>
                  <p><strong>Fecha de Nacimiento:</strong> {new Date(autorBuscado.fechaNacimiento).toLocaleDateString()}</p>
                  <p><strong>GUID:</strong> {autorBuscado.autorLibroGuid}</p>
                </div>
              )}

              <div className="search-group">
                <input
                  type="text"
                  placeholder="Buscar por nombre"
                  value={nombreBusqueda}
                  onChange={e => setNombreBusqueda(e.target.value)}
                  className="form-input"
                />
                <button onClick={buscarPorNombre} className="btn btn-secondary btn-block" disabled={cargando}>
                  {cargando ? 'Buscando...' : 'Buscar por Nombre'}
                </button>
              </div>

              {autoresPorNombre.length > 0 && (
                <ul className="result-list">
                  {autoresPorNombre.map(a => (
                    <li key={a.autorLibroId ?? a.autorLibroGuid}>
                      {a.nombre} {a.apellido} — {new Date(a.fechaNacimiento).toLocaleDateString()}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="libros-container">
            <div className="libros-header">
              <h2>Lista de Autores</h2>
              <span className="libros-count">{autores.length} registrados</span>
            </div>

            {cargando && autores.length === 0 ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Cargando autores...</p>
              </div>
            ) : autores.length === 0 ? (
              <div className="empty-state">
                <p>No se encontraron autores</p>
              </div>
            ) : (
              <div className="libros-grid">
                {autores.map(autor => (
                  <div key={autor.autorLibroId ?? autor.autorLibroGuid} className="libro-card">
                    <div className="libro-header">
                      <h3>{autor.nombre} {autor.apellido}</h3>
                      <span className="libro-id">#{autor.autorLibroGuid}</span>
                    </div>
                    <div className="libro-body">
                      <span><strong>ID:</strong> {autor.autorLibroId}</span>
                      <span style={{ marginLeft: 12 }}><strong>Nacimiento:</strong> {new Date(autor.fechaNacimiento).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="app-footer">
        <p>Gestión de Autores &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default AutorView;
