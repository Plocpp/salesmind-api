import { Filter, TrendingUp } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type KPI = { label: string; value: string; trend?: string };
type TableColumn = { key: string; label: string };
type TableRow = Record<string, string>;

interface FinanceiroModuloExecutivoProps {
  titulo: string;
  subtitulo: string;
  kpis: KPI[];
  filtros: string[];
  insights: string[];
  colunas: TableColumn[];
  linhas: TableRow[];
  /** Opções explícitas por filtro. Se omitido, infere das colunas. */
  opcoesFiltros?: Record<string, string[]>;
}

const shellCard: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #d9e2e1',
  borderRadius: 10,
  boxShadow: '0 8px 24px rgba(36, 51, 50, 0.05)',
};

/** Normaliza string para comparação: minúsculas, sem acento, sem espaço */
function norm(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '');
}

function isPeriodo(filtro: string) {
  return norm(filtro).includes('periodo') || norm(filtro).includes('data');
}

export default function FinanceiroModuloExecutivo({
  titulo,
  subtitulo,
  kpis,
  filtros,
  insights,
  colunas,
  linhas,
  opcoesFiltros = {},
}: FinanceiroModuloExecutivoProps) {
  const [filtroAberto, setFiltroAberto] = useState<string | null>(null);
  const [filtrosAtivos, setFiltrosAtivos] = useState<Record<string, string>>({});
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [busca, setBusca] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setFiltroAberto(null);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /** Detecta a coluna que melhor combina com o nome do filtro */
  const colParaFiltro = useCallback((filtroNome: string): TableColumn | null => {
    const nf = norm(filtroNome);
    return (
      colunas.find((c) => norm(c.key) === nf || norm(c.label) === nf) ??
      colunas.find((c) => norm(c.key).includes(nf) || nf.includes(norm(c.key))) ??
      null
    );
  }, [colunas]);

  /** Opções para um determinado filtro */
  const opcoesDoFiltro = useCallback((filtroNome: string): string[] => {
    if (opcoesFiltros[filtroNome]?.length) return opcoesFiltros[filtroNome];
    const col = colParaFiltro(filtroNome);
    if (!col) return [];
    return [...new Set(linhas.map((l) => l[col.key]).filter(Boolean))].sort();
  }, [opcoesFiltros, colParaFiltro, linhas]);

  /** Aplica filtros ativos + busca de texto às linhas */
  const linhasFiltradas = useMemo(() => {
    let result = linhas;

    // Filtros por seleção
    for (const [filtroNome, valor] of Object.entries(filtrosAtivos)) {
      if (!valor || isPeriodo(filtroNome)) continue;
      const col = colParaFiltro(filtroNome);
      if (col) {
        result = result.filter((l) =>
          (l[col.key] ?? '').toLowerCase().includes(valor.toLowerCase())
        );
      }
    }

    // Busca livre (todas as colunas)
    if (busca.trim()) {
      const q = busca.trim().toLowerCase();
      result = result.filter((l) =>
        colunas.some((c) => (l[c.key] ?? '').toLowerCase().includes(q))
      );
    }

    return result;
  }, [linhas, filtrosAtivos, busca, colParaFiltro, colunas]);

  const totalFiltrosAtivos =
    Object.values(filtrosAtivos).filter(Boolean).length +
    (periodoInicio || periodoFim ? 1 : 0) +
    (busca.trim() ? 1 : 0);

  function selecionarFiltro(filtroNome: string, valor: string) {
    setFiltrosAtivos((prev) => ({ ...prev, [filtroNome]: valor }));
    setFiltroAberto(null);
  }

  function limparFiltros() {
    setFiltrosAtivos({});
    setPeriodoInicio('');
    setPeriodoFim('');
    setBusca('');
    setFiltroAberto(null);
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* HEADER */}
      <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, color: '#243332' }}>{titulo}</h1>
          <p style={{ margin: '6px 0 0', color: '#647674', maxWidth: 840 }}>{subtitulo}</p>
        </div>
      </section>

      {/* FILTROS EXECUTIVOS */}
      <section style={{ ...shellCard, padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4c615f', fontWeight: 700 }}>
            <Filter size={15} /> Filtros executivos
            {totalFiltrosAtivos > 0 && (
              <span style={{
                background: '#2f6f73', color: '#fff', borderRadius: 99,
                fontSize: 11, fontWeight: 800, padding: '1px 7px', minWidth: 20, textAlign: 'center',
              }}>
                {totalFiltrosAtivos}
              </span>
            )}
          </div>
          {totalFiltrosAtivos > 0 && (
            <button
              onClick={limparFiltros}
              style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              ✕ Limpar filtros
            </button>
          )}
        </div>

        {/* Busca livre */}
        <input
          type="text"
          placeholder="Busca rápida em todos os campos..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box', marginBottom: 10,
            height: 34, border: '1px solid #ced9d8', borderRadius: 8,
            padding: '0 12px', fontSize: 13, color: '#243332', background: '#f8faf9',
            outline: 'none',
          }}
        />

        {/* Botões de filtro com dropdown */}
        <div ref={dropdownRef} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, position: 'relative' }}>
          {filtros.map((filtro) => {
            const ativo = isPeriodo(filtro)
              ? !!(periodoInicio || periodoFim)
              : !!filtrosAtivos[filtro];
            const label = isPeriodo(filtro) && (periodoInicio || periodoFim)
              ? `${periodoInicio || '…'} → ${periodoFim || '…'}`
              : filtrosAtivos[filtro] || filtro;
            const aberto = filtroAberto === filtro;
            const opcoes = opcoesDoFiltro(filtro);

            return (
              <div key={filtro} style={{ position: 'relative' }}>
                <button
                  onClick={() => setFiltroAberto(aberto ? null : filtro)}
                  style={{
                    height: 34, padding: '0 13px',
                    border: `1px solid ${ativo ? '#2f6f73' : '#ced9d8'}`,
                    background: ativo ? '#e8f4f4' : '#f8faf9',
                    color: ativo ? '#1a5459' : '#2f6f73',
                    borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 5,
                    boxShadow: aberto ? '0 0 0 2px #2f6f7333' : 'none',
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                  <span style={{ fontSize: 10, opacity: 0.6 }}>▾</span>
                </button>

                {aberto && (
                  <div style={{
                    position: 'absolute', top: 38, left: 0, zIndex: 50,
                    background: '#fff', border: '1px solid #d9e2e1', borderRadius: 10,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 200, maxWidth: 320,
                    padding: 10,
                  }}>
                    {isPeriodo(filtro) ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label style={{ fontSize: 11, color: '#647674', fontWeight: 700 }}>De</label>
                        <input
                          type="date"
                          value={periodoInicio}
                          onChange={(e) => setPeriodoInicio(e.target.value)}
                          style={{ border: '1px solid #ced9d8', borderRadius: 6, padding: '5px 8px', fontSize: 13, color: '#243332' }}
                        />
                        <label style={{ fontSize: 11, color: '#647674', fontWeight: 700 }}>Até</label>
                        <input
                          type="date"
                          value={periodoFim}
                          onChange={(e) => setPeriodoFim(e.target.value)}
                          style={{ border: '1px solid #ced9d8', borderRadius: 6, padding: '5px 8px', fontSize: 13, color: '#243332' }}
                        />
                        <button
                          onClick={() => setFiltroAberto(null)}
                          style={{ marginTop: 4, background: '#2f6f73', color: '#fff', border: 'none', borderRadius: 7, padding: '6px 10px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
                        >
                          Aplicar período
                        </button>
                      </div>
                    ) : opcoes.length > 0 ? (
                      <>
                        {filtrosAtivos[filtro] && (
                          <button
                            onClick={() => { setFiltrosAtivos((p) => { const n = { ...p }; delete n[filtro]; return n; }); setFiltroAberto(null); }}
                            style={{ width: '100%', textAlign: 'left', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '7px 10px', marginBottom: 6, color: '#dc2626', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                          >
                            ✕ Limpar "{filtrosAtivos[filtro]}"
                          </button>
                        )}
                        <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {opcoes.map((op) => (
                            <button
                              key={op}
                              onClick={() => selecionarFiltro(filtro, op)}
                              style={{
                                textAlign: 'left', background: filtrosAtivos[filtro] === op ? '#e8f4f4' : 'none',
                                border: 'none', borderRadius: 6, padding: '7px 10px', cursor: 'pointer',
                                color: filtrosAtivos[filtro] === op ? '#1a5459' : '#243332',
                                fontWeight: filtrosAtivos[filtro] === op ? 700 : 400, fontSize: 13,
                              }}
                            >
                              {filtrosAtivos[filtro] === op ? '✓ ' : ''}{op}
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div style={{ padding: '8px 6px', fontSize: 13, color: '#647674' }}>
                        Sem opções disponíveis para este filtro nos dados atuais.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* KPIs */}
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

      {/* TABELA */}
      <section style={{ ...shellCard, overflow: 'hidden' }}>
        <div style={{ padding: 14, borderBottom: '1px solid #d9e2e1', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 800, color: '#243332', flex: 1 }}>Dados operacionais</span>
          <span style={{ fontSize: 12, color: '#647674' }}>
            {linhasFiltradas.length} de {linhas.length} registro{linhas.length !== 1 ? 's' : ''}
            {linhasFiltradas.length < linhas.length && (
              <span style={{ color: '#2f6f73', fontWeight: 700 }}> · filtrado</span>
            )}
          </span>
        </div>
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
              {linhasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={colunas.length} style={{ padding: '24px 12px', textAlign: 'center', color: '#9bb5b3' }}>
                    Nenhum registro encontrado para os filtros aplicados.
                  </td>
                </tr>
              ) : (
                linhasFiltradas.map((linha, index) => (
                  <tr key={`${linha[colunas[0]?.key ?? '']}-${index}`} style={{ borderTop: '1px solid #edf1f0' }}>
                    {colunas.map((coluna) => (
                      <td key={coluna.key} style={{ padding: '11px 12px', color: '#243332' }}>{linha[coluna.key] ?? '-'}</td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* INSIGHTS */}
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
