import { useEffect, useState } from 'react';
import { AlertCircle, Banknote, CalendarDays, CreditCard, DollarSign, RefreshCw, TrendingUp } from 'lucide-react';
import { api } from '../services/api';

type Demonstrativo = {
  receitas: number;
  despesas: number;
  lucroLiquido: number;
  margem: number;
  impostos: number;
  taxas: number;
  totalLancamentos: number;
};

type FluxoCaixa = {
  periodoDias: number;
  entradasPrevistas: number;
  saidasPrevistas: number;
  saldoPrevisto: number;
  lancamentos: Array<{ id: string; descricao: string; tipo: string; status: string; valorLiquido: number; vencimento: string }>;
};

const card = {
  background: '#fff',
  border: '1px solid #d9e2e1',
  borderRadius: 8,
  boxShadow: '0 8px 24px rgba(36, 51, 50, 0.05)',
};

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Financeiro() {
  const [dre, setDre] = useState<Demonstrativo | null>(null);
  const [fluxo, setFluxo] = useState<FluxoCaixa | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const token = localStorage.getItem('token');

  const carregar = async () => {
    try {
      setLoading(true);
      setErro('');
      const [demonstrativo, caixa] = await Promise.all([
        api.get('/financeiro/demonstrativo', token),
        api.get('/financeiro/fluxo-caixa?dias=30', token),
      ]);
      setDre(demonstrativo);
      setFluxo(caixa);
    } catch (error) {
      console.error(error);
      setErro('Nao foi possivel carregar o financeiro. Verifique se a API esta rodando e se a migration foi aplicada.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, color: '#243332' }}>Financeiro</h1>
          <p style={{ margin: '6px 0 0', color: '#647674', maxWidth: 720 }}>
            Visao executiva de lancamentos, fluxo de caixa, margem e conciliacao operacional.
          </p>
        </div>
        <button onClick={carregar} style={{ height: 38, display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #c7d5d2', background: '#fff', color: '#2f6f73', borderRadius: 8, padding: '0 14px', cursor: 'pointer', fontWeight: 700 }}>
          <RefreshCw size={16} /> Atualizar
        </button>
      </section>

      {erro && <div style={{ ...card, padding: 14, color: '#8a4b20', background: '#fff8ed' }}>{erro}</div>}
      {loading && <div style={{ ...card, padding: 18, color: '#647674' }}>Carregando financeiro...</div>}

      {!loading && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
            <Kpi icon={DollarSign} label="Receitas" value={money(dre?.receitas ?? 0)} tone="#2f6f73" />
            <Kpi icon={Banknote} label="Despesas" value={money(dre?.despesas ?? 0)} tone="#a64b4b" />
            <Kpi icon={TrendingUp} label="Lucro liquido" value={money(dre?.lucroLiquido ?? 0)} tone="#54736b" />
            <Kpi icon={CreditCard} label="Margem" value={`${dre?.margem ?? 0}%`} tone="#6c8f7d" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.2fr', gap: 16, alignItems: 'start' }}>
            <section style={{ ...card, padding: 16 }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 16 }}>Fluxo previsto 30 dias</h3>
              <Progress label="Entradas" value={fluxo?.entradasPrevistas ?? 0} max={Math.max(fluxo?.entradasPrevistas ?? 0, fluxo?.saidasPrevistas ?? 0, 1)} color="#2f6f73" />
              <Progress label="Saidas" value={fluxo?.saidasPrevistas ?? 0} max={Math.max(fluxo?.entradasPrevistas ?? 0, fluxo?.saidasPrevistas ?? 0, 1)} color="#a64b4b" />
              <div style={{ marginTop: 18, padding: 14, background: '#f4f7f7', borderRadius: 8 }}>
                <div style={{ color: '#647674', fontSize: 13 }}>Saldo previsto</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: (fluxo?.saldoPrevisto ?? 0) >= 0 ? '#2f6f73' : '#a64b4b' }}>
                  {money(fluxo?.saldoPrevisto ?? 0)}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                <Mini label="Impostos" value={money(dre?.impostos ?? 0)} />
                <Mini label="Taxas" value={money(dre?.taxas ?? 0)} />
              </div>
            </section>

            <section style={{ ...card, overflow: 'hidden' }}>
              <div style={{ padding: 16, borderBottom: '1px solid #d9e2e1', display: 'flex', alignItems: 'center', gap: 10 }}>
                <CalendarDays size={18} color="#2f6f73" />
                <strong>Proximos lancamentos</strong>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead style={{ background: '#f4f7f7', color: '#647674' }}>
                    <tr>
                      <th style={th}>Descricao</th>
                      <th style={th}>Tipo</th>
                      <th style={th}>Vencimento</th>
                      <th style={th}>Valor</th>
                      <th style={th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(fluxo?.lancamentos ?? []).slice(0, 12).map((item) => (
                      <tr key={item.id} style={{ borderTop: '1px solid #edf1f0' }}>
                        <td style={td}><strong>{item.descricao}</strong></td>
                        <td style={td}>{item.tipo}</td>
                        <td style={td}>{new Date(item.vencimento).toLocaleDateString('pt-BR')}</td>
                        <td style={td}>{money(item.valorLiquido)}</td>
                        <td style={td}><Status status={item.status} /></td>
                      </tr>
                    ))}
                    {(fluxo?.lancamentos ?? []).length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ ...td, color: '#647674' }}>
                          <AlertCircle size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                          Nenhum lancamento previsto no periodo.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string | number; tone: string }) {
  return (
    <div style={{ ...card, padding: 16, borderLeft: `4px solid ${tone}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#647674', fontSize: 13 }}>
        {label}
        <Icon size={18} color={tone} />
      </div>
      <div style={{ marginTop: 10, fontSize: 24, fontWeight: 800, color: '#243332' }}>{value}</div>
    </div>
  );
}

function Progress({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#647674', marginBottom: 7 }}>
        <span>{label}</span>
        <strong>{money(value)}</strong>
      </div>
      <div style={{ height: 9, background: '#edf1f0', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min((value / max) * 100, 100)}%`, height: '100%', background: color }} />
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div style={{ padding: 12, background: '#f8faf9', border: '1px solid #d9e2e1', borderRadius: 8 }}><div style={{ color: '#647674', fontSize: 12 }}>{label}</div><strong>{value}</strong></div>;
}

function Status({ status }: { status: string }) {
  const ok = status === 'PAGO' || status === 'CONCILIADO';
  const color = ok ? '#2f6f73' : status === 'VENCIDO' ? '#a64b4b' : '#9a6a2f';
  return <span style={{ color, background: `${color}18`, padding: '5px 8px', borderRadius: 999, fontWeight: 700 }}>{status}</span>;
}

const th: React.CSSProperties = { textAlign: 'left', padding: '11px 12px', fontWeight: 800 };
const td: React.CSSProperties = { padding: '12px', verticalAlign: 'middle', color: '#243332' };
