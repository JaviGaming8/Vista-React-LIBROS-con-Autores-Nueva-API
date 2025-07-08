import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import "../LoginView.css";

function Login({ onLogin }) {
  const [nombre, setNombre] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [mostrarContraseña, setMostrarContraseña] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('https://microservicio-mongo-atlas.onrender.com/api/login', {
        Nombre: nombre,
        Contraseña: contraseña,
      });

      alert(res.data.message);

      localStorage.setItem('usuario', JSON.stringify(res.data.usuario));
      onLogin(true);
      navigate('/');

    } catch (err) {
      alert('Credenciales incorrectas');
    }
  };

  return (
    <div className="login-container">
      <h2>Iniciar sesión</h2>
      <form onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />

        <div style={{ position: 'relative' }}>
          <input
            type={mostrarContraseña ? "text" : "password"}
            placeholder="Contraseña"
            value={contraseña}
            onChange={(e) => setContraseña(e.target.value)}
            required
            style={{ paddingRight: '40px' }} // espacio para el icono
          />
          <span
            onClick={() => setMostrarContraseña(!mostrarContraseña)}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              cursor: 'pointer',
              userSelect: 'none',
              width: '24px',
              height: '24px',
              fill: '#666'
            }}
            aria-label={mostrarContraseña ? "Ocultar contraseña" : "Mostrar contraseña"}
            title={mostrarContraseña ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {mostrarContraseña ? (
              // Icono ojo abierto SVG
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z"/>
                <circle cx="12" cy="12" r="2.5"/>
              </svg>
            ) : (
              // Icono ojo cerrado SVG
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M2 3l19 19-1.5 1.5L16.7 18c-1.3.5-2.7.7-4.7.7-7 0-10-7-10-7 1.1-2.5 3.2-4.5 5.9-5.4l-1.6-1.6L2 3zm7.5 5.3L8.8 8.8a3 3 0 0 1 4.3 4.3l-1.5-1.5a1.5 1.5 0 0 0-1.1-2.3zM12 5c7 0 10 7 10 7-1.1 2.5-3.2 4.5-5.9 5.4l-1.6-1.6c1-0.2 1.8-0.7 2.4-1.5l-2.8-2.8a3 3 0 0 0-4.2-4.2l-1.8-1.8c.9-.5 1.9-.8 3-.8z"/>
              </svg>
            )}
          </span>
        </div>

        <button type="submit">Entrar</button>
      </form>

      <button onClick={() => navigate('/recuperar')} className="secondary">
        ¿Olvidaste tu contraseña?
      </button>
      <button onClick={() => navigate('/registrar')} className="secondary">
        Registrar nuevo usuario
      </button>
    </div>
  );
}

export default Login;
