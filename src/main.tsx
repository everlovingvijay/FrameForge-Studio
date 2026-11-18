import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class StudioErrorBoundary extends React.Component<
  {children: React.ReactNode},
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {hasError: false, message: ''};

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Unexpected rendering error',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#111215] text-[#E6E8EC] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#17191E] border border-[#2A2D36] rounded-md p-5 space-y-3">
            <h1 className="text-[15px] font-semibold text-[#F3F4F6]">
              FrameForge Studio Workspace Error
            </h1>
            <p className="text-[12px] text-[#9BA2B0] font-mono break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-3.5 py-1.5 rounded text-[12px] font-medium bg-[#2563EB] hover:bg-[#3B82F6] text-white"
            >
              Reload Workspace
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StudioErrorBoundary>
    <App />
  </StudioErrorBoundary>
);
