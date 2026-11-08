import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { bootstrap } from './lib/store.js';
import App from './App.jsx';
import './styles/tokens.css';
import './styles.css';
import './components/ui/ui.css';

bootstrap();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);