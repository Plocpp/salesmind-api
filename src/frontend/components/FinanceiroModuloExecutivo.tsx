import { Filter, TrendingUp } from 'lucide-react';
import React from 'react';

type KPI = {
  label: string;
  value: string;
  trend?: string;
};

type TableColumn = {
  key: string;
  label: string;
};

type TableRow = Record<string, string>;

interface FinanceiroModuloExecutivoProps {
  titulo: string;
  subtitulo: string;
  kpis: KPI[];
  filtros: string[];
  insights: string[];
  colunas: TableColumn[];
  linhas: TableRow[];
}

const shellCard: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #d9e2e1',
  borderRadius: 10,
  boxShadow: '0 8px 24px rgba(36, 51, 50, 0.05)',
};

export default function FinanceiroModuloExecutivo({
  titulo,
  subtitulo,
  kpis,
  filtros,
  insights,
  colunas,
  linhas,
}: FinanceiroModuloExecutivoProps) {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, color: '#243332' }}>{titulo}</h1>
          <p style={{ margin: '6px 0 0', color: '#647674', maxWidth: 840 }}>{subtitulo}</p>
        </div>
      </section>

      <section style={{ ...shellCard, padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4c615f', fontWeight: 700, marginBottom: 10 }}>
          <Filter size={15} /> Filtros executivos
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
          {filtros.map((filtro) => (
            <button
              key={filtro}
              style={{
                height: 34,
                border: '1px solid #ced9d8',
                background: '#f8faf9',
                color: '#2f6f73',
                borderRadius: 8,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {filtro}
            </button>
          ))}
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
        {kpis.map((kpi) => (
          <article key={kpi.label} style={{ ...shellCard, padding: 14 }}>
            <div style={{ color: '#647674', fontSize: 13, marginBottom: 7 }}>{kpi.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#243332' }}>{kpi.value}</div>
            {kpi.trend && (
              <div style={{ marginTop: 7, color: '#2f6f73', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700 }}>
                <TrendingUp size={13} /> {kpi.trend}
              </div>
            )}
          </article>
        ))}
      </section>

      <section style={{ ...shellCard, overflow: 'hidden' }}>
        <div style={{ padding: 14, borderBottom: '1px solid #d9e2e1', fontWeight: 800, color: '#243332' }}>Dados operacionais</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ background: '#f4f7f7', color: '#647674' }}>
              <tr>
                {colunas.map((coluna) => (
                  <th key={coluna.key} style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 800 }}>{coluna.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha, index) => (
                <tr key={`${linha[colunas[0].key]}-${index}`} style={{ borderTop: '1px solid #edf1f0' }}>
                  {colunas.map((coluna) => (
                    <td key={coluna.key} style={{ padding: '11px 12px', color: '#243332' }}>{linha[coluna.key] ?? '-'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ ...shellCard, padding: 14 }}>
        <div style={{ marginBottom: 8, fontWeight: 800, color: '#243332' }}>Alertas e insights</div>
        <ul style={{ margin: 0, paddingLeft: 18, color: '#4f6160', lineHeight: 1.6 }}>
          {insights.map((insight) => (
            <li key={insight}>{insight}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
