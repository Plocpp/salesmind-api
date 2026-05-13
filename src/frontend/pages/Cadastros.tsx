/**
 * Cadastros.tsx
 * Módulo de cadastros mestres do sistema.
 * 
 * Funções principais:
 * 1) Controlar cadastro de marcas, fornecedores e clientes.
 * 2) Gerenciar vendedores, veículos e entregadores.
 */
import { useEffect, useState } from "react";
import {
    Bike,
    Briefcase,
    Car,
    Factory,
    Pencil,
    Plus,
    Save,
    Tag,
    Trash2,
    Truck,
    Users,
    X
} from "lucide-react";
import { api } from "../services/api";

// 📋 Tipagens
interface Marca {
    id: string;
    nome: string;
    fornecedorId: string;
    fornecedor: { nome: string };
}

interface Fornecedor {
    id: string;
    nome: string;
    cnpj?: string;
    telefone?: string;
    email?: string;
    endereco?: string;
}

interface Cliente {
    id: string;
    nome: string;
    telefone?: string;
    email?: string;
}

interface Vendedor {
    id: string;
    nome: string;
    email?: string;
    telefone?: string;
    cpf?: string;
    endereco?: string;
    ativo: boolean;
}

interface VeiculoEntrega {
    id: string;
    placa: string;
    modelo: string;
    ano?: number;
    marca?: string;
    cor?: string;
    capacidade?: number;
    ativo: boolean;
}

interface Entregador {
    id: string;
    nome: string;
    email?: string;
    telefone?: string;
    cpf?: string;
    endereco?: string;
    veiculoId?: string;
    veiculo?: VeiculoEntrega;
    ativo: boolean;
}

type AbaAtiva = 'marcas' | 'fornecedores' | 'clientes' | 'vendedores' | 'veiculos' | 'entregadores';

interface CadastrosProps {
    onNavigate?: (page: string) => void;
}

const tabConfig: { id: AbaAtiva; label: string; icon: React.ReactNode }[] = [
    { id: 'marcas',       label: 'Marcas',       icon: <Tag size={15} /> },
    { id: 'fornecedores', label: 'Fornecedores',  icon: <Factory size={15} /> },
    { id: 'clientes',     label: 'Clientes',      icon: <Users size={15} /> },
    { id: 'vendedores',   label: 'Vendedores',    icon: <Briefcase size={15} /> },
    { id: 'veiculos',     label: 'Veículos',      icon: <Car size={15} /> },
    { id: 'entregadores', label: 'Entregadores',  icon: <Bike size={15} /> },
];

