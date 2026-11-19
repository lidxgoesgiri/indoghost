import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { App } from './app/App';
import './app/shell.css';

const mount = document.getElementById('root');
if (mount && location.protocol !== 'file:') {
  createRoot(mount).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
