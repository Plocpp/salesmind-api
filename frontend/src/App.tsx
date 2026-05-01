import { useEffect, useState } from "react";
import { Page } from "./types/Page";

// 🔥 IMPORTA SEUS COMPONENTES REAIS
import CadastroProdutos from "./pages/CadastroProdutos";
import Dashboard from "./pages/Dashboard";
import Fornecedores from "./pages/Fornecedores";
import Login from "./pages/Login";
import Marcas from "./pages/Marcas";
import Vendas from "./pages/Vendas";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("userRole");

    if (token) {
      setIsLoggedIn(true);
      setUserRole(role || "");
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

  const renderPage = () => {
    switch (currentPage) {
      case "vendas":
        return <Vendas />;
      case "fornecedores":
        return <Fornecedores onNavigate={setCurrentPage} />;
      case "marcas":
        return <Marcas onNavigate={setCurrentPage} />;
      case "cadastro-produtos":
        return <CadastroProdutos onNavigate={setCurrentPage} />;
      default:
        return (
          <Dashboard
            onLogout={handleLogout}
            onNavigate={setCurrentPage}
          />
        );
    }
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
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