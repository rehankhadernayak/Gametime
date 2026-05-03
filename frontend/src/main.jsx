import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { StringParallax, StringTune } from '@fiddle-digital/string-tune';
import App from './App.jsx';
import './styles/app.css';

// Initialize StringTune physics engine (client-side only)
if (typeof window !== 'undefined') {
  const st = StringTune.getInstance();
  st.use(StringParallax);
  st.speed = 0.8; // Weighted "heavy" feel for smooth physics
  st.start(60);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
