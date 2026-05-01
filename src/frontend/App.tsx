import React, { useEffect, useState } from 'react';
import CadastroProdutos from './pages/CadastroProdutos';
import Cadastros from './pages/Cadastros';
import Dashboard from './pages/Dashboard';
import Fornecedores from './pages/Fornecedores';
import Login from './pages/Login';
import Marcas from './pages/Marcas';
import Vendas from './pages/Vendas';

type Page = 'dashboard' | 'vendas' | 'fornecedores' | 'marcas' | 'cadastro-produtos' | 'cadastros';

const App: React.FC = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentPage, setCurrentPage] = useState<Page>('dashboard');
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
            default:
                return <Dashboard onLogout={handleLogout} onNavigate={setCurrentPage} />;
        }
    };

    if (!isLoggedIn) {
        return <Login onLogin={handleLogin} />;
    }

    return (
        <div>
            {/* 🧭 NAVEGAÇÃO */}
            <nav style={{
                backgroundColor: '#f8f9fa',
                padding: '10px',
                borderBottom: '1px solid #dee2e6',
                marginBottom: '20px'
            }}>
                <button
                    onClick={() => setCurrentPage('dashboard')}
                    style={{
                        marginRight: '10px',
                        padding: '8px 16px',
                        backgroundColor: currentPage === 'dashboard' ? '#007bff' : '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    📊 Dashboard
                </button>

                {(userRole === 'ADMIN' || userRole === 'VENDEDOR') && (
                    <button
                        onClick={() => setCurrentPage('vendas')}
                        style={{
                            marginRight: '10px',
                            padding: '8px 16px',
                            backgroundColor: currentPage === 'vendas' ? '#007bff' : '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        🛒 Vendas
                    </button>
                )}

                {userRole === 'ADMIN' && (
                    <>
                        <button
                            onClick={() => setCurrentPage('cadastros')}
                            style={{
                                marginRight: '10px',
                                padding: '8px 16px',
                                backgroundColor: currentPage === 'cadastros' ? '#007bff' : '#17a2b8',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            📋 Cadastros
                        </button>
                    </>
                )}

                <button
                    onClick={handleLogout}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    🚪 Logout
                </button>
            </nav>

            {renderPage()}
        </div>
    );
};

export default App;