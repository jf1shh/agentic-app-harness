import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { MonetizationProvider } from './lib/monetization/MonetizationContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* Outside the provider on purpose: the provider reads localStorage while
        building its initial state, so a throw there must be caught too. */}
    <ErrorBoundary>
      <MonetizationProvider>
        <App />
      </MonetizationProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
