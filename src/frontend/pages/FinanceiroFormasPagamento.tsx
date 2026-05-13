import FinanceiroModuloExecutivo from '../components/FinanceiroModuloExecutivo';

export default function FinanceiroFormasPagamento() {
  return (
    <FinanceiroModuloExecutivo
      titulo="Formas de Pagamento"
      subtitulo="Padronizacao de meios de pagamento com regras de taxa, prazo de recebimento, antecipacao e juros por canal."
      filtros={['Canal', 'Forma', 'Gateway', 'Parcelamento', 'Empresa', 'Status']}
      kpis={[
        { label: 'Meios ativos', value: '24' },
        { label: 'Taxa media ponderada', value: '2,41%' },
        { label: 'Prazo medio recebimento', value: '17 dias' },
        { label: 'Uso de PIX', value: '38,7%', trend: '+6,4 p.p.' },
      ]}
      colunas={[
        { key: 'forma', label: 'Forma' },
        { key: 'gateway', label: 'Gateway/Adquirente' },
        { key: 'taxa', label: 'Taxa' },
        { key: 'prazo', label: 'Prazo' },
        { key: 'regra', label: 'Regra' },
      ]}
      linhas={[
        { forma: 'Credito 3x', gateway: 'Pagar.me', taxa: '2,89%', prazo: '31 dias', regra: 'Antecipacao opcional' },
        { forma: 'PIX', gateway: 'Banco XP', taxa: '0,49%', prazo: 'D+0', regra: 'Baixa automatica' },
        { forma: 'Boleto', gateway: 'Asaas', taxa: 'R$ 2,79', prazo: 'D+2', regra: 'Concilia por retorno CNAB' },
      ]}
      insights={[
        'Credito parcelado acima de 6x tem margem pressionada no canal Amazon.',
        'PIX com desconto comercial elevou conversao no PDV em 11%.',
        'Sugestao: consolidar contratos de gateway para reduzir taxa media.',
      ]}
    />
  );
}
