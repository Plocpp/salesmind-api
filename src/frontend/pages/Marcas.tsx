/**
 * Marcas.tsx
 * Tela de cadastro e manutenção de marcas e fornecedores associados.
 * 
 * Funções principais:
 * 1) Gerenciar marcas e vincular fornecedores.
 * 2) Exibir lista de marcas e inserir novos fornecedores inline.
 */
import { useEffect, useState } from "react";
import { api } from "../services/api";

// 📦 Tipagem Marca
interface Marca {
    id: string;
    nome: string;
    fornecedorId: string;
    fornecedor: {
        id: string;
        nome: string;
    };
    produtos: Produto[];
}

// 📦 Tipagem Produto
interface Produto {
    id: string;
    nome: string;
    preco: number;
    estoque: number;
}

// 📦 Tipagem Fornecedor
interface Fornecedor {
    id: string;
    nome: string;
}

interface MarcasProps {
    onNavigate?: (page: string) => void;
}

export default function Marcas({ onNavigate }: MarcasProps) {
    const [marcas, setMarcas] = useState<Marca[]>([]);
    const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingMarca, setEditingMarca] = useState<Marca | null>(null);
    const [useNewFornecedor, setUseNewFornecedor] = useState(false);

    // 📝 Formulário
    const [formData, setFormData] = useState({
        nome: '',
        fornecedorId: ''
    });

    const [newFornecedorData, setNewFornecedorData] = useState({
        nome: '',
        cnpj: '',
        telefone: '',
        email: '',
        endereco: ''
    });

    useEffect(() => {
        loadMarcas();
        loadFornecedores();
    }, []);

    const loadMarcas = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await api.get("/cadastros/marcas", token);
            setMarcas(response);
        } catch (error) {
            console.error("Erro ao carregar marcas:", error);
        } finally {
            setLoading(false);
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

    const criarFornecedorInline = async () => {
        if (!newFornecedorData.nome.trim()) {
            alert('Informe o nome do fornecedor.');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await api.post('/cadastros/fornecedores', newFornecedorData, token);
            setNewFornecedorData({ nome: '', cnpj: '', telefone: '', email: '', endereco: '' });
            setUseNewFornecedor(false);
            setFormData(prev => ({ ...prev, fornecedorId: response.id }));
            loadFornecedores();
            alert('Fornecedor cadastrado com sucesso e selecionado.');
        } catch (error) {
            console.error('Erro ao cadastrar fornecedor:', error);
            alert('Não foi possível cadastrar o fornecedor.');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            if (editingMarca) {
                // Atualizar
                await api.put(`/cadastros/marcas/${editingMarca.id}`, formData, token);
            } else {
                // Criar
                await api.post("/cadastros/marcas", formData, token);
            }

            // Reset form
            setFormData({ nome: '', fornecedorId: '' });
            setNewFornecedorData({ nome: '', cnpj: '', telefone: '', email: '', endereco: '' });
            setUseNewFornecedor(false);
            setShowForm(false);
            setEditingMarca(null);
            loadMarcas();
        } catch (error) {
            console.error("Erro ao salvar marca:", error);
        }
    };

    const handleEdit = (marca: Marca) => {
        setEditingMarca(marca);
        setFormData({
            nome: marca.nome,
            fornecedorId: marca.fornecedorId
        });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta marca?')) return;

        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            await api.delete(`/cadastros/marcas/${id}`, token);
            loadMarcas();
        } catch (error) {
            console.error("Erro ao excluir marca:", error);
        }
    };

    if (loading) {
        return <div>Carregando marcas...</div>;
    }

    return (
        <div style={{ padding: '20px' }}>
            <h1>🏷️ Gerenciar Marcas</h1>

            <button
                onClick={() => setShowForm(!showForm)}
                style={{
                    padding: '10px 20px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginBottom: '20px'
                }}
            >
                {showForm ? '❌ Cancelar' : '➕ Nova Marca'}
            </button>

            {showForm && (
                <form onSubmit={handleSubmit} style={{
                    backgroundColor: '#f8f9fa',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '20px'
                }}>
                    <h3>{editingMarca ? 'Editar Marca' : 'Nova Marca'}</h3>

                    <div style={{ marginBottom: '10px' }}>
                        <label>Nome da Marca:</label>
                        <input
                            type="text"
                            value={formData.nome}
                            onChange={(e) => setFormData({...formData, nome: e.target.value})}
                            required
                            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                        <div>
                            <label>Fornecedor:</label>
                            <select
                                value={formData.fornecedorId}
                                onChange={(e) => setFormData({...formData, fornecedorId: e.target.value})}
                                required={!useNewFornecedor}
                                disabled={useNewFornecedor}
                                style={{ width: '100%', padding: '8px', marginTop: '5px', backgroundColor: useNewFornecedor ? '#e9ecef' : 'white' }}
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
                            onClick={() => setUseNewFornecedor(prev => !prev)}
                            style={{
                                padding: '8px 12px',
                                backgroundColor: useNewFornecedor ? '#6c757d' : '#17a2b8',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            {useNewFornecedor ? 'Voltar para Fornecedor existente' : 'Cadastrar fornecedor'}
                        </button>
                    </div>

                    {useNewFornecedor && (
                        <div style={{ marginBottom: '10px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #ced4da' }}>
                            <h4 style={{ marginTop: 0, marginBottom: '10px' }}>Novo Fornecedor</h4>
                            <div style={{ marginBottom: '10px' }}>
                                <label>Nome do Fornecedor:</label>
                                <input
                                    type="text"
                                    value={newFornecedorData.nome}
                                    onChange={(e) => setNewFornecedorData({...newFornecedorData, nome: e.target.value})}
                                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                                />
                            </div>
                            <div style={{ marginBottom: '10px' }}>
                                <label>CNPJ:</label>
                                <input
                                    type="text"
                                    value={newFornecedorData.cnpj}
                                    onChange={(e) => setNewFornecedorData({...newFornecedorData, cnpj: e.target.value})}
                                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                                />
                            </div>
                            <div style={{ marginBottom: '10px' }}>
                                <label>Telefone:</label>
                                <input
                                    type="text"
                                    value={newFornecedorData.telefone}
                                    onChange={(e) => setNewFornecedorData({...newFornecedorData, telefone: e.target.value})}
                                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                                />
                            </div>
                            <div style={{ marginBottom: '10px' }}>
                                <label>Email:</label>
                                <input
                                    type="email"
                                    value={newFornecedorData.email}
                                    onChange={(e) => setNewFornecedorData({...newFornecedorData, email: e.target.value})}
                                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                                />
                            </div>
                            <div style={{ marginBottom: '10px' }}>
                                <label>Endereço:</label>
                                <input
                                    type="text"
                                    value={newFornecedorData.endereco}
                                    onChange={(e) => setNewFornecedorData({...newFornecedorData, endereco: e.target.value})}
                                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={criarFornecedorInline}
                                style={{
                                    width: '100%',
                                    padding: '10px 20px',
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                ➕ Cadastrar Fornecedor
                            </button>
                        </div>
                    )}

                    <button
                        type="submit"
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        {editingMarca ? '💾 Salvar' : '➕ Criar'}
                    </button>
                </form>
            )}

            <div style={{ display: 'grid', gap: '20px' }}>
                {marcas.map(marca => (
                    <div key={marca.id} style={{
                        border: '1px solid #dee2e6',
                        borderRadius: '8px',
                        padding: '20px',
                        backgroundColor: 'white'
                    }}>
                        <h3>{marca.nome}</h3>
                        <p><strong>Fornecedor:</strong> {marca.fornecedor?.nome || 'N/A'}</p>
                        <p><strong>Produtos:</strong> {marca.produtos?.length || 0}</p>

                        {marca.produtos && marca.produtos.length > 0 && (
                            <div style={{ marginTop: '10px' }}>
                                <h4>Produtos desta marca:</h4>
                                <ul>
                                    {marca.produtos.slice(0, 3).map(produto => (
                                        <li key={produto.id}>
                                            {produto.nome} - R$ {produto.preco.toFixed(2)} (Estoque: {produto.estoque})
                                        </li>
                                    ))}
                                    {marca.produtos.length > 3 && (
                                        <li>... e mais {marca.produtos.length - 3} produtos</li>
                                    )}
                                </ul>
                            </div>
                        )}

                        <div style={{ marginTop: '10px' }}>
                            <button
                                onClick={() => handleEdit(marca)}
                                style={{
                                    padding: '5px 10px',
                                    backgroundColor: '#ffc107',
                                    color: 'black',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    marginRight: '10px'
                                }}
                            >
                                ✏️ Editar
                            </button>

                            <button
                                onClick={() => handleDelete(marca.id)}
                                style={{
                                    padding: '5px 10px',
                                    backgroundColor: '#dc3545',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                🗑️ Excluir
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}