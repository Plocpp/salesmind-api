import { useEffect, useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import Layout from './components/Layout';
import CadastroProdutos from './pages/CadastroProdutos';
import Cadastros from './pages/Cadastros';
import Clientes from './pages/Clientes';
import Dashboard from './pages/Dashboard';
import Diagnostico from './pages/Diagnostico';
import Estoque from './pages/Estoque';
import Financeiro from './pages/Financeiro';
import FinanceiroCategorias from './pages/FinanceiroCategorias';
import FinanceiroConciliacaoCartoes from './pages/FinanceiroConciliacaoCartoes';
import FinanceiroContasCartoes from './pages/FinanceiroContasCartoes';
import FinanceiroContasPagar from './pages/FinanceiroContasPagar';
import FinanceiroDemonstrativo from './pages/FinanceiroDemonstrativo';
import FinanceiroFluxoCaixa from './pages/FinanceiroFluxoCaixa';
import FinanceiroFormasPagamento from './pages/FinanceiroFormasPagamento';
import FinanceiroLancamentos from './pages/FinanceiroLancamentos';
import Fornecedores from './pages/Fornecedores';
import IntegracoesHub from './pages/IntegracoesHub';
import KmPorLitro from './pages/KmPorLitro';
import Login from './pages/Login';
import ManutencaoVeiculo from './pages/ManutencaoVeiculo';
import Marcas from './pages/Marcas';
import NFCe from './pages/NFCe';
import PesoCarga from './pages/PesoCarga';
import Placeholder from './pages/Placeholder';
import Vendas from './pages/Vendas';

const placeholderPageTitles: Record<string, string> = {
    clientes: 'Clientes',
    agenda: 'Agenda',
    comissionamento: 'Comissionamento',
    'km-por-litro': 'Km por Litro',
    'manutencao-veiculo': 'Manutencao Veiculo',
    'peso-carga': 'Peso da Carga',
    log: 'Log de inteligencia',
    'vendas-consulta': 'Consulta de Vendas',
    'vendas-devolucoes': 'Devolucoes e Estornos',
};

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
        const nfcePageMap: Record<string, 'emitir' | 'consultar' | 'cancelar' | 'historico' | 'danfe' | 'inutilizar' | 'configuracoes' | 'status'> = {
            'nfce-emitir': 'emitir',
            'nfce-consultar': 'consultar',
            'nfce-cancelar': 'cancelar',
            'nfce-historico': 'historico',
            'nfce-danfe': 'danfe',
            'nfce-inutilizar': 'inutilizar',
            'nfce-configuracoes': 'configuracoes',
            'nfce-status': 'status',
        };

        switch (currentPage) {
            case 'dashboard':
                return <Dashboard onLogout={handleLogout} onNavigate={setCurrentPage} />;
            case 'diagnostico':
                return <Diagnostico />;
            case 'vendas':
                return <Vendas />;
            case 'nfce-emitir':
            case 'nfce-consultar':
            case 'nfce-cancelar':
            case 'nfce-historico':
            case 'nfce-danfe':
            case 'nfce-inutilizar':
            case 'nfce-configuracoes':
            case 'nfce-status':
                return <NFCe initialModule={nfcePageMap[currentPage] || 'emitir'} />;
            case 'fornecedores':
                return <Fornecedores onNavigate={setCurrentPage} />;
            case 'marcas':
                return <Marcas onNavigate={setCurrentPage} />;
            case 'cadastro-produtos':
                return <CadastroProdutos onNavigate={setCurrentPage} />;
            case 'cadastros':
                return <Cadastros />;
            case 'clientes':
                return <Clientes />;
            case 'estoque':
                return <Estoque />;
            case 'financeiro':
                return <Financeiro />;
            case 'financeiro-lancamentos':
                return <FinanceiroLancamentos />;
            case 'financeiro-conciliacao-cartoes':
                return <FinanceiroConciliacaoCartoes />;
            case 'financeiro-contas-pagar':
                return <FinanceiroContasPagar />;
            case 'financeiro-demonstrativo':
                return <FinanceiroDemonstrativo />;
            case 'financeiro-fluxo-caixa':
                return <FinanceiroFluxoCaixa />;
            case 'financeiro-contas-cartoes':
                return <FinanceiroContasCartoes />;
            case 'financeiro-categorias':
                return <FinanceiroCategorias />;
            case 'financeiro-formas-pagamento':
                return <FinanceiroFormasPagamento />;
            case 'km-por-litro':
                return <KmPorLitro />;
            case 'manutencao-veiculo':
                return <ManutencaoVeiculo />;
            case 'peso-carga':
                return <PesoCarga />;
            case 'integracoes-hub':
                return <IntegracoesHub initialSection="hub" />;
            case 'integracoes-marketplaces':
                return <IntegracoesHub initialSection="marketplaces" />;
            case 'integracoes-gateways':
                return <IntegracoesHub initialSection="gateways" />;
            case 'integracoes-bancos':
                return <IntegracoesHub initialSection="banks" />;
            case 'integracoes-webhooks':
                return <IntegracoesHub initialSection="webhooks" />;
            default:
                if (placeholderPageTitles[currentPage]) {
                    return <Placeholder title={placeholderPageTitles[currentPage]} />;
                }
                return <Placeholder title="Pagina nao encontrada" />;
        }
    };

    if (!isLoggedIn) {
        return <Login onLogin={handleLogin} />;
    }

    return (
        <ErrorBoundary>
            <Layout
                onNavigate={setCurrentPage}
                currentPage={currentPage}
                onLogout={handleLogout}
                userRole={userRole}
            >
                {renderPage()}
            </Layout>
        </ErrorBoundary>
    );
}

export default App;
