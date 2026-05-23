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
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  precoOriginal?: number;
  estoque: number;
  estoqueDisponivel?: number;
  codigo?: string;
  codigoBarras?: string;
  validade?: string;
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
  itens?: Array<{
    id: string;
    produtoId?: string;
    preco?: number;
    promocional?: number;
    inicio?: string;
    fim?: string;
  }>;
}

interface Orcamento {
  id: string;
  numero?: string;
  titulo: string;
  total: number;
  validade?: string;
  cliente?: { nome: string; email?: string };
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

interface ResumoFechamentoCaixa {
  caixa: {
    id: string;
    status: string;
    terminal?: string;
    loja?: string;
    turno?: string;
    abertoEm?: string;
    fechadoEm?: string;
  };
  totais: {
    saldoInicial: number;
    totalEntradas: number;
    totalSaidas: number;
    saldoCalculado: number;
    saldoFinal: number;
    diferenca: number;
  };
  resumoPorTipo: Record<string, { quantidade: number; total: number }>;
  movimentos: Array<{ id?: string; tipo: string; valor: number; descricao?: string; createdAt?: string }>;
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

type CaixaOperacao = 'abrir' | 'fechar' | 'sangria' | 'deposito' | 'retirada' | 'pagamento' | 'recebimento' | 'suprimento';

const MOEDAS_BR = [0.05, 0.1, 0.25, 0.5, 1] as const;
const NOTAS_BR = [2, 5, 10, 20, 50, 100, 200] as const;

const criarContagemInicial = () => {
  const entradas = [...MOEDAS_BR, ...NOTAS_BR].map((valor) => [String(valor), ''] as const);
  return Object.fromEntries(entradas) as Record<string, string>;
};

const calcularTotalContagem = (contagem: Record<string, string>) => {
  return Object.entries(contagem).reduce((soma, [valor, quantidade]) => {
    const qtd = Number(quantidade || 0);
    const unitario = Number(valor || 0);
    return soma + unitario * qtd;
  }, 0);
};

const formatarDenominacao = (valor: number) => {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: valor < 2 ? 2 : 0 });
};

const defaultDetalhesOperacao = {
  motivo: '',
  origem: '',
  destino: '',
  categoria: '',
  favorecido: '',
  forma: 'DINHEIRO',
  referencia: '',
  autorizadoPor: '',
  comprovante: '',
};

const parseApiError = (error: unknown, fallback: string) => {
  if (!(error instanceof Error)) return fallback;

  const raw = error.message || '';
  const jsonStart = raw.indexOf('{');
  if (jsonStart >= 0) {
    try {
      const parsed = JSON.parse(raw.slice(jsonStart));
      if (typeof parsed?.error === 'string' && parsed.error) {
        return parsed.error;
      }
    } catch {
      return raw;
    }
  }

  return raw || fallback;
};

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

const BANDEIRAS_CARTAO_BR = ['VISA', 'MASTERCARD', 'ELO', 'HIPERCARD', 'AMEX', 'CABAL', 'DISCOVER'] as const;
const ADQUIRENTES_BR = ['MERCADO PAGO', 'PAGSEGURO', 'STONE', 'REDE', 'CIELO', 'GETNET', 'SUMUP', 'SAFRA PAY'] as const;
const DIAS_VALIDADE_CURTA = 15;

