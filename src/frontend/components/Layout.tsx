import { type ReactNode, useMemo, useState } from "react";
import {
  Bed,
  Box,
  Calendar,
  ChevronDown,
  ChevronRight,
  Database,
  DollarSign,
  Gauge,
  HelpCircle,
  Home,
  Lightbulb,
  Percent,
  ShoppingCart,
  Stethoscope,
  Users,
} from "lucide-react";
import { type Page } from "../types/Page";

interface LayoutProps {
  children: ReactNode;
  onNavigate: (page: Page) => void;
  currentPage: Page;
  onLogout: () => void;
  userRole: string;
}

interface MenuItem {
  id: Page;
  label: string;
  icon?: ReactNode;
}

interface MenuGroup {
  id: string;
  label: string;
  icon: ReactNode;
  items: MenuItem[];
}

const groups: MenuGroup[] = [
  {
    id: "operacao",
    label: "Operacao",
    icon: <Home size={18} />,
    items: [
      { id: "dashboard", label: "Painel de controle" },
      { id: "atendimento", label: "Atendimento clinico", icon: <Stethoscope size={16} /> },
      { id: "clientes", label: "Clientes", icon: <Users size={16} /> },
      { id: "agenda", label: "Agenda", icon: <Calendar size={16} /> },
      { id: "vendas", label: "Vendas", icon: <ShoppingCart size={16} /> },
      { id: "comissionamento", label: "Comissionamento", icon: <Percent size={16} /> },
    ],
  },
  {
    id: "cadastros",
    label: "Cadastros",
    icon: <Database size={18} />,
    items: [
      { id: "cadastros", label: "Todos os cadastros" },
      { id: "cadastro-produtos", label: "Produtos" },
      { id: "marcas", label: "Marcas" },
      { id: "fornecedores", label: "Fornecedores" },
      { id: "clientes", label: "Clientes" },
    ],
  },
  {
    id: "estoque",
    label: "Estoque e Compras",
    icon: <Box size={18} />,
    items: [
      { id: "estoque", label: "Visao geral" },
      { id: "estoque-produtos", label: "Produtos" },
      { id: "estoque-movimentacao", label: "Movimentacao" },
      { id: "estoque-compras", label: "Compras" },
      { id: "fornecedores", label: "Fornecedores" },
    ],
  },
  {
    id: "clinica",
    label: "Clinica",
    icon: <Stethoscope size={18} />,
    items: [
      { id: "atendimento", label: "Atendimento" },
      { id: "agenda", label: "Agenda" },
      { id: "internacao", label: "Internacao", icon: <Bed size={16} /> },
    ],
  },
  {
    id: "financeiro",
    label: "Financeiro",
    icon: <DollarSign size={18} />,
    items: [
      { id: "financeiro", label: "Financeiro" },
      { id: "comissionamento", label: "Comissionamento" },
      { id: "vendas", label: "Vendas" },
    ],
  },
  {
    id: "inteligencia",
    label: "Inteligencia",
    icon: <Lightbulb size={18} />,
    items: [
      { id: "km-por-litro", label: "Km por litro", icon: <Gauge size={16} /> },
      { id: "manutencao-veiculo", label: "Manutencao veiculo" },
      { id: "peso-carga", label: "Peso da carga" },
      { id: "log", label: "Log" },
    ],
  },
];

const itemStyle = (active: boolean) => ({
  alignItems: "center",
  backgroundColor: active ? "#e6f7fa" : "transparent",
  border: "none",
  borderLeft: active ? "3px solid #17a2b8" : "3px solid transparent",
  color: active ? "#0f6170" : "#4b5563",
  cursor: "pointer",
  display: "flex",
  fontSize: "13px",
  gap: "10px",
  padding: "9px 18px 9px 42px",
  textAlign: "left" as const,
  width: "100%",
});

export default function Layout({ children, onNavigate, currentPage, onLogout, userRole }: LayoutProps) {
  const initialOpen = useMemo(() => {
    return groups.reduce<Record<string, boolean>>((acc, group) => {
      acc[group.id] = group.items.some((item) => item.id === currentPage);
      return acc;
    }, {});
  }, []);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    operacao: true,
    ...initialOpen,
  });

  const toggleGroup = (id: string) => {
    setOpenGroups((current) => ({ ...current, [id]: !current[id] }));
  };

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", backgroundColor: "#f3f4f6", fontFamily: "Inter, Arial, sans-serif" }}>
      <aside style={{ width: "272px", backgroundColor: "#fff", borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px", borderBottom: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#17a2b8" }}>SalesMind</div>
          <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>Pet Shop System</div>
        </div>

        <nav style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}>
          {groups.map((group) => {
            const isOpen = openGroups[group.id];
            const hasActiveItem = group.items.some((item) => item.id === currentPage);

            return (
              <div key={group.id}>
                <button
                  onClick={() => toggleGroup(group.id)}
                  style={{
                    alignItems: "center",
                    backgroundColor: hasActiveItem ? "#f8fafc" : "transparent",
                    border: "none",
                    color: hasActiveItem ? "#111827" : "#374151",
                    cursor: "pointer",
                    display: "flex",
                    fontSize: "14px",
                    fontWeight: 700,
                    gap: "12px",
                    padding: "11px 18px",
                    textAlign: "left",
                    width: "100%",
                  }}
                >
                  {group.icon}
                  <span style={{ flex: 1 }}>{group.label}</span>
                  {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                {isOpen && (
                  <div style={{ padding: "2px 0 6px" }}>
                    {group.items.map((item) => {
                      const active = currentPage === item.id;
                      return (
                        <button key={`${group.id}-${item.id}`} onClick={() => onNavigate(item.id)} style={itemStyle(active)}>
                          {item.icon}
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ height: "54px", backgroundColor: "#fff", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 20px" }}>
          <button style={{ display: "flex", alignItems: "center", border: "1px solid #d1d5db", backgroundColor: "#fff", color: "#374151", borderRadius: "16px", padding: "5px 12px", fontSize: "12px", cursor: "pointer", marginRight: "12px" }}>
            <HelpCircle size={14} style={{ marginRight: "6px" }} /> Ajuda
          </button>

          <div style={{ display: "flex", alignItems: "center", marginRight: "18px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "#17a2b8", marginRight: "8px", display: "grid", placeItems: "center", color: "#fff", fontSize: "12px", fontWeight: 800 }}>
              {(localStorage.getItem("userName") || userRole || "U").charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: "13px", color: "#4b5563" }}>
              {localStorage.getItem("userName") || userRole || "Usuario"}
            </span>
          </div>

          <button onClick={onLogout} style={{ border: "none", backgroundColor: "transparent", color: "#dc2626", fontSize: "13px", cursor: "pointer", fontWeight: 700 }}>
            Sair
          </button>
        </header>

        <div style={{ flex: 1, overflowY: "auto", padding: "22px" }}>{children}</div>
      </main>
    </div>
  );
}
