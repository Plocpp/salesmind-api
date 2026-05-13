import FinanceiroModuloExecutivo from '../components/FinanceiroModuloExecutivo';

export default function FinanceiroConciliacaoCartoes() {
  return (
    <FinanceiroModuloExecutivo
      titulo="Conciliacao de Cartoes e Gateways"
      subtitulo="Comparativo automatico entre vendas autorizadas, taxas contratadas, antecipacoes e recebimentos liquidos por adquirente."
      filtros={['Periodo', 'Adquirente', 'Bandeira', 'Parcelas', 'Canal', 'Status de conciliacao']}
      kpis={[
        { label: 'Tx. conciliacao automatica', value: '93,8%', trend: '+1,9 p.p.' },
        { label: 'Valor conciliado', value: 'R$ 948.510,77' },
        { label: 'Divergencias abertas', value: 'R$ 12.144,30' },
        { label: 'Chargebacks', value: '17 casos' },
      ]}
      colunas={[
        { key: 'canal', label: 'Canal' },
        { key: 'adquirente', label: 'Adquirente' },
        { key: 'venda', label: 'Venda' },
        { key: 'recebido', label: 'Recebido' },
        { key: 'diferenca', label: 'Diferenca' },
        { key: 'status', label: 'Status' },
      ]}
      linhas={[
        { canal: 'Loja fisica', adquirente: 'Stone', venda: 'R$ 2.104,00', recebido: 'R$ 2.067,18', diferenca: 'R$ 36,82', status: 'Taxa divergente' },
        { canal: 'Mercado Livre', adquirente: 'Mercado Pago', venda: 'R$ 1.422,90', recebido: 'R$ 1.402,11', diferenca: 'R$ 20,79', status: 'Conciliado' },
        { canal: 'Shopee', adquirente: 'Pagar.me', venda: 'R$ 899,00', recebido: 'R$ 880,72', diferenca: 'R$ 18,28', status: 'Em analise' },
      ]}
      insights={[
        'Divergencia recorrente na adquirente Stone acima da taxa contratada em 0,21%.',
        '2 recebimentos sem venda origem localizada para o periodo atual.',
        'Habilitar importacao OFX e CNAB reduz falhas de conciliacao manual.',
      ]}
    />
  );
}
