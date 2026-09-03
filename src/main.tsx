import React, { Component, ErrorInfo, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in application:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('laughter_bubble_playlist');
      localStorage.removeItem('zenstream_playlist');
      localStorage.removeItem('app_theme');
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-slate-900/90 border border-amber-500/30 rounded-3xl p-8 shadow-2xl space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-2xl font-serif">
              ॐ
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-wide text-amber-200">
                A Moment of Stillness
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                The application encountered an unexpected issue while initializing.
              </p>
            </div>
            {this.state.error && (
              <div className="p-3 bg-black/50 border border-white/10 rounded-xl text-left overflow-x-auto text-[11px] text-rose-400 font-mono">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Reload Page
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Reset Cache
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}
