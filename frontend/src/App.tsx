import { useEffect, useState } from "react";
import { type Page } from "../../src/frontend/types/Page";

// 🔥 IMPORTA SEUS COMPONENTES REAIS
import CadastroProdutos from "../../src/frontend/pages/CadastroProdutos";
import Dashboard from "../../src/frontend/pages/Dashboard";
import Fornecedores from "../../src/frontend/pages/Fornecedores";
import Marcas from "../../src/frontend/pages/Marcas";
import Vendas from "../../src/frontend/pages/Vendas";

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

  const handleNavigate = (page: string) => setCurrentPage(page);

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
      default:
        return (
          <Dashboard
            onLogout={handleLogout}
            onNavigate={handleNavigate}
          />
        );
    }
  };

  if (isLoggedIn === null) {
    return <div>Carregando...</div>; // ou spinner bonito depois
  }

  return (
    <div>
      <nav style={{ marginBottom: "20px" }}>
        <button onClick={() => setCurrentPage("dashboard")}>
          Dashboard
        </button>

        {(userRole === "ADMIN" || userRole === "VENDEDOR") && (
          <button onClick={() => setCurrentPage("vendas")}>
            Vendas
          </button>
        )}

        {userRole === "ADMIN" && (
          <>
            <button onClick={() => setCurrentPage("fornecedores")}>
              Fornecedores
            </button>

            <button onClick={() => setCurrentPage("marcas")}>
              Marcas
            </button>

            <button onClick={() => setCurrentPage("cadastro-produtos")}>
              Produtos
            </button>
          </>
        )}

        <button onClick={handleLogout}>Logout</button>
      </nav>

      {renderPage()}
    </div>
  );
}

export default App;