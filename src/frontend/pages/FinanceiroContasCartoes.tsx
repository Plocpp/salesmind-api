import FinanceiroModuloExecutivo from '../components/FinanceiroModuloExecutivo';

export default function FinanceiroContasCartoes() {
  return (
    <FinanceiroModuloExecutivo
      titulo="Contas e Cartoes"
      subtitulo="Gestao centralizada de contas bancarias, caixas, carteiras digitais e configuracoes de cartoes por adquirente."
      filtros={['Empresa', 'Banco', 'Tipo de conta', 'Adquirente', 'Bandeira', 'Status']}
      kpis={[
        { label: 'Saldo disponivel', value: 'R$ 512.004,91' },
        { label: 'Saldo bloqueado', value: 'R$ 48.334,12' },
        { label: 'Taxa media cartao', value: '2,78%' },
        { label: 'Contas monitoradas', value: '19' },
      ]}
      colunas={[
        { key: 'conta', label: 'Conta/Carteira' },
        { key: 'tipo', label: 'Tipo' },
        { key: 'saldo', label: 'Saldo' },
        { key: 'disponivel', label: 'Disponivel' },
        { key: 'integracao', label: 'Integracao' },
      ]}
      linhas={[
        { conta: 'Banco XP - Conta Principal', tipo: 'Conta corrente', saldo: 'R$ 301.220,32', disponivel: 'R$ 299.810,40', integracao: 'Open Finance ativa' },
        { conta: 'Stone recebiveis', tipo: 'Cartao credito', saldo: 'R$ 84.044,91', disponivel: 'R$ 71.220,40', integracao: 'API ativa' },
        { conta: 'Caixa loja centro', tipo: 'Caixa fisico', saldo: 'R$ 3.912,00', disponivel: 'R$ 3.912,00', integracao: 'Manual' },
      ]}
      insights={[
        '2 contas sem extrato automatico em tempo real.',
        'Taxa de antecipacao acima de 3,2% em um contrato de credito parcelado.',
        'Recomenda-se conciliacao diaria para contas de alto giro.',
      ]}
    />
  );
}
