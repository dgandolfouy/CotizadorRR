/** @copyright 2026 Daniel Gandolfo - Todos los derechos reservados */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Safety wrapper for React mounting
try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
            <HashRouter>
              <App />
            </HashRouter>
        </ErrorBoundary>
      </React.StrictMode>
    );
} catch (err) {
    console.error("React Mount Error:", err);
    if (rootElement) {
        rootElement.innerHTML = `
            <div style="color: red; padding: 20px; text-align: center;">
                <h1>Error Crítico al Iniciar</h1>
                <p>Hubo un problema al montar la aplicación.</p>
                <button onclick="localStorage.clear(); location.reload()" style="margin-top:20px; padding:10px 20px; background:red; color:white; border:none; border-radius:5px; cursor:pointer;">BORRAR CONFIGURACIÓN</button>
                <pre style="background: #eee; padding: 10px; text-align: left; overflow: auto; color: #333; margin-top: 20px;">${err instanceof Error ? err.message : String(err)}</pre>
            </div>
        `;
    }
}