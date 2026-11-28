import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import TvDisplayPage from './components/pages/TvDisplayPage';
import ErrorBoundary from './components/common/ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const isTvMode = window.location.pathname.startsWith('/tv');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      {isTvMode ? (
        <TvDisplayPage />
      ) : (
        <BrowserRouter>
          <App />
        </BrowserRouter>
      )}
    </ErrorBoundary>
  </React.StrictMode>
);
