import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'ux4g-web-components/styles.css';
import 'ux4g-web-components/design-system';
import App from './App.jsx';
import { ToastProvider } from './context/ToastContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <App />
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
