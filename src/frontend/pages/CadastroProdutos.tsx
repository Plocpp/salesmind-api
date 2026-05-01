/**
 * CadastroProdutos.tsx
 * Página de cadastro e controle de produtos.
 * 
 * Funções principais:
 * 1) Listar, criar e editar produtos com relacionamento de marca.
 * 2) Gerenciar estoque e ajustes de quantidade.
 */
import { useEffect, useState } from "react";
import { api } from "../services/api";

// 📦 Tipagem Produto
interface Produto {
    id: string;
    nome: string;
    peso: number;
    porte: string;
    preco: number;
    precoCusto?: number;
    estoque: number;
    codigo: string;
    codigoBarras: string;
    cor: string;
    tamanho: string;
    validade?: string;
    marcaId: string;
    marca?: {
        id: string;
        nome: string;
        fornecedor: {
            nome: string;
        };
    };
}

// 📦 Tipagem Marca
interface Marca {
    id: string;
    nome: string;
    fornecedor: {
        nome: string;
    };
}

interface Fornecedor {
    id: string;
    nome: string;
}

interface CadastroProdutosProps {
    onNavigate?: (page: string) => void;
}

export default function CadastroProdutos({ onNavigate }: CadastroProdutosProps) {
    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [marcas, setMarcas] = useState<Marca[]>([]);
    const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
    const [activeTab, setActiveTab] = useState<'produtos' | 'compras' | 'movimentacao'>('produtos');
    const [selectedAddProductId, setSelectedAddProductId] = useState<string>('');
    const [selectedRemoveProductId, setSelectedRemoveProductId] = useState<string>('');
    const [addQuantity, setAddQuantity] = useState('');
    const [removeQuantity, setRemoveQuantity] = useState('');
    const [stockAdjustments, setStockAdjustments] = useState<Record<string, { add: string; remove: string }>>({});
    const [useNewMarca, setUseNewMarca] = useState(false);
    const [newMarcaNome, setNewMarcaNome] = useState('');
    const [newMarcaFornecedorId, setNewMarcaFornecedorId] = useState('');

    // 📝 Formulário completo
    const [formData, setFormData] = useState({
        nome: '',
        peso: '',
        porte: 'Médio',
        precoCusto: '',
        preco: '',
        estoque: '',
        codigo: '',
        codigoBarras: '',
        cor: '',
        tamanho: '',
        validade: '',
        marcaId: ''
    });

    // 📋 Portes disponíveis
    const portes = ['Pequeno', 'Médio', 'Grande', 'Todos'];

    useEffect(() => {
        loadProdutos();
        loadMarcas();
        loadFornecedores();
    }, []);

    useEffect(() => {
        if (produtos.length > 0) {
            setSelectedAddProductId(prev => prev || produtos[0].id);
            setSelectedRemoveProductId(prev => prev || produtos[0].id);
        }
    }, [produtos]);

    const loadProdutos = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await api.get("/produtos", token);
            setProdutos(response);
        } catch (error) {
            console.error("Erro ao carregar produtos:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadMarcas = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await api.get("/cadastros/marcas", token);
            setMarcas(response);
        } catch (error) {
            console.error("Erro ao carregar marcas:", error);
        }
    };

    const loadFornecedores = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await api.get("/cadastros/fornecedores", token);
            setFornecedores(response);
        } catch (error) {
            console.error("Erro ao carregar fornecedores:", error);
        }
    };

    const criarMarcaInline = async () => {
        if (!newMarcaNome.trim() || !newMarcaFornecedorId) {
            alert('Informe o nome da marca e selecione um fornecedor.');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await api.post('/cadastros/marcas', {
                nome: newMarcaNome,
                fornecedorId: newMarcaFornecedorId
            }, token);

            setNewMarcaNome('');
            setNewMarcaFornecedorId('');
            setUseNewMarca(false);
            loadMarcas();
            setFormData(prev => ({ ...prev, marcaId: response.id }));
            alert('Marca criada e selecionada com sucesso!');
        } catch (error) {
            console.error('Erro ao criar nova marca:', error);
            alert('Não foi possível criar a marca.');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            // Converter dados para o formato correto
            const produtoData = {
                ...formData,
                peso: parseFloat(formData.peso),
                precoCusto: parseFloat(formData.precoCusto),
                preco: parseFloat(formData.preco),
                estoque: parseInt(formData.estoque),
                validade: formData.validade ? new Date(formData.validade).toISOString() : null
            };

            if (editingProduto) {
                // Atualizar
                await api.put(`/produtos/${editingProduto.id}`, produtoData, token);
            } else {
                // Criar
                await api.post("/produtos", produtoData, token);
            }

            // Reset form
            setFormData({
                nome: '',
                peso: '',
                porte: 'Médio',
                precoCusto: '',
                preco: '',
                estoque: '',
                codigo: '',
                codigoBarras: '',
                cor: '',
                tamanho: '',
                validade: '',
                marcaId: ''
            });
            setShowForm(false);
            setEditingProduto(null);
            loadProdutos();
        } catch (error) {
            console.error("Erro ao salvar produto:", error);
            alert("Erro ao salvar produto. Verifique os dados e tente novamente.");
        }
    };

    const handleEdit = (produto: Produto) => {
        setEditingProduto(produto);
        setFormData({
            nome: produto.nome,
            peso: produto.peso.toString(),
            porte: produto.porte,
            precoCusto: produto.precoCusto?.toString() ?? '',
            preco: produto.preco.toString(),
            estoque: produto.estoque.toString(),
            codigo: produto.codigo,
            codigoBarras: produto.codigoBarras,
            cor: produto.cor,
            tamanho: produto.tamanho,
            validade: produto.validade ? new Date(produto.validade).toISOString().split('T')[0] : '',
            marcaId: produto.marcaId
        });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este produto?')) return;

        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            await api.delete(`/produtos/${id}`, token);
            loadProdutos();
        } catch (error) {
            console.error("Erro ao excluir produto:", error);
        }
    };

    const generateCodigo = () => {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        setFormData({...formData, codigo: `PROD${timestamp}${random}`});
    };

    const generateCodigoBarras = () => {
        // Gera um código de barras fictício de 13 dígitos
        let codigo = '789'; // Prefixo brasileiro
        for (let i = 0; i < 10; i++) {
            codigo += Math.floor(Math.random() * 10).toString();
        }
        setFormData({...formData, codigoBarras: codigo});
    };

    const setStockAdjustmentValue = (produtoId: string, field: 'add' | 'remove', value: string) => {
        setStockAdjustments(prev => ({
            ...prev,
            [produtoId]: {
                add: field === 'add' ? value : prev[produtoId]?.add ?? '',
                remove: field === 'remove' ? value : prev[produtoId]?.remove ?? ''
            }
        }));
    };

    const handleStockUpdate = async (produto: Produto, type: 'add' | 'remove') => {
        const adjustment = stockAdjustments[produto.id] || { add: '', remove: '' };
        const quantity = type === 'add' ? parseInt(adjustment.add) : parseInt(adjustment.remove);
        if (!quantity || quantity <= 0) {
            alert('Informe uma quantidade válida.');
            return;
        }

        const newStock = type === 'add' ? produto.estoque + quantity : produto.estoque - quantity;
        if (newStock < 0) {
            alert('Não é possível remover mais do que o estoque disponível.');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            await api.put(`/produtos/${produto.id}`, { estoque: newStock }, token);
            setStockAdjustments(prev => ({
                ...prev,
                [produto.id]: { add: '', remove: '' }
            }));
            loadProdutos();
        } catch (error) {
            console.error('Erro ao atualizar estoque:', error);
            alert('Não foi possível atualizar o estoque.');
        }
    };

    // 📊 Funções para análise de compras
    const getProdutosEstoqueBaixo = () => {
        return produtos.filter(produto => produto.estoque <= 5);
    };

    const getProdutosProximosVencimento = () => {
        const hoje = new Date();
        const daqui30Dias = new Date();
        daqui30Dias.setDate(hoje.getDate() + 30);

        return produtos.filter(produto => {
            if (!produto.validade) return false;
            const dataValidade = new Date(produto.validade);
            return dataValidade >= hoje && dataValidade <= daqui30Dias;
        });
    };

    const getSugestoesCompra = () => {
        const estoqueBaixo = getProdutosEstoqueBaixo();
        const proximosVencimento = getProdutosProximosVencimento();

        // Sugestões baseadas em vendas (simulação - produtos mais vendidos)
        const produtosMaisVendidos = produtos
            .filter(p => p.estoque > 10) // Produtos com bom giro
            .sort((a, b) => b.preco - a.preco) // Ordena por preço (simulação de demanda)
            .slice(0, 3);

        return {
            estoqueBaixo,
            proximosVencimento,
            produtosMaisVendidos
        };
    };

    if (loading) {
        return <div>Carregando produtos...</div>;
    }

    const sugestoes = getSugestoesCompra();

    return (
        <div style={{ padding: '20px' }}>
            <h1>📦 Gestão de Produtos e Estoque</h1>

            {/* 🧭 ABAS DE NAVEGAÇÃO */}
            <div style={{ marginBottom: '30px' }}>
                <div style={{ display: 'flex', borderBottom: '2px solid #dee2e6' }}>
                    <button
                        onClick={() => setActiveTab('produtos')}
                        style={{
                            padding: '15px 30px',
                            backgroundColor: activeTab === 'produtos' ? '#007bff' : '#f8f9fa',
                            color: activeTab === 'produtos' ? 'white' : '#495057',
                            border: 'none',
                            borderBottom: activeTab === 'produtos' ? '3px solid #0056b3' : 'none',
                            cursor: 'pointer',
                            fontSize: '16px',
                            fontWeight: 'bold'
                        }}
                    >
                        📦 PRODUTOS ({produtos.length})
                    </button>

                    <button
                        onClick={() => setActiveTab('movimentacao')}
                        style={{
                            padding: '15px 30px',
                            backgroundColor: activeTab === 'movimentacao' ? '#007bff' : '#f8f9fa',
                            color: activeTab === 'movimentacao' ? 'white' : '#495057',
                            border: 'none',
                            borderBottom: activeTab === 'movimentacao' ? '3px solid #0056b3' : 'none',
                            cursor: 'pointer',
                            fontSize: '16px',
                            fontWeight: 'bold'
                        }}
                    >
                        🔄 MOVIMENTAÇÃO
                    </button>

                    <button
                        onClick={() => setActiveTab('compras')}
                        style={{
                            padding: '15px 30px',
                            backgroundColor: activeTab === 'compras' ? '#007bff' : '#f8f9fa',
                            color: activeTab === 'compras' ? 'white' : '#495057',
                            border: 'none',
                            borderBottom: activeTab === 'compras' ? '3px solid #0056b3' : 'none',
                            cursor: 'pointer',
                            fontSize: '16px',
                            fontWeight: 'bold'
                        }}
                    >
                        🛒 COMPRAS ({sugestoes.estoqueBaixo.length + sugestoes.proximosVencimento.length})
                    </button>
                </div>
            </div>

            {/* 📦 ABA PRODUTOS */}
            {activeTab === 'produtos' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2>📋 Produtos Cadastrados</h2>
                        <button
                            onClick={() => setShowForm(!showForm)}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '16px',
                                fontWeight: 'bold'
                            }}
                        >
                            {showForm ? '❌ Cancelar' : '➕ Novo Produto'}
                        </button>
                    </div>

                    {/* 📝 FORMULÁRIO DE CADASTRO */}
                    {showForm && (
                        <form onSubmit={handleSubmit} style={{
                            backgroundColor: '#f8f9fa',
                            padding: '30px',
                            borderRadius: '12px',
                            marginBottom: '30px',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                        }}>
                            <h3 style={{ marginBottom: '20px', color: '#333' }}>
                                {editingProduto ? '✏️ Editar Produto' : '🆕 Cadastrar Novo Produto'}
                            </h3>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>

                                {/* Informações Básicas */}
                                <div style={{ border: '1px solid #dee2e6', padding: '15px', borderRadius: '8px' }}>
                                    <h4 style={{ marginTop: 0, color: '#495057' }}>📋 Informações Básicas</h4>

                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Nome do Produto:</label>
                                        <input
                                            type="text"
                                            value={formData.nome}
                                            onChange={(e) => setFormData({...formData, nome: e.target.value})}
                                            required
                                            placeholder="Ex: Ração Premium para Cães"
                                            style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                                        />
                                    </div>

                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Código do Produto:</label>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <input
                                                type="text"
                                                value={formData.codigo}
                                                onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                                                required
                                                placeholder="Ex: PROD001"
                                                style={{ flex: 1, padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={generateCodigo}
                                                style={{
                                                    padding: '10px 15px',
                                                    backgroundColor: '#6c757d',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                🔄 Gerar
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Código de Barras:</label>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <input
                                                type="text"
                                                value={formData.codigoBarras}
                                                onChange={(e) => setFormData({...formData, codigoBarras: e.target.value})}
                                                placeholder="Ex: 7891234567890"
                                                style={{ flex: 1, padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={generateCodigoBarras}
                                                style={{
                                                    padding: '10px 15px',
                                                    backgroundColor: '#6c757d',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                🔄 Gerar
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Especificações */}
                                <div style={{ border: '1px solid #dee2e6', padding: '15px', borderRadius: '8px' }}>
                                    <h4 style={{ marginTop: 0, color: '#495057' }}>📏 Especificações</h4>

                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Peso (kg):</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.peso}
                                            onChange={(e) => setFormData({...formData, peso: e.target.value})}
                                            required
                                            placeholder="Ex: 1.5"
                                            style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                                        />
                                    </div>

                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Porte:</label>
                                        <select
                                            value={formData.porte}
                                            onChange={(e) => setFormData({...formData, porte: e.target.value})}
                                            required
                                            style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                                        >
                                            {portes.map(porte => (
                                                <option key={porte} value={porte}>{porte}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Cor:</label>
                                        <input
                                            type="text"
                                            value={formData.cor}
                                            onChange={(e) => setFormData({...formData, cor: e.target.value})}
                                            placeholder="Ex: Marrom, Azul, etc."
                                            style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                                        />
                                    </div>

                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Tamanho:</label>
                                        <input
                                            type="text"
                                            value={formData.tamanho}
                                            onChange={(e) => setFormData({...formData, tamanho: e.target.value})}
                                            placeholder="Ex: 15kg, M, 500ml, etc."
                                            style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                                        />
                                    </div>
                                </div>

                                {/* Comercial */}
                                <div style={{ border: '1px solid #dee2e6', padding: '15px', borderRadius: '8px' }}>
                                    <h4 style={{ marginTop: 0, color: '#495057' }}>💰 Informações Comerciais</h4>

                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Preço de Custo (R$):</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.precoCusto}
                                            onChange={(e) => setFormData({...formData, precoCusto: e.target.value})}
                                            required
                                            placeholder="Ex: 45.50"
                                            style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                                        />
                                    </div>

                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Preço de Venda (R$):</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.preco}
                                            onChange={(e) => setFormData({...formData, preco: e.target.value})}
                                            required
                                            placeholder="Ex: 89.90"
                                            style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                                        />
                                    </div>

                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Estoque:</label>
                                        <input
                                            type="number"
                                            value={formData.estoque}
                                            onChange={(e) => setFormData({...formData, estoque: e.target.value})}
                                            required
                                            placeholder="Ex: 50"
                                            style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                                        />
                                    </div>

                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Validade (opcional):</label>
                                        <input
                                            type="date"
                                            value={formData.validade}
                                            onChange={(e) => setFormData({...formData, validade: e.target.value})}
                                            style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                                        />
                                        <small style={{ color: '#6c757d', fontSize: '12px' }}>
                                            Deixe em branco se o produto não tem validade
                                        </small>
                                    </div>
                                </div>

                                {/* Marca */}
                                <div style={{ border: '1px solid #dee2e6', padding: '15px', borderRadius: '8px' }}>
                                    <h4 style={{ marginTop: 0, color: '#495057' }}>🏷️ Marca e Fornecedor</h4>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Marca:</label>
                                        <button
                                            type="button"
                                            onClick={() => setUseNewMarca(prev => !prev)}
                                            style={{
                                                padding: '8px 12px',
                                                backgroundColor: useNewMarca ? '#6c757d' : '#17a2b8',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '14px'
                                            }}
                                        >
                                            {useNewMarca ? 'Usar marca existente' : 'Cadastrar nova marca'}
                                        </button>
                                    </div>

                                    <div style={{ marginBottom: '12px' }}>
                                        <select
                                            value={formData.marcaId}
                                            onChange={(e) => setFormData({...formData, marcaId: e.target.value})}
                                            required={!useNewMarca}
                                            disabled={useNewMarca}
                                            style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px', backgroundColor: useNewMarca ? '#e9ecef' : 'white' }}
                                        >
                                            <option value="">Selecione uma marca</option>
                                            {marcas.map(marca => (
                                                <option key={marca.id} value={marca.id}>
                                                    {marca.nome} - {marca.fornecedor.nome}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {useNewMarca && (
                                        <div style={{ marginBottom: '20px', padding: '15px', borderRadius: '8px', backgroundColor: '#f8f9fa', border: '1px solid #ced4da' }}>
                                            <h5 style={{ margin: '0 0 10px 0', color: '#495057' }}>Nova Marca</h5>
                                            <div style={{ marginBottom: '12px' }}>
                                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Nome da Marca:</label>
                                                <input
                                                    type="text"
                                                    value={newMarcaNome}
                                                    onChange={(e) => setNewMarcaNome(e.target.value)}
                                                    placeholder="Ex: PetMind"
                                                    style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                                                />
                                            </div>
                                            <div style={{ marginBottom: '12px' }}>
                                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Fornecedor:</label>
                                                <select
                                                    value={newMarcaFornecedorId}
                                                    onChange={(e) => setNewMarcaFornecedorId(e.target.value)}
                                                    style={{ width: '100%', padding: '10px', border: '1px solid #ced4da', borderRadius: '4px' }}
                                                >
                                                    <option value="">Selecione um fornecedor</option>
                                                    {fornecedores.map(fornecedor => (
                                                        <option key={fornecedor.id} value={fornecedor.id}>
                                                            {fornecedor.nome}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={criarMarcaInline}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px',
                                                    backgroundColor: '#28a745',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '16px',
                                                    fontWeight: 'bold'
                                                }}
                                            >
                                                ➕ Criar marca e selecionar
                                            </button>
                                        </div>
                                    )}

                                    <div style={{ marginTop: '20px' }}>
                                        <button
                                            type="submit"
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                backgroundColor: '#007bff',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontSize: '16px',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {editingProduto ? '💾 Salvar Alterações' : '✅ Cadastrar Produto'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    )}

                    {/* 📋 LISTA DE PRODUTOS */}
                    <div style={{ display: 'grid', gap: '15px' }}>
                        {produtos.map(produto => (
                            <div key={produto.id} style={{
                                border: '1px solid #dee2e6',
                                borderRadius: '8px',
                                padding: '20px',
                                backgroundColor: 'white',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(280px, 380px)', gap: '20px', alignItems: 'start' }}>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
                                            <h3 style={{ margin: '0', color: '#333' }}>{produto.nome}</h3>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#f1f3f5', padding: '8px 12px', borderRadius: '999px', fontWeight: 'bold', color: produto.estoque <= 5 ? '#dc3545' : produto.estoque <= 10 ? '#ffc107' : '#28a745' }}>
                                                <span>Estoque:</span>
                                                <span>{produto.estoque} un</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', fontSize: '14px', marginTop: '16px' }}>
                                            <div><strong>Código:</strong> {produto.codigo}</div>
                                            <div><strong>Marca:</strong> {produto.marca?.nome || 'N/A'}</div>
                                            <div><strong>Fornecedor:</strong> {produto.marca?.fornecedor?.nome || 'N/A'}</div>
                                            <div><strong>Peso:</strong> {produto.peso}kg</div>
                                            <div><strong>Porte:</strong> {produto.porte}</div>
                                            <div><strong>Preço de Custo:</strong> R$ {(produto.precoCusto ?? 0).toFixed(2)}</div>
                                            <div><strong>Preço de Venda:</strong> R$ {produto.preco.toFixed(2)}</div>
                                            <div><strong>Margem:</strong> R$ {(produto.preco - (produto.precoCusto ?? 0)).toFixed(2)}</div>
                                            {produto.validade && (
                                                <div><strong>Validade:</strong> {new Date(produto.validade).toLocaleDateString('pt-BR')}</div>
                                            )}
                                            {produto.cor && <div><strong>Cor:</strong> {produto.cor}</div>}
                                            {produto.tamanho && <div><strong>Tamanho:</strong> {produto.tamanho}</div>}
                                            {produto.codigoBarras && <div><strong>Cód. Barras:</strong> {produto.codigoBarras}</div>}
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gap: '12px' }}>
                                        <div style={{ display: 'grid', gap: '10px', backgroundColor: '#e9f7ef', padding: '16px', borderRadius: '10px', border: '1px solid #c3e6cb' }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '15px' }}>🔄 Movimentação de Estoque</div>
                                            <div style={{ display: 'grid', gap: '10px' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px' }}>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        placeholder="Adicionar"
                                                        value={stockAdjustments[produto.id]?.add ?? ''}
                                                        onChange={(e) => setStockAdjustmentValue(produto.id, 'add', e.target.value)}
                                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ced4da' }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleStockUpdate(produto, 'add')}
                                                        style={{ padding: '10px 14px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px' }}>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        placeholder="Remover"
                                                        value={stockAdjustments[produto.id]?.remove ?? ''}
                                                        onChange={(e) => setStockAdjustmentValue(produto.id, 'remove', e.target.value)}
                                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ced4da' }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleStockUpdate(produto, 'remove')}
                                                        style={{ padding: '10px 14px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                                                    >
                                                        -
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button
                                                onClick={() => handleEdit(produto)}
                                                style={{
                                                    flex: 1,
                                                    padding: '12px',
                                                    backgroundColor: '#ffc107',
                                                    color: 'black',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    fontSize: '14px'
                                                }}
                                            >
                                                ✏️ Editar
                                            </button>
                                            <button
                                                onClick={() => handleDelete(produto.id)}
                                                style={{
                                                    flex: 1,
                                                    padding: '12px',
                                                    backgroundColor: '#dc3545',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    fontSize: '14px'
                                                }}
                                            >
                                                🗑️ Excluir
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* � ABA MOVIMENTAÇÃO */}
            {activeTab === 'movimentacao' && (
                <div>
                    <h2>🔄 Movimentação de Estoque</h2>
                    <div style={{ display: 'grid', gap: '20px', marginBottom: '30px', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
                        <div style={{ padding: '20px', borderRadius: '10px', border: '1px solid #dee2e6', backgroundColor: '#f8f9fa' }}>
                            <h3>➕ Adicionar Estoque</h3>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Produto:</label>
                                <select
                                    value={selectedAddProductId}
                                    onChange={(e) => setSelectedAddProductId(e.target.value)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da' }}
                                >
                                    {produtos.map(produto => (
                                        <option key={produto.id} value={produto.id}>{produto.nome} ({produto.estoque} un)</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Quantidade para adicionar:</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={addQuantity}
                                    onChange={(e) => setAddQuantity(e.target.value)}
                                    placeholder="Ex: 10"
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da' }}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={async () => {
                                    const amount = parseInt(addQuantity);
                                    if (!selectedAddProductId || isNaN(amount) || amount <= 0) {
                                        alert('Informe uma quantidade válida para adicionar.');
                                        return;
                                    }
                                    const produto = produtos.find(p => p.id === selectedAddProductId);
                                    if (!produto) return;
                                    const token = localStorage.getItem('token');
                                    if (!token) return;
                                    try {
                                        await api.put(`/produtos/${produto.id}`, { estoque: produto.estoque + amount }, token);
                                        setAddQuantity('');
                                        loadProdutos();
                                        alert('Estoque adicionado com sucesso!');
                                    } catch (error) {
                                        console.error('Erro ao adicionar estoque:', error);
                                        alert('Não foi possível adicionar estoque.');
                                    }
                                }}
                                style={{ width: '100%', padding: '12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                ✅ Adicionar Estoque
                            </button>
                        </div>

                        <div style={{ padding: '20px', borderRadius: '10px', border: '1px solid #dee2e6', backgroundColor: '#f8f9fa' }}>
                            <h3>➖ Remover Estoque</h3>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Produto:</label>
                                <select
                                    value={selectedRemoveProductId}
                                    onChange={(e) => setSelectedRemoveProductId(e.target.value)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da' }}
                                >
                                    {produtos.map(produto => (
                                        <option key={produto.id} value={produto.id}>{produto.nome} ({produto.estoque} un)</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Quantidade para remover:</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={removeQuantity}
                                    onChange={(e) => setRemoveQuantity(e.target.value)}
                                    placeholder="Ex: 5"
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da' }}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={async () => {
                                    const amount = parseInt(removeQuantity);
                                    if (!selectedRemoveProductId || isNaN(amount) || amount <= 0) {
                                        alert('Informe uma quantidade válida para remover.');
                                        return;
                                    }
                                    const produto = produtos.find(p => p.id === selectedRemoveProductId);
                                    if (!produto) return;
                                    const newStock = produto.estoque - amount;
                                    if (newStock < 0) {
                                        alert('Não é possível remover mais do que o estoque disponível.');
                                        return;
                                    }
                                    const token = localStorage.getItem('token');
                                    if (!token) return;
                                    try {
                                        await api.put(`/produtos/${produto.id}`, { estoque: newStock }, token);
                                        setRemoveQuantity('');
                                        loadProdutos();
                                        alert('Estoque removido com sucesso!');
                                    } catch (error) {
                                        console.error('Erro ao remover estoque:', error);
                                        alert('Não foi possível remover estoque.');
                                    }
                                }}
                                style={{ width: '100%', padding: '12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                🗑️ Remover Estoque
                            </button>
                        </div>
                    </div>

                    <div style={{ padding: '20px', borderRadius: '10px', border: '1px solid #dee2e6', backgroundColor: '#ffffff' }}>
                        <h3>📊 Balanço de Estoque</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginTop: '20px' }}>
                            <div style={{ padding: '20px', backgroundColor: '#e9f7ef', borderRadius: '10px' }}>
                                <h4>Total de Produtos</h4>
                                <p style={{ fontSize: '28px', fontWeight: 'bold' }}>{produtos.length}</p>
                            </div>
                            <div style={{ padding: '20px', backgroundColor: '#e9f7ef', borderRadius: '10px' }}>
                                <h4>Total em Estoque</h4>
                                <p style={{ fontSize: '28px', fontWeight: 'bold' }}>{produtos.reduce((sum, produto) => sum + produto.estoque, 0)} un</p>
                            </div>
                            <div style={{ padding: '20px', backgroundColor: '#e9f7ef', borderRadius: '10px' }}>
                                <h4>Valor total de custo</h4>
                                <p style={{ fontSize: '28px', fontWeight: 'bold' }}>R$ {produtos.reduce((sum, produto) => sum + produto.estoque * (produto.precoCusto ?? 0), 0).toFixed(2)}</p>
                            </div>
                            <div style={{ padding: '20px', backgroundColor: '#e9f7ef', borderRadius: '10px' }}>
                                <h4>Valor total de venda</h4>
                                <p style={{ fontSize: '28px', fontWeight: 'bold' }}>R$ {produtos.reduce((sum, produto) => sum + produto.estoque * produto.preco, 0).toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* �🛒 ABA COMPRAS */}
            {activeTab === 'compras' && (
                <div>
                    <h2>🛒 Sugestões de Compras</h2>

                    {/* 🚨 PRODUTOS COM ESTOQUE BAIXO */}
                    <div style={{ marginBottom: '30px' }}>
                        <h3 style={{ color: '#dc3545', borderBottom: '2px solid #dc3545', paddingBottom: '10px' }}>
                            🚨 Produtos com Estoque Baixo (≤ 5 unidades)
                        </h3>

                        {sugestoes.estoqueBaixo.length > 0 ? (
                            <div style={{ display: 'grid', gap: '15px', marginTop: '15px' }}>
                                {sugestoes.estoqueBaixo.map(produto => (
                                    <div key={produto.id} style={{
                                        border: '2px solid #dc3545',
                                        borderRadius: '8px',
                                        padding: '20px',
                                        backgroundColor: '#fff5f5',
                                        boxShadow: '0 2px 5px rgba(220,53,69,0.2)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <h4 style={{ margin: '0 0 10px 0', color: '#dc3545' }}>{produto.nome}</h4>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', fontSize: '14px' }}>
                                                    <div><strong>Código:</strong> {produto.codigo}</div>
                                                    <div><strong>Marca:</strong> {produto.marca?.nome}</div>
                                                    <div><strong>Estoque Atual:</strong> <span style={{ color: '#dc3545', fontWeight: 'bold' }}>{produto.estoque} un</span></div>
                                                    <div><strong>Preço:</strong> R$ {produto.preco.toFixed(2)}</div>
                                                    <div><strong>Fornecedor:</strong> {produto.marca?.fornecedor?.nome}</div>
                                                </div>
                                            </div>
                                            <div style={{
                                                backgroundColor: '#dc3545',
                                                color: 'white',
                                                padding: '15px',
                                                borderRadius: '50%',
                                                fontSize: '24px',
                                                fontWeight: 'bold'
                                            }}>
                                                ⚠️
                                            </div>
                                        </div>
                                        <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#ffe6e6', borderRadius: '4px' }}>
                                            <strong>💡 Sugestão:</strong> Recomendado comprar pelo menos 20-30 unidades para manter estoque adequado.
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ padding: '20px', backgroundColor: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '8px', color: '#155724' }}>
                                ✅ Todos os produtos estão com estoque adequado!
                            </div>
                        )}
                    </div>

                    {/* ⏰ PRODUTOS PRÓXIMOS AO VENCIMENTO */}
                    <div style={{ marginBottom: '30px' }}>
                        <h3 style={{ color: '#ffc107', borderBottom: '2px solid #ffc107', paddingBottom: '10px' }}>
                            ⏰ Produtos Próximos ao Vencimento (30 dias)
                        </h3>

                        {sugestoes.proximosVencimento.length > 0 ? (
                            <div style={{ display: 'grid', gap: '15px', marginTop: '15px' }}>
                                {sugestoes.proximosVencimento.map(produto => (
                                    <div key={produto.id} style={{
                                        border: '2px solid #ffc107',
                                        borderRadius: '8px',
                                        padding: '20px',
                                        backgroundColor: '#fffbf0',
                                        boxShadow: '0 2px 5px rgba(255,193,7,0.2)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>{produto.nome}</h4>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', fontSize: '14px' }}>
                                                    <div><strong>Código:</strong> {produto.codigo}</div>
                                                    <div><strong>Marca:</strong> {produto.marca?.nome}</div>
                                                    <div><strong>Estoque:</strong> {produto.estoque} un</div>
                                                    <div><strong>Preço:</strong> R$ {produto.preco.toFixed(2)}</div>
                                                    <div style={{ color: '#856404', fontWeight: 'bold' }}>
                                                        <strong>Validade:</strong> {new Date(produto.validade!).toLocaleDateString('pt-BR')}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{
                                                backgroundColor: '#ffc107',
                                                color: 'black',
                                                padding: '15px',
                                                borderRadius: '50%',
                                                fontSize: '24px',
                                                fontWeight: 'bold'
                                            }}>
                                                ⏰
                                            </div>
                                        </div>
                                        <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
                                            <strong>💡 Sugestão:</strong> Avalie a venda prioritária ou considere repor com data de validade mais distante.
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ padding: '20px', backgroundColor: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '8px', color: '#155724' }}>
                                ✅ Nenhum produto próximo ao vencimento!
                            </div>
                        )}
                    </div>

                    {/* 📈 PRODUTOS MAIS VENDIDOS (SUGESTÃO DE REPOSIÇÃO) */}
                    <div style={{ marginBottom: '30px' }}>
                        <h3 style={{ color: '#28a745', borderBottom: '2px solid #28a745', paddingBottom: '10px' }}>
                            📈 Produtos com Alto Giro (Sugestão de Reposição)
                        </h3>

                        <div style={{ display: 'grid', gap: '15px', marginTop: '15px' }}>
                            {sugestoes.produtosMaisVendidos.map((produto, index) => (
                                <div key={produto.id} style={{
                                    border: '2px solid #28a745',
                                    borderRadius: '8px',
                                    padding: '20px',
                                    backgroundColor: '#f8fff8',
                                    boxShadow: '0 2px 5px rgba(40,167,69,0.2)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <h4 style={{ margin: '0 0 10px 0', color: '#155724' }}>
                                                #{index + 1} - {produto.nome}
                                            </h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', fontSize: '14px' }}>
                                                <div><strong>Código:</strong> {produto.codigo}</div>
                                                <div><strong>Marca:</strong> {produto.marca?.nome}</div>
                                                <div><strong>Estoque Atual:</strong> {produto.estoque} un</div>
                                                <div><strong>Preço:</strong> R$ {produto.preco.toFixed(2)}</div>
                                                <div><strong>Fornecedor:</strong> {produto.marca?.fornecedor?.nome}</div>
                                            </div>
                                        </div>
                                        <div style={{
                                            backgroundColor: '#28a745',
                                            color: 'white',
                                            padding: '15px',
                                            borderRadius: '50%',
                                            fontSize: '24px',
                                            fontWeight: 'bold'
                                        }}>
                                            📈
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#d4edda', borderRadius: '4px' }}>
                                        <strong>💡 Sugestão:</strong> Produto com bom giro de vendas. Considere manter estoque entre 50-100 unidades.
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 📊 RESUMO GERAL */}
                    <div style={{
                        backgroundColor: '#f8f9fa',
                        padding: '20px',
                        borderRadius: '8px',
                        border: '1px solid #dee2e6'
                    }}>
                        <h3 style={{ marginTop: 0 }}>📊 Resumo de Compras Sugeridas</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '15px' }}>
                            <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#dc3545', color: 'white', borderRadius: '8px' }}>
                                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{sugestoes.estoqueBaixo.length}</div>
                                <div>Produtos com Estoque Baixo</div>
                            </div>
                            <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#ffc107', color: 'black', borderRadius: '8px' }}>
                                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{sugestoes.proximosVencimento.length}</div>
                                <div>Produtos Próximos Vencimento</div>
                            </div>
                            <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#28a745', color: 'white', borderRadius: '8px' }}>
                                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{sugestoes.produtosMaisVendidos.length}</div>
                                <div>Produtos Alto Giro</div>
                            </div>
                            <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#007bff', color: 'white', borderRadius: '8px' }}>
                                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{produtos.length}</div>
                                <div>Total de Produtos</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}