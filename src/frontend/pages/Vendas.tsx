import {
    Banknote,
    BarChart3,
    ChevronDown,
    CreditCard,
    FileSpreadsheet,
    FileText,
    PackageCheck,
    Receipt,
    RefreshCw,
    Search,
    Settings,
    ShoppingCart,
    Trophy,
    Wallet
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

type SalesModuleId =
  | 'ponto-venda'
  | 'minhas-vendas'
  | 'movimentos-caixa'
  | 'consulta-vendas'
  | 'pacotes-vendidos'
  | 'recebimentos'
  | 'lista-precos'
  | 'ranking-clientes'
  | 'saldo-clientes'
  | 'formas-recebimento'
  | 'modelo-orcamento'
  | 'modelo-demonstrativo'
  | 'configuracao';

interface Produto {
  id: string;
  nome: string;
  preco: number;
  estoque: number;
  estoqueDisponivel?: number;
  codigo?: string;
  codigoBarras?: string;
  marca?: { nome: string };
}

interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
}

interface Venda {
  id: string;
  numero?: string;
  status?: string;
  origem?: string;
  tipo?: string;
  total: number;
  lucro?: number;
  margem?: number;
  data: string;
  cliente?: Cliente | null;
  pagamentos?: Array<{ forma: string; valor: number; status: string; parcelas?: number }>;
}

interface RankingCliente {
  cliente: string;
  faturamento: number;
  lucro?: number;
  frequencia: number;
  ticketMedio: number;
  classificacao: string;
}

interface SaldoCliente {
  id: string;
  saldoAtual: number;
  limiteCredito: number;
  cliente?: { nome: string };
}

interface ListaPreco {
  id: string;
  nome: string;
  tipo: string;
  margemMinima?: number;
  markupPadrao?: number;
  vigenciaInicio?: string;
  vigenciaFim?: string;
  itens?: Array<{ id: string }>;
}

interface Orcamento {
  id: string;
  numero?: string;
  titulo: string;
  total: number;
  validade?: string;
  cliente?: { nome: string };
  createdAt?: string;
}

interface FormaRecebimento {
  id: string;
  nome: string;
  tipo: string;
  taxaPercentual: number;
  taxaFixa: number;
  prazoRecebimentoDias: number;
  permiteParcelamento: boolean;
  permiteAntecipacao: boolean;
  ativo: boolean;
}

interface MovimentoCaixa {
  id: string;
  tipo: string;
  valor: number;
  descricao?: string;
  terminal?: string;
  createdAt: string;
  caixaId?: string;
  usuario?: { nome: string };
  caixa?: { id?: string; terminal?: string; loja?: string; turno?: string };
}

interface Caixa {
  id: string;
  status: string;
  terminal?: string;
  loja?: string;
  turno?: string;
  saldoInicial: number;
  saldoFinal?: number;
  abertoEm: string;
  fechadoEm?: string;
}

interface Demonstrativo {
  periodoDias: number;
  receita: number;
  lucro: number;
  margem: number;
  descontoTotal: number;
  freteTotal: number;
  receitaFinanceira: number;
  despesaFinanceira: number;
  canais: Array<{ canal: string; quantidade: number; total: number }>;
}

interface ConfiguracaoVendas {
  descontoMaximo: number;
  comissaoPadrao: number;
  validadeOrcamentoDias: number;
  permitirVendaOffline: boolean;
  exigirAprovacaoDesconto: boolean;
  nfeAutomatica: boolean;
  sincronizarMarketplace: boolean;
  atualizarEstoqueMarketplace: boolean;
  atualizarPrecoMarketplace: boolean;
  jurosMensal: number;
  multaAtraso: number;
  prazoRecebimentoPadrao: number;
}

interface ItemCarrinho {
  produto: Produto;
  quantidade: number;
  desconto: number;
}

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const panel: React.CSSProperties = { background: '#fff', border: '1px solid #d9e2e1', borderRadius: 8, boxShadow: '0 8px 24px rgba(36,51,50,.05)' };

const defaultConfig: ConfiguracaoVendas = {
  descontoMaximo: 10,
  comissaoPadrao: 5,
  validadeOrcamentoDias: 7,
  permitirVendaOffline: true,
  exigirAprovacaoDesconto: false,
  nfeAutomatica: false,
  sincronizarMarketplace: true,
  atualizarEstoqueMarketplace: true,
  atualizarPrecoMarketplace: false,
  jurosMensal: 0,
  multaAtraso: 0,
  prazoRecebimentoPadrao: 30,
};

type MenuGroup = {
  id: string;
  label: string;
  items: Array<{ id: SalesModuleId; label: string; icon: React.ComponentType<{ size?: number }> }>;
};

const menuGroups: MenuGroup[] = [
  {
    id: 'operacao',
    label: 'Operacao diaria',
    items: [
      { id: 'ponto-venda', label: 'Ponto de venda', icon: ShoppingCart },
      { id: 'minhas-vendas', label: 'Minhas vendas', icon: Receipt },
      { id: 'movimentos-caixa', label: 'Movimentos de caixa', icon: Wallet },
      { id: 'consulta-vendas', label: 'Consulta vendas', icon: Search },
    ],
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    items: [
      { id: 'recebimentos', label: 'Recebimentos', icon: CreditCard },
      { id: 'lista-precos', label: 'Lista de precos', icon: Banknote },
      { id: 'saldo-clientes', label: 'Saldo dos clientes', icon: Wallet },
      { id: 'formas-recebimento', label: 'Formas de recebimento', icon: CreditCard },
    ],
  },
  {
    id: 'relatorios',
    label: 'Relatorios',
    items: [
      { id: 'pacotes-vendidos', label: 'Pacotes vendidos', icon: PackageCheck },
      { id: 'ranking-clientes', label: 'Ranking de clientes', icon: Trophy },
      { id: 'modelo-orcamento', label: 'Modelo de orcamento', icon: FileText },
      { id: 'modelo-demonstrativo', label: 'Modelo de demonstrativo', icon: FileSpreadsheet },
    ],
  },
  {
    id: 'configuracoes',
    label: 'Configuracoes',
    items: [
      { id: 'configuracao', label: 'Configuracao', icon: Settings },
    ],
  },
];

export default function Vendas() {
  const [active, setActive] = useState<SalesModuleId>('ponto-venda');
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [erro, setErro] = useState('');

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [caixas, setCaixas] = useState<Caixa[]>([]);
  const [movimentos, setMovimentos] = useState<MovimentoCaixa[]>([]);
  const [ranking, setRanking] = useState<RankingCliente[]>([]);
  const [saldos, setSaldos] = useState<SaldoCliente[]>([]);
  const [listasPreco, setListasPreco] = useState<ListaPreco[]>([]);
  const [formas, setFormas] = useState<FormaRecebimento[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [demonstrativo, setDemonstrativo] = useState<Demonstrativo | null>(null);
  const [config, setConfig] = useState<ConfiguracaoVendas>(defaultConfig);

  const [buscaProduto, setBuscaProduto] = useState('');
  const [buscaCliente, setBuscaCliente] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [formaSelecionada, setFormaSelecionada] = useState('PIX');
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  
  const [caixaAberto, setCaixaAberto] = useState(false);
  const [saldoCaixa, setSaldoCaixa] = useState(0);
  const [operacaoCaixa, setOperacaoCaixa] = useState<'abrir' | 'fechar' | 'sangria' | 'deposito' | 'retirada' | 'pagamento' | 'recebimento' | 'suprimento' | null>(null);
  const [valorOperacao, setValorOperacao] = useState('');
  const [descricaoOperacao, setDescricaoOperacao] = useState('');

  const token = localStorage.getItem('token');

  const carregarTudo = async () => {
    try {
      setLoading(true);
      setErro('');

      const responses = await Promise.allSettled([
        api.get('/produtos?limit=100', token),
        api.get('/vendas/vendas', token),
        api.get('/vendas/caixas', token),
        api.get('/vendas/movimentos-caixa', token),
        api.get('/vendas/clientes/ranking', token),
        api.get('/vendas/clientes/saldos', token),
        api.get('/vendas/listas-preco', token),
        api.get('/vendas/formas-recebimento', token),
        api.get('/vendas/orcamentos', token),
        api.get('/vendas/modelo-demonstrativo?periodoDias=30', token),
        api.get('/vendas/configuracao', token),
      ]);

      const [
        produtosData,
        vendasData,
        caixasData,
        movimentosData,
        rankingData,
        saldosData,
        listasData,
        formasData,
        orcamentosData,
        demonstrativoData,
        configData,
      ] = responses;

      if (produtosData.status === 'fulfilled') setProdutos(Array.isArray(produtosData.value) ? produtosData.value : []);
      if (vendasData.status === 'fulfilled') setVendas(Array.isArray(vendasData.value) ? vendasData.value : []);
      if (caixasData.status === 'fulfilled') setCaixas(Array.isArray(caixasData.value) ? caixasData.value : []);
      if (movimentosData.status === 'fulfilled') setMovimentos(Array.isArray(movimentosData.value) ? movimentosData.value : []);
      if (rankingData.status === 'fulfilled') setRanking(Array.isArray(rankingData.value) ? rankingData.value : []);
      if (saldosData.status === 'fulfilled') setSaldos(Array.isArray(saldosData.value) ? saldosData.value : []);
      if (listasData.status === 'fulfilled') setListasPreco(Array.isArray(listasData.value) ? listasData.value : []);
      if (formasData.status === 'fulfilled') setFormas(Array.isArray(formasData.value) ? formasData.value : []);
      if (orcamentosData.status === 'fulfilled') setOrcamentos(Array.isArray(orcamentosData.value) ? orcamentosData.value : []);
      if (demonstrativoData.status === 'fulfilled' && demonstrativoData.value) setDemonstrativo(demonstrativoData.value);
      if (configData.status === 'fulfilled' && configData.value) {
        setConfig({ ...defaultConfig, ...configData.value });
      }

      const failures = responses.filter((item) => item.status === 'rejected').length;
      if (failures > 0) {
        setErro(`Alguns paineis nao carregaram (${failures}). Verifique migracoes e backend.`);
      }
    } catch (error) {
      console.error(error);
      setErro('Nao foi possivel carregar o modulo de vendas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarTudo();
  }, []);

  const produtosFiltrados = useMemo(() => {
    const termo = buscaProduto.toLowerCase();
    return produtos.filter((produto) => (
      produto.nome.toLowerCase().includes(termo)
      || produto.codigo?.toLowerCase().includes(termo)
      || produto.codigoBarras?.includes(buscaProduto)
    ));
  }, [produtos, buscaProduto]);

  const totalCarrinho = useMemo(
    () => carrinho.reduce((total, item) => total + item.produto.preco * item.quantidade - item.desconto, 0),
    [carrinho],
  );

  const kpis = useMemo(() => {
    const receita = vendas.reduce((total, venda) => total + Number(venda.total || 0), 0);
    const lucro = vendas.reduce((total, venda) => total + Number(venda.lucro || 0), 0);
    const pedidosAbertos = vendas.filter((venda) => ['AGUARDANDO_PAGAMENTO', 'PAGO', 'SEPARADO'].includes(venda.status || '')).length;
    return {
      receita,
      lucro,
      pedidosAbertos,
      ticketMedio: vendas.length ? receita / vendas.length : 0,
    };
  }, [vendas]);

  const adicionarAoCarrinho = (produto: Produto) => {
    setCarrinho((atual) => {
      const existente = atual.find((item) => item.produto.id === produto.id);
      if (!existente) {
        return [...atual, { produto, quantidade: 1, desconto: 0 }];
      }
      return atual.map((item) => (
        item.produto.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item
      ));
    });
  };

  const buscarCliente = async () => {
    if (!buscaCliente.trim()) return;
    try {
      const cliente = await api.get(`/vendas/clientes/buscar?nome=${encodeURIComponent(buscaCliente)}`, token);
      setClienteSelecionado(cliente || null);
    } catch (error) {
      console.error(error);
      alert('Cliente nao encontrado.');
    }
  };

  const caixaAtual = useMemo(() => caixas.find((caixa) => caixa.status?.toUpperCase() === 'ABERTO') || caixas[0] || null, [caixas]);

  const abrirCaixa = async () => {
    if (caixaAberto) return;

    try {
      const caixa = await api.post('/vendas/caixas', {
        terminal: 'PDV-01',
        loja: 'Loja Principal',
        turno: 'COMERCIAL',
        saldoInicial: Number(valorOperacao || 0),
      }, token);

      setCaixaAberto(true);
      setSaldoCaixa(Number(caixa?.saldoInicial || 0));
      setValorOperacao('');
      await carregarTudo();
    } catch (error) {
      console.error(error);
      alert('Nao foi possivel abrir o caixa.');
    }
  };

  const mapTipoMovimento = (operacao: NonNullable<typeof operacaoCaixa>) => {
    if (operacao === 'sangria') return 'SANGRIA';
    if (operacao === 'retirada') return 'RETIRADA';
    if (operacao === 'pagamento') return 'DESPESA';
    if (operacao === 'recebimento') return 'SOBRA';
    return 'SUPRIMENTO';
  };

  const confirmarOperacaoCaixa = async () => {
    if (!operacaoCaixa) return;

    if (operacaoCaixa === 'fechar') {
      setCaixaAberto(false);
      setOperacaoCaixa(null);
      setValorOperacao('');
      setDescricaoOperacao('');
      alert(`Caixa fechado localmente. Saldo final: ${money(saldoCaixa)}`);
      return;
    }

    const valor = Number(valorOperacao);
    if (!valor || valor <= 0) {
      alert('Informe um valor valido para a operacao.');
      return;
    }

    if (!caixaAtual?.id) {
      alert('Abra um caixa antes de registrar movimentacoes.');
      return;
    }

    try {
      const tipo = mapTipoMovimento(operacaoCaixa);
      await api.post('/vendas/caixas/movimentos', {
        caixaId: caixaAtual.id,
        tipo,
        valor,
        terminal: caixaAtual.terminal || 'PDV-01',
        descricao: descricaoOperacao || `${operacaoCaixa} via PDV`,
      }, token);

      const somaOperacao = ['deposito', 'recebimento', 'suprimento'].includes(operacaoCaixa);
      setSaldoCaixa((current) => (somaOperacao ? current + valor : current - valor));
      setValorOperacao('');
      setDescricaoOperacao('');
      setOperacaoCaixa(null);
      await carregarTudo();
    } catch (error) {
      console.error(error);
      alert('Nao foi possivel concluir a operacao de caixa.');
    }
  };

  const finalizarVenda = async () => {
    if (carrinho.length === 0) {
      alert('Adicione ao menos um item no carrinho.');
      return;
    }

    try {
      await api.post('/vendas/vendas', {
        clienteId: clienteSelecionado?.id,
        tipo: 'PDV',
        origem: 'PDV',
        status: 'PAGO',
        caixaId: caixaAtual?.id,
        terminal: caixaAtual?.terminal || 'PDV-01',
        itens: carrinho.map((item) => ({
          produtoId: item.produto.id,
          quantidade: item.quantidade,
          precoUnitario: Number(item.produto.preco),
          desconto: Number(item.desconto || 0),
        })),
        pagamentos: [{ forma: formaSelecionada, valor: totalCarrinho, parcelas: 1 }],
      }, token);

      setCarrinho([]);
      setBuscaCliente('');
      setClienteSelecionado(null);
      await carregarTudo();
    } catch (error) {
      console.error(error);
      alert('Falha ao finalizar venda.');
    }
  };

  const salvarConfiguracao = async () => {
    try {
      setSavingConfig(true);
      const updated = await api.put('/vendas/configuracao', config, token);
      setConfig({ ...defaultConfig, ...updated });
      alert('Configuracao salva com sucesso.');
    } catch (error) {
      console.error(error);
      alert('Nao foi possivel salvar a configuracao.');
    } finally {
      setSavingConfig(false);
    }
  };

  const renderModule = () => {
    if (active === 'ponto-venda') {
      if (produtos.length === 0) {
        return (
          <div style={{ ...panel, padding: 24, textAlign: 'center', color: '#647674' }}>
            <p>Nenhum produto cadastrado. Verifique o módulo de estoque.</p>
          </div>
        );
      }
      return (
        <section style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.2fr 0.9fr', gap: 14, alignItems: 'start', minHeight: 600 }}>
          {/* COLUNA 1: PRODUTOS */}
          <div style={{ ...panel, padding: 12, display: 'grid', gridTemplateRows: 'auto 1fr', gap: 10 }}>
            <div>
              <h3 style={{ margin: '0 0 8px', fontSize: 13 }}>Produtos e Serviços</h3>
              <input
                value={buscaProduto}
                onChange={(event) => setBuscaProduto(event.target.value)}
                placeholder="Pesquisar por nome, código ou código de barras"
                style={{...input, height: 34, fontSize: 12}}
              />
            </div>
            {produtosFiltrados.length === 0 ? (
              <div style={{ color: '#647674', padding: 16, textAlign: 'center', fontSize: 12 }}>
                {buscaProduto ? `Nenhum produto encontrado para "${buscaProduto}"` : 'Digite para pesquisar'}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, overflow: 'auto' }}>
                {produtosFiltrados.slice(0, 50).map((produto) => (
                  <button
                    key={produto.id}
                    onClick={() => adicionarAoCarrinho(produto)}
                    style={{ textAlign: 'left', padding: 9, background: '#f8faf9', border: '1px solid #d9e2e1', borderRadius: 6, cursor: 'pointer', fontSize: 11, transition: 'all 0.2s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#eef3f5')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#f8faf9')}
                  >
                    <strong style={{ fontSize: 11, display: 'block', marginBottom: 3 }}>{produto.nome.substring(0, 20)}</strong>
                    <div style={{ color: '#647674', fontSize: 10, marginBottom: 4 }}>
                      Est: {produto.estoqueDisponivel ?? produto.estoque}
                    </div>
                    <div style={{ color: '#2f6f73', fontWeight: 800, fontSize: 12 }}>{money(Number(produto.preco || 0))}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* COLUNA 2: CARRINHO E CLIENTE */}
          <div style={{ display: 'grid', gap: 10, gridTemplateRows: 'auto auto 1fr auto auto' }}>
            {/* Cliente */}
            <div style={{ ...panel, padding: 11 }}>
              <h3 style={{ margin: '0 0 7px', fontSize: 12, color: '#243332' }}>Cliente</h3>
              <div style={{ display: 'flex', gap: 5 }}>
                <input 
                  value={buscaCliente} 
                  onChange={(event) => setBuscaCliente(event.target.value)} 
                  placeholder="Nome, CPF ou telefone" 
                  style={{...input, height: 32, fontSize: 11, flex: 1}}
                />
                <button onClick={buscarCliente} style={{...iconButton, width: 32, height: 32}}><Search size={13} /></button>
              </div>
              <div style={{ padding: 7, borderRadius: 5, background: '#f4f7f7', color: '#647674', fontSize: 11, marginTop: 6 }}>
                {clienteSelecionado ? (
                  <div>
                    <strong>{clienteSelecionado.nome}</strong>
                    <div style={{ fontSize: 10, color: '#8a9b99', marginTop: 2 }}>
                      {clienteSelecionado.telefone ? `Tel: ${clienteSelecionado.telefone}` : 'Sem telefone'}
                    </div>
                  </div>
                ) : (
                  'Venda sem cliente'
                )}
              </div>
            </div>

            {/* Forma de Pagamento */}
            <div style={{ ...panel, padding: 11 }}>
              <label style={{...label, marginBottom: 5, fontSize: 11}}>Forma de pagamento</label>
              <select value={formaSelecionada} onChange={(event) => setFormaSelecionada(event.target.value)} style={{...input, height: 32, fontSize: 11}}>
                {['PIX', 'DINHEIRO', 'CREDITO', 'DEBITO', 'BOLETO', 'CREDIARIO', 'LINK_PAGAMENTO'].map((forma) => (
                  <option key={forma} value={forma}>{forma}</option>
                ))}
              </select>
            </div>

            {/* Carrinho */}
            <div style={{ ...panel, padding: 11, overflow: 'auto', borderTop: '2px solid #d9e2e1' }}>
              <h3 style={{ margin: '0 0 7px', fontSize: 12, color: '#243332' }}>Itens ({carrinho.length})</h3>
              {carrinho.length === 0 ? (
                <div style={{ color: '#8a9b99', textAlign: 'center', padding: 14, fontSize: 11 }}>
                  Clique em um produto para adicionar
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 6 }}>
                  {carrinho.map((item) => (
                    <div key={item.produto.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 40px 50px 24px', gap: 5, alignItems: 'center', padding: 7, background: '#f8faf9', borderRadius: 5, fontSize: 10 }}>
                      <div style={{ color: '#2f6f73', fontWeight: 800, fontSize: 11 }}>●</div>
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ fontSize: 10, display: 'block' }}>{item.produto.nome.substring(0, 16)}</strong>
                        <div style={{ color: '#8a9b99', fontSize: 9 }}>{money(item.produto.preco)}</div>
                      </div>
                      <input
                        type="number"
                        min={1}
                        value={item.quantidade}
                        onChange={(event) => setCarrinho((atual) => atual.map((row) => (
                          row.produto.id === item.produto.id ? { ...row, quantidade: Number(event.target.value) || 1 } : row
                        )))}
                        style={{...input, height: 26, padding: '0 4px', fontSize: 10, textAlign: 'center'}}
                      />
                      <strong style={{ fontSize: 11, textAlign: 'right' }}>{money(item.produto.preco * item.quantidade)}</strong>
                      <button 
                        onClick={() => setCarrinho(atual => atual.filter(row => row.produto.id !== item.produto.id))} 
                        style={{...iconButton, width: 24, height: 24, padding: 0, fontSize: 10, background: '#ffebee', color: '#a64b4b', border: '1px solid #ffcccc'}}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total e Botão */}
            <div style={{ ...panel, padding: 12, background: '#e1eeee', borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: '#647674', marginBottom: 3 }}>Total da venda</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#2f6f73', marginBottom: 8 }}>{money(totalCarrinho)}</div>
              <button 
                onClick={finalizarVenda} 
                style={{ ...buttonPrimary, width: '100%', fontSize: 12, padding: '10px 0' }}
                disabled={carrinho.length === 0}
              >
                ✓ Finalizar venda
              </button>
            </div>
          </div>

          {/* COLUNA 3: CAIXAS */}
          <div style={{ ...panel, padding: 12, display: 'grid', gridTemplateRows: 'auto 1fr', gap: 10, overflow: 'auto' }}>
            <div>
              <h3 style={{ margin: '0 0 8px', fontSize: 12, color: '#243332' }}>Caixas</h3>
              <div style={{ padding: 9, background: caixaAberto ? '#d4edda' : '#fff3cd', borderRadius: 6, border: `1px solid ${caixaAberto ? '#c3e6cb' : '#ffeaa7'}` }}>
                <div style={{ fontSize: 11, color: caixaAberto ? '#155724' : '#856404', fontWeight: 700 }}>
                  {caixaAberto ? '✓ CAIXA ABERTO' : '✗ CAIXA FECHADO'}
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#2f6f73', marginTop: 5 }}>
                  {money(saldoCaixa)}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 5, gridTemplateColumns: 'repeat(2, 1fr)', autoRows: 'max-content' }}>
              <button 
                onClick={abrirCaixa}
                style={{...buttonPrimary, fontSize: 10, padding: '7px 4px', height: 'auto', background: caixaAberto ? '#999' : '#2f6f73', opacity: caixaAberto ? 0.6 : 1}} 
                disabled={caixaAberto}
              >
                Abrir Caixa
              </button>
              <button 
                onClick={() => setOperacaoCaixa('sangria')} 
                style={{...buttonSecondary, fontSize: 10, padding: '7px 4px', height: 'auto'}} 
              >
                Sangria
              </button>
              <button 
                onClick={() => setOperacaoCaixa('deposito')} 
                style={{...buttonSecondary, fontSize: 10, padding: '7px 4px', height: 'auto'}} 
              >
                Depósito
              </button>
              <button 
                onClick={() => setOperacaoCaixa('retirada')} 
                style={{...buttonSecondary, fontSize: 10, padding: '7px 4px', height: 'auto'}} 
              >
                Retirada
              </button>
              <button 
                onClick={() => setOperacaoCaixa('recebimento')} 
                style={{...buttonSecondary, fontSize: 10, padding: '7px 4px', height: 'auto'}} 
              >
                Recebimento
              </button>
              <button 
                onClick={() => setOperacaoCaixa('pagamento')} 
                style={{...buttonSecondary, fontSize: 10, padding: '7px 4px', height: 'auto'}} 
              >
                Pagamento
              </button>
              <button 
                onClick={() => setOperacaoCaixa('suprimento')} 
                style={{...buttonSecondary, fontSize: 10, padding: '7px 4px', height: 'auto'}} 
              >
                Suprimento
              </button>
              <button 
                onClick={() => setOperacaoCaixa('fechar')} 
                style={{...buttonSecondary, fontSize: 10, padding: '7px 4px', height: 'auto', color: '#a64b4b', borderColor: '#ffcccc'}} 
                disabled={!caixaAberto}
              >
                Fechar Caixa
              </button>
            </div>

            {/* Modal de Operação */}
            {operacaoCaixa && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1001 }} onClick={() => setOperacaoCaixa(null)}>
                <div style={{...panel, padding: 18, width: 300, borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.3)'}} onClick={e => e.stopPropagation()}>
                  <h3 style={{ margin: '0 0 12px', fontSize: 13 }}>
                    {operacaoCaixa === 'sangria' && '🩸 Sangria'}
                    {operacaoCaixa === 'deposito' && '💰 Depósito'}
                    {operacaoCaixa === 'retirada' && '💸 Retirada'}
                    {operacaoCaixa === 'pagamento' && '💳 Pagamento'}
                    {operacaoCaixa === 'recebimento' && '✓ Recebimento'}
                    {operacaoCaixa === 'suprimento' && '📦 Suprimento'}
                    {operacaoCaixa === 'fechar' && '🔒 Fechamento de Caixa'}
                  </h3>
                  <div style={{ display: 'grid', gap: 10 }}>
                    <div>
                      <label style={{...label, fontSize: 11, marginBottom: 5}}>Valor (R$)</label>
                      <input 
                        type="number" 
                        value={valorOperacao} 
                        onChange={(e) => setValorOperacao(e.target.value)} 
                        placeholder="0.00" 
                        style={{...input, height: 36, fontSize: 12}}
                        autoFocus
                      />
                    </div>
                    {operacaoCaixa !== 'fechar' && (
                      <div>
                        <label style={{...label, fontSize: 11, marginBottom: 5}}>Observações</label>
                        <textarea 
                          value={descricaoOperacao} 
                          onChange={(e) => setDescricaoOperacao(e.target.value)} 
                          placeholder="Ex: Impressora quebrou, cliente João Silva, etc" 
                          style={{...input, minHeight: 70, fontFamily: 'inherit', resize: 'none', fontSize: 11}}
                        />
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <button 
                        onClick={confirmarOperacaoCaixa}
                        style={{...buttonPrimary, fontSize: 11}}
                      >
                        Confirmar
                      </button>
                      <button 
                        onClick={() => { setOperacaoCaixa(null); setValorOperacao(''); setDescricaoOperacao(''); }} 
                        style={{...buttonSecondary, fontSize: 11}}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      );
    }

    if (active === 'minhas-vendas') return <TabelaVendas vendas={vendas} />;
    if (active === 'consulta-vendas') return <TabelaVendas vendas={vendas} detalhada />;

    if (active === 'movimentos-caixa') {
      return (
        <section style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {caixas.slice(0, 4).map((caixa) => (
              <div key={caixa.id} style={{ ...panel, padding: 14 }}>
                <div style={{ color: '#647674', fontSize: 12 }}>Caixa {caixa.terminal || 'geral'}</div>
                <div style={{ marginTop: 6, fontWeight: 800 }}>{caixa.status}</div>
                <div style={{ marginTop: 8, color: '#647674', fontSize: 12 }}>
                  Loja {caixa.loja || '-'} | Turno {caixa.turno || '-'}
                </div>
              </div>
            ))}
          </div>
          <div style={{ ...panel, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: '#f4f7f7', color: '#647674' }}>
                <tr>
                  <th style={th}>Data</th><th style={th}>Tipo</th><th style={th}>Valor</th><th style={th}>Terminal</th><th style={th}>Operador</th><th style={th}>Descricao</th>
                </tr>
              </thead>
              <tbody>
                {movimentos.slice(0, 80).map((mov) => (
                  <tr key={mov.id} style={{ borderTop: '1px solid #edf1f0' }}>
                    <td style={td}>{new Date(mov.createdAt).toLocaleString('pt-BR')}</td>
                    <td style={td}><Badge value={mov.tipo} /></td>
                    <td style={td}>{money(Number(mov.valor || 0))}</td>
                    <td style={td}>{mov.terminal || mov.caixa?.terminal || '-'}</td>
                    <td style={td}>{mov.usuario?.nome || '-'}</td>
                    <td style={td}>{mov.descricao || '-'}</td>
                  </tr>
                ))}
                {movimentos.length === 0 && <tr><td colSpan={6} style={{ ...td, color: '#647674' }}>Sem movimentos de caixa.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      );
    }

    if (active === 'pacotes-vendidos') {
      const pacotes = vendas.filter((venda) => ['ASSINATURA', 'SERVICO'].includes(venda.tipo || ''));
      return (
        <section style={{ ...panel, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ background: '#f4f7f7', color: '#647674' }}>
              <tr><th style={th}>Pacote</th><th style={th}>Cliente</th><th style={th}>Status</th><th style={th}>Total</th><th style={th}>Data</th></tr>
            </thead>
            <tbody>
              {pacotes.map((venda) => (
                <tr key={venda.id} style={{ borderTop: '1px solid #edf1f0' }}>
                  <td style={td}>{venda.numero || venda.id.slice(0, 8)}</td>
                  <td style={td}>{venda.cliente?.nome || 'Consumidor'}</td>
                  <td style={td}><Badge value={venda.status || 'PAGO'} /></td>
                  <td style={td}>{money(venda.total || 0)}</td>
                  <td style={td}>{new Date(venda.data).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
              {pacotes.length === 0 && <tr><td colSpan={5} style={{ ...td, color: '#647674' }}>Sem pacotes vendidos ainda.</td></tr>}
            </tbody>
          </table>
        </section>
      );
    }

    if (active === 'recebimentos') {
      const recebimentos = vendas.flatMap((venda) => (venda.pagamentos || []).map((pagamento, index) => ({
        id: `${venda.id}-${index}`,
        venda: venda.numero || venda.id.slice(0, 8),
        cliente: venda.cliente?.nome || 'Consumidor',
        forma: pagamento.forma,
        valor: Number(pagamento.valor || 0),
        status: pagamento.status,
        data: venda.data,
      })));

      return (
        <section style={{ ...panel, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ background: '#f4f7f7', color: '#647674' }}>
              <tr><th style={th}>Venda</th><th style={th}>Cliente</th><th style={th}>Forma</th><th style={th}>Valor</th><th style={th}>Status</th><th style={th}>Competencia</th></tr>
            </thead>
            <tbody>
              {recebimentos.slice(0, 120).map((item) => (
                <tr key={item.id} style={{ borderTop: '1px solid #edf1f0' }}>
                  <td style={td}>{item.venda}</td>
                  <td style={td}>{item.cliente}</td>
                  <td style={td}>{item.forma}</td>
                  <td style={td}>{money(item.valor)}</td>
                  <td style={td}><Badge value={item.status || 'PENDENTE'} /></td>
                  <td style={td}>{new Date(item.data).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
              {recebimentos.length === 0 && <tr><td colSpan={6} style={{ ...td, color: '#647674' }}>Nenhum recebimento encontrado.</td></tr>}
            </tbody>
          </table>
        </section>
      );
    }

    if (active === 'lista-precos') {
      return (
        <section style={{ ...panel, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ background: '#f4f7f7', color: '#647674' }}>
              <tr><th style={th}>Nome</th><th style={th}>Tipo</th><th style={th}>Itens</th><th style={th}>Margem minima</th><th style={th}>Markup</th><th style={th}>Vigencia</th></tr>
            </thead>
            <tbody>
              {listasPreco.map((lista) => (
                <tr key={lista.id} style={{ borderTop: '1px solid #edf1f0' }}>
                  <td style={td}><strong>{lista.nome}</strong></td>
                  <td style={td}>{lista.tipo}</td>
                  <td style={td}>{lista.itens?.length || 0}</td>
                  <td style={td}>{lista.margemMinima ?? 0}%</td>
                  <td style={td}>{lista.markupPadrao ?? 0}%</td>
                  <td style={td}>{lista.vigenciaInicio ? new Date(lista.vigenciaInicio).toLocaleDateString('pt-BR') : '-'} ate {lista.vigenciaFim ? new Date(lista.vigenciaFim).toLocaleDateString('pt-BR') : '-'}</td>
                </tr>
              ))}
              {listasPreco.length === 0 && <tr><td colSpan={6} style={{ ...td, color: '#647674' }}>Nenhuma lista de preco cadastrada.</td></tr>}
            </tbody>
          </table>
        </section>
      );
    }

    if (active === 'ranking-clientes') return <Ranking ranking={ranking} />;

    if (active === 'saldo-clientes') {
      return (
        <section style={{ ...panel, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ background: '#f4f7f7', color: '#647674' }}>
              <tr><th style={th}>Cliente</th><th style={th}>Saldo atual</th><th style={th}>Limite credito</th></tr>
            </thead>
            <tbody>
              {saldos.map((saldo) => (
                <tr key={saldo.id} style={{ borderTop: '1px solid #edf1f0' }}>
                  <td style={td}>{saldo.cliente?.nome || 'Sem cliente'}</td>
                  <td style={td}>{money(Number(saldo.saldoAtual || 0))}</td>
                  <td style={td}>{money(Number(saldo.limiteCredito || 0))}</td>
                </tr>
              ))}
              {saldos.length === 0 && <tr><td colSpan={3} style={{ ...td, color: '#647674' }}>Sem saldos de clientes.</td></tr>}
            </tbody>
          </table>
        </section>
      );
    }

    if (active === 'formas-recebimento') {
      return (
        <section style={{ ...panel, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ background: '#f4f7f7', color: '#647674' }}>
              <tr><th style={th}>Forma</th><th style={th}>Tipo</th><th style={th}>Taxa %</th><th style={th}>Taxa fixa</th><th style={th}>Prazo</th><th style={th}>Parcelamento</th><th style={th}>Antecipacao</th></tr>
            </thead>
            <tbody>
              {formas.map((forma) => (
                <tr key={forma.id} style={{ borderTop: '1px solid #edf1f0' }}>
                  <td style={td}><strong>{forma.nome}</strong></td>
                  <td style={td}>{forma.tipo}</td>
                  <td style={td}>{Number(forma.taxaPercentual || 0)}%</td>
                  <td style={td}>{money(Number(forma.taxaFixa || 0))}</td>
                  <td style={td}>{forma.prazoRecebimentoDias || 0} dias</td>
                  <td style={td}>{forma.permiteParcelamento ? 'Sim' : 'Nao'}</td>
                  <td style={td}>{forma.permiteAntecipacao ? 'Sim' : 'Nao'}</td>
                </tr>
              ))}
              {formas.length === 0 && <tr><td colSpan={7} style={{ ...td, color: '#647674' }}>Sem formas de recebimento cadastradas.</td></tr>}
            </tbody>
          </table>
        </section>
      );
    }

    if (active === 'modelo-orcamento') {
      return (
        <section style={{ ...panel, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ background: '#f4f7f7', color: '#647674' }}>
              <tr><th style={th}>Numero</th><th style={th}>Titulo</th><th style={th}>Cliente</th><th style={th}>Valor</th><th style={th}>Validade</th><th style={th}>Criado em</th></tr>
            </thead>
            <tbody>
              {orcamentos.map((orcamento) => (
                <tr key={orcamento.id} style={{ borderTop: '1px solid #edf1f0' }}>
                  <td style={td}>{orcamento.numero || orcamento.id.slice(0, 8)}</td>
                  <td style={td}><strong>{orcamento.titulo}</strong></td>
                  <td style={td}>{orcamento.cliente?.nome || 'Sem cliente'}</td>
                  <td style={td}>{money(Number(orcamento.total || 0))}</td>
                  <td style={td}>{orcamento.validade ? new Date(orcamento.validade).toLocaleDateString('pt-BR') : '-'}</td>
                  <td style={td}>{orcamento.createdAt ? new Date(orcamento.createdAt).toLocaleDateString('pt-BR') : '-'}</td>
                </tr>
              ))}
              {orcamentos.length === 0 && <tr><td colSpan={6} style={{ ...td, color: '#647674' }}>Nenhum modelo de orcamento registrado.</td></tr>}
            </tbody>
          </table>
        </section>
      );
    }

    if (active === 'modelo-demonstrativo') {
      return (
        <section style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <Kpi label="Receita" value={money(Number(demonstrativo?.receita || 0))} icon={Banknote} color="#2f6f73" />
            <Kpi label="Lucro" value={money(Number(demonstrativo?.lucro || 0))} icon={BarChart3} color="#54736b" />
            <Kpi label="Margem" value={`${Number(demonstrativo?.margem || 0)}%`} icon={BarChart3} color="#9a6a2f" />
            <Kpi label="Despesas" value={money(Number(demonstrativo?.despesaFinanceira || 0))} icon={Wallet} color="#a64b4b" />
          </div>
          <div style={{ ...panel, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: '#f4f7f7', color: '#647674' }}>
                <tr><th style={th}>Canal</th><th style={th}>Quantidade</th><th style={th}>Total</th></tr>
              </thead>
              <tbody>
                {(demonstrativo?.canais || []).map((canal) => (
                  <tr key={canal.canal} style={{ borderTop: '1px solid #edf1f0' }}>
                    <td style={td}>{canal.canal}</td>
                    <td style={td}>{canal.quantidade}</td>
                    <td style={td}>{money(Number(canal.total || 0))}</td>
                  </tr>
                ))}
                {(demonstrativo?.canais || []).length === 0 && <tr><td colSpan={3} style={{ ...td, color: '#647674' }}>Sem dados para demonstrativo.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      );
    }

    if (active === 'configuracao') {
      return (
        <section style={{ ...panel, padding: 18 }}>
          <h3 style={{ marginTop: 0 }}>Configuracao global de vendas</h3>
          <p style={{ color: '#647674', marginTop: 0 }}>Regras de desconto, comissao, offline, marketplace e recebimento.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <Field label="Desconto maximo (%)">
              <input type="number" value={config.descontoMaximo} onChange={(event) => setConfig((current) => ({ ...current, descontoMaximo: Number(event.target.value) }))} style={input} />
            </Field>
            <Field label="Comissao padrao (%)">
              <input type="number" value={config.comissaoPadrao} onChange={(event) => setConfig((current) => ({ ...current, comissaoPadrao: Number(event.target.value) }))} style={input} />
            </Field>
            <Field label="Validade orcamento (dias)">
              <input type="number" value={config.validadeOrcamentoDias} onChange={(event) => setConfig((current) => ({ ...current, validadeOrcamentoDias: Number(event.target.value) }))} style={input} />
            </Field>
            <Field label="Prazo recebimento padrao (dias)">
              <input type="number" value={config.prazoRecebimentoPadrao} onChange={(event) => setConfig((current) => ({ ...current, prazoRecebimentoPadrao: Number(event.target.value) }))} style={input} />
            </Field>
            <Field label="Juros mensal (%)">
              <input type="number" value={config.jurosMensal} onChange={(event) => setConfig((current) => ({ ...current, jurosMensal: Number(event.target.value) }))} style={input} />
            </Field>
            <Field label="Multa atraso (%)">
              <input type="number" value={config.multaAtraso} onChange={(event) => setConfig((current) => ({ ...current, multaAtraso: Number(event.target.value) }))} style={input} />
            </Field>
          </div>

          <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
            <Check label="Permitir venda offline" checked={config.permitirVendaOffline} onChange={(value) => setConfig((current) => ({ ...current, permitirVendaOffline: value }))} />
            <Check label="Exigir aprovacao para desconto" checked={config.exigirAprovacaoDesconto} onChange={(value) => setConfig((current) => ({ ...current, exigirAprovacaoDesconto: value }))} />
            <Check label="Emitir NFC-e automaticamente" checked={config.nfeAutomatica} onChange={(value) => setConfig((current) => ({ ...current, nfeAutomatica: value }))} />
            <Check label="Sincronizar marketplace" checked={config.sincronizarMarketplace} onChange={(value) => setConfig((current) => ({ ...current, sincronizarMarketplace: value }))} />
            <Check label="Atualizar estoque nos marketplaces" checked={config.atualizarEstoqueMarketplace} onChange={(value) => setConfig((current) => ({ ...current, atualizarEstoqueMarketplace: value }))} />
            <Check label="Atualizar precos nos marketplaces" checked={config.atualizarPrecoMarketplace} onChange={(value) => setConfig((current) => ({ ...current, atualizarPrecoMarketplace: value }))} />
          </div>

          <div style={{ marginTop: 16 }}>
            <button onClick={salvarConfiguracao} style={buttonPrimary} disabled={savingConfig}>
              {savingConfig ? 'Salvando...' : 'Salvar configuracao'}
            </button>
          </div>
        </section>
      );
    }

    return null;
  };

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', position: 'relative' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, color: '#243332' }}>Modulo de Vendas</h1>
          <p style={{ margin: '6px 0 0', color: '#647674' }}>Estrutura comercial integrada a caixa, recebimentos, orcamentos e marketplace.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              ...buttonSecondary,
              background: menuOpen ? '#e8f0f0' : undefined,
              borderColor: menuOpen ? '#2f6f73' : undefined,
            }}
          >
            <ChevronDown size={16} style={{ transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} /> Menu
          </button>
          <button onClick={carregarTudo} style={buttonSecondary}><RefreshCw size={16} /> Atualizar dados</button>
        </div>

        {/* Dropdown Menu Flutuante */}
        {menuOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 8,
              background: 'white',
              border: '1px solid #d9e2e1',
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              zIndex: 1000,
              minWidth: 280,
              maxHeight: 400,
              overflow: 'auto',
            }}
          >
            {menuGroups.map((group, groupIdx) => (
              <div key={group.id}>
                {groupIdx > 0 && <div style={{ height: 1, background: '#f0f0f0' }} />}
                <div style={{ padding: '8px 0' }}>
                  <div style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, color: '#8a9b99', textTransform: 'uppercase' }}>
                    {group.label}
                  </div>
                  {group.items.map((item) => {
                    const IconComponent = item.icon;
                    const isActive = active === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActive(item.id);
                          setMenuOpen(false);
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 12px',
                          border: 'none',
                          background: isActive ? '#e8f0f0' : 'transparent',
                          color: isActive ? '#2f6f73' : '#243332',
                          fontWeight: isActive ? 600 : 400,
                          cursor: 'pointer',
                          fontSize: 13,
                          display: 'flex',
                          gap: 8,
                          alignItems: 'center',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) (e.currentTarget as HTMLElement).style.background = '#f8faf9';
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
                        }}
                      >
                        <IconComponent size={16} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </header>

      {erro && <div style={{ ...panel, padding: 14, color: '#8a4b20', background: '#fff8ed' }}>{erro}</div>}

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <Kpi label="Receita" value={money(kpis.receita)} icon={Banknote} color="#2f6f73" />
        <Kpi label="Lucro" value={money(kpis.lucro)} icon={BarChart3} color="#54736b" />
        <Kpi label="Pedidos abertos" value={kpis.pedidosAbertos} icon={Receipt} color="#9a6a2f" />
        <Kpi label="Ticket medio" value={money(kpis.ticketMedio)} icon={CreditCard} color="#6c8f7d" />
      </section>

      <main>{loading ? <div style={{ ...panel, padding: 18, color: '#647674' }}>Carregando modulo de vendas...</div> : renderModule()}</main>
    </div>
  );
}

function TabelaVendas({ vendas, detalhada = false }: { vendas: Venda[]; detalhada?: boolean }) {
  return (
    <section style={{ ...panel, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead style={{ background: '#f4f7f7', color: '#647674' }}>
          <tr>
            <th style={th}>Pedido</th><th style={th}>Cliente</th><th style={th}>Origem</th><th style={th}>Status</th><th style={th}>Total</th>{detalhada && <><th style={th}>Lucro</th><th style={th}>Margem</th></>}<th style={th}>Data</th>
          </tr>
        </thead>
        <tbody>
          {vendas.slice(0, 80).map((venda) => (
            <tr key={venda.id} style={{ borderTop: '1px solid #edf1f0' }}>
              <td style={td}><strong>{venda.numero || venda.id.slice(0, 8)}</strong></td>
              <td style={td}>{venda.cliente?.nome || 'Consumidor'}</td>
              <td style={td}>{venda.origem || 'PDV'}</td>
              <td style={td}><Badge value={venda.status || 'PAGO'} /></td>
              <td style={td}>{money(Number(venda.total || 0))}</td>
              {detalhada && <><td style={td}>{money(Number(venda.lucro || 0))}</td><td style={td}>{Number(venda.margem || 0)}%</td></>}
              <td style={td}>{new Date(venda.data).toLocaleDateString('pt-BR')}</td>
            </tr>
          ))}
          {vendas.length === 0 && <tr><td colSpan={detalhada ? 8 : 6} style={{ ...td, color: '#647674' }}>Nenhuma venda encontrada.</td></tr>}
        </tbody>
      </table>
    </section>
  );
}

function Ranking({ ranking }: { ranking: RankingCliente[] }) {
  return (
    <section style={{ ...panel, padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>Ranking de clientes</h3>
      <div style={{ display: 'grid', gap: 10 }}>
        {ranking.map((item, index) => (
          <div key={`${item.cliente}-${index}`} style={{ display: 'grid', gridTemplateColumns: '44px 1fr 130px 130px 90px', gap: 12, alignItems: 'center', padding: 12, background: '#f8faf9', border: '1px solid #d9e2e1', borderRadius: 8 }}>
            <strong>#{index + 1}</strong>
            <div>
              <strong>{item.cliente}</strong>
              <div style={{ color: '#647674', fontSize: 12 }}>{item.frequencia} compras | Ticket {money(item.ticketMedio)}</div>
            </div>
            <strong>{money(item.faturamento)}</strong>
            <strong>{money(Number(item.lucro || 0))}</strong>
            <Badge value={item.classificacao} />
          </div>
        ))}
        {ranking.length === 0 && <div style={{ color: '#647674' }}>Ranking sera exibido apos as primeiras vendas com cliente.</div>}
      </div>
    </section>
  );
}

function Field({ label: text, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={label}>{text}</span>
      {children}
    </label>
  );
}

function Check({ label: text, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#344745' }}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{text}</span>
    </label>
  );
}

function Kpi({ label: text, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ComponentType<{ size?: number; color?: string }>; color: string }) {
  return (
    <div style={{ ...panel, borderLeft: `4px solid ${color}`, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#647674', fontSize: 13 }}>
        {text}
        <Icon size={18} color={color} />
      </div>
      <div style={{ marginTop: 10, fontSize: 24, fontWeight: 900 }}>{value}</div>
    </div>
  );
}

function Badge({ value }: { value: string }) {
  const color = value === 'PAGO' || value === 'OURO' || value === 'ATIVO' ? '#2f6f73' : value === 'CANCELADO' ? '#a64b4b' : '#9a6a2f';
  return <span style={{ color, background: `${color}18`, padding: '5px 8px', borderRadius: 999, fontWeight: 800, fontSize: 12 }}>{value}</span>;
}

const buttonPrimary: React.CSSProperties = { height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: 'none', background: '#2f6f73', color: '#fff', borderRadius: 8, padding: '0 14px', cursor: 'pointer', fontWeight: 800 };
const buttonSecondary: React.CSSProperties = { height: 38, display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid #c7d5d2', background: '#fff', color: '#2f6f73', borderRadius: 8, padding: '0 14px', cursor: 'pointer', fontWeight: 700 };
const iconButton: React.CSSProperties = { width: 40, border: '1px solid #c7d5d2', background: '#fff', color: '#2f6f73', borderRadius: 8, cursor: 'pointer', display: 'grid', placeItems: 'center' };
const input: React.CSSProperties = { width: '100%', height: 38, border: '1px solid #c7d5d2', borderRadius: 8, padding: '0 10px', background: '#fff', color: '#243332', boxSizing: 'border-box' };
const label: React.CSSProperties = { display: 'block', color: '#647674', fontSize: 12, fontWeight: 800, marginBottom: 0 };
const th: React.CSSProperties = { textAlign: 'left', padding: '11px 12px', fontWeight: 800 };
const td: React.CSSProperties = { padding: '12px', verticalAlign: 'middle', color: '#243332' };
