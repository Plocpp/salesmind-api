import { Download, RefreshCw, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

type Cliente = {
  nome?: string;
};

type Venda = {
  id: string;
  numero?: string;
  status?: string;
  origem?: string;
  total?: number;
  data?: string;
  cliente?: Cliente | null;
};

type FiltrosConsulta = {
  status: string;
  inicio: string;
  fim: string;
  origem: string;
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

const csvEscape = (value: unknown) => {
  const text = String(value ?? '');
  if (text.includes(';') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

export default function VendasConsulta() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [filtros, setFiltros] = useState<FiltrosConsulta>({ status: '', inicio: '', fim: '', origem: '' });

  const token = localStorage.getItem('token');

  const exportarCsv = () => {
    if (!vendas.length) {
      setErro('Nao ha dados para exportar no momento.');
      return;
    }

    const cabecalho = ['numero', 'cliente', 'data', 'origem', 'status', 'total'];
    const linhas = vendas.map((venda) => [
      venda.numero || venda.id,
      venda.cliente?.nome || 'Consumidor final',
      formatDate(venda.data),
      venda.origem || '-',
      String(venda.status || '').toUpperCase() || 'AGUARDANDO_PAGAMENTO',
      Number(venda.total || 0).toFixed(2),
    ]);

    const conteudo = [cabecalho, ...linhas]
      .map((colunas) => colunas.map(csvEscape).join(';'))
      .join('\n');

    const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const agora = new Date();
    const stamp = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `consulta-vendas-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const carregar = async () => {
    try {
      setLoading(true);
      setErro('');

      const params = new URLSearchParams();
      if (filtros.status) params.set('status', filtros.status);
      if (filtros.inicio) params.set('inicio', filtros.inicio);
      if (filtros.fim) params.set('fim', filtros.fim);
      if (filtros.origem) params.set('origem', filtros.origem);

      const query = params.toString();
      const data = await api.get(`/vendas/vendas${query ? `?${query}` : ''}`, token);
      setVendas(Array.isArray(data) ? data : []);
    } catch (error) {
      setErro(parseApiError(error, 'Nao foi possivel carregar a consulta de vendas.'));
      setVendas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const kpis = useMemo(() => {
    const totalVendido = vendas.reduce((acc, venda) => acc + Number(venda.total || 0), 0);
    const ticketMedio = vendas.length ? totalVendido / vendas.length : 0;
    const pagas = vendas.filter((venda) => String(venda.status || '').toUpperCase() === 'PAGO').length;
    const canceladas = vendas.filter((venda) => ['CANCELADO', 'ESTORNADO'].includes(String(venda.status || '').toUpperCase())).length;

    return { totalVendido, ticketMedio, pagas, canceladas };
  }, [vendas]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, color: '#243332' }}>Consulta Vendas</h1>
          <p style={{ margin: '6px 0 0', color: '#647674' }}>Consulta rapida de vendas com filtros por periodo, origem e status.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={exportarCsv}
            style={{ height: 36, display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid #c7d5d2', background: '#fff', color: '#2f6f73', borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontWeight: 700 }}
          >
            <Download size={15} /> Exportar CSV
          </button>
          <button
            onClick={carregar}
            style={{ height: 36, display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid #c7d5d2', background: '#fff', color: '#2f6f73', borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontWeight: 700 }}
          >
            <RefreshCw size={15} /> Atualizar
          </button>
        </div>
      </section>

      {erro && <div style={{ ...card, padding: 12, background: '#fff8ed', color: '#8a4b20' }}>{erro}</div>}

      <section style={{ ...card, padding: 14, display: 'grid', gap: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
          <select value={filtros.status} onChange={(event) => setFiltros((current) => ({ ...current, status: event.target.value }))} style={inputStyle}>
            <option value="">Todos os status</option>
            <option value="PAGO">Pago</option>
            <option value="AGUARDANDO_PAGAMENTO">Aguardando pagamento</option>
            <option value="CANCELADO">Cancelado</option>
            <option value="ESTORNADO">Estornado</option>
          </select>
          <select value={filtros.origem} onChange={(event) => setFiltros((current) => ({ ...current, origem: event.target.value }))} style={inputStyle}>
            <option value="">Todas as origens</option>
            <option value="PDV">PDV</option>
            <option value="BALCAO">Balcao</option>
            <option value="MANUAL">Manual</option>
            <option value="API">API</option>
          </select>
          <input type="date" value={filtros.inicio} onChange={(event) => setFiltros((current) => ({ ...current, inicio: event.target.value }))} style={inputStyle} />
          <input type="date" value={filtros.fim} onChange={(event) => setFiltros((current) => ({ ...current, fim: event.target.value }))} style={inputStyle} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={carregar} style={actionButtonStyle}><Search size={14} /> Buscar</button>
          <button
            onClick={() => {
              setFiltros({ status: '', inicio: '', fim: '', origem: '' });
            }}
            style={secondaryActionButtonStyle}
          >
            Limpar
          </button>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <Kpi label="Vendas encontradas" value={String(vendas.length)} tone="#2f6f73" />
        <Kpi label="Total vendido" value={money(kpis.totalVendido)} tone="#1f6f43" />
        <Kpi label="Ticket medio" value={money(kpis.ticketMedio)} tone="#9a6a2f" />
        <Kpi label="Canceladas/estornadas" value={String(kpis.canceladas)} tone="#a64b4b" />
      </div>

      <section style={{ ...card, overflow: 'hidden' }}>
        <div style={{ padding: 14, borderBottom: '1px solid #d9e2e1', color: '#243332', fontWeight: 800 }}>Resultado da consulta</div>
        {loading ? (
          <div style={{ padding: 14, color: '#647674' }}>Carregando vendas...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: '#f4f7f7', color: '#647674' }}>
                <tr>
                  <th style={th}>Venda</th>
                  <th style={th}>Cliente</th>
                  <th style={th}>Data</th>
                  <th style={th}>Origem</th>
                  <th style={th}>Status</th>
                  <th style={th}>Total</th>
                </tr>
              </thead>
              <tbody>
                {vendas.slice(0, 120).map((venda) => (
                  <tr key={venda.id} style={{ borderTop: '1px solid #edf1f0' }}>
                    <td style={td}><strong>{venda.numero || venda.id.slice(0, 8)}</strong></td>
                    <td style={td}>{venda.cliente?.nome || 'Consumidor final'}</td>
                    <td style={td}>{formatDate(venda.data)}</td>
                    <td style={td}>{venda.origem || '-'}</td>
                    <td style={td}><StatusBadge status={venda.status} /></td>
                    <td style={td}>{money(Number(venda.total || 0))}</td>
                  </tr>
                ))}
                {vendas.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ ...td, color: '#647674' }}>Nenhuma venda encontrada para os filtros informados.</td>
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

function StatusBadge({ status }: { status?: string }) {
  const normalized = String(status || 'AGUARDANDO_PAGAMENTO').toUpperCase();

  const palette = normalized === 'PAGO'
    ? { color: '#2f6f73', background: '#e9f8f5', label: 'Pago' }
    : normalized === 'CANCELADO'
      ? { color: '#a64b4b', background: '#fff0f0', label: 'Cancelado' }
      : normalized === 'ESTORNADO'
        ? { color: '#9a3f3f', background: '#fff1f1', label: 'Estornado' }
        : { color: '#8a5a16', background: '#fff6e8', label: normalized };

  return <span style={{ color: palette.color, background: palette.background, padding: '4px 8px', borderRadius: 999, fontWeight: 700 }}>{palette.label}</span>;
}

const th: React.CSSProperties = { textAlign: 'left', padding: '11px 12px', fontWeight: 800 };
const td: React.CSSProperties = { padding: '12px', verticalAlign: 'middle', color: '#243332' };
const inputStyle: React.CSSProperties = { height: 36, border: '1px solid #d1dddd', borderRadius: 8, padding: '0 10px', fontSize: 13, background: '#fff' };
const actionButtonStyle: React.CSSProperties = { height: 34, display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #c7d5d2', background: '#fff', color: '#2f6f73', borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontWeight: 700 };
const secondaryActionButtonStyle: React.CSSProperties = { height: 34, display: 'inline-flex', alignItems: 'center', border: '1px solid #d9e2e1', background: '#f8fbfa', color: '#54736b', borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontWeight: 700 };
