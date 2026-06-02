import { AlertTriangle, Boxes, ClipboardCheck, PackagePlus, RefreshCw, Search, ShoppingCart, Warehouse } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { calcularRiscosRecebimento, getRiscoCategoriaLabel, type RiscoRecebimento } from './comprasRecebimentoUtils';

type EstoqueItem = {
  id: string;
  nome: string;
  sku?: string;
  marca?: string;
  grupo?: string;
  fisico: number;
  reservado: number;
  disponivel: number;
  minimo: number;
  ruptura: boolean;
  baixoEstoque: boolean;
};

type AnaliseEstoque = {
  totalProdutos: number;
  rupturas: EstoqueItem[];
  baixoEstoque: EstoqueItem[];
  valorEstoque: number;
  itens: EstoqueItem[];
};

type CatalogoItem = {
  id: string;
  tipo?: 'PRODUTO' | 'SERVICO' | 'PACOTE' | 'KIT' | string;
  nome: string;
  codigoInterno?: string | null;
  codigoBarras?: string | null;
  marca?: string | null;
  grupo?: string | null;
  estoqueAtual: number;
  estoqueMinimo?: number;
  statusValidade?: string;
};

type StatusCatalogo = {
  label: string;
  color: string;
  background: string;
};

type EstoqueHashState = {
  atalho?: string;
  q?: string;
};

type AtalhoOperacional = {
  codigo: string;
  titulo: string;
  rota: string;
  acaoRapida: string;
};

type SugestaoCompraItem = {
  itemId: string;
  nomeItem: string;
  estoqueAtual: number;
  quantidadeSugerida: number;
};

type PedidoCompraItem = {
  id: string;
  numero?: string | null;
  status?: string;
  createdAt?: string;
  valorTotal?: number;
  valorProdutos?: number;
  observacoes?: string | null;
  itens?: Array<{
    id: string;
    produtoId?: string;
    quantidade?: number;
    quantidadeRecebida?: number;
    custoUnitario?: number;
    produto?: { nome?: string | null };
  }>;
  fornecedor?: { id?: string | null; nome?: string | null; cnpj?: string | null; documento?: string | null };
};

type DepositoOption = {
  id: string;
  nome: string;
};

type RecebimentoManualForm = {
  numero: string;
  serie: string;
  chaveAcesso: string;
  dataEmissao: string;
  dataEntrada: string;
  valorFrete: string;
  valorImpostos: string;
  vencimento: string;
  observacoes: string;
  depositoDestinoId: string;
  nfeCnpj: {
    emitenteCnpj: string;
    emitenteIe: string;
    destinatarioCnpj: string;
    destinatarioIe: string;
    naturezaOperacao: string;
    cfopPrincipal: string;
    transportadoraNome: string;
    transportadoraCnpj: string;
    modalidadeFrete: string;
    placaVeiculo: string;
    ufVeiculo: string;
  };
  itens: Array<{
    itemId: string;
    produtoId: string;
    nome: string;
    quantidadePendente: number;
    quantidadeRecebida: string;
    custoUnitario: string;
  }>;
};

type FornecedorFiltro = {
  id: string;
  nome: string;
};

type GrupoCadastro = {
  id: string;
  nome: string;
};

type MarcaCadastro = {
  id: string;
  nome: string;
};

type CadastroRapidoProdutoForm = {
  tipo: 'PRODUTO' | 'SERVICO' | 'PACOTE' | 'KIT';
  nome: string;
  codigoInterno: string;
  codigoBarras: string;
  unidadeVenda: string;
  grupoId: string;
  marcaId: string;
  custoAtual: string;
  precoVenda: string;
  markupAlvo: string;
  estoqueInicial: string;
};

type NotaFiscalCompra = {
  pedidoCompraId: string;
  numeroPedido?: string | null;
  fornecedorId?: string | null;
  fornecedor?: string | null;
  numero?: string;
  serie?: string;
  chaveAcesso?: string | null;
  dataEmissao?: string | null;
  dataEntrada?: string | null;
  valorTotal?: number;
  valorFrete?: number;
  valorImpostos?: number;
  statusPedido?: string;
  lancamentosFinanceiros?: Array<{
    id?: string;
    valor?: number;
    situacao?: string;
    vencimento?: string | null;
  }>;
};

type CompraFiltros = {
  q: string;
  numeroNota: string;
  fornecedorId: string;
  inicio: string;
  fim: string;
  statusPedido: string;
};

type FiltroProdutosServicos = 'TODOS' | 'VENCIDOS' | 'VENCENDO_60' | 'SEM_GRUPO' | 'BAIXO_ESTOQUE';

type FracionamentoItemForm = {
  fatorConversao: string;
  unidadeFracionada: string;
};

type DivergenciaItemRecebimento = {
  itemId: string;
  nome: string;
  score: number;
  nivel: 'alto' | 'medio' | 'baixo';
  observacoes: string[];
  quantidadePendente: number;
  quantidadeRecebida: number;
  quantidadeEstoquePrevista: number;
  custoPedido: number;
  custoRecebido: number;
};

type NovoPedidoWizardItem = {
  id: string;
  produtoId: string;
  nome: string;
  quantidade: string;
  custoUnitario: string;
  origem: 'sugestao' | 'manual';
};

type ImportacaoXmlResumo = {
  itensNota: number;
  fornecedorCriado: boolean;
  marcasCriadas: number;
  produtosCriados: number;
  produtosAtualizados: number;
};

type PreviewXmlItem = {
  nome: string;
  quantidade: number;
  custoUnitario: number;
  marcaNome?: string | null;
  validade?: string | null;
  produtoEncontradoId?: string | null;
  produtoEncontradoNome?: string | null;
};

type PreviewXmlCompra = {
  notaFiscal?: {
    numero?: string;
    serie?: string;
    fornecedorNome?: string | null;
    valorTotal?: number;
  };
  resumo?: {
    itensNota?: number;
    itensComProdutoEncontrado?: number;
    itensSemProdutoEncontrado?: number;
    marcasEncontradas?: number;
  };
  itens?: PreviewXmlItem[];
};

type PedidoXmlSugerido = {
  pedido: PedidoCompraItem;
  score: number;
  motivos: string[];
  alertas: string[];
  nivel: 'alto' | 'medio' | 'baixo';
  criterios: Array<{
    label: string;
    pontos: number;
    maximo: number;
  }>;
};

const card = {
  background: 'linear-gradient(180deg, #ffffff 0%, #fbfdfd 100%)',
  border: '1px solid #d9e2e1',
  borderRadius: 12,
  boxShadow: '0 12px 32px rgba(36, 51, 50, 0.06)',
};

const getRouteBaseFromHash = (): 'estoque' | 'servicos' | 'compras' | 'novos-pedidos' => {
  if (typeof window === 'undefined') return 'estoque';
  if (window.location.hash.startsWith('#novos-pedidos')) return 'novos-pedidos';
  if (window.location.hash.startsWith('#compras')) return 'compras';
  if (window.location.hash.startsWith('#servicos')) return 'servicos';
  return 'estoque';
};

const todayInputValue = () => new Date().toISOString().slice(0, 10);

const normalizeText = (value?: string | null) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const normalizeDocument = (value?: string | null) => String(value || '').replace(/\D/g, '');

const isValidadeVencida = (statusValidade?: string | null) => {
  const status = normalizeText(statusValidade);
  return status.includes('vencid');
};

const isValidadeVencendo60 = (statusValidade?: string | null) => {
  const status = normalizeText(statusValidade);
  return status.includes('vencendo') && status.includes('60');
};

const normalizeStatusPedidoCompra = (status?: string | null) => {
  const normalized = String(status || '').trim().toUpperCase();

  if (!normalized) return '';
  if (normalized === 'ABERTO' || normalized === 'EM_ABERTO') return 'SOLICITADO';
  if (normalized === 'PARCIAL') return 'RECEBIDO_PARCIAL';

  return normalized;
};

const isStatusPedidoCompraAberto = (status?: string | null) => {
  const normalized = normalizeStatusPedidoCompra(status);
  return ['SOLICITADO', 'APROVADO', 'COMPRADO', 'RECEBIDO_PARCIAL'].includes(normalized);
};

const normalizeLegacyMoney = (value?: number | null) => {
  let parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return 0;

  let guard = 0;
  while (parsed > 1_000_000_000 && guard < 12) {
    parsed /= 10;
    guard += 1;
  }

  return Number(parsed.toFixed(2));
};

const xmlNodeText = (doc: Document, names: string[]) => {
  const allNodes = Array.from(doc.getElementsByTagName('*'));
  const target = allNodes.find((node) => {
    const local = String(node.localName || node.nodeName || '').toLowerCase();
    return names.some((name) => local === name.toLowerCase() || local.endsWith(`:${name.toLowerCase()}`));
  });

  return target?.textContent?.trim() || '';
};

const xmlNodeNumber = (doc: Document, names: string[]) => {
  const value = xmlNodeText(doc, names).replace(',', '.');
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const extractRecebimentoDataFromXml = (xml: string) => {
  if (!xml.trim() || typeof DOMParser === 'undefined') {
    return null;
  }

  try {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length > 0) {
      return null;
    }

    const infNFe = Array.from(doc.getElementsByTagName('*')).find((node) => {
      const local = String(node.localName || node.nodeName || '').toLowerCase();
      return local === 'infnfe' || local.endsWith(':infnfe');
    });

    const rawId = String(infNFe?.getAttribute('Id') || '');
    const chaveAcesso = rawId.startsWith('NFe') ? rawId.slice(3) : rawId;
    const dataEmissaoRaw = xmlNodeText(doc, ['dhEmi', 'dEmi']);
    const dataEmissao = dataEmissaoRaw ? dataEmissaoRaw.slice(0, 10) : todayInputValue();

    const impostosCalculados = xmlNodeNumber(doc, ['vTotTrib'])
      || (xmlNodeNumber(doc, ['vIPI']) + xmlNodeNumber(doc, ['vII']) + xmlNodeNumber(doc, ['vICMSST']));

    return {
      numero: xmlNodeText(doc, ['nNF']),
      serie: xmlNodeText(doc, ['serie']) || '1',
      chaveAcesso,
      dataEmissao,
      valorFrete: String(xmlNodeNumber(doc, ['vFrete'])),
      valorImpostos: String(impostosCalculados),
      observacoes: xmlNodeText(doc, ['infCpl', 'xObs']),
    };
  } catch {
    return null;
  }
};

const extractFornecedorDocumentoFromXml = (xml: string) => {
  if (!xml.trim() || typeof DOMParser === 'undefined') {
    return '';
  }

  try {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length > 0) {
      return '';
    }

    const emitNode = Array.from(doc.getElementsByTagName('*')).find((node) => {
      const local = String(node.localName || node.nodeName || '').toLowerCase();
      return local === 'emit' || local.endsWith(':emit');
    });

    if (!emitNode) {
      return '';
    }

    const emitChildren = Array.from(emitNode.getElementsByTagName('*'));
    const getByNames = (names: string[]) => {
      const found = emitChildren.find((node) => {
        const local = String(node.localName || node.nodeName || '').toLowerCase();
        return names.some((name) => local === name.toLowerCase() || local.endsWith(`:${name.toLowerCase()}`));
      });
      return found?.textContent?.trim() || '';
    };

    return normalizeDocument(getByNames(['CNPJ']) || getByNames(['CPF']));
  } catch {
    return '';
  }
};

const buildRecebimentoManualForm = (pedido?: PedidoCompraItem | null): RecebimentoManualForm => {
  const hoje = todayInputValue();

  return {
    numero: '',
    serie: '1',
    chaveAcesso: '',
    dataEmissao: hoje,
    dataEntrada: hoje,
    valorFrete: '0',
    valorImpostos: '0',
    vencimento: hoje,
    observacoes: '',
    depositoDestinoId: '',
    nfeCnpj: {
      emitenteCnpj: '',
      emitenteIe: '',
      destinatarioCnpj: '',
      destinatarioIe: '',
      naturezaOperacao: '',
      cfopPrincipal: '',
      transportadoraNome: '',
      transportadoraCnpj: '',
      modalidadeFrete: '0',
      placaVeiculo: '',
      ufVeiculo: '',
    },
    itens: (pedido?.itens || []).map((item) => {
      const quantidade = Number(item.quantidade || 0);
      const quantidadeRecebida = Number(item.quantidadeRecebida || 0);
      const pendente = Math.max(quantidade - quantidadeRecebida, 0);

      return {
        itemId: item.id,
        produtoId: String(item.produtoId || ''),
        nome: item.produto?.nome || `Produto ${item.id.slice(0, 8)}`,
        quantidadePendente: pendente,
        quantidadeRecebida: pendente > 0 ? String(pendente) : '0',
        custoUnitario: String(Number(item.custoUnitario || 0)),
      };
    }),
  };
};

const buildCadastroRapidoProdutoForm = (tipo: CadastroRapidoProdutoForm['tipo'] = 'PRODUTO'): CadastroRapidoProdutoForm => ({
  tipo,
  nome: '',
  codigoInterno: '',
  codigoBarras: '',
  unidadeVenda: 'UN',
  grupoId: '',
  marcaId: '',
  custoAtual: '0',
  precoVenda: '0',
  markupAlvo: '',
  estoqueInicial: '0',
});

const applyXmlToRecebimentoForm = (
  form: RecebimentoManualForm,
  previewXml: PreviewXmlCompra | null,
  xmlCompra: string,
) => {
  const xmlData = extractRecebimentoDataFromXml(xmlCompra);
  const fornecedorDocumentoXml = extractFornecedorDocumentoFromXml(xmlCompra);
  const previewItems = previewXml?.itens || [];

  return {
    ...form,
    numero: xmlData?.numero || previewXml?.notaFiscal?.numero || form.numero,
    serie: xmlData?.serie || previewXml?.notaFiscal?.serie || form.serie,
    chaveAcesso: xmlData?.chaveAcesso || form.chaveAcesso,
    dataEmissao: xmlData?.dataEmissao || form.dataEmissao,
    valorFrete: xmlData?.valorFrete || form.valorFrete,
    valorImpostos: xmlData?.valorImpostos || form.valorImpostos,
    observacoes: xmlData?.observacoes || form.observacoes,
    nfeCnpj: {
      ...form.nfeCnpj,
      emitenteCnpj: fornecedorDocumentoXml || form.nfeCnpj.emitenteCnpj,
    },
    itens: form.itens.map((item) => {
      const match = previewItems.find((previewItem) => {
        if (previewItem.produtoEncontradoId && previewItem.produtoEncontradoId === item.produtoId) {
          return true;
        }

        const itemName = normalizeText(item.nome);
        const previewName = normalizeText(previewItem.produtoEncontradoNome || previewItem.nome);
        return itemName && previewName && (itemName.includes(previewName) || previewName.includes(itemName));
      });

      if (!match) {
        return item;
      }

      return {
        ...item,
        quantidadeRecebida: String(Math.min(Number(match.quantidade || 0), item.quantidadePendente)),
        custoUnitario: String(Number(match.custoUnitario || item.custoUnitario || 0)),
      };
    }),
  };
};

const buildObservacoesNfeCnpj = (form: RecebimentoManualForm) => {
  const base = form.observacoes.trim();
  const detalhes = [
    form.nfeCnpj.emitenteCnpj ? `Emitente CNPJ: ${form.nfeCnpj.emitenteCnpj}` : '',
    form.nfeCnpj.emitenteIe ? `Emitente IE: ${form.nfeCnpj.emitenteIe}` : '',
    form.nfeCnpj.destinatarioCnpj ? `Destinatario CNPJ: ${form.nfeCnpj.destinatarioCnpj}` : '',
    form.nfeCnpj.destinatarioIe ? `Destinatario IE: ${form.nfeCnpj.destinatarioIe}` : '',
    form.nfeCnpj.naturezaOperacao ? `Natureza operacao: ${form.nfeCnpj.naturezaOperacao}` : '',
    form.nfeCnpj.cfopPrincipal ? `CFOP principal: ${form.nfeCnpj.cfopPrincipal}` : '',
    form.nfeCnpj.transportadoraNome ? `Transportadora: ${form.nfeCnpj.transportadoraNome}` : '',
    form.nfeCnpj.transportadoraCnpj ? `Transportadora CNPJ: ${form.nfeCnpj.transportadoraCnpj}` : '',
    form.nfeCnpj.modalidadeFrete ? `Modalidade frete: ${form.nfeCnpj.modalidadeFrete}` : '',
    form.nfeCnpj.placaVeiculo ? `Placa veiculo: ${form.nfeCnpj.placaVeiculo}` : '',
    form.nfeCnpj.ufVeiculo ? `UF veiculo: ${form.nfeCnpj.ufVeiculo}` : '',
  ].filter(Boolean);

  if (detalhes.length === 0) {
    return base || undefined;
  }

  const blocoNfe = `[NFE-CNPJ]\n${detalhes.join('\n')}`;
  return [base, blocoNfe].filter(Boolean).join('\n\n');
};