export default function Cadastros({ onNavigate }: CadastrosProps) {
    const [activeTab, setActiveTab] = useState<AbaAtiva>('marcas');
    const [loading, setLoading] = useState(false);

    // Estados para Marcas
    const [marcas, setMarcas] = useState<Marca[]>([]);
    const [showFormMarca, setShowFormMarca] = useState(false);
    const [editingMarca, setEditingMarca] = useState<Marca | null>(null);
    const [formMarca, setFormMarca] = useState({ nome: '', fornecedorId: '' });
    const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);

    // Estados para Fornecedores
    const [showFormFornecedorAba, setShowFormFornecedorAba] = useState(false);
    const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);
    const [formFornecedor, setFormFornecedor] = useState({
        nome: '', cnpj: '', telefone: '', email: '', endereco: ''
    });

    // Estados para Clientes
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [showFormCliente, setShowFormCliente] = useState(false);
    const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
    const [formCliente, setFormCliente] = useState({ nome: '', telefone: '', email: '' });

    // Estados para Vendedores
    const [vendedores, setVendedores] = useState<Vendedor[]>([]);
    const [showFormVendedor, setShowFormVendedor] = useState(false);
    const [editingVendedor, setEditingVendedor] = useState<Vendedor | null>(null);
    const [formVendedor, setFormVendedor] = useState({
        nome: '', email: '', telefone: '', cpf: '', endereco: '', ativo: true
    });

    // Estados para Veículos
    const [veiculos, setVeiculos] = useState<VeiculoEntrega[]>([]);
    const [showFormVeiculo, setShowFormVeiculo] = useState(false);
    const [editingVeiculo, setEditingVeiculo] = useState<VeiculoEntrega | null>(null);
    const [formVeiculo, setFormVeiculo] = useState({
        placa: '', modelo: '', ano: '', marca: '', cor: '', capacidade: '', ativo: true
    });

    // Estados para Entregadores
    const [entregadores, setEntregadores] = useState<Entregador[]>([]);
    const [showFormEntregador, setShowFormEntregador] = useState(false);
    const [editingEntregador, setEditingEntregador] = useState<Entregador | null>(null);
    const [formEntregador, setFormEntregador] = useState({
        nome: '', email: '', telefone: '', cpf: '', endereco: '', veiculoId: '', ativo: true
    });

    useEffect(() => {
        loadAllData();
    }, []);

    const getToken = (): string | undefined => localStorage.getItem('token') ?? undefined;

    // ===== MARCAS =====
    const loadMarcas = async () => {
        try {
            const response = await api.get('/cadastros/marcas', getToken());
            setMarcas(response);
        } catch (error) {
            console.error('Erro ao carregar marcas:', error);
        }
    };

    const saveMarca = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingMarca) {
                await api.put(`/cadastros/marcas/${editingMarca.id}`, formMarca, getToken());
            } else {
                await api.post('/cadastros/marcas', formMarca, getToken());
            }
            setFormMarca({ nome: '', fornecedorId: '' });
            setEditingMarca(null);
            setShowFormMarca(false);
            loadMarcas();
        } catch (error) {
            alert('Erro ao salvar marca');
        }
    };

    const deleteMarca = async (id: string) => {
        if (confirm('Tem certeza?')) {
            try {
                await api.delete(`/cadastros/marcas/${id}`, getToken());
                loadMarcas();
            } catch (error) {
                alert('Erro ao deletar marca');
            }
        }
    };

    // ===== FORNECEDORES =====
    const loadFornecedores = async () => {
        try {
            const response = await api.get('/cadastros/fornecedores', getToken());
            setFornecedores(response);
        } catch (error) {
            console.error('Erro ao carregar fornecedores:', error);
        }
    };

    const saveFornecedor = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingFornecedor) {
                await api.put(`/cadastros/fornecedores/${editingFornecedor.id}`, formFornecedor, getToken());
            } else {
                await api.post('/cadastros/fornecedores', formFornecedor, getToken());
            }
            setFormFornecedor({ nome: '', cnpj: '', telefone: '', email: '', endereco: '' });
            setEditingFornecedor(null);
            setShowFormFornecedorAba(false);
            loadFornecedores();
        } catch (error) {
            alert('Erro ao salvar fornecedor');
        }
    };

    const deleteFornecedor = async (id: string) => {
        if (confirm('Tem certeza?')) {
            try {
                await api.delete(`/cadastros/fornecedores/${id}`, getToken());
                loadFornecedores();
            } catch (error) {
                alert('Erro ao deletar fornecedor');
            }
        }
    };

    // ===== CLIENTES =====
    const loadClientes = async () => {
        try {
            const response = await api.get('/clientes', getToken());
            setClientes(response);
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
        }
    };

    const saveCliente = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCliente) {
                await api.put(`/clientes/${editingCliente.id}`, formCliente, getToken());
            } else {
                await api.post('/clientes', formCliente, getToken());
            }
            setFormCliente({ nome: '', telefone: '', email: '' });
            setEditingCliente(null);
            setShowFormCliente(false);
            loadClientes();
        } catch (error) {
            alert('Erro ao salvar cliente');
        }
    };

    const deleteCliente = async (id: string) => {
        if (confirm('Tem certeza?')) {
            try {
                await api.delete(`/clientes/${id}`, getToken());
                loadClientes();
            } catch (error) {
                alert('Erro ao deletar cliente');
            }
        }
    };

    // ===== VENDEDORES =====
    const loadVendedores = async () => {
        try {
            const response = await api.get('/vendedores', getToken());
            setVendedores(response);
        } catch (error) {
            console.error('Erro ao carregar vendedores:', error);
        }
    };

    const saveVendedor = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingVendedor) {
                await api.put(`/vendedores/${editingVendedor.id}`, formVendedor, getToken());
            } else {
                await api.post('/vendedores', formVendedor, getToken());
            }
            setFormVendedor({ nome: '', email: '', telefone: '', cpf: '', endereco: '', ativo: true });
            setEditingVendedor(null);
            setShowFormVendedor(false);
            loadVendedores();
        } catch (error) {
            alert('Erro ao salvar vendedor');
        }
    };

    const deleteVendedor = async (id: string) => {
        if (confirm('Tem certeza?')) {
            try {
                await api.delete(`/vendedores/${id}`, getToken());
                loadVendedores();
            } catch (error) {
                alert('Erro ao deletar vendedor');
            }
        }
    };

    // ===== VEÍCULOS =====
    const loadVeiculos = async () => {
        try {
            const response = await api.get('/veiculos-entrega', getToken());
            setVeiculos(response);
        } catch (error) {
            console.error('Erro ao carregar veículos:', error);
        }
    };

    const saveVeiculo = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = { ...formVeiculo, ano: formVeiculo.ano ? parseInt(formVeiculo.ano) : null, capacidade: formVeiculo.capacidade ? parseFloat(formVeiculo.capacidade) : null };
            if (editingVeiculo) {
                await api.put(`/veiculos-entrega/${editingVeiculo.id}`, data, getToken());
            } else {
                await api.post('/veiculos-entrega', data, getToken());
            }
            setFormVeiculo({ placa: '', modelo: '', ano: '', marca: '', cor: '', capacidade: '', ativo: true });
            setEditingVeiculo(null);
            setShowFormVeiculo(false);
            loadVeiculos();
        } catch (error) {
            alert('Erro ao salvar veículo');
        }
    };

    const deleteVeiculo = async (id: string) => {
        if (confirm('Tem certeza?')) {
            try {
                await api.delete(`/veiculos-entrega/${id}`, getToken());
                loadVeiculos();
            } catch (error) {
                alert('Erro ao deletar veículo');
            }
        }
    };

    // ===== ENTREGADORES =====
    const loadEntregadores = async () => {
        try {
            const response = await api.get('/entregadores', getToken());
            setEntregadores(response);
        } catch (error) {
            console.error('Erro ao carregar entregadores:', error);
        }
    };

    const saveEntregador = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingEntregador) {
                await api.put(`/entregadores/${editingEntregador.id}`, formEntregador, getToken());
            } else {
                await api.post('/entregadores', formEntregador, getToken());
            }
            setFormEntregador({ nome: '', email: '', telefone: '', cpf: '', endereco: '', veiculoId: '', ativo: true });
            setEditingEntregador(null);
            setShowFormEntregador(false);
            loadEntregadores();
        } catch (error) {
            alert('Erro ao salvar entregador');
        }
    };

    const deleteEntregador = async (id: string) => {
        if (confirm('Tem certeza?')) {
            try {
                await api.delete(`/entregadores/${id}`, getToken());
                loadEntregadores();
            } catch (error) {
                alert('Erro ao deletar entregador');
            }
        }
    };

    const loadAllData = async () => {
        setLoading(true);
        await Promise.all([loadMarcas(), loadFornecedores(), loadClientes(), loadVendedores(), loadVeiculos(), loadEntregadores()]);
        setLoading(false);
    };

    const abaStyle = (tabName: AbaAtiva): React.CSSProperties => ({
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '12px 20px',
        backgroundColor: activeTab === tabName ? '#007bff' : '#f8f9fa',
        color: activeTab === tabName ? 'white' : '#495057',
        border: 'none',
        cursor: 'pointer',
        fontSize: '15px',
        fontWeight: 'bold',
        borderRadius: tabName === 'marcas' ? '8px 0 0 0' : tabName === 'entregadores' ? '0 8px 0 0' : '0'
    });

    const btnNew = (show: boolean): React.CSSProperties => ({
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '10px 20px',
        backgroundColor: show ? '#6c757d' : '#28a745',
        color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'
    });

    const btnSubmit: React.CSSProperties = {
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '10px 20px',
        backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'
    };

    const btnEdit: React.CSSProperties = {
        display: 'flex', alignItems: 'center', gap: '5px',
        padding: '8px 12px', backgroundColor: '#ffc107', border: 'none', borderRadius: '4px', cursor: 'pointer'
    };

    const btnDelete: React.CSSProperties = {
        display: 'flex', alignItems: 'center', gap: '5px',
        padding: '8px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'
    };

    return (
        <div style={{ padding: '20px' }}>
            <h1>Sistema de Cadastros</h1>
            
            {/* ABAS */}
            <div style={{ display: 'flex', marginBottom: '20px', borderRadius: '8px', overflow: 'hidden', border: '2px solid #dee2e6' }}>
                {tabConfig.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={abaStyle(tab.id)}>
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* CONTEÚDO DAS ABAS */}
            <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>

                {/* ABA MARCAS */}
                {activeTab === 'marcas' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h2>Gerenciar Marcas</h2>
                            <button onClick={() => setShowFormMarca(!showFormMarca)} style={btnNew(showFormMarca)}>
                                {showFormMarca ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> Nova Marca</>}
                            </button>
                        </div>

                        {showFormMarca && (
                            <form onSubmit={saveMarca} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                                <h3>{editingMarca ? 'Editar Marca' : 'Nova Marca'}</h3>
                                <div style={{ marginBottom: '10px' }}>
                                    <label>Nome:</label>
                                    <input type="text" value={formMarca.nome} onChange={(e) => setFormMarca({...formMarca, nome: e.target.value})} required style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
                                </div>
                                <div style={{ marginBottom: '10px' }}>
                                    <label>Fornecedor:</label>
                                    <select value={formMarca.fornecedorId} onChange={(e) => setFormMarca({...formMarca, fornecedorId: e.target.value})} required style={{ width: '100%', padding: '8px', marginTop: '5px' }}>
                                        <option value="">Selecione</option>
                                        {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                                    </select>
                                </div>
                                <button type="submit" style={btnSubmit}>
                                    {editingMarca ? <><Save size={16} /> Atualizar</> : <><Plus size={16} /> Criar</>}
                                </button>
                            </form>
                        )}

                        <div style={{ display: 'grid', gap: '10px' }}>
                            {marcas.map(marca => (
                                <div key={marca.id} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ margin: '0' }}>{marca.nome}</h4>
                                        <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>Fornecedor: {marca.fornecedor.nome}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => { setEditingMarca(marca); setFormMarca({nome: marca.nome, fornecedorId: marca.fornecedorId}); setShowFormMarca(true); }} style={btnEdit}><Pencil size={14} /></button>
                                        <button onClick={() => deleteMarca(marca.id)} style={btnDelete}><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ABA FORNECEDORES */}
                {activeTab === 'fornecedores' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h2>Gerenciar Fornecedores</h2>
                            <button onClick={() => setShowFormFornecedorAba(!showFormFornecedorAba)} style={btnNew(showFormFornecedorAba)}>
                                {showFormFornecedorAba ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> Novo Fornecedor</>}
                            </button>
                        </div>

                        {showFormFornecedorAba && (
                            <form onSubmit={saveFornecedor} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                                <h3>{editingFornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h3>
                                <div style={{ marginBottom: '10px' }}><label>Nome:</label><input type="text" value={formFornecedor.nome} onChange={(e) => setFormFornecedor({...formFornecedor, nome: e.target.value})} required style={{ width: '100%', padding: '8px', marginTop: '5px' }} /></div>
                                <div style={{ marginBottom: '10px' }}><label>CNPJ:</label><input type="text" value={formFornecedor.cnpj} onChange={(e) => setFormFornecedor({...formFornecedor, cnpj: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '5px' }} /></div>
                                <div style={{ marginBottom: '10px' }}><label>Telefone:</label><input type="text" value={formFornecedor.telefone} onChange={(e) => setFormFornecedor({...formFornecedor, telefone: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '5px' }} /></div>
                                <div style={{ marginBottom: '10px' }}><label>Email:</label><input type="email" value={formFornecedor.email} onChange={(e) => setFormFornecedor({...formFornecedor, email: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '5px' }} /></div>
                                <div style={{ marginBottom: '10px' }}><label>Endereço:</label><input type="text" value={formFornecedor.endereco} onChange={(e) => setFormFornecedor({...formFornecedor, endereco: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '5px' }} /></div>
                                <button type="submit" style={btnSubmit}>
                                    {editingFornecedor ? <><Save size={16} /> Atualizar</> : <><Plus size={16} /> Criar</>}
                                </button>
                            </form>
                        )}

                        <div style={{ display: 'grid', gap: '10px' }}>
                            {fornecedores.map(fornecedor => (
                                <div key={fornecedor.id} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '6px' }}>
                                    <h4 style={{ margin: '0' }}>{fornecedor.nome}</h4>
                                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>CNPJ: {fornecedor.cnpj || 'N/A'} | Tel: {fornecedor.telefone || 'N/A'} | Email: {fornecedor.email || 'N/A'}</p>
                                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>Endereço: {fornecedor.endereco || 'N/A'}</p>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                        <button onClick={() => { setEditingFornecedor(fornecedor); setFormFornecedor({ nome: fornecedor.nome, cnpj: fornecedor.cnpj ?? '', telefone: fornecedor.telefone ?? '', email: fornecedor.email ?? '', endereco: fornecedor.endereco ?? '' }); setShowFormFornecedorAba(true); }} style={btnEdit}><Pencil size={14} /></button>
                                        <button onClick={() => deleteFornecedor(fornecedor.id)} style={btnDelete}><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ABA CLIENTES */}
                {activeTab === 'clientes' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h2>Gerenciar Clientes</h2>
                            <button onClick={() => setShowFormCliente(!showFormCliente)} style={btnNew(showFormCliente)}>
                                {showFormCliente ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> Novo Cliente</>}
                            </button>
                        </div>

                        {showFormCliente && (
                            <form onSubmit={saveCliente} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                                <h3>{editingCliente ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                                <div style={{ marginBottom: '10px' }}><label>Nome:</label><input type="text" value={formCliente.nome} onChange={(e) => setFormCliente({...formCliente, nome: e.target.value})} required style={{ width: '100%', padding: '8px', marginTop: '5px' }} /></div>
                                <div style={{ marginBottom: '10px' }}><label>Telefone:</label><input type="text" value={formCliente.telefone} onChange={(e) => setFormCliente({...formCliente, telefone: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '5px' }} /></div>
                                <div style={{ marginBottom: '10px' }}><label>Email:</label><input type="email" value={formCliente.email} onChange={(e) => setFormCliente({...formCliente, email: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '5px' }} /></div>
                                <button type="submit" style={btnSubmit}>
                                    {editingCliente ? <><Save size={16} /> Atualizar</> : <><Plus size={16} /> Criar</>}
                                </button>
                            </form>
                        )}

                        <div style={{ display: 'grid', gap: '10px' }}>
                            {clientes.map(cliente => (
                                <div key={cliente.id} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ margin: '0' }}>{cliente.nome}</h4>
                                        <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>{cliente.telefone || 'N/A'} | {cliente.email || 'N/A'}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => { setEditingCliente(cliente); setFormCliente({ nome: cliente.nome, telefone: cliente.telefone ?? '', email: cliente.email ?? '' }); setShowFormCliente(true); }} style={btnEdit}><Pencil size={14} /></button>
                                        <button onClick={() => deleteCliente(cliente.id)} style={btnDelete}><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ABA VENDEDORES */}
                {activeTab === 'vendedores' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h2>Gerenciar Vendedores</h2>
                            <button onClick={() => setShowFormVendedor(!showFormVendedor)} style={btnNew(showFormVendedor)}>
                                {showFormVendedor ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> Novo Vendedor</>}
                            </button>
                        </div>

                        {showFormVendedor && (
                            <form onSubmit={saveVendedor} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                                <h3>{editingVendedor ? 'Editar Vendedor' : 'Novo Vendedor'}</h3>
                                <div style={{ marginBottom: '10px' }}><label>Nome:</label><input type="text" value={formVendedor.nome} onChange={(e) => setFormVendedor({...formVendedor, nome: e.target.value})} required style={{ width: '100%', padding: '8px', marginTop: '5px' }} /></div>
                                <div style={{ marginBottom: '10px' }}><label>CPF:</label><input type="text" value={formVendedor.cpf} onChange={(e) => setFormVendedor({...formVendedor, cpf: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '5px' }} /></div>
                                <div style={{ marginBottom: '10px' }}><label>Email:</label><input type="email" value={formVendedor.email} onChange={(e) => setFormVendedor({...formVendedor, email: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '5px' }} /></div>
                                <div style={{ marginBottom: '10px' }}><label>Telefone:</label><input type="text" value={formVendedor.telefone} onChange={(e) => setFormVendedor({...formVendedor, telefone: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '5px' }} /></div>
                                <div style={{ marginBottom: '10px' }}><label>Endereço:</label><input type="text" value={formVendedor.endereco} onChange={(e) => setFormVendedor({...formVendedor, endereco: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '5px' }} /></div>
                                <label><input type="checkbox" checked={formVendedor.ativo} onChange={(e) => setFormVendedor({...formVendedor, ativo: e.target.checked})} /> Ativo</label>
                                <br />
                                <button type="submit" style={{ ...btnSubmit, marginTop: '10px' }}>
                                    {editingVendedor ? <><Save size={16} /> Atualizar</> : <><Plus size={16} /> Criar</>}
                                </button>
                            </form>
                        )}

                        <div style={{ display: 'grid', gap: '10px' }}>
                            {vendedores.map(vendedor => (
                                <div key={vendedor.id} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '6px' }}>
                                    <h4 style={{ margin: '0' }}>{vendedor.nome} {vendedor.ativo ? '✅' : '❌'}</h4>
                                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>CPF: {vendedor.cpf || 'N/A'} | Tel: {vendedor.telefone || 'N/A'} | Email: {vendedor.email || 'N/A'}</p>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => { setEditingVendedor(vendedor); setFormVendedor({ nome: vendedor.nome, email: vendedor.email ?? '', telefone: vendedor.telefone ?? '', cpf: vendedor.cpf ?? '', endereco: vendedor.endereco ?? '', ativo: vendedor.ativo }); setShowFormVendedor(true); }} style={btnEdit}><Pencil size={14} /></button>
                                        <button onClick={() => deleteVendedor(vendedor.id)} style={btnDelete}><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ABA VEÍCULOS */}
                {activeTab === 'veiculos' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h2>Gerenciar Veículos de Entrega</h2>
                            <button onClick={() => setShowFormVeiculo(!showFormVeiculo)} style={btnNew(showFormVeiculo)}>
                                {showFormVeiculo ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> Novo Veículo</>}
                            </button>
                        </div>

                        {showFormVeiculo && (
                            <form onSubmit={saveVeiculo} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                                <h3>{editingVeiculo ? 'Editar Veículo' : 'Novo Veículo'}</h3>
                                <div style={{ marginBottom: '10px' }}><label>Placa:</label><input type="text" value={formVeiculo.placa} onChange={(e) => setFormVeiculo({...formVeiculo, placa: e.target.value})} required style={{ width: '100%', padding: '8px', marginTop: '5px' }} /></div>
                                <div style={{ marginBottom: '10px' }}><label>Modelo:</label><input type="text" value={formVeiculo.modelo} onChange={(e) => setFormVeiculo({...formVeiculo, modelo: e.target.value})} required style={{ width: '100%', padding: '8px', marginTop: '5px' }} /></div>
                                <div style={{ marginBottom: '10px' }}><label>Marca:</label><input type="text" value={formVeiculo.marca} onChange={(e) => setFormVeiculo({...formVeiculo, marca: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '5px' }} /></div>
                                <div style={{ marginBottom: '10px' }}><label>Ano:</label><input type="number" value={formVeiculo.ano} onChange={(e) => setFormVeiculo({...formVeiculo, ano: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '5px' }} /></div>
                                <div style={{ marginBottom: '10px' }}><label>Cor:</label><input type="text" value={formVeiculo.cor} onChange={(e) => setFormVeiculo({...formVeiculo, cor: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '5px' }} /></div>
                                <div style={{ marginBottom: '10px' }}><label>Capacidade (kg):</label><input type="number" step="0.1" value={formVeiculo.capacidade} onChange={(e) => setFormVeiculo({...formVeiculo, capacidade: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '5px' }} /></div>
                                <label><input type="checkbox" checked={formVeiculo.ativo} onChange={(e) => setFormVeiculo({...formVeiculo, ativo: e.target.checked})} /> Ativo</label>
                                <br />
                                <button type="submit" style={{ ...btnSubmit, marginTop: '10px' }}>
                                    {editingVeiculo ? <><Save size={16} /> Atualizar</> : <><Plus size={16} /> Criar</>}
                                </button>
                            </form>
                        )}

                        <div style={{ display: 'grid', gap: '10px' }}>
                            {veiculos.map(veiculo => (
                                <div key={veiculo.id} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '6px' }}>
                                    <h4 style={{ margin: '0' }}>{veiculo.placa} - {veiculo.modelo} {veiculo.ativo ? '✅' : '❌'}</h4>
                                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>Marca: {veiculo.marca || 'N/A'} | Ano: {veiculo.ano || 'N/A'} | Cor: {veiculo.cor || 'N/A'} | Cap: {veiculo.capacidade || 'N/A'} kg</p>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => { setEditingVeiculo(veiculo); setFormVeiculo({ placa: veiculo.placa, modelo: veiculo.modelo, ano: veiculo.ano?.toString() ?? '', marca: veiculo.marca ?? '', cor: veiculo.cor ?? '', capacidade: veiculo.capacidade?.toString() ?? '', ativo: veiculo.ativo }); setShowFormVeiculo(true); }} style={btnEdit}><Pencil size={14} /></button>
                                        <button onClick={() => deleteVeiculo(veiculo.id)} style={btnDelete}><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ABA ENTREGADORES */}
                {activeTab === 'entregadores' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h2>Gerenciar Entregadores</h2>
                            <button onClick={() => setShowFormEntregador(!showFormEntregador)} style={btnNew(showFormEntregador)}>
                                {showFormEntregador ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> Novo Entregador</>}
                            </button>
                        </div>

                        {showFormEntregador && (
                            <form onSubmit={saveEntregador} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                                <h3>{editingEntregador ? 'Editar Entregador' : 'Novo Entregador'}</h3>
                                <div style={{ marginBottom: '10px' }}><label>Nome:</label><input type="text" value={formEntregador.nome} onChange={(e) => setFormEntregador({...formEntregador, nome: e.target.value})} required style={{ width: '100%', padding: '8px', marginTop: '5px' }} /></div>
                                <div style={{ marginBottom: '10px' }}><label>CPF:</label><input type="text" value={formEntregador.cpf} onChange={(e) => setFormEntregador({...formEntregador, cpf: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '5px' }} /></div>
                                <div style={{ marginBottom: '10px' }}><label>Email:</label><input type="email" value={formEntregador.email} onChange={(e) => setFormEntregador({...formEntregador, email: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '5px' }} /></div>
                                <div style={{ marginBottom: '10px' }}><label>Telefone:</label><input type="text" value={formEntregador.telefone} onChange={(e) => setFormEntregador({...formEntregador, telefone: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '5px' }} /></div>
                                <div style={{ marginBottom: '10px' }}><label>Endereço:</label><input type="text" value={formEntregador.endereco} onChange={(e) => setFormEntregador({...formEntregador, endereco: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '5px' }} /></div>
                                <div style={{ marginBottom: '10px' }}>
                                    <label>Veículo Atribuído:</label>
                                    <select value={formEntregador.veiculoId} onChange={(e) => setFormEntregador({...formEntregador, veiculoId: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '5px' }}>
                                        <option value="">Nenhum</option>
                                        {veiculos.map(v => <option key={v.id} value={v.id}>{v.placa} - {v.modelo}</option>)}
                                    </select>
                                </div>
                                <label><input type="checkbox" checked={formEntregador.ativo} onChange={(e) => setFormEntregador({...formEntregador, ativo: e.target.checked})} /> Ativo</label>
                                <br />
                                <button type="submit" style={{ ...btnSubmit, marginTop: '10px' }}>
                                    {editingEntregador ? <><Save size={16} /> Atualizar</> : <><Plus size={16} /> Criar</>}
                                </button>
                            </form>
                        )}

                        <div style={{ display: 'grid', gap: '10px' }}>
                            {entregadores.map(entregador => (
                                <div key={entregador.id} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '6px' }}>
                                    <h4 style={{ margin: '0' }}>{entregador.nome} {entregador.ativo ? '✅' : '❌'}</h4>
                                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>CPF: {entregador.cpf || 'N/A'} | Tel: {entregador.telefone || 'N/A'} | Email: {entregador.email || 'N/A'}</p>
                                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>Veículo: {entregador.veiculo ? `${entregador.veiculo.placa} - ${entregador.veiculo.modelo}` : 'Nenhum'}</p>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => { setEditingEntregador(entregador); setFormEntregador({ nome: entregador.nome, email: entregador.email ?? '', telefone: entregador.telefone ?? '', cpf: entregador.cpf ?? '', endereco: entregador.endereco ?? '', veiculoId: entregador.veiculoId ?? '', ativo: entregador.ativo }); setShowFormEntregador(true); }} style={btnEdit}><Pencil size={14} /></button>
                                        <button onClick={() => deleteEntregador(entregador.id)} style={btnDelete}><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
