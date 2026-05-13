import FinanceiroModuloExecutivo from '../components/FinanceiroModuloExecutivo';

export default function FinanceiroLancamentos() {
  return (
    <FinanceiroModuloExecutivo
      titulo="Lancamentos Financeiros"
      subtitulo="Centro financeiro unico com rastreabilidade de receita, despesa, transferencias e ajustes por origem operacional."
      filtros={['Periodo', 'Empresa', 'Canal', 'Centro de Custo', 'Status', 'Origem']}
      kpis={[
        { label: 'Lancamentos do mes', value: '1.842', trend: '+7,4% x mes anterior' },
        { label: 'Valor bruto', value: 'R$ 1.482.320,90' },
        { label: 'Valor liquido', value: 'R$ 1.329.208,44' },
        { label: 'Pendentes', value: 'R$ 213.109,10' },
      ]}
      colunas={[
        { key: 'descricao', label: 'Descricao' },
        { key: 'categoria', label: 'Categoria' },
        { key: 'origem', label: 'Origem' },
        { key: 'vencimento', label: 'Vencimento' },
        { key: 'valor', label: 'Valor liquido' },
        { key: 'status', label: 'Status' },
      ]}
      linhas={[
        { descricao: 'Pedido ML #92310', categoria: 'Receita/Marketplace', origem: 'Mercado Livre', vencimento: '14/05/2026', valor: 'R$ 1.948,24', status: 'Pendente' },
        { descricao: 'Comissao operador PDV', categoria: 'Despesa/Comissao', origem: 'PDV', vencimento: '15/05/2026', valor: 'R$ 422,16', status: 'Aguardando pagamento' },
        { descricao: 'Taxa gateway Shopee', categoria: 'Despesa/Taxa', origem: 'Shopee', vencimento: '16/05/2026', valor: 'R$ 91,20', status: 'Conciliado' },
      ]}
      insights={[
        '12 lancamentos com divergencia de categoria automatica aguardando revisao.',
        'Regra recomendada: diferenca ate R$ 1,00 pode ser conciliada automaticamente.',
        '3 lancamentos sem nota fiscal vinculada no periodo atual.',
      ]}
    />
  );
}
