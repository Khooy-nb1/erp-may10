import React from 'react';
import ReactDOM from 'react-dom/client';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/theme-neutral/theme.css';
import './styles/global.css';
import App from './App.js';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find the root element to mount React application.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
