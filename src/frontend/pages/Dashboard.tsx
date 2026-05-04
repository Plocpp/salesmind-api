import React, { useEffect, useState } from "react";
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
    LineChart, Line 
} from 'recharts';
import { 
    Github, User, ShoppingCart, DollarSign, Percent, Star, Calendar, Clock 
} from 'lucide-react';
import { api } from "../services/api";

// 📦 Tipagem Produto e Dashboard
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

// 📊 Mock Data para Gráficos
const dataCiclo = [
  { name: 'Dez-25', ativos: 2500, atencao: 2500 },
  { name: 'Jan-26', ativos: 2400, atencao: 2600 },
  { name: 'Fev-26', ativos: 2300, atencao: 2700 },
  { name: 'Mar-26', ativos: 2200, atencao: 2800 },
  { name: 'Abr-26', ativos: 2100, atencao: 2900 },
  { name: 'Mai-26', ativos: 2000, atencao: 3000 },
];

const dataAnimaisMes = [
  { name: 'Out-25', animais: 15 },
  { name: 'Nov-25', animais: 8 },
  { name: 'Dez-25', animais: 14 },
  { name: 'Jan-26', animais: 6 },
  { name: 'Fev-26', animais: 1 },
  { name: 'Mai-26', animais: 2 },
];

const dataConsultasMes = [
  { name: 'Dez-19', consultas: 1 },
  { name: 'Jan-20', consultas: 3 },
  { name: 'Fev-20', consultas: 2 },
  { name: 'Abr-20', consultas: 1 },
  { name: 'Mai-20', consultas: 2 },
  { name: 'Ago-20', consultas: 1 },
];

const dataAnimaisAno = [
  { name: '2022', quantidade: 200 },
  { name: '2023', quantidade: 500 },
  { name: '2024', quantidade: 400 },
  { name: '2025', quantidade: 800 },
  { name: '2026', quantidade: 1000 },
];

