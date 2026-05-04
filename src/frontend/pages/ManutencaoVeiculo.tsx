/**
 * ManutencaoVeiculo.tsx
 * Calculadora de manutenção preventiva do veículo.
 */
import { useState } from "react";
import { Wrench, Plus, Trash2, AlertTriangle, CheckCircle, Clock } from "lucide-react";

interface ItemManutencao {
  id: string;
  nome: string;
  kmUltimaTroca: number;
  intervaloKm: number;
  kmAtual: number;
}

const ITENS_PADRAO: Omit<ItemManutencao, "id" | "kmAtual" | "kmUltimaTroca">[] = [
  { nome: "Troca de óleo", intervaloKm: 10000 },
  { nome: "Filtro de ar", intervaloKm: 15000 },
  { nome: "Filtro de combustível", intervaloKm: 20000 },
  { nome: "Pastilhas de freio", intervaloKm: 30000 },
  { nome: "Correia dentada", intervaloKm: 60000 },
  { nome: "Rodízio de pneus", intervaloKm: 10000 },
];

const calcularStatus = (item: ItemManutencao) => {
  const kmFeitos = item.kmAtual - item.kmUltimaTroca;
  const percentual = Math.min((kmFeitos / item.intervaloKm) * 100, 100);
  const kmRestante = item.intervaloKm - kmFeitos;

  let status: "ok" | "atencao" | "vencido";
  if (kmRestante <= 0) status = "vencido";
  else if (percentual >= 80) status = "atencao";
  else status = "ok";

  return { percentual, kmRestante, kmFeitos, status };
};

const COR_STATUS = {
  ok: "#16a34a",
  atencao: "#ea580c",
  vencido: "#dc2626",
};

const BG_STATUS = {
  ok: "#f0fdf4",
  atencao: "#fff7ed",
  vencido: "#fef2f2",
};

