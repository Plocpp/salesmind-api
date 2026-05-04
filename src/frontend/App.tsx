import { useEffect, useState } from 'react';
import Layout from './components/Layout';
import CadastroProdutos from './pages/CadastroProdutos';
import Cadastros from './pages/Cadastros';
import Dashboard from './pages/Dashboard';
import Fornecedores from './pages/Fornecedores';
import KmPorLitro from './pages/KmPorLitro';
import Login from './pages/Login';
import ManutencaoVeiculo from './pages/ManutencaoVeiculo';
import Marcas from './pages/Marcas';
import PesoCarga from './pages/PesoCarga';
import Placeholder from './pages/Placeholder';
import Vendas from './pages/Vendas';




function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentPage, setCurrentPage] = useState<string>('dashboard');
    const [userRole, setUserRole] = useState<string>('');

    useEffect(() => {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('userRole');
        if (token) {
            setIsLoggedIn(true);
            setUserRole(role || '');
        }
    }, []);

    const handleLogin = (role?: string) => {
        setIsLoggedIn(true);
        setUserRole(role || '');
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        setIsLoggedIn(false);
        setCurrentPage('dashboard');
        setUserRole('');
    };

    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard':
                return <Dashboard onLogout={handleLogout} onNavigate={setCurrentPage} />;
            case 'vendas':
                return <Vendas />;
            case 'fornecedores':
                return <Fornecedores onNavigate={setCurrentPage} />;
            case 'marcas':
                return <Marcas onNavigate={setCurrentPage} />;
            case 'cadastro-produtos':
                return <CadastroProdutos onNavigate={setCurrentPage} />;
            case 'cadastros':
                return <Cadastros />;
            case 'atendimento':
                return <Placeholder title="Atendimento clínico" />;
            case 'clientes':
                return <Placeholder title="Clientes" />;
            case 'agenda':
                return <Placeholder title="Agenda" />;
            case 'comissionamento':
                return <Placeholder title="Comissionamento" />;
            case 'km-por-litro':
                return <KmPorLitro />;
            case 'manutencao-veiculo':
                return <ManutencaoVeiculo />;
            case 'peso-carga':
                return <PesoCarga />;
            case 'log':
                return <Placeholder title="Log (Inteligência)" />;
            case 'internacao':
                return <Placeholder title="Internação" />;
            case 'estoque':
                return <Placeholder title="Estoque e serviços" />;
            case 'financeiro':
                return <Placeholder title="Financeiro" />;
            default:
                return <Placeholder title="Página não encontrada" />;
        }
    };

    if (!isLoggedIn) {
        return <Login onLogin={handleLogin} />;
    }

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
