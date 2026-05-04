/**
 * PesoCarga.tsx
 * Calculadora de peso da carga do veículo.
 */
import { useState } from "react";
import { Weight, Plus, Trash2, AlertTriangle, CheckCircle } from "lucide-react";

interface ItemCarga {
  id: string;
  nome: string;
  peso: number;
  quantidade: number;
}

const UNIDADES = ["kg", "g", "t"] as const;
type Unidade = (typeof UNIDADES)[number];

const toKg = (valor: number, unidade: Unidade): number => {
  if (unidade === "g") return valor / 1000;
  if (unidade === "t") return valor * 1000;
  return valor;
};

export default function PesoCarga() {
  const [capacidadeMax, setCapacidadeMax] = useState("");
  const [itens, setItens] = useState<ItemCarga[]>([]);
  const [novoNome, setNovoNome] = useState("");
  const [novoPeso, setNovoPeso] = useState("");
  const [novaQtd, setNovaQtd] = useState("1");
  const [novaUnidade, setNovaUnidade] = useState<Unidade>("kg");

  const totalKg = itens.reduce((acc, i) => acc + i.peso * i.quantidade, 0);
  const capacidade = parseFloat(capacidadeMax.replace(",", ".")) || 0;
  const percentual = capacidade > 0 ? Math.min((totalKg / capacidade) * 100, 100) : 0;
  const excedente = totalKg - capacidade;

  const corBarra = () => {
    if (excedente > 0) return "#dc2626";
    if (percentual >= 80) return "#ea580c";
    return "#16a34a";
  };

  const adicionar = () => {
    const peso = parseFloat(novoPeso.replace(",", "."));
    const qtd = parseInt(novaQtd) || 1;

    if (!novoNome.trim() || !peso || peso <= 0) {
      alert("Informe nome e peso válidos."); return;
    }

    const novo: ItemCarga = {
      id: Date.now().toString(),
      nome: novoNome,
      peso: toKg(peso, novaUnidade),
      quantidade: qtd,
    };
    setItens((prev) => [...prev, novo]);
    setNovoNome("");
    setNovoPeso("");
    setNovaQtd("1");
  };

  const remover = (id: string) => setItens((prev) => prev.filter((i) => i.id !== id));

  const atualizarQtd = (id: string, qtd: number) => {
    if (qtd <= 0) { remover(id); return; }
    setItens((prev) => prev.map((i) => i.id === id ? { ...i, quantidade: qtd } : i));
  };

  return (
    <div style={{ padding: "30px", maxWidth: "900px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
        <div style={{ background: "#7c3aed", borderRadius: "10px", padding: "10px", display: "flex" }}>
          <Weight size={24} color="#fff" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: "22px" }}>Peso da Carga</h1>
          <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>Controle o peso total e a capacidade do veículo</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* COLUNA ESQUERDA */}
        <div>
          {/* Capacidade */}
          <div style={{ background: "#fff", borderRadius: "12px", padding: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", marginBottom: "16px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "12px" }}>Capacidade máxima do veículo</h3>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="number"
                value={capacidadeMax}
                onChange={(e) => setCapacidadeMax(e.target.value)}
                placeholder="Ex: 1500"
                style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "15px" }}
              />
              <div style={{ padding: "12px 16px", background: "#f1f5f9", borderRadius: "8px", fontWeight: 600, color: "#555" }}>kg</div>
            </div>
          </div>

          {/* Adicionar item */}
          <div style={{ background: "#fff", borderRadius: "12px", padding: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
            <h3 style={{ marginTop: 0, marginBottom: "14px" }}>Adicionar item</h3>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "13px", fontWeight: 600 }}>Nome do item</label>
              <input
                type="text"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && adicionar()}
                placeholder="Ex: Caixas de ração"
                style={{ width: "100%", padding: "11px", borderRadius: "8px", border: "1px solid #ddd", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 1fr", gap: "10px", marginBottom: "14px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "13px", fontWeight: 600 }}>Peso unitário</label>
                <input
                  type="number"
                  value={novoPeso}
                  onChange={(e) => setNovoPeso(e.target.value)}
                  placeholder="Ex: 15"
                  style={{ width: "100%", padding: "11px", borderRadius: "8px", border: "1px solid #ddd", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "13px", fontWeight: 600 }}>Unid.</label>
                <select
                  value={novaUnidade}
                  onChange={(e) => setNovaUnidade(e.target.value as Unidade)}
                  style={{ width: "100%", padding: "11px", borderRadius: "8px", border: "1px solid #ddd" }}
                >
                  {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "13px", fontWeight: 600 }}>Quantidade</label>
                <input
                  type="number"
                  value={novaQtd}
                  onChange={(e) => setNovaQtd(e.target.value)}
                  min="1"
                  style={{ width: "100%", padding: "11px", borderRadius: "8px", border: "1px solid #ddd", boxSizing: "border-box" }}
                />
              </div>
            </div>

            <button
              onClick={adicionar}
              style={{ width: "100%", padding: "13px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "15px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
            >
              <Plus size={18} /> Adicionar item
            </button>
          </div>
        </div>

        {/* COLUNA DIREITA */}
        <div>
          {/* Painel de peso */}
          <div style={{ background: "#fff", borderRadius: "12px", padding: "24px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", marginBottom: "16px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Peso total</h3>

            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div style={{ fontSize: "48px", fontWeight: 800, color: corBarra() }}>
                {totalKg >= 1000 ? `${(totalKg / 1000).toFixed(2)} t` : `${totalKg.toFixed(1)} kg`}
              </div>
              {capacidade > 0 && (
                <div style={{ fontSize: "14px", color: "#666", marginTop: "4px" }}>
                  de {capacidade >= 1000 ? `${(capacidade / 1000).toFixed(2)} t` : `${capacidade} kg`} de capacidade
                </div>
              )}
            </div>

            {capacidade > 0 && (
              <>
                <div style={{ background: "#e2e8f0", borderRadius: "99px", height: "12px", overflow: "hidden", marginBottom: "8px" }}>
                  <div style={{ width: `${percentual}%`, height: "100%", background: corBarra(), borderRadius: "99px", transition: "width 0.4s ease" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#666", marginBottom: "16px" }}>
                  <span>0 kg</span>
                  <span style={{ color: corBarra(), fontWeight: 700 }}>{percentual.toFixed(1)}%</span>
                  <span>{capacidade} kg</span>
                </div>

                <div style={{
                  padding: "14px 16px",
                  borderRadius: "10px",
                  background: excedente > 0 ? "#fef2f2" : "#f0fdf4",
                  border: `1px solid ${excedente > 0 ? "#fecaca" : "#bbf7d0"}`,
                  display: "flex",
                  alignItems: "center",
                  gap: "10px"
                }}>
                  {excedente > 0
                    ? <AlertTriangle size={20} color="#dc2626" />
                    : <CheckCircle size={20} color="#16a34a" />}
                  <div>
                    {excedente > 0 ? (
                      <span style={{ color: "#dc2626", fontWeight: 700 }}>
                        Excedente: {excedente.toFixed(1)} kg acima da capacidade!
                      </span>
                    ) : (
                      <span style={{ color: "#16a34a", fontWeight: 700 }}>
                        Dentro do limite — {(capacidade - totalKg).toFixed(1)} kg disponíveis
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Lista de itens */}
          {itens.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px", background: "#f8fafc", borderRadius: "12px", border: "2px dashed #e2e8f0" }}>
              <Weight size={36} color="#94a3b8" />
              <p style={{ color: "#94a3b8", marginTop: "10px" }}>Nenhum item adicionado</p>
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: "12px", padding: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
              <h4 style={{ marginTop: 0, marginBottom: "14px" }}>Itens ({itens.length})</h4>
              <div style={{ display: "grid", gap: "10px" }}>
                {itens.map((item) => (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px", background: "#f8fafc", borderRadius: "8px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: "14px" }}>{item.nome}</div>
                      <div style={{ fontSize: "12px", color: "#666" }}>{item.peso.toFixed(2)} kg/un</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <button onClick={() => atualizarQtd(item.id, item.quantidade - 1)} style={{ width: "28px", height: "28px", borderRadius: "6px", border: "1px solid #ddd", cursor: "pointer", background: "#fff", fontWeight: 700 }}>−</button>
                      <span style={{ minWidth: "24px", textAlign: "center", fontWeight: 700 }}>{item.quantidade}</span>
                      <button onClick={() => atualizarQtd(item.id, item.quantidade + 1)} style={{ width: "28px", height: "28px", borderRadius: "6px", border: "1px solid #ddd", cursor: "pointer", background: "#fff", fontWeight: 700 }}>+</button>
                    </div>
                    <div style={{ minWidth: "70px", textAlign: "right", fontWeight: 700, color: "#7c3aed", fontSize: "14px" }}>
                      {(item.peso * item.quantidade).toFixed(1)} kg
                    </div>
                    <button onClick={() => remover(item.id)} style={{ padding: "6px", background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "14px", padding: "12px 16px", background: "#f0f9ff", borderRadius: "8px", display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                <span>Total</span>
                <span style={{ color: "#7c3aed" }}>{totalKg.toFixed(2)} kg</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
