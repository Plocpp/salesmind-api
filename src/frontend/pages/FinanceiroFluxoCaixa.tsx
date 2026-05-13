import FinanceiroModuloExecutivo from '../components/FinanceiroModuloExecutivo';

export default function FinanceiroFluxoCaixa() {
  return (
    <FinanceiroModuloExecutivo
      titulo="Fluxo de Caixa"
      subtitulo="Controle do caixa realizado e previsto com projecao de cenarios (otimista, realista e pessimista) para decisoes estrategicas."
      filtros={['Horizonte', 'Conta financeira', 'Canal', 'Cenario', 'Empresa', 'Centro de custo']}
      kpis={[
        { label: 'Saldo atual', value: 'R$ 382.991,80' },
        { label: 'Saldo em 30 dias', value: 'R$ 429.200,12', trend: '+12,1% projetado' },
        { label: 'Saidas previstas', value: 'R$ 514.900,42' },
        { label: 'Entradas previstas', value: 'R$ 561.108,74' },
      ]}
      colunas={[
        { key: 'periodo', label: 'Periodo' },
        { key: 'cenario', label: 'Cenario' },
        { key: 'entradas', label: 'Entradas' },
        { key: 'saidas', label: 'Saidas' },
        { key: 'saldo', label: 'Saldo final' },
      ]}
      linhas={[
        { periodo: '7 dias', cenario: 'Realista', entradas: 'R$ 120.911,22', saidas: 'R$ 92.441,00', saldo: 'R$ 411.462,02' },
        { periodo: '30 dias', cenario: 'Otimista', entradas: 'R$ 602.191,10', saidas: 'R$ 506.340,00', saldo: 'R$ 478.842,90' },
        { periodo: '90 dias', cenario: 'Pessimista', entradas: 'R$ 1.402.001,30', saidas: 'R$ 1.388.009,40', saldo: 'R$ 396.983,70' },
      ]}
      insights={[
        'Antecipacao parcial de cartoes melhora liquidez em 15 dias sem pressionar margem.',
        'Cenario pessimista indica necessidade de travar novas despesas nao essenciais.',
        'Fluxo previsto considera parcelas futuras e impostos agendados.',
      ]}
    />
  );
}
