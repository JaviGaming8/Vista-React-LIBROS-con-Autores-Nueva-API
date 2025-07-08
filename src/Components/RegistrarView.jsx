import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import "../RegistrarView.css";

function Registrar({ onLogin }) {
  const [nombre, setNombre] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [mostrarContraseña, setMostrarContraseña] = useState(false);
  const [pregunta, setPregunta] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegistro = async (e) => {
    e.preventDefault();

    if (!respuesta) {
      alert('Debe ingresar una respuesta para la pregunta de recuperación');
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      const res = await axios.post('https://microservicio-mongo-atlas.onrender.com/api/registrar', {
        Nombre: nombre,
        Contraseña: contraseña,
        Pregunta: pregunta,
        Respuesta: respuesta
      });

      if (res.status === 201 || res.status === 200) {
        alert(res.data.message);

        localStorage.setItem('usuario', JSON.stringify(res.data.usuario));
        onLogin(true);

        setNombre('');
        setContraseña('');
        setPregunta('');
        setRespuesta('');
        setMostrarContraseña(false);

        navigate('/');
      } else {
        alert('Error inesperado al registrar');
      }
    } catch (err) {
      console.error('Error en registro:', err.response || err.message || err);
      if (err.response?.status === 400) {
        alert('El usuario ya existe');
      } else {
        alert('Error al registrar');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registrar-container">
      <h2>Registrar nuevo usuario</h2>
      <form onSubmit={handleRegistro}>
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
            style={{ paddingRight: '40px' }}
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
              fill: '#666',
              transition: 'fill 0.3s ease'
            }}
            aria-label={mostrarContraseña ? "Ocultar contraseña" : "Mostrar contraseña"}
            title={mostrarContraseña ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {mostrarContraseña ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z"/>
                <circle cx="12" cy="12" r="2.5"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 3l19 19-1.5 1.5L16.7 18c-1.3.5-2.7.7-4.7.7-7 0-10-7-10-7 1.1-2.5 3.2-4.5 5.9-5.4l-1.6-1.6L2 3zm7.5 5.3L8.8 8.8a3 3 0 0 1 4.3 4.3l-1.5-1.5a1.5 1.5 0 0 0-1.1-2.3zM12 5c7 0 10 7 10 7-1.1 2.5-3.2 4.5-5.9 5.4l-1.6-1.6c1-0.2 1.8-0.7 2.4-1.5l-2.8-2.8a3 3 0 0 0-4.2-4.2l-1.8-1.8c.9-.5 1.9-.8 3-.8z"/>
              </svg>
            )}
          </span>
        </div>

        <input
          type="text"
          placeholder="Pregunta de recuperación"
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Respuesta de recuperación"
          value={respuesta}
          onChange={(e) => setRespuesta(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Registrando...' : 'Registrar'}
        </button>
      </form>
    </div>
  );
}

export default Registrar;
