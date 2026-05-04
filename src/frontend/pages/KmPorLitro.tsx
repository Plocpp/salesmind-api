/**
 * KmPorLitro.tsx
 * Calculadora de eficiência de combustível.
 */
import { useState } from "react";
import { Fuel, TrendingUp, DollarSign, RotateCcw } from "lucide-react";

interface Calculo {
  distancia: number;
  litros: number;
  preco: number;
  kmPorLitro: number;
  custoPorKm: number;
  custoTotal: number;
  data: string;
}

export default function KmPorLitro() {
  const [distancia, setDistancia] = useState("");
  const [litros, setLitros] = useState("");
  const [precoPorLitro, setPrecoPorLitro] = useState("");
  const [resultado, setResultado] = useState<Calculo | null>(null);
  const [historico, setHistorico] = useState<Calculo[]>([]);

  const calcular = () => {
    const d = parseFloat(distancia.replace(",", "."));
    const l = parseFloat(litros.replace(",", "."));
    const p = parseFloat(precoPorLitro.replace(",", ".")) || 0;

    if (!d || !l || d <= 0 || l <= 0) {
      alert("Informe distância e litros válidos.");
      return;
    }

    const kmPorLitro = d / l;
    const custoPorKm = p > 0 ? p / kmPorLitro : 0;
    const custoTotal = p > 0 ? l * p : 0;

    const calc: Calculo = {
      distancia: d,
      litros: l,
      preco: p,
      kmPorLitro,
      custoPorKm,
      custoTotal,
      data: new Date().toLocaleString("pt-BR"),
    };

    setResultado(calc);
    setHistorico((prev) => [calc, ...prev.slice(0, 4)]);
  };

  const limpar = () => {
    setDistancia("");
    setLitros("");
    setPrecoPorLitro("");
    setResultado(null);
  };

  const eficienciaLabel = (kml: number) => {
    if (kml >= 15) return { texto: "Excelente", cor: "#16a34a" };
    if (kml >= 10) return { texto: "Bom", cor: "#2563eb" };
    if (kml >= 7) return { texto: "Regular", cor: "#ea580c" };
    return { texto: "Baixo", cor: "#dc2626" };
  };

  return (
    <div style={{ padding: "30px", maxWidth: "900px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
        <div style={{ background: "#2563eb", borderRadius: "10px", padding: "10px", display: "flex" }}>
          <Fuel size={24} color="#fff" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: "22px" }}>Km por Litro</h1>
          <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>Calcule a eficiência de combustível do veículo</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* FORMULÁRIO */}
        <div style={{ background: "#fff", borderRadius: "12px", padding: "24px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
          <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#333" }}>Dados do abastecimento</h3>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "14px", color: "#444" }}>
              Distância percorrida (km) *
            </label>
            <input
              type="number"
              value={distancia}
              onChange={(e) => setDistancia(e.target.value)}
              placeholder="Ex: 350"
              style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "15px", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "14px", color: "#444" }}>
              Litros abastecidos *
            </label>
            <input
              type="number"
              value={litros}
              onChange={(e) => setLitros(e.target.value)}
              placeholder="Ex: 30"
              style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "15px", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "14px", color: "#444" }}>
              Preço por litro (R$) <span style={{ color: "#999", fontWeight: 400 }}>opcional</span>
            </label>
            <input
              type="number"
              value={precoPorLitro}
              onChange={(e) => setPrecoPorLitro(e.target.value)}
              placeholder="Ex: 5.89"
              style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "15px", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={calcular}
              style={{ flex: 1, padding: "13px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "15px", cursor: "pointer" }}
            >
              Calcular
            </button>
            <button
              onClick={limpar}
              style={{ padding: "13px 16px", background: "#f1f5f9", color: "#555", border: "none", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center" }}
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        {/* RESULTADO */}
        <div>
          {resultado ? (
            <div style={{ background: "#fff", borderRadius: "12px", padding: "24px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
              <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#333" }}>Resultado</h3>

              {/* KM/L principal */}
              <div style={{ textAlign: "center", padding: "20px", background: "#f0f9ff", borderRadius: "10px", marginBottom: "16px" }}>
                <div style={{ fontSize: "48px", fontWeight: 800, color: eficienciaLabel(resultado.kmPorLitro).cor }}>
                  {resultado.kmPorLitro.toFixed(2)}
                </div>
                <div style={{ fontSize: "18px", color: "#555" }}>km/L</div>
                <div style={{ marginTop: "8px", padding: "4px 12px", borderRadius: "20px", display: "inline-block", background: eficienciaLabel(resultado.kmPorLitro).cor, color: "#fff", fontSize: "13px", fontWeight: 600 }}>
                  {eficienciaLabel(resultado.kmPorLitro).texto}
                </div>
              </div>

              <div style={{ display: "grid", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "#f8fafc", borderRadius: "8px" }}>
                  <span style={{ color: "#666", display: "flex", alignItems: "center", gap: "8px" }}>
                    <TrendingUp size={16} /> Distância
                  </span>
                  <strong>{resultado.distancia.toFixed(1)} km</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "#f8fafc", borderRadius: "8px" }}>
                  <span style={{ color: "#666", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Fuel size={16} /> Litros
                  </span>
                  <strong>{resultado.litros.toFixed(2)} L</strong>
                </div>
                {resultado.preco > 0 && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "#f8fafc", borderRadius: "8px" }}>
                      <span style={{ color: "#666", display: "flex", alignItems: "center", gap: "8px" }}>
                        <DollarSign size={16} /> Custo por km
                      </span>
                      <strong>R$ {resultado.custoPorKm.toFixed(3)}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "#fef9c3", borderRadius: "8px", border: "1px solid #fde047" }}>
                      <span style={{ color: "#666", display: "flex", alignItems: "center", gap: "8px" }}>
                        <DollarSign size={16} /> Gasto total
                      </span>
                      <strong style={{ color: "#854d0e" }}>R$ {resultado.custoTotal.toFixed(2)}</strong>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "40px", textAlign: "center", border: "2px dashed #e2e8f0" }}>
              <Fuel size={40} color="#94a3b8" />
              <p style={{ color: "#94a3b8", marginTop: "12px" }}>Preencha os dados e clique em Calcular</p>
            </div>
          )}

          {/* HISTÓRICO */}
          {historico.length > 0 && (
            <div style={{ marginTop: "16px", background: "#fff", borderRadius: "12px", padding: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
              <h4 style={{ marginTop: 0, marginBottom: "12px", color: "#333" }}>Histórico recente</h4>
              {historico.map((h, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < historico.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                  <span style={{ fontSize: "13px", color: "#666" }}>{h.data}</span>
                  <span style={{ fontWeight: 700, color: eficienciaLabel(h.kmPorLitro).cor }}>{h.kmPorLitro.toFixed(2)} km/L</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