const validarCamposNfeCnpj = (form: RecebimentoManualForm) => {
  const emitenteCnpj = normalizeDocument(form.nfeCnpj.emitenteCnpj);
  const destinatarioCnpj = normalizeDocument(form.nfeCnpj.destinatarioCnpj);
  const transportadoraCnpj = normalizeDocument(form.nfeCnpj.transportadoraCnpj);
  const ufVeiculo = String(form.nfeCnpj.ufVeiculo || '').trim().toUpperCase();
  const placaVeiculo = String(form.nfeCnpj.placaVeiculo || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const modalidadeFrete = String(form.nfeCnpj.modalidadeFrete || '0');
  const semFrete = modalidadeFrete === '9';

  if (!form.nfeCnpj.cfopPrincipal.trim()) {
    return 'Informe o CFOP principal na aba NF-e Compras (CNPJ).';
  }

  if (!form.nfeCnpj.naturezaOperacao.trim()) {
    return 'Informe a natureza da operação na aba NF-e Compras (CNPJ).';
  }

  if (emitenteCnpj.length !== 14) {
    return 'Informe um CNPJ válido do emitente (14 dígitos).';
  }

  if (!form.nfeCnpj.emitenteIe.trim()) {
    return 'Informe a Inscrição Estadual do emitente.';
  }

  if (destinatarioCnpj.length !== 14) {
    return 'Informe um CNPJ válido do destinatário (14 dígitos).';
  }

  if (!form.nfeCnpj.destinatarioIe.trim()) {
    return 'Informe a Inscrição Estadual do destinatário.';
  }

  if (!semFrete) {
    if (!form.nfeCnpj.transportadoraNome.trim()) {
      return 'Informe a transportadora para modalidade de frete com transporte.';
    }

    if (transportadoraCnpj.length !== 14) {
      return 'Informe um CNPJ válido da transportadora (14 dígitos).';
    }

    if (placaVeiculo.length < 7) {
      return 'Informe a placa do veículo (mínimo 7 caracteres).';
    }

    if (ufVeiculo.length !== 2) {
      return 'Informe a UF do veículo com 2 caracteres.';
    }
  }

  return '';
};

const getPedidoSugeridoTheme = (nivel: PedidoXmlSugerido['nivel']) => {
  if (nivel === 'alto') {
    return {
      label: 'Compatibilidade alta',
      color: '#1f6f43',
      background: '#eaf7f0',
      border: '#b7ddc4',
    };
  }

  if (nivel === 'medio') {
    return {
      label: 'Compatibilidade media',
      color: '#8a5a16',
      background: '#fff6e8',
      border: '#ead2a4',
    };
  }

  return {
    label: 'Compatibilidade baixa',
    color: '#7d4a4a',
    background: '#fff1f1',
    border: '#e8c4c4',
  };
};

export default function Estoque() {
  const routeBase = getRouteBaseFromHash();
  const isServicosView = routeBase === 'servicos';
  const isEstoqueView = routeBase === 'estoque';
  const isComprasXmlView = routeBase === 'compras';
  const isNovosPedidosView = routeBase === 'novos-pedidos';
  const isComprasModuleView = isComprasXmlView || isNovosPedidosView;
  const cadastroRapidoTipoPadrao = isServicosView ? 'SERVICO' : 'PRODUTO';
  const catalogoDefaultParams = isServicosView ? { tipo: 'SERVICO' } : {};
  const catalogoDefaultLabel = isComprasModuleView
    ? 'Central de compras'
    : isServicosView
      ? 'Serviços'
      : 'Estoque (produtos)';
  const [analise, setAnalise] = useState<AnaliseEstoque | null>(null);
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([]);
  const [atalhos, setAtalhos] = useState<AtalhoOperacional[]>([]);
  const [sugestoesCompra, setSugestoesCompra] = useState<SugestaoCompraItem[]>([]);
  const [pedidosAbertos, setPedidosAbertos] = useState<PedidoCompraItem[]>([]);
  const [pedidosCompra, setPedidosCompra] = useState<PedidoCompraItem[]>([]);
  const [notasCompra, setNotasCompra] = useState<NotaFiscalCompra[]>([]);
  const [fornecedoresFiltro, setFornecedoresFiltro] = useState<FornecedorFiltro[]>([]);
  const [gruposCadastro, setGruposCadastro] = useState<GrupoCadastro[]>([]);
  const [marcasCadastro, setMarcasCadastro] = useState<MarcaCadastro[]>([]);
  const [depositos, setDepositos] = useState<DepositoOption[]>([]);
  const [pedidoDetalhe, setPedidoDetalhe] = useState<PedidoCompraItem | null>(null);
  const [notaDetalhe, setNotaDetalhe] = useState<NotaFiscalCompra | null>(null);
  const [recebimentoManual, setRecebimentoManual] = useState<RecebimentoManualForm>(buildRecebimentoManualForm(null));
  const [busca, setBusca] = useState('');
  const [compraFiltros, setCompraFiltros] = useState<CompraFiltros>({
    q: '',
    numeroNota: '',
    fornecedorId: '',
    inicio: '',
    fim: '',
    statusPedido: '',
  });
  const [filtroAtivo, setFiltroAtivo] = useState('Catalogo completo');
  const [xmlCompra, setXmlCompra] = useState('');
  const [xmlFileName, setXmlFileName] = useState('');
  const [previewXml, setPreviewXml] = useState<PreviewXmlCompra | null>(null);
  const [importacaoXmlResumo, setImportacaoXmlResumo] = useState<ImportacaoXmlResumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAtalho, setLoadingAtalho] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [filtroProdutosServicos, setFiltroProdutosServicos] = useState<FiltroProdutosServicos>('TODOS');
  const [fracionamentoItens, setFracionamentoItens] = useState<Record<string, FracionamentoItemForm>>({});
  const [novoPedidoPasso, setNovoPedidoPasso] = useState(1);
  const [novoPedidoFornecedorId, setNovoPedidoFornecedorId] = useState('');
  const [novoPedidoItens, setNovoPedidoItens] = useState<NovoPedidoWizardItem[]>([]);
  const [novoPedidoObservacoes, setNovoPedidoObservacoes] = useState('');
  const [novoPedidoValorFrete, setNovoPedidoValorFrete] = useState('0');
  const [novoPedidoValorImpostos, setNovoPedidoValorImpostos] = useState('0');
  const [novoPedidoBuscaCatalogo, setNovoPedidoBuscaCatalogo] = useState('');
  const [confirmacaoDuplicidadeNovoPedido, setConfirmacaoDuplicidadeNovoPedido] = useState(false);
  const [novoPedidoSalvando, setNovoPedidoSalvando] = useState(false);
  const [ultimoPedidoSugeridoAbertoId, setUltimoPedidoSugeridoAbertoId] = useState('');
  const [confirmacaoRiscoRecebimento, setConfirmacaoRiscoRecebimento] = useState(false);
  const [mostrarSomenteRiscoAlto, setMostrarSomenteRiscoAlto] = useState(false);
  const [atalhosCascataAberto, setAtalhosCascataAberto] = useState<string | null>('pesquisa');
  const [cadastroRapidoAberto, setCadastroRapidoAberto] = useState(false);
  const [cadastroRapidoProduto, setCadastroRapidoProduto] = useState<CadastroRapidoProdutoForm>(buildCadastroRapidoProdutoForm(cadastroRapidoTipoPadrao));

  const token = localStorage.getItem('token');

  const getHashState = (): EstoqueHashState => {
    if (typeof window === 'undefined') return {};
    const rawHash = window.location.hash || '';
    if (!rawHash.startsWith(`#${routeBase}`)) return {};

    const queryIndex = rawHash.indexOf('?');
    if (queryIndex === -1) return {};

    const query = rawHash.slice(queryIndex + 1);
    const params = new URLSearchParams(query);
    const atalho = params.get('atalho') || undefined;
    const q = params.get('q') || undefined;

    return { atalho, q };
  };

  const setHashState = (state: EstoqueHashState) => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    if (state.atalho) params.set('atalho', state.atalho);
    if (state.q) params.set('q', state.q);

    const query = params.toString();
    window.history.replaceState(null, '', query ? `#${routeBase}?${query}` : `#${routeBase}`);
  };

  const buildQuery = (params: Record<string, string | boolean | number | undefined>) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === '') return;
      searchParams.set(key, String(value));
    });
    const query = searchParams.toString();
    return query ? `?${query}` : '';
  };

  const carregarCatalogo = async (params: Record<string, string | boolean | number | undefined>, descricaoFiltro: string) => {
    setLoadingAtalho(true);
    const data = await api.get(`/estoque/catalogo/itens${buildQuery(params)}`, token);
    setCatalogo(Array.isArray(data) ? data : []);
    setFiltroAtivo(descricaoFiltro);
    setLoadingAtalho(false);
  };

  const carregarSugestoesCompra = async () => {
    setLoadingAtalho(true);
    const data = await api.get('/estoque/compras/sugestoes?coberturaDias=30', token);
    setSugestoesCompra(Array.isArray(data) ? data : []);
    setLoadingAtalho(false);
  };

  const carregarPedidosAbertos = async () => {
    setLoadingAtalho(true);
    const data = await api.get('/estoque/compras/pedidos?status=SOLICITADO', token);
    setPedidosAbertos(Array.isArray(data) ? data : []);
    setLoadingAtalho(false);
  };

  const carregarFornecedoresFiltro = async () => {
    const data = await api.get('/cadastros/fornecedores', token);
    setFornecedoresFiltro(Array.isArray(data) ? data.map((item: any) => ({ id: String(item.id), nome: String(item.nome || 'Fornecedor') })) : []);
  };

  const carregarDepositos = async () => {
    const data = await api.get('/estoque/depositos', token);
    setDepositos(Array.isArray(data) ? data.map((item: any) => ({ id: String(item.id), nome: String(item.nome || 'Deposito') })) : []);
  };

  const carregarBasesCadastroRapido = async () => {
    const [gruposData, marcasData] = await Promise.all([
      api.get('/estoque/grupos', token),
      api.get('/cadastros/marcas', token),
    ]);

    setGruposCadastro(Array.isArray(gruposData)
      ? gruposData.map((item: any) => ({ id: String(item.id), nome: String(item.nome || 'Grupo') }))
      : []);
    setMarcasCadastro(Array.isArray(marcasData)
      ? marcasData.map((item: any) => ({ id: String(item.id), nome: String(item.nome || 'Marca') }))
      : []);
  };

  const carregarCentralCompras = async (filtros: CompraFiltros, options: { exibirLoading?: boolean } = {}) => {
    const exibirLoading = options.exibirLoading ?? true;

    try {
      if (exibirLoading) setLoadingAtalho(true);

      const pedidoParams = new URLSearchParams();
      const notaParams = new URLSearchParams();

      if (filtros.q.trim()) {
        pedidoParams.set('q', filtros.q.trim());
      }

      if (filtros.fornecedorId) {
        pedidoParams.set('fornecedorId', filtros.fornecedorId);
        notaParams.set('fornecedorId', filtros.fornecedorId);
      }

      if (filtros.inicio) {
        pedidoParams.set('inicio', filtros.inicio);
        notaParams.set('inicio', filtros.inicio);
      }

      if (filtros.fim) {
        pedidoParams.set('fim', filtros.fim);
        notaParams.set('fim', filtros.fim);
      }

      const statusPedidoNormalizado = normalizeStatusPedidoCompra(filtros.statusPedido);
      if (statusPedidoNormalizado) {
        pedidoParams.set('status', statusPedidoNormalizado);
        notaParams.set('statusPedido', statusPedidoNormalizado);
      }

      const [pedidos, notas] = await Promise.all([
        api.get(`/estoque/compras/pedidos${pedidoParams.toString() ? `?${pedidoParams.toString()}` : ''}`, token),
        api.get(`/estoque/compras/notas-fiscais${notaParams.toString() ? `?${notaParams.toString()}` : ''}`, token),
      ]);

      const pedidosLista = (Array.isArray(pedidos) ? pedidos : []).map((pedido) => ({
        ...pedido,
        valorProdutos: normalizeLegacyMoney(pedido?.valorProdutos),
        valorFrete: normalizeLegacyMoney((pedido as any)?.valorFrete),
        valorImpostos: normalizeLegacyMoney((pedido as any)?.valorImpostos),
        valorTotal: normalizeLegacyMoney(pedido?.valorTotal),
        itens: Array.isArray(pedido?.itens)
          ? pedido.itens.map((item: any) => ({
              ...item,
              custoUnitario: normalizeLegacyMoney(item?.custoUnitario),
              valorTotal: normalizeLegacyMoney(item?.valorTotal),
            }))
          : pedido?.itens,
      }));

      const notasLista = (Array.isArray(notas) ? notas : []).map((nota) => ({
        ...nota,
        valorTotal: normalizeLegacyMoney(nota?.valorTotal),
        valorFrete: normalizeLegacyMoney(nota?.valorFrete),
        valorImpostos: normalizeLegacyMoney(nota?.valorImpostos),
      }));
      const numeroNota = filtros.numeroNota.trim().toLowerCase();
      const notasFiltradas = numeroNota
        ? notasLista.filter((nota) => String(nota.numero || '').toLowerCase().includes(numeroNota))
        : notasLista;

      setPedidosCompra(pedidosLista);
      setPedidosAbertos(pedidosLista.filter((pedido) => isStatusPedidoCompraAberto(pedido.status)));
      setNotasCompra(notasFiltradas);
    } finally {
      if (exibirLoading) setLoadingAtalho(false);
    }
  };

  const carregarAtalhos = async () => {
    const data = await api.get('/estoque/atalhos-operacionais', token);
    setAtalhos(Array.isArray(data?.atalhos) ? data.atalhos : []);
  };

  const importarXmlCompra = async () => {
    if (!xmlCompra.trim()) {
      setErro('Cole o conteudo XML da NF-e para importar.');
      return;
    }

    try {
      setLoadingAtalho(true);
      setErro('');
      setSucesso('');
      setImportacaoXmlResumo(null);
      setPreviewXml(null);
      setUltimoPedidoSugeridoAbertoId('');

      const resultado = await api.post('/estoque/compras/notas-fiscais/importar-xml', {
        xml: xmlCompra,
        criarProdutosNovos: true,
        atualizarCustoProduto: true,
      }, token);

      setImportacaoXmlResumo(resultado?.resumo || null);
      setXmlCompra('');
      setXmlFileName('');

      await Promise.all([
        carregar(),
        carregarSugestoesCompra(),
        carregarPedidosAbertos(),
      ]);
    } catch (error) {
      console.error(error);
      setErro('Falha ao importar XML da NF-e. Verifique se o XML contem itens e chave de acesso validos.');
    } finally {
      setLoadingAtalho(false);
    }
  };

  const previewImportacaoXmlCompra = async () => {
    if (!xmlCompra.trim()) {
      setErro('Cole ou carregue o XML da NF-e para pre-visualizar.');
      return;
    }

    try {
      setLoadingAtalho(true);
      setErro('');
      setSucesso('');
      setUltimoPedidoSugeridoAbertoId('');
      const preview = await api.post('/estoque/compras/notas-fiscais/preview-xml', { xml: xmlCompra }, token);
      setPreviewXml(preview || null);
    } catch (error) {
      console.error(error);
      setErro('Falha ao gerar pre-visualizacao do XML. Verifique o conteudo da nota.');
    } finally {
      setLoadingAtalho(false);
    }
  };

  const carregarArquivoXml = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const conteudo = await file.text();
      setXmlCompra(conteudo);
      setXmlFileName(file.name);
      invalidarPreviewXml();
      setErro('');
      setSucesso('');
    } catch (error) {
      console.error(error);
      setErro('Nao foi possivel ler o arquivo XML selecionado.');
    }
  };

  const carregar = async () => {
    try {
      setLoading(true);
      setErro('');
      setSucesso('');
      const hashState = getHashState();
      const [dataAnalise] = await Promise.all([
        api.get('/estoque/analise', token),
        carregarAtalhos(),
        carregarCatalogo(catalogoDefaultParams, catalogoDefaultLabel),
        carregarBasesCadastroRapido(),
      ]);
      setAnalise(dataAnalise);

      if (hashState.q) {
        setBusca(hashState.q);
      }
      if (hashState.atalho) {
        await aplicarAtalho(hashState.atalho, { persistirHash: false, buscaForcada: hashState.q });
      } else if (isComprasModuleView) {
        await Promise.all([
          carregarFornecedoresFiltro(),
          carregarDepositos(),
          carregarCentralCompras(compraFiltros, { exibirLoading: false }),
          carregarSugestoesCompra(),
        ]);
      }
    } catch (error) {
      console.error(error);
      setErro('Nao foi possivel carregar a analise de estoque. Verifique se a API esta rodando e se a migration foi aplicada.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    setCadastroRapidoProduto((current) => ({
      ...buildCadastroRapidoProdutoForm(cadastroRapidoTipoPadrao),
      tipo: cadastroRapidoTipoPadrao,
    }));
  }, [cadastroRapidoTipoPadrao]);

  const itens = analise?.itens ?? [];
  const saldoTotal = useMemo(() => itens.reduce((total, item) => total + item.disponivel, 0), [itens]);
  const totalNotasCompra = useMemo(() => notasCompra.reduce((acc, item) => acc + Number(item.valorTotal || 0), 0), [notasCompra]);
  const pedidosPendentes = useMemo(() => pedidosCompra.filter((item) => isStatusPedidoCompraAberto(item.status)).length, [pedidosCompra]);
  const catalogoPorContexto = useMemo(() => {
    if (isServicosView) {
      return catalogo.filter((item) => String(item.tipo || '').toUpperCase() === 'SERVICO');
    }

    if (isEstoqueView) {
      return catalogo.filter((item) => String(item.tipo || '').toUpperCase() !== 'SERVICO');
    }

    return catalogo;
  }, [catalogo, isServicosView, isEstoqueView]);

  const indicadoresProdutosServicos = useMemo(() => {
    const vencidos = catalogoPorContexto.filter((item) => isValidadeVencida(item.statusValidade)).length;
    const vencendo60 = catalogoPorContexto.filter((item) => isValidadeVencendo60(item.statusValidade)).length;
    const semGrupo = catalogoPorContexto.filter((item) => !String(item.grupo || '').trim()).length;
    const baixoEstoque = catalogoPorContexto.filter((item) => Number(item.estoqueAtual || 0) <= Number(item.estoqueMinimo || 0)).length;

    return { vencidos, vencendo60, semGrupo, baixoEstoque };
  }, [catalogoPorContexto]);
  const catalogoProdutosServicos = useMemo(() => {
    if (filtroProdutosServicos === 'VENCIDOS') {
      return catalogoPorContexto.filter((item) => isValidadeVencida(item.statusValidade));
    }

    if (filtroProdutosServicos === 'VENCENDO_60') {
      return catalogoPorContexto.filter((item) => isValidadeVencendo60(item.statusValidade));
    }

    if (filtroProdutosServicos === 'SEM_GRUPO') {
      return catalogoPorContexto.filter((item) => !String(item.grupo || '').trim());
    }

    if (filtroProdutosServicos === 'BAIXO_ESTOQUE') {
      return catalogoPorContexto.filter((item) => Number(item.estoqueAtual || 0) <= Number(item.estoqueMinimo || 0));
    }

    return catalogoPorContexto;
  }, [catalogoPorContexto, filtroProdutosServicos]);

  const filtroCatalogoBaseLabel = isComprasModuleView
    ? 'Central de compras'
    : isServicosView
      ? 'Catalogo de servicos'
      : 'Catalogo completo';

  const resumoOperacionalCards = useMemo(() => {
    if (isServicosView) {
      const servicosProntos = Math.max(catalogoPorContexto.length - indicadoresProdutosServicos.semGrupo, 0);

      return [
        { icon: Boxes, label: 'Servicos ativos', value: catalogoPorContexto.length, tone: '#2f6f73' },
        { icon: ClipboardCheck, label: 'Cadastro pronto', value: servicosProntos, tone: '#54736b' },
        { icon: AlertTriangle, label: 'Validade vencida', value: indicadoresProdutosServicos.vencidos, tone: '#a64b4b' },
        { icon: PackagePlus, label: 'Vencendo em 60 dias', value: indicadoresProdutosServicos.vencendo60, tone: '#9a6a2f' },
      ];
    }

    return [
      { icon: Boxes, label: 'Produtos ativos', value: analise?.totalProdutos ?? 0, tone: '#2f6f73' },
      { icon: Warehouse, label: 'Disponivel', value: `${saldoTotal} un`, tone: '#54736b' },
      { icon: AlertTriangle, label: 'Rupturas', value: analise?.rupturas.length ?? 0, tone: '#a64b4b' },
      { icon: PackagePlus, label: 'Estoque baixo', value: analise?.baixoEstoque.length ?? 0, tone: '#9a6a2f' },
    ];
  }, [analise, catalogoPorContexto.length, indicadoresProdutosServicos.semGrupo, indicadoresProdutosServicos.vencendo60, indicadoresProdutosServicos.vencidos, isServicosView, saldoTotal]);

  const insightsIaOperacionais = useMemo(() => {
    const insights: Array<{
      id: string;
      nivel: 'alto' | 'medio' | 'baixo';
      titulo: string;
      descricao: string;
      acao: string;
      onClick?: () => void;
    }> = [];

    if ((analise?.rupturas.length || 0) > 0) {
      insights.push({
        id: 'rupturas',
        nivel: 'alto',
        titulo: 'Risco de ruptura detectado',
        descricao: `${analise?.rupturas.length || 0} item(ns) sem disponibilidade. Recomenda-se priorizar compra imediata.`,
        acao: 'Filtrar ruptura',
        onClick: () => aplicarAtalho('EST-AT-05'),
      });
    }

    if ((analise?.baixoEstoque.length || 0) > 0) {
      insights.push({
        id: 'baixo-estoque',
        nivel: 'medio',
        titulo: 'Reposição preventiva sugerida',
        descricao: `${analise?.baixoEstoque.length || 0} item(ns) abaixo do nível mínimo com potencial impacto em vendas.`,
        acao: 'Listar baixo estoque',
        onClick: () => aplicarAtalho('EST-AT-06'),
      });
    }

    if (indicadoresProdutosServicos.vencidos > 0 || indicadoresProdutosServicos.vencendo60 > 0) {
      insights.push({
        id: 'validade',
        nivel: indicadoresProdutosServicos.vencidos > 0 ? 'alto' : 'medio',
        titulo: 'Produtos com risco de validade',
        descricao: `${indicadoresProdutosServicos.vencidos} vencido(s) e ${indicadoresProdutosServicos.vencendo60} vencendo em até 60 dias no catálogo.`,
        acao: 'Ver vencidos',
        onClick: () => setFiltroProdutosServicos('VENCIDOS'),
      });
    }

    if (indicadoresProdutosServicos.semGrupo > 0) {
      insights.push({
        id: 'cadastro',
        nivel: 'baixo',
        titulo: 'Padronização de cadastro recomendada',
        descricao: `${indicadoresProdutosServicos.semGrupo} item(ns) sem grupo definido, o que reduz qualidade analítica de compras.`,
        acao: 'Ver sem grupo',
        onClick: () => setFiltroProdutosServicos('SEM_GRUPO'),
      });
    }

    if (isComprasModuleView && pedidosPendentes > 0) {
      insights.push({
        id: 'compras-pendentes',
        nivel: 'medio',
        titulo: 'Pedidos pendentes para recebimento',
        descricao: `${pedidosPendentes} pedido(s) em aberto na central de compras. Priorize conferência e recebimento fiscal.`,
        acao: 'Focar pendentes',
        onClick: () => setCompraFiltros((current) => ({ ...current, statusPedido: 'SOLICITADO' })),
      });
    }

    return insights.slice(0, 4);
  }, [analise, indicadoresProdutosServicos, isComprasModuleView, pedidosPendentes]);
  const pedidoSugeridoXml = useMemo<PedidoXmlSugerido | null>(() => {
    if (!isComprasXmlView || !previewXml?.itens?.length || pedidosCompra.length === 0) {
      return null;
    }

    const fornecedorXml = normalizeText(previewXml.notaFiscal?.fornecedorNome);
    const fornecedorDocumentoXml = extractFornecedorDocumentoFromXml(xmlCompra);
    const emissaoXml = extractRecebimentoDataFromXml(xmlCompra)?.dataEmissao || '';
    const totalItensXml = previewXml.itens.reduce((acc, item) => acc + Number(item.quantidade || 0), 0);
    const totalValorXml = Number(previewXml.notaFiscal?.valorTotal || 0);
    let melhor: PedidoXmlSugerido | null = null;

    for (const pedido of pedidosCompra) {
      const status = normalizeStatusPedidoCompra(pedido.status);
      if (status === 'CANCELADO' || status === 'RECEBIDO') {
        continue;
      }

      let score = 0;
      const motivos: string[] = [];
      const alertas: string[] = [];
      let pontosFornecedor = 0;
      let pontosItens = 0;
      let pontosCusto = 0;
      let pontosQuantidade = 0;
      let pontosValor = 0;
      let pontosDataStatus = 0;
      const fornecedorPedido = normalizeText(pedido.fornecedor?.nome);
      const fornecedorPedidoDocumento = normalizeDocument(pedido.fornecedor?.cnpj || pedido.fornecedor?.documento);

      if (fornecedorDocumentoXml && fornecedorPedidoDocumento && fornecedorDocumentoXml === fornecedorPedidoDocumento) {
        score += 55;
        pontosFornecedor += 55;
        motivos.push('CNPJ/CPF do fornecedor idêntico');
      }

      if (fornecedorXml && fornecedorPedido && fornecedorXml === fornecedorPedido) {
        score += 28;
        pontosFornecedor += 28;
        motivos.push('fornecedor idêntico');
      }

      let itensComMatch = 0;
      let itensComCustoCompativel = 0;
      let quantidadeCasada = 0;
      for (const xmlItem of previewXml.itens) {
        const match = (pedido.itens || []).find((pedidoItem) => {
          if (xmlItem.produtoEncontradoId && pedidoItem.produtoId && xmlItem.produtoEncontradoId === pedidoItem.produtoId) {
            return true;
          }

          const nomePedido = normalizeText(pedidoItem.produto?.nome);
          const nomeXml = normalizeText(xmlItem.produtoEncontradoNome || xmlItem.nome);
          return nomePedido && nomeXml && (nomePedido.includes(nomeXml) || nomeXml.includes(nomePedido));
        });

        if (match) {
          itensComMatch += 1;
          const quantidadePendente = Math.max(Number(match.quantidade || 0) - Number(match.quantidadeRecebida || 0), 0);
          quantidadeCasada += Math.min(Number(xmlItem.quantidade || 0), quantidadePendente || Number(match.quantidade || 0));

          const custoXml = Number(xmlItem.custoUnitario || 0);
          const custoPedido = Number(match.custoUnitario || 0);
          if (custoXml > 0 && custoPedido > 0) {
            const diffCusto = Math.abs(custoXml - custoPedido) / Math.max(custoXml, custoPedido);
            if (diffCusto <= 0.12) {
              itensComCustoCompativel += 1;
            }
          }
        }
      }

      if (itensComMatch > 0) {
        const pontosItensMatch = itensComMatch * 14;
        score += pontosItensMatch;
        pontosItens += pontosItensMatch;
        motivos.push(`${itensComMatch} item(ns) compatíveis`);
      }

      if (itensComCustoCompativel > 0) {
        const pontosCustoCompativel = Math.min(itensComCustoCompativel * 6, 18);
        score += pontosCustoCompativel;
        pontosCusto += pontosCustoCompativel;
        motivos.push(`${itensComCustoCompativel} item(ns) com custo unitário próximo`);
      } else if (itensComMatch >= 2) {
        alertas.push('itens com match, mas custo unitário diverge do pedido');
      }

      const itensPedidoPendentes = (pedido.itens || []).reduce((acc, item) => acc + Math.max(Number(item.quantidade || 0) - Number(item.quantidadeRecebida || 0), 0), 0);
      const coberturaQuantidade = totalItensXml > 0 ? quantidadeCasada / totalItensXml : 0;
      const aderenciaQuantidadePedido = itensPedidoPendentes > 0 ? quantidadeCasada / itensPedidoPendentes : 0;

      if (coberturaQuantidade >= 0.85 || aderenciaQuantidadePedido >= 0.85) {
        score += 18;
        pontosQuantidade += 18;
        motivos.push('quantidades muito próximas');
      } else if (coberturaQuantidade >= 0.55 || aderenciaQuantidadePedido >= 0.55) {
        score += 10;
        pontosQuantidade += 10;
        motivos.push('quantidades parcialmente compatíveis');
      } else if (itensComMatch > 0) {
        alertas.push('quantidade total com baixa aderência ao pedido');
      }

      const valorPedido = Number(pedido.valorTotal || pedido.valorProdutos || 0);
      if (totalValorXml > 0 && valorPedido > 0) {
        const diferencaPercentual = Math.abs(totalValorXml - valorPedido) / Math.max(totalValorXml, valorPedido);
        if (diferencaPercentual <= 0.12) {
          score += 16;
          pontosValor += 16;
          motivos.push('valor total muito próximo');
        } else if (diferencaPercentual <= 0.25) {
          score += 8;
          pontosValor += 8;
          motivos.push('valor total compatível');
        } else if (diferencaPercentual > 0.35) {
          alertas.push('valor total distante do pedido');
        }
      }

      if (emissaoXml && pedido.createdAt) {
        const emissaoDate = new Date(`${emissaoXml}T00:00:00`);
        const createdAtDate = new Date(pedido.createdAt);
        if (!Number.isNaN(emissaoDate.getTime()) && !Number.isNaN(createdAtDate.getTime())) {
          const diffDias = Math.abs(emissaoDate.getTime() - createdAtDate.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDias <= 3) {
            score += 8;
            pontosDataStatus += 8;
            motivos.push('data da nota próxima da criação do pedido');
          } else if (diffDias <= 10) {
            score += 4;
            pontosDataStatus += 4;
            motivos.push('data da nota compatível com o pedido');
          } else if (diffDias > 30) {
            alertas.push('data da nota distante da criação do pedido');
          }
        }
      }

      if (status === 'SOLICITADO') {
        score += 8;
        pontosDataStatus += 8;
      }
      if (status === 'RECEBIDO_PARCIAL') {
        score += 4;
        pontosDataStatus += 4;
      }

      const nivel: PedidoXmlSugerido['nivel'] = score >= 70 ? 'alto' : score >= 50 ? 'medio' : 'baixo';
      const criterios: PedidoXmlSugerido['criterios'] = [
        { label: 'Fornecedor e documento', pontos: pontosFornecedor, maximo: 83 },
        { label: 'Itens compatíveis', pontos: pontosItens, maximo: Math.max(14, previewXml.itens.length * 14) },
        { label: 'Custo unitário', pontos: pontosCusto, maximo: 18 },
        { label: 'Quantidade', pontos: pontosQuantidade, maximo: 18 },
        { label: 'Valor total', pontos: pontosValor, maximo: 16 },
        { label: 'Data e status', pontos: pontosDataStatus, maximo: 16 },
      ];

      if (!melhor || score > melhor.score) {
        melhor = { pedido, score, motivos, alertas, nivel, criterios };
      }
    }

    return melhor && melhor.score >= 45 ? melhor : null;
  }, [isComprasXmlView, previewXml, pedidosCompra, xmlCompra]);

  const aplicarFiltroFornecedorCompra = async (fornecedorId?: string | null) => {
    if (!fornecedorId) return;

    const proximosFiltros = { ...compraFiltros, fornecedorId };
    setCompraFiltros(proximosFiltros);
    await carregarCentralCompras(proximosFiltros);
  };

  const resolverFornecedorIdDoPedido = (pedido: PedidoCompraItem) => {
    const direto = String(pedido.fornecedor?.id || '').trim();
    if (direto) return direto;

    const nomeFornecedor = normalizeText(pedido.fornecedor?.nome);
    if (!nomeFornecedor) return '';

    return fornecedoresFiltro.find((item) => normalizeText(item.nome) === nomeFornecedor)?.id || '';
  };

  const abrirDetalhePedido = (pedido: PedidoCompraItem) => {
    setPedidoDetalhe(pedido);
    setRecebimentoManual(buildRecebimentoManualForm(pedido));
    setFracionamentoItens(() => {
      const next: Record<string, FracionamentoItemForm> = {};
      (pedido.itens || []).forEach((item) => {
        next[item.id] = { fatorConversao: '1', unidadeFracionada: 'UN' };
      });
      return next;
    });
    setConfirmacaoRiscoRecebimento(false);
    setMostrarSomenteRiscoAlto(false);
    setErro('');
    setSucesso('');
  };

  const invalidarPreviewXml = () => {
    setPreviewXml(null);
    setImportacaoXmlResumo(null);
    setUltimoPedidoSugeridoAbertoId('');
  };

  const handleXmlCompraChange = (value: string) => {
    setXmlCompra(value);
    invalidarPreviewXml();
    setConfirmacaoRiscoRecebimento(false);
  };

  const recebimentoItensComFracionamento = useMemo(() => {
    return recebimentoManual.itens.map((item) => {
      const fracionamento = fracionamentoItens[item.itemId] || { fatorConversao: '1', unidadeFracionada: 'UN' };
      const fator = Math.max(1, Number(fracionamento.fatorConversao || 1));
      const quantidadeRecebida = Number(item.quantidadeRecebida || 0);
      const quantidadeEstoquePrevista = Number((quantidadeRecebida * fator).toFixed(2));
      const custoRecebido = Number(item.custoUnitario || 0);
      const custoUnitarioFracionado = fator > 0 ? Number((custoRecebido / fator).toFixed(4)) : custoRecebido;

      return {
        ...item,
        fator,
        unidadeFracionada: fracionamento.unidadeFracionada || 'UN',
        quantidadeRecebida,
        quantidadeEstoquePrevista,
        custoRecebido,
        custoUnitarioFracionado,
      };
    });
  }, [recebimentoManual.itens, fracionamentoItens]);

  const resumoFracionamento = useMemo(() => {
    const totalCompra = recebimentoItensComFracionamento.reduce((acc, item) => acc + item.quantidadeRecebida, 0);
    const totalEstoque = recebimentoItensComFracionamento.reduce((acc, item) => acc + item.quantidadeEstoquePrevista, 0);
    return { totalCompra, totalEstoque };
  }, [recebimentoItensComFracionamento]);

  const divergenciasRecebimentoIa = useMemo<DivergenciaItemRecebimento[]>(() => {
    if (!pedidoDetalhe) return [];

    return recebimentoItensComFracionamento.map((item) => {
      const itemPedido = (pedidoDetalhe.itens || []).find((linha) => linha.id === item.itemId);
      const custoPedido = Number(itemPedido?.custoUnitario || 0);
      const quantidadePendente = Number(item.quantidadePendente || 0);
      const observacoes: string[] = [];
      let score = 100;

      if (quantidadePendente > 0) {
        const diffQtd = Math.abs(item.quantidadeRecebida - quantidadePendente) / Math.max(quantidadePendente, 1);
        if (diffQtd > 0.3) {
          score -= 35;
          observacoes.push('quantidade recebida distante do pendente');
        } else if (diffQtd > 0.12) {
          score -= 18;
          observacoes.push('quantidade recebida parcialmente divergente');
        }
      }

      if (custoPedido > 0 && item.custoRecebido > 0) {
        const diffCusto = Math.abs(item.custoRecebido - custoPedido) / Math.max(custoPedido, item.custoRecebido);
        if (diffCusto > 0.2) {
          score -= 35;
          observacoes.push('custo unitário diverge do pedido');
        } else if (diffCusto > 0.1) {
          score -= 18;
          observacoes.push('custo unitário com variação moderada');
        }
      }

      if (item.fator > 1 && item.quantidadeEstoquePrevista > item.quantidadeRecebida * 5) {
        score -= 15;
        observacoes.push('fracionamento elevado, revisar conversão');
      }

      const nivel: DivergenciaItemRecebimento['nivel'] = score >= 80 ? 'baixo' : score >= 60 ? 'medio' : 'alto';

      return {
        itemId: item.itemId,
        nome: item.nome,
        score: Math.max(0, score),
        nivel,
        observacoes,
        quantidadePendente,
        quantidadeRecebida: item.quantidadeRecebida,
        quantidadeEstoquePrevista: item.quantidadeEstoquePrevista,
        custoPedido,
        custoRecebido: item.custoRecebido,
      };
    });
  }, [pedidoDetalhe, recebimentoItensComFracionamento]);

  const iniciarWizardNovoPedido = () => {
    setNovoPedidoPasso(1);
    setNovoPedidoFornecedorId((current) => current || fornecedoresRankingNovoPedido[0]?.id || fornecedoresFiltro[0]?.id || '');
    setConfirmacaoDuplicidadeNovoPedido(false);
    setErro('');
    setSucesso('');
    if (novoPedidoItens.length === 0) {
      setNovoPedidoItens(
        sugestoesCompra.slice(0, 5).map((item) => ({
          id: `sug-${item.itemId}`,
          produtoId: item.itemId,
          nome: item.nomeItem,
          quantidade: String(Math.max(1, Number(item.quantidadeSugerida || 1))),
          custoUnitario: String(custoSugeridoPorProduto.get(item.itemId) || 0),
          origem: 'sugestao',
        })),
      );
    }
  };

  const adicionarSugestaoAoWizard = (sugestao: SugestaoCompraItem) => {
    setNovoPedidoItens((current) => {
      const existente = current.find((item) => item.produtoId === sugestao.itemId);
      if (existente) {
        return current.map((item) => item.id === existente.id
          ? {
              ...item,
              quantidade: String(
                Math.max(
                  1,
                  Number(item.quantidade || 0) + Math.max(1, Number(sugestao.quantidadeSugerida || 1)),
                ),
              ),
            }
          : item);
      }

      return [
        ...current,
        {
          id: `sug-${sugestao.itemId}-${Date.now()}`,
          produtoId: sugestao.itemId,
          nome: sugestao.nomeItem,
          quantidade: String(Math.max(1, Number(sugestao.quantidadeSugerida || 1))),
          custoUnitario: String(custoSugeridoPorProduto.get(sugestao.itemId) || 0),
          origem: 'sugestao',
        },
      ];
    });

    setConfirmacaoDuplicidadeNovoPedido(false);

    if (novoPedidoPasso < 2) {
      setNovoPedidoPasso(2);
    }
  };

  const adicionarItemManualAoWizard = (itemCatalogo: CatalogoItem) => {
    if (!itemCatalogo.id) return;

    setNovoPedidoItens((current) => {
      const existente = current.find((item) => item.produtoId === itemCatalogo.id);
      if (existente) {
        return current.map((item) => item.id === existente.id
          ? { ...item, quantidade: String(Math.max(1, Number(item.quantidade || 0) + 1)) }
          : item);
      }

      return [
        ...current,
        {
          id: `man-${itemCatalogo.id}-${Date.now()}`,
          produtoId: itemCatalogo.id,
          nome: itemCatalogo.nome,
          quantidade: '1',
          custoUnitario: String(custoSugeridoPorProduto.get(itemCatalogo.id) || 0),
          origem: 'manual',
        },
      ];
    });

    setConfirmacaoDuplicidadeNovoPedido(false);

    if (novoPedidoPasso < 2) {
      setNovoPedidoPasso(2);
    }
  };

  const concluirWizardNovoPedido = async () => {
    if (!novoPedidoFornecedorId) {
      setErro('Selecione um fornecedor para concluir o novo pedido.');
      return;
    }

    if (novoPedidoItens.length === 0) {
      setErro('Adicione ao menos um item ao rascunho do novo pedido.');
      return;
    }

    const itensNormalizados = novoPedidoItens
      .map((item) => ({
        ...item,
        quantidadeNumero: Number(item.quantidade || 0),
        custoUnitarioNumero: Number(item.custoUnitario || 0),
      }));

    const itemInvalido = itensNormalizados.find((item) => (
      !item.produtoId
      || !Number.isFinite(item.quantidadeNumero)
      || item.quantidadeNumero <= 0
      || !Number.isFinite(item.custoUnitarioNumero)
      || item.custoUnitarioNumero < 0
    ));

    if (itemInvalido) {
      setErro(`Revise os dados do item "${itemInvalido.nome}": quantidade deve ser maior que zero e custo não pode ser negativo.`);
      return;
    }

    const pedidoDuplicado = detectarPedidoDuplicadoPotencial(novoPedidoFornecedorId, itensNormalizados.map((item) => ({
      produtoId: item.produtoId,
      quantidade: item.quantidadeNumero,
    })));

    if (pedidoDuplicado && !confirmacaoDuplicidadeNovoPedido) {
      setErro(`Detectamos possível duplicidade com o pedido ${pedidoDuplicado.numero || pedidoDuplicado.id.slice(0, 8)}. Marque a confirmação para prosseguir.`);
      return;
    }

    try {
      setNovoPedidoSalvando(true);
      setLoadingAtalho(true);
      setErro('');
      setSucesso('');

      const observacoesComAuditoria = montarObservacoesComAuditoriaIa(
        'WIZARD',
        itensNormalizados.map((item) => ({
          idReferencia: item.id,
          nome: item.nome,
          quantidade: item.quantidadeNumero,
          custoUnitario: item.custoUnitarioNumero,
        })),
        novoPedidoObservacoes.trim(),
      );
      const metadataAuditoriaIa = {
        iaAuditoria: montarMetadataAuditoriaIa(
          'WIZARD',
          itensNormalizados.map((item) => ({
            idReferencia: item.id,
            nome: item.nome,
            quantidade: item.quantidadeNumero,
            custoUnitario: item.custoUnitarioNumero,
          })),
        ),
      };

      const pedidoCriado = await api.post('/estoque/compras/pedidos', {
        fornecedorId: novoPedidoFornecedorId,
        valorFrete: valorFreteNovoPedidoNumero,
        valorImpostos: valorImpostosNovoPedidoNumero,
        observacoes: observacoesComAuditoria,
        metadata: metadataAuditoriaIa,
        itens: itensNormalizados.map((item) => ({
          produtoId: item.produtoId,
          quantidade: item.quantidadeNumero,
          custoUnitario: item.custoUnitarioNumero,
        })),
      }, token);

      await Promise.all([
        carregarCentralCompras(compraFiltros, { exibirLoading: false }),
        carregarPedidosAbertos(),
        carregarSugestoesCompra(),
      ]);

      setNovoPedidoPasso(1);
      setNovoPedidoItens([]);
      setNovoPedidoObservacoes('');
      setNovoPedidoValorFrete('0');
      setNovoPedidoValorImpostos('0');
      setNovoPedidoBuscaCatalogo('');
      setConfirmacaoDuplicidadeNovoPedido(false);
      setSucesso(`Pedido de compra ${pedidoCriado?.numero || pedidoCriado?.id?.slice?.(0, 8) || 'criado'} registrado com sucesso.`);

      if (pedidoCriado?.id) {
        abrirDetalhePedido(pedidoCriado as PedidoCompraItem);
      }
    } catch (error) {
      console.error(error);
      setErro('Não foi possível criar o pedido de compra pelo wizard. Verifique os dados e tente novamente.');
    } finally {
      setNovoPedidoSalvando(false);
      setLoadingAtalho(false);
    }
  };

  const totalNovoPedidoEstimado = useMemo(() => {
    return novoPedidoItens.reduce((acc, item) => {
      const quantidade = Number(String(item.quantidade || '0').replace(',', '.'));
      const custo = Number(String(item.custoUnitario || '0').replace(',', '.'));
      return acc + (Number.isFinite(quantidade) ? quantidade : 0) * (Number.isFinite(custo) ? custo : 0);
    }, 0);
  }, [novoPedidoItens]);

  const valorFreteNovoPedidoNumero = useMemo(() => {
    const parsed = Number(String(novoPedidoValorFrete || '0').replace(',', '.'));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }, [novoPedidoValorFrete]);

  const valorImpostosNovoPedidoNumero = useMemo(() => {
    const parsed = Number(String(novoPedidoValorImpostos || '0').replace(',', '.'));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }, [novoPedidoValorImpostos]);

  const custoSugeridoPorProduto = useMemo(() => {
    const agregados = new Map<string, { total: number; count: number }>();

    pedidosCompra.forEach((pedido) => {
      (pedido.itens || []).forEach((item) => {
        const produtoId = String(item.produtoId || '').trim();
        const custo = Number(item.custoUnitario || 0);
        if (!produtoId || !Number.isFinite(custo) || custo <= 0) return;

        const atual = agregados.get(produtoId) || { total: 0, count: 0 };
        atual.total += custo;
        atual.count += 1;
        agregados.set(produtoId, atual);
      });
    });

    const media = new Map<string, number>();
    agregados.forEach((value, produtoId) => {
      if (value.count > 0) {
        media.set(produtoId, Number((value.total / value.count).toFixed(2)));
      }
    });

    return media;
  }, [pedidosCompra]);

  const quantidadePendentePorProdutoEmAberto = useMemo(() => {
    const mapa = new Map<string, number>();

    pedidosCompra.forEach((pedido) => {
      const status = String(pedido.status || '').toUpperCase();
      if (status === 'CANCELADO' || status === 'RECEBIDO') return;

      (pedido.itens || []).forEach((item) => {
        const produtoId = String(item.produtoId || '').trim();
        if (!produtoId) return;

        const quantidade = Number(item.quantidade || 0);
        const quantidadeRecebida = Number(item.quantidadeRecebida || 0);
        const pendente = Math.max(0, quantidade - quantidadeRecebida);
        if (pendente <= 0) return;

        mapa.set(produtoId, Number((mapa.get(produtoId) || 0) + pendente));
      });
    });

    return mapa;
  }, [pedidosCompra]);

  const auditoriaSugestoesIa = useMemo(() => {
    const mapa = new Map<string, { score: number; nivel: 'alto' | 'medio' | 'baixo'; motivos: string[] }>();

    sugestoesCompra.forEach((item) => {
      const quantidadeSugerida = Math.max(1, Number(item.quantidadeSugerida || 1));
      const estoqueAtual = Math.max(0, Number(item.estoqueAtual || 0));
      const custoSugerido = Number(custoSugeridoPorProduto.get(item.itemId) || 0);
      const pendenteAberto = Number(quantidadePendentePorProdutoEmAberto.get(item.itemId) || 0);
      const motivos: string[] = [];

      let score = 45;
      const coberturaAtual = estoqueAtual / quantidadeSugerida;

      if (coberturaAtual <= 0.2) {
        score += 30;
        motivos.push('Reposição urgente: estoque muito abaixo da cobertura sugerida.');
      } else if (coberturaAtual <= 0.6) {
        score += 20;
        motivos.push('Reposição relevante: cobertura parcial em estoque atual.');
      } else {
        score += 8;
        motivos.push('Reposição preventiva para manter cobertura de segurança.');
      }

      if (custoSugerido > 0) {
        score += 20;
        motivos.push(`Custo histórico disponível (${formatCurrency(custoSugerido)}).`);
      } else {
        score -= 10;
        motivos.push('Sem custo histórico confiável para este item.');
      }

      if (pendenteAberto > 0) {
        score -= 15;
        motivos.push(`Já existem ${pendenteAberto} un em pedidos abertos para este produto.`);
      } else {
        score += 10;
        motivos.push('Sem pendências em pedidos abertos para o produto.');
      }

      score = Math.max(0, Math.min(100, Math.round(score)));
      const nivel: 'alto' | 'medio' | 'baixo' = score >= 75 ? 'alto' : score >= 55 ? 'medio' : 'baixo';
      mapa.set(item.itemId, { score, nivel, motivos });
    });

    return mapa;
  }, [sugestoesCompra, custoSugeridoPorProduto, quantidadePendentePorProdutoEmAberto]);

  const confiancaPedidoRapido = useMemo(() => {
    const considerados = sugestoesCompra.slice(0, 10);
    if (considerados.length === 0) {
      return { score: 0, nivel: 'baixo' as const, itens: 0 };
    }

    const scoreMedio = Math.round(
      considerados.reduce((acc, item) => acc + Number(auditoriaSugestoesIa.get(item.itemId)?.score || 0), 0) / considerados.length,
    );

    const nivel: 'alto' | 'medio' | 'baixo' = scoreMedio >= 75 ? 'alto' : scoreMedio >= 55 ? 'medio' : 'baixo';
    return { score: scoreMedio, nivel, itens: considerados.length };
  }, [sugestoesCompra, auditoriaSugestoesIa]);

  const auditoriaItensNovoPedido = useMemo(() => {
    const mapa = new Map<string, { score: number; nivel: 'alto' | 'medio' | 'baixo'; motivos: string[] }>();

    novoPedidoItens.forEach((item) => {
      const auditoriaSugestao = auditoriaSugestoesIa.get(item.produtoId);
      if (auditoriaSugestao) {
        mapa.set(item.id, {
          ...auditoriaSugestao,
          motivos: [
            ...auditoriaSugestao.motivos,
            item.origem === 'sugestao'
              ? 'Item adicionado por sugestão automática.'
              : 'Item manual com contexto IA herdado da sugestão do produto.',
          ],
        });
        return;
      }

      const custo = Number(item.custoUnitario || 0);
      const pendenteAberto = Number(quantidadePendentePorProdutoEmAberto.get(item.produtoId) || 0);
      const motivos: string[] = [];
      let score = 50;

      if (custo > 0) {
        score += 20;
        motivos.push(`Custo informado no rascunho (${formatCurrency(custo)}).`);
      } else {
        score -= 10;
        motivos.push('Sem custo informado no rascunho.');
      }

      if (pendenteAberto > 0) {
        score -= 12;
        motivos.push(`Produto com ${pendenteAberto} un já pendentes em pedidos abertos.`);
      } else {
        score += 8;
        motivos.push('Sem pendências abertas para o produto.');
      }

      score = Math.max(0, Math.min(100, Math.round(score)));
      const nivel: 'alto' | 'medio' | 'baixo' = score >= 75 ? 'alto' : score >= 55 ? 'medio' : 'baixo';
      mapa.set(item.id, { score, nivel, motivos });
    });

    return mapa;
  }, [novoPedidoItens, auditoriaSugestoesIa, quantidadePendentePorProdutoEmAberto]);

  const totalGeralNovoPedidoEstimado = useMemo(
    () => totalNovoPedidoEstimado + valorFreteNovoPedidoNumero + valorImpostosNovoPedidoNumero,
    [totalNovoPedidoEstimado, valorFreteNovoPedidoNumero, valorImpostosNovoPedidoNumero],
  );

  const fornecedoresRankingNovoPedido = useMemo(() => {
    const ranking = new Map<string, { id: string; nome: string; score: number; pedidos: number; abertos: number }>();

    pedidosCompra.forEach((pedido) => {
      const id = String(pedido.fornecedor?.id || '').trim();
      const nome = String(pedido.fornecedor?.nome || '').trim();
      if (!id || !nome) return;

      const status = normalizeStatusPedidoCompra(pedido.status);
      const valor = Number(pedido.valorTotal || pedido.valorProdutos || 0);
      const atual = ranking.get(id) || { id, nome, score: 0, pedidos: 0, abertos: 0 };

      atual.pedidos += 1;
      atual.score += 10;
      atual.score += Math.min(20, Math.floor(valor / 500));

      if (isStatusPedidoCompraAberto(status)) {
        atual.abertos += 1;
        atual.score += 18;
      }

      ranking.set(id, atual);
    });

    fornecedoresFiltro.forEach((fornecedor) => {
      if (!ranking.has(fornecedor.id)) {
        ranking.set(fornecedor.id, { id: fornecedor.id, nome: fornecedor.nome, score: 1, pedidos: 0, abertos: 0 });
      }
    });

    return Array.from(ranking.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [pedidosCompra, fornecedoresFiltro]);

  const itensCatalogoParaWizard = useMemo(() => {
    const termo = normalizeText(novoPedidoBuscaCatalogo);
    const itensBase = catalogoProdutosServicos.length > 0 ? catalogoProdutosServicos : catalogo;
    if (!termo) {
      return itensBase.slice(0, 8);
    }

    return itensBase
      .filter((item) => {
        const nome = normalizeText(item.nome);
        const codigo = normalizeText(item.codigoInterno || item.codigoBarras || '');
        return nome.includes(termo) || codigo.includes(termo);
      })
      .slice(0, 8);
  }, [novoPedidoBuscaCatalogo, catalogoProdutosServicos, catalogo]);

  const detectarPedidoDuplicadoPotencial = (
    fornecedorId: string,
    itens: Array<{ produtoId: string; quantidade: number }>,
  ) => {
    if (!fornecedorId || itens.length === 0) return null;

    const itensValidos = itens.filter((item) => item.produtoId && item.quantidade > 0);
    if (itensValidos.length === 0) return null;

    const totalNovo = itensValidos.reduce((acc, item) => acc + item.quantidade, 0);
    const mapaNovo = new Map<string, number>();
    itensValidos.forEach((item) => mapaNovo.set(item.produtoId, item.quantidade));

    return pedidosCompra.find((pedido) => {
      const status = String(pedido.status || '').toUpperCase();
      if (status === 'CANCELADO' || status === 'RECEBIDO') return false;
      if (String(pedido.fornecedor?.id || '') !== fornecedorId) return false;

      const itensPedido = (pedido.itens || [])
        .map((item) => ({
          produtoId: String(item.produtoId || ''),
          quantidade: Number(item.quantidade || 0),
        }))
        .filter((item) => item.produtoId && item.quantidade > 0);

      if (itensPedido.length === 0) return false;

      const mapaPedido = new Map<string, number>();
      itensPedido.forEach((item) => mapaPedido.set(item.produtoId, item.quantidade));

      let comuns = 0;
      let intersecaoQtd = 0;

      mapaNovo.forEach((qtdNovo, produtoId) => {
        const qtdPedido = mapaPedido.get(produtoId);
        if (!qtdPedido) return;
        comuns += 1;
        intersecaoQtd += Math.min(qtdNovo, qtdPedido);
      });

      const coberturaItens = comuns / Math.max(1, mapaNovo.size);
      const coberturaQtd = intersecaoQtd / Math.max(1, totalNovo);
      return coberturaItens >= 0.7 && coberturaQtd >= 0.6;
    }) || null;
  };

  const duplicidadeNovoPedido = useMemo(
    () => detectarPedidoDuplicadoPotencial(
      novoPedidoFornecedorId,
      novoPedidoItens.map((item) => ({ produtoId: item.produtoId, quantidade: Number(item.quantidade || 0) })),
    ),
    [novoPedidoFornecedorId, novoPedidoItens, pedidosCompra],
  );

  useEffect(() => {
    setConfirmacaoDuplicidadeNovoPedido(false);
  }, [novoPedidoFornecedorId, novoPedidoItens]);

  const montarObservacoesComAuditoriaIa = (
    contexto: 'WIZARD' | 'RAPIDO',
    itens: Array<{ idReferencia: string; nome: string; quantidade: number; custoUnitario: number }>,
    baseObservacoes?: string,
  ) => {
    const timestamp = new Date().toISOString();
    const linhasCabecalho = [
      `[IA-AUDITORIA][${contexto}] ${timestamp}`,
      `Confianca pedido rapido: ${confiancaPedidoRapido.score}% (${confiancaPedidoRapido.nivel})`,
      `Fornecedor recomendado: ${fornecedoresRankingNovoPedido[0]?.nome || 'N/D'}`,
    ];

    const itensAuditoria = itens.slice(0, 10).map((item, index) => {
      const auditoria = auditoriaItensNovoPedido.get(item.idReferencia)
        || auditoriaSugestoesIa.get(item.idReferencia)
        || { score: 0, nivel: 'baixo' as const, motivos: ['Sem trilha de auditoria disponível.'] };

      const motivos = auditoria.motivos.slice(0, 3).join(' | ');
      return {
        ordem: index + 1,
        produto: item.nome,
        produtoRef: item.idReferencia,
        quantidade: item.quantidade,
        custoUnitario: item.custoUnitario,
        score: auditoria.score,
        nivel: auditoria.nivel,
        motivos: auditoria.motivos.slice(0, 3),
        linhaTexto: `${index + 1}. ${item.nome} | qtd=${item.quantidade} | custo=${item.custoUnitario} | score=${auditoria.score}% (${auditoria.nivel}) | motivos=${motivos}`,
      };
    });

    const payloadAuditoria = {
      marker: 'IA_AUDITORIA_V1',
      contexto,
      timestamp,
      confiancaPedidoRapido: {
        score: confiancaPedidoRapido.score,
        nivel: confiancaPedidoRapido.nivel,
      },
      fornecedorRecomendado: fornecedoresRankingNovoPedido[0]?.nome || 'N/D',
      itens: itensAuditoria.map((item) => ({
        ordem: item.ordem,
        produto: item.produto,
        produtoRef: item.produtoRef,
        quantidade: item.quantidade,
        custoUnitario: item.custoUnitario,
        score: item.score,
        nivel: item.nivel,
        motivos: item.motivos,
      })),
    };

    const blocoJson = `[IA-AUDITORIA-JSON] ${JSON.stringify(payloadAuditoria)}`;

    const blocoAuditoria = [
      ...linhasCabecalho,
      'Itens analisados:',
      ...itensAuditoria.map((item) => item.linhaTexto),
      blocoJson,
    ].join('\n');

    const base = String(baseObservacoes || '').trim();
    return base ? `${base}\n\n${blocoAuditoria}` : blocoAuditoria;
  };

  const montarMetadataAuditoriaIa = (
    contexto: 'WIZARD' | 'RAPIDO',
    itens: Array<{ idReferencia: string; nome: string; quantidade: number; custoUnitario: number }>,
  ) => {
    const timestamp = new Date().toISOString();

    const itensAuditoria = itens.slice(0, 10).map((item, index) => {
      const auditoria = auditoriaItensNovoPedido.get(item.idReferencia)
        || auditoriaSugestoesIa.get(item.idReferencia)
        || { score: 0, nivel: 'baixo' as const, motivos: ['Sem trilha de auditoria disponível.'] };

      return {
        ordem: index + 1,
        produto: item.nome,
        produtoRef: item.idReferencia,
        quantidade: item.quantidade,
        custoUnitario: item.custoUnitario,
        score: auditoria.score,
        nivel: auditoria.nivel,
        motivos: auditoria.motivos.slice(0, 3),
      };
    });

    return {
      marker: 'IA_AUDITORIA_V1',
      contexto,
      timestamp,
      confiancaPedidoRapido: {
        score: confiancaPedidoRapido.score,
        nivel: confiancaPedidoRapido.nivel,
      },
      fornecedorRecomendado: fornecedoresRankingNovoPedido[0]?.nome || 'N/D',
      itens: itensAuditoria,
    };
  };

  const criarPedidoRapidoPorSugestoes = async () => {
    if (sugestoesCompra.length === 0) {
      setErro('Não há sugestões disponíveis para criação rápida de pedido.');
      return;
    }

    const fornecedorId = fornecedoresRankingNovoPedido[0]?.id || fornecedoresFiltro[0]?.id || '';
    if (!fornecedorId) {
      setErro('Nenhum fornecedor disponível para criar pedido rápido.');
      return;
    }

    const itensRapidos = sugestoesCompra.slice(0, 10).map((item) => ({
      produtoId: item.itemId,
      quantidade: Math.max(1, Number(item.quantidadeSugerida || 1)),
      custoUnitario: Number(custoSugeridoPorProduto.get(item.itemId) || 0),
    }));

    if (itensRapidos.length === 0) {
      setErro('As sugestões atuais não possuem itens válidos para pedido rápido.');
      return;
    }

    const duplicado = detectarPedidoDuplicadoPotencial(
      fornecedorId,
      itensRapidos.map((item) => ({ produtoId: item.produtoId, quantidade: item.quantidade })),
    );
    if (duplicado) {
      setErro(`Pedido rápido bloqueado: possível duplicidade com o pedido ${duplicado.numero || duplicado.id.slice(0, 8)}.`);
      return;
    }

    try {
      setNovoPedidoSalvando(true);
      setLoadingAtalho(true);
      setErro('');
      setSucesso('');

      const observacoesComAuditoria = montarObservacoesComAuditoriaIa(
        'RAPIDO',
        itensRapidos.map((item) => ({
          idReferencia: item.produtoId,
          nome: sugestoesCompra.find((sug) => sug.itemId === item.produtoId)?.nomeItem || `Produto ${item.produtoId.slice(0, 8)}`,
          quantidade: item.quantidade,
          custoUnitario: item.custoUnitario,
        })),
        'Pedido criado automaticamente a partir das sugestões de compra.',
      );
      const metadataAuditoriaIa = {
        iaAuditoria: montarMetadataAuditoriaIa(
          'RAPIDO',
          itensRapidos.map((item) => ({
            idReferencia: item.produtoId,
            nome: sugestoesCompra.find((sug) => sug.itemId === item.produtoId)?.nomeItem || `Produto ${item.produtoId.slice(0, 8)}`,
            quantidade: item.quantidade,
            custoUnitario: item.custoUnitario,
          })),
        ),
      };

      const pedidoCriado = await api.post('/estoque/compras/pedidos', {
        fornecedorId,
        valorFrete: 0,
        valorImpostos: 0,
        observacoes: observacoesComAuditoria,
        metadata: metadataAuditoriaIa,
        itens: itensRapidos,
      }, token);

      await Promise.all([
        carregarCentralCompras(compraFiltros, { exibirLoading: false }),
        carregarPedidosAbertos(),
        carregarSugestoesCompra(),
      ]);

      setSucesso(`Pedido rápido ${pedidoCriado?.numero || pedidoCriado?.id?.slice?.(0, 8) || 'criado'} gerado com sucesso. Confiança IA: ${confiancaPedidoRapido.score}%.`);
      if (pedidoCriado?.id) {
        abrirDetalhePedido(pedidoCriado as PedidoCompraItem);
      }
    } catch (error) {
      console.error(error);
      setErro('Não foi possível gerar o pedido rápido pelas sugestões.');
    } finally {
      setNovoPedidoSalvando(false);
      setLoadingAtalho(false);
    }
  };

  const fornecedorSelecionadoNovoPedido = useMemo(
    () => fornecedoresFiltro.find((item) => item.id === novoPedidoFornecedorId)?.nome || '-',
    [fornecedoresFiltro, novoPedidoFornecedorId],
  );

  const riscosRecebimento = useMemo(() => {
    if (!pedidoDetalhe) return [] as RiscoRecebimento[];

    const alertasCriticos = pedidoSugeridoXml?.pedido.id === pedidoDetalhe.id
      ? (pedidoSugeridoXml.alertas || []).filter((alerta) =>
        alerta.includes('distante') || alerta.includes('baixa aderência') || alerta.includes('diverge'))
      : [];

    return calcularRiscosRecebimento({
      itens: recebimentoManual.itens,
      chaveAcesso: recebimentoManual.chaveAcesso,
      alertasCriticos,
    });
  }, [pedidoDetalhe, recebimentoManual, pedidoSugeridoXml]);

  const riscosBloqueantes = useMemo(
    () => riscosRecebimento.filter((risco) => risco.severidade === 'alta'),
    [riscosRecebimento],
  );
  const riscosRecebimentoOrdenados = useMemo(
    () => [...riscosRecebimento].sort((a, b) => {
      if (a.severidade === b.severidade) return 0;
      return a.severidade === 'alta' ? -1 : 1;
    }),
    [riscosRecebimento],
  );
  const resumoRiscosRecebimento = useMemo(
    () => ({
      altos: riscosRecebimento.filter((risco) => risco.severidade === 'alta').length,
      medios: riscosRecebimento.filter((risco) => risco.severidade === 'media').length,
    }),
    [riscosRecebimento],
  );
  const riscosRecebimentoVisiveis = useMemo(
    () => (mostrarSomenteRiscoAlto ? riscosRecebimentoOrdenados.filter((risco) => risco.severidade === 'alta') : riscosRecebimentoOrdenados),
    [mostrarSomenteRiscoAlto, riscosRecebimentoOrdenados],
  );
  const riscosPorCategoria = useMemo(() => {
    const grouped = new Map<RiscoRecebimento['categoria'], RiscoRecebimento[]>();
    riscosRecebimentoVisiveis.forEach((risco) => {
      const atual = grouped.get(risco.categoria) || [];
      atual.push(risco);
      grouped.set(risco.categoria, atual);
    });
    return grouped;
  }, [riscosRecebimentoVisiveis]);
  const precisaConfirmacaoRisco = riscosBloqueantes.length > 0;
  const confiancaGlobalPedidoSugerido = useMemo(() => {
    if (!pedidoSugeridoXml || pedidoSugeridoXml.criterios.length === 0) {
      return 0;
    }

    const somaPontos = pedidoSugeridoXml.criterios.reduce((acc, criterio) => acc + Number(criterio.pontos || 0), 0);
    const somaMaximos = pedidoSugeridoXml.criterios.reduce((acc, criterio) => acc + Math.max(0, Number(criterio.maximo || 0)), 0);
    if (somaMaximos <= 0) {
      return 0;
    }

    return Math.max(0, Math.min(100, Math.round((somaPontos / somaMaximos) * 100)));
  }, [pedidoSugeridoXml]);

  useEffect(() => {
    if (!pedidoSugeridoXml || !isComprasXmlView) {
      return;
    }

    if (ultimoPedidoSugeridoAbertoId === pedidoSugeridoXml.pedido.id) {
      return;
    }

    if (pedidoDetalhe && pedidoDetalhe.id !== ultimoPedidoSugeridoAbertoId) {
      return;
    }

    abrirDetalhePedido(pedidoSugeridoXml.pedido);
    setRecebimentoManual(applyXmlToRecebimentoForm(buildRecebimentoManualForm(pedidoSugeridoXml.pedido), previewXml, xmlCompra));
    setUltimoPedidoSugeridoAbertoId(pedidoSugeridoXml.pedido.id);
    setSucesso(`Pedido ${pedidoSugeridoXml.pedido.numero || pedidoSugeridoXml.pedido.id.slice(0, 8)} sugerido automaticamente com base no XML carregado.`);
  }, [pedidoSugeridoXml, pedidoDetalhe, isComprasXmlView, ultimoPedidoSugeridoAbertoId, previewXml, xmlCompra]);

  const preencherRecebimentoComXml = () => {
    if (!pedidoDetalhe) return;
    if (!previewXml && !xmlCompra.trim()) {
      setErro('Carregue ou pre-visualize um XML antes de usar o preenchimento automatico.');
      return;
    }

    setRecebimentoManual((current) => applyXmlToRecebimentoForm(current, previewXml, xmlCompra));

    setSucesso('Formulario preenchido com os dados do XML carregado. Confira as quantidades antes de confirmar.');
    setErro('');
  };

  const receberPedidoManualmente = async () => {
    if (!pedidoDetalhe) return;

    if (precisaConfirmacaoRisco && !confirmacaoRiscoRecebimento) {
      setErro('Existem divergencias de severidade alta no recebimento. Marque a confirmacao de conferência para continuar.');
      return;
    }

    const itensRecebidos = recebimentoManual.itens
      .map((item) => ({
        produtoId: item.produtoId,
        quantidadeRecebida: Number(item.quantidadeRecebida || 0),
        custoUnitario: Number(item.custoUnitario || 0),
      }))
      .filter((item) => item.produtoId && item.quantidadeRecebida > 0);

    if (!recebimentoManual.numero.trim()) {
      setErro('Informe o numero da nota para registrar o recebimento.');
      return;
    }

    if (recebimentoManual.chaveAcesso.trim().length < 32) {
      setErro('Informe uma chave de acesso valida com pelo menos 32 caracteres.');
      return;
    }

    if (itensRecebidos.length === 0) {
      setErro('Informe pelo menos um item com quantidade recebida maior que zero.');
      return;
    }

    const erroNfeCnpj = validarCamposNfeCnpj(recebimentoManual);
    if (erroNfeCnpj) {
      setErro(erroNfeCnpj);
      return;
    }

    try {
      setLoadingAtalho(true);
      setErro('');
      setSucesso('');

      const totalProdutos = itensRecebidos.reduce((acc, item) => acc + (item.quantidadeRecebida * item.custoUnitario), 0);
      const valorFrete = Number(recebimentoManual.valorFrete || 0);
      const valorImpostos = Number(recebimentoManual.valorImpostos || 0);
      const valorParcela = Number((totalProdutos + valorFrete + valorImpostos).toFixed(2));

      await api.post('/estoque/compras/notas-fiscais/recebimento', {
        pedidoCompraId: pedidoDetalhe.id,
        numero: recebimentoManual.numero.trim(),
        serie: recebimentoManual.serie.trim() || '1',
        chaveAcesso: recebimentoManual.chaveAcesso.trim(),
        dataEmissao: recebimentoManual.dataEmissao,
        dataEntrada: recebimentoManual.dataEntrada,
        valorFrete,
        valorImpostos,
        observacoes: buildObservacoesNfeCnpj(recebimentoManual),
        itens: itensRecebidos.map((item) => ({
          ...item,
          depositoDestinoId: recebimentoManual.depositoDestinoId || undefined,
        })),
        parcelas: [{
          numeroParcela: 1,
          valor: valorParcela,
          vencimento: recebimentoManual.vencimento || recebimentoManual.dataEntrada,
        }],
      }, token);

      setSucesso('Recebimento manual registrado com sucesso. Estoque e financeiro foram atualizados.');
      setPedidoDetalhe(null);
      await Promise.all([
        carregarCentralCompras(compraFiltros, { exibirLoading: false }),
        carregarSugestoesCompra(),
        carregarCatalogo(catalogoDefaultParams, filtroCatalogoBaseLabel),
        api.get('/estoque/analise', token).then((data) => setAnalise(data)),
      ]);
    } catch (error) {
      console.error(error);
      setErro('Nao foi possivel registrar o recebimento manual deste pedido.');
    } finally {
      setLoadingAtalho(false);
    }
  };

  const aplicarAtalho = async (
    codigo: string,
    options: { persistirHash?: boolean; buscaForcada?: string } = {},
  ) => {
    try {
      setErro('');
      const persistirHash = options.persistirHash ?? true;
      const buscaEfetiva = (options.buscaForcada ?? busca).trim();

      if (codigo === 'EST-AT-01') {
        await carregarCatalogo(
          { ...catalogoDefaultParams, q: buscaEfetiva || undefined },
          buscaEfetiva ? `Pesquisa: ${buscaEfetiva}` : filtroCatalogoBaseLabel,
        );
        if (persistirHash) setHashState({ atalho: codigo, q: buscaEfetiva || undefined });
        return;
      }
      if (codigo === 'EST-AT-02') {
        await carregarCatalogo({ somenteComValidade: true }, 'Itens com validade');
        if (persistirHash) setHashState({ atalho: codigo });
        return;
      }
      if (codigo === 'EST-AT-03') {
        await carregarSugestoesCompra();
        if (persistirHash) setHashState({ atalho: codigo });
        return;
      }
      if (codigo === 'EST-AT-04') {
        await carregarPedidosAbertos();
        if (persistirHash) setHashState({ atalho: codigo });
        return;
      }
      if (codigo === 'EST-AT-05') {
        await carregarCatalogo({ statusEstoque: 'RUPTURA' }, 'Itens em ruptura');
        if (persistirHash) setHashState({ atalho: codigo });
        return;
      }
      if (codigo === 'EST-AT-06') {
        await carregarCatalogo({ statusEstoque: 'BAIXO' }, 'Itens com estoque baixo');
        if (persistirHash) setHashState({ atalho: codigo });
      }
    } catch (error) {
      console.error(error);
      setErro('Nao foi possivel executar o atalho selecionado.');
      setLoadingAtalho(false);
    }
  };

  const atalhosAgrupados = useMemo(() => {
    const grupos = [
      {
        id: 'pesquisa',
        titulo: 'Pesquisa e catálogo',
        descricao: 'Buscas rápidas e visão de cadastro.',
        codigos: ['EST-AT-01', 'EST-AT-02'],
      },
      {
        id: 'compras',
        titulo: 'Compras e reposição',
        descricao: 'Sugestões e pedidos operacionais.',
        codigos: ['EST-AT-03', 'EST-AT-04'],
      },
      {
        id: 'estoque',
        titulo: 'Riscos de estoque',
        descricao: 'Itens em ruptura e baixo estoque.',
        codigos: ['EST-AT-05', 'EST-AT-06'],
      },
    ];

    return grupos.map((grupo) => ({
      ...grupo,
      atalhos: grupo.codigos
        .map((codigo) => atalhos.find((atalho) => atalho.codigo === codigo))
        .filter(Boolean) as AtalhoOperacional[],
    }));
  }, [atalhos]);

  const atualizarCadastroRapidoProduto = (field: keyof CadastroRapidoProdutoForm, value: string) => {
    setCadastroRapidoProduto((current) => ({ ...current, [field]: value }));
  };

  const cadastrarProdutoRapido = async () => {
    const nome = cadastroRapidoProduto.nome.trim();
    if (!nome) {
      setErro('Informe o nome do produto/serviço no cadastro rápido.');
      return;
    }

    if (!cadastroRapidoProduto.grupoId) {
      setErro('Selecione o grupo no cadastro rápido para continuar.');
      return;
    }

    if (!cadastroRapidoProduto.marcaId) {
      setErro('Selecione a marca no cadastro rápido para continuar.');
      return;
    }

    const toNumber = (value: string, fallback = 0) => {
      const parsed = Number(String(value || '').replace(',', '.'));
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    try {
      setLoadingAtalho(true);
      setErro('');
      setSucesso('');

      await api.post('/estoque/catalogo/itens', {
        tipo: cadastroRapidoProduto.tipo,
        nome,
        codigoInterno: cadastroRapidoProduto.codigoInterno.trim() || undefined,
        codigoBarras: cadastroRapidoProduto.codigoBarras.trim() || undefined,
        unidadeVenda: cadastroRapidoProduto.unidadeVenda.trim() || 'UN',
        grupoId: cadastroRapidoProduto.grupoId,
        marcaId: cadastroRapidoProduto.marcaId,
        custoAtual: toNumber(cadastroRapidoProduto.custoAtual, 0),
        precoVenda: toNumber(cadastroRapidoProduto.precoVenda, 0),
        markupAlvo: cadastroRapidoProduto.markupAlvo.trim() ? toNumber(cadastroRapidoProduto.markupAlvo, 0) : undefined,
        estoqueInicial: toNumber(cadastroRapidoProduto.estoqueInicial, 0),
      }, token);

      await Promise.all([
        carregarCatalogo(catalogoDefaultParams, catalogoDefaultLabel),
        api.get('/estoque/analise', token).then((data) => setAnalise(data)),
      ]);

      setSucesso(`Cadastro rápido concluído: ${nome}.`);
      setCadastroRapidoProduto(buildCadastroRapidoProdutoForm(cadastroRapidoTipoPadrao));
      setCadastroRapidoAberto(false);
    } catch (error) {
      console.error(error);
      setErro('Falha ao cadastrar produto/serviço manualmente. Revise os dados e tente novamente.');
    } finally {
      setLoadingAtalho(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 18, padding: 8, background: 'radial-gradient(circle at top right, #f0f7f6 0%, #f7fbfb 42%, #ffffff 100%)', borderRadius: 14 }}>
      <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, color: '#243332' }}>
            {isComprasXmlView
              ? 'Compras (XML)'
              : isNovosPedidosView
                ? 'Novos Pedidos'
                : isServicosView
                  ? 'Serviços'
                  : 'Estoque'}
          </h1>
          <p style={{ margin: '6px 0 0', color: '#647674', maxWidth: 720 }}>
            {isComprasXmlView
              ? 'Central de recebimento de NF-e por XML: importar, editar dados recebidos e armazenar notas.'
              : isNovosPedidosView
                ? 'Central de criação e acompanhamento de novos pedidos de compra.'
                : isServicosView
                  ? 'Gestão operacional de serviços, padronização de cadastro e suporte ao atendimento.'
                  : 'Controle operacional de produtos, reservas, rupturas, compras e saldos por deposito.'}
          </p>
        </div>
        <button onClick={carregar} style={{ height: 38, display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #c7d5d2', background: '#fff', color: '#2f6f73', borderRadius: 8, padding: '0 14px', cursor: 'pointer', fontWeight: 700 }}>
          <RefreshCw size={16} /> Atualizar
        </button>
      </section>

      {erro && <div style={{ ...card, padding: 14, color: '#8a4b20', background: '#fff8ed' }}>{erro}</div>}
      {sucesso && <div style={{ ...card, padding: 14, color: '#215c45', background: '#eefaf4' }}>{sucesso}</div>}
      {loading && <div style={{ ...card, padding: 18, color: '#647674' }}>Carregando estoque...</div>}

      {!loading && (
        <>
          {isComprasModuleView && (
            <section style={{ ...card, padding: 16 }}>
              <div style={{ marginBottom: 10, padding: 10, borderRadius: 8, border: '1px solid #d9e2e1', background: '#f8fbfa' }}>
                <div style={{ fontWeight: 800, color: '#243332', marginBottom: 6 }}>Passo a passo de compras por XML</div>
                <div style={{ display: 'grid', gap: 4, color: '#54736b', fontSize: 13 }}>
                  <span>1) Filtre pedidos e notas para focar no fornecedor correto.</span>
                  <span>2) Pre-visualize o XML para validar itens, valores e sugestao de pedido.</span>
                  <span>3) Abra o pedido sugerido, preencha o recebimento e conclua apos conferencias.</span>
                </div>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, color: '#243332' }}>{isComprasXmlView ? 'Filtro operacional de XML e notas' : 'Filtro operacional de pedidos e notas'}</h3>
                    <p style={{ margin: '4px 0 0', color: '#647674', fontSize: 13 }}>
                      {isComprasXmlView
                        ? 'Filtre NFs recebidas por XML, fornecedor e periodo para edição e armazenamento.'
                        : 'Filtre pedidos e notas por fornecedor, periodo e status para operação de novos pedidos.'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => carregarCentralCompras(compraFiltros)}
                      style={{ height: 36, display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #c7d5d2', background: '#fff', color: '#2f6f73', borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontWeight: 700 }}
                    >
                      <Search size={14} /> Buscar
                    </button>
                    <button
                      onClick={async () => {
                        const filtrosLimpos = { q: '', numeroNota: '', fornecedorId: '', inicio: '', fim: '', statusPedido: '' };
                        setCompraFiltros(filtrosLimpos);
                        await carregarCentralCompras(filtrosLimpos);
                      }}
                      style={{ height: 36, display: 'inline-flex', alignItems: 'center', border: '1px solid #d9e2e1', background: '#f8fbfa', color: '#54736b', borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontWeight: 700 }}
                    >
                      Limpar filtros
                    </button>
                    {isComprasXmlView && (
                      <button
                        onClick={() => document.getElementById('compras-xml')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                        style={{ height: 36, display: 'inline-flex', alignItems: 'center', border: '1px solid #d9e2e1', background: '#f8fbfa', color: '#54736b', borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontWeight: 700 }}
                      >
                        Importar XML
                      </button>
                    )}
                    {isComprasXmlView && (
                      <button
                        onClick={() => document.getElementById('compras-nfe-cnpj')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                        style={{ height: 36, display: 'inline-flex', alignItems: 'center', border: '1px solid #d9e2e1', background: '#f8fbfa', color: '#54736b', borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontWeight: 700 }}
                      >
                        Aba NF-e CNPJ
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
                  <input
                    value={compraFiltros.q}
                    onChange={(event) => setCompraFiltros((current) => ({ ...current, q: event.target.value }))}
                    placeholder="Pedido ou codigo"
                    style={{ height: 38, border: '1px solid #d1dddd', borderRadius: 8, padding: '0 10px', fontSize: 13 }}
                  />
                  <input
                    value={compraFiltros.numeroNota}
                    onChange={(event) => setCompraFiltros((current) => ({ ...current, numeroNota: event.target.value }))}
                    placeholder="Numero da NF"
                    style={{ height: 38, border: '1px solid #d1dddd', borderRadius: 8, padding: '0 10px', fontSize: 13 }}
                  />
                  <input
                    type="date"
                    value={compraFiltros.inicio}
                    onChange={(event) => setCompraFiltros((current) => ({ ...current, inicio: event.target.value }))}
                    style={{ height: 38, border: '1px solid #d1dddd', borderRadius: 8, padding: '0 10px', fontSize: 13 }}
                  />
                  <input
                    type="date"
                    value={compraFiltros.fim}
                    onChange={(event) => setCompraFiltros((current) => ({ ...current, fim: event.target.value }))}
                    style={{ height: 38, border: '1px solid #d1dddd', borderRadius: 8, padding: '0 10px', fontSize: 13 }}
                  />
                  <select
                    value={compraFiltros.fornecedorId}
                    onChange={(event) => setCompraFiltros((current) => ({ ...current, fornecedorId: event.target.value }))}
                    style={{ height: 38, border: '1px solid #d1dddd', borderRadius: 8, padding: '0 10px', fontSize: 13, background: '#fff' }}
                  >
                    <option value="">Todos os fornecedores</option>
                    {fornecedoresFiltro.map((fornecedor) => (
                      <option key={fornecedor.id} value={fornecedor.id}>{fornecedor.nome}</option>
                    ))}
                  </select>
                  <select
                    value={compraFiltros.statusPedido}
                    onChange={(event) => setCompraFiltros((current) => ({ ...current, statusPedido: event.target.value }))}
                    style={{ height: 38, border: '1px solid #d1dddd', borderRadius: 8, padding: '0 10px', fontSize: 13, background: '#fff' }}
                  >
                    <option value="">Todos os status</option>
                    <option value="SOLICITADO">Aberto (solicitado)</option>
                    <option value="RECEBIDO_PARCIAL">Parcial</option>
                    <option value="RECEBIDO">Recebido</option>
                    <option value="CANCELADO">Cancelado</option>
                  </select>
                </div>
              </div>
            </section>
          )}

          {isComprasModuleView && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              <Kpi icon={ShoppingCart} label="Pedidos listados" value={pedidosCompra.length} tone="#9a6a2f" />
              <Kpi icon={ClipboardCheck} label="Pedidos pendentes" value={pedidosPendentes} tone="#a64b4b" />
              <Kpi icon={Warehouse} label="Notas encontradas" value={notasCompra.length} tone="#2f6f73" />
              <Kpi icon={Boxes} label="Total das notas" value={`R$ ${totalNotasCompra.toFixed(2)}`} tone="#54736b" />
            </div>
          )}

          <section style={{ ...card, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, color: '#243332' }}>
                  {isServicosView ? 'Serviços (visão operacional)' : 'Estoque (visão operacional)'}
                </h3>
                <p style={{ margin: '4px 0 0', color: '#647674', fontSize: 13 }}>
                  Painel inspirado na aba do SimplesVet para priorizar validade, estoque mínimo e qualidade do cadastro.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => setFiltroProdutosServicos('TODOS')} style={filtroProdutosServicos === 'TODOS' ? chipActiveStyle : chipStyle}>Todos</button>
                <button onClick={() => setFiltroProdutosServicos('VENCIDOS')} style={filtroProdutosServicos === 'VENCIDOS' ? chipActiveStyle : chipStyle}>Vencidos</button>
                <button onClick={() => setFiltroProdutosServicos('VENCENDO_60')} style={filtroProdutosServicos === 'VENCENDO_60' ? chipActiveStyle : chipStyle}>Vencendo 60 dias</button>
                <button onClick={() => setFiltroProdutosServicos('SEM_GRUPO')} style={filtroProdutosServicos === 'SEM_GRUPO' ? chipActiveStyle : chipStyle}>Sem grupo</button>
                <button onClick={() => setFiltroProdutosServicos('BAIXO_ESTOQUE')} style={filtroProdutosServicos === 'BAIXO_ESTOQUE' ? chipActiveStyle : chipStyle}>Baixo estoque</button>
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
              <div style={miniKpiStyle}><strong>{indicadoresProdutosServicos.vencidos}</strong><span>Com validade vencida</span></div>
              <div style={miniKpiStyle}><strong>{indicadoresProdutosServicos.vencendo60}</strong><span>Vencendo em 60 dias</span></div>
              <div style={miniKpiStyle}><strong>{indicadoresProdutosServicos.baixoEstoque}</strong><span>Abaixo do mínimo</span></div>
              <div style={miniKpiStyle}><strong>{indicadoresProdutosServicos.semGrupo}</strong><span>Sem grupo cadastrado</span></div>
            </div>
          </section>

          <section style={{ ...card, padding: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, color: '#243332' }}>Assistente IA operacional</h3>
            <p style={{ margin: '6px 0 0', color: '#647674', fontSize: 13 }}>
              Recomendações automáticas para compras e estoque com base em ruptura, validade e pendências de recebimento.
            </p>
            <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
              {insightsIaOperacionais.map((insight) => {
                const tone = insight.nivel === 'alto'
                  ? { color: '#9c2f2f', background: '#fff1f1', border: '#efc6c6' }
                  : insight.nivel === 'medio'
                    ? { color: '#8a6126', background: '#fff8ed', border: '#efd9b7' }
                    : { color: '#2f6f73', background: '#eef8f8', border: '#c8e0df' };

                return (
                  <div key={insight.id} style={{ border: `1px solid ${tone.border}`, background: tone.background, borderRadius: 8, padding: 10, display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: tone.color }}>{insight.titulo}</div>
                      <div style={{ marginTop: 3, color: '#54736b', fontSize: 13 }}>{insight.descricao}</div>
                    </div>
                    <button onClick={insight.onClick} style={{ ...secondaryActionButtonStyle, borderColor: tone.border, background: '#fff' }}>{insight.acao}</button>
                  </div>
                );
              })}
              {insightsIaOperacionais.length === 0 && (
                <div style={{ color: '#647674', fontSize: 13 }}>Sem alertas críticos no momento. Os dados de estoque estão estáveis.</div>
              )}
            </div>
          </section>

          <section style={{ ...card, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, color: '#243332' }}>Cadastro manual rápido de produto/serviço</h3>
                <p style={{ margin: '4px 0 0', color: '#647674', fontSize: 13 }}>
                  {isServicosView
                    ? 'Adicione serviços manualmente sem sair da central para apoiar o atendimento ao cliente.'
                    : 'Adicione produtos manualmente sem sair da central de estoque para apoiar o atendimento ao cliente.'}
                </p>
              </div>
              <button
                onClick={() => setCadastroRapidoAberto((current) => !current)}
                style={{ ...secondaryActionButtonStyle, height: 36 }}
              >
                {cadastroRapidoAberto ? 'Fechar cadastro rápido' : 'Adicionar produto/serviço'}
              </button>
            </div>

            {cadastroRapidoAberto && (
              <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
                  <select value={cadastroRapidoProduto.tipo} onChange={(event) => atualizarCadastroRapidoProduto('tipo', event.target.value)} style={{ ...inputStyle, background: '#fff' }}>
                    <option value="PRODUTO">Produto</option>
                    <option value="SERVICO">Serviço</option>
                    <option value="PACOTE">Pacote</option>
                    <option value="KIT">Kit</option>
                  </select>
                  <input value={cadastroRapidoProduto.nome} onChange={(event) => atualizarCadastroRapidoProduto('nome', event.target.value)} placeholder="Nome" style={inputStyle} />
                  <input value={cadastroRapidoProduto.codigoInterno} onChange={(event) => atualizarCadastroRapidoProduto('codigoInterno', event.target.value)} placeholder="Código interno" style={inputStyle} />
                  <input value={cadastroRapidoProduto.codigoBarras} onChange={(event) => atualizarCadastroRapidoProduto('codigoBarras', event.target.value)} placeholder="Código de barras" style={inputStyle} />
                  <input value={cadastroRapidoProduto.unidadeVenda} onChange={(event) => atualizarCadastroRapidoProduto('unidadeVenda', event.target.value.toUpperCase())} placeholder="Unidade de venda" style={inputStyle} />
                  <select value={cadastroRapidoProduto.grupoId} onChange={(event) => atualizarCadastroRapidoProduto('grupoId', event.target.value)} style={{ ...inputStyle, background: '#fff' }}>
                    <option value="">Grupo (obrigatório)</option>
                    {gruposCadastro.map((grupo) => (
                      <option key={grupo.id} value={grupo.id}>{grupo.nome}</option>
                    ))}
                  </select>
                  <select value={cadastroRapidoProduto.marcaId} onChange={(event) => atualizarCadastroRapidoProduto('marcaId', event.target.value)} style={{ ...inputStyle, background: '#fff' }}>
                    <option value="">Marca (obrigatória)</option>
                    {marcasCadastro.map((marca) => (
                      <option key={marca.id} value={marca.id}>{marca.nome}</option>
                    ))}
                  </select>
                  <input value={cadastroRapidoProduto.custoAtual} onChange={(event) => atualizarCadastroRapidoProduto('custoAtual', event.target.value)} placeholder="Custo" style={inputStyle} />
                  <input value={cadastroRapidoProduto.precoVenda} onChange={(event) => atualizarCadastroRapidoProduto('precoVenda', event.target.value)} placeholder="Preço de venda" style={inputStyle} />
                  <input value={cadastroRapidoProduto.markupAlvo} onChange={(event) => atualizarCadastroRapidoProduto('markupAlvo', event.target.value)} placeholder="Markup alvo (%)" style={inputStyle} />
                  <input value={cadastroRapidoProduto.estoqueInicial} onChange={(event) => atualizarCadastroRapidoProduto('estoqueInicial', event.target.value)} placeholder="Estoque inicial" style={inputStyle} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setCadastroRapidoProduto(buildCadastroRapidoProdutoForm(cadastroRapidoTipoPadrao))}
                    style={secondaryActionButtonStyle}
                  >
                    Limpar
                  </button>
                  <button
                    onClick={cadastrarProdutoRapido}
                    style={{ ...actionButtonStyle, height: 36 }}
                  >
                    Cadastrar manualmente
                  </button>
                </div>
              </div>
            )}
          </section>

          <section style={{ ...card, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, color: '#243332' }}>
                  {isComprasModuleView ? 'Atalhos de compras' : isServicosView ? 'Atalhos de serviços e compras' : 'Atalhos de estoque e compras'}
                </h3>
                <p style={{ margin: '4px 0 0', color: '#647674', fontSize: 13 }}>
                  {isComprasModuleView
                    ? 'Abra rapidamente sugestoes, pedidos e recebimento fiscal sem sair da central de compras.'
                    : 'Acesse pesquisas e operacoes mais usadas com um clique.'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Pesquisar por nome, codigo, barras ou SKU"
                  style={{ height: 36, minWidth: 180, width: 'min(100%, 360px)', border: '1px solid #d1dddd', borderRadius: 8, padding: '0 10px', fontSize: 13 }}
                />
                <button
                  onClick={() => aplicarAtalho('EST-AT-01')}
                  style={{ height: 36, display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #c7d5d2', background: '#fff', color: '#2f6f73', borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontWeight: 700 }}
                >
                  <Search size={14} /> Pesquisar
                </button>
                <button
                  onClick={async () => {
                    setBusca('');
                    setHashState({});
                    await carregarCatalogo(catalogoDefaultParams, filtroCatalogoBaseLabel);
                  }}
                  style={{ height: 36, display: 'inline-flex', alignItems: 'center', border: '1px solid #d9e2e1', background: '#f8fbfa', color: '#54736b', borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontWeight: 700 }}
                >
                  Limpar
                </button>
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
              {atalhosAgrupados.map((grupo) => (
                <div key={grupo.id} style={{ border: '1px solid #d9e2e1', borderRadius: 10, background: '#f8fbfa' }}>
                  <button
                    onClick={() => setAtalhosCascataAberto((current) => current === grupo.id ? null : grupo.id)}
                    style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#2f6f73', fontWeight: 800, fontSize: 13 }}
                  >
                    <span>{grupo.titulo}</span>
                    <span style={{ color: '#7b8a88', fontSize: 12 }}>{grupo.atalhos.length} opções</span>
                  </button>

                  {atalhosCascataAberto === grupo.id && (
                    <div style={{ borderTop: '1px solid #d9e2e1', padding: 10, display: 'grid', gap: 8 }}>
                      <div style={{ color: '#647674', fontSize: 12 }}>{grupo.descricao}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {grupo.atalhos.map((atalho) => (
                          <button
                            key={atalho.codigo}
                            onClick={() => aplicarAtalho(atalho.codigo)}
                            style={{ border: '1px solid #d4dfdd', background: '#fff', color: '#2f6f73', borderRadius: 999, padding: '7px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                            title={atalho.acaoRapida}
                          >
                            {atalho.titulo}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
            {resumoOperacionalCards.map((item) => (
              <Kpi key={item.label} icon={item.icon} label={item.label} value={item.value} tone={item.tone} />
            ))}
          </div>

          {isComprasXmlView && (
          <section id="compras-xml" style={{ ...card, padding: 16 }}>
            <section id="compras-nfe-cnpj" style={{ marginBottom: 12, padding: 12, border: '1px solid #d9e2e1', borderRadius: 8, background: '#f8fbfa' }}>
              <h3 style={{ margin: 0, fontSize: 16, color: '#243332' }}>NF-e Compras (CNPJ)</h3>
              <p style={{ margin: '6px 0 10px', color: '#647674', fontSize: 13 }}>
                Preencha dados fiscais e de transportadora exigidos em operações B2B. Esses dados são anexados ao recebimento da nota.
              </p>
              <div style={{ marginBottom: 10, padding: 8, borderRadius: 8, background: '#fff6e8', border: '1px solid #ead2a4', color: '#7b5a24', fontSize: 12 }}>
                Obrigatórios: CFOP, natureza da operação, CNPJ/IE de emitente e destinatário.
                Se modalidade de frete for diferente de sem frete, informar também transportadora, CNPJ, placa e UF do veículo.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
                <input value={recebimentoManual.nfeCnpj.emitenteCnpj} onChange={(event) => setRecebimentoManual((current) => ({ ...current, nfeCnpj: { ...current.nfeCnpj, emitenteCnpj: event.target.value } }))} placeholder="Emitente CNPJ" style={inputStyle} />
                <input value={recebimentoManual.nfeCnpj.emitenteIe} onChange={(event) => setRecebimentoManual((current) => ({ ...current, nfeCnpj: { ...current.nfeCnpj, emitenteIe: event.target.value } }))} placeholder="Emitente IE" style={inputStyle} />
                <input value={recebimentoManual.nfeCnpj.destinatarioCnpj} onChange={(event) => setRecebimentoManual((current) => ({ ...current, nfeCnpj: { ...current.nfeCnpj, destinatarioCnpj: event.target.value } }))} placeholder="Destinatário CNPJ" style={inputStyle} />
                <input value={recebimentoManual.nfeCnpj.destinatarioIe} onChange={(event) => setRecebimentoManual((current) => ({ ...current, nfeCnpj: { ...current.nfeCnpj, destinatarioIe: event.target.value } }))} placeholder="Destinatário IE" style={inputStyle} />
                <input value={recebimentoManual.nfeCnpj.naturezaOperacao} onChange={(event) => setRecebimentoManual((current) => ({ ...current, nfeCnpj: { ...current.nfeCnpj, naturezaOperacao: event.target.value } }))} placeholder="Natureza da operação" style={inputStyle} />
                <input value={recebimentoManual.nfeCnpj.cfopPrincipal} onChange={(event) => setRecebimentoManual((current) => ({ ...current, nfeCnpj: { ...current.nfeCnpj, cfopPrincipal: event.target.value } }))} placeholder="CFOP principal" style={inputStyle} />
                <input value={recebimentoManual.nfeCnpj.transportadoraNome} onChange={(event) => setRecebimentoManual((current) => ({ ...current, nfeCnpj: { ...current.nfeCnpj, transportadoraNome: event.target.value } }))} placeholder="Transportadora" style={inputStyle} />
                <input value={recebimentoManual.nfeCnpj.transportadoraCnpj} onChange={(event) => setRecebimentoManual((current) => ({ ...current, nfeCnpj: { ...current.nfeCnpj, transportadoraCnpj: event.target.value } }))} placeholder="Transportadora CNPJ" style={inputStyle} />
                <select value={recebimentoManual.nfeCnpj.modalidadeFrete} onChange={(event) => setRecebimentoManual((current) => ({ ...current, nfeCnpj: { ...current.nfeCnpj, modalidadeFrete: event.target.value } }))} style={{ ...inputStyle, background: '#fff' }}>
                  <option value="0">Frete por conta do emitente (0)</option>
                  <option value="1">Frete por conta do destinatário (1)</option>
                  <option value="2">Frete por terceiros (2)</option>
                  <option value="9">Sem frete (9)</option>
                </select>
                <input value={recebimentoManual.nfeCnpj.placaVeiculo} onChange={(event) => setRecebimentoManual((current) => ({ ...current, nfeCnpj: { ...current.nfeCnpj, placaVeiculo: event.target.value } }))} placeholder="Placa veículo" style={inputStyle} />
                <input value={recebimentoManual.nfeCnpj.ufVeiculo} onChange={(event) => setRecebimentoManual((current) => ({ ...current, nfeCnpj: { ...current.nfeCnpj, ufVeiculo: event.target.value.toUpperCase() } }))} placeholder="UF veículo" style={inputStyle} maxLength={2} />
              </div>
            </section>

            <h3 style={{ margin: 0, fontSize: 16, color: '#243332' }}>Importar NF-e de compra (XML)</h3>
            <p style={{ margin: '6px 0 10px', color: '#647674', fontSize: 13 }}>
              Absorve fornecedor, marca, validade e quantidade por item, cria produtos faltantes e da entrada no estoque automaticamente.
            </p>
            <textarea
              value={xmlCompra}
              onChange={(event) => handleXmlCompraChange(event.target.value)}
              placeholder="Cole aqui o XML completo da NF-e de compra"
              style={{ width: '100%', minHeight: 120, border: '1px solid #d1dddd', borderRadius: 8, padding: 10, fontSize: 12, fontFamily: 'Consolas, monospace' }}
            />
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px', border: '1px solid #d9e2e1', borderRadius: 8, cursor: 'pointer', color: '#2f6f73', fontWeight: 700, fontSize: 13 }}>
                Escolher arquivo XML
                <input type="file" accept=".xml,text/xml" onChange={carregarArquivoXml} style={{ display: 'none' }} />
              </label>
              {xmlFileName && <span style={{ color: '#647674', fontSize: 12 }}>Arquivo: {xmlFileName}</span>}
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={previewImportacaoXmlCompra}
                style={{ height: 36, display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid #d9e2e1', background: '#f8fbfa', color: '#54736b', borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontWeight: 700 }}
              >
                Pre-visualizar XML
              </button>
              <button
                onClick={importarXmlCompra}
                style={{ height: 36, display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid #c7d5d2', background: '#fff', color: '#2f6f73', borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontWeight: 700 }}
              >
                Importar XML
              </button>
              <button
                onClick={() => {
                  setXmlCompra('');
                  setXmlFileName('');
                  invalidarPreviewXml();
                }}
                style={{ height: 36, display: 'inline-flex', alignItems: 'center', border: '1px solid #d9e2e1', background: '#f8fbfa', color: '#54736b', borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontWeight: 700 }}
              >
                Limpar XML
              </button>
            </div>

            {previewXml?.notaFiscal && (
              <div style={{ marginTop: 12, padding: 10, border: '1px solid #d9e2e1', borderRadius: 8, background: '#fcfffd', color: '#243332', fontSize: 13 }}>
                <strong>Preview da NF-e:</strong>
                <div style={{ marginTop: 6 }}>
                  NF {previewXml.notaFiscal.numero}/{previewXml.notaFiscal.serie} | Fornecedor: {previewXml.notaFiscal.fornecedorNome || '-'} |
                  Total: R$ {Number(previewXml.notaFiscal.valorTotal || 0).toFixed(2)}
                </div>
                <div style={{ marginTop: 4 }}>
                  Itens: {previewXml.resumo?.itensNota || 0} | Produtos encontrados: {previewXml.resumo?.itensComProdutoEncontrado || 0} |
                  Produtos novos: {previewXml.resumo?.itensSemProdutoEncontrado || 0} | Marcas encontradas: {previewXml.resumo?.marcasEncontradas || 0}
                </div>
                {pedidoSugeridoXml && (
                  <div style={{ marginTop: 10, padding: 10, border: `1px solid ${getPedidoSugeridoTheme(pedidoSugeridoXml.nivel).border}`, borderRadius: 8, background: getPedidoSugeridoTheme(pedidoSugeridoXml.nivel).background }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <div>
                        <strong>Pedido sugerido:</strong> #{pedidoSugeridoXml.pedido.numero || pedidoSugeridoXml.pedido.id.slice(0, 8)}
                        <div style={{ marginTop: 4, color: '#647674' }}>
                          Fornecedor: {pedidoSugeridoXml.pedido.fornecedor?.nome || '-'} | Compatibilidade: {pedidoSugeridoXml.score} pontos
                        </div>
                        <div style={{ marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ color: getPedidoSugeridoTheme(pedidoSugeridoXml.nivel).color, background: '#fff', border: `1px solid ${getPedidoSugeridoTheme(pedidoSugeridoXml.nivel).border}`, padding: '4px 8px', borderRadius: 999, fontWeight: 700 }}>
                            {getPedidoSugeridoTheme(pedidoSugeridoXml.nivel).label}
                          </span>
                          <span style={{ color: '#2f6f73', background: '#edf8f5', border: '1px solid #cde6de', padding: '4px 8px', borderRadius: 999, fontWeight: 700 }}>
                            Confiabilidade global: {confiancaGlobalPedidoSugerido}%
                          </span>
                        </div>
                        <div style={{ marginTop: 6, color: '#54736b' }}>
                          {pedidoSugeridoXml.motivos.join(' • ')}
                        </div>
                        <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                          {pedidoSugeridoXml.criterios.map((criterio) => {
                            const percentual = criterio.maximo > 0
                              ? Math.max(0, Math.min(100, Math.round((criterio.pontos / criterio.maximo) * 100)))
                              : 0;

                            return (
                              <div key={criterio.label} style={{ display: 'grid', gap: 3 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: '#54736b', fontSize: 12 }}>
                                  <span>{criterio.label}</span>
                                  <strong>{percentual}%</strong>
                                </div>
                                <div style={{ width: '100%', height: 6, borderRadius: 999, background: '#e8efed', overflow: 'hidden' }}>
                                  <div
                                    style={{
                                      width: `${percentual}%`,
                                      height: '100%',
                                      background: getPedidoSugeridoTheme(pedidoSugeridoXml.nivel).color,
                                      transition: 'width 180ms ease',
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {pedidoSugeridoXml.alertas.length > 0 && (
                          <div style={{ marginTop: 6, color: '#9a6a2f', fontWeight: 700 }}>
                            Atenção: {pedidoSugeridoXml.alertas.join(' • ')}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => abrirDetalhePedido(pedidoSugeridoXml.pedido)}
                        style={{ height: 34, display: 'inline-flex', alignItems: 'center', border: '1px solid #c7d5d2', background: '#fff', color: '#2f6f73', borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontWeight: 700 }}
                      >
                        Abrir pedido sugerido
                      </button>
                    </div>
                  </div>
                )}
                {!pedidoSugeridoXml && (
                  <div style={{ marginTop: 10, padding: 10, border: '1px dashed #d9e2e1', borderRadius: 8, background: '#f8fbfa', color: '#647674' }}>
                    Nenhum pedido teve compatibilidade forte com este XML. Voce ainda pode abrir um pedido manualmente e usar o XML carregado no recebimento.
                  </div>
                )}
              </div>
            )}

            {previewXml?.itens && previewXml.itens.length > 0 && (
              <div style={{ marginTop: 12, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead style={{ background: '#f4f7f7', color: '#647674' }}>
                    <tr>
                      <th style={th}>Item XML</th>
                      <th style={th}>Qtd</th>
                      <th style={th}>Custo</th>
                      <th style={th}>Marca</th>
                      <th style={th}>Validade</th>
                      <th style={th}>Produto no catalogo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewXml.itens.slice(0, 8).map((item, index) => (
                      <tr key={`${item.nome}-${index}`} style={{ borderTop: '1px solid #edf1f0' }}>
                        <td style={td}>{item.nome}</td>
                        <td style={td}>{item.quantidade}</td>
                        <td style={td}>R$ {Number(item.custoUnitario || 0).toFixed(2)}</td>
                        <td style={td}>{item.marcaNome || '-'}</td>
                        <td style={td}>{item.validade || '-'}</td>
                        <td style={td}>{item.produtoEncontradoNome || 'Novo produto sera criado'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {importacaoXmlResumo && (
              <div style={{ marginTop: 12, padding: 10, border: '1px solid #d9e2e1', borderRadius: 8, background: '#f8fcfb', color: '#243332', fontSize: 13 }}>
                <strong>Importacao concluida:</strong>
                <div style={{ marginTop: 6 }}>
                  Itens na NF: {importacaoXmlResumo.itensNota} | Fornecedor criado: {importacaoXmlResumo.fornecedorCriado ? 'sim' : 'nao'} |
                  Marcas criadas: {importacaoXmlResumo.marcasCriadas} | Produtos criados: {importacaoXmlResumo.produtosCriados} | Produtos atualizados: {importacaoXmlResumo.produtosAtualizados}
                </div>
              </div>
            )}
          </section>
          )}

          {isComprasModuleView && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, alignItems: 'start' }}>
              <section style={{ ...card, overflow: 'hidden' }}>
                <div style={{ padding: 16, borderBottom: '1px solid #d9e2e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <strong>Notas fiscais de compra</strong>
                  <span style={{ fontSize: 12, color: '#647674' }}>{notasCompra.length} resultado(s)</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead style={{ background: '#f4f7f7', color: '#647674' }}>
                      <tr>
                        <th style={th}>NF</th>
                        <th style={th}>Fornecedor</th>
                        <th style={th}>Entrada</th>
                        <th style={th}>Valor</th>
                        <th style={th}>Financeiro</th>
                        <th style={th}>Pedido</th>
                        <th style={th}>Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {notasCompra.slice(0, 10).map((nota) => (
                        <tr key={`${nota.pedidoCompraId}-${nota.numero}-${nota.serie}`} style={{ borderTop: '1px solid #edf1f0' }}>
                          <td style={td}><strong>{nota.numero || '-'}</strong><div style={{ color: '#7b8a88', fontSize: 12 }}>Serie {nota.serie || '-'}</div></td>
                          <td style={td}>{nota.fornecedor || '-'}</td>
                          <td style={td}>{formatDate(nota.dataEntrada || nota.dataEmissao)}</td>
                          <td style={td}>{formatCurrency(nota.valorTotal)}</td>
                          <td style={td}><StatusFinanceiro lancamentos={nota.lancamentosFinanceiros} /></td>
                          <td style={td}>{nota.numeroPedido || '-'}</td>
                          <td style={td}>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              <button
                                onClick={() => setNotaDetalhe(nota)}
                                style={actionButtonStyle}
                              >
                                Detalhes
                              </button>
                              <button
                                onClick={() => aplicarFiltroFornecedorCompra(nota.fornecedorId)}
                                style={secondaryActionButtonStyle}
                                disabled={!nota.fornecedorId}
                              >
                                Filtrar fornecedor
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {notasCompra.length === 0 && <tr><td colSpan={7} style={{ ...td, color: '#647674' }}>Nenhuma nota encontrada com os filtros atuais.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>

              <section style={{ ...card, overflow: 'hidden' }}>
                <div style={{ padding: 16, borderBottom: '1px solid #d9e2e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <strong>{isNovosPedidosView ? 'Novos pedidos de compra' : 'Pedidos de compra'}</strong>
                  <span style={{ fontSize: 12, color: '#647674' }}>{pedidosCompra.length} resultado(s)</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead style={{ background: '#f4f7f7', color: '#647674' }}>
                      <tr>
                        <th style={th}>Pedido</th>
                        <th style={th}>Fornecedor</th>
                        <th style={th}>Criado em</th>
                        <th style={th}>Itens</th>
                        <th style={th}>Valor</th>
                        <th style={th}>Status</th>
                        <th style={th}>Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pedidosCompra.slice(0, 10).map((pedido) => (
                        <tr
                          key={pedido.id}
                          style={{
                            borderTop: '1px solid #edf1f0',
                            background: pedidoSugeridoXml?.pedido.id === pedido.id ? getPedidoSugeridoTheme(pedidoSugeridoXml.nivel).background : undefined,
                          }}
                        >
                          <td style={td}><strong>{pedido.numero || `Pedido ${pedido.id.slice(0, 8)}`}</strong></td>
                          <td style={td}>{pedido.fornecedor?.nome || '-'}</td>
                          <td style={td}>{formatDate(pedido.createdAt)}</td>
                          <td style={td}>{pedido.itens?.length || 0}</td>
                          <td style={td}>{formatCurrency(pedido.valorTotal || pedido.valorProdutos)}</td>
                          <td style={td}>
                            <div style={{ display: 'grid', gap: 6 }}>
                              <StatusPedido status={pedido.status} />
                              {pedidoSugeridoXml?.pedido.id === pedido.id && (
                                <span style={{ color: getPedidoSugeridoTheme(pedidoSugeridoXml.nivel).color, fontSize: 12, fontWeight: 700 }}>
                                  {getPedidoSugeridoTheme(pedidoSugeridoXml.nivel).label}
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={td}>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              <button
                                onClick={() => abrirDetalhePedido(pedido)}
                                style={actionButtonStyle}
                              >
                                Detalhes
                              </button>
                              <button
                                onClick={() => aplicarFiltroFornecedorCompra(resolverFornecedorIdDoPedido(pedido))}
                                style={secondaryActionButtonStyle}
                                disabled={!resolverFornecedorIdDoPedido(pedido)}
                              >
                                Filtrar fornecedor
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {pedidosCompra.length === 0 && <tr><td colSpan={7} style={{ ...td, color: '#647674' }}>Nenhum pedido encontrado com os filtros atuais.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          <section style={{ ...card, overflow: 'hidden' }}>
            <div style={{ padding: 16, borderBottom: '1px solid #d9e2e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <strong>
                {isComprasModuleView
                  ? 'Catalogo de apoio para compras'
                  : isServicosView
                    ? 'Resultado rapido de servicos'
                    : 'Resultado rapido do catalogo'}
              </strong>
              <span style={{ fontSize: 12, color: '#647674' }}>{filtroAtivo}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead style={{ background: '#f4f7f7', color: '#647674' }}>
                  <tr>
                    <th style={th}>Item</th>
                    <th style={th}>Marca</th>
                    <th style={th}>Grupo</th>
                    <th style={th}>Estoque atual</th>
                    <th style={th}>Estoque minimo</th>
                    <th style={th}>Status estoque</th>
                    <th style={th}>Validade</th>
                  </tr>
                </thead>
                <tbody>
                  {catalogoProdutosServicos.slice(0, 12).map((item) => {
                    const status = getStatusCatalogo(item);
                    return (
                    <tr key={item.id} style={{ borderTop: '1px solid #edf1f0', background: status.background }}>
                      <td style={td}>
                        <strong>{item.nome}</strong>
                        <div style={{ color: '#7b8a88', fontSize: 12 }}>{item.codigoInterno || item.codigoBarras || 'Sem codigo'}</div>
                      </td>
                      <td style={td}>{item.marca || '-'}</td>
                      <td style={td}>{item.grupo || '-'}</td>
                      <td style={td}>{Number(item.estoqueAtual || 0)}</td>
                      <td style={td}>{Number(item.estoqueMinimo || 0)}</td>
                      <td style={td}>
                        <span style={{ color: status.color, background: `${status.color}18`, padding: '5px 8px', borderRadius: 999, fontWeight: 700 }}>
                          {status.label}
                        </span>
                      </td>
                      <td style={td}>{item.statusValidade || 'OK'}</td>
                    </tr>
                    );
                  })}
                  {catalogo.length === 0 && <tr><td colSpan={7} style={{ ...td, color: '#647674' }}>Nenhum item encontrado para este filtro.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          {isNovosPedidosView && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <section style={{ ...card, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: 15, color: '#243332', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShoppingCart size={16} color="#9a6a2f" /> Sugestoes de compra
                </h3>
                <button
                  onClick={criarPedidoRapidoPorSugestoes}
                  disabled={novoPedidoSalvando || sugestoesCompra.length === 0}
                  style={{ ...actionButtonStyle, opacity: (novoPedidoSalvando || sugestoesCompra.length === 0) ? 0.7 : 1 }}
                >
                  1 clique: criar pedido
                </button>
              </div>
              {sugestoesCompra.length > 0 && (
                <div
                  style={{
                    marginTop: 10,
                    border: '1px solid #d9e2e1',
                    borderRadius: 8,
                    padding: 10,
                    background: '#f8fbfa',
                    color: '#54736b',
                    fontSize: 12,
                  }}
                >
                  <strong>Confiança do pedido rápido:</strong> {confiancaPedidoRapido.score}% ({confiancaPedidoRapido.nivel}) com {confiancaPedidoRapido.itens} item(ns) analisados.
                </div>
              )}
              <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                {sugestoesCompra.slice(0, 5).map((sugestao) => (
                  <div key={sugestao.itemId} style={{ padding: 10, background: '#f8faf9', border: '1px solid #d9e2e1', borderRadius: 8 }}>
                    <strong>{sugestao.nomeItem}</strong>
                    <div style={{ color: '#647674', fontSize: 12 }}>Atual: {sugestao.estoqueAtual} | Comprar: {sugestao.quantidadeSugerida}</div>
                    <div style={{ color: '#7b8a88', fontSize: 11, marginTop: 3 }}>
                      Custo sugerido IA: {formatCurrency(custoSugeridoPorProduto.get(sugestao.itemId) || 0)}
                    </div>
                    <div style={{ color: '#2f6f73', fontSize: 11, marginTop: 3, fontWeight: 700 }}>
                      Confiança IA: {auditoriaSugestoesIa.get(sugestao.itemId)?.score || 0}% ({auditoriaSugestoesIa.get(sugestao.itemId)?.nivel || 'baixo'})
                    </div>
                    <div style={{ color: '#6b7d7a', fontSize: 11, marginTop: 4 }}>
                      {auditoriaSugestoesIa.get(sugestao.itemId)?.motivos.join(' • ')}
                    </div>
                    <button
                      onClick={() => adicionarSugestaoAoWizard(sugestao)}
                      style={{ ...secondaryActionButtonStyle, marginTop: 8 }}
                    >
                      Adicionar ao rascunho
                    </button>
                  </div>
                ))}
                {sugestoesCompra.length === 0 && <div style={{ color: '#647674', fontSize: 13 }}>Use o atalho "Gerar sugestao de compra" para listar itens.</div>}
              </div>
            </section>

            <section style={{ ...card, padding: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, color: '#243332' }}>Pedidos de compra em aberto</h3>
              <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                {pedidosAbertos.slice(0, 5).map((pedido) => (
                  <div key={pedido.id} style={{ padding: 10, background: '#f8faf9', border: '1px solid #d9e2e1', borderRadius: 8 }}>
                    <strong>{pedido.numero || `Pedido ${pedido.id.slice(0, 8)}`}</strong>
                    <div style={{ color: '#647674', fontSize: 12 }}>Fornecedor: {pedido.fornecedor?.nome || '-'} | Status: {pedido.status || '-'}</div>
                  </div>
                ))}
                {pedidosAbertos.length === 0 && <div style={{ color: '#647674', fontSize: 13 }}>Use o atalho "Filtrar pedidos de compra" para listar pedidos.</div>}
              </div>
            </section>

            <section style={{ ...card, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: 15, color: '#243332' }}>Assistente de novo pedido (wizard)</h3>
                <button onClick={iniciarWizardNovoPedido} style={secondaryActionButtonStyle}>Reiniciar</button>
              </div>

              <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[1, 2, 3].map((step) => (
                  <span key={step} style={{ padding: '5px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, border: '1px solid #d9e2e1', background: novoPedidoPasso === step ? '#e8f5f2' : '#f8fbfa', color: novoPedidoPasso === step ? '#2f6f73' : '#647674' }}>
                    Passo {step}
                  </span>
                ))}
              </div>

              {novoPedidoPasso === 1 && (
                <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                  <div style={{ padding: 10, border: '1px solid #d9e2e1', borderRadius: 8, background: '#f8fbfa', display: 'grid', gap: 6 }}>
                    <strong style={{ color: '#243332' }}>Sugestão automática de fornecedor</strong>
                    <div style={{ color: '#647674', fontSize: 12 }}>
                      Ranking baseado em histórico de pedidos, recorrência e pendências em aberto.
                    </div>
                    <div style={{ display: 'grid', gap: 6 }}>
                      {fornecedoresRankingNovoPedido.map((fornecedor, index) => (
                        <button
                          key={fornecedor.id}
                          onClick={() => setNovoPedidoFornecedorId(fornecedor.id)}
                          style={{
                            ...secondaryActionButtonStyle,
                            justifyContent: 'space-between',
                            borderColor: novoPedidoFornecedorId === fornecedor.id ? '#b7ddc4' : '#d9e2e1',
                            background: novoPedidoFornecedorId === fornecedor.id ? '#eefaf4' : '#fff',
                            color: '#2f6f73',
                            width: '100%',
                          }}
                        >
                          <span>#{index + 1} {fornecedor.nome}</span>
                          <span style={{ fontSize: 11 }}>score {fornecedor.score}</span>
                        </button>
                      ))}
                      {fornecedoresRankingNovoPedido.length === 0 && (
                        <div style={{ color: '#647674', fontSize: 12 }}>Sem histórico suficiente; selecione manualmente.</div>
                      )}
                    </div>
                  </div>

                  <label style={{ color: '#54736b', fontSize: 12, fontWeight: 700 }}>Fornecedor</label>
                  <select
                    value={novoPedidoFornecedorId}
                    onChange={(event) => setNovoPedidoFornecedorId(event.target.value)}
                    style={{ ...inputStyle, background: '#fff' }}
                  >
                    <option value="">Selecione fornecedor</option>
                    {fornecedoresFiltro.map((fornecedor) => (
                      <option key={fornecedor.id} value={fornecedor.id}>{fornecedor.nome}</option>
                    ))}
                  </select>
                </div>
              )}

              {novoPedidoPasso === 2 && (
                <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                  <div style={{ padding: 10, border: '1px solid #d9e2e1', borderRadius: 8, background: '#f8fbfa', display: 'grid', gap: 8 }}>
                    <strong style={{ color: '#243332' }}>Adicionar item manual pelo catálogo</strong>
                    <input
                      value={novoPedidoBuscaCatalogo}
                      onChange={(event) => setNovoPedidoBuscaCatalogo(event.target.value)}
                      placeholder="Buscar produto por nome ou código"
                      style={inputStyle}
                    />
                    <div style={{ display: 'grid', gap: 6 }}>
                      {itensCatalogoParaWizard.map((itemCatalogo) => (
                        <div key={`cat-${itemCatalogo.id}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', border: '1px solid #d9e2e1', borderRadius: 8, padding: 8, background: '#fff' }}>
                          <div>
                            <strong style={{ color: '#243332' }}>{itemCatalogo.nome}</strong>
                            <div style={{ color: '#7b8a88', fontSize: 11 }}>Estoque: {Number(itemCatalogo.estoqueAtual || 0)} | Min: {Number(itemCatalogo.estoqueMinimo || 0)}</div>
                          </div>
                          <button onClick={() => adicionarItemManualAoWizard(itemCatalogo)} style={secondaryActionButtonStyle}>Adicionar</button>
                        </div>
                      ))}
                      {itensCatalogoParaWizard.length === 0 && (
                        <div style={{ color: '#647674', fontSize: 12 }}>Nenhum item de catálogo encontrado para o filtro informado.</div>
                      )}
                    </div>
                  </div>

                  {novoPedidoItens.map((item) => {
                    const auditoriaItem = auditoriaItensNovoPedido.get(item.id);

                    return (
                      <div key={item.id} style={{ border: '1px solid #d9e2e1', background: '#f8fbfa', borderRadius: 8, padding: 8, display: 'grid', gap: 8 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr 0.6fr auto', gap: 8, alignItems: 'center' }}>
                          <div>
                            <strong style={{ color: '#243332' }}>{item.nome}</strong>
                            <div style={{ color: '#7b8a88', fontSize: 11 }}>Origem: {item.origem === 'sugestao' ? 'Sugestão IA' : 'Manual'}</div>
                            <div style={{ color: '#2f6f73', fontSize: 11, fontWeight: 700, marginTop: 2 }}>
                              Confiança: {auditoriaItem?.score || 0}% ({auditoriaItem?.nivel || 'baixo'})
                            </div>
                          </div>
                          <input
                            value={item.quantidade}
                            onChange={(event) => setNovoPedidoItens((current) => current.map((row) => row.id === item.id ? { ...row, quantidade: event.target.value } : row))}
                            placeholder="Qtd"
                            style={{ ...inputStyle, height: 32 }}
                          />
                          <input
                            value={item.custoUnitario}
                            onChange={(event) => setNovoPedidoItens((current) => current.map((row) => row.id === item.id ? { ...row, custoUnitario: event.target.value } : row))}
                            placeholder="Custo"
                            style={{ ...inputStyle, height: 32 }}
                          />
                          <button
                            onClick={() => setNovoPedidoItens((current) => current.filter((row) => row.id !== item.id))}
                            style={secondaryActionButtonStyle}
                          >
                            Remover
                          </button>
                        </div>

                        <div style={{ color: '#6b7d7a', fontSize: 11 }}>
                          {auditoriaItem?.motivos.join(' • ')}
                        </div>
                      </div>
                    );
                  })}
                  {novoPedidoItens.length === 0 && (
                    <div style={{ color: '#647674', fontSize: 13 }}>Nenhum item no rascunho. Use as sugestões de compra para iniciar.</div>
                  )}
                </div>
              )}

              {novoPedidoPasso === 3 && (
                <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                  {duplicidadeNovoPedido && (
                    <div style={{ padding: 10, border: '1px solid #efc6c6', borderRadius: 8, background: '#fff1f1', color: '#7d4a4a' }}>
                      <div style={{ fontWeight: 800 }}>
                        Possível pedido duplicado detectado: {duplicidadeNovoPedido.numero || duplicidadeNovoPedido.id.slice(0, 8)}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 12 }}>
                        Mesmo fornecedor e alta sobreposição de itens/quantidades com pedido em aberto.
                      </div>
                      <label style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={confirmacaoDuplicidadeNovoPedido}
                          onChange={(event) => setConfirmacaoDuplicidadeNovoPedido(event.target.checked)}
                        />
                        Confirmo que desejo criar mesmo com risco de duplicidade.
                      </label>
                    </div>
                  )}

                  <div style={{ border: '1px solid #d9e2e1', borderRadius: 8, background: '#f8fbfa', padding: 10, color: '#54736b', fontSize: 13 }}>
                    <div><strong>Fornecedor:</strong> {fornecedorSelecionadoNovoPedido}</div>
                    <div><strong>Itens:</strong> {novoPedidoItens.length}</div>
                    <div><strong>Total itens:</strong> {formatCurrency(totalNovoPedidoEstimado)}</div>
                    <div><strong>Frete:</strong> {formatCurrency(valorFreteNovoPedidoNumero)}</div>
                    <div><strong>Impostos:</strong> {formatCurrency(valorImpostosNovoPedidoNumero)}</div>
                    <div><strong>Total geral estimado:</strong> {formatCurrency(totalGeralNovoPedidoEstimado)}</div>
                  </div>

                  {novoPedidoItens.length > 0 && (
                    <div style={{ border: '1px solid #d9e2e1', borderRadius: 8, background: '#fcfffd', padding: 10, display: 'grid', gap: 8 }}>
                      <strong style={{ color: '#243332' }}>Trilha IA por item</strong>
                      {novoPedidoItens.map((item) => {
                        const auditoriaItem = auditoriaItensNovoPedido.get(item.id);
                        return (
                          <div key={`aud-${item.id}`} style={{ border: '1px solid #e3eceb', borderRadius: 8, padding: 8, background: '#fff' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                              <strong style={{ color: '#243332' }}>{item.nome}</strong>
                              <span style={{ color: '#2f6f73', fontWeight: 700, fontSize: 12 }}>
                                {auditoriaItem?.score || 0}% ({auditoriaItem?.nivel || 'baixo'})
                              </span>
                            </div>
                            <div style={{ marginTop: 4, color: '#6b7d7a', fontSize: 11 }}>
                              {auditoriaItem?.motivos.join(' • ')}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                    <input
                      value={novoPedidoValorFrete}
                      onChange={(event) => setNovoPedidoValorFrete(event.target.value)}
                      placeholder="Valor frete"
                      style={inputStyle}
                    />
                    <input
                      value={novoPedidoValorImpostos}
                      onChange={(event) => setNovoPedidoValorImpostos(event.target.value)}
                      placeholder="Valor impostos"
                      style={inputStyle}
                    />
                  </div>

                  <textarea
                    value={novoPedidoObservacoes}
                    onChange={(event) => setNovoPedidoObservacoes(event.target.value)}
                    placeholder="Observações do pedido"
                    style={{ width: '100%', minHeight: 70, border: '1px solid #d1dddd', borderRadius: 8, padding: 10, fontSize: 13, resize: 'vertical' }}
                  />
                </div>
              )}

              <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                <button
                  onClick={() => setNovoPedidoPasso((current) => Math.max(1, current - 1))}
                  disabled={novoPedidoPasso === 1}
                  style={secondaryActionButtonStyle}
                >
                  Voltar
                </button>
                <button
                  onClick={() => {
                    if (novoPedidoPasso === 1 && !novoPedidoFornecedorId) {
                      setErro('Selecione um fornecedor para continuar no wizard de novo pedido.');
                      return;
                    }
                    if (novoPedidoPasso === 2 && novoPedidoItens.length === 0) {
                      setErro('Adicione ao menos um item ao rascunho do novo pedido.');
                      return;
                    }
                    if (novoPedidoPasso < 3) {
                      setErro('');
                      setNovoPedidoPasso((current) => current + 1);
                      return;
                    }

                    concluirWizardNovoPedido();
                  }}
                  style={{ ...actionButtonStyle, opacity: novoPedidoSalvando ? 0.75 : 1 }}
                  disabled={novoPedidoSalvando}
                >
                  {novoPedidoPasso < 3 ? 'Avançar' : novoPedidoSalvando ? 'Criando pedido...' : 'Concluir e criar pedido'}
                </button>
              </div>
            </section>
          </div>
          )}

          {loadingAtalho && <div style={{ ...card, padding: 12, color: '#647674' }}>Aplicando atalho operacional...</div>}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, alignItems: 'start' }}>
            <section style={{ ...card, overflow: 'hidden' }}>
              <div style={{ padding: 16, borderBottom: '1px solid #d9e2e1', display: 'flex', alignItems: 'center', gap: 10 }}>
                <ClipboardCheck size={18} color="#2f6f73" />
                <strong>Mapa de disponibilidade</strong>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead style={{ background: '#f4f7f7', color: '#647674' }}>
                    <tr>
                      <th style={th}>Produto</th>
                      <th style={th}>Marca</th>
                      <th style={th}>Fisico</th>
                      <th style={th}>Reservado</th>
                      <th style={th}>Disponivel</th>
                      <th style={th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.slice(0, 12).map((item) => (
                      <tr key={item.id} style={{ borderTop: '1px solid #edf1f0' }}>
                        <td style={td}><strong>{item.nome}</strong><div style={{ color: '#7b8a88', fontSize: 12 }}>{item.sku || 'Sem SKU'}</div></td>
                        <td style={td}>{item.marca || '-'}</td>
                        <td style={td}>{item.fisico}</td>
                        <td style={td}>{item.reservado}</td>
                        <td style={td}><strong>{item.disponivel}</strong></td>
                        <td style={td}><Status item={item} /></td>
                      </tr>
                    ))}
                    {itens.length === 0 && <tr><td colSpan={6} style={{ ...td, color: '#647674' }}>Nenhum produto encontrado.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            <section style={{ ...card, padding: 16 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Fila de atencao</h3>
              <AlertList title="Ruptura" items={analise?.rupturas ?? []} color="#a64b4b" />
              <AlertList title="Comprar em breve" items={analise?.baixoEstoque ?? []} color="#9a6a2f" />
            </section>
          </div>

          {notaDetalhe && (
            <section style={detailOverlayStyle}>
              <div style={detailPanelStyle}>
                <div style={detailHeaderStyle}>
                  <div>
                    <strong style={{ fontSize: 16 }}>NF {notaDetalhe.numero || '-'} / Serie {notaDetalhe.serie || '-'}</strong>
                    <div style={{ marginTop: 4, color: '#647674', fontSize: 13 }}>
                      Fornecedor: {notaDetalhe.fornecedor || '-'} | Pedido: {notaDetalhe.numeroPedido || '-'}
                    </div>
                  </div>
                  <button onClick={() => setNotaDetalhe(null)} style={closeButtonStyle}>Fechar</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
                  <DetailCard label="Entrada" value={formatDate(notaDetalhe.dataEntrada || notaDetalhe.dataEmissao)} />
                  <DetailCard label="Valor total" value={formatCurrency(notaDetalhe.valorTotal)} />
                  <DetailCard label="Frete" value={formatCurrency(notaDetalhe.valorFrete)} />
                  <DetailCard label="Impostos" value={formatCurrency(notaDetalhe.valorImpostos)} />
                </div>

                <div style={{ marginTop: 14 }}>
                  <div style={{ fontWeight: 800, marginBottom: 6, color: '#243332' }}>Chave de acesso</div>
                  <div style={{ padding: 10, border: '1px solid #d9e2e1', borderRadius: 8, background: '#f8faf9', color: '#647674', wordBreak: 'break-all' }}>
                    {notaDetalhe.chaveAcesso || 'Nao informada'}
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <div style={{ fontWeight: 800, marginBottom: 8, color: '#243332' }}>Lancamentos financeiros</div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {(notaDetalhe.lancamentosFinanceiros || []).map((lancamento, index) => (
                      <div key={lancamento.id || `${index}-${lancamento.vencimento}`} style={{ padding: 10, border: '1px solid #d9e2e1', borderRadius: 8, background: '#fff' }}>
                        <strong>{formatCurrency(lancamento.valor)}</strong>
                        <div style={{ color: '#647674', fontSize: 12, marginTop: 4 }}>
                          Situacao: {String(lancamento.situacao || 'PENDENTE')} | Vencimento: {formatDate(lancamento.vencimento)}
                        </div>
                      </div>
                    ))}
                    {(!notaDetalhe.lancamentosFinanceiros || notaDetalhe.lancamentosFinanceiros.length === 0) && (
                      <div style={{ color: '#647674', fontSize: 13 }}>Nenhum lancamento financeiro vinculado a esta nota.</div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {pedidoDetalhe && (
            <section style={detailOverlayStyle}>
              <div style={detailPanelStyle}>
                <div style={detailHeaderStyle}>
                  <div>
                    <strong style={{ fontSize: 16 }}>{pedidoDetalhe.numero || `Pedido ${pedidoDetalhe.id.slice(0, 8)}`}</strong>
                    <div style={{ marginTop: 4, color: '#647674', fontSize: 13 }}>
                      Fornecedor: {pedidoDetalhe.fornecedor?.nome || '-'} | Criado em {formatDate(pedidoDetalhe.createdAt)}
                    </div>
                  </div>
                  <button onClick={() => setPedidoDetalhe(null)} style={closeButtonStyle}>Fechar</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
                  <DetailCard label="Status" value={<StatusPedido status={pedidoDetalhe.status} />} />
                  <DetailCard label="Itens" value={String(pedidoDetalhe.itens?.length || 0)} />
                  <DetailCard label="Valor" value={formatCurrency(pedidoDetalhe.valorTotal || pedidoDetalhe.valorProdutos)} />
                  <DetailCard label="Recebimento" value={`${(pedidoDetalhe.itens || []).reduce((acc, item) => acc + Number(item.quantidadeRecebida || 0), 0)} un`} />
                </div>

                {!['CANCELADO', 'RECEBIDO'].includes(String(pedidoDetalhe.status || '').toUpperCase()) && (
                  <div style={{ marginTop: 14, padding: 14, border: '1px solid #d9e2e1', borderRadius: 10, background: '#fcfffd' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontWeight: 800, color: '#243332' }}>Recebimento manual deste pedido</div>
                        <div style={{ marginTop: 4, color: '#647674', fontSize: 13 }}>Preencha a NF recebida e confirme as quantidades para dar entrada no estoque e gerar o financeiro.</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          onClick={preencherRecebimentoComXml}
                          style={secondaryActionButtonStyle}
                          disabled={!xmlCompra.trim() && !previewXml}
                        >
                          Usar XML carregado
                        </button>
                        <button
                          onClick={receberPedidoManualmente}
                          style={{
                            ...actionButtonStyle,
                            opacity: precisaConfirmacaoRisco && !confirmacaoRiscoRecebimento ? 0.7 : 1,
                            cursor: precisaConfirmacaoRisco && !confirmacaoRiscoRecebimento ? 'not-allowed' : 'pointer',
                          }}
                          disabled={precisaConfirmacaoRisco && !confirmacaoRiscoRecebimento}
                        >
                          Confirmar recebimento
                        </button>
                      </div>
                    </div>

                    {riscosRecebimento.length > 0 && (
                      <div style={{ marginTop: 10, padding: 10, border: '1px solid #ead2a4', borderRadius: 8, background: '#fff6e8', color: '#7b5a24' }}>
                        <div style={{ fontWeight: 800, marginBottom: 6 }}>
                          {precisaConfirmacaoRisco ? 'Conferência obrigatória antes de confirmar (riscos altos):' : 'Conferência recomendada (apenas riscos médios):'}
                        </div>
                        <div style={{ marginBottom: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: '#ffe9e9', color: '#9c2f2f', border: '1px solid #f2bcbc' }}>
                            Altos: {resumoRiscosRecebimento.altos}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: '#eef4ff', color: '#325b9b', border: '1px solid #c8d7f2' }}>
                            Médios: {resumoRiscosRecebimento.medios}
                          </span>
                          <button
                            type="button"
                            onClick={() => setMostrarSomenteRiscoAlto((current) => !current)}
                            style={{
                              height: 26,
                              border: '1px solid #d9e2e1',
                              background: mostrarSomenteRiscoAlto ? '#ffe9e9' : '#fff',
                              color: mostrarSomenteRiscoAlto ? '#9c2f2f' : '#54736b',
                              borderRadius: 999,
                              padding: '0 10px',
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {mostrarSomenteRiscoAlto ? 'Mostrar todos os riscos' : 'Somente risco alto'}
                          </button>
                        </div>
                        <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
                          {Array.from(riscosPorCategoria.entries()).map(([categoria, riscosCategoria]) => (
                            <div key={categoria} style={{ display: 'grid', gap: 4 }}>
                              <div style={{ fontWeight: 800, color: '#7b5a24', fontSize: 12 }}>{getRiscoCategoriaLabel(categoria)}</div>
                              {riscosCategoria.map((risco, index) => (
                                <div key={`${categoria}-${risco.mensagem}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 800,
                                      padding: '2px 6px',
                                      borderRadius: 999,
                                      background: risco.severidade === 'alta' ? '#ffe9e9' : '#eef4ff',
                                      color: risco.severidade === 'alta' ? '#9c2f2f' : '#325b9b',
                                      border: risco.severidade === 'alta' ? '1px solid #f2bcbc' : '1px solid #c8d7f2',
                                    }}
                                  >
                                    {risco.severidade === 'alta' ? 'ALTA' : 'MEDIA'}
                                  </span>
                                  <span>• {risco.mensagem}</span>
                                </div>
                              ))}
                            </div>
                          ))}
                          {riscosPorCategoria.size === 0 && (
                            <div style={{ color: '#647674' }}>
                              Nenhum risco encontrado para o filtro atual.
                            </div>
                          )}
                        </div>
                        {precisaConfirmacaoRisco && (
                          <label style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={confirmacaoRiscoRecebimento}
                              onChange={(event) => setConfirmacaoRiscoRecebimento(event.target.checked)}
                            />
                            Confirmo que revisei as divergências e desejo concluir o recebimento.
                          </label>
                        )}
                      </div>
                    )}

                    <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                      <input value={recebimentoManual.numero} onChange={(event) => setRecebimentoManual((current) => ({ ...current, numero: event.target.value }))} placeholder="Numero da NF" style={inputStyle} />
                      <input value={recebimentoManual.serie} onChange={(event) => setRecebimentoManual((current) => ({ ...current, serie: event.target.value }))} placeholder="Serie" style={inputStyle} />
                      <input type="date" value={recebimentoManual.dataEmissao} onChange={(event) => setRecebimentoManual((current) => ({ ...current, dataEmissao: event.target.value }))} style={inputStyle} />
                      <input type="date" value={recebimentoManual.dataEntrada} onChange={(event) => setRecebimentoManual((current) => ({ ...current, dataEntrada: event.target.value }))} style={inputStyle} />
                      <input type="date" value={recebimentoManual.vencimento} onChange={(event) => setRecebimentoManual((current) => ({ ...current, vencimento: event.target.value }))} style={inputStyle} />
                      <select value={recebimentoManual.depositoDestinoId} onChange={(event) => setRecebimentoManual((current) => ({ ...current, depositoDestinoId: event.target.value }))} style={{ ...inputStyle, background: '#fff' }}>
                        <option value="">Deposito padrao</option>
                        {depositos.map((deposito) => <option key={deposito.id} value={deposito.id}>{deposito.nome}</option>)}
                      </select>
                      <input value={recebimentoManual.valorFrete} onChange={(event) => setRecebimentoManual((current) => ({ ...current, valorFrete: event.target.value }))} placeholder="Frete" style={inputStyle} />
                      <input value={recebimentoManual.valorImpostos} onChange={(event) => setRecebimentoManual((current) => ({ ...current, valorImpostos: event.target.value }))} placeholder="Impostos" style={inputStyle} />
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <input value={recebimentoManual.chaveAcesso} onChange={(event) => setRecebimentoManual((current) => ({ ...current, chaveAcesso: event.target.value }))} placeholder="Chave de acesso da NF-e" style={{ ...inputStyle, width: '100%' }} />
                    </div>

                    <div style={{ marginTop: 10, padding: 10, border: '1px solid #d9e2e1', borderRadius: 8, background: '#f8fbfa' }}>
                      <div style={{ fontWeight: 800, color: '#243332', marginBottom: 8 }}>Aba NF-e Compras (CNPJ)</div>
                      <div style={{ marginBottom: 10, padding: 8, borderRadius: 8, background: '#fff6e8', border: '1px solid #ead2a4', color: '#7b5a24', fontSize: 12 }}>
                        Obrigatórios: CFOP, natureza da operação, CNPJ/IE de emitente e destinatário.
                        Com frete: incluir transportadora, CNPJ, placa e UF do veículo.
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
                        <input value={recebimentoManual.nfeCnpj.emitenteCnpj} onChange={(event) => setRecebimentoManual((current) => ({ ...current, nfeCnpj: { ...current.nfeCnpj, emitenteCnpj: event.target.value } }))} placeholder="Emitente CNPJ" style={inputStyle} />
                        <input value={recebimentoManual.nfeCnpj.emitenteIe} onChange={(event) => setRecebimentoManual((current) => ({ ...current, nfeCnpj: { ...current.nfeCnpj, emitenteIe: event.target.value } }))} placeholder="Emitente IE" style={inputStyle} />
                        <input value={recebimentoManual.nfeCnpj.destinatarioCnpj} onChange={(event) => setRecebimentoManual((current) => ({ ...current, nfeCnpj: { ...current.nfeCnpj, destinatarioCnpj: event.target.value } }))} placeholder="Destinatário CNPJ" style={inputStyle} />
                        <input value={recebimentoManual.nfeCnpj.destinatarioIe} onChange={(event) => setRecebimentoManual((current) => ({ ...current, nfeCnpj: { ...current.nfeCnpj, destinatarioIe: event.target.value } }))} placeholder="Destinatário IE" style={inputStyle} />
                        <input value={recebimentoManual.nfeCnpj.naturezaOperacao} onChange={(event) => setRecebimentoManual((current) => ({ ...current, nfeCnpj: { ...current.nfeCnpj, naturezaOperacao: event.target.value } }))} placeholder="Natureza da operação" style={inputStyle} />
                        <input value={recebimentoManual.nfeCnpj.cfopPrincipal} onChange={(event) => setRecebimentoManual((current) => ({ ...current, nfeCnpj: { ...current.nfeCnpj, cfopPrincipal: event.target.value } }))} placeholder="CFOP principal" style={inputStyle} />
                        <input value={recebimentoManual.nfeCnpj.transportadoraNome} onChange={(event) => setRecebimentoManual((current) => ({ ...current, nfeCnpj: { ...current.nfeCnpj, transportadoraNome: event.target.value } }))} placeholder="Transportadora" style={inputStyle} />
                        <input value={recebimentoManual.nfeCnpj.transportadoraCnpj} onChange={(event) => setRecebimentoManual((current) => ({ ...current, nfeCnpj: { ...current.nfeCnpj, transportadoraCnpj: event.target.value } }))} placeholder="Transportadora CNPJ" style={inputStyle} />
                        <select value={recebimentoManual.nfeCnpj.modalidadeFrete} onChange={(event) => setRecebimentoManual((current) => ({ ...current, nfeCnpj: { ...current.nfeCnpj, modalidadeFrete: event.target.value } }))} style={{ ...inputStyle, background: '#fff' }}>
                          <option value="0">Frete por conta do emitente (0)</option>
                          <option value="1">Frete por conta do destinatário (1)</option>
                          <option value="2">Frete por terceiros (2)</option>
                          <option value="9">Sem frete (9)</option>
                        </select>
                        <input value={recebimentoManual.nfeCnpj.placaVeiculo} onChange={(event) => setRecebimentoManual((current) => ({ ...current, nfeCnpj: { ...current.nfeCnpj, placaVeiculo: event.target.value } }))} placeholder="Placa veículo" style={inputStyle} />
                        <input value={recebimentoManual.nfeCnpj.ufVeiculo} onChange={(event) => setRecebimentoManual((current) => ({ ...current, nfeCnpj: { ...current.nfeCnpj, ufVeiculo: event.target.value.toUpperCase() } }))} placeholder="UF veículo" style={inputStyle} maxLength={2} />
                      </div>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <textarea value={recebimentoManual.observacoes} onChange={(event) => setRecebimentoManual((current) => ({ ...current, observacoes: event.target.value }))} placeholder="Observacoes do recebimento" style={{ width: '100%', minHeight: 72, border: '1px solid #d1dddd', borderRadius: 8, padding: 10, fontSize: 13, resize: 'vertical' }} />
                    </div>

                    <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                      <div style={{ padding: 10, border: '1px solid #d9e2e1', borderRadius: 8, background: '#f8fbfa', display: 'grid', gap: 6 }}>
                        <strong style={{ color: '#243332' }}>Fracionamento inteligente por item</strong>
                        <div style={{ color: '#647674', fontSize: 12 }}>
                          Converta unidade de compra para unidade de estoque sem alterar o lançamento até a conferência final.
                        </div>
                        <div style={{ color: '#54736b', fontSize: 12 }}>
                          Total compra: {resumoFracionamento.totalCompra.toFixed(2)} | Estoque previsto após fracionamento: {resumoFracionamento.totalEstoque.toFixed(2)}
                        </div>
                      </div>

                      {divergenciasRecebimentoIa.length > 0 && (
                        <div style={{ padding: 10, border: '1px solid #d9e2e1', borderRadius: 8, background: '#fcfffd', display: 'grid', gap: 8 }}>
                          <strong style={{ color: '#243332' }}>Divergência IA por item</strong>
                          {divergenciasRecebimentoIa.map((item) => {
                            const tone = item.nivel === 'alto'
                              ? { color: '#9c2f2f', background: '#fff1f1', border: '#efc6c6' }
                              : item.nivel === 'medio'
                                ? { color: '#8a6126', background: '#fff8ed', border: '#efd9b7' }
                                : { color: '#2f6f73', background: '#eef8f8', border: '#c8e0df' };

                            return (
                              <div key={`divergencia-${item.itemId}`} style={{ border: `1px solid ${tone.border}`, background: tone.background, borderRadius: 8, padding: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                  <strong style={{ color: '#243332' }}>{item.nome}</strong>
                                  <span style={{ color: tone.color, fontWeight: 800, fontSize: 12 }}>Score {item.score}%</span>
                                </div>
                                <div style={{ marginTop: 4, color: '#54736b', fontSize: 12 }}>
                                  Pendente: {item.quantidadePendente} | Recebida: {item.quantidadeRecebida} | Estoque previsto: {item.quantidadeEstoquePrevista}
                                </div>
                                <div style={{ color: '#54736b', fontSize: 12 }}>
                                  Custo pedido: {formatCurrency(item.custoPedido)} | Custo recebido: {formatCurrency(item.custoRecebido)}
                                </div>
                                {item.observacoes.length > 0 && (
                                  <div style={{ marginTop: 4, color: tone.color, fontSize: 12, fontWeight: 700 }}>
                                    {item.observacoes.join(' • ')}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {recebimentoManual.itens.map((item) => (
                        <div key={item.itemId} style={{ padding: 10, border: '1px solid #d9e2e1', borderRadius: 8, background: '#fff', display: 'grid', gridTemplateColumns: '1.4fr 0.6fr 0.6fr 0.6fr 0.6fr', gap: 10, alignItems: 'center' }}>
                          <div>
                            <strong>{item.nome}</strong>
                            <div style={{ color: '#647674', fontSize: 12, marginTop: 4 }}>Pendente: {item.quantidadePendente}</div>
                          </div>
                          <input
                            value={item.quantidadeRecebida}
                            onChange={(event) => setRecebimentoManual((current) => ({
                              ...current,
                              itens: current.itens.map((linha) => linha.itemId === item.itemId ? { ...linha, quantidadeRecebida: event.target.value } : linha),
                            }))}
                            placeholder="Qtd recebida"
                            style={inputStyle}
                          />
                          <input
                            value={item.custoUnitario}
                            onChange={(event) => setRecebimentoManual((current) => ({
                              ...current,
                              itens: current.itens.map((linha) => linha.itemId === item.itemId ? { ...linha, custoUnitario: event.target.value } : linha),
                            }))}
                            placeholder="Custo"
                            style={inputStyle}
                          />
                          <input
                            value={fracionamentoItens[item.itemId]?.fatorConversao || '1'}
                            onChange={(event) => setFracionamentoItens((current) => ({
                              ...current,
                              [item.itemId]: {
                                fatorConversao: event.target.value,
                                unidadeFracionada: current[item.itemId]?.unidadeFracionada || 'UN',
                              },
                            }))}
                            placeholder="Fator"
                            style={inputStyle}
                          />
                          <input
                            value={fracionamentoItens[item.itemId]?.unidadeFracionada || 'UN'}
                            onChange={(event) => setFracionamentoItens((current) => ({
                              ...current,
                              [item.itemId]: {
                                fatorConversao: current[item.itemId]?.fatorConversao || '1',
                                unidadeFracionada: event.target.value.toUpperCase(),
                              },
                            }))}
                            placeholder="Unidade"
                            style={inputStyle}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pedidoDetalhe.observacoes && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontWeight: 800, marginBottom: 6, color: '#243332' }}>Observacoes</div>
                    <div style={{ padding: 10, border: '1px solid #d9e2e1', borderRadius: 8, background: '#f8faf9', color: '#647674' }}>
                      {pedidoDetalhe.observacoes}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 14 }}>
                  <div style={{ fontWeight: 800, marginBottom: 8, color: '#243332' }}>Itens do pedido</div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {(pedidoDetalhe.itens || []).map((item) => (
                      <div key={item.id} style={{ padding: 10, border: '1px solid #d9e2e1', borderRadius: 8, background: '#fff' }}>
                        <strong>{item.produto?.nome || `Produto ${item.id.slice(0, 8)}`}</strong>
                        <div style={{ color: '#647674', fontSize: 12, marginTop: 4 }}>
                          Quantidade: {Number(item.quantidade || 0)} | Recebida: {Number(item.quantidadeRecebida || 0)} | Custo: {formatCurrency(item.custoUnitario)}
                        </div>
                      </div>
                    ))}
                    {(!pedidoDetalhe.itens || pedidoDetalhe.itens.length === 0) && (
                      <div style={{ color: '#647674', fontSize: 13 }}>Este pedido nao possui itens carregados.</div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string | number; tone: string }) {
  return (
    <div style={{ ...card, padding: 16, borderLeft: `4px solid ${tone}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#647674', fontSize: 13 }}>
        {label}
        <Icon size={18} color={tone} />
      </div>
      <div style={{ marginTop: 10, fontSize: 25, fontWeight: 800, color: '#243332' }}>{value}</div>
    </div>
  );
}

function Status({ item }: { item: EstoqueItem }) {
  const label = item.ruptura ? 'Ruptura' : item.baixoEstoque ? 'Baixo' : 'Saudavel';
  const color = item.ruptura ? '#a64b4b' : item.baixoEstoque ? '#9a6a2f' : '#2f6f73';
  return <span style={{ color, background: `${color}18`, padding: '5px 8px', borderRadius: 999, fontWeight: 700 }}>{label}</span>;
}

function getStatusCatalogo(item: CatalogoItem): StatusCatalogo {
  const estoqueAtual = Number(item.estoqueAtual || 0);
  const estoqueMinimo = Number(item.estoqueMinimo || 0);

  if (estoqueAtual <= 0) {
    return { label: 'Ruptura', color: '#a64b4b', background: '#fff7f7' };
  }

  if (estoqueAtual <= estoqueMinimo) {
    return { label: 'Baixo', color: '#9a6a2f', background: '#fffaf4' };
  }

  return { label: 'Saudavel', color: '#2f6f73', background: '#f8fcfb' };
}

function AlertList({ title, items, color }: { title: string; items: EstoqueItem[]; color: string }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ color, fontWeight: 800, marginBottom: 8 }}>{title}</div>
      <div style={{ display: 'grid', gap: 8 }}>
        {items.slice(0, 5).map((item) => (
          <div key={item.id} style={{ padding: 10, background: '#f8faf9', border: '1px solid #d9e2e1', borderRadius: 8 }}>
            <strong>{item.nome}</strong>
            <div style={{ color: '#647674', fontSize: 12 }}>Disponivel: {item.disponivel} un | Minimo: {item.minimo}</div>
          </div>
        ))}
        {items.length === 0 && <div style={{ color: '#647674', fontSize: 13 }}>Sem pendencias agora.</div>}
      </div>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString('pt-BR');
}

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0));
}

function StatusPedido({ status }: { status?: string | null }) {
  const normalized = normalizeStatusPedidoCompra(status || 'SOLICITADO');
  const palette = normalized === 'RECEBIDO'
    ? { color: '#2f6f73', background: '#e9f8f5', label: 'Recebido' }
    : normalized === 'RECEBIDO_PARCIAL'
      ? { color: '#9a6a2f', background: '#fff5e8', label: 'Parcial' }
      : normalized === 'CANCELADO'
        ? { color: '#a64b4b', background: '#fff0f0', label: 'Cancelado' }
        : { color: '#5b6b68', background: '#eef3f2', label: 'Aberto' };

  return <span style={{ color: palette.color, background: palette.background, padding: '5px 8px', borderRadius: 999, fontWeight: 700 }}>{palette.label}</span>;
}

function StatusFinanceiro({ lancamentos }: { lancamentos?: NotaFiscalCompra['lancamentosFinanceiros'] }) {
  if (!lancamentos || lancamentos.length === 0) {
    return <span style={{ color: '#647674' }}>Sem lancamento</span>;
  }

  const pendentes = lancamentos.filter((item) => String(item.situacao || '').toUpperCase() !== 'PAGO').length;
  if (pendentes === 0) {
    return <span style={{ color: '#2f6f73', fontWeight: 700 }}>Pago</span>;
  }

  return <span style={{ color: '#9a6a2f', fontWeight: 700 }}>{pendentes} pendente(s)</span>;
}

function DetailCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ padding: 10, border: '1px solid #d9e2e1', borderRadius: 8, background: '#f8faf9' }}>
      <div style={{ color: '#647674', fontSize: 12, marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#243332', fontWeight: 700 }}>{value}</div>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: '11px 12px', fontWeight: 800 };
const td: React.CSSProperties = { padding: '12px', verticalAlign: 'middle', color: '#243332' };
const inputStyle: React.CSSProperties = { height: 38, border: '1px solid #d1dddd', borderRadius: 8, padding: '0 10px', fontSize: 13 };
const chipStyle: React.CSSProperties = { border: '1px solid #d9e2e1', background: '#f8fbfa', color: '#54736b', borderRadius: 999, padding: '6px 10px', cursor: 'pointer', fontWeight: 700, fontSize: 12 };
const chipActiveStyle: React.CSSProperties = { ...chipStyle, background: '#e8f5f2', color: '#2f6f73', border: '1px solid #c7dcd7' };
const miniKpiStyle: React.CSSProperties = { border: '1px solid #d9e2e1', background: '#f8fbfa', borderRadius: 8, padding: 10, display: 'grid', gap: 2, color: '#54736b', fontSize: 12 };
const actionButtonStyle: React.CSSProperties = { height: 28, display: 'inline-flex', alignItems: 'center', border: '1px solid #c7d5d2', background: '#fff', color: '#2f6f73', borderRadius: 7, padding: '0 10px', cursor: 'pointer', fontWeight: 700, fontSize: 12 };
const secondaryActionButtonStyle: React.CSSProperties = { height: 28, display: 'inline-flex', alignItems: 'center', border: '1px solid #d9e2e1', background: '#f8fbfa', color: '#54736b', borderRadius: 7, padding: '0 10px', cursor: 'pointer', fontWeight: 700, fontSize: 12 };
const detailOverlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(24, 35, 34, 0.36)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 };
const detailPanelStyle: React.CSSProperties = { width: 'min(860px, 100%)', maxHeight: '85vh', overflowY: 'auto', background: '#fff', borderRadius: 14, border: '1px solid #d9e2e1', boxShadow: '0 22px 48px rgba(19, 38, 35, 0.16)', padding: 18 };
const detailHeaderStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 };
const closeButtonStyle: React.CSSProperties = { height: 34, border: '1px solid #d9e2e1', background: '#f8fbfa', color: '#54736b', borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontWeight: 700 };