export default function Vendas() {
  const [active, setActive] = useState<SalesModuleId>('ponto-venda');
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [erro, setErro] = useState('');
  const [falhasCarga, setFalhasCarga] = useState<string[]>([]);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

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
  const [codigoBarrasRapido, setCodigoBarrasRapido] = useState('');
  const [buscaCliente, setBuscaCliente] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [criandoClienteRapido, setCriandoClienteRapido] = useState(false);
  const [salvandoClienteRapido, setSalvandoClienteRapido] = useState(false);
  const [novoClienteRapido, setNovoClienteRapido] = useState({ nome: '', telefone: '', email: '' });
  const [formaSelecionada, setFormaSelecionada] = useState('PIX');
  const [bandeiraCartao, setBandeiraCartao] = useState('VISA');
  const [adquirenteCartao, setAdquirenteCartao] = useState('MERCADO PAGO');
  const [parcelasCartao, setParcelasCartao] = useState(1);
  const [emitirNfceNaVenda, setEmitirNfceNaVenda] = useState(false);
  const [clienteDocumentoNfce, setClienteDocumentoNfce] = useState('');
  const [valorPago, setValorPago] = useState('0');
  const [comprovantePagamento, setComprovantePagamento] = useState('');
  const [pagamentoComprovado, setPagamentoComprovado] = useState(false);
  const [finalizandoVenda, setFinalizandoVenda] = useState(false);
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [ultimaAdicao, setUltimaAdicao] = useState<{ nome: string; quantidade: number; valor: number } | null>(null);
  const [ultimosItensAdicionados, setUltimosItensAdicionados] = useState<Array<{ produtoId: string; nome: string; quantidade: number; valor: number }>>([]);
  
  const [caixaAberto, setCaixaAberto] = useState(false);
  const [saldoCaixa, setSaldoCaixa] = useState(0);
  const [operacaoCaixa, setOperacaoCaixa] = useState<CaixaOperacao | null>(null);
  const [valorOperacao, setValorOperacao] = useState('');
  const [descricaoOperacao, setDescricaoOperacao] = useState('');
  const [detalhesOperacao, setDetalhesOperacao] = useState({ ...defaultDetalhesOperacao });
  const [contagemAbertura, setContagemAbertura] = useState<Record<string, string>>(() => criarContagemInicial());
  const [contagemFechamento, setContagemFechamento] = useState<Record<string, string>>(() => criarContagemInicial());
  const [contagemSuprimento, setContagemSuprimento] = useState<Record<string, string>>(() => criarContagemInicial());

  // Estados para operações avançadas dos módulos
  const [modalAberto, setModalAberto] = useState<string | null>(null);
  const [filtroData, setFiltroData] = useState({ inicio: '', fim: '' });
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('TODOS');
  const [filtroForma, setFiltroForma] = useState('TODAS');
  const [buscaOrcamento, setBuscaOrcamento] = useState('');
  const [buscaLista, setBuscaLista] = useState('');
  const [filtroClassificacao, setFiltroClassificacao] = useState('TODOS');
  const [operacaoModal, setOperacaoModal] = useState<any>(null);
  const [novaLista, setNovaLista] = useState({ nome: '', tipo: 'VAREJO', margemMinima: 10, markupPadrao: 30 });
  const [novaForma, setNovaForma] = useState({ nome: '', tipo: 'PIX', taxaPercentual: 0, taxaFixa: 0, prazoRecebimentoDias: 0, permiteParcelamento: false, permiteAntecipacao: false });
  const [novoOrcamento, setNovoOrcamento] = useState({ titulo: '', clienteId: '', itens: [] as any[] });
  const [exportando, setExportando] = useState(false);
  const [resumoFechamento, setResumoFechamento] = useState<ResumoFechamentoCaixa | null>(null);

  const buscaProdutoRef = useRef<HTMLInputElement | null>(null);
  const codigoBarrasRef = useRef<HTMLInputElement | null>(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 920px)');
    const update = () => setIsMobileViewport(mediaQuery.matches);

    update();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', update);
      return () => mediaQuery.removeEventListener('change', update);
    }

    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, []);

  const carregarTudo = async () => {
    try {
      setLoading(true);
      setErro('');
      setFalhasCarga([]);

      if (!token) {
        setErro('Sessao expirada. Entre novamente para carregar o ponto de venda.');
        return;
      }

      const blocos = [
        { nome: 'Produtos', request: api.get('/produtos?limit=100', token) },
        { nome: 'Vendas', request: api.get('/vendas/vendas', token) },
        { nome: 'Caixas', request: api.get('/vendas/caixas', token) },
        { nome: 'Movimentos de caixa', request: api.get('/vendas/movimentos-caixa', token) },
        { nome: 'Ranking de clientes', request: api.get('/vendas/clientes/ranking', token) },
        { nome: 'Saldo de clientes', request: api.get('/vendas/clientes/saldos', token) },
        { nome: 'Listas de preco', request: api.get('/vendas/listas-preco', token) },
        { nome: 'Formas de recebimento', request: api.get('/vendas/formas-recebimento', token) },
        { nome: 'Orcamentos', request: api.get('/vendas/orcamentos', token) },
        { nome: 'Demonstrativo', request: api.get('/vendas/modelo-demonstrativo?periodoDias=30', token) },
        { nome: 'Configuracao', request: api.get('/vendas/configuracao', token) },
      ];

      const responses = await Promise.allSettled(blocos.map((bloco) => bloco.request));

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

      const failures = responses
        .map((item, index) => {
          if (item.status !== 'rejected') return null;
          const detalhe = parseApiError(item.reason, 'falha de comunicacao');
          return `${blocos[index].nome}: ${detalhe}`;
        })
        .filter((item): item is string => Boolean(item));

      if (failures.length > 0) {
        setFalhasCarga(failures);
        setErro(`Alguns blocos nao carregaram (${failures.length}).`);
      }
    } catch (error) {
      console.error(error);
      setErro(parseApiError(error, 'Nao foi possivel carregar o modulo de vendas.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarTudo();
  }, []);

  useEffect(() => {
    const caixaEmUso = caixas.find((caixa) => caixa.status?.toUpperCase() === 'ABERTO') || caixas[0] || null;
    if (!caixaEmUso) {
      setCaixaAberto(false);
      setSaldoCaixa(0);
      return;
    }

    const movimentosCaixaAtual = movimentos.filter((movimento) => (
      movimento.caixaId === caixaEmUso.id || movimento.caixa?.id === caixaEmUso.id
    ));

    const saldoMovimentos = movimentosCaixaAtual.reduce((total, movimento) => {
      const valor = Number(movimento.valor || 0);
      const tipo = (movimento.tipo || '').toUpperCase();
      if (['SANGRIA', 'RETIRADA', 'DESPESA'].includes(tipo)) return total - valor;
      return total + valor;
    }, 0);

    setCaixaAberto(caixaEmUso.status?.toUpperCase() === 'ABERTO');
    setSaldoCaixa(Number(caixaEmUso.saldoFinal ?? caixaEmUso.saldoInicial ?? 0) + saldoMovimentos);
  }, [caixas, movimentos]);

  const produtosFiltrados = useMemo(() => {
    const agora = new Date();
    const promoPorProduto = new Map<string, number>();

    for (const lista of listasPreco) {
      for (const item of lista.itens || []) {
        if (!item.produtoId || typeof item.promocional !== 'number' || item.promocional <= 0) continue;

        const inicio = item.inicio ? new Date(item.inicio) : null;
        const fim = item.fim ? new Date(item.fim) : null;
        const dentroDaVigencia = (!inicio || inicio <= agora) && (!fim || fim >= agora);
        if (!dentroDaVigencia) continue;

        promoPorProduto.set(item.produtoId, item.promocional);
      }
    }

    const diferencaDias = (dataIso?: string) => {
      if (!dataIso) return Number.POSITIVE_INFINITY;
      const dataValidade = new Date(dataIso);
      if (Number.isNaN(dataValidade.getTime())) return Number.POSITIVE_INFINITY;
      const diffMs = dataValidade.getTime() - agora.getTime();
      return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    };

    const termo = buscaProduto.toLowerCase();
    return produtos
      .filter((produto) => (
        produto.nome.toLowerCase().includes(termo)
        || produto.codigo?.toLowerCase().includes(termo)
        || produto.codigoBarras?.includes(buscaProduto)
      ))
      .sort((a, b) => {
        const aPromo = promoPorProduto.get(a.id) ?? null;
        const bPromo = promoPorProduto.get(b.id) ?? null;
        const aTemPromo = aPromo !== null;
        const bTemPromo = bPromo !== null;
        if (aTemPromo !== bTemPromo) return aTemPromo ? -1 : 1;

        const aDias = diferencaDias(a.validade);
        const bDias = diferencaDias(b.validade);
        const aValidadeCurta = aDias >= 0 && aDias <= DIAS_VALIDADE_CURTA;
        const bValidadeCurta = bDias >= 0 && bDias <= DIAS_VALIDADE_CURTA;
        if (aValidadeCurta !== bValidadeCurta) return aValidadeCurta ? -1 : 1;

        if (aTemPromo && bTemPromo && aPromo !== bPromo) return Number(aPromo) - Number(bPromo);
        if (aDias !== bDias) return aDias - bDias;
        return a.nome.localeCompare(b.nome);
      })
      .map((produto) => {
        const precoPromocional = promoPorProduto.get(produto.id);
        if (typeof precoPromocional === 'number' && precoPromocional > 0) {
          return { ...produto, preco: Number(precoPromocional), precoOriginal: Number(produto.preco) };
        }
        return produto;
      });
  }, [produtos, buscaProduto, listasPreco]);

  const totalCarrinho = useMemo(
    () => carrinho.reduce((total, item) => total + item.produto.preco * item.quantidade - item.desconto, 0),
    [carrinho],
  );

  const formasPagamentoPDV = ['PIX', 'DINHEIRO', 'CREDITO', 'DEBITO', 'BOLETO', 'CREDIARIO', 'LINK_PAGAMENTO'];

  const formaCartao = formaSelecionada === 'CREDITO' || formaSelecionada === 'DEBITO';

  const dashboardPDV = useMemo(() => {
    const ultimasVendas = vendas.slice(0, 15);
    const volume = ultimasVendas.reduce((acc, venda) => acc + Number(venda.total || 0), 0);
    const itensNoCarrinho = carrinho.reduce((acc, item) => acc + Number(item.quantidade || 0), 0);
    return {
      pedidosDia: ultimasVendas.length,
      volume,
      itensNoCarrinho,
      ticketMedio: ultimasVendas.length ? volume / ultimasVendas.length : 0,
    };
  }, [vendas, carrinho]);

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
    const quantidadeAdicionada = 1;
    setCarrinho((atual) => {
      const existente = atual.find((item) => item.produto.id === produto.id);
      if (!existente) {
        return [...atual, { produto, quantidade: quantidadeAdicionada, desconto: 0 }];
      }
      return atual.map((item) => (
        item.produto.id === produto.id ? { ...item, quantidade: item.quantidade + quantidadeAdicionada } : item
      ));
    });

    setUltimaAdicao({ nome: produto.nome, quantidade: quantidadeAdicionada, valor: Number(produto.preco || 0) });
    setUltimosItensAdicionados((atual) => [
      { produtoId: produto.id, nome: produto.nome, quantidade: quantidadeAdicionada, valor: Number(produto.preco || 0) },
      ...atual.filter((item) => item.produtoId !== produto.id),
    ].slice(0, 6));
    try {
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioCtor();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = 880;
        gain.gain.value = 0.02;
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.08);
      }
    } catch {
      // feedback visual continua funcionando mesmo sem audio
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(20);
    }
  };

  const adicionarAoCarrinhoQuantidade = (produto: Produto, quantidade: number) => {
    const quantidadeAdicionada = Math.max(1, Number(quantidade) || 1);
    setCarrinho((atual) => {
      const existente = atual.find((item) => item.produto.id === produto.id);
      if (!existente) {
        return [...atual, { produto, quantidade: quantidadeAdicionada, desconto: 0 }];
      }
      return atual.map((item) => (
        item.produto.id === produto.id ? { ...item, quantidade: item.quantidade + quantidadeAdicionada } : item
      ));
    });

    setUltimaAdicao({ nome: produto.nome, quantidade: quantidadeAdicionada, valor: Number(produto.preco || 0) });
    setUltimosItensAdicionados((atual) => [
      { produtoId: produto.id, nome: produto.nome, quantidade: quantidadeAdicionada, valor: Number(produto.preco || 0) },
      ...atual.filter((item) => item.produtoId !== produto.id),
    ].slice(0, 6));
    try {
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioCtor();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = 'triangle';
        oscillator.frequency.value = 660;
        gain.gain.value = 0.02;
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.07);
      }
    } catch {
      // feedback visual continua funcionando mesmo sem audio
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(15);
    }
  };

  const atualizarQuantidadeCarrinho = (produtoId: string, quantidade: number) => {
    const quantidadeValida = Math.max(1, Number(quantidade) || 1);
    setCarrinho((atual) => atual.map((row) => (
      row.produto.id === produtoId ? { ...row, quantidade: quantidadeValida } : row
    )));
  };

  const adicionarPorCodigoBarras = () => {
    const bruto = codigoBarrasRapido.trim();
    const partes = bruto.match(/^(.+?)(?:[x\*](\d+))?$/i);
    const codigo = (partes?.[1] || bruto).trim();
    const quantidade = Math.max(1, Number(partes?.[2] || 1) || 1);
    if (!codigo) return;

    const produto = produtos.find((item) => (
      (item.codigoBarras && item.codigoBarras === codigo)
      || (item.codigo && item.codigo === codigo)
    ));

    if (!produto) {
      alert(`Nenhum produto encontrado para o codigo ${codigo}.`);
      return;
    }

    adicionarAoCarrinhoQuantidade(produto, quantidade);
    setCodigoBarrasRapido('');
    codigoBarrasRef.current?.focus();
  };

  const repetirUltimoItem = (produtoId: string) => {
    const produto = produtos.find((item) => item.id === produtoId);
    if (!produto) return;
    adicionarAoCarrinho(produto);
  };

  const buscarCliente = async () => {
    const termo = buscaCliente.trim();
    if (!termo) return;

    const somenteDigitos = termo.replace(/\D/g, '');
    const params = new URLSearchParams();

    if (termo.includes('@')) {
      params.set('email', termo);
    } else if (somenteDigitos.length >= 8) {
      params.set('telefone', somenteDigitos);
    } else {
      params.set('nome', termo);
    }

    try {
      const cliente = await api.get(`/vendas/clientes/buscar?${params.toString()}`, token);
      setClienteSelecionado(cliente || null);
    } catch (error) {
      console.error(error);
      alert(parseApiError(error, 'Cliente nao encontrado.'));
    }
  };

  const criarClienteRapido = async () => {
    const nome = novoClienteRapido.nome.trim();
    const telefone = novoClienteRapido.telefone.trim();
    const email = novoClienteRapido.email.trim();

    if (!nome) {
      alert('Informe o nome do cliente.');
      return;
    }

    try {
      setSalvandoClienteRapido(true);
      const clienteCriado = await api.post('/vendas/clientes', {
        nome,
        telefone: telefone || undefined,
        email: email || undefined,
      }, token);

      setClienteSelecionado(clienteCriado || null);
      setBuscaCliente(clienteCriado?.nome || nome);
      setNovoClienteRapido({ nome: '', telefone: '', email: '' });
      setCriandoClienteRapido(false);
    } catch (error) {
      console.error(error);
      alert(parseApiError(error, 'Nao foi possivel cadastrar cliente no PDV.'));
    } finally {
      setSalvandoClienteRapido(false);
    }
  };

  const caixaAtual = useMemo(() => caixas.find((caixa) => caixa.status?.toUpperCase() === 'ABERTO') || caixas[0] || null, [caixas]);

  const totalAbertura = useMemo(() => calcularTotalContagem(contagemAbertura), [contagemAbertura]);
  const totalFechamento = useMemo(() => calcularTotalContagem(contagemFechamento), [contagemFechamento]);
  const totalSuprimento = useMemo(() => calcularTotalContagem(contagemSuprimento), [contagemSuprimento]);

  const temContagem = (contagem: Record<string, string>) => Object.values(contagem).some((valor) => Number(valor || 0) > 0);

  const limparModalCaixa = () => {
    setOperacaoCaixa(null);
    setValorOperacao('');
    setDescricaoOperacao('');
    setDetalhesOperacao({ ...defaultDetalhesOperacao });
    setContagemAbertura(criarContagemInicial());
    setContagemFechamento(criarContagemInicial());
    setContagemSuprimento(criarContagemInicial());
  };

  const abrirCaixa = async (saldoInicial: number) => {
    if (caixaAberto) return;

    try {
      const caixa = await api.post('/vendas/caixas', {
        terminal: 'PDV-01',
        loja: 'Loja Principal',
        turno: 'COMERCIAL',
        saldoInicial,
        metadata: {
          observacao: descricaoOperacao || undefined,
          contagem: contagemAbertura,
          audit: {
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
            registradoEm: new Date().toISOString(),
          },
        },
      }, token);

      setCaixaAberto(true);
      setSaldoCaixa(Number(caixa?.saldoInicial || 0));
      limparModalCaixa();
      await carregarTudo();
    } catch (error) {
      console.error(error);
      alert(parseApiError(error, 'Nao foi possivel abrir o caixa.'));
    }
  };

  const mapTipoMovimento = (operacao: CaixaOperacao) => {
    if (operacao === 'sangria') return 'SANGRIA';
    if (operacao === 'retirada') return 'RETIRADA';
    if (operacao === 'pagamento') return 'DESPESA';
    if (operacao === 'deposito') return 'TRANSFERENCIA';
    if (operacao === 'recebimento') return 'TRANSFERENCIA';
    return 'SUPRIMENTO';
  };

  const exigeAutorizacao = (operacao: CaixaOperacao, valor: number) => (
    ['sangria', 'retirada', 'pagamento'].includes(operacao) && valor >= 1000
  );

  const validarOperacao = (operacao: CaixaOperacao, valor: number) => {
    if (['sangria', 'deposito', 'retirada', 'pagamento', 'recebimento'].includes(operacao) && valor <= 0) {
      return 'Informe um valor valido para a operacao.';
    }

    if (operacao === 'sangria') {
      if (!detalhesOperacao.motivo.trim()) return 'Informe o motivo da sangria.';
      if (!detalhesOperacao.destino.trim()) return 'Informe o destino da sangria (cofre, tesouraria ou banco).';
    }

    if (operacao === 'deposito' && !detalhesOperacao.origem.trim()) {
      return 'Informe a origem do deposito.';
    }

    if (operacao === 'retirada') {
      if (!detalhesOperacao.motivo.trim()) return 'Informe o motivo da retirada.';
      if (!detalhesOperacao.categoria.trim()) return 'Informe a categoria financeira da retirada.';
      if (!detalhesOperacao.favorecido.trim()) return 'Informe o favorecido da retirada.';
    }

    if (operacao === 'pagamento') {
      if (!detalhesOperacao.categoria.trim()) return 'Informe a categoria do pagamento.';
      if (!detalhesOperacao.favorecido.trim()) return 'Informe o favorecido do pagamento.';
      if (!detalhesOperacao.forma.trim()) return 'Informe a forma de pagamento.';
    }

    if (operacao === 'recebimento') {
      if (!detalhesOperacao.forma.trim()) return 'Informe a forma de recebimento.';
      if (!detalhesOperacao.referencia.trim()) return 'Informe a referencia do recebimento (cliente/parcela/documento).';
    }

    if (operacao === 'suprimento') {
      if (!detalhesOperacao.origem.trim()) return 'Informe a origem do suprimento.';
      if (!temContagem(contagemSuprimento)) return 'Informe a contagem de moedas/notas para o suprimento.';
    }

    if (exigeAutorizacao(operacao, valor) && !detalhesOperacao.autorizadoPor.trim()) {
      return 'Operacao acima do limite exige aprovacao. Informe quem autorizou.';
    }

    return null;
  };

  const confirmarOperacaoCaixa = async () => {
    if (!operacaoCaixa) return;

    if (operacaoCaixa === 'abrir') {
      if (!temContagem(contagemAbertura)) {
        alert('Informe a contagem inicial de moedas e notas para abrir o caixa.');
        return;
      }

      await abrirCaixa(totalAbertura);
      return;
    }

    if (operacaoCaixa === 'fechar') {
      if (!caixaAtual?.id) {
        alert('Nenhum caixa aberto para fechamento.');
        return;
      }

      if (!temContagem(contagemFechamento)) {
        alert('Informe a contagem final completa para fechar o caixa.');
        return;
      }

      try {
        const payload = {
          observacao: descricaoOperacao || undefined,
          saldoInformado: Number(totalFechamento.toFixed(2)),
          metadata: {
            contagemFinal: contagemFechamento,
            autorizadoPor: detalhesOperacao.autorizadoPor || undefined,
          },
        };
        const fechamento = await api.post(`/vendas/caixas/${caixaAtual.id}/fechar`, payload, token);
        setResumoFechamento(fechamento?.resumo || null);
        setModalAberto('resumo-fechamento');
        setCaixaAberto(false);
        limparModalCaixa();
        await carregarTudo();
      } catch (error) {
        console.error(error);
        alert(parseApiError(error, 'Nao foi possivel fechar o caixa.'));
      }
      return;
    }

    const valor = operacaoCaixa === 'suprimento' ? Number(totalSuprimento.toFixed(2)) : Number(valorOperacao);
    const erroValidacao = validarOperacao(operacaoCaixa, valor);
    if (erroValidacao) {
      alert(erroValidacao);
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
        descricao: descricaoOperacao || detalhesOperacao.motivo || `${operacaoCaixa} via PDV`,
        metadata: {
          operacao: operacaoCaixa,
          origem: detalhesOperacao.origem || undefined,
          destino: detalhesOperacao.destino || undefined,
          categoria: detalhesOperacao.categoria || undefined,
          favorecido: detalhesOperacao.favorecido || undefined,
          forma: detalhesOperacao.forma || undefined,
          referencia: detalhesOperacao.referencia || undefined,
          autorizadoPor: detalhesOperacao.autorizadoPor || undefined,
          comprovante: detalhesOperacao.comprovante || undefined,
          contagem: operacaoCaixa === 'suprimento' ? contagemSuprimento : undefined,
          audit: {
            registradoEm: new Date().toISOString(),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          },
        },
      }, token);

      const somaOperacao = ['deposito', 'recebimento', 'suprimento'].includes(operacaoCaixa);
      setSaldoCaixa((current) => (somaOperacao ? current + valor : current - valor));
      limparModalCaixa();
      await carregarTudo();
    } catch (error) {
      console.error(error);
      alert(parseApiError(error, 'Nao foi possivel concluir a operacao de caixa.'));
    }
  };

  const atualizarContagem = (
    setter: React.Dispatch<React.SetStateAction<Record<string, string>>>,
    chave: number,
    valor: string,
  ) => {
    const somenteDigitos = valor.replace(/[^0-9]/g, '');
    setter((atual) => ({ ...atual, [String(chave)]: somenteDigitos }));
  };

  const renderContagemDinheiro = (
    contagem: Record<string, string>,
    setter: React.Dispatch<React.SetStateAction<Record<string, string>>>,
    total: number,
    titulo: string,
  ) => (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ fontSize: 11, color: '#647674', fontWeight: 700 }}>{titulo}</div>
      <div style={{ maxHeight: 190, overflow: 'auto', border: '1px solid #d9e2e1', borderRadius: 6, padding: 8, background: '#f8faf9' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#243332', marginBottom: 6 }}>Moedas</div>
        {MOEDAS_BR.map((valor) => {
          const quantidade = Number(contagem[String(valor)] || 0);
          const subtotal = quantidade * valor;
          return (
            <div key={`moeda-${valor}`} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 90px', gap: 6, alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11 }}>{formatarDenominacao(valor)}</span>
              <input
                type="text"
                value={contagem[String(valor)] || ''}
                onChange={(event) => atualizarContagem(setter, valor, event.target.value)}
                style={{ ...input, height: 30, fontSize: 11 }}
                placeholder="Qtd"
              />
              <strong style={{ fontSize: 11, textAlign: 'right', color: '#2f6f73' }}>{money(subtotal)}</strong>
            </div>
          );
        })}
        <div style={{ fontSize: 10, fontWeight: 700, color: '#243332', margin: '8px 0 6px' }}>Notas</div>
        {NOTAS_BR.map((valor) => {
          const quantidade = Number(contagem[String(valor)] || 0);
          const subtotal = quantidade * valor;
          return (
            <div key={`nota-${valor}`} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 90px', gap: 6, alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11 }}>{formatarDenominacao(valor)}</span>
              <input
                type="text"
                value={contagem[String(valor)] || ''}
                onChange={(event) => atualizarContagem(setter, valor, event.target.value)}
                style={{ ...input, height: 30, fontSize: 11 }}
                placeholder="Qtd"
              />
              <strong style={{ fontSize: 11, textAlign: 'right', color: '#2f6f73' }}>{money(subtotal)}</strong>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#eef4f4', border: '1px solid #d9e2e1', borderRadius: 6, padding: '8px 10px' }}>
        <span style={{ fontSize: 11, color: '#647674' }}>Total contado</span>
        <strong style={{ color: '#2f6f73' }}>{money(total)}</strong>
      </div>
    </div>
  );

  const tituloOperacaoCaixa = (operacao: CaixaOperacao) => {
    if (operacao === 'abrir') return '🔓 Abrir Caixa';
    if (operacao === 'sangria') return '🩸 Sangria';
    if (operacao === 'deposito') return '💰 Deposito';
    if (operacao === 'retirada') return '💸 Retirada';
    if (operacao === 'pagamento') return '💳 Pagamento';
    if (operacao === 'recebimento') return '✓ Recebimento';
    if (operacao === 'suprimento') return '📦 Suprimento';
    return '🔒 Fechamento de Caixa';
  };

  const limparPagamentoPDV = () => {
    setFormaSelecionada('PIX');
    setBandeiraCartao('VISA');
    setAdquirenteCartao('MERCADO PAGO');
    setParcelasCartao(1);
    setEmitirNfceNaVenda(Boolean(config.nfeAutomatica));
    setClienteDocumentoNfce('');
    setValorPago(totalCarrinho.toFixed(2));
    setComprovantePagamento('');
    setPagamentoComprovado(false);
  };

  const abrirPagamentoPDV = () => {
    if (carrinho.length === 0) {
      alert('Adicione ao menos um item no carrinho.');
      return;
    }

    if (!caixaAberto) {
      alert('Abra o caixa antes de finalizar a venda.');
      return;
    }

    limparPagamentoPDV();
    setModalAberto('confirmar-pagamento');
  };

  useEffect(() => {
    if (active !== 'ponto-venda') return;
    const timer = window.setTimeout(() => {
      buscaProdutoRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [active]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (active !== 'ponto-venda') return;
      if (event.key === 'F8') {
        event.preventDefault();
        codigoBarrasRef.current?.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active]);

  const finalizarVenda = async () => {
    if (finalizandoVenda) return;

    const valorInformado = Number(valorPago || 0);
    if (Number.isNaN(valorInformado) || valorInformado < totalCarrinho) {
      alert('O valor pago deve ser igual ou maior que o total da venda.');
      return;
    }

    if (!pagamentoComprovado) {
      alert('Comprove o pagamento antes de finalizar a venda.');
      return;
    }

    if (formaSelecionada !== 'DINHEIRO' && !comprovantePagamento.trim()) {
      alert('Informe o comprovante/protocolo para esta forma de pagamento.');
      return;
    }

    if (formaCartao && !bandeiraCartao.trim()) {
      alert('Informe a bandeira do cartao para continuar.');
      return;
    }

    try {
      setFinalizandoVenda(true);
      const vendaCriada = await api.post('/vendas/vendas', {
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
        pagamentos: [{
          forma: formaSelecionada as any,
          valor: totalCarrinho,
          parcelas: formaSelecionada === 'CREDITO' ? parcelasCartao : 1,
          gateway: formaCartao ? adquirenteCartao : undefined,
          nsu: comprovantePagamento.trim() || undefined,
          autorizacao: comprovantePagamento.trim() || undefined,
          metadata: {
            comprovadoNoPdv: true,
            bandeira: formaCartao ? bandeiraCartao : undefined,
            adquirente: formaCartao ? adquirenteCartao : undefined,
            modalidade: formaCartao ? 'CARTAO' : formaSelecionada,
          },
        }],
        observacoes: comprovantePagamento.trim()
          ? `Pagamento comprovado no PDV. Referencia: ${comprovantePagamento.trim()}`
          : 'Pagamento comprovado no PDV.',
      }, token);

      if (emitirNfceNaVenda && vendaCriada?.id) {
        try {
          await api.post(`/vendas/vendas/${vendaCriada.id}/emitir-nfce`, {
            clienteNome: clienteSelecionado?.nome || undefined,
            clienteDocumento: clienteDocumentoNfce.trim() || undefined,
            ambiente: 'HOMOLOGACAO',
            observacoes: 'Emissao solicitada no fechamento do PDV.',
          }, token);
        } catch (nfceError) {
          console.error(nfceError);
          alert('Venda concluida, mas houve falha na emissao da NFC-e. Tente emitir pelo modulo fiscal.');
        }
      }

      setCarrinho([]);
      setBuscaCliente('');
      setClienteSelecionado(null);
      setModalAberto(null);
      await carregarTudo();
    } catch (error) {
      console.error(error);
      alert(parseApiError(error, 'Falha ao finalizar venda.'));
    } finally {
      setFinalizandoVenda(false);
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

  // Funções para operações avançadas
  const exportarDados = async (formato: 'csv' | 'pdf') => {
    setExportando(true);
    try {
      const dados = active === 'minhas-vendas' ? vendas : 
                    active === 'movimentos-caixa' ? movimentos : 
                    active === 'ranking-clientes' ? ranking : 
                    active === 'modelo-demonstrativo' ? [demonstrativo] : [];
      
      if (formato === 'csv') {
        const csv = convertToCSV(dados);
        downloadFile(csv, `${active}.csv`, 'text/csv');
      } else if (formato === 'pdf') {
        const html = gerarRelatorioHTML();
        downloadFile(html, `${active}.html`, 'text/html');
        alert(`Relatório exportado como HTML. Abra no navegador e pressione Ctrl+P para salvar como PDF.`);
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao exportar dados.');
    } finally {
      setExportando(false);
    }
  };

  const gerarRelatorioHTML = () => {
    const titulo = active === 'modelo-demonstrativo' ? 'Demonstrativo de Vendas' :
                   active === 'ranking-clientes' ? 'Ranking de Clientes' :
                   active === 'minhas-vendas' ? 'Minhas Vendas' :
                   active === 'movimentos-caixa' ? 'Movimentos de Caixa' : 'Relatório';

    const tdStyle = 'padding:8px; border:1px solid #ddd;';
    let linhasTabela = '';
    
    if (active === 'modelo-demonstrativo' && demonstrativo) {
      linhasTabela = `
        <tr><td style="${tdStyle}">Receita</td><td style="${tdStyle}; text-align:right;">${money(demonstrativo.receita)}</td></tr>
        <tr><td style="${tdStyle}">Lucro</td><td style="${tdStyle}; text-align:right;">${money(demonstrativo.lucro)}</td></tr>
        <tr><td style="${tdStyle}">Margem</td><td style="${tdStyle}; text-align:right;">${demonstrativo.margem.toFixed(2)}%</td></tr>
        <tr><td style="${tdStyle}">Descontos</td><td style="${tdStyle}; text-align:right;">${money(demonstrativo.descontoTotal)}</td></tr>
        <tr><td style="${tdStyle}">Frete</td><td style="${tdStyle}; text-align:right;">${money(demonstrativo.freteTotal)}</td></tr>
      `;
    }

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>${titulo}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          h1 { color: #2f6f73; border-bottom: 2px solid #2f6f73; padding-bottom: 10px; }
          p { color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #2f6f73; color: white; padding: 10px; text-align: left; }
          td { padding: 8px; border: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .footer { margin-top: 40px; padding-top: 10px; border-top: 1px solid #ddd; color: #999; font-size: 12px; text-align: center; }
        </style>
      </head>
      <body>
        <h1>${titulo}</h1>
        <p>Gerado em ${new Date().toLocaleString('pt-BR')}</p>
        ${filtroData.inicio || filtroData.fim ? `<p>Período: ${filtroData.inicio || 'início'} a ${filtroData.fim || 'hoje'}</p>` : ''}
        <table>
          <thead>
            <tr><th>Descrição</th><th>Valor</th></tr>
          </thead>
          <tbody>
            ${linhasTabela}
          </tbody>
        </table>
        <div class="footer">
          <p>Relatório do Sistema de Vendas - SalesMind</p>
        </div>
      </body>
      </html>
    `;
  };

  const convertToCSV = (data: any[]) => {
    if (!data.length) return '';
    const keys = Object.keys(data[0]);
    const headers = keys.join(',');
    const rows = data.map(row => keys.map(key => JSON.stringify(row[key])).join(','));
    return [headers, ...rows].join('\n');
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const element = document.createElement('a');
    element.setAttribute('href', `data:${type};charset=utf-8,${encodeURIComponent(content)}`);
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const criarListaPreco = async () => {
    if (!novaLista.nome) {
      alert('Informe o nome da lista de preço');
      return;
    }
    try {
      await api.post('/vendas/listas-preco', novaLista, token);
      setNovaLista({ nome: '', tipo: 'VAREJO', margemMinima: 10, markupPadrao: 30 });
      setModalAberto(null);
      await carregarTudo();
    } catch (error) {
      console.error(error);
      alert('Erro ao criar lista de preço');
    }
  };

  const atualizarListaPreco = async (id: string, dados: any) => {
    try {
      await api.put(`/vendas/listas-preco/${id}`, dados, token);
      setModalAberto(null);
      await carregarTudo();
    } catch (error) {
      console.error(error);
      alert('Erro ao atualizar lista de preço');
    }
  };

  const deletarListaPreco = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja deletar esta lista de preço?')) return;
    try {
      await api.delete(`/vendas/listas-preco/${id}`, token);
      await carregarTudo();
    } catch (error) {
      console.error(error);
      alert('Erro ao deletar lista de preço');
    }
  };

  const criarFormaRecebimento = async () => {
    if (!novaForma.nome) {
      alert('Informe o nome da forma de recebimento');
      return;
    }
    try {
      await api.post('/vendas/formas-recebimento', novaForma, token);
      setNovaForma({ nome: '', tipo: 'PIX', taxaPercentual: 0, taxaFixa: 0, prazoRecebimentoDias: 0, permiteParcelamento: false, permiteAntecipacao: false });
      setModalAberto(null);
      await carregarTudo();
    } catch (error) {
      console.error(error);
      alert('Erro ao criar forma de recebimento');
    }
  };

  const atualizarFormaRecebimento = async (id: string, dados: any) => {
    try {
      await api.put(`/vendas/formas-recebimento/${id}`, dados, token);
      setModalAberto(null);
      await carregarTudo();
    } catch (error) {
      console.error(error);
      alert('Erro ao atualizar forma de recebimento');
    }
  };

  const criarOrcamento = async () => {
    if (!novoOrcamento.titulo) {
      alert('Informe o título do orçamento');
      return;
    }
    try {
      await api.post('/vendas/orcamentos', novoOrcamento, token);
      setNovoOrcamento({ titulo: '', clienteId: '', itens: [] });
      setModalAberto(null);
      await carregarTudo();
    } catch (error) {
      console.error(error);
      alert('Erro ao criar orçamento');
    }
  };

  const converterOrcamentoParaVenda = async (id: string) => {
    try {
      await api.post(`/vendas/orcamentos/${id}/converter`, {}, token);
      alert('Orçamento convertido em venda com sucesso');
      await carregarTudo();
    } catch (error) {
      console.error(error);
      alert('Erro ao converter orçamento');
    }
  };

  const enviarOrcamentoPorEmail = async (id: string, email: string) => {
    try {
      await api.post(`/vendas/orcamentos/${id}/enviar-email`, { email }, token);
      alert('Orçamento enviado por email');
    } catch (error) {
      console.error(error);
      alert('Erro ao enviar orçamento por email');
    }
  };

  const registrarPagamento = async (recebimentoId: string, valor: number) => {
    try {
      await api.post(`/vendas/recebimentos/${recebimentoId}/pagamento`, { valor }, token);
      alert('Pagamento registrado com sucesso');
      await carregarTudo();
    } catch (error) {
      console.error(error);
      alert('Erro ao registrar pagamento');
    }
  };

  const renovarPacote = async (vendaId: string) => {
    try {
      await api.post(`/vendas/pacotes/${vendaId}/renovar`, {}, token);
      alert('Pacote renovado com sucesso');
      await carregarTudo();
    } catch (error) {
      console.error(error);
      alert('Erro ao renovar pacote');
    }
  };

  const cancelarPacote = async (vendaId: string) => {
    if (!window.confirm('Tem certeza que deseja cancelar este pacote?')) return;
    try {
      await api.post(`/vendas/pacotes/${vendaId}/cancelar`, {}, token);
      alert('Pacote cancelado com sucesso');
      await carregarTudo();
    } catch (error) {
      console.error(error);
      alert('Erro ao cancelar pacote');
    }
  };

  const filtrarPorData = (items: any[], dataField: string) => {
    if (!filtroData.inicio && !filtroData.fim) return items;
    return items.filter(item => {
      const data = new Date(item[dataField]);
      const inicio = filtroData.inicio ? new Date(filtroData.inicio) : new Date('1900-01-01');
      const fim = filtroData.fim ? new Date(filtroData.fim) : new Date('2100-12-31');
      return data >= inicio && data <= fim;
    });
  };

  const filtrarPorCliente = (items: any[]) => {
    if (!filtroCliente) return items;
    return items.filter(item => 
      (item.cliente?.nome || item.cliente || '').toLowerCase().includes(filtroCliente.toLowerCase())
    );
  };

  const filtrarPorStatus = (items: any[]) => {
    if (filtroStatus === 'TODOS') return items;
    return items.filter(item => (item.status || '').toUpperCase() === filtroStatus);
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
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: isMobileViewport ? '1fr' : '1.2fr 1.15fr 0.95fr',
            gap: 14,
            alignItems: 'start',
            minHeight: isMobileViewport ? 'auto' : 600,
          }}
        >
          {/* COLUNA 1: PRODUTOS */}
          <div style={{ ...panel, padding: 12, display: 'grid', gridTemplateRows: 'auto 1fr', gap: 10 }}>
            <div>
              <h3 style={{ margin: '0 0 8px', fontSize: 13 }}>Produtos e Serviços</h3>
              <div style={{ color: '#647674', fontSize: 10, marginBottom: 8 }}>
                Ordem inteligente: promocoes primeiro, depois itens com validade curta.
              </div>
              <input
                ref={buscaProdutoRef}
                value={buscaProduto}
                onChange={(event) => setBuscaProduto(event.target.value)}
                placeholder="Pesquisar por nome, código ou código de barras"
                style={{...input, height: 34, fontSize: 12}}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 6, marginTop: 6 }}>
                <input
                  ref={codigoBarrasRef}
                  value={codigoBarrasRapido}
                  onChange={(event) => setCodigoBarrasRapido(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      adicionarPorCodigoBarras();
                    }
                  }}
                  placeholder="Leitor / codigo de barras (Enter)"
                  style={{ ...input, height: 32, fontSize: 11 }}
                />
                <button onClick={adicionarPorCodigoBarras} style={{ ...buttonSecondary, height: 32, fontSize: 11 }}>
                  Adicionar
                </button>
              </div>
              <div style={{ color: '#8a9b99', fontSize: 10, marginTop: 4 }}>Atalho rapido: F8 foca no campo de leitor.</div>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                      <strong style={{ fontSize: 11, display: 'block', marginBottom: 3 }}>{produto.nome.substring(0, 20)}</strong>
                      {produto.precoOriginal && (
                        <span style={{ background: '#ffe8cc', color: '#9a5a14', borderRadius: 999, padding: '2px 6px', fontSize: 9, fontWeight: 700 }}>
                          Promo
                        </span>
                      )}
                    </div>
                    <div style={{ color: '#647674', fontSize: 10, marginBottom: 4 }}>
                      Est: {produto.estoqueDisponivel ?? produto.estoque}
                    </div>
                    {produto.validade && (
                      <div style={{ color: '#8a9b99', fontSize: 9, marginBottom: 4 }}>
                        Validade: {new Date(produto.validade).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                    <div style={{ color: '#2f6f73', fontWeight: 800, fontSize: 12 }}>{money(Number(produto.preco || 0))}</div>
                    {produto.precoOriginal && (
                      <div style={{ color: '#8a9b99', fontSize: 9, textDecoration: 'line-through' }}>
                        {money(Number(produto.precoOriginal || 0))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* COLUNA 2: CARRINHO E CLIENTE */}
          <div style={{ display: 'grid', gap: 10, gridTemplateRows: 'auto auto 1fr auto auto' }}>
            {/* Cliente */}
            {ultimaAdicao && (
              <div style={{ ...panel, padding: 10, background: '#ecf8f4', border: '1px solid #c7e7d9' }}>
                <div style={{ fontSize: 10, color: '#647674', marginBottom: 3 }}>Ultimo item adicionado</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                  <strong style={{ fontSize: 12, color: '#243332' }}>{ultimaAdicao.nome}</strong>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#2f6f73' }}>
                    x{ultimaAdicao.quantidade} {money(ultimaAdicao.valor)}
                  </span>
                </div>
              </div>
            )}

            <div style={{ ...panel, padding: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <h3 style={{ margin: 0, fontSize: 12, color: '#243332' }}>Cliente</h3>
                <button
                  onClick={() => {
                    setCriandoClienteRapido((atual) => !atual);
                    setNovoClienteRapido({ nome: '', telefone: '', email: '' });
                  }}
                  style={{ ...buttonSecondary, fontSize: 10, padding: '4px 8px', height: 24 }}
                >
                  {criandoClienteRapido ? 'Cancelar' : 'Novo cliente'}
                </button>
              </div>
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

              {criandoClienteRapido && (
                <div style={{ marginTop: 8, border: '1px solid #d9e2e1', borderRadius: 6, padding: 8, background: '#f8faf9', display: 'grid', gap: 6 }}>
                  <input
                    value={novoClienteRapido.nome}
                    onChange={(event) => setNovoClienteRapido((atual) => ({ ...atual, nome: event.target.value }))}
                    placeholder="Nome do cliente"
                    style={{ ...input, height: 30, fontSize: 11 }}
                  />
                  <input
                    value={novoClienteRapido.telefone}
                    onChange={(event) => setNovoClienteRapido((atual) => ({ ...atual, telefone: event.target.value }))}
                    placeholder="Telefone"
                    style={{ ...input, height: 30, fontSize: 11 }}
                  />
                  <input
                    value={novoClienteRapido.email}
                    onChange={(event) => setNovoClienteRapido((atual) => ({ ...atual, email: event.target.value }))}
                    placeholder="E-mail (opcional)"
                    style={{ ...input, height: 30, fontSize: 11 }}
                  />
                  <button
                    onClick={criarClienteRapido}
                    disabled={salvandoClienteRapido}
                    style={{ ...buttonPrimary, fontSize: 11, height: 30 }}
                  >
                    {salvandoClienteRapido ? 'Salvando...' : 'Salvar cliente'}
                  </button>
                </div>
              )}
            </div>

            {ultimosItensAdicionados.length > 0 && (
              <div style={{ ...panel, padding: 11 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ ...label, marginBottom: 0, fontSize: 11 }}>Repetir itens recentes</label>
                  <span style={{ fontSize: 10, color: '#8a9b99' }}>1 clique adiciona novamente</span>
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {ultimosItensAdicionados.map((item) => (
                    <button
                      key={item.produtoId}
                      onClick={() => repetirUltimoItem(item.produtoId)}
                      style={{ ...buttonSecondary, justifyContent: 'space-between', height: 34, fontSize: 11 }}
                    >
                      <span style={{ textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nome}</span>
                      <span style={{ fontWeight: 800 }}>+1</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ ...panel, padding: 11 }}>
              <label style={{...label, marginBottom: 5, fontSize: 11}}>Pagamento</label>
              <div style={{ color: '#647674', fontSize: 11 }}>
                A forma de pagamento e a comprovacao sao informadas no pop-up ao finalizar.
              </div>
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
                    <div key={item.produto.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 88px 50px 24px', gap: 5, alignItems: 'center', padding: 7, background: '#f8faf9', borderRadius: 5, fontSize: 10 }}>
                      <div style={{ color: '#2f6f73', fontWeight: 800, fontSize: 11 }}>●</div>
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ fontSize: 10, display: 'block' }}>{item.produto.nome.substring(0, 16)}</strong>
                        <div style={{ color: '#8a9b99', fontSize: 9 }}>{money(item.produto.preco)}</div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr 22px', gap: 4, alignItems: 'center' }}>
                        <button
                          onClick={() => atualizarQuantidadeCarrinho(item.produto.id, item.quantidade - 1)}
                          style={{ ...iconButton, width: 22, height: 22, fontSize: 11, padding: 0 }}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={item.quantidade}
                          onChange={(event) => atualizarQuantidadeCarrinho(item.produto.id, Number(event.target.value) || 1)}
                          style={{...input, height: 24, padding: '0 4px', fontSize: 10, textAlign: 'center'}}
                        />
                        <button
                          onClick={() => atualizarQuantidadeCarrinho(item.produto.id, item.quantidade + 1)}
                          style={{ ...iconButton, width: 22, height: 22, fontSize: 11, padding: 0 }}
                        >
                          +
                        </button>
                      </div>
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
                onClick={abrirPagamentoPDV}
                style={{ ...buttonPrimary, width: '100%', fontSize: 12, padding: '10px 0' }}
                disabled={carrinho.length === 0}
              >
                ✓ Finalizar venda e receber
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

            <div style={{ display: 'grid', gap: 5, gridTemplateColumns: 'repeat(2, 1fr)', gridAutoRows: 'max-content' }}>
              <div style={{ gridColumn: '1 / -1', border: '1px solid #d9e2e1', borderRadius: 6, padding: 8, background: '#f8faf9' }}>
                <div style={{ fontSize: 11, color: '#647674', marginBottom: 6, fontWeight: 700 }}>Dashboard rapido</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <div style={{ border: '1px solid #e0e8e7', borderRadius: 6, padding: 6, background: '#fff' }}>
                    <div style={{ fontSize: 10, color: '#647674' }}>Pedidos</div>
                    <strong style={{ fontSize: 14 }}>{dashboardPDV.pedidosDia}</strong>
                  </div>
                  <div style={{ border: '1px solid #e0e8e7', borderRadius: 6, padding: 6, background: '#fff' }}>
                    <div style={{ fontSize: 10, color: '#647674' }}>Ticket medio</div>
                    <strong style={{ fontSize: 12 }}>{money(dashboardPDV.ticketMedio)}</strong>
                  </div>
                  <div style={{ border: '1px solid #e0e8e7', borderRadius: 6, padding: 6, background: '#fff' }}>
                    <div style={{ fontSize: 10, color: '#647674' }}>Volume</div>
                    <strong style={{ fontSize: 12 }}>{money(dashboardPDV.volume)}</strong>
                  </div>
                  <div style={{ border: '1px solid #e0e8e7', borderRadius: 6, padding: 6, background: '#fff' }}>
                    <div style={{ fontSize: 10, color: '#647674' }}>Itens no carrinho</div>
                    <strong style={{ fontSize: 14 }}>{dashboardPDV.itensNoCarrinho}</strong>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setOperacaoCaixa('abrir')}
                style={{...buttonPrimary, fontSize: 10, padding: '7px 4px', height: 'auto', background: caixaAberto ? '#999' : '#2f6f73', opacity: caixaAberto ? 0.6 : 1}} 
                disabled={caixaAberto}
              >
                Abrir Caixa
              </button>
              <button 
                onClick={() => setOperacaoCaixa('sangria')} 
                style={{...buttonSecondary, fontSize: 10, padding: '7px 4px', height: 'auto'}} 
                disabled={!caixaAberto}
              >
                Sangria
              </button>
              <button 
                onClick={() => setOperacaoCaixa('deposito')} 
                style={{...buttonSecondary, fontSize: 10, padding: '7px 4px', height: 'auto'}} 
                disabled={!caixaAberto}
              >
                Depósito
              </button>
              <button 
                onClick={() => setOperacaoCaixa('retirada')} 
                style={{...buttonSecondary, fontSize: 10, padding: '7px 4px', height: 'auto'}} 
                disabled={!caixaAberto}
              >
                Retirada
              </button>
              <button 
                onClick={() => setOperacaoCaixa('recebimento')} 
                style={{...buttonSecondary, fontSize: 10, padding: '7px 4px', height: 'auto'}} 
                disabled={!caixaAberto}
              >
                Recebimento
              </button>
              <button 
                onClick={() => setOperacaoCaixa('pagamento')} 
                style={{...buttonSecondary, fontSize: 10, padding: '7px 4px', height: 'auto'}} 
                disabled={!caixaAberto}
              >
                Pagamento
              </button>
              <button 
                onClick={() => setOperacaoCaixa('suprimento')} 
                style={{...buttonSecondary, fontSize: 10, padding: '7px 4px', height: 'auto'}} 
                disabled={!caixaAberto}
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
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1001 }} onClick={limparModalCaixa}>
                <div style={{...panel, padding: 18, width: 'min(420px, 96vw)', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', maxHeight: '90vh', overflow: 'auto'}} onClick={e => e.stopPropagation()}>
                  <h3 style={{ margin: '0 0 12px', fontSize: 13 }}>{tituloOperacaoCaixa(operacaoCaixa)}</h3>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {!['abrir', 'fechar', 'suprimento'].includes(operacaoCaixa) && (
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
                    )}

                    {operacaoCaixa === 'abrir' && renderContagemDinheiro(contagemAbertura, setContagemAbertura, totalAbertura, 'Contagem inicial (fundo de caixa)')}
                    {operacaoCaixa === 'fechar' && renderContagemDinheiro(contagemFechamento, setContagemFechamento, totalFechamento, 'Contagem final para fechamento')}
                    {operacaoCaixa === 'suprimento' && renderContagemDinheiro(contagemSuprimento, setContagemSuprimento, totalSuprimento, 'Contagem de troco recebido')}

                    {operacaoCaixa === 'sangria' && (
                      <>
                        <div>
                          <label style={{...label, fontSize: 11, marginBottom: 5}}>Motivo</label>
                          <input type="text" value={detalhesOperacao.motivo} onChange={(e) => setDetalhesOperacao((atual) => ({ ...atual, motivo: e.target.value }))} style={{...input, height: 34, fontSize: 12}} placeholder="Ex: excesso de numerario" />
                        </div>
                        <div>
                          <label style={{...label, fontSize: 11, marginBottom: 5}}>Destino</label>
                          <select value={detalhesOperacao.destino} onChange={(e) => setDetalhesOperacao((atual) => ({ ...atual, destino: e.target.value }))} style={{...input, height: 34, fontSize: 12}}>
                            <option value="">Selecione</option>
                            <option value="COFRE">Cofre</option>
                            <option value="TESOURARIA">Tesouraria</option>
                            <option value="BANCO">Banco</option>
                          </select>
                        </div>
                      </>
                    )}

                    {operacaoCaixa === 'deposito' && (
                      <div>
                        <label style={{...label, fontSize: 11, marginBottom: 5}}>Origem</label>
                        <select value={detalhesOperacao.origem} onChange={(e) => setDetalhesOperacao((atual) => ({ ...atual, origem: e.target.value }))} style={{...input, height: 34, fontSize: 12}}>
                          <option value="">Selecione</option>
                          <option value="TESOURARIA">Tesouraria</option>
                          <option value="COFRE">Cofre</option>
                          <option value="BANCO">Banco</option>
                        </select>
                      </div>
                    )}

                    {operacaoCaixa === 'retirada' && (
                      <>
                        <div>
                          <label style={{...label, fontSize: 11, marginBottom: 5}}>Motivo</label>
                          <input type="text" value={detalhesOperacao.motivo} onChange={(e) => setDetalhesOperacao((atual) => ({ ...atual, motivo: e.target.value }))} style={{...input, height: 34, fontSize: 12}} placeholder="Ex: compra emergencial" />
                        </div>
                        <div>
                          <label style={{...label, fontSize: 11, marginBottom: 5}}>Categoria</label>
                          <input type="text" value={detalhesOperacao.categoria} onChange={(e) => setDetalhesOperacao((atual) => ({ ...atual, categoria: e.target.value }))} style={{...input, height: 34, fontSize: 12}} placeholder="Ex: despesa operacional" />
                        </div>
                        <div>
                          <label style={{...label, fontSize: 11, marginBottom: 5}}>Favorecido</label>
                          <input type="text" value={detalhesOperacao.favorecido} onChange={(e) => setDetalhesOperacao((atual) => ({ ...atual, favorecido: e.target.value }))} style={{...input, height: 34, fontSize: 12}} placeholder="Ex: fornecedor / motoboy" />
                        </div>
                      </>
                    )}

                    {operacaoCaixa === 'recebimento' && (
                      <>
                        <div>
                          <label style={{...label, fontSize: 11, marginBottom: 5}}>Forma</label>
                          <select value={detalhesOperacao.forma} onChange={(e) => setDetalhesOperacao((atual) => ({ ...atual, forma: e.target.value }))} style={{...input, height: 34, fontSize: 12}}>
                            <option value="DINHEIRO">Dinheiro</option>
                            <option value="PIX">PIX</option>
                            <option value="DEBITO">Debito</option>
                            <option value="CREDITO">Credito</option>
                            <option value="TRANSFERENCIA">Transferencia</option>
                          </select>
                        </div>
                        <div>
                          <label style={{...label, fontSize: 11, marginBottom: 5}}>Referencia</label>
                          <input type="text" value={detalhesOperacao.referencia} onChange={(e) => setDetalhesOperacao((atual) => ({ ...atual, referencia: e.target.value }))} style={{...input, height: 34, fontSize: 12}} placeholder="Ex: cliente, parcela, documento" />
                        </div>
                      </>
                    )}

                    {operacaoCaixa === 'pagamento' && (
                      <>
                        <div>
                          <label style={{...label, fontSize: 11, marginBottom: 5}}>Categoria</label>
                          <input type="text" value={detalhesOperacao.categoria} onChange={(e) => setDetalhesOperacao((atual) => ({ ...atual, categoria: e.target.value }))} style={{...input, height: 34, fontSize: 12}} placeholder="Ex: fornecedor / frete / despesa" />
                        </div>
                        <div>
                          <label style={{...label, fontSize: 11, marginBottom: 5}}>Favorecido</label>
                          <input type="text" value={detalhesOperacao.favorecido} onChange={(e) => setDetalhesOperacao((atual) => ({ ...atual, favorecido: e.target.value }))} style={{...input, height: 34, fontSize: 12}} placeholder="Nome do recebedor" />
                        </div>
                        <div>
                          <label style={{...label, fontSize: 11, marginBottom: 5}}>Forma</label>
                          <select value={detalhesOperacao.forma} onChange={(e) => setDetalhesOperacao((atual) => ({ ...atual, forma: e.target.value }))} style={{...input, height: 34, fontSize: 12}}>
                            <option value="DINHEIRO">Dinheiro</option>
                            <option value="PIX">PIX</option>
                            <option value="TRANSFERENCIA">Transferencia</option>
                            <option value="DEBITO">Debito</option>
                          </select>
                        </div>
                      </>
                    )}

                    {operacaoCaixa === 'suprimento' && (
                      <div>
                        <label style={{...label, fontSize: 11, marginBottom: 5}}>Origem</label>
                        <select value={detalhesOperacao.origem} onChange={(e) => setDetalhesOperacao((atual) => ({ ...atual, origem: e.target.value }))} style={{...input, height: 34, fontSize: 12}}>
                          <option value="">Selecione</option>
                          <option value="TESOURARIA">Tesouraria</option>
                          <option value="COFRE">Cofre</option>
                          <option value="BANCO">Banco</option>
                        </select>
                      </div>
                    )}

                    {['sangria', 'retirada', 'pagamento', 'fechar'].includes(operacaoCaixa) && (
                      <div>
                        <label style={{...label, fontSize: 11, marginBottom: 5}}>Autorizado por (quando aplicavel)</label>
                        <input type="text" value={detalhesOperacao.autorizadoPor} onChange={(e) => setDetalhesOperacao((atual) => ({ ...atual, autorizadoPor: e.target.value }))} style={{...input, height: 34, fontSize: 12}} placeholder="Supervisor/Gerente" />
                      </div>
                    )}

                    {['retirada', 'pagamento'].includes(operacaoCaixa) && (
                      <div>
                        <label style={{...label, fontSize: 11, marginBottom: 5}}>Comprovante (referencia)</label>
                        <input type="text" value={detalhesOperacao.comprovante} onChange={(e) => setDetalhesOperacao((atual) => ({ ...atual, comprovante: e.target.value }))} style={{...input, height: 34, fontSize: 12}} placeholder="Ex: NF 12345 / recibo" />
                      </div>
                    )}

                    <div>
                      <label style={{...label, fontSize: 11, marginBottom: 5}}>
                        {operacaoCaixa === 'fechar' ? 'Justificativa/Observacoes' : 'Observacoes'}
                      </label>
                      <textarea
                        value={descricaoOperacao}
                        onChange={(e) => setDescricaoOperacao(e.target.value)}
                        placeholder={operacaoCaixa === 'fechar' ? 'Ex: Divergencia de troco na troca de operador.' : 'Ex: detalhes operacionais e conferencias'}
                        style={{...input, minHeight: 70, fontFamily: 'inherit', resize: 'none', fontSize: 11}}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <button
                        onClick={confirmarOperacaoCaixa}
                        style={{...buttonPrimary, fontSize: 11}}
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={limparModalCaixa}
                        style={{...buttonSecondary, fontSize: 11}}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {modalAberto === 'resumo-fechamento' && resumoFechamento && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1002 }} onClick={() => setModalAberto(null)}>
                <div style={{ ...panel, width: 'min(760px, 96vw)', maxHeight: '90vh', overflow: 'auto', padding: 18 }} onClick={(event) => event.stopPropagation()}>
                  <h3 style={{ margin: '0 0 12px' }}>Resumo do Fechamento de Caixa</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                    <div style={{ ...panel, padding: 10 }}>
                      <div style={{ color: '#647674', fontSize: 11 }}>Saldo inicial</div>
                      <strong>{money(Number(resumoFechamento.totais.saldoInicial || 0))}</strong>
                    </div>
                    <div style={{ ...panel, padding: 10 }}>
                      <div style={{ color: '#647674', fontSize: 11 }}>Entradas</div>
                      <strong style={{ color: '#2f6f73' }}>{money(Number(resumoFechamento.totais.totalEntradas || 0))}</strong>
                    </div>
                    <div style={{ ...panel, padding: 10 }}>
                      <div style={{ color: '#647674', fontSize: 11 }}>Saidas</div>
                      <strong style={{ color: '#a64b4b' }}>{money(Number(resumoFechamento.totais.totalSaidas || 0))}</strong>
                    </div>
                    <div style={{ ...panel, padding: 10 }}>
                      <div style={{ color: '#647674', fontSize: 11 }}>Saldo final</div>
                      <strong>{money(Number(resumoFechamento.totais.saldoFinal || 0))}</strong>
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>Resumo por tipo</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
                      {Object.entries(resumoFechamento.resumoPorTipo || {}).map(([tipo, info]) => (
                        <div key={tipo} style={{ border: '1px solid #d9e2e1', borderRadius: 6, padding: 8, background: '#f8faf9' }}>
                          <div style={{ fontWeight: 700, fontSize: 12 }}>{tipo}</div>
                          <div style={{ color: '#647674', fontSize: 11 }}>{info.quantidade} movimentacao(oes)</div>
                          <div style={{ marginTop: 4, fontWeight: 700 }}>{money(Number(info.total || 0))}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={() => setModalAberto(null)} style={buttonPrimary}>Fechar resumo</button>
                  </div>
                </div>
              </div>
            )}

            {modalAberto === 'confirmar-pagamento' && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1003 }} onClick={() => !finalizandoVenda && setModalAberto(null)}>
                <div style={{ ...panel, width: 'min(560px, 96vw)', maxHeight: '90vh', overflow: 'auto', padding: 16 }} onClick={(event) => event.stopPropagation()}>
                  <h3 style={{ margin: '0 0 10px' }}>Confirmar pagamento da venda</h3>
                  <div style={{ fontSize: 12, color: '#647674', marginBottom: 10 }}>
                    Total a receber: <strong style={{ color: '#2f6f73' }}>{money(totalCarrinho)}</strong>
                  </div>

                  <div style={{ display: 'grid', gap: 10 }}>
                    <div>
                      <label style={{ ...label, fontSize: 11, marginBottom: 5 }}>Forma de pagamento</label>
                      <select value={formaSelecionada} onChange={(event) => setFormaSelecionada(event.target.value)} style={{ ...input, height: 34, fontSize: 12 }}>
                        {formasPagamentoPDV.map((forma) => (
                          <option key={forma} value={forma}>{forma}</option>
                        ))}
                      </select>
                    </div>

                    {formaCartao && (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <div>
                            <label style={{ ...label, fontSize: 11, marginBottom: 5 }}>Bandeira do cartao</label>
                            <select value={bandeiraCartao} onChange={(event) => setBandeiraCartao(event.target.value)} style={{ ...input, height: 34, fontSize: 12 }}>
                              {BANDEIRAS_CARTAO_BR.map((bandeira) => (
                                <option key={bandeira} value={bandeira}>{bandeira}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label style={{ ...label, fontSize: 11, marginBottom: 5 }}>Adquirente</label>
                            <select value={adquirenteCartao} onChange={(event) => setAdquirenteCartao(event.target.value)} style={{ ...input, height: 34, fontSize: 12 }}>
                              {ADQUIRENTES_BR.map((adquirente) => (
                                <option key={adquirente} value={adquirente}>{adquirente}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {formaSelecionada === 'CREDITO' && (
                          <div>
                            <label style={{ ...label, fontSize: 11, marginBottom: 5 }}>Parcelas</label>
                            <input
                              type="number"
                              min={1}
                              max={12}
                              value={parcelasCartao}
                              onChange={(event) => setParcelasCartao(Math.max(1, Math.min(12, Number(event.target.value) || 1)))}
                              style={{ ...input, height: 34, fontSize: 12 }}
                            />
                          </div>
                        )}
                      </>
                    )}

                    <div>
                      <label style={{ ...label, fontSize: 11, marginBottom: 5 }}>Valor pago</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={valorPago}
                        onChange={(event) => setValorPago(event.target.value)}
                        style={{ ...input, height: 34, fontSize: 12 }}
                        placeholder="0,00"
                      />
                    </div>

                    <div>
                      <label style={{ ...label, fontSize: 11, marginBottom: 5 }}>
                        Comprovante / protocolo {formaSelecionada === 'DINHEIRO' ? '(opcional)' : '(obrigatorio)'}
                      </label>
                      <input
                        type="text"
                        value={comprovantePagamento}
                        onChange={(event) => setComprovantePagamento(event.target.value)}
                        style={{ ...input, height: 34, fontSize: 12 }}
                        placeholder="Ex: NSU, TxId, autorizacao da maquininha"
                      />
                    </div>

                    <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#243332' }}>
                      <input
                        type="checkbox"
                        checked={pagamentoComprovado}
                        onChange={(event) => setPagamentoComprovado(event.target.checked)}
                      />
                      Confirmo que o pagamento foi comprovado.
                    </label>

                    <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#243332' }}>
                      <input
                        type="checkbox"
                        checked={emitirNfceNaVenda}
                        onChange={(event) => setEmitirNfceNaVenda(event.target.checked)}
                      />
                      Emitir nota fiscal (NFC-e) ao concluir a venda.
                    </label>

                    {emitirNfceNaVenda && (
                      <div>
                        <label style={{ ...label, fontSize: 11, marginBottom: 5 }}>CPF/CNPJ do consumidor (opcional)</label>
                        <input
                          type="text"
                          value={clienteDocumentoNfce}
                          onChange={(event) => setClienteDocumentoNfce(event.target.value)}
                          style={{ ...input, height: 34, fontSize: 12 }}
                          placeholder="Somente numeros"
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
                    <button onClick={finalizarVenda} style={{ ...buttonPrimary, fontSize: 12 }} disabled={finalizandoVenda}>
                      {finalizandoVenda ? 'Finalizando...' : 'Confirmar e finalizar'}
                    </button>
                    <button onClick={() => setModalAberto(null)} style={{ ...buttonSecondary, fontSize: 12 }} disabled={finalizandoVenda}>
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      );
    }

    if (active === 'minhas-vendas') {
      const vendaFiltrada = filtrarPorData(filtrarPorStatus(vendas), 'data');
      return (
        <section style={{ display: 'grid', gap: 14 }}>
          {/* Filtros */}
          <div style={{ ...panel, padding: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            <div>
              <label style={{...label, fontSize: 11, marginBottom: 5}}>De:</label>
              <input type="date" value={filtroData.inicio} onChange={(e) => setFiltroData({...filtroData, inicio: e.target.value})} style={{...input, height: 32, fontSize: 11}} />
            </div>
            <div>
              <label style={{...label, fontSize: 11, marginBottom: 5}}>Até:</label>
              <input type="date" value={filtroData.fim} onChange={(e) => setFiltroData({...filtroData, fim: e.target.value})} style={{...input, height: 32, fontSize: 11}} />
            </div>
            <div>
              <label style={{...label, fontSize: 11, marginBottom: 5}}>Status:</label>
              <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} style={{...input, height: 32, fontSize: 11}}>
                <option value="TODOS">TODOS</option>
                <option value="PAGO">PAGO</option>
                <option value="PENDENTE">PENDENTE</option>
                <option value="CANCELADO">CANCELADO</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end' }}>
              <button onClick={() => { setFiltroData({inicio: '', fim: ''}); setFiltroStatus('TODOS'); }} style={{...buttonSecondary, fontSize: 11, height: 32}}>Limpar filtros</button>
              <button onClick={() => exportarDados('csv')} style={{...buttonSecondary, fontSize: 11, height: 32}} disabled={exportando}>Exportar CSV</button>
            </div>
          </div>
          <TabelaVendas vendas={vendaFiltrada} />
        </section>
      );
    }
    if (active === 'consulta-vendas') {
      const vendaFiltrada = filtrarPorCliente(filtrarPorData(filtrarPorStatus(vendas), 'data'));
      return (
        <section style={{ display: 'grid', gap: 14 }}>
          {/* Busca avançada */}
          <div style={{ ...panel, padding: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            <div>
              <label style={{...label, fontSize: 11, marginBottom: 5}}>Cliente:</label>
              <input type="text" value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} placeholder="Nome do cliente" style={{...input, height: 32, fontSize: 11}} />
            </div>
            <div>
              <label style={{...label, fontSize: 11, marginBottom: 5}}>De:</label>
              <input type="date" value={filtroData.inicio} onChange={(e) => setFiltroData({...filtroData, inicio: e.target.value})} style={{...input, height: 32, fontSize: 11}} />
            </div>
            <div>
              <label style={{...label, fontSize: 11, marginBottom: 5}}>Até:</label>
              <input type="date" value={filtroData.fim} onChange={(e) => setFiltroData({...filtroData, fim: e.target.value})} style={{...input, height: 32, fontSize: 11}} />
            </div>
            <div>
              <label style={{...label, fontSize: 11, marginBottom: 5}}>Status:</label>
              <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} style={{...input, height: 32, fontSize: 11}}>
                <option value="TODOS">TODOS</option>
                <option value="PAGO">PAGO</option>
                <option value="PENDENTE">PENDENTE</option>
                <option value="CANCELADO">CANCELADO</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end' }}>
              <button onClick={() => { setFiltroData({inicio: '', fim: ''}); setFiltroStatus('TODOS'); setFiltroCliente(''); }} style={{...buttonSecondary, fontSize: 11, height: 32}}>Limpar</button>
              <button onClick={() => exportarDados('csv')} style={{...buttonSecondary, fontSize: 11, height: 32}} disabled={exportando}>Exportar</button>
            </div>
          </div>
          <TabelaVendas vendas={vendaFiltrada} detalhada />
        </section>
      );
    }

    if (active === 'movimentos-caixa') {
      const movFiltrada = filtrarPorData(movimentos, 'createdAt');
      const totalRecebido = movFiltrada.filter(m => ['DEPOSITO', 'RECEBIMENTO', 'SUPRIMENTO'].includes((m.tipo || '').toUpperCase())).reduce((sum, m) => sum + Number(m.valor || 0), 0);
      const totalSaida = movFiltrada.filter(m => ['SANGRIA', 'RETIRADA', 'DESPESA'].includes((m.tipo || '').toUpperCase())).reduce((sum, m) => sum + Number(m.valor || 0), 0);
      
      return (
        <section style={{ display: 'grid', gap: 14 }}>
          {/* Resumo e Filtros */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div style={{ ...panel, padding: 14 }}>
              <div style={{ color: '#647674', fontSize: 12 }}>Total recebido</div>
              <div style={{ marginTop: 8, fontWeight: 800, color: '#2f6f73' }}>{money(totalRecebido)}</div>
            </div>
            <div style={{ ...panel, padding: 14 }}>
              <div style={{ color: '#647674', fontSize: 12 }}>Total saída</div>
              <div style={{ marginTop: 8, fontWeight: 800, color: '#a64b4b' }}>{money(totalSaida)}</div>
            </div>
            <div style={{ ...panel, padding: 14 }}>
              <div style={{ color: '#647674', fontSize: 12 }}>Saldo líquido</div>
              <div style={{ marginTop: 8, fontWeight: 800, color: totalRecebido - totalSaida >= 0 ? '#2f6f73' : '#a64b4b' }}>{money(totalRecebido - totalSaida)}</div>
            </div>
          </div>

          {/* Filtros */}
          <div style={{ ...panel, padding: 12, display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label style={{...label, fontSize: 11, marginBottom: 5}}>De:</label>
              <input type="date" value={filtroData.inicio} onChange={(e) => setFiltroData({...filtroData, inicio: e.target.value})} style={{...input, height: 32, fontSize: 11, width: 150}} />
            </div>
            <div>
              <label style={{...label, fontSize: 11, marginBottom: 5}}>Até:</label>
              <input type="date" value={filtroData.fim} onChange={(e) => setFiltroData({...filtroData, fim: e.target.value})} style={{...input, height: 32, fontSize: 11, width: 150}} />
            </div>
            <button onClick={() => setFiltroData({inicio: '', fim: ''})} style={{...buttonSecondary, fontSize: 11, height: 32}}>Limpar</button>
            <button onClick={() => exportarDados('csv')} style={{...buttonSecondary, fontSize: 11, height: 32}} disabled={exportando}>Exportar</button>
          </div>

          {/* Caixas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {caixas.slice(0, 4).map((caixa) => (
              <div key={caixa.id} style={{ ...panel, padding: 14 }}>
                <div style={{ color: '#647674', fontSize: 12 }}>Caixa {caixa.terminal || 'geral'}</div>
                <div style={{ marginTop: 6, fontWeight: 800 }}>{caixa.status}</div>
                <div style={{ marginTop: 8, color: '#647674', fontSize: 12 }}>
                  Saldo inicial: {money(caixa.saldoInicial || 0)}
                </div>
                {caixa.saldoFinal !== undefined && <div style={{ marginTop: 4, color: '#2f6f73', fontWeight: 700 }}>
                  Saldo final: {money(caixa.saldoFinal)}
                </div>}
              </div>
            ))}
          </div>

          {/* Tabela de Movimentos */}
          <div style={{ ...panel, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: '#f4f7f7', color: '#647674' }}>
                <tr>
                  <th style={th}>Data</th><th style={th}>Tipo</th><th style={th}>Valor</th><th style={th}>Terminal</th><th style={th}>Operador</th><th style={th}>Descricao</th>
                </tr>
              </thead>
              <tbody>
                {movFiltrada.slice(0, 80).map((mov) => (
                  <tr key={mov.id} style={{ borderTop: '1px solid #edf1f0' }}>
                    <td style={td}>{new Date(mov.createdAt).toLocaleString('pt-BR')}</td>
                    <td style={td}><Badge value={mov.tipo} /></td>
                    <td style={td}>{money(Number(mov.valor || 0))}</td>
                    <td style={td}>{mov.terminal || mov.caixa?.terminal || '-'}</td>
                    <td style={td}>{mov.usuario?.nome || '-'}</td>
                    <td style={td}>{mov.descricao || '-'}</td>
                  </tr>
                ))}
                {movFiltrada.length === 0 && <tr><td colSpan={6} style={{ ...td, color: '#647674' }}>Sem movimentos de caixa.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      );
    }

    if (active === 'pacotes-vendidos') {
      const pacotes = vendas.filter((venda) => ['ASSINATURA', 'SERVICO'].includes(venda.tipo || ''));
      
      const ativosCount = pacotes.filter(p => p.status === 'PAGO').length;
      const receitaMensal = pacotes.filter(p => p.status === 'PAGO').reduce((sum, p) => sum + Number(p.total || 0), 0);

      return (
        <section style={{ display: 'grid', gap: 14 }}>
          {/* Resumo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div style={{ ...panel, padding: 14 }}>
              <div style={{ color: '#647674', fontSize: 12 }}>Pacotes ativos</div>
              <div style={{ marginTop: 8, fontWeight: 800, color: '#2f6f73' }}>{ativosCount}</div>
            </div>
            <div style={{ ...panel, padding: 14 }}>
              <div style={{ color: '#647674', fontSize: 12 }}>Receita mensal</div>
              <div style={{ marginTop: 8, fontWeight: 800 }}>{money(receitaMensal)}</div>
            </div>
            <div style={{ ...panel, padding: 14 }}>
              <div style={{ color: '#647674', fontSize: 12 }}>Total pacotes</div>
              <div style={{ marginTop: 8, fontWeight: 800 }}>{pacotes.length}</div>
            </div>
          </div>

          {/* Tabela */}
          <div style={{ ...panel, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: '#f4f7f7', color: '#647674' }}>
                <tr><th style={th}>Pacote</th><th style={th}>Cliente</th><th style={th}>Status</th><th style={th}>Total</th><th style={th}>Data</th><th style={th}>Ações</th></tr>
              </thead>
              <tbody>
                {pacotes.map((venda) => (
                  <tr key={venda.id} style={{ borderTop: '1px solid #edf1f0' }}>
                    <td style={td}>{venda.numero || venda.id.slice(0, 8)}</td>
                    <td style={td}>{venda.cliente?.nome || 'Consumidor'}</td>
                    <td style={td}><Badge value={venda.status || 'PAGO'} /></td>
                    <td style={td}>{money(venda.total || 0)}</td>
                    <td style={td}>{new Date(venda.data).toLocaleDateString('pt-BR')}</td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button 
                          onClick={() => renovarPacote(venda.id)}
                          style={{...buttonSecondary, fontSize: 9, padding: '3px 6px', height: 'auto', whiteSpace: 'nowrap'}}
                        >
                          Renovar
                        </button>
                        <button 
                          onClick={() => cancelarPacote(venda.id)}
                          style={{...buttonSecondary, fontSize: 9, padding: '3px 6px', height: 'auto', color: '#a64b4b', borderColor: '#ffcccc'}}
                        >
                          Cancelar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pacotes.length === 0 && <tr><td colSpan={6} style={{ ...td, color: '#647674' }}>Sem pacotes vendidos ainda.</td></tr>}
              </tbody>
            </table>
          </div>
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
        vendaId: venda.id,
        pagamentoIndex: index,
      })));

      const recebimentosFiltrada = filtrarPorCliente(filtrarPorData(recebimentos, 'data'));
      const recebimentosPendentes = recebimentosFiltrada.filter(r => r.status === 'PENDENTE' || !r.status);
      const recebimentosConfirmados = recebimentosFiltrada.filter(r => r.status === 'CONFIRMADO' || r.status === 'PAGO');

      return (
        <section style={{ display: 'grid', gap: 14 }}>
          {/* Resumo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div style={{ ...panel, padding: 14 }}>
              <div style={{ color: '#647674', fontSize: 12 }}>Pendentes</div>
              <div style={{ marginTop: 8, fontWeight: 800, color: '#a64b4b' }}>{recebimentosPendentes.length} recebimentos</div>
              <div style={{ marginTop: 4, color: '#8a9b99', fontSize: 11 }}>{money(recebimentosPendentes.reduce((sum, r) => sum + r.valor, 0))}</div>
            </div>
            <div style={{ ...panel, padding: 14 }}>
              <div style={{ color: '#647674', fontSize: 12 }}>Confirmados</div>
              <div style={{ marginTop: 8, fontWeight: 800, color: '#2f6f73' }}>{recebimentosConfirmados.length} recebimentos</div>
              <div style={{ marginTop: 4, color: '#8a9b99', fontSize: 11 }}>{money(recebimentosConfirmados.reduce((sum, r) => sum + r.valor, 0))}</div>
            </div>
          </div>

          {/* Filtros */}
          <div style={{ ...panel, padding: 12, display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label style={{...label, fontSize: 11, marginBottom: 5}}>Cliente:</label>
              <input type="text" value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} placeholder="Nome" style={{...input, height: 32, fontSize: 11, width: 150}} />
            </div>
            <button onClick={() => setFiltroCliente('')} style={{...buttonSecondary, fontSize: 11, height: 32}}>Limpar</button>
          </div>

          {/* Tabela */}
          <div style={{ ...panel, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: '#f4f7f7', color: '#647674' }}>
                <tr><th style={th}>Venda</th><th style={th}>Cliente</th><th style={th}>Forma</th><th style={th}>Valor</th><th style={th}>Status</th><th style={th}>Data</th><th style={th}>Ações</th></tr>
              </thead>
              <tbody>
                {recebimentosFiltrada.slice(0, 120).map((item) => (
                  <tr key={item.id} style={{ borderTop: '1px solid #edf1f0' }}>
                    <td style={td}>{item.venda}</td>
                    <td style={td}>{item.cliente}</td>
                    <td style={td}>{item.forma}</td>
                    <td style={td}>{money(item.valor)}</td>
                    <td style={td}><Badge value={item.status || 'PENDENTE'} /></td>
                    <td style={td}>{new Date(item.data).toLocaleDateString('pt-BR')}</td>
                    <td style={td}>
                      <button 
                        onClick={() => registrarPagamento(item.id, item.valor)}
                        style={{...buttonSecondary, fontSize: 10, padding: '5px 10px', height: 'auto'}}
                      >
                        Registrar
                      </button>
                    </td>
                  </tr>
                ))}
                {recebimentosFiltrada.length === 0 && <tr><td colSpan={7} style={{ ...td, color: '#647674' }}>Nenhum recebimento encontrado.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      );
    }

    if (active === 'lista-precos') {
      const listasFiltrada = listasPreco.filter(l => 
        !buscaLista || l.nome.toLowerCase().includes(buscaLista.toLowerCase())
      );

      return (
        <section style={{ display: 'grid', gap: 14 }}>
          {/* Busca e Ações */}
          <div style={{ ...panel, padding: 12, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{...label, fontSize: 11, marginBottom: 5}}>Buscar lista:</label>
              <input 
                type="text" 
                value={buscaLista} 
                onChange={(e) => setBuscaLista(e.target.value)} 
                placeholder="Nome da lista" 
                style={{...input, height: 32, fontSize: 11}} 
              />
            </div>
            <button 
              onClick={() => setModalAberto('nova-lista')}
              style={{...buttonPrimary, fontSize: 11, height: 32, padding: '0 14px'}}
            >
              + Nova lista
            </button>
          </div>

          {/* Tabela */}
          <div style={{ ...panel, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: '#f4f7f7', color: '#647674' }}>
                <tr><th style={th}>Nome</th><th style={th}>Tipo</th><th style={th}>Itens</th><th style={th}>Margem</th><th style={th}>Markup</th><th style={th}>Vigencia</th><th style={th}>Ações</th></tr>
              </thead>
              <tbody>
                {listasFiltrada.map((lista) => (
                  <tr key={lista.id} style={{ borderTop: '1px solid #edf1f0' }}>
                    <td style={td}><strong>{lista.nome}</strong></td>
                    <td style={td}>{lista.tipo}</td>
                    <td style={td}>{lista.itens?.length || 0}</td>
                    <td style={td}>{lista.margemMinima ?? 0}%</td>
                    <td style={td}>{lista.markupPadrao ?? 0}%</td>
                    <td style={td}>{lista.vigenciaInicio ? new Date(lista.vigenciaInicio).toLocaleDateString('pt-BR') : '-'}</td>
                    <td style={td}>
                      <button 
                        onClick={() => deletarListaPreco(lista.id)}
                        style={{...buttonSecondary, fontSize: 10, padding: '4px 8px', height: 'auto', color: '#a64b4b', borderColor: '#ffcccc'}}
                      >
                        Deletar
                      </button>
                    </td>
                  </tr>
                ))}
                {listasFiltrada.length === 0 && <tr><td colSpan={7} style={{ ...td, color: '#647674' }}>Nenhuma lista encontrada.</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Modal - Nova Lista */}
          {modalAberto === 'nova-lista' && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1001 }} onClick={() => setModalAberto(null)}>
              <div style={{...panel, padding: 18, width: 400, borderRadius: 10}} onClick={e => e.stopPropagation()}>
                <h3 style={{ margin: '0 0 12px' }}>Nova Lista de Preço</h3>
                <div style={{ display: 'grid', gap: 10 }}>
                  <div>
                    <label style={{...label, fontSize: 11, marginBottom: 5}}>Nome</label>
                    <input type="text" value={novaLista.nome} onChange={(e) => setNovaLista({...novaLista, nome: e.target.value})} style={{...input, height: 36, fontSize: 12}} />
                  </div>
                  <div>
                    <label style={{...label, fontSize: 11, marginBottom: 5}}>Tipo</label>
                    <select value={novaLista.tipo} onChange={(e) => setNovaLista({...novaLista, tipo: e.target.value})} style={{...input, height: 36, fontSize: 12}}>
                      <option>VAREJO</option>
                      <option>ATACADO</option>
                      <option>DISTRIBUIDOR</option>
                      <option>ASSINANTE</option>
                    </select>
                  </div>
                  <div>
                    <label style={{...label, fontSize: 11, marginBottom: 5}}>Margem Mínima (%)</label>
                    <input type="number" value={novaLista.margemMinima} onChange={(e) => setNovaLista({...novaLista, margemMinima: Number(e.target.value)})} style={{...input, height: 36, fontSize: 12}} />
                  </div>
                  <div>
                    <label style={{...label, fontSize: 11, marginBottom: 5}}>Markup Padrão (%)</label>
                    <input type="number" value={novaLista.markupPadrao} onChange={(e) => setNovaLista({...novaLista, markupPadrao: Number(e.target.value)})} style={{...input, height: 36, fontSize: 12}} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button onClick={criarListaPreco} style={{...buttonPrimary, fontSize: 11}}>Criar</button>
                    <button onClick={() => setModalAberto(null)} style={{...buttonSecondary, fontSize: 11}}>Cancelar</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      );
    }

    if (active === 'ranking-clientes') {
      const rankingFiltrada = ranking.filter(r =>
        !filtroClassificacao || filtroClassificacao === 'TODOS' || r.classificacao === filtroClassificacao
      );
      
      return (
        <section style={{ display: 'grid', gap: 14 }}>
          {/* Filtros e Ações */}
          <div style={{ ...panel, padding: 12, display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label style={{...label, fontSize: 11, marginBottom: 5}}>Classificação:</label>
              <select value={filtroClassificacao} onChange={(e) => setFiltroClassificacao(e.target.value)} style={{...input, height: 32, fontSize: 11, width: 150}}>
                <option value="TODOS">TODOS</option>
                <option value="OURO">OURO</option>
                <option value="PRATA">PRATA</option>
                <option value="BRONZE">BRONZE</option>
              </select>
            </div>
            <button onClick={() => setFiltroClassificacao('TODOS')} style={{...buttonSecondary, fontSize: 11, height: 32}}>Limpar</button>
            <button onClick={() => exportarDados('csv')} style={{...buttonSecondary, fontSize: 11, height: 32}} disabled={exportando}>Exportar</button>
          </div>

          {/* Resumo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div style={{ ...panel, padding: 14 }}>
              <div style={{ color: '#647674', fontSize: 12 }}>Total de clientes</div>
              <div style={{ marginTop: 8, fontWeight: 800 }}>{rankingFiltrada.length}</div>
            </div>
            <div style={{ ...panel, padding: 14 }}>
              <div style={{ color: '#647674', fontSize: 12 }}>Faturamento total</div>
              <div style={{ marginTop: 8, fontWeight: 800, color: '#2f6f73' }}>{money(rankingFiltrada.reduce((sum, r) => sum + r.faturamento, 0))}</div>
            </div>
            <div style={{ ...panel, padding: 14 }}>
              <div style={{ color: '#647674', fontSize: 12 }}>Lucro total</div>
              <div style={{ marginTop: 8, fontWeight: 800, color: '#54736b' }}>{money(rankingFiltrada.reduce((sum, r) => sum + Number(r.lucro || 0), 0))}</div>
            </div>
          </div>

          {/* Ranking */}
          <section style={{ ...panel, padding: 16 }}>
            <div style={{ display: 'grid', gap: 10 }}>
              {rankingFiltrada.map((item, index) => (
                <div key={`${item.cliente}-${index}`} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 130px 130px 100px', gap: 12, alignItems: 'center', padding: 12, background: '#f8faf9', border: '1px solid #d9e2e1', borderRadius: 8 }}>
                  <strong style={{ fontSize: 16, color: '#2f6f73' }}>#{index + 1}</strong>
                  <div>
                    <strong>{item.cliente}</strong>
                    <div style={{ color: '#647674', fontSize: 12 }}>{item.frequencia} compras | Ticket {money(item.ticketMedio)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong>{money(item.faturamento)}</strong>
                    <div style={{ color: '#647674', fontSize: 11 }}>Faturamento</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong>{money(Number(item.lucro || 0))}</strong>
                    <div style={{ color: '#647674', fontSize: 11 }}>Lucro</div>
                  </div>
                  <Badge value={item.classificacao} />
                </div>
              ))}
              {rankingFiltrada.length === 0 && <div style={{ color: '#647674', textAlign: 'center', padding: 20 }}>Nenhum cliente nesta classificação.</div>}
            </div>
          </section>
        </section>
      );
    }

    if (active === 'saldo-clientes') {
      const saldosFiltrada = saldos.filter(s =>
        !filtroCliente || (s.cliente?.nome || '').toLowerCase().includes(filtroCliente.toLowerCase())
      );

      const saldoTotal = saldosFiltrada.reduce((sum, s) => sum + Number(s.saldoAtual || 0), 0);
      const creditoDisponivel = saldosFiltrada.reduce((sum, s) => sum + Math.max(0, Number(s.limiteCredito || 0) - Number(s.saldoAtual || 0)), 0);

      return (
        <section style={{ display: 'grid', gap: 14 }}>
          {/* Resumo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div style={{ ...panel, padding: 14 }}>
              <div style={{ color: '#647674', fontSize: 12 }}>Saldo total em aberto</div>
              <div style={{ marginTop: 8, fontWeight: 800, color: '#a64b4b' }}>{money(saldoTotal)}</div>
            </div>
            <div style={{ ...panel, padding: 14 }}>
              <div style={{ color: '#647674', fontSize: 12 }}>Crédito disponível</div>
              <div style={{ marginTop: 8, fontWeight: 800, color: '#2f6f73' }}>{money(creditoDisponivel)}</div>
            </div>
            <div style={{ ...panel, padding: 14 }}>
              <div style={{ color: '#647674', fontSize: 12 }}>Clientes com débito</div>
              <div style={{ marginTop: 8, fontWeight: 800 }}>{saldosFiltrada.filter(s => Number(s.saldoAtual || 0) > 0).length}</div>
            </div>
          </div>

          {/* Filtro */}
          <div style={{ ...panel, padding: 12, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{...label, fontSize: 11, marginBottom: 5}}>Buscar cliente:</label>
              <input type="text" value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} placeholder="Nome" style={{...input, height: 32, fontSize: 11}} />
            </div>
            <button onClick={() => setFiltroCliente('')} style={{...buttonSecondary, fontSize: 11, height: 32}}>Limpar</button>
          </div>

          {/* Tabela */}
          <div style={{ ...panel, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: '#f4f7f7', color: '#647674' }}>
                <tr><th style={th}>Cliente</th><th style={th}>Saldo atual</th><th style={th}>Limite crédito</th><th style={th}>Disponível</th><th style={th}>% Uso</th><th style={th}>Ações</th></tr>
              </thead>
              <tbody>
                {saldosFiltrada.map((saldo) => {
                  const saldoAtual = Number(saldo.saldoAtual || 0);
                  const limite = Number(saldo.limiteCredito || 0);
                  const percentualUso = limite > 0 ? Math.round((saldoAtual / limite) * 100) : 0;
                  const disponivel = Math.max(0, limite - saldoAtual);

                  return (
                    <tr key={saldo.id} style={{ borderTop: '1px solid #edf1f0' }}>
                      <td style={td}><strong>{saldo.cliente?.nome || 'Sem cliente'}</strong></td>
                      <td style={td}><strong style={{ color: saldoAtual > 0 ? '#a64b4b' : '#2f6f73' }}>{money(saldoAtual)}</strong></td>
                      <td style={td}>{money(limite)}</td>
                      <td style={td}>{money(disponivel)}</td>
                      <td style={td}>
                        <div style={{ background: percentualUso > 80 ? '#ffebee' : '#e8f5e9', padding: '4px 8px', borderRadius: 4, color: percentualUso > 80 ? '#a64b4b' : '#2f6f73', fontWeight: 700 }}>
                          {percentualUso}%
                        </div>
                      </td>
                      <td style={td}>
                        <button 
                          onClick={() => alert(`Cliente: ${saldo.cliente?.nome}\nSaldo: ${money(saldoAtual)}\nLimite: ${money(limite)}`)}
                          style={{...buttonSecondary, fontSize: 10, padding: '4px 8px', height: 'auto'}}
                        >
                          Detalhar
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {saldosFiltrada.length === 0 && <tr><td colSpan={6} style={{ ...td, color: '#647674' }}>Sem saldos de clientes.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      );
    }

    if (active === 'formas-recebimento') {
      const formasFiltrada = formas.filter(f => f.ativo !== false);

      return (
        <section style={{ display: 'grid', gap: 14 }}>
          {/* Ações */}
          <div style={{ ...panel, padding: 12, display: 'flex', gap: 10 }}>
            <button 
              onClick={() => setModalAberto('nova-forma')}
              style={{...buttonPrimary, fontSize: 11, height: 32, padding: '0 14px'}}
            >
              + Nova forma
            </button>
          </div>

          {/* Tabela */}
          <div style={{ ...panel, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: '#f4f7f7', color: '#647674' }}>
                <tr><th style={th}>Forma</th><th style={th}>Tipo</th><th style={th}>Taxa %</th><th style={th}>Taxa fixa</th><th style={th}>Prazo</th><th style={th}>Parcel.</th><th style={th}>Antec.</th><th style={th}>Status</th><th style={th}>Ações</th></tr>
              </thead>
              <tbody>
                {formasFiltrada.map((forma) => (
                  <tr key={forma.id} style={{ borderTop: '1px solid #edf1f0' }}>
                    <td style={td}><strong>{forma.nome}</strong></td>
                    <td style={td}>{forma.tipo}</td>
                    <td style={td}>{Number(forma.taxaPercentual || 0)}%</td>
                    <td style={td}>{money(Number(forma.taxaFixa || 0))}</td>
                    <td style={td}>{forma.prazoRecebimentoDias || 0} dias</td>
                    <td style={td}>{forma.permiteParcelamento ? '✓' : '✗'}</td>
                    <td style={td}>{forma.permiteAntecipacao ? '✓' : '✗'}</td>
                    <td style={td}><Badge value={forma.ativo ? 'ATIVO' : 'INATIVO'} /></td>
                    <td style={td}>
                      <button 
                        onClick={() => {
                          setOperacaoModal(forma);
                          setNovaForma(forma);
                          setModalAberto('editar-forma');
                        }}
                        style={{...buttonSecondary, fontSize: 10, padding: '4px 8px', height: 'auto'}}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
                {formasFiltrada.length === 0 && <tr><td colSpan={9} style={{ ...td, color: '#647674' }}>Sem formas de recebimento cadastradas.</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Modal - Nova/Editar Forma */}
          {(modalAberto === 'nova-forma' || modalAberto === 'editar-forma') && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1001 }} onClick={() => setModalAberto(null)}>
              <div style={{...panel, padding: 18, width: 400, borderRadius: 10, maxHeight: '90vh', overflow: 'auto'}} onClick={e => e.stopPropagation()}>
                <h3 style={{ margin: '0 0 12px' }}>{operacaoModal ? 'Editar' : 'Nova'} Forma de Recebimento</h3>
                <div style={{ display: 'grid', gap: 10 }}>
                  <div>
                    <label style={{...label, fontSize: 11, marginBottom: 5}}>Nome</label>
                    <input type="text" value={novaForma.nome} onChange={(e) => setNovaForma({...novaForma, nome: e.target.value})} style={{...input, height: 36, fontSize: 12}} />
                  </div>
                  <div>
                    <label style={{...label, fontSize: 11, marginBottom: 5}}>Tipo</label>
                    <select value={novaForma.tipo} onChange={(e) => setNovaForma({...novaForma, tipo: e.target.value})} style={{...input, height: 36, fontSize: 12}}>
                      <option>PIX</option>
                      <option>DINHEIRO</option>
                      <option>DEBITO</option>
                      <option>CREDITO</option>
                      <option>BOLETO</option>
                      <option>CREDIARIO</option>
                    </select>
                  </div>
                  <div>
                    <label style={{...label, fontSize: 11, marginBottom: 5}}>Taxa %</label>
                    <input type="number" value={novaForma.taxaPercentual} onChange={(e) => setNovaForma({...novaForma, taxaPercentual: Number(e.target.value)})} step="0.01" style={{...input, height: 36, fontSize: 12}} />
                  </div>
                  <div>
                    <label style={{...label, fontSize: 11, marginBottom: 5}}>Taxa Fixa</label>
                    <input type="number" value={novaForma.taxaFixa} onChange={(e) => setNovaForma({...novaForma, taxaFixa: Number(e.target.value)})} step="0.01" style={{...input, height: 36, fontSize: 12}} />
                  </div>
                  <div>
                    <label style={{...label, fontSize: 11, marginBottom: 5}}>Prazo de Recebimento (dias)</label>
                    <input type="number" value={novaForma.prazoRecebimentoDias} onChange={(e) => setNovaForma({...novaForma, prazoRecebimentoDias: Number(e.target.value)})} style={{...input, height: 36, fontSize: 12}} />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#344745' }}>
                    <input type="checkbox" checked={novaForma.permiteParcelamento} onChange={(e) => setNovaForma({...novaForma, permiteParcelamento: e.target.checked})} />
                    <span style={{ fontSize: 12 }}>Permite parcelamento</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#344745' }}>
                    <input type="checkbox" checked={novaForma.permiteAntecipacao} onChange={(e) => setNovaForma({...novaForma, permiteAntecipacao: e.target.checked})} />
                    <span style={{ fontSize: 12 }}>Permite antecipação</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button onClick={() => operacaoModal ? atualizarFormaRecebimento(operacaoModal.id, novaForma) : criarFormaRecebimento()} style={{...buttonPrimary, fontSize: 11}}>{operacaoModal ? 'Atualizar' : 'Criar'}</button>
                    <button onClick={() => { setModalAberto(null); setOperacaoModal(null); }} style={{...buttonSecondary, fontSize: 11}}>Cancelar</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      );
    }

    if (active === 'modelo-orcamento') {
      const orcamentosFiltrada = orcamentos.filter(o =>
        !buscaOrcamento || o.titulo.toLowerCase().includes(buscaOrcamento.toLowerCase()) || 
        (o.numero && o.numero.includes(buscaOrcamento)) ||
        (o.cliente?.nome || '').toLowerCase().includes(buscaOrcamento.toLowerCase())
      );

      return (
        <section style={{ display: 'grid', gap: 14 }}>
          {/* Busca e Ações */}
          <div style={{ ...panel, padding: 12, display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{...label, fontSize: 11, marginBottom: 5}}>Buscar orçamento:</label>
              <input 
                type="text" 
                value={buscaOrcamento} 
                onChange={(e) => setBuscaOrcamento(e.target.value)} 
                placeholder="Título, número ou cliente" 
                style={{...input, height: 32, fontSize: 11}} 
              />
            </div>
            <button 
              onClick={() => {
                setNovoOrcamento({ titulo: '', clienteId: '', itens: [] });
                setModalAberto('novo-orcamento');
              }}
              style={{...buttonPrimary, fontSize: 11, height: 32, padding: '0 14px'}}
            >
              + Novo Orçamento
            </button>
          </div>

          {/* Tabela */}
          <div style={{ ...panel, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: '#f4f7f7', color: '#647674' }}>
                <tr><th style={th}>Número</th><th style={th}>Título</th><th style={th}>Cliente</th><th style={th}>Valor</th><th style={th}>Validade</th><th style={th}>Status</th><th style={th}>Ações</th></tr>
              </thead>
              <tbody>
                {orcamentosFiltrada.map((orcamento) => {
                  const agora = new Date();
                  const validade = orcamento.validade ? new Date(orcamento.validade) : null;
                  const expirado = validade && validade < agora;

                  return (
                    <tr key={orcamento.id} style={{ borderTop: '1px solid #edf1f0' }}>
                      <td style={td}>{orcamento.numero || orcamento.id.slice(0, 8)}</td>
                      <td style={td}><strong>{orcamento.titulo}</strong></td>
                      <td style={td}>{orcamento.cliente?.nome || 'Sem cliente'}</td>
                      <td style={td}>{money(Number(orcamento.total || 0))}</td>
                      <td style={td}>{orcamento.validade ? new Date(orcamento.validade).toLocaleDateString('pt-BR') : '-'}</td>
                      <td style={td}><Badge value={expirado ? 'EXPIRADO' : 'ATIVO'} /></td>
                      <td style={td}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button 
                            onClick={() => converterOrcamentoParaVenda(orcamento.id)}
                            style={{...buttonSecondary, fontSize: 9, padding: '3px 6px', height: 'auto', whiteSpace: 'nowrap'}}
                          >
                            Converter
                          </button>
                          <button 
                            onClick={() => enviarOrcamentoPorEmail(orcamento.id, orcamento.cliente?.email || 'email@example.com')}
                            style={{...buttonSecondary, fontSize: 9, padding: '3px 6px', height: 'auto'}}
                          >
                            Email
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {orcamentosFiltrada.length === 0 && <tr><td colSpan={7} style={{ ...td, color: '#647674' }}>Nenhum orçamento encontrado.</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Modal - Novo Orçamento */}
          {modalAberto === 'novo-orcamento' && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1001 }} onClick={() => setModalAberto(null)}>
              <div style={{...panel, padding: 18, width: 400, borderRadius: 10}} onClick={e => e.stopPropagation()}>
                <h3 style={{ margin: '0 0 12px' }}>Novo Orçamento</h3>
                <div style={{ display: 'grid', gap: 10 }}>
                  <div>
                    <label style={{...label, fontSize: 11, marginBottom: 5}}>Título</label>
                    <input type="text" value={novoOrcamento.titulo} onChange={(e) => setNovoOrcamento({...novoOrcamento, titulo: e.target.value})} style={{...input, height: 36, fontSize: 12}} />
                  </div>
                  <div>
                    <label style={{...label, fontSize: 11, marginBottom: 5}}>Cliente (ID)</label>
                    <input type="text" value={novoOrcamento.clienteId} onChange={(e) => setNovoOrcamento({...novoOrcamento, clienteId: e.target.value})} placeholder="ID do cliente" style={{...input, height: 36, fontSize: 12}} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button onClick={criarOrcamento} style={{...buttonPrimary, fontSize: 11}}>Criar</button>
                    <button onClick={() => setModalAberto(null)} style={{...buttonSecondary, fontSize: 11}}>Cancelar</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      );
    }

    if (active === 'modelo-demonstrativo') {
      return (
        <section style={{ display: 'grid', gap: 14 }}>
          {/* Filtros */}
          <div style={{ ...panel, padding: 12, display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label style={{...label, fontSize: 11, marginBottom: 5}}>De:</label>
              <input type="date" value={filtroData.inicio} onChange={(e) => setFiltroData({...filtroData, inicio: e.target.value})} style={{...input, height: 32, fontSize: 11, width: 150}} />
            </div>
            <div>
              <label style={{...label, fontSize: 11, marginBottom: 5}}>Até:</label>
              <input type="date" value={filtroData.fim} onChange={(e) => setFiltroData({...filtroData, fim: e.target.value})} style={{...input, height: 32, fontSize: 11, width: 150}} />
            </div>
            <button onClick={() => setFiltroData({inicio: '', fim: ''})} style={{...buttonSecondary, fontSize: 11, height: 32}}>Limpar</button>
            <button onClick={() => exportarDados('pdf')} style={{...buttonSecondary, fontSize: 11, height: 32}} disabled={exportando}>Exportar PDF</button>
          </div>

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <Kpi label="Receita" value={money(Number(demonstrativo?.receita || 0))} icon={Banknote} color="#2f6f73" />
            <Kpi label="Lucro" value={money(Number(demonstrativo?.lucro || 0))} icon={BarChart3} color="#54736b" />
            <Kpi label="Margem" value={`${Number(demonstrativo?.margem || 0).toFixed(1)}%`} icon={BarChart3} color="#9a6a2f" />
            <Kpi label="Despesas" value={money(Number(demonstrativo?.despesaFinanceira || 0))} icon={Wallet} color="#a64b4b" />
          </div>

          {/* Análise por Canal */}
          <div style={{ ...panel, padding: 16 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 14 }}>Análise por canal</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              {(demonstrativo?.canais || []).map((canal) => {
                const percentualRecita = demonstrativo?.receita ? Math.round((canal.total / demonstrativo.receita) * 100) : 0;
                return (
                  <div key={canal.canal} style={{ display: 'grid', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{canal.canal}</strong>
                        <div style={{ color: '#647674', fontSize: 11 }}>{canal.quantidade} pedidos</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <strong>{money(Number(canal.total || 0))}</strong>
                        <div style={{ color: '#647674', fontSize: 11 }}>{percentualRecita}% da receita</div>
                      </div>
                    </div>
                    <div style={{ background: '#f0f0f0', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          background: '#2f6f73', 
                          height: '100%', 
                          width: `${percentualRecita}%`,
                          borderRadius: 4,
                          transition: 'width 0.3s'
                        }} 
                      />
                    </div>
                  </div>
                );
              })}
              {(demonstrativo?.canais || []).length === 0 && <div style={{ color: '#647674', textAlign: 'center', padding: 20 }}>Sem dados para demonstrativo.</div>}
            </div>
          </div>

          {/* Resumo Financeiro */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div style={{ ...panel, padding: 14 }}>
              <div style={{ color: '#647674', fontSize: 12 }}>Desconto Total</div>
              <div style={{ marginTop: 8, fontWeight: 800, color: '#a64b4b' }}>{money(Number(demonstrativo?.descontoTotal || 0))}</div>
            </div>
            <div style={{ ...panel, padding: 14 }}>
              <div style={{ color: '#647674', fontSize: 12 }}>Frete Total</div>
              <div style={{ marginTop: 8, fontWeight: 800 }}>{money(Number(demonstrativo?.freteTotal || 0))}</div>
            </div>
            <div style={{ ...panel, padding: 14 }}>
              <div style={{ color: '#647674', fontSize: 12 }}>Receita Financeira</div>
              <div style={{ marginTop: 8, fontWeight: 800, color: '#2f6f73' }}>{money(Number(demonstrativo?.receitaFinanceira || 0))}</div>
            </div>
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
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', position: 'relative', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, color: '#243332' }}>Modulo de Vendas</h1>
          <p style={{ margin: '6px 0 0', color: '#647674' }}>Estrutura comercial integrada a caixa, recebimentos, orcamentos e marketplace.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
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
              minWidth: isMobileViewport ? 220 : 280,
              width: isMobileViewport ? 'min(92vw, 340px)' : undefined,
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

      {erro && (
        <div style={{ ...panel, padding: 14, color: '#8a4b20', background: '#fff8ed' }}>
          <div>{erro}</div>
          {falhasCarga.length > 0 && (
            <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: '#7a3e1d', fontSize: 12 }}>
              {falhasCarga.slice(0, 6).map((falha) => (
                <li key={falha}>{falha}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {active !== 'ponto-venda' && (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <Kpi label="Receita" value={money(kpis.receita)} icon={Banknote} color="#2f6f73" />
          <Kpi label="Lucro" value={money(kpis.lucro)} icon={BarChart3} color="#54736b" />
          <Kpi label="Pedidos abertos" value={kpis.pedidosAbertos} icon={Receipt} color="#9a6a2f" />
          <Kpi label="Ticket medio" value={money(kpis.ticketMedio)} icon={CreditCard} color="#6c8f7d" />
        </section>
      )}

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
