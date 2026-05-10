import { type ReactNode } from "react";
import {
  ArrowRight,
  Boxes,
  ClipboardList,
  Factory,
  PackagePlus,
  ShoppingCart,
  Tags,
} from "lucide-react";

interface EstoqueComprasProps {
  onNavigate: (page: string) => void;
}

interface OptionCard {
  title: string;
  description: string;
  page: string;
  icon: ReactNode;
  tone: string;
}

const options: OptionCard[] = [
  {
    title: "Produtos",
    description: "Cadastrar, editar e consultar produtos com marca, validade, codigo e preco.",
    page: "estoque-produtos",
    icon: <Boxes size={24} />,
    tone: "#0f766e",
  },
  {
    title: "Movimentacao de estoque",
    description: "Adicionar ou remover quantidades e acompanhar o balanco do estoque.",
    page: "estoque-movimentacao",
    icon: <PackagePlus size={24} />,
    tone: "#2563eb",
  },
  {
    title: "Compras",
    description: "Ver sugestoes de compra por estoque baixo, vencimento e reposicao.",
    page: "estoque-compras",
    icon: <ShoppingCart size={24} />,
    tone: "#b45309",
  },
  {
    title: "Marcas",
    description: "Gerenciar marcas e vincular cada marca ao seu fornecedor.",
    page: "marcas",
    icon: <Tags size={24} />,
    tone: "#7c3aed",
  },
  {
    title: "Fornecedores",
    description: "Cadastrar e manter dados dos fornecedores usados nas compras.",
    page: "fornecedores",
    icon: <Factory size={24} />,
    tone: "#be123c",
  },
];

export default function EstoqueCompras({ onNavigate }: EstoqueComprasProps) {
  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <div>
        <h1 style={{ margin: 0, color: "#111827", fontSize: "26px" }}>Estoque e Compras</h1>
        <p style={{ margin: "6px 0 0", color: "#6b7280", fontSize: "14px" }}>
          Acesse as areas do sistema relacionadas a produtos, estoque, compras, marcas e fornecedores.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "16px",
        }}
      >
        {options.map((option) => (
          <button
            key={option.page}
            onClick={() => onNavigate(option.page)}
            style={{
              backgroundColor: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              cursor: "pointer",
              minHeight: "150px",
              padding: "18px",
              textAlign: "left",
              display: "grid",
              alignContent: "space-between",
              gap: "18px",
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
            }}
          >
            <div style={{ display: "grid", gap: "12px" }}>
              <span
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "8px",
                  backgroundColor: `${option.tone}18`,
                  color: option.tone,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {option.icon}
              </span>
              <div>
                <h2 style={{ margin: 0, color: "#111827", fontSize: "17px" }}>{option.title}</h2>
                <p style={{ margin: "7px 0 0", color: "#6b7280", lineHeight: 1.45, fontSize: "13px" }}>
                  {option.description}
                </p>
              </div>
            </div>

            <span
              style={{
                color: option.tone,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                fontWeight: 700,
              }}
            >
              Abrir <ArrowRight size={15} />
            </span>
          </button>
        ))}
      </div>

      <div
        style={{
          backgroundColor: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "18px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          color: "#374151",
        }}
      >
        <ClipboardList size={22} color="#17a2b8" />
        <span style={{ fontSize: "14px" }}>
          As opcoes de produtos, movimentacao e compras usam a tela de gestao de produtos que ja existe no sistema.
        </span>
      </div>
    </div>
  );
}
