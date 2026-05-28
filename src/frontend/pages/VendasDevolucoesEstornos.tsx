import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

type Venda = {
  id: string;
  numero?: string;
  status?: string;
  total?: number;
  data?: string;
  cliente?: { nome?: string } | null;
  origem?: string;
};

type DocumentoFiscal = {
  id?: string;
  numero?: string;
  modelo?: string;
  status?: string;
  total?: number;
  createdAt?: string;
  clienteNome?: string;
};

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #d9e2e1',
  borderRadius: 8,
  boxShadow: '0 8px 24px rgba(36, 51, 50, 0.05)',
};

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR');
};

const parseApiError = (error: unknown, fallback: string) => {
  if (!(error instanceof Error)) return fallback;
  const raw = error.message || '';
  const jsonStart = raw.indexOf('{');
  if (jsonStart >= 0) {
    try {
      const parsed = JSON.parse(raw.slice(jsonStart));
      if (typeof parsed?.error === 'string' && parsed.error) return parsed.error;
    } catch {
      return raw;
    }
  }
  return raw || fallback;
};

export default function VendasDevolucoesEstornos() {
  const [vendasCanceladas, setVendasCanceladas] = useState<Venda[]>([]);
  const [vendasEstornadas, setVendasEstornadas] = useState<Venda[]>([]);
  const [vendasOperacionais, setVendasOperacionais] = useState<Venda[]>([]);
  const [documentosCancelados, setDocumentosCancelados] = useState<DocumentoFiscal[]>([]);
  const [loading, setLoading] = useState(true);
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [erro, setErro] = useState('');

  const token = localStorage.getItem('token');

  const carregar = async () => {
    try {
      setLoading(true);
      setErro('');

      const [canceladasRaw, estornadasRaw, docsRaw, operacionaisRaw] = await Promise.all([
        api.get('/vendas/vendas?status=CANCELADO', token),
        api.get('/vendas/vendas?status=ESTORNADO', token),
        api.get('/vendas/documentos-fiscais?status=CANCELADO', token),
        api.get('/vendas/vendas', token),
      ]);

      setVendasCanceladas(Array.isArray(canceladasRaw) ? canceladasRaw : []);
      setVendasEstornadas(Array.isArray(estornadasRaw) ? estornadasRaw : []);
      setDocumentosCancelados(Array.isArray(docsRaw) ? docsRaw : []);
      const operacionais = Array.isArray(operacionaisRaw)
        ? operacionaisRaw.filter((venda) => !['CANCELADO', 'ESTORNADO'].includes(String(venda.status || '').toUpperCase()))
        : [];
      setVendasOperacionais(operacionais);
    } catch (error) {
      setErro(parseApiError(error, 'Nao foi possivel carregar devolucoes e estornos.'));
      setVendasCanceladas([]);
      setVendasEstornadas([]);
      setDocumentosCancelados([]);
      setVendasOperacionais([]);
    } finally {
      setLoading(false);
    }
  };

  const executarAcao = async (venda: Venda, acao: 'CANCELAR' | 'ESTORNAR') => {
    const numeroVenda = venda.numero || venda.id.slice(0, 8);
    const textoAcao = acao === 'ESTORNAR' ? 'estornar' : 'cancelar';
    const confirmou = window.confirm(`Deseja realmente ${textoAcao} a venda ${numeroVenda}?`);
    if (!confirmou) return;

    const motivo = window.prompt(`Motivo do ${textoAcao}:`, acao === 'ESTORNAR' ? 'Estorno operacional' : 'Cancelamento operacional') || undefined;

    try {
      setProcessandoId(venda.id);
      await api.post(`/vendas/vendas/${venda.id}/status`, { acao, motivo }, token);
      await carregar();
    } catch (error) {
      setErro(parseApiError(error, `Nao foi possivel ${textoAcao} a venda.`));
    } finally {
      setProcessandoId(null);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const kpis = useMemo(() => {
    const totalCancelado = vendasCanceladas.reduce((acc, venda) => acc + Number(venda.total || 0), 0);
    const totalEstornado = vendasEstornadas.reduce((acc, venda) => acc + Number(venda.total || 0), 0);

    return {
      totalCancelado,
      totalEstornado,
      totalImpacto: totalCancelado + totalEstornado,
      documentosCancelados: documentosCancelados.length,
    };
  }, [vendasCanceladas, vendasEstornadas, documentosCancelados]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, color: '#243332' }}>Devolucoes e Estornos</h1>
          <p style={{ margin: '6px 0 0', color: '#647674' }}>Monitoramento operacional de vendas canceladas, estornadas e reflexos fiscais.</p>
        </div>
        <button onClick={carregar} style={actionButtonStyle}><RefreshCw size={15} /> Atualizar</button>
      </section>

      {erro && <div style={{ ...card, padding: 12, background: '#fff8ed', color: '#8a4b20' }}>{erro}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
        <Kpi label="Vendas canceladas" value={String(vendasCanceladas.length)} tone="#a64b4b" />
        <Kpi label="Vendas estornadas" value={String(vendasEstornadas.length)} tone="#9a3f3f" />
        <Kpi label="Impacto total" value={money(kpis.totalImpacto)} tone="#8a5a16" />
        <Kpi label="Documentos cancelados" value={String(kpis.documentosCancelados)} tone="#2f6f73" />
      </div>

      <section style={{ ...card, padding: 12, display: 'flex', gap: 8, alignItems: 'center', color: '#7b5a24', background: '#fff6e8', borderColor: '#ead2a4' }}>
        <AlertTriangle size={16} />
        Cancelamento e estorno reduzem receita reconhecida. Revise causa raiz para diminuir reincidencia.
      </section>

      <section style={{ ...card, overflow: 'hidden' }}>
        <div style={{ padding: 14, borderBottom: '1px solid #d9e2e1', fontWeight: 800 }}>Acoes operacionais rapidas</div>
        {loading ? <div style={{ padding: 12, color: '#647674' }}>Carregando...</div> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: '#f4f7f7', color: '#647674' }}><tr><th style={th}>Venda</th><th style={th}>Cliente</th><th style={th}>Data</th><th style={th}>Status</th><th style={th}>Total</th><th style={th}>Acoes</th></tr></thead>
              <tbody>
                {vendasOperacionais.slice(0, 50).map((venda) => (
                  <tr key={venda.id} style={{ borderTop: '1px solid #edf1f0' }}>
                    <td style={td}><strong>{venda.numero || venda.id.slice(0, 8)}</strong></td>
                    <td style={td}>{venda.cliente?.nome || '-'}</td>
                    <td style={td}>{formatDate(venda.data)}</td>
                    <td style={td}>{String(venda.status || '').toUpperCase() || '-'}</td>
                    <td style={td}>{money(Number(venda.total || 0))}</td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => executarAcao(venda, 'CANCELAR')}
                          disabled={processandoId === venda.id}
                          style={{ ...miniActionButton, color: '#9a3f3f', borderColor: '#e4bebe' }}
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => executarAcao(venda, 'ESTORNAR')}
                          disabled={processandoId === venda.id}
                          style={{ ...miniActionButton, color: '#8a5a16', borderColor: '#ead2a4' }}
                        >
                          Estornar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {vendasOperacionais.length === 0 && <tr><td colSpan={6} style={{ ...td, color: '#647674' }}>Sem vendas disponiveis para acao operacional.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <section style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: 14, borderBottom: '1px solid #d9e2e1', fontWeight: 800 }}>Vendas canceladas</div>
          {loading ? <div style={{ padding: 12, color: '#647674' }}>Carregando...</div> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead style={{ background: '#f4f7f7', color: '#647674' }}><tr><th style={th}>Venda</th><th style={th}>Cliente</th><th style={th}>Data</th><th style={th}>Origem</th><th style={th}>Total</th></tr></thead>
                <tbody>
                  {vendasCanceladas.slice(0, 80).map((venda) => (
                    <tr key={venda.id} style={{ borderTop: '1px solid #edf1f0' }}>
                      <td style={td}><strong>{venda.numero || venda.id.slice(0, 8)}</strong></td>
                      <td style={td}>{venda.cliente?.nome || '-'}</td>
                      <td style={td}>{formatDate(venda.data)}</td>
                      <td style={td}>{venda.origem || '-'}</td>
                      <td style={td}>{money(Number(venda.total || 0))}</td>
                    </tr>
                  ))}
                  {vendasCanceladas.length === 0 && <tr><td colSpan={5} style={{ ...td, color: '#647674' }}>Sem vendas canceladas no momento.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: 14, borderBottom: '1px solid #d9e2e1', fontWeight: 800 }}>Vendas estornadas</div>
          {loading ? <div style={{ padding: 12, color: '#647674' }}>Carregando...</div> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead style={{ background: '#f4f7f7', color: '#647674' }}><tr><th style={th}>Venda</th><th style={th}>Cliente</th><th style={th}>Data</th><th style={th}>Origem</th><th style={th}>Total</th></tr></thead>
                <tbody>
                  {vendasEstornadas.slice(0, 80).map((venda) => (
                    <tr key={venda.id} style={{ borderTop: '1px solid #edf1f0' }}>
                      <td style={td}><strong>{venda.numero || venda.id.slice(0, 8)}</strong></td>
                      <td style={td}>{venda.cliente?.nome || '-'}</td>
                      <td style={td}>{formatDate(venda.data)}</td>
                      <td style={td}>{venda.origem || '-'}</td>
                      <td style={td}>{money(Number(venda.total || 0))}</td>
                    </tr>
                  ))}
                  {vendasEstornadas.length === 0 && <tr><td colSpan={5} style={{ ...td, color: '#647674' }}>Sem vendas estornadas no momento.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section style={{ ...card, overflow: 'hidden' }}>
        <div style={{ padding: 14, borderBottom: '1px solid #d9e2e1', fontWeight: 800 }}>Documentos fiscais cancelados</div>
        {loading ? <div style={{ padding: 12, color: '#647674' }}>Carregando...</div> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: '#f4f7f7', color: '#647674' }}><tr><th style={th}>Documento</th><th style={th}>Modelo</th><th style={th}>Status</th><th style={th}>Cliente</th><th style={th}>Data</th><th style={th}>Total</th></tr></thead>
              <tbody>
                {documentosCancelados.slice(0, 120).map((doc, index) => (
                  <tr key={`${doc.id || doc.numero || 'doc'}-${index}`} style={{ borderTop: '1px solid #edf1f0' }}>
                    <td style={td}><strong>{doc.numero || doc.id || '-'}</strong></td>
                    <td style={td}>{doc.modelo || '-'}</td>
                    <td style={td}>{doc.status || 'CANCELADO'}</td>
                    <td style={td}>{doc.clienteNome || '-'}</td>
                    <td style={td}>{formatDate(doc.createdAt)}</td>
                    <td style={td}>{money(Number(doc.total || 0))}</td>
                  </tr>
                ))}
                {documentosCancelados.length === 0 && <tr><td colSpan={6} style={{ ...td, color: '#647674' }}>Sem documentos cancelados encontrados.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div style={{ ...card, padding: 14, borderLeft: `4px solid ${tone}` }}>
      <div style={{ color: '#647674', fontSize: 12 }}>{label}</div>
      <div style={{ marginTop: 8, color: '#243332', fontSize: 22, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: '11px 12px', fontWeight: 800 };
const td: React.CSSProperties = { padding: '12px', verticalAlign: 'middle', color: '#243332' };
const actionButtonStyle: React.CSSProperties = { height: 36, display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid #c7d5d2', background: '#fff', color: '#2f6f73', borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontWeight: 700 };
const miniActionButton: React.CSSProperties = { height: 30, display: 'inline-flex', alignItems: 'center', border: '1px solid', background: '#fff', borderRadius: 8, padding: '0 10px', cursor: 'pointer', fontWeight: 700 };
