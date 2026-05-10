import { type ReactNode } from "react";

interface PlaceholderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export default function Placeholder({ title, description, actions }: PlaceholderProps) {
  return (
    <div style={{ display: "grid", gap: "16px" }}>
      <div>
        <h1 style={{ margin: 0, color: "#111827", fontSize: "26px" }}>{title}</h1>
        <p style={{ margin: "6px 0 0", color: "#6b7280", fontSize: "14px" }}>
          {description ?? "Modulo ativo no menu. A tela operacional pode ser evoluida a partir deste ponto."}
        </p>
      </div>

      <div
        style={{
          backgroundColor: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "18px",
          color: "#374151",
        }}
      >
        <strong>Status:</strong> area liberada e pronta para receber os proximos fluxos do sistema.
      </div>

      {actions}
    </div>
  );
}
