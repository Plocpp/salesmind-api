import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Boxes, ClipboardCheck, PackagePlus, RefreshCw, Warehouse } from 'lucide-react';
import { api } from '../services/api';

type EstoqueItem = {
  id: string;
  nome: string;
  sku?: string;
  marca?: string;
  grupo?: string;
  fisico: number;
  reservado: number;
  disponivel: number;
  minimo: number;
  ruptura: boolean;
  baixoEstoque: boolean;
};

type AnaliseEstoque = {
  totalProdutos: number;
  rupturas: EstoqueItem[];
  baixoEstoque: EstoqueItem[];
  valorEstoque: number;
  itens: EstoqueItem[];
};

const card = {
  background: '#fff',
  border: '1px solid #d9e2e1',
  borderRadius: 8,
  boxShadow: '0 8px 24px rgba(36, 51, 50, 0.05)',
};

export default function Estoque() {
  const [analise, setAnalise] = useState<AnaliseEstoque | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const token = localStorage.getItem('token');

  const carregar = async () => {
    try {
      setLoading(true);
      setErro('');
      const data = await api.get('/estoque/analise', token);
      setAnalise(data);
    } catch (error) {
      console.error(error);
      setErro('Nao foi possivel carregar a analise de estoque. Verifique se a API esta rodando e se a migration foi aplicada.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const itens = analise?.itens ?? [];
  const saldoTotal = useMemo(() => itens.reduce((total, item) => total + item.disponivel, 0), [itens]);

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, color: '#243332' }}>Estoque e servicos</h1>
          <p style={{ margin: '6px 0 0', color: '#647674', maxWidth: 720 }}>
            Controle operacional de produtos, reservas, rupturas, compras e saldos por deposito.
          </p>
        </div>
        <button onClick={carregar} style={{ height: 38, display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #c7d5d2', background: '#fff', color: '#2f6f73', borderRadius: 8, padding: '0 14px', cursor: 'pointer', fontWeight: 700 }}>
          <RefreshCw size={16} /> Atualizar
        </button>
      </section>

      {erro && <div style={{ ...card, padding: 14, color: '#8a4b20', background: '#fff8ed' }}>{erro}</div>}
      {loading && <div style={{ ...card, padding: 18, color: '#647674' }}>Carregando estoque...</div>}

      {!loading && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
            <Kpi icon={Boxes} label="Produtos ativos" value={analise?.totalProdutos ?? 0} tone="#2f6f73" />
            <Kpi icon={Warehouse} label="Disponivel" value={`${saldoTotal} un`} tone="#54736b" />
            <Kpi icon={AlertTriangle} label="Rupturas" value={analise?.rupturas.length ?? 0} tone="#a64b4b" />
            <Kpi icon={PackagePlus} label="Estoque baixo" value={analise?.baixoEstoque.length ?? 0} tone="#9a6a2f" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr', gap: 16, alignItems: 'start' }}>
            <section style={{ ...card, overflow: 'hidden' }}>
              <div style={{ padding: 16, borderBottom: '1px solid #d9e2e1', display: 'flex', alignItems: 'center', gap: 10 }}>
                <ClipboardCheck size={18} color="#2f6f73" />
                <strong>Mapa de disponibilidade</strong>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead style={{ background: '#f4f7f7', color: '#647674' }}>
                    <tr>
                      <th style={th}>Produto</th>
                      <th style={th}>Marca</th>
                      <th style={th}>Fisico</th>
                      <th style={th}>Reservado</th>
                      <th style={th}>Disponivel</th>
                      <th style={th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.slice(0, 12).map((item) => (
                      <tr key={item.id} style={{ borderTop: '1px solid #edf1f0' }}>
                        <td style={td}><strong>{item.nome}</strong><div style={{ color: '#7b8a88', fontSize: 12 }}>{item.sku || 'Sem SKU'}</div></td>
                        <td style={td}>{item.marca || '-'}</td>
                        <td style={td}>{item.fisico}</td>
                        <td style={td}>{item.reservado}</td>
                        <td style={td}><strong>{item.disponivel}</strong></td>
                        <td style={td}><Status item={item} /></td>
                      </tr>
                    ))}
                    {itens.length === 0 && <tr><td colSpan={6} style={{ ...td, color: '#647674' }}>Nenhum produto encontrado.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            <section style={{ ...card, padding: 16 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Fila de atencao</h3>
              <AlertList title="Ruptura" items={analise?.rupturas ?? []} color="#a64b4b" />
              <AlertList title="Comprar em breve" items={analise?.baixoEstoque ?? []} color="#9a6a2f" />
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
      <div style={{ marginTop: 10, fontSize: 25, fontWeight: 800, color: '#243332' }}>{value}</div>
    </div>
  );
}

function Status({ item }: { item: EstoqueItem }) {
  const label = item.ruptura ? 'Ruptura' : item.baixoEstoque ? 'Baixo' : 'Saudavel';
  const color = item.ruptura ? '#a64b4b' : item.baixoEstoque ? '#9a6a2f' : '#2f6f73';
  return <span style={{ color, background: `${color}18`, padding: '5px 8px', borderRadius: 999, fontWeight: 700 }}>{label}</span>;
}

function AlertList({ title, items, color }: { title: string; items: EstoqueItem[]; color: string }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ color, fontWeight: 800, marginBottom: 8 }}>{title}</div>
      <div style={{ display: 'grid', gap: 8 }}>
        {items.slice(0, 5).map((item) => (
          <div key={item.id} style={{ padding: 10, background: '#f8faf9', border: '1px solid #d9e2e1', borderRadius: 8 }}>
            <strong>{item.nome}</strong>
            <div style={{ color: '#647674', fontSize: 12 }}>Disponivel: {item.disponivel} un | Minimo: {item.minimo}</div>
          </div>
        ))}
        {items.length === 0 && <div style={{ color: '#647674', fontSize: 13 }}>Sem pendencias agora.</div>}
      </div>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: '11px 12px', fontWeight: 800 };
const td: React.CSSProperties = { padding: '12px', verticalAlign: 'middle', color: '#243332' };
