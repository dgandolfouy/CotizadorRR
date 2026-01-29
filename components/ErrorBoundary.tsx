import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Fix: Explicitly declare state property type for strict type checking
  public state: ErrorBoundaryState = {
      hasError: false,
      error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
      window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4 text-center">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-xl max-w-lg w-full border border-red-200 dark:border-red-900">
            <h1 className="text-3xl font-bold text-red-600 mb-4">¡Ups! Algo salió mal</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              La aplicación ha encontrado un error inesperado.
            </p>
            
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded text-left mb-6 overflow-auto max-h-40 text-xs font-mono text-red-500">
                {this.state.error?.toString()}
            </div>

            <button
              onClick={this.handleReset}
              className="w-full py-3 px-6 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg shadow transition-colors flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Recargar Aplicación
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default ErrorBoundary;