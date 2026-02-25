import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CredentialProvider } from './context/CredentialContext';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <CredentialProvider>
          <App />
        </CredentialProvider>
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
);
