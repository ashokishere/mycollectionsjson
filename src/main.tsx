import './polyfills';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

try {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    );
  }
} catch (err: any) {
  console.error("Mount error in main.tsx:", err);
  const box = document.getElementById('loader-error-box');
  const txt = document.getElementById('loader-error-text');
  if (box && txt) {
    box.style.display = 'block';
    txt.textContent = 'Mount Error: ' + (err?.message || err) + '\n' + (err?.stack || '');
  }
}
