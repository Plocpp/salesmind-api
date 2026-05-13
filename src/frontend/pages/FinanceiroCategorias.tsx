import FinanceiroModuloExecutivo from '../components/FinanceiroModuloExecutivo';

export default function FinanceiroCategorias() {
  return (
    <FinanceiroModuloExecutivo
      titulo="Categorias Financeiras"
      subtitulo="Hierarquia de classificacao para receitas e despesas com regras automaticas por origem e impacto direto nos relatorios."
      filtros={['Tipo', 'Nivel hierarquico', 'Origem', 'Regra automatica', 'Empresa', 'Status']}
      kpis={[
        { label: 'Categorias ativas', value: '146' },
        { label: 'Regras automaticas', value: '87', trend: '+12 configuradas no mes' },
        { label: 'Nao classificadas', value: '23 lancamentos' },
        { label: 'Acuracia classificacao', value: '97,2%' },
      ]}
      colunas={[
        { key: 'categoria', label: 'Categoria' },
        { key: 'hierarquia', label: 'Hierarquia' },
        { key: 'origem', label: 'Origem padrao' },
        { key: 'regra', label: 'Regra' },
      ]}
      linhas={[
        { categoria: 'Marketplace/Shopee', hierarquia: 'Receita > Marketplace > Shopee', origem: 'Shopee', regra: 'Venda Shopee -> categoria automatica' },
        { categoria: 'Despesa/Frete', hierarquia: 'Despesa > Logistica > Frete', origem: 'ML + Amazon', regra: 'Tag freight -> categoria frete' },
        { categoria: 'Despesa/Comissao', hierarquia: 'Despesa > Comercial > Comissao', origem: 'PDV', regra: 'Pedido com vendedor -> comissao' },
      ]}
      insights={[
        '23 lancamentos sem classificacao automatica impactam DRE gerencial.',
        'Padronizar nomenclatura de subcategorias reduz retrabalho no fechamento.',
        'Uso de icones e cores por familia melhora leitura dos dashboards.',
      ]}
    />
  );
}
