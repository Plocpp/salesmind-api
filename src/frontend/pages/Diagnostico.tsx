/**
 * Página de Diagnóstico - Monitora saúde do sistema em tempo real
 */

import { useEffect, useState } from 'react';

interface ErrorStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  unresolved: number;
}

interface DiagnosticoData {
  timestamp: string;
  status: string;
  diagnostico: {
    sistema: {
      nodeVersion: string;
      uptime: number;
      memoria: Record<string, any>;
    };
    database: {
      conectado: boolean;
      erro: string | null;
    };
    erros: ErrorStats;
  };
}

export default function Diagnostico() {
  const [diagnostico, setDiagnostico] = useState<DiagnosticoData | null>(null);
  const [erros, setErros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const styles = {
    container: { padding: '24px', maxWidth: '1200px', margin: '0 auto' },
    panel: { background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '16px', marginBottom: '16px' },
    title: { fontSize: '24px', fontWeight: 'bold', color: '#333', marginBottom: '16px' },
    subtitle: { fontSize: '16px', fontWeight: '600', color: '#555', marginBottom: '12px' },
    badge: (color: string) => ({
      display: 'inline-block',
      padding: '4px 8px',
      background: color,
      color: 'white',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 'bold',
    }),
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' },
    card: { background: '#f5f5f5', padding: '12px', borderRadius: '6px', border: '1px solid #ddd' },
    value: { fontSize: '20px', fontWeight: 'bold', color: '#2c3e50', marginTop: '8px' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' },
    th: { background: '#f0f0f0', padding: '8px', textAlign: 'left', fontWeight: 'bold', borderBottom: '2px solid #ddd' },
    td: { padding: '8px', borderBottom: '1px solid #eee' },
  };

  const carregarDados = async () => {
    try {
      setLoading(true);

      // Carregar diagnóstico
      const diagRes = await fetch('/diagnostico/saude');
      const diagData = await diagRes.json();
      setDiagnostico(diagData.diagnostico);

      // Carregar erros
      const errRes = await fetch('/diagnostico/erros?limit=50');
      const errData = await errRes.json();
      setErros(errData.erros || []);
    } catch (error) {
      console.error('Erro ao carregar diagnóstico:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();

    if (autoRefresh) {
      const interval = setInterval(carregarDados, 5000); // Atualizar a cada 5 segundos
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  if (loading && !diagnostico) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ fontSize: '16px', color: '#666' }}>Carregando diagnóstico...</p>
        </div>
      </div>
    );
  }

  if (!diagnostico) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ fontSize: '16px', color: '#c00' }}>Erro ao carregar diagnóstico</p>
        </div>
      </div>
    );
  }

  const erroStats = diagnostico.diagnostico.erros;
  const statusColor =
    diagnostico.diagnostico.database.conectado && erroStats.critical === 0 ? '#27ae60' : '#e74c3c';

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={styles.title}>🔍 Diagnóstico do Sistema</h1>
          <p style={{ color: '#666', margin: '0' }}>Última atualização: {new Date(diagnostico.timestamp).toLocaleTimeString('pt-BR')}</p>
        </div>
        <div style={{ display: 'grid', gap: '8px' }}>
          <button
            onClick={carregarDados}
            style={{
              padding: '8px 16px',
              background: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            🔄 Atualizar
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            Auto-atualizar
          </label>
        </div>
      </div>

      {/* Status Geral */}
      <div style={styles.panel}>
        <h2 style={styles.subtitle}>📊 Status Geral</h2>
        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={{ color: '#666', fontSize: '12px' }}>Sistema</div>
            <div style={{ ...styles.badge(statusColor) }}>
              {diagnostico.diagnostico.database.conectado ? '✓ Operacional' : '✗ Offline'}
            </div>
          </div>
          <div style={styles.card}>
            <div style={{ color: '#666', fontSize: '12px' }}>Banco de Dados</div>
            <div style={{ ...styles.badge(diagnostico.diagnostico.database.conectado ? '#27ae60' : '#e74c3c') }}>
              {diagnostico.diagnostico.database.conectado ? 'Conectado' : 'Desconectado'}
            </div>
          </div>
          <div style={styles.card}>
            <div style={{ color: '#666', fontSize: '12px' }}>Uptime</div>
            <div style={styles.value}>{Math.floor(diagnostico.diagnostico.sistema.uptime / 60)}m</div>
          </div>
          <div style={styles.card}>
            <div style={{ color: '#666', fontSize: '12px' }}>Node Version</div>
            <div style={styles.value} style={{ fontSize: '14px' }}>{diagnostico.diagnostico.sistema.nodeVersion}</div>
          </div>
        </div>
        {diagnostico.diagnostico.database.erro && (
          <div style={{ background: '#ffe0e0', padding: '12px', borderRadius: '4px', color: '#c00', fontSize: '12px' }}>
            Erro: {diagnostico.diagnostico.database.erro}
          </div>
        )}
      </div>

      {/* Memória */}
      <div style={styles.panel}>
        <h2 style={styles.subtitle}>💾 Memória</h2>
        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={{ color: '#666', fontSize: '12px' }}>RSS</div>
            <div style={styles.value}>{(diagnostico.diagnostico.sistema.memoria.rss / 1024 / 1024).toFixed(2)} MB</div>
          </div>
          <div style={styles.card}>
            <div style={{ color: '#666', fontSize: '12px' }}>Heap Usado</div>
            <div style={styles.value}>{(diagnostico.diagnostico.sistema.memoria.heapUsed / 1024 / 1024).toFixed(2)} MB</div>
          </div>
          <div style={styles.card}>
            <div style={{ color: '#666', fontSize: '12px' }}>Heap Total</div>
            <div style={styles.value}>{(diagnostico.diagnostico.sistema.memoria.heapTotal / 1024 / 1024).toFixed(2)} MB</div>
          </div>
        </div>
      </div>

      {/* Estatísticas de Erros */}
      <div style={styles.panel}>
        <h2 style={styles.subtitle}>⚠️ Erros</h2>
        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={{ color: '#666', fontSize: '12px' }}>Total</div>
            <div style={styles.value}>{erroStats.total}</div>
          </div>
          <div style={styles.card}>
            <div style={{ color: '#666', fontSize: '12px' }}>🔴 Críticos</div>
            <div style={{ ...styles.badge('#e74c3c') }}>{erroStats.critical}</div>
          </div>
          <div style={styles.card}>
            <div style={{ color: '#666', fontSize: '12px' }}>🟠 Altos</div>
            <div style={{ ...styles.badge('#e67e22') }}>{erroStats.high}</div>
          </div>
          <div style={styles.card}>
            <div style={{ color: '#666', fontSize: '12px' }}>🟡 Médios</div>
            <div style={{ ...styles.badge('#f39c12') }}>{erroStats.medium}</div>
          </div>
          <div style={styles.card}>
            <div style={{ color: '#666', fontSize: '12px' }}>🟢 Baixos</div>
            <div style={{ ...styles.badge('#27ae60') }}>{erroStats.low}</div>
          </div>
          <div style={styles.card}>
            <div style={{ color: '#666', fontSize: '12px' }}>❗ Não Resolvidos</div>
            <div style={styles.value}>{erroStats.unresolved}</div>
          </div>
        </div>
      </div>

      {/* Erros Recentes */}
      {erros.length > 0 && (
        <div style={styles.panel}>
          <h2 style={styles.subtitle}>📋 Erros Recentes</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Tipo</th>
                  <th style={styles.th}>Mensagem</th>
                  <th style={styles.th}>Severidade</th>
                  <th style={styles.th}>Endpoint</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {erros.map((erro) => (
                  <tr key={erro.id}>
                    <td style={styles.td}>{erro.id.slice(0, 12)}...</td>
                    <td style={styles.td}>{erro.type}</td>
                    <td style={styles.td}>{erro.message.slice(0, 50)}...</td>
                    <td style={styles.td}>
                      <span style={styles.badge(
                        erro.severity === 'critical' ? '#e74c3c'
                          : erro.severity === 'high' ? '#e67e22'
                          : erro.severity === 'medium' ? '#f39c12'
                          : '#27ae60'
                      )}>
                        {erro.severity}
                      </span>
                    </td>
                    <td style={styles.td}>{erro.context?.endpoint || 'N/A'}</td>
                    <td style={styles.td}>{erro.resolved ? '✓ Resolvido' : '❌ Aberto'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Instruções para Correção */}
      <div style={{ ...styles.panel, background: '#fff3cd', borderColor: '#ffc107' }}>
        <h2 style={styles.subtitle}>💡 Como Usar</h2>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', lineHeight: '1.6' }}>
          <li>Este painel monitora a saúde do sistema em tempo real</li>
          <li>Erros críticos devem ser resolvidos imediatamente</li>
          <li>Clique em "Atualizar" para carregar dados manualmente</li>
          <li>Use "Auto-atualizar" para monitoramento contínuo</li>
          <li>Para mais detalhes de um erro, acesse <code>/diagnostico/erros/:id</code></li>
          <li>Para testar o sistema de error reporting, use <code>POST /diagnostico/testar-erro</code></li>
        </ul>
      </div>
    </div>
  );
}
