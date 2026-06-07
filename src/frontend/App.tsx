import { Suspense, lazy, useEffect, useState } from 'react';
import AlertHost from './components/AlertHost';
import { ErrorBoundary } from './components/ErrorBoundary';
import Layout from './components/Layout';
import Login from './pages/Login';
import { api } from './services/api';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Diagnostico = lazy(() => import('./pages/Diagnostico'));
const Vendas = lazy(() => import('./pages/Vendas'));
const VendasConsulta = lazy(() => import('./pages/VendasConsulta'));
const VendasDevolucoesEstornos = lazy(() => import('./pages/VendasDevolucoesEstornos'));
const VendasComissoes = lazy(() => import('./pages/VendasComissoes'));
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
    'km-por-litro': 'Km por Litro',
    'manutencao-veiculo': 'Manutencao Veiculo',
    'peso-carga': 'Peso da Carga',
    log: 'Log de inteligencia',
};

const allowedPrivatePages = new Set([
    'dashboard',
    'diagnostico',
    'vendas',
    'nfce-emitir',
    'nfce-consultar',
    'nfce-cancelar',
    'nfce-historico',
    'nfce-danfe',
    'nfce-inutilizar',
    'nfce-configuracoes',
    'nfce-status',
    'fornecedores',
    'marcas',
    'cadastro-produtos',
    'cadastros',
    'clientes',
    'estoque',
    'servicos',
    'compras',
    'novos-pedidos',
    'financeiro',
    'financeiro-lancamentos',
    'financeiro-conciliacao-cartoes',
    'financeiro-contas-pagar',
    'financeiro-demonstrativo',
    'financeiro-fluxo-caixa',
    'financeiro-contas-cartoes',
    'financeiro-categorias',
    'financeiro-formas-pagamento',
    'km-por-litro',
    'manutencao-veiculo',
    'peso-carga',
    'integracoes-hub',
    'integracoes-marketplaces',
    'integracoes-gateways',
    'integracoes-bancos',
    'integracoes-webhooks',
    'usuarios-hierarquia',
    'rastreio-transporte',
    'agenda',
    'comissionamento',
    'log',
    'vendas-consulta',
    'vendas-devolucoes',
]);

const readPrivatePageFromHash = () => {
    if (typeof window === 'undefined') return '';

    const hash = window.location.hash || '';
    if (!hash || hash.startsWith('#/rastreio-publico/')) {
        return '';
    }

    const normalized = hash.startsWith('#/') ? hash.slice(2) : hash.slice(1);
    const page = normalized.split('?')[0].trim();
    if (!page || !allowedPrivatePages.has(page)) {
        return '';
    }

    return page;
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
        if (!token) return;

        const syncSession = async () => {
            try {
                const me = await api.get('/auth/me', token);
                const role = String(me?.role || localStorage.getItem('userRole') || '');
                const nome = String(me?.nome || localStorage.getItem('userName') || '');

                localStorage.setItem('userRole', role);
                if (nome) {
                    localStorage.setItem('userName', nome);
                }

                setIsLoggedIn(true);
                setUserRole(role);

                const hashPage = readPrivatePageFromHash();
                if (hashPage) {
                    setCurrentPage(hashPage);
                }
            } catch {
                localStorage.removeItem('token');
                localStorage.removeItem('userRole');
                localStorage.removeItem('userName');
                setIsLoggedIn(false);
                setUserRole('');
                setCurrentPage('dashboard');
            }
        };

        void syncSession();
    }, [publicSessaoId]);

    useEffect(() => {
        if (!isLoggedIn || publicSessaoId || typeof window === 'undefined') {
            return;
        }

        const syncPageFromHash = () => {
            const hashPage = readPrivatePageFromHash();
            if (hashPage) {
                setCurrentPage(hashPage);
            }
        };

        window.addEventListener('hashchange', syncPageFromHash);
        return () => window.removeEventListener('hashchange', syncPageFromHash);
    }, [isLoggedIn, publicSessaoId]);

    useEffect(() => {
        if (!isLoggedIn || publicSessaoId || typeof window === 'undefined') {
            return;
        }

        if ((currentPage === 'estoque' && window.location.hash.startsWith('#estoque'))
            || (currentPage === 'servicos' && window.location.hash.startsWith('#servicos'))
            || (currentPage === 'compras' && window.location.hash.startsWith('#compras'))) {
            return;
        }

        const targetHash = `#${currentPage}`;
        if (window.location.hash !== targetHash) {
            window.history.replaceState(null, '', targetHash);
        }
    }, [currentPage, isLoggedIn, publicSessaoId]);

    const handleLogin = (role?: string) => {
        setIsLoggedIn(true);
        setUserRole(role || '');
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        setIsLoggedIn(false);
        setCurrentPage('dashboard');
        setUserRole('');

        if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', '#dashboard');
        }
    };

    const handleNavigate = (page: string) => {
        setCurrentPage(page);
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
                return <Dashboard onLogout={handleLogout} onNavigate={handleNavigate} />;
            case 'diagnostico':
                return <Diagnostico />;
            case 'vendas':
                return <Vendas />;
            case 'vendas-consulta':
                return <VendasConsulta />;
            case 'vendas-devolucoes':
                return <VendasDevolucoesEstornos />;
            case 'comissionamento':
                return <VendasComissoes />;
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
                return <Fornecedores onNavigate={handleNavigate} />;
            case 'marcas':
                return <Marcas onNavigate={handleNavigate} />;
            case 'cadastro-produtos':
                return <CadastroProdutos onNavigate={handleNavigate} />;
            case 'cadastros':
                return <Cadastros />;
            case 'clientes':
                return <Clientes />;
            case 'estoque':
                return <Estoque key="estoque" />;
            case 'servicos':
                return <Estoque key="servicos" />;
            case 'compras':
                return <Estoque key="compras" />;
            case 'novos-pedidos':
                return <Estoque key="novos-pedidos" />;
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
                <AlertHost />
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
        return (
            <>
                <AlertHost />
                <Login onLogin={handleLogin} />
            </>
        );
    }

    return (
        <ErrorBoundary>
            <AlertHost />
            <Layout
                onNavigate={handleNavigate}
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
