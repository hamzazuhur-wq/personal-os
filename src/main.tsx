import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import { RepositoryProvider } from './app/providers/RepositoryProvider';
import { SettingsProvider } from './app/providers/SettingsProvider';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RepositoryProvider>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </RepositoryProvider>
  </React.StrictMode>
);
