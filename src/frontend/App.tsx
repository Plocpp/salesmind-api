import { useEffect, useState } from "react";
import { type Page } from "./types/Page";

// Componentes de Layout e Login
import Layout from "./components/Layout";
import Login from "./pages/Login";

// Páginas
import CadastroProdutos from "./pages/CadastroProdutos";
import Cadastros from "./pages/Cadastros";
import Clientes from "./pages/Clientes";
import Dashboard from "./pages/Dashboard";
import EstoqueCompras from "./pages/EstoqueCompras";
import Financeiro from "./pages/Financeiro";
import Fornecedores from "./pages/Fornecedores";
import KmPorLitro from "./pages/KmPorLitro";
import ManutencaoVeiculo from "./pages/ManutencaoVeiculo";
import Marcas from "./pages/Marcas";
import PesoCarga from "./pages/PesoCarga";
import Placeholder from "./pages/Placeholder";
import Vendas from "./pages/Vendas";

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
    const [currentPage, setCurrentPage] = useState<Page>("dashboard");
    const [userRole, setUserRole] = useState<string>("");

    useEffect(() => {
        const token = localStorage.getItem("token");
        const role = localStorage.getItem("userRole");

        if (token) {
        setIsLoggedIn(true);
        setUserRole(role || "");
        } else {
        setIsLoggedIn(false);
        }
    }, []);

    const handleLogin = (role?: string) => {
        setIsLoggedIn(true);
        setUserRole(role || "");
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("userRole");
        setIsLoggedIn(false);
        setCurrentPage("dashboard");
        setUserRole("");
    };

    const handleNavigate = (page: string) => {
        setCurrentPage(page as Page);
    };

    const renderPage = () => {
        switch (currentPage) {
        case "vendas":
            return <Vendas />;
        case "fornecedores":
            return <Fornecedores onNavigate={handleNavigate} />;
        case "marcas":
            return <Marcas onNavigate={handleNavigate} />;
        case "cadastro-produtos":
            return <CadastroProdutos onNavigate={handleNavigate} />;
        case "cadastros":
            return <Cadastros onNavigate={handleNavigate} />;
        case "estoque":
            return <EstoqueCompras onNavigate={handleNavigate} />;
        case "estoque-produtos":
            return <CadastroProdutos onNavigate={handleNavigate} initialTab="produtos" />;
        case "estoque-movimentacao":
            return <CadastroProdutos onNavigate={handleNavigate} initialTab="movimentacao" />;
        case "estoque-compras":
            return <CadastroProdutos onNavigate={handleNavigate} initialTab="compras" />;
        case "clientes":
            return <Clientes />;
        case "km-por-litro":
            return <KmPorLitro />;
        case "manutencao-veiculo":
            return <ManutencaoVeiculo />;
        case "peso-carga":
            return <PesoCarga />;
        case "atendimento":
            return <Placeholder title="Atendimento clinico" description="Fluxo de atendimento ativo para evoluir consultas, historico e servicos clinicos." />;
        case "agenda":
            return <Placeholder title="Agenda" description="Area ativa para organizar compromissos, retornos, banho e tosa, consultas e lembretes." />;
        case "comissionamento":
            return <Placeholder title="Comissionamento" description="Area ativa para acompanhar comissoes por vendedor, periodo e venda." />;
        case "internacao":
            return <Placeholder title="Internacao" description="Area ativa para controle de internacoes, leitos, status e responsaveis." />;
        case "financeiro":
            return <Financeiro />;
        case "log":
            return <Placeholder title="Log" description="Area ativa para auditoria e acompanhamento de eventos importantes do sistema." />;
        default:
            return (
            <Dashboard
                onLogout={handleLogout}
                onNavigate={handleNavigate}
            />
            );
        }
    };

    // 1. Enquanto verifica o token, exibe carregando
    if (isLoggedIn === null) {
        return <div>Carregando...</div>;
    }

    // 2. Se não estiver logado, exibe a página de Login
    if (!isLoggedIn) {
        return <Login onLogin={handleLogin} />;
    }

    // 3. Se logado, utiliza a prototipagem com o componente Layout
    return (
        <Layout
        onNavigate={setCurrentPage}
        currentPage={currentPage}
        onLogout={handleLogout}
        userRole={userRole}
        >
        {renderPage()}
        </Layout>
    );
}

export default App;
