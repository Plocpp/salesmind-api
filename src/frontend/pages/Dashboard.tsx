/**
 * Dashboard.tsx
 * Painel de métricas do sistema.
 * 
 * Funções principais:
 * 1) Consultar métricas e listagem de produtos.
 * 2) Exibir ações rápidas e estado do dashboard.
 */
import { useEffect, useState } from "react";
import { api } from "../services/api";

// 📦 Tipagem Produto
interface Produto {
    id: string;
    nome: string;
    marca: string;
    peso: number;
    porte: string;
    preco: number;
    estoque: number;
    usuarioId: string;
    }

    // 📊 Tipagem Dashboard
interface EstoqueBaixoItem {
    id: string;
    nome: string;
    estoque: number;
}

interface DashboardData {
    totalUsuarios: number;
    totalProdutos: number;
    totalEstoque: number;
    produtosEstoqueBaixo: EstoqueBaixoItem[];
}

interface DashboardProps {
    onLogout: () => void;
    onNavigate?: (page: string) => void;
}

export default function Dashboard({ onLogout, onNavigate }: DashboardProps) {
    const [data, setData] = useState<DashboardData | null>(null);
    const [produtos, setProdutos] = useState<Produto[]>([]);

    useEffect(() => {
        async function load() {
        try {
            const token = localStorage.getItem("token");

            if (!token) return;

            // 🔥 MÉTRICAS
            const dashboardResponse = await api.get("/admin/dashboard", token);

            setData(dashboardResponse);

            // 🔥 PRODUTOS
            const produtosResponse = await api.get("/produtos", token);

            setProdutos(produtosResponse);

        } catch (error) {
            console.error("Erro ao carregar dashboard:", error);
        }
        }

        load();
    }, []);

    return (
        <div>
        <h1>Dashboard</h1>

        {/* 🧭 AÇÕES RÁPIDAS */}
        <div style={{ marginBottom: '20px' }}>
            {onNavigate && (
                <>
                <button
                    onClick={() => onNavigate('vendas')}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        marginRight: '10px'
                    }}
                >
                    🛒 Ir para Vendas
                </button>
                <button
                    onClick={() => onNavigate('cadastro-produtos')}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        marginRight: '10px'
                    }}
                >
                    📦 Gerenciar Estoque
                </button>
                </>
            )}
            <button onClick={onLogout}>Logout</button>
        </div>

        {/* 📊 MÉTRICAS */}
        {data && (
            <div>
            <h2>Métricas</h2>
            <p>Usuários: {data.totalUsuarios}</p>
            <p>Produtos: {data.totalProdutos}</p>
            <p>Estoque total: {data.totalEstoque}</p>
            <p>Produtos com estoque baixo: {data.produtosEstoqueBaixo.length}</p>

            {data.produtosEstoqueBaixo.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                <h3>Produtos críticos</h3>
                <ul>
                    {data.produtosEstoqueBaixo.map((produto) => (
                    <li key={produto.id}>
                        {produto.nome} — {produto.estoque} unidade{produto.estoque === 1 ? '' : 's'}
                    </li>
                    ))}
                </ul>
                </div>
            )}
            </div>
        )}

        {/* 📦 PRODUTOS */}
        <h2>Lista de Produtos</h2>
        <ul>
            {produtos.map((produto) => (
            <li key={produto.id}>
                {produto.nome} - {produto.marca}
            </li>
            ))}
        </ul>
        </div>
    );
}