// Componente de Card Resumo
const SummaryCard = ({ icon, value, label, bgColor, textColor = '#fff' }: any) => (
    <div style={{ backgroundColor: bgColor, color: textColor, borderRadius: '4px', padding: '15px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div>{icon}</div>
        <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{value}</div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>{label}</div>
        </div>
    </div>
);

// Componente Painel Gráfico
const ChartPanel = ({ title, children }: any) => (
    <div style={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ backgroundColor: '#3498db', color: '#fff', padding: '8px 15px', fontSize: '14px', fontWeight: 'bold', borderTopLeftRadius: '4px', borderTopRightRadius: '4px' }}>
            {title}
        </div>
        <div style={{ padding: '15px', flex: 1, minHeight: '200px' }}>
            {children}
        </div>
    </div>
);

export default function Dashboard({ onLogout, onNavigate }: DashboardProps) {
    const [data, setData] = useState<DashboardData | null>(null);
    const [produtos, setProdutos] = useState<Produto[]>([]);

    useEffect(() => {
        async function load() {
            try {
                const token = localStorage.getItem("token");
                if (!token) return;

                // API Real - Tentamos buscar, se falhar não quebra o visual
                try {
                    const dashboardResponse = await api.get("/admin/dashboard", token);
                    setData(dashboardResponse);
                } catch(e) {}
                
                try {
                    const produtosResponse = await api.get("/produtos", token);
                    setProdutos(produtosResponse);
                } catch(e) {}

            } catch (error) {
                console.error("Erro ao carregar dashboard:", error);
            }
        }
        load();
    }, []);

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
                <h1 style={{ fontSize: '24px', color: '#333', margin: 0, fontWeight: 'normal' }}>Painel de controle</h1>
            </div>

            <div style={{ display: 'flex', gap: '20px' }}>
                {/* Coluna Esquerda (Gráficos) */}
                <div style={{ flex: 3, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <ChartPanel title="Ciclo de vida dos clientes">
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={dataCiclo} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{fontSize: 10}} />
                                    <YAxis tick={{fontSize: 10}} />
                                    <Tooltip />
                                    <Legend wrapperStyle={{fontSize: 11}} />
                                    <Bar dataKey="ativos" stackId="a" fill="#2ecc71" name="Clientes ativos" />
                                    <Bar dataKey="atencao" stackId="a" fill="#f1c40f" name="Necessitam de atenção" />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartPanel>

                        <ChartPanel title="Animais por mês">
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={dataAnimaisMes} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{fontSize: 10}} />
                                    <YAxis tick={{fontSize: 10}} />
                                    <Tooltip />
                                    <Bar dataKey="animais" fill="#9b59b6" />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartPanel>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <ChartPanel title="Últimos atendimentos (24h)">
                            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                                Nenhum atendimento recente
                            </div>
                        </ChartPanel>

                        <ChartPanel title="Consultas por mês">
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={dataConsultasMes} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{fontSize: 10}} />
                                    <YAxis tick={{fontSize: 10}} />
                                    <Tooltip />
                                    <Bar dataKey="consultas" fill="#e056fd" />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartPanel>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <ChartPanel title="Últimos produtos cadastrados (Estoque Crítico)">
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px', maxHeight: '180px', overflowY: 'auto' }}>
                                {data?.produtosEstoqueBaixo?.map((prod) => (
                                    <li key={prod.id} style={{ borderBottom: '1px solid #eee', padding: '8px 0', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{prod.nome}</span>
                                        <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>{prod.estoque} un.</span>
                                    </li>
                                ))}
                                {(!data || data.produtosEstoqueBaixo.length === 0) && (
                                    <li style={{ color: '#999', textAlign: 'center', padding: '20px 0' }}>Estoque saudável</li>
                                )}
                            </ul>
                        </ChartPanel>

                        <ChartPanel title="Animais por ano">
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={dataAnimaisAno} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{fontSize: 10}} />
                                    <YAxis tick={{fontSize: 10}} />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="quantidade" stroke="#3498db" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </ChartPanel>
                    </div>

                </div>

                {/* Coluna Direita (Cards) */}
                <div style={{ flex: 1, minWidth: '250px' }}>
                    <SummaryCard icon={<Github size={28} />} value={data?.totalProdutos || "1.677"} label="Total de Produtos" bgColor="#8e44ad" />
                    <SummaryCard icon={<User size={28} />} value={data?.totalUsuarios || "10.038"} label="Responsáveis (Usuários)" bgColor="#8e44ad" />
                    
                    <SummaryCard icon={<ShoppingCart size={28} />} value={"$ 2.026"} label="Venda Liq./mês" bgColor="#3498db" />
                    
                    <SummaryCard icon={<DollarSign size={28} />} value={"$ 34 mil"} label="Débitos/clientes" bgColor="#e74c3c" />
                    
                    <SummaryCard icon={<Percent size={28} />} value={"0,0%"} label="Descontos/mês" bgColor="#f1c40f" />
                    
                    <SummaryCard icon={<Star size={28} />} value={"$ 113"} label="Ticket médio/mês" bgColor="#2980b9" />

                    <SummaryCard icon={<Calendar size={28} />} value={"00:00:00"} label="Média espera" bgColor="#2c3e50" />
                    
                    <SummaryCard icon={<Clock size={28} />} value={"00:00:00"} label="Tempo médio atend." bgColor="#2c3e50" />
                </div>
            </div>
            
            {/* Rodapé Alerta Vencimento (Fixo Inferior) */}
            <div style={{ 
                position: 'fixed', bottom: 0, left: '250px', right: 0, 
                backgroundColor: '#fff', borderTop: '2px solid #e74c3c', 
                padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
            }}>
                <span style={{ color: '#666', fontSize: '13px' }}>× Certificado digital vencido</span>
                <button style={{ backgroundColor: '#e74c3c', color: '#fff', border: 'none', padding: '6px 20px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>Atualizar certificado</button>
                <span style={{ color: '#999', fontSize: '12px' }}>Atualize para normalizar a emissão das notas fiscais. <a href="#" style={{ color: '#3498db', textDecoration: 'none' }}>Saiba mais</a></span>
            </div>
        </div>
    );
}