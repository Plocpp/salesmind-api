import FinanceiroModuloExecutivo from '../components/FinanceiroModuloExecutivo';

export default function FinanceiroDemonstrativo() {
  return (
    <FinanceiroModuloExecutivo
      titulo="Demonstrativo Executivo (DRE)"
      subtitulo="Visao consolidada de receita, despesas, margem, CMV e rentabilidade por empresa e canal de venda."
      filtros={['Periodo', 'Empresa', 'Marketplace', 'Categoria', 'Centro de resultado', 'Comparativo']}
      kpis={[
        { label: 'Receita operacional', value: 'R$ 2.883.010,42' },
        { label: 'Lucro bruto', value: 'R$ 941.114,20' },
        { label: 'EBITDA', value: 'R$ 612.880,10', trend: '+8,3% trimestral' },
        { label: 'Margem liquida', value: '18,4%' },
      ]}
      colunas={[
        { key: 'linha', label: 'Linha DRE' },
        { key: 'valor', label: 'Valor' },
        { key: 'percentual', label: '% Receita' },
        { key: 'variacao', label: 'Variacao' },
      ]}
      linhas={[
        { linha: 'Receita liquida', valor: 'R$ 2.651.140,22', percentual: '100%', variacao: '+6,2%' },
        { linha: 'CMV', valor: 'R$ 1.710.026,02', percentual: '64,5%', variacao: '+4,4%' },
        { linha: 'Despesas operacionais', valor: 'R$ 512.217,40', percentual: '19,3%', variacao: '+2,1%' },
        { linha: 'Resultado liquido', valor: 'R$ 488.896,80', percentual: '18,4%', variacao: '+9,0%' },
      ]}
      insights={[
        'Canal Amazon apresentou melhor margem liquida no periodo (22,1%).',
        'CMV aumentou no canal Shopee devido ao frete subsidiado.',
        'Integracao direta com BI habilita fechamento automatico de indicadores.',
      ]}
    />
  );
}
