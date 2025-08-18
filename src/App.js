import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
  Navigate
} from 'react-router-dom';

import LibrosView from './Components/LibrosView';
import AutorView from './Components/AutorView';
import Login from './Components/LoginView';
import Recuperar from './Components/RecuperarView';
import Registrar from './Components/RegistrarView';
import CarritoView from './Components/CarritoView';
import HistorialView from './Components/HistorialView';


import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const usuario = localStorage.getItem('usuario');
    if (usuario) {
      setIsAuthenticated(true);
    }
  }, []);

  return (
    <Router>
      {!isAuthenticated ? (
        <Routes>
          <Route path="/recuperar" element={<Recuperar onLogin={setIsAuthenticated} />} />
          <Route path="/registrar" element={<Registrar onLogin={setIsAuthenticated} />} />
          <Route path="/login" element={<Login onLogin={setIsAuthenticated} />} />
          <Route path="*" element={<Navigate to="/login" />} />
          <Route path="/historial" element={<HistorialView />} />
          <Route path="/carrito" element={<CarritoView />} />

        </Routes>

        
      ) : (
        <div className="layout">
          <aside className="sidebar">
            <h2 className="logo">📖 Biblioteca</h2>
            <nav className="nav-links">
              <NavLink
                to="/libros"
                className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
              >
                📚 Libros
              </NavLink>
              <NavLink
                to="/autores"
                className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
              >
                👨‍🏫 Autores
              </NavLink>
              <NavLink
                to="/carrito"
                className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
              >
                🛒 Carrito
              </NavLink>

              <NavLink
                to="/historial"
                className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
              >
                📜 Historial
              </NavLink>
              
              <button
                onClick={() => {
                  localStorage.removeItem('usuario');
                  setIsAuthenticated(false);
                }}
                style={{ marginTop: 20, padding: 8, width: '90%', cursor: 'pointer' }}
              >
                Cerrar sesión
              </button>
            </nav>
          </aside>

          <main className="main-content">
            <Routes>
              <Route path="/" element={<Navigate to="/libros" />} />
              <Route path="/libros" element={<LibrosView />} />
              <Route path="/autores" element={<AutorView />} />
              <Route path="/carrito" element={<CarritoView />} />
              <Route path="/historial" element={<HistorialView />} />
              <Route path="*" element={<Navigate to="/libros" />} />
            </Routes>
          </main>
        </div>
      )}
    </Router>
  );
}

export default App;
