import FinanceiroModuloExecutivo from '../components/FinanceiroModuloExecutivo';

export default function FinanceiroContasPagar() {
  return (
    <FinanceiroModuloExecutivo
      titulo="Contas a Pagar"
      subtitulo="Gestao de despesas futuras com aprovacao em fluxo, recorrencia, boletos, impostos e pagamentos em lote."
      filtros={['Periodo', 'Fornecedor', 'Centro de custo', 'Aprovador', 'Forma de pagamento', 'Status']}
      kpis={[
        { label: 'Vencendo em 7 dias', value: 'R$ 86.443,21' },
        { label: 'Aguardando aprovacao', value: '29 titulos' },
        { label: 'Pago no periodo', value: 'R$ 442.182,07', trend: '+5,1% em relacao ao mes anterior' },
        { label: 'Titulos em atraso', value: '11' },
      ]}
      colunas={[
        { key: 'fornecedor', label: 'Fornecedor' },
        { key: 'documento', label: 'Documento' },
        { key: 'vencimento', label: 'Vencimento' },
        { key: 'valor', label: 'Valor' },
        { key: 'aprovacao', label: 'Aprovacao' },
        { key: 'status', label: 'Status' },
      ]}
      linhas={[
        { fornecedor: 'Transportadora Sul', documento: 'NF 82391', vencimento: '13/05/2026', valor: 'R$ 9.114,20', aprovacao: 'Aprovado', status: 'Programado' },
        { fornecedor: 'Fornecedor Pet Prime', documento: 'Boleto 23911', vencimento: '14/05/2026', valor: 'R$ 18.520,00', aprovacao: 'Aguardando', status: 'Pendente' },
        { fornecedor: 'Agencia Midia 360', documento: 'NF 9342', vencimento: '09/05/2026', valor: 'R$ 4.320,00', aprovacao: 'Aprovado', status: 'Vencido' },
      ]}
      insights={[
        'Ativar OCR de boletos para reduzir digitacao manual no contas a pagar.',
        '5 titulos de frete sem rateio por centro de custo aplicado.',
        'Sugestao: politica de aprovacao dupla para titulos acima de R$ 15.000,00.',
      ]}
    />
  );
}
