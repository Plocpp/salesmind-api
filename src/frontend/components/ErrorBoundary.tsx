/**
 * Error Boundary - Componente para capturar erros de render
 */

import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  private errorCounter = 0;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Registrar erro
    const errorId = `RENDER-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    this.errorCounter++;

    this.setState({
      error,
      errorInfo,
      errorId,
    });

    // Enviar para backend
    this.reportErrorToBackend(error, errorInfo, errorId);

    // Log no console
    console.error('Erro capturado por Error Boundary:', {
      errorId,
      message: error.toString(),
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });
  }

  private async reportErrorToBackend(error: Error, errorInfo: ErrorInfo, errorId: string) {
    try {
      await fetch('/api/diagnostico/testar-erro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'render',
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          errorId,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error('Erro ao reportar para backend:', err);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '10px',
              padding: '40px',
              maxWidth: '600px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>⚠️</div>
              <h1 style={{ margin: '0 0 10px', color: '#333', fontSize: '28px' }}>Erro na Aplicação</h1>
              <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                Desculpe! Algo deu errado enquanto renderizávamos a página.
              </p>
            </div>

            <div
              style={{
                background: '#f5f5f5',
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '20px',
                borderLeft: '4px solid #ff6b6b',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#8a8a8a', marginBottom: '5px' }}>
                ID DO ERRO: {this.state.errorId}
              </div>
              <div style={{ fontSize: '13px', color: '#333', fontFamily: 'monospace', marginBottom: '10px' }}>
                <strong>Mensagem:</strong> {this.state.error?.message}
              </div>
              {process.env.NODE_ENV === 'development' && (
                <details style={{ fontSize: '11px', color: '#666' }}>
                  <summary style={{ cursor: 'pointer', marginBottom: '10px', fontWeight: 'bold' }}>
                    📋 Stack Trace
                  </summary>
                  <pre
                    style={{
                      background: '#fff',
                      padding: '10px',
                      borderRadius: '4px',
                      overflow: 'auto',
                      maxHeight: '200px',
                      fontSize: '10px',
                      fontFamily: 'monospace',
                      margin: '10px 0 0 0',
                    }}
                  >
                    {this.state.error?.stack}
                    {'\n\n'}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
            </div>

            <div style={{ background: '#fff3cd', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', color: '#856404' }}>
                <strong>💡 O que fazer:</strong>
                <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
                  <li>Tente recarregar a página</li>
                  <li>Limpe o cache e cookies do navegador</li>
                  <li>Entre em contato com o suporte com o ID do erro</li>
                </ul>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '12px 20px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'background 0.3s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#5568d3')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#667eea')}
              >
                🔄 Recarregar Página
              </button>
              <button
                onClick={this.handleGoHome}
                style={{
                  padding: '12px 20px',
                  background: '#764ba2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'background 0.3s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#6b4193')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#764ba2')}
              >
                🏠 Ir para Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook para monitorar erros em componentes funcionais
 */
export function useErrorMonitoring(componentName: string) {
  const reportError = async (error: Error | string, context?: Record<string, any>) => {
    try {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      const response = await fetch('/api/diagnostico/testar-erro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'component',
          message: errorMessage,
          stack: errorStack,
          component: componentName,
          context,
          timestamp: new Date().toISOString(),
        }),
      });

      const data = await response.json();
      console.error(`Erro em ${componentName} reportado:`, data);

      return data;
    } catch (err) {
      console.error('Erro ao reportar para backend:', err);
      throw err;
    }
  };

  return { reportError };
}
