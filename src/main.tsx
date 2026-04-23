import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // No necesitas poner .tsx aquí
import './index.css';

// Usamos el operador "!" para asegurar que el elemento 'root' existe en el index.html
const rootElement = document.getElementById('root')!;

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);