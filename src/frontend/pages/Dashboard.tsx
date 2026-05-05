import {
    AlertTriangle,
    DollarSign,
    Package,
    ShoppingCart,
    User
} from "lucide-react";

import { useEffect, useState } from "react";

import {
    Bar,
    BarChart,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";

import { StatCard } from "../components/StatCard";
import { api } from "../services/api";

// Shape returned by GET /produtos/admin/dashboard
interface ProdutoDashboard {
    totalProdutos: number;
    totalUsuarios: number;
    totalEstoque: number;
    produtosEstoqueBaixo: { id: string; nome: string; estoque: number }[];
    produtosPorMarca: { marcaId: string; _count: { _all: number } }[];
}

// Shape returned by GET /vendas/dashboard
interface VendasDashboard {
    vendasHoje: number;
    totalVendas: number;
    receitaTotal: number;
    produtosMaisVendidos: { produto: string; quantidade: number }[];
}

type DashboardProps = {
    onLogout?: () => void;
    onNavigate?: (page: string) => void;
};

const CHART_COLORS = ["#7c3aed", "#2563eb", "#16a34a", "#dc2626", "#ea580c"];

export default function Dashboard({ onLogout, onNavigate }: DashboardProps) {
    const [prodData, setProdData] = useState<ProdutoDashboard | null>(null);
    const [vendData, setVendData] = useState<VendasDashboard | null>(null);
    const [loading, setLoading] = useState(true);

    const userRole = localStorage.getItem("userRole") ?? "";
    const token = localStorage.getItem("token");

    useEffect(() => {
        const fetchAll = async () => {
            try {
                if (userRole === "ADMIN") {
                    const [prod, vend] = await Promise.all([
                        api.get("/produtos/admin/dashboard", token),
                        api.get("/vendas/dashboard", token),
                    ]);
                    setProdData(prod);
                    setVendData(vend);
                } else {
                    // Non-admin: fetch only vendas dashboard (no product admin endpoint)
                    const vend = await api.get("/vendas/dashboard", token);
                    setVendData(vend);
                }
            } catch (err) {
                console.error("Erro ao carregar dashboard:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchAll();
    }, []);

    const chartData =
        vendData && vendData.produtosMaisVendidos.length > 0
            ? vendData.produtosMaisVendidos.map((p) => ({
                    name: p.produto.length > 14 ? p.produto.slice(0, 14) + "…" : p.produto,
                    valor: p.quantidade,
                }))
            : [
                    { name: "Seg", valor: 400 },
                    { name: "Ter", valor: 700 },
                    { name: "Qua", valor: 500 },
                    { name: "Qui", valor: 900 },
                    { name: "Sex", valor: 1200 },
                ];

    const chartTitle =
        vendData && vendData.produtosMaisVendidos.length > 0
            ? "Produtos Mais Vendidos"
            : "Vendas Semanais";

    return (
        <div style={{ flex: 1, background: "#f1f5f9", padding: "30px" }}>
            {/* HEADER */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h1 style={{ margin: 0 }}>Dashboard</h1>
            </div>

            {loading ? (
                <p style={{ marginTop: "20px", color: "#555" }}>Carregando dados...</p>
            ) : (
                <>
                    {/* STAT CARDS */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                            gap: "20px",
                            marginTop: "24px",
                        }}
                    >
                        <StatCard
                            icon={Package}
                            value={prodData?.totalProdutos ?? "—"}
                            label="Produtos cadastrados"
                            color="#7c3aed"
                        />

                        <StatCard
                            icon={User}
                            value={prodData?.totalUsuarios ?? "—"}
                            label="Usuários"
                            color="#2563eb"
                        />

                        <StatCard
                            icon={DollarSign}
                            value={
                                vendData?.receitaTotal !== undefined
                                    ? `R$ ${vendData.receitaTotal.toFixed(2)}`
                                    : "—"
                            }
                            label="Receita total"
                            color="#16a34a"
                        />

                        <StatCard
                            icon={ShoppingCart}
                            value={vendData?.vendasHoje ?? "—"}
                            label="Vendas hoje"
                            color="#ea580c"
                        />

                        <StatCard
                            icon={AlertTriangle}
                            value={prodData?.produtosEstoqueBaixo?.length ?? "—"}
                            label="Estoque baixo"
                            color="#dc2626"
                        />
                    </div>

                    {/* CHART */}
                    <div
                        style={{
                            marginTop: "30px",
                            background: "#fff",
                            padding: "20px",
                            borderRadius: "12px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                        }}
                    >
                        <h3 style={{ marginTop: 0 }}>{chartTitle}</h3>

                        <div style={{ height: "300px" }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                                        {chartData.map((_, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={CHART_COLORS[index % CHART_COLORS.length]}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* LOW STOCK ALERT (admin only) */}
                    {prodData && prodData.produtosEstoqueBaixo.length > 0 && (
                        <div
                            style={{
                                marginTop: "24px",
                                background: "#fff",
                                padding: "20px",
                                borderRadius: "12px",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                            }}
                        >
                            <h3 style={{ marginTop: 0, color: "#dc2626" }}>
                                ⚠️ Produtos com estoque crítico ({"<"} 5 un)
                            </h3>
                            <div style={{ display: "grid", gap: "10px" }}>
                                {prodData.produtosEstoqueBaixo.map((p) => (
                                    <div
                                        key={p.id}
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            padding: "12px 16px",
                                            borderRadius: "8px",
                                            background: "#fef2f2",
                                            border: "1px solid #fecaca",
                                        }}
                                    >
                                        <span style={{ fontWeight: 600 }}>{p.nome}</span>
                                        <span style={{ color: "#dc2626", fontWeight: 700 }}>
                                            {p.estoque} un
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
