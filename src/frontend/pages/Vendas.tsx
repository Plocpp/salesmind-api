/**
 * Vendas.tsx
 * Componente de vendas POS com gerenciamento de cliente, produtos e caixa.
 * 
 * Funções principais:
 * 1) Gerenciar fluxo de venda, carrinho, busca de produtos e clientes.
 * 2) Apresentar painel operacional de caixa com ações financeiras.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

interface Produto {
  id: string;
  nome: string;
  marca: string;
  peso: number;
  porte: string;
  preco: number;
  estoque: number;
  codigo?: string;
  codigoBarras?: string;
  cor?: string;
  tamanho?: string;
}

interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
}

interface ItemCarrinho {
  produto: Produto;
  quantidade: number;
  precoUnitario: number;
  desconto: number;
}

type CaixaAcao = 'Resumo' | 'UltimaVenda' | 'Abertura' | 'Suprimento' | 'Sangria' | 'Despesa' | 'Transferencia' | 'Fechar' | 'Devolucao' | 'Emprestimo' | '';

interface MovimentoCaixa {
  id: string;
  tipo: string;
  valor: number;
  data: string;
  detalhe?: string;
  destino?: string;
  vendaId?: string;
  produtoEmprestado?: string;
  quantidadeEmprestimo?: number;
  clienteEmprestimo?: string;
  dataRetorno?: string;
}

interface VendaHistorico {
  id: string;
  total: number;
  data: string;
  cliente?: Cliente | null;
  usuario?: {
    nome: string;
  } | null;
}

interface VendasProps {
  onNavigate?: (page: string) => void;
}

// === Fluxo de vendas e caixa ===
const Vendas: React.FC<VendasProps> = ({ onNavigate }) => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [buscaProduto, setBuscaProduto] = useState('');
  const [mostrarCadastroCliente, setMostrarCadastroCliente] = useState(false);
  const [novoCliente, setNovoCliente] = useState({
    nome: '',
    telefone: '',
    email: '',
  });
  const [clienteBusca, setClienteBusca] = useState({ nome: '', telefone: '', email: '' });
  const [vendas, setVendas] = useState<VendaHistorico[]>([]);
  const [filtroVenda, setFiltroVenda] = useState<'ALL' | 'PAGO' | 'NAO_PAGO'>('ALL');
  const [buscaVenda, setBuscaVenda] = useState('');
  const [caixaAcao, setCaixaAcao] = useState<CaixaAcao>('Resumo');
  const [saldoCaixa, setSaldoCaixa] = useState<number>(1250.0);
  const [movimentosCaixa, setMovimentosCaixa] = useState<MovimentoCaixa[]>([]);
  const [suprimentoValor, setSuprimentoValor] = useState('');
  const [sangriaValor, setSangriaValor] = useState('');
  const [sangriaMotivo, setSangriaMotivo] = useState('');
  const [despesaValor, setDespesaValor] = useState('');
  const [despesaDescricao, setDespesaDescricao] = useState('');
  const [transferenciaValor, setTransferenciaValor] = useState('');
  const [transferenciaDestino, setTransferenciaDestino] = useState('');
  const [aberturaValor, setAberturaValor] = useState('');
  const [aberturaResponsavel, setAberturaResponsavel] = useState('');
  const [emprestimoProduto, setEmprestimoProduto] = useState('');
  const [emprestimoQuantidade, setEmprestimoQuantidade] = useState('');
  const [emprestimoCliente, setEmprestimoCliente] = useState('');
  const [emprestimoDataRetorno, setEmprestimoDataRetorno] = useState('');
  const [devolucaoValor, setDevolucaoValor] = useState('');
  const [devolucaoVendaId, setDevolucaoVendaId] = useState('');
  const [caixaFechado, setCaixaFechado] = useState(false);
  const [mensagemCaixa, setMensagemCaixa] = useState<string | null>(null);

  const token = localStorage.getItem('token');

  const carregarVendas = async () => {
    try {
      const response = await api.get('/vendas', token ?? undefined);
      setVendas(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
    }
  };

  useEffect(() => {
    carregarVendas();
  }, []);

  const ultimaVenda = useMemo(() => {
    return vendas.length > 0 ? vendas[vendas.length - 1] : null;
  }, [vendas]);

  const resumoVendas = useMemo(() => {
    const totalVendas = vendas.reduce((acc, venda) => acc + venda.total, 0);
    return {
      totalVendas,
      quantidadeVendas: vendas.length,
      saldoAtual: saldoCaixa,
      entradas: movimentosCaixa.filter(item => item.tipo === 'Suprimento').reduce((acc, movimento) => acc + movimento.valor, 0),
      retiradas: movimentosCaixa.filter(item => ['Sangria', 'Despesa', 'Transferência', 'Devolução'].includes(item.tipo)).reduce((acc, movimento) => acc + movimento.valor, 0),
    };
  }, [vendas, saldoCaixa, movimentosCaixa]);

  const criarMovimentoCaixa = (
    tipo: string,
    valor: number,
    detalhe?: string,
    destino?: string,
    vendaId?: string,
    produtoEmprestado?: string,
    quantidadeEmprestimo?: number,
    clienteEmprestimo?: string,
    dataRetorno?: string,
  ) => {
    const movimento: MovimentoCaixa = {
      id: `${tipo}-${Date.now()}`,
      tipo,
      valor,
      data: new Date().toISOString(),
      detalhe,
      destino,
      vendaId,
      produtoEmprestado,
      quantidadeEmprestimo,
      clienteEmprestimo,
      dataRetorno,
    };
    setMovimentosCaixa((prev) => [movimento, ...prev]);
  };

  const selecionarAcaoCaixa = (acao: CaixaAcao) => {
    if (caixaFechado && acao !== 'Resumo' && acao !== 'Abertura') {
      alert('Caixa fechado. Apenas resumo ou abertura disponível.');
      return;
    }

    setCaixaAcao(acao);
    setMensagemCaixa(null);
  };

  const handleAberturaCaixa = () => {
    if (!caixaFechado) {
      alert('O caixa já está aberto.');
      return;
    }

    const valor = Number(aberturaValor.replace(',', '.'));
    if (!valor || valor <= 0) {
      alert('Informe um valor válido para abertura de caixa.');
      return;
    }

    setSaldoCaixa((prev) => prev + valor);
    criarMovimentoCaixa('Abertura', valor, `Abertura de caixa por ${aberturaResponsavel || 'operador'}`);
    setCaixaFechado(false);
    setAberturaValor('');
    setAberturaResponsavel('');
    setMensagemCaixa('Caixa aberto com saldo inicial registrado.');
  };

  const handleEmprestimo = () => {
    const quantidade = Number(emprestimoQuantidade);
    if (!emprestimoProduto.trim() || !emprestimoCliente.trim() || !quantidade || quantidade <= 0 || !emprestimoDataRetorno.trim()) {
      alert('Preencha todos os campos do empréstimo para registrar o produto.');
      return;
    }

    criarMovimentoCaixa('Emprestimo', 0, `Empréstimo de ${quantidade} x ${emprestimoProduto}`, undefined, undefined, emprestimoProduto, quantidade, emprestimoCliente, emprestimoDataRetorno);
    setEmprestimoProduto('');
    setEmprestimoQuantidade('');
    setEmprestimoCliente('');
    setEmprestimoDataRetorno('');
    setMensagemCaixa('Empréstimo de produto registrado com sucesso.');
  };

  const handleSuprimento = () => {
    const valor = Number(suprimentoValor.replace(',', '.'));
    if (!valor || valor <= 0) {
      alert('Informe um valor válido para suprimento.');
      return;
    }
    setSaldoCaixa((prev) => prev + valor);
    criarMovimentoCaixa('Suprimento', valor, 'Suprimento de caixa');
    setSuprimentoValor('');
    setMensagemCaixa('Suprimento registrado com sucesso.');
  };

  const handleSangria = () => {
    const valor = Number(sangriaValor.replace(',', '.'));
    if (!valor || valor <= 0) {
      alert('Informe um valor válido para sangria.');
      return;
    }
    if (valor > saldoCaixa) {
      alert('Valor de sangria não pode ser maior que o saldo do caixa.');
      return;
    }
    setSaldoCaixa((prev) => prev - valor);
    criarMovimentoCaixa('Sangria', valor, sangriaMotivo || 'Sangria de caixa');
    setSangriaValor('');
    setSangriaMotivo('');
    setMensagemCaixa('Sangria registrada com sucesso.');
  };

  const handleDespesa = () => {
    const valor = Number(despesaValor.replace(',', '.'));
    if (!valor || valor <= 0) {
      alert('Informe um valor válido para despesa.');
      return;
    }
    if (valor > saldoCaixa) {
      alert('Valor de despesa não pode ser maior que o saldo do caixa.');
      return;
    }
    setSaldoCaixa((prev) => prev - valor);
    criarMovimentoCaixa('Despesa', valor, despesaDescricao || 'Despesa operacional');
    setDespesaValor('');
    setDespesaDescricao('');
    setMensagemCaixa('Despesa registrada com sucesso.');
  };

  const handleTransferencia = () => {
    const valor = Number(transferenciaValor.replace(',', '.'));
    if (!valor || valor <= 0 || !transferenciaDestino.trim()) {
      alert('Informe destino e valor válidos para transferência.');
      return;
    }
    if (valor > saldoCaixa) {
      alert('Valor de transferência não pode ser maior que o saldo do caixa.');
      return;
    }
    setSaldoCaixa((prev) => prev - valor);
    criarMovimentoCaixa('Transferência', valor, `Transferido para ${transferenciaDestino}`, transferenciaDestino);
    setTransferenciaValor('');
    setTransferenciaDestino('');
    setMensagemCaixa('Transferência registrada com sucesso.');
  };

  const handleFecharCaixa = () => {
    if (caixaFechado) {
      alert('O caixa já está fechado.');
      return;
    }
    setCaixaFechado(true);
    setMensagemCaixa('Caixa fechado com sucesso.');
    setCaixaAcao('Resumo');
  };

  const handleDevolucao = () => {
    const valor = Number(devolucaoValor.replace(',', '.'));
    if (!valor || valor <= 0 || !devolucaoVendaId.trim()) {
      alert('Informe ID da venda e valor válidos para devolução.');
      return;
    }
    if (valor > saldoCaixa) {
      alert('Valor de devolução não pode ser maior que o saldo do caixa.');
      return;
    }
    setSaldoCaixa((prev) => prev - valor);
    criarMovimentoCaixa('Devolução', valor, `Devolução da venda ${devolucaoVendaId}`, undefined, devolucaoVendaId);
    setDevolucaoValor('');
    setDevolucaoVendaId('');
    setMensagemCaixa('Devolução registrada com sucesso.');
  };

  // 🔍 BUSCAR PRODUTO
  const buscarProduto = async () => {
    if (!buscaProduto.trim()) return;

    try {
      const response = await api.get(`/vendas/produtos/buscar?nome=${encodeURIComponent(buscaProduto)}`, token ?? undefined);
      if (response) {
        setProdutos([response]);
      } else {
        alert('Produto não encontrado');
        setProdutos([]);
      }
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      alert('Erro ao buscar produto');
    }
  };

  // 👤 BUSCAR CLIENTE
  const buscarCliente = async () => {
    const { nome, telefone, email } = clienteBusca;

    if (!nome.trim() && !telefone.trim() && !email.trim()) {
      alert('Informe nome, telefone ou email para buscar.');
      return;
    }

    try {
      const queryParams = [];
      if (nome.trim()) queryParams.push(`nome=${encodeURIComponent(nome.trim())}`);
      if (telefone.trim()) queryParams.push(`telefone=${encodeURIComponent(telefone.trim())}`);
      if (email.trim()) queryParams.push(`email=${encodeURIComponent(email.trim())}`);

      const response = await api.get(`/vendas/clientes/buscar?${queryParams.join('&')}`, token ?? undefined);
      if (response) {
        setCliente(response);
        setMostrarCadastroCliente(false);
      } else {
        setMostrarCadastroCliente(true);
      }
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      setMostrarCadastroCliente(true);
    }
  };

  // 👤 CRIAR CLIENTE
  const criarCliente = async () => {
    try {
      const response = await api.post('/vendas/clientes', novoCliente, token ?? undefined);
      setCliente(response);
      setMostrarCadastroCliente(false);
      setNovoCliente({ nome: '', telefone: '', email: '' });
      setClienteBusca({ nome: '', telefone: '', email: '' });
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      alert('Erro ao criar cliente');
    }
  };

  // 🛒 ADICIONAR AO CARRINHO
  const adicionarAoCarrinho = (produto: Produto) => {
    const itemExistente = carrinho.find(item => item.produto.id === produto.id);

    if (itemExistente) {
      setCarrinho(carrinho.map(item =>
        item.produto.id === produto.id
          ? { ...item, quantidade: item.quantidade + 1 }
          : item
      ));
    } else {
      setCarrinho([...carrinho, {
        produto,
        quantidade: 1,
        precoUnitario: produto.preco,
        desconto: 0,
      }]);
    }

    setProdutos([]);
    setBuscaProduto('');
  };

  // 🗑️ REMOVER DO CARRINHO
  const removerDoCarrinho = (produtoId: string) => {
    setCarrinho(carrinho.filter(item => item.produto.id !== produtoId));
  };

  // 📝 ATUALIZAR QUANTIDADE
  const atualizarQuantidade = (produtoId: string, quantidade: number) => {
    if (quantidade <= 0) {
      removerDoCarrinho(produtoId);
      return;
    }

    setCarrinho(carrinho.map(item =>
      item.produto.id === produtoId
        ? { ...item, quantidade }
        : item
    ));
  };

  // 💰 CALCULAR TOTAL
  const calcularTotal = () => {
    return carrinho.reduce((total, item) => {
      return total + ((item.quantidade * item.precoUnitario) - item.desconto);
    }, 0);
  };

  // ✅ FINALIZAR VENDA
  const finalizarVenda = async () => {
    if (carrinho.length === 0) {
      alert('Adicione produtos ao carrinho');
      return;
    }

    try {
      const vendaData = {
        clienteId: cliente?.id,
        itens: carrinho.map(item => ({
          produtoId: item.produto.id,
          quantidade: item.quantidade,
          precoUnitario: item.precoUnitario,
          desconto: item.desconto,
        })),
      };

      await api.post('/vendas/vendas', vendaData, token ?? undefined);
      alert(`Venda finalizada! Total: R$ ${calcularTotal().toFixed(2)}`);
      setCarrinho([]);
      setCliente(null);
      setProdutos([]);
      carregarVendas();
    } catch (error) {
      console.error('Erro ao finalizar venda:', error);
      alert('Erro ao finalizar venda');
    }
  };

  const vendasFiltradas = useMemo(() => {
    return vendas.filter((venda) => {
      const filtroBusca = buscaVenda.trim().toLowerCase();
      const correspondeBusca = !filtroBusca || venda.cliente?.nome?.toLowerCase().includes(filtroBusca) || venda.id.includes(filtroBusca);
      const correspondeStatus = filtroVenda === 'ALL' || (filtroVenda === 'PAGO' && true) || (filtroVenda === 'NAO_PAGO' && false);
      return correspondeBusca && correspondeStatus;
    });
  }, [buscaVenda, filtroVenda, vendas]);

  return (
    <div style={{ padding: '20px', maxWidth: '1300px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '24px' }}>🛒 Vendas</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '24px' }}>
        <div>
          <section style={{ marginBottom: '24px', padding: '22px', border: '1px solid #ddd', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h2 style={{ margin: 0 }}>Cliente</h2>
                <p style={{ margin: '8px 0 0', color: '#666' }}>Buscar ou cadastrar cliente antes de iniciar a venda.</p>
              </div>
            </div>

            {cliente ? (
              <div style={{ padding: '18px', backgroundColor: '#f8f9fb', borderRadius: '12px' }}>
                <p style={{ margin: '0 0 8px' }}><strong>Nome:</strong> {cliente.nome}</p>
                <p style={{ margin: '0 0 8px' }}><strong>Telefone:</strong> {cliente.telefone || 'Não informado'}</p>
                <p style={{ margin: 0 }}><strong>Email:</strong> {cliente.email || 'Não informado'}</p>
                <button onClick={() => setCliente(null)} style={{ marginTop: '16px', padding: '10px 16px', borderRadius: '8px', border: '1px solid #ccc', backgroundColor: '#fff' }}>
                  Trocar cliente
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <input
                  type="text"
                  placeholder="Responsável"
                  value={clienteBusca.nome}
                  onChange={(e) => setClienteBusca({ ...clienteBusca, nome: e.target.value })}
                  style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ccc' }}
                />
                <input
                  type="text"
                  placeholder="Animal"
                  value={clienteBusca.email}
                  onChange={(e) => setClienteBusca({ ...clienteBusca, email: e.target.value })}
                  style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ccc' }}
                />
                <input
                  type="text"
                  placeholder="Telefone"
                  value={clienteBusca.telefone}
                  onChange={(e) => setClienteBusca({ ...clienteBusca, telefone: e.target.value })}
                  style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ccc' }}
                />
                <button onClick={buscarCliente} style={{ padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#007bff', color: '#fff' }}>
                  🔎 Localizar
                </button>
              </div>
            )}

            {mostrarCadastroCliente && !cliente && (
              <div style={{ marginTop: '20px', padding: '18px', borderRadius: '12px', backgroundColor: '#f4f6fb' }}>
                <h3 style={{ marginTop: 0 }}>Cadastrar novo cliente</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <input
                    type="text"
                    placeholder="Nome"
                    value={novoCliente.nome}
                    onChange={(e) => setNovoCliente({ ...novoCliente, nome: e.target.value })}
                    style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ccc' }}
                  />
                  <input
                    type="text"
                    placeholder="Telefone"
                    value={novoCliente.telefone}
                    onChange={(e) => setNovoCliente({ ...novoCliente, telefone: e.target.value })}
                    style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ccc' }}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={novoCliente.email}
                    onChange={(e) => setNovoCliente({ ...novoCliente, email: e.target.value })}
                    style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ccc' }}
                  />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={criarCliente} style={{ flex: 1, padding: '12px', borderRadius: '10px', backgroundColor: '#28a745', color: '#fff', border: 'none' }}>
                      Salvar
                    </button>
                    <button onClick={() => setMostrarCadastroCliente(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #ccc', backgroundColor: '#fff' }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section style={{ marginBottom: '24px', padding: '22px', border: '1px solid #ddd', borderRadius: '12px' }}>
            <h2 style={{ marginBottom: '18px' }}>Produtos</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', marginBottom: '18px' }}>
              <input
                type="text"
                value={buscaProduto}
                onChange={(e) => setBuscaProduto(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && buscarProduto()}
                placeholder="Produto, serviço ou peça"
                style={{ padding: '14px', borderRadius: '10px', border: '1px solid #ccc' }}
              />
              <button onClick={buscarProduto} style={{ padding: '14px 18px', borderRadius: '10px', border: 'none', backgroundColor: '#007bff', color: '#fff' }}>
                Buscar
              </button>
            </div>

            {produtos.length > 0 ? (
              produtos.map((produto) => (
                <div key={produto.id} style={{ marginBottom: '14px', padding: '18px', borderRadius: '12px', border: '1px solid #eee', backgroundColor: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '18px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 8px' }}>{produto.nome}</h3>
                      <p style={{ margin: 0, color: '#555' }}>{produto.marca}</p>
                      <p style={{ margin: '10px 0 0', color: '#555' }}><strong>Estoque:</strong> {produto.estoque} • <strong>Preço:</strong> R$ {produto.preco.toFixed(2)}</p>
                    </div>
                    <button onClick={() => adicionarAoCarrinho(produto)} style={{ height: '44px', alignSelf: 'center', padding: '0 20px', borderRadius: '12px', border: 'none', backgroundColor: '#28a745', color: '#fff' }}>
                      Adicionar
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: '#666' }}>Busque um produto para adicionar ao carrinho.</p>
            )}
          </section>

          <section style={{ padding: '22px', border: '1px solid #ddd', borderRadius: '12px' }}>
            <h2 style={{ marginBottom: '18px' }}>Carrinho</h2>
            {carrinho.length === 0 ? (
              <p style={{ color: '#666' }}>Sem itens no carrinho.</p>
            ) : (
              <div>
                {carrinho.map((item) => (
                  <div key={item.produto.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #eee' }}>
                    <div>
                      <p style={{ margin: '0 0 6px', fontWeight: 600 }}>{item.produto.nome}</p>
                      <p style={{ margin: 0, color: '#666' }}>R$ {item.precoUnitario.toFixed(2)} cada</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button onClick={() => atualizarQuantidade(item.produto.id, item.quantidade - 1)} style={{ width: '34px', height: '34px', borderRadius: '8px', border: '1px solid #ccc' }}>-</button>
                      <span>{item.quantidade}</span>
                      <button onClick={() => atualizarQuantidade(item.produto.id, item.quantidade + 1)} style={{ width: '34px', height: '34px', borderRadius: '8px', border: '1px solid #ccc' }}>+</button>
                      <button onClick={() => removerDoCarrinho(item.produto.id)} style={{ width: '34px', height: '34px', borderRadius: '8px', border: '1px solid #dc3545', color: '#dc3545' }}>×</button>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: '0', color: '#666' }}>Subtotal</p>
                      <p style={{ margin: '4px 0 0', fontWeight: 600 }}>R$ {(item.quantidade * item.precoUnitario - item.desconto).toFixed(2)}</p>
                    </div>
                  </div>
                ))}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '22px' }}>
                  <div>
                    <p style={{ margin: '0 0 4px', color: '#666' }}>Total do carrinho</p>
                    <h3 style={{ margin: 0 }}>R$ {calcularTotal().toFixed(2)}</h3>
                  </div>
                  <button onClick={finalizarVenda} style={{ padding: '14px 24px', borderRadius: '12px', border: 'none', backgroundColor: '#007bff', color: '#fff' }}>
                    Finalizar Venda
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>

        <aside>
          <section style={{ marginBottom: '24px', padding: '22px', border: '1px solid #007bff', borderRadius: '12px', backgroundColor: '#f4f8ff' }}>
            <h2 style={{ margin: 0 }}>Caixa 2810</h2>
            <p style={{ margin: '8px 0 0', color: '#666' }}>30/04 • Aberto</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '18px' }}>
              {['Resumo', 'Última venda', 'Suprimento', 'Sangria', 'Despesa', 'Transferência', 'Fechar', 'Devolução'].map((action) => (
                <button
                  key={action}
                  onClick={() => action === 'Fechar' ? handleFecharCaixa() : selecionarAcaoCaixa(action as CaixaAcao)}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid #ccc',
                    backgroundColor: caixaAcao === action || (action === 'Fechar' && caixaFechado) ? '#007bff' : '#fff',
                    color: caixaAcao === action || (action === 'Fechar' && caixaFechado) ? '#fff' : '#000',
                  }}
                >
                  {action}
                </button>
              ))}
            </div>

            <div style={{ marginTop: '24px', padding: '18px', borderRadius: '12px', backgroundColor: '#fff', border: '1px solid #eee' }}>
              <h3 style={{ marginTop: 0, marginBottom: '16px' }}>{caixaAcao === 'UltimaVenda' ? 'Última venda' : caixaAcao === 'Transferencia' ? 'Transferência' : caixaAcao === 'Fechar' ? 'Fechar caixa' : caixaAcao}</h3>
              {mensagemCaixa && <p style={{ color: '#28a745', marginTop: 0 }}>{mensagemCaixa}</p>}
              {caixaAcao === 'Resumo' && (
                <div>
                  <p><strong>Saldo atual:</strong> R$ {resumoVendas.saldoAtual.toFixed(2)}</p>
                  <p><strong>Total de vendas:</strong> {resumoVendas.quantidadeVendas}</p>
                  <p><strong>Receita acumulada:</strong> R$ {resumoVendas.totalVendas.toFixed(2)}</p>
                  <p><strong>Entradas no caixa:</strong> R$ {resumoVendas.entradas.toFixed(2)}</p>
                  <p><strong>Retiradas:</strong> R$ {resumoVendas.retiradas.toFixed(2)}</p>
                </div>
              )}

              {caixaAcao === 'UltimaVenda' && (
                <div>
                  {ultimaVenda ? (
                    <>
                      <p><strong>ID:</strong> {ultimaVenda.id}</p>
                      <p><strong>Cliente:</strong> {ultimaVenda.cliente?.nome ?? 'Não informado'}</p>
                      <p><strong>Valor:</strong> R$ {ultimaVenda.total.toFixed(2)}</p>
                      <p><strong>Data:</strong> {new Date(ultimaVenda.data).toLocaleString()}</p>
                      <p><strong>Operador:</strong> {ultimaVenda.usuario?.nome ?? 'Operador'}</p>
                    </>
                  ) : (
                    <p style={{ color: '#666' }}>Nenhuma venda encontrada.</p>
                  )}
                </div>
              )}

              {caixaAcao === 'Suprimento' && (
                <div style={{ display: 'grid', gap: '12px' }}>
                  <label>
                    Valor do suprimento
                    <input
                      type="text"
                      value={suprimentoValor}
                      onChange={(e) => setSuprimentoValor(e.target.value)}
                      placeholder="Ex: 150.00"
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #ccc', marginTop: '6px' }}
                    />
                  </label>
                  <button onClick={handleSuprimento} style={{ padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#28a745', color: '#fff' }}>
                    Registrar suprimento
                  </button>
                </div>
              )}

              {caixaAcao === 'Sangria' && (
                <div style={{ display: 'grid', gap: '12px' }}>
                  <label>
                    Valor da sangria
                    <input
                      type="text"
                      value={sangriaValor}
                      onChange={(e) => setSangriaValor(e.target.value)}
                      placeholder="Ex: 200.00"
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #ccc', marginTop: '6px' }}
                    />
                  </label>
                  <label>
                    Motivo
                    <input
                      type="text"
                      value={sangriaMotivo}
                      onChange={(e) => setSangriaMotivo(e.target.value)}
                      placeholder="Ex: Retirada para depósito"
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #ccc', marginTop: '6px' }}
                    />
                  </label>
                  <button onClick={handleSangria} style={{ padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#dc3545', color: '#fff' }}>
                    Registrar sangria
                  </button>
                </div>
              )}

              {caixaAcao === 'Despesa' && (
                <div style={{ display: 'grid', gap: '12px' }}>
                  <label>
                    Valor da despesa
                    <input
                      type="text"
                      value={despesaValor}
                      onChange={(e) => setDespesaValor(e.target.value)}
                      placeholder="Ex: 80.00"
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #ccc', marginTop: '6px' }}
                    />
                  </label>
                  <label>
                    Descrição
                    <input
                      type="text"
                      value={despesaDescricao}
                      onChange={(e) => setDespesaDescricao(e.target.value)}
                      placeholder="Ex: Compra de material de limpeza"
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #ccc', marginTop: '6px' }}
                    />
                  </label>
                  <button onClick={handleDespesa} style={{ padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#fd7e14', color: '#fff' }}>
                    Registrar despesa
                  </button>
                </div>
              )}

              {caixaAcao === 'Transferencia' && (
                <div style={{ display: 'grid', gap: '12px' }}>
                  <label>
                    Valor da transferência
                    <input
                      type="text"
                      value={transferenciaValor}
                      onChange={(e) => setTransferenciaValor(e.target.value)}
                      placeholder="Ex: 300.00"
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #ccc', marginTop: '6px' }}
                    />
                  </label>
                  <label>
                    Caixa destino
                    <input
                      type="text"
                      value={transferenciaDestino}
                      onChange={(e) => setTransferenciaDestino(e.target.value)}
                      placeholder="Ex: Caixa 2811"
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #ccc', marginTop: '6px' }}
                    />
                  </label>
                  <button onClick={handleTransferencia} style={{ padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#6610f2', color: '#fff' }}>
                    Registrar transferência
                  </button>
                </div>
              )}

              {caixaAcao === 'Devolucao' && (
                <div style={{ display: 'grid', gap: '12px' }}>
                  <label>
                    ID da venda
                    <input
                      type="text"
                      value={devolucaoVendaId}
                      onChange={(e) => setDevolucaoVendaId(e.target.value)}
                      placeholder="Ex: 12345"
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #ccc', marginTop: '6px' }}
                    />
                  </label>
                  <label>
                    Valor devolvido
                    <input
                      type="text"
                      value={devolucaoValor}
                      onChange={(e) => setDevolucaoValor(e.target.value)}
                      placeholder="Ex: 99.90"
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #ccc', marginTop: '6px' }}
                    />
                  </label>
                  <button onClick={handleDevolucao} style={{ padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#6f42c1', color: '#fff' }}>
                    Registrar devolução
                  </button>
                </div>
              )}

              {caixaAcao === 'Fechar' && (
                <div>
                  <p>O caixa foi fechado. Você ainda pode consultar o resumo.</p>
                </div>
              )}
            </div>
          </section>

          <section style={{ marginBottom: '24px', padding: '22px', border: '1px solid #ddd', borderRadius: '12px' }}>
            <h3 style={{ margin: 0, marginBottom: '14px' }}>Outros caixas</h3>
            <button onClick={() => alert('Meus caixas')} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #007bff', backgroundColor: '#fff', color: '#007bff' }}>
              Meus caixas
            </button>
          </section>

          <section style={{ padding: '22px', border: '1px solid #ddd', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ margin: 0 }}>Últimas vendas</h3>
                <p style={{ margin: '8px 0 0', color: '#666' }}>Últimas 24h</p>
              </div>
            </div>

            <input
              type="text"
              value={buscaVenda}
              onChange={(e) => setBuscaVenda(e.target.value)}
              placeholder="Localizar venda"
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ccc', marginBottom: '16px' }}
            />

            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              {['ALL', 'PAGO', 'NAO_PAGO'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFiltroVenda(status as typeof filtroVenda)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: '1px solid #ccc',
                    backgroundColor: filtroVenda === status ? '#007bff' : '#fff',
                    color: filtroVenda === status ? '#fff' : '#000',
                  }}
                >
                  {status === 'ALL' ? 'Todas' : status === 'PAGO' ? 'Pago' : 'Não pago'}
                </button>
              ))}
            </div>

            <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
              {vendasFiltradas.length === 0 ? (
                <p style={{ color: '#666' }}>Nenhuma venda encontrada.</p>
              ) : (
                vendasFiltradas.map((venda) => (
                  <div key={venda.id} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #eee', marginBottom: '12px', backgroundColor: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div>
                        <strong>{venda.cliente?.nome || 'Cliente não informado'}</strong>
                        <p style={{ margin: '6px 0 0', color: '#666', fontSize: '13px' }}>{new Date(venda.data).toLocaleString()}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ display: 'block', fontWeight: 600 }}>R$ {venda.total.toFixed(2)}</span>
                        <span style={{ color: '#666', fontSize: '13px' }}>{venda.usuario?.nome || 'Operador'}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default Vendas;