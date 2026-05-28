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
  background: '#fff',
  border: '1px solid #d9e2e1',
  borderRadius: 8,
  boxShadow: '0 8px 24px rgba(36, 51, 50, 0.05)',
};

const getRouteBaseFromHash = (): 'estoque' | 'compras' => {
  if (typeof window === 'undefined') return 'estoque';
  return window.location.hash.startsWith('#compras') ? 'compras' : 'estoque';
};

const todayInputValue = () => new Date().toISOString().slice(0, 10);

const normalizeText = (value?: string | null) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const normalizeDocument = (value?: string | null) => String(value || '').replace(/\D/g, '');

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
  const isComprasView = routeBase === 'compras';
  const [analise, setAnalise] = useState<AnaliseEstoque | null>(null);
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([]);
  const [atalhos, setAtalhos] = useState<AtalhoOperacional[]>([]);
  const [sugestoesCompra, setSugestoesCompra] = useState<SugestaoCompraItem[]>([]);
  const [pedidosAbertos, setPedidosAbertos] = useState<PedidoCompraItem[]>([]);
  const [pedidosCompra, setPedidosCompra] = useState<PedidoCompraItem[]>([]);
  const [notasCompra, setNotasCompra] = useState<NotaFiscalCompra[]>([]);
  const [fornecedoresFiltro, setFornecedoresFiltro] = useState<FornecedorFiltro[]>([]);
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
  const [ultimoPedidoSugeridoAbertoId, setUltimoPedidoSugeridoAbertoId] = useState('');
  const [confirmacaoRiscoRecebimento, setConfirmacaoRiscoRecebimento] = useState(false);
  const [mostrarSomenteRiscoAlto, setMostrarSomenteRiscoAlto] = useState(false);

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
    const data = await api.get('/estoque/compras/pedidos?status=ABERTO', token);
    setPedidosAbertos(Array.isArray(data) ? data : []);
    setLoadingAtalho(false);
  };

  const carregarFornecedoresFiltro = async () => {
    const data = await api.get('/fornecedores', token);
    setFornecedoresFiltro(Array.isArray(data) ? data.map((item: any) => ({ id: String(item.id), nome: String(item.nome || 'Fornecedor') })) : []);
  };

  const carregarDepositos = async () => {
    const data = await api.get('/estoque/depositos', token);
    setDepositos(Array.isArray(data) ? data.map((item: any) => ({ id: String(item.id), nome: String(item.nome || 'Deposito') })) : []);
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

      if (filtros.statusPedido) {
        pedidoParams.set('status', filtros.statusPedido);
        notaParams.set('statusPedido', filtros.statusPedido);
      }

      const [pedidos, notas] = await Promise.all([
        api.get(`/estoque/compras/pedidos${pedidoParams.toString() ? `?${pedidoParams.toString()}` : ''}`, token),
        api.get(`/estoque/compras/notas-fiscais${notaParams.toString() ? `?${notaParams.toString()}` : ''}`, token),
      ]);

      const pedidosLista = Array.isArray(pedidos) ? pedidos : [];
      const notasLista = Array.isArray(notas) ? notas : [];
      const numeroNota = filtros.numeroNota.trim().toLowerCase();
      const notasFiltradas = numeroNota
        ? notasLista.filter((nota) => String(nota.numero || '').toLowerCase().includes(numeroNota))
        : notasLista;

      setPedidosCompra(pedidosLista);
      setPedidosAbertos(pedidosLista.filter((pedido) => String(pedido.status || '') === 'ABERTO'));
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
        carregarCatalogo({}, isComprasView ? 'Central de compras' : 'Catalogo completo'),
      ]);
      setAnalise(dataAnalise);

      if (hashState.q) {
        setBusca(hashState.q);
      }
      if (hashState.atalho) {
        await aplicarAtalho(hashState.atalho, { persistirHash: false, buscaForcada: hashState.q });
      } else if (isComprasView) {
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

  const itens = analise?.itens ?? [];
  const saldoTotal = useMemo(() => itens.reduce((total, item) => total + item.disponivel, 0), [itens]);
  const totalNotasCompra = useMemo(() => notasCompra.reduce((acc, item) => acc + Number(item.valorTotal || 0), 0), [notasCompra]);
  const pedidosPendentes = useMemo(() => pedidosCompra.filter((item) => String(item.status || '') === 'ABERTO').length, [pedidosCompra]);
  const pedidoSugeridoXml = useMemo<PedidoXmlSugerido | null>(() => {
    if (!isComprasView || !previewXml?.itens?.length || pedidosCompra.length === 0) {
      return null;
    }

    const fornecedorXml = normalizeText(previewXml.notaFiscal?.fornecedorNome);
    const fornecedorDocumentoXml = extractFornecedorDocumentoFromXml(xmlCompra);
    const emissaoXml = extractRecebimentoDataFromXml(xmlCompra)?.dataEmissao || '';
    const totalItensXml = previewXml.itens.reduce((acc, item) => acc + Number(item.quantidade || 0), 0);
    const totalValorXml = Number(previewXml.notaFiscal?.valorTotal || 0);
    let melhor: PedidoXmlSugerido | null = null;

    for (const pedido of pedidosCompra) {
      const status = String(pedido.status || '').toUpperCase();
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

      if (status === 'ABERTO') {
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
  }, [isComprasView, previewXml, pedidosCompra, xmlCompra]);

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
    if (!pedidoSugeridoXml || !isComprasView) {
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
  }, [pedidoSugeridoXml, pedidoDetalhe, isComprasView, ultimoPedidoSugeridoAbertoId, previewXml, xmlCompra]);

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
        carregarCatalogo({}, isComprasView ? 'Central de compras' : 'Catalogo completo'),
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
        await carregarCatalogo({ q: buscaEfetiva || undefined }, buscaEfetiva ? `Pesquisa: ${buscaEfetiva}` : 'Catalogo completo');
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

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, color: '#243332' }}>{isComprasView ? 'Compras' : 'Estoque e servicos'}</h1>
          <p style={{ margin: '6px 0 0', color: '#647674', maxWidth: 720 }}>
            {isComprasView
              ? 'Central de compras, pedidos em aberto, sugestoes de reposicao e recebimento de NF-e por XML.'
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
          {isComprasView && (
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
                    <h3 style={{ margin: 0, fontSize: 16, color: '#243332' }}>Filtro operacional de compras</h3>
                    <p style={{ margin: '4px 0 0', color: '#647674', fontSize: 13 }}>Filtre por pedido, NF, periodo, fornecedor e status para reproduzir a central de compras.</p>
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
                    <button
                      onClick={() => document.getElementById('compras-xml')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                      style={{ height: 36, display: 'inline-flex', alignItems: 'center', border: '1px solid #d9e2e1', background: '#f8fbfa', color: '#54736b', borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontWeight: 700 }}
                    >
                      Importar XML
                    </button>
                    <button
                      onClick={() => document.getElementById('compras-nfe-cnpj')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                      style={{ height: 36, display: 'inline-flex', alignItems: 'center', border: '1px solid #d9e2e1', background: '#f8fbfa', color: '#54736b', borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontWeight: 700 }}
                    >
                      Aba NF-e CNPJ
                    </button>
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
                    <option value="ABERTO">Aberto</option>
                    <option value="PARCIAL">Parcial</option>
                    <option value="RECEBIDO">Recebido</option>
                    <option value="CANCELADO">Cancelado</option>
                  </select>
                </div>
              </div>
            </section>
          )}

          {isComprasView && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              <Kpi icon={ShoppingCart} label="Pedidos listados" value={pedidosCompra.length} tone="#9a6a2f" />
              <Kpi icon={ClipboardCheck} label="Pedidos pendentes" value={pedidosPendentes} tone="#a64b4b" />
              <Kpi icon={Warehouse} label="Notas encontradas" value={notasCompra.length} tone="#2f6f73" />
              <Kpi icon={Boxes} label="Total das notas" value={`R$ ${totalNotasCompra.toFixed(2)}`} tone="#54736b" />
            </div>
          )}

          <section style={{ ...card, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, color: '#243332' }}>{isComprasView ? 'Atalhos de compras' : 'Atalhos de estoque e compras'}</h3>
                <p style={{ margin: '4px 0 0', color: '#647674', fontSize: 13 }}>
                  {isComprasView
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
                    await carregarCatalogo({}, 'Catalogo completo');
                  }}
                  style={{ height: 36, display: 'inline-flex', alignItems: 'center', border: '1px solid #d9e2e1', background: '#f8fbfa', color: '#54736b', borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontWeight: 700 }}
                >
                  Limpar
                </button>
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {atalhos.map((atalho) => (
                <button
                  key={atalho.codigo}
                  onClick={() => aplicarAtalho(atalho.codigo)}
                  style={{ border: '1px solid #d4dfdd', background: '#f8fbfa', color: '#2f6f73', borderRadius: 999, padding: '7px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                  title={atalho.acaoRapida}
                >
                  {atalho.titulo}
                </button>
              ))}
            </div>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
            <Kpi icon={Boxes} label="Produtos ativos" value={analise?.totalProdutos ?? 0} tone="#2f6f73" />
            <Kpi icon={Warehouse} label="Disponivel" value={`${saldoTotal} un`} tone="#54736b" />
            <Kpi icon={AlertTriangle} label="Rupturas" value={analise?.rupturas.length ?? 0} tone="#a64b4b" />
            <Kpi icon={PackagePlus} label="Estoque baixo" value={analise?.baixoEstoque.length ?? 0} tone="#9a6a2f" />
          </div>

          <section id="compras-xml" style={{ ...card, padding: 16 }}>
            <section id="compras-nfe-cnpj" style={{ marginBottom: 12, padding: 12, border: '1px solid #d9e2e1', borderRadius: 8, background: '#f8fbfa' }}>
              <h3 style={{ margin: 0, fontSize: 16, color: '#243332' }}>NF-e Compras (CNPJ)</h3>
              <p style={{ margin: '6px 0 10px', color: '#647674', fontSize: 13 }}>
                Preencha dados fiscais e de transportadora exigidos em operações B2B. Esses dados são anexados ao recebimento da nota.
              </p>
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

          {isComprasView && (
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
                  <strong>Pedidos de compra</strong>
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
              <strong>{isComprasView ? 'Catalogo de apoio para compras' : 'Resultado rapido do catalogo'}</strong>
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
                  {catalogo.slice(0, 8).map((item) => {
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <section style={{ ...card, padding: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, color: '#243332', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShoppingCart size={16} color="#9a6a2f" /> Sugestoes de compra
              </h3>
              <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                {sugestoesCompra.slice(0, 5).map((sugestao) => (
                  <div key={sugestao.itemId} style={{ padding: 10, background: '#f8faf9', border: '1px solid #d9e2e1', borderRadius: 8 }}>
                    <strong>{sugestao.nomeItem}</strong>
                    <div style={{ color: '#647674', fontSize: 12 }}>Atual: {sugestao.estoqueAtual} | Comprar: {sugestao.quantidadeSugerida}</div>
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
          </div>

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
                      {recebimentoManual.itens.map((item) => (
                        <div key={item.itemId} style={{ padding: 10, border: '1px solid #d9e2e1', borderRadius: 8, background: '#fff', display: 'grid', gridTemplateColumns: '1.5fr 0.7fr 0.7fr', gap: 10, alignItems: 'center' }}>
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
  const normalized = String(status || 'ABERTO').toUpperCase();
  const palette = normalized === 'RECEBIDO'
    ? { color: '#2f6f73', background: '#e9f8f5', label: 'Recebido' }
    : normalized === 'PARCIAL'
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
const actionButtonStyle: React.CSSProperties = { height: 28, display: 'inline-flex', alignItems: 'center', border: '1px solid #c7d5d2', background: '#fff', color: '#2f6f73', borderRadius: 7, padding: '0 10px', cursor: 'pointer', fontWeight: 700, fontSize: 12 };
const secondaryActionButtonStyle: React.CSSProperties = { height: 28, display: 'inline-flex', alignItems: 'center', border: '1px solid #d9e2e1', background: '#f8fbfa', color: '#54736b', borderRadius: 7, padding: '0 10px', cursor: 'pointer', fontWeight: 700, fontSize: 12 };
const detailOverlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(24, 35, 34, 0.36)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 };
const detailPanelStyle: React.CSSProperties = { width: 'min(860px, 100%)', maxHeight: '85vh', overflowY: 'auto', background: '#fff', borderRadius: 14, border: '1px solid #d9e2e1', boxShadow: '0 22px 48px rgba(19, 38, 35, 0.16)', padding: 18 };
const detailHeaderStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 };
const closeButtonStyle: React.CSSProperties = { height: 34, border: '1px solid #d9e2e1', background: '#f8fbfa', color: '#54736b', borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontWeight: 700 };
