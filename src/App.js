import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
  Navigate
} from 'react-router-dom';

import LibrosView from './Components/LibrosView';
import AutorView from './Components/AutorView';
import './App.css';

function App() {
  return (
    <Router>
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
          </nav>
        </aside>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/libros" />} />
            <Route path="/libros" element={<LibrosView />} />
            <Route path="/autores" element={<AutorView />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
