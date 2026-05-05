/**
 * Fornecedores.tsx
 * Página de gestão de fornecedores com cadastro e edição.
 * 
 * Funções principais:
 * 1) Carregar e exibir fornecedores do backend.
 * 2) Criar, atualizar e deletar fornecedores.
 */
import { useEffect, useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { api } from "../services/api";

// 📦 Tipagem Fornecedor
interface Fornecedor {
    id: string;
    nome: string;
    cnpj: string;
    telefone: string;
    email: string;
    endereco: string;
    marcas: Marca[];
}

// 📦 Tipagem Marca
interface Marca {
    id: string;
    nome: string;
    fornecedorId: string;
}

interface FornecedoresProps {
    onNavigate?: (page: string) => void;
}

export default function Fornecedores({ onNavigate }: FornecedoresProps) {
    const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);

    // 📝 Formulário
    const [formData, setFormData] = useState({
        nome: '',
        cnpj: '',
        telefone: '',
        email: '',
        endereco: ''
    });

    useEffect(() => {
        loadFornecedores();
    }, []);

    const loadFornecedores = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await api.get("/cadastros/fornecedores", token);
            setFornecedores(response);
        } catch (error) {
            console.error("Erro ao carregar fornecedores:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            if (editingFornecedor) {
                // Atualizar
                await api.put(`/cadastros/fornecedores/${editingFornecedor.id}`, formData, token);
            } else {
                // Criar
                await api.post("/cadastros/fornecedores", formData, token);
            }

            // Reset form
            setFormData({ nome: '', cnpj: '', telefone: '', email: '', endereco: '' });
            setShowForm(false);
            setEditingFornecedor(null);
            loadFornecedores();
        } catch (error) {
            console.error("Erro ao salvar fornecedor:", error);
        }
    };

    const handleEdit = (fornecedor: Fornecedor) => {
        setEditingFornecedor(fornecedor);
        setFormData({
            nome: fornecedor.nome,
            cnpj: fornecedor.cnpj,
            telefone: fornecedor.telefone,
            email: fornecedor.email,
            endereco: fornecedor.endereco
        });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este fornecedor?')) return;

        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            await api.delete(`/cadastros/fornecedores/${id}`, token);
            loadFornecedores();
        } catch (error) {
            console.error("Erro ao excluir fornecedor:", error);
        }
    };

    if (loading) {
        return <div>Carregando fornecedores...</div>;
    }

    return (
        <div style={{ padding: '20px' }}>
            <h1>Gerenciar Fornecedores</h1>

            <button
                onClick={() => setShowForm(!showForm)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '10px 20px',
                    backgroundColor: showForm ? '#6c757d' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginBottom: '20px'
                }}
            >
                {showForm ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> Novo Fornecedor</>}
            </button>

            {showForm && (
                <form onSubmit={handleSubmit} style={{
                    backgroundColor: '#f8f9fa',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '20px'
                }}>
                    <h3>{editingFornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h3>

                    <div style={{ marginBottom: '10px' }}>
                        <label>Nome:</label>
                        <input
                            type="text"
                            value={formData.nome}
                            onChange={(e) => setFormData({...formData, nome: e.target.value})}
                            required
                            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                        />
                    </div>

                    <div style={{ marginBottom: '10px' }}>
                        <label>CNPJ:</label>
                        <input
                            type="text"
                            value={formData.cnpj}
                            onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                            required
                            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                        />
                    </div>

                    <div style={{ marginBottom: '10px' }}>
                        <label>Telefone:</label>
                        <input
                            type="text"
                            value={formData.telefone}
                            onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                            required
                            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                        />
                    </div>

                    <div style={{ marginBottom: '10px' }}>
                        <label>Email:</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            required
                            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                        />
                    </div>

                    <div style={{ marginBottom: '10px' }}>
                        <label>Endereço:</label>
                        <textarea
                            value={formData.endereco}
                            onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                            required
                            style={{ width: '100%', padding: '8px', marginTop: '5px', minHeight: '60px' }}
                        />
                    </div>

                    <button
                        type="submit"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '10px 20px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        {editingFornecedor ? <><Save size={16} /> Salvar</> : <><Plus size={16} /> Criar</>}
                    </button>
                </form>
            )}

            <div style={{ display: 'grid', gap: '20px' }}>
                {fornecedores.map(fornecedor => (
                    <div key={fornecedor.id} style={{
                        border: '1px solid #dee2e6',
                        borderRadius: '8px',
                        padding: '20px',
                        backgroundColor: 'white'
                    }}>
                        <h3>{fornecedor.nome}</h3>
                        <p><strong>CNPJ:</strong> {fornecedor.cnpj}</p>
                        <p><strong>Telefone:</strong> {fornecedor.telefone}</p>
                        <p><strong>Email:</strong> {fornecedor.email}</p>
                        <p><strong>Endereço:</strong> {fornecedor.endereco}</p>
                        <p><strong>Marcas:</strong> {fornecedor.marcas.length}</p>

                        <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => handleEdit(fornecedor)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '5px',
                                    padding: '6px 12px',
                                    backgroundColor: '#ffc107',
                                    color: 'black',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                <Pencil size={14} /> Editar
                            </button>

                            <button
                                onClick={() => handleDelete(fornecedor.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '5px',
                                    padding: '6px 12px',
                                    backgroundColor: '#dc3545',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                <Trash2 size={14} /> Excluir
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
