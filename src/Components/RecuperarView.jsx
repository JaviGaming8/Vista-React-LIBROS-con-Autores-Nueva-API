import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../RecuperarView.css';
import { validarNombre, validarRespuesta } from './Validaciones/RecuperarValidaciones.js';

function Recuperar({ onLogin }) {
  const [nombre, setNombre] = useState('');
  const [pregunta, setPregunta] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [mostrarPregunta, setMostrarPregunta] = useState(false);
  const navigate = useNavigate();

  const buscarPregunta = async () => {
    // Validar nombre antes de buscar pregunta
    const errorNombre = validarNombre(nombre);
    if (errorNombre) {
      alert(errorNombre);
      return;
    }
    try {
      const res = await axios.post('https://microservicio-mongo-atlas.onrender.com/api/recuperar-pregunta', {
        Nombre: nombre,
      });
      setPregunta(res.data.pregunta);
      setMostrarPregunta(true);
    } catch (err) {
      alert('Usuario no encontrado');
    }
  };

  const validarRespuestaFunc = async () => {
    // Validar respuesta antes de enviar
    const errorRespuesta = validarRespuesta(respuesta, mostrarPregunta);
    if (errorRespuesta) {
      alert(errorRespuesta);
      return;
    }
    try {
      const res = await axios.post('https://microservicio-mongo-atlas.onrender.com/api/recuperar-respuesta', {
        Nombre: nombre,
        respuesta: respuesta,
      });

      alert(res.data.message);

      if (!res.data.usuario) {
        alert('No se recibió usuario para iniciar sesión.');
        return;
      }

      localStorage.setItem('usuario', JSON.stringify(res.data.usuario));
      onLogin(true);
      navigate('/');
    } catch (err) {
      alert('Respuesta incorrecta');
    }
  };

  return (
    <div className="recuperar-container">
      <h2>Recuperar acceso</h2>
      <div className="recuperar-form-container">
        {!mostrarPregunta ? (
          <div className="recuperar-fase-inicial">
            <input
              type="text"
              className="campo"
              placeholder="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
            <button className="boton" onClick={buscarPregunta}>
              Buscar pregunta
            </button>
          </div>
        ) : (
          <div className="recuperar-fase-pregunta">
            <div className="recuperar-pregunta">
              <strong>Pregunta:</strong>
              <p>{pregunta}</p>
            </div>
            <input
              type="text"
              className="campo"
              placeholder="Respuesta"
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              required
            />
            <button className="boton" onClick={validarRespuestaFunc}>
              Validar respuesta
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Recuperar;
