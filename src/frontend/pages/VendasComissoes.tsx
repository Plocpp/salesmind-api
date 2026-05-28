import { RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

type VendedorComissao = {
  usuarioId: string;
  nome: string;
  email?: string | null;
  quantidadeVendas: number;
  totalVendido: number;
  totalComissao: number;
};

type PainelComissionamento = {
  periodoDias: number;
  totalComissao: number;
  totalVendido: number;
  quantidadeVendas: number;
  comissaoMediaPorVenda: number;
  porVendedor: VendedorComissao[];
};

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #d9e2e1',
  borderRadius: 8,
  boxShadow: '0 8px 24px rgba(36, 51, 50, 0.05)',
};

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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

export default function VendasComissoes() {
  const [periodoDias, setPeriodoDias] = useState(30);
  const [metaComissao, setMetaComissao] = useState(1200);
  const [painel, setPainel] = useState<PainelComissionamento | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const token = localStorage.getItem('token');

  const carregar = async (periodo = periodoDias) => {
    try {
      setLoading(true);
      setErro('');
      const data = await api.get(`/vendas/comissionamento/painel?periodoDias=${periodo}`, token);
      setPainel(data || null);
    } catch (error) {
      setErro(parseApiError(error, 'Nao foi possivel carregar o painel de comissoes.'));
      setPainel(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar(30);
  }, []);

  const topVendedor = useMemo(() => {
    if (!painel?.porVendedor?.length) return null;
    return painel.porVendedor[0];
  }, [painel]);

  const semaforoGeral = useMemo(() => {
    const percentual = metaComissao > 0 ? (Number(painel?.totalComissao || 0) / metaComissao) * 100 : 0;
    return getSemaforo(percentual);
  }, [metaComissao, painel]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, color: '#243332' }}>Comissoes</h1>
          <p style={{ margin: '6px 0 0', color: '#647674' }}>Painel de desempenho comercial por vendedor, comissao total e media por venda.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={String(periodoDias)}
            onChange={(event) => setPeriodoDias(Number(event.target.value))}
            style={{ height: 36, border: '1px solid #d1dddd', borderRadius: 8, padding: '0 10px', background: '#fff' }}
          >
            <option value="7">Ultimos 7 dias</option>
            <option value="15">Ultimos 15 dias</option>
            <option value="30">Ultimos 30 dias</option>
            <option value="60">Ultimos 60 dias</option>
            <option value="90">Ultimos 90 dias</option>
          </select>
          <button onClick={() => carregar(periodoDias)} style={actionButtonStyle}><RefreshCw size={15} /> Atualizar</button>
        </div>
      </section>

      {erro && <div style={{ ...card, padding: 12, background: '#fff8ed', color: '#8a4b20' }}>{erro}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <Kpi label="Total em comissoes" value={money(Number(painel?.totalComissao || 0))} tone="#1f6f43" />
        <Kpi label="Total vendido" value={money(Number(painel?.totalVendido || 0))} tone="#2f6f73" />
        <Kpi label="Qtd. de vendas" value={String(Number(painel?.quantidadeVendas || 0))} tone="#9a6a2f" />
        <Kpi label="Comissao media/venda" value={money(Number(painel?.comissaoMediaPorVenda || 0))} tone="#54736b" />
      </div>

      <section style={{ ...card, padding: 14, display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <strong style={{ color: '#243332' }}>Meta de comissao por vendedor no periodo</strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#647674', fontSize: 13 }}>R$</span>
            <input
              type="number"
              min={0}
              step={50}
              value={metaComissao}
              onChange={(event) => setMetaComissao(Number(event.target.value || 0))}
              style={{ height: 34, border: '1px solid #d1dddd', borderRadius: 8, padding: '0 10px', width: 150 }}
            />
          </div>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: semaforoGeral.color }} />
          <span style={{ color: '#54736b', fontSize: 13 }}>{semaforoGeral.label} no consolidado do periodo.</span>
        </div>
      </section>

      {topVendedor && (
        <section style={{ ...card, padding: 14, borderLeft: '4px solid #df7f4b' }}>
          <div style={{ color: '#647674', fontSize: 12 }}>Melhor vendedor no periodo</div>
          <div style={{ marginTop: 6, color: '#243332', fontSize: 18, fontWeight: 800 }}>{topVendedor.nome}</div>
          <div style={{ marginTop: 4, color: '#54736b' }}>
            {topVendedor.quantidadeVendas} venda(s) | {money(Number(topVendedor.totalVendido || 0))} vendido | {money(Number(topVendedor.totalComissao || 0))} comissao
          </div>
        </section>
      )}

      <section style={{ ...card, overflow: 'hidden' }}>
        <div style={{ padding: 14, borderBottom: '1px solid #d9e2e1', fontWeight: 800 }}>Ranking de comissoes por vendedor</div>
        {loading ? (
          <div style={{ padding: 12, color: '#647674' }}>Carregando painel de comissoes...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: '#f4f7f7', color: '#647674' }}>
                <tr>
                  <th style={th}>Vendedor</th>
                  <th style={th}>Email</th>
                  <th style={th}>Qtd. vendas</th>
                  <th style={th}>Total vendido</th>
                  <th style={th}>Total comissao</th>
                  <th style={th}>Comissao por venda</th>
                  <th style={th}>Meta</th>
                </tr>
              </thead>
              <tbody>
                {(painel?.porVendedor || []).map((item) => {
                  const media = item.quantidadeVendas > 0 ? item.totalComissao / item.quantidadeVendas : 0;
                  const percentualMeta = metaComissao > 0 ? (Number(item.totalComissao || 0) / metaComissao) * 100 : 0;
                  const semaforo = getSemaforo(percentualMeta);
                  return (
                    <tr key={item.usuarioId} style={{ borderTop: '1px solid #edf1f0' }}>
                      <td style={td}><strong>{item.nome}</strong></td>
                      <td style={td}>{item.email || '-'}</td>
                      <td style={td}>{item.quantidadeVendas}</td>
                      <td style={td}>{money(Number(item.totalVendido || 0))}</td>
                      <td style={{ ...td, color: '#1f6f43', fontWeight: 700 }}>{money(Number(item.totalComissao || 0))}</td>
                      <td style={td}>{money(media)}</td>
                      <td style={td}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: semaforo.textColor, fontWeight: 700 }}>
                          <span style={{ width: 10, height: 10, borderRadius: 999, background: semaforo.color }} />
                          {semaforo.label} ({Math.max(0, percentualMeta).toFixed(0)}%)
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {(!painel?.porVendedor || painel.porVendedor.length === 0) && (
                  <tr>
                    <td colSpan={7} style={{ ...td, color: '#647674' }}>Nenhuma comissao encontrada para o periodo selecionado.</td>
                  </tr>
                )}
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

function getSemaforo(percentual: number) {
  if (percentual >= 100) return { label: 'Verde', color: '#2b8a3e', textColor: '#1f6f43' };
  if (percentual >= 70) return { label: 'Amarelo', color: '#d3a433', textColor: '#8a5a16' };
  return { label: 'Vermelho', color: '#c74848', textColor: '#9a3f3f' };
}
