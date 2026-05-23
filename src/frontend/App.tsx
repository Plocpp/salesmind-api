import { Suspense, lazy, useEffect, useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import Layout from './components/Layout';
import Login from './pages/Login';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Diagnostico = lazy(() => import('./pages/Diagnostico'));
const Vendas = lazy(() => import('./pages/Vendas'));
const NFCe = lazy(() => import('./pages/NFCe'));
const Fornecedores = lazy(() => import('./pages/Fornecedores'));
const Marcas = lazy(() => import('./pages/Marcas'));
const CadastroProdutos = lazy(() => import('./pages/CadastroProdutos'));
const Cadastros = lazy(() => import('./pages/Cadastros'));
const Clientes = lazy(() => import('./pages/Clientes'));
const Estoque = lazy(() => import('./pages/Estoque'));
const Financeiro = lazy(() => import('./pages/Financeiro'));
const FinanceiroLancamentos = lazy(() => import('./pages/FinanceiroLancamentos'));
const FinanceiroConciliacaoCartoes = lazy(() => import('./pages/FinanceiroConciliacaoCartoes'));
const FinanceiroContasPagar = lazy(() => import('./pages/FinanceiroContasPagar'));
const FinanceiroDemonstrativo = lazy(() => import('./pages/FinanceiroDemonstrativo'));
const FinanceiroFluxoCaixa = lazy(() => import('./pages/FinanceiroFluxoCaixa'));
const FinanceiroContasCartoes = lazy(() => import('./pages/FinanceiroContasCartoes'));
const FinanceiroCategorias = lazy(() => import('./pages/FinanceiroCategorias'));
const FinanceiroFormasPagamento = lazy(() => import('./pages/FinanceiroFormasPagamento'));
const KmPorLitro = lazy(() => import('./pages/KmPorLitro'));
const ManutencaoVeiculo = lazy(() => import('./pages/ManutencaoVeiculo'));
const PesoCarga = lazy(() => import('./pages/PesoCarga'));
const IntegracoesHub = lazy(() => import('./pages/IntegracoesHub'));
const UsuariosHierarquia = lazy(() => import('./pages/UsuariosHierarquia'));
const RastreioTransporte = lazy(() => import('./pages/RastreioTransporte'));
const RastreioPublico = lazy(() => import('./pages/RastreioPublico'));
const Placeholder = lazy(() => import('./pages/Placeholder'));

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
    const [publicSessaoId, setPublicSessaoId] = useState('');

    const readPublicRoute = () => {
        if (typeof window === 'undefined') return '';
        const match = window.location.hash.match(/^#\/rastreio-publico\/([^/?#]+)/i);
        return match ? decodeURIComponent(match[1]) : '';
    };

    useEffect(() => {
        const syncPublicRoute = () => setPublicSessaoId(readPublicRoute());
        syncPublicRoute();

        if (typeof window !== 'undefined') {
            window.addEventListener('hashchange', syncPublicRoute);
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('hashchange', syncPublicRoute);
            }
        };
    }, []);

    useEffect(() => {
        if (publicSessaoId) return;

        const token = localStorage.getItem('token');
        const role = localStorage.getItem('userRole');
        if (token) {
            setIsLoggedIn(true);
            setUserRole(role || '');
        }
    }, [publicSessaoId]);

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
            case 'usuarios-hierarquia':
                return <UsuariosHierarquia />;
            case 'rastreio-transporte':
                if (userRole !== 'ADMIN') {
                    return <Placeholder title="Acesso restrito" />;
                }
                return <RastreioTransporte />;
            default:
                if (placeholderPageTitles[currentPage]) {
                    return <Placeholder title={placeholderPageTitles[currentPage]} />;
                }
                return <Placeholder title="Pagina nao encontrada" />;
        }
    };

    if (publicSessaoId) {
        return (
            <ErrorBoundary>
                <Suspense
                    fallback={
                        <div style={{ padding: 24, color: '#334155' }}>
                            Carregando rastreio...
                        </div>
                    }
                >
                    <RastreioPublico sessaoId={publicSessaoId} />
                </Suspense>
            </ErrorBoundary>
        );
    }

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
                <Suspense
                    fallback={
                        <div style={{ padding: 24, color: '#334155' }}>
                            Carregando modulo...
                        </div>
                    }
                >
                    {renderPage()}
                </Suspense>
            </Layout>
        </ErrorBoundary>
    );
}

export default App;
