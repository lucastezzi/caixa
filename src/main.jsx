import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
// Importação de estilos globais (presume que você esteja usando Tailwind CSS ou um CSS base)
import './index.css'; 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)