export default function ManutencaoVeiculo() {
  const [kmAtual, setKmAtual] = useState("");
  const [itens, setItens] = useState<ItemManutencao[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [novoItem, setNovoItem] = useState({ nome: "", kmUltimaTroca: "", intervaloKm: "" });

  const aplicarKm = () => {
    const km = parseFloat(kmAtual.replace(",", "."));
    if (!km || km <= 0) { alert("Informe a km atual do veículo."); return; }
    setItens((prev) => prev.map((i) => ({ ...i, kmAtual: km })));
  };

  const adicionarPadrao = (padrao: typeof ITENS_PADRAO[0]) => {
    const km = parseFloat(kmAtual.replace(",", ".")) || 0;
    const novo: ItemManutencao = {
      id: Date.now().toString(),
      nome: padrao.nome,
      intervaloKm: padrao.intervaloKm,
      kmUltimaTroca: km > 0 ? km - Math.floor(padrao.intervaloKm / 2) : 0,
      kmAtual: km,
    };
    setItens((prev) => [...prev, novo]);
  };

  const adicionarPersonalizado = () => {
    const km = parseFloat(kmAtual.replace(",", ".")) || 0;
    const ultima = parseFloat(novoItem.kmUltimaTroca.replace(",", "."));
    const intervalo = parseFloat(novoItem.intervaloKm.replace(",", "."));

    if (!novoItem.nome.trim() || !ultima || !intervalo) {
      alert("Preencha todos os campos."); return;
    }

    const novo: ItemManutencao = {
      id: Date.now().toString(),
      nome: novoItem.nome,
      kmUltimaTroca: ultima,
      intervaloKm: intervalo,
      kmAtual: km,
    };
    setItens((prev) => [...prev, novo]);
    setNovoItem({ nome: "", kmUltimaTroca: "", intervaloKm: "" });
    setShowForm(false);
  };

  const remover = (id: string) => setItens((prev) => prev.filter((i) => i.id !== id));

  const vencidos = itens.filter((i) => calcularStatus(i).status === "vencido").length;
  const atencao = itens.filter((i) => calcularStatus(i).status === "atencao").length;

  return (
    <div style={{ padding: "30px", maxWidth: "900px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
        <div style={{ background: "#ea580c", borderRadius: "10px", padding: "10px", display: "flex" }}>
          <Wrench size={24} color="#fff" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: "22px" }}>Manutenção do Veículo</h1>
          <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>Controle preventivo de manutenções</p>
        </div>
      </div>

      {/* KM ATUAL */}
      <div style={{ background: "#fff", borderRadius: "12px", padding: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", marginBottom: "20px" }}>
        <h3 style={{ marginTop: 0, marginBottom: "14px" }}>Quilometragem atual do veículo</h3>
        <div style={{ display: "flex", gap: "12px" }}>
          <input
            type="number"
            value={kmAtual}
            onChange={(e) => setKmAtual(e.target.value)}
            placeholder="Ex: 85000"
            style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "15px" }}
          />
          <button
            onClick={aplicarKm}
            style={{ padding: "12px 20px", background: "#ea580c", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}
          >
            Atualizar km
          </button>
        </div>
      </div>

      {/* RESUMO */}
      {itens.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
          <div style={{ background: "#f0fdf4", borderRadius: "10px", padding: "16px", textAlign: "center" }}>
            <CheckCircle size={20} color="#16a34a" />
            <div style={{ fontSize: "24px", fontWeight: 800, color: "#16a34a", marginTop: "6px" }}>
              {itens.filter((i) => calcularStatus(i).status === "ok").length}
            </div>
            <div style={{ fontSize: "13px", color: "#555" }}>Em dia</div>
          </div>
          <div style={{ background: "#fff7ed", borderRadius: "10px", padding: "16px", textAlign: "center" }}>
            <Clock size={20} color="#ea580c" />
            <div style={{ fontSize: "24px", fontWeight: 800, color: "#ea580c", marginTop: "6px" }}>{atencao}</div>
            <div style={{ fontSize: "13px", color: "#555" }}>Atenção</div>
          </div>
          <div style={{ background: "#fef2f2", borderRadius: "10px", padding: "16px", textAlign: "center" }}>
            <AlertTriangle size={20} color="#dc2626" />
            <div style={{ fontSize: "24px", fontWeight: 800, color: "#dc2626", marginTop: "6px" }}>{vencidos}</div>
            <div style={{ fontSize: "13px", color: "#555" }}>Vencidos</div>
          </div>
        </div>
      )}

      {/* ATALHOS PADRÃO */}
      <div style={{ background: "#fff", borderRadius: "12px", padding: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", marginBottom: "20px" }}>
        <h3 style={{ marginTop: 0, marginBottom: "14px" }}>Adicionar manutenção padrão</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {ITENS_PADRAO.filter((p) => !itens.some((i) => i.nome === p.nome)).map((padrao) => (
            <button
              key={padrao.nome}
              onClick={() => adicionarPadrao(padrao)}
              style={{ padding: "8px 14px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "20px", cursor: "pointer", fontSize: "13px" }}
            >
              + {padrao.nome} ({padrao.intervaloKm.toLocaleString()} km)
            </button>
          ))}
        </div>

        {/* FORM PERSONALIZADO */}
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", background: showForm ? "#f1f5f9" : "#ea580c", color: showForm ? "#555" : "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}
        >
          <Plus size={16} /> {showForm ? "Cancelar" : "Item personalizado"}
        </button>

        {showForm && (
          <div style={{ marginTop: "14px", display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "10px", alignItems: "end" }}>
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "13px", fontWeight: 600 }}>Nome</label>
              <input type="text" value={novoItem.nome} onChange={(e) => setNovoItem({ ...novoItem, nome: e.target.value })} placeholder="Ex: Alinhamento" style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "13px", fontWeight: 600 }}>Km última troca</label>
              <input type="number" value={novoItem.kmUltimaTroca} onChange={(e) => setNovoItem({ ...novoItem, kmUltimaTroca: e.target.value })} placeholder="Ex: 75000" style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "13px", fontWeight: 600 }}>Intervalo (km)</label>
              <input type="number" value={novoItem.intervaloKm} onChange={(e) => setNovoItem({ ...novoItem, intervaloKm: e.target.value })} placeholder="Ex: 10000" style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd", boxSizing: "border-box" }} />
            </div>
            <button onClick={adicionarPersonalizado} style={{ padding: "10px 14px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 700 }}>
              Adicionar
            </button>
          </div>
        )}
      </div>

      {/* LISTA DE ITENS */}
      {itens.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", background: "#f8fafc", borderRadius: "12px", border: "2px dashed #e2e8f0" }}>
          <Wrench size={40} color="#94a3b8" />
          <p style={{ color: "#94a3b8", marginTop: "12px" }}>Adicione itens de manutenção acima</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {itens.map((item) => {
            const { percentual, kmRestante, status } = calcularStatus(item);
            return (
              <div key={item.id} style={{ background: BG_STATUS[status], border: `1px solid ${COR_STATUS[status]}33`, borderRadius: "12px", padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "14px" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "16px" }}>{item.nome}</div>
                    <div style={{ fontSize: "13px", color: "#666", marginTop: "4px" }}>
                      Última: {item.kmUltimaTroca.toLocaleString()} km • Intervalo: {item.intervaloKm.toLocaleString()} km
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ textAlign: "right" }}>
                      {status === "vencido" ? (
                        <div style={{ color: "#dc2626", fontWeight: 700, fontSize: "14px" }}>⚠️ Vencido há {Math.abs(kmRestante).toLocaleString()} km</div>
                      ) : (
                        <div style={{ color: COR_STATUS[status], fontWeight: 700, fontSize: "14px" }}>{kmRestante.toLocaleString()} km restantes</div>
                      )}
                    </div>
                    <button onClick={() => remover(item.id)} style={{ padding: "6px", background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {/* Barra de progresso */}
                <div style={{ background: "#e2e8f0", borderRadius: "99px", height: "8px", overflow: "hidden" }}>
                  <div style={{ width: `${percentual}%`, height: "100%", background: COR_STATUS[status], borderRadius: "99px", transition: "width 0.5s ease" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "12px", color: "#666" }}>
                  <span>0 km</span>
                  <span style={{ color: COR_STATUS[status], fontWeight: 600 }}>{percentual.toFixed(0)}%</span>
                  <span>{item.intervaloKm.toLocaleString()} km</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
