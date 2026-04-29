import React, { useState } from 'react';
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

const Vendas: React.FC = () => {
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

  // 🔍 BUSCAR PRODUTO
  const buscarProduto = async () => {
    if (!buscaProduto.trim()) return;

    try {
      const response = await api.get(`/vendas/produtos/buscar?nome=${encodeURIComponent(buscaProduto)}`);
      if (response) {
        setProdutos([response]);
      } else {
        alert('Produto não encontrado');
      }
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      alert('Erro ao buscar produto');
    }
  };

  // 👤 BUSCAR CLIENTE
  const buscarCliente = async (telefone: string, email: string) => {
    try {
      const response = await api.get(`/vendas/clientes/buscar?telefone=${telefone}&email=${email}`);
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
      const response = await api.post('/vendas/clientes', novoCliente);
      setCliente(response);
      setMostrarCadastroCliente(false);
      setNovoCliente({ nome: '', telefone: '', email: '' });
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

      const response = await api.post('/vendas/vendas', vendaData);
      alert(`Venda finalizada! Total: R$ ${calcularTotal().toFixed(2)}`);
      setCarrinho([]);
      setCliente(null);
    } catch (error) {
      console.error('Erro ao finalizar venda:', error);
      alert('Erro ao finalizar venda');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🛒 Sistema de Vendas</h1>

      {/* 👤 CLIENTE */}
      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>Cliente</h2>
        {cliente ? (
          <div>
            <p><strong>Nome:</strong> {cliente.nome}</p>
            <p><strong>Telefone:</strong> {cliente.telefone || 'Não informado'}</p>
            <p><strong>Email:</strong> {cliente.email || 'Não informado'}</p>
            <button onClick={() => setCliente(null)}>Trocar Cliente</button>
          </div>
        ) : (
          <div>
            <input
              type="text"
              placeholder="Telefone do cliente"
              onBlur={(e) => buscarCliente(e.target.value, '')}
              style={{ marginRight: '10px', padding: '8px' }}
            />
            <input
              type="email"
              placeholder="Email do cliente"
              onBlur={(e) => buscarCliente('', e.target.value)}
              style={{ marginRight: '10px', padding: '8px' }}
            />
            <button onClick={() => setMostrarCadastroCliente(true)}>Novo Cliente</button>
          </div>
        )}

        {/* 📝 CADASTRO DE CLIENTE */}
        {mostrarCadastroCliente && (
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
            <h3>Cadastrar Novo Cliente</h3>
            <input
              type="text"
              placeholder="Nome"
              value={novoCliente.nome}
              onChange={(e) => setNovoCliente({...novoCliente, nome: e.target.value})}
              style={{ display: 'block', margin: '10px 0', padding: '8px', width: '100%' }}
            />
            <input
              type="text"
              placeholder="Telefone"
              value={novoCliente.telefone}
              onChange={(e) => setNovoCliente({...novoCliente, telefone: e.target.value})}
              style={{ display: 'block', margin: '10px 0', padding: '8px', width: '100%' }}
            />
            <input
              type="email"
              placeholder="Email"
              value={novoCliente.email}
              onChange={(e) => setNovoCliente({...novoCliente, email: e.target.value})}
              style={{ display: 'block', margin: '10px 0', padding: '8px', width: '100%' }}
            />
            <button onClick={criarCliente} style={{ marginRight: '10px' }}>Salvar Cliente</button>
            <button onClick={() => setMostrarCadastroCliente(false)}>Cancelar</button>
          </div>
        )}
      </div>

      {/* 📦 BUSCA DE PRODUTOS */}
      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>Buscar Produto</h2>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Nome, código ou código de barras"
            value={buscaProduto}
            onChange={(e) => setBuscaProduto(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && buscarProduto()}
            style={{ flex: 1, padding: '8px' }}
          />
          <button onClick={buscarProduto}>🔍 Buscar</button>
        </div>

        {/* 📋 RESULTADOS DA BUSCA */}
        {produtos.map((produto) => (
          <div key={produto.id} style={{ padding: '15px', border: '1px solid #eee', borderRadius: '8px', marginBottom: '10px' }}>
            <h3>{produto.nome} - {produto.marca}</h3>
            <p><strong>Código:</strong> {produto.codigo || 'N/A'}</p>
            <p><strong>Código de Barras:</strong> {produto.codigoBarras || 'N/A'}</p>
            <p><strong>Preço:</strong> R$ {produto.preco.toFixed(2)}</p>
            <p><strong>Estoque:</strong> {produto.estoque}</p>
            <p><strong>Cor:</strong> {produto.cor || 'N/A'} | <strong>Tamanho:</strong> {produto.tamanho || 'N/A'}</p>
            <button onClick={() => adicionarAoCarrinho(produto)}>➕ Adicionar ao Carrinho</button>
          </div>
        ))}
      </div>

      {/* 🛒 CARRINHO */}
      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>Carrinho de Compras</h2>
        {carrinho.length === 0 ? (
          <p>Carrinho vazio</p>
        ) : (
          <div>
            {carrinho.map((item) => (
              <div key={item.produto.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid #eee' }}>
                <div>
                  <h4>{item.produto.nome}</h4>
                  <p>R$ {item.precoUnitario.toFixed(2)} cada</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button onClick={() => atualizarQuantidade(item.produto.id, item.quantidade - 1)}>-</button>
                  <span>{item.quantidade}</span>
                  <button onClick={() => atualizarQuantidade(item.produto.id, item.quantidade + 1)}>+</button>
                  <button onClick={() => removerDoCarrinho(item.produto.id)} style={{ color: 'red' }}>🗑️</button>
                </div>
                <div>
                  <strong>R$ {(item.quantidade * item.precoUnitario - item.desconto).toFixed(2)}</strong>
                </div>
              </div>
            ))}
            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <h3>Total: R$ {calcularTotal().toFixed(2)}</h3>
              <button onClick={finalizarVenda} style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px' }}>
                ✅ Finalizar Venda
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Vendas;