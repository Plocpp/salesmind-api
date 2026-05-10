import { useEffect, useMemo, useState } from "react";
import { Building2, FileInput, FileOutput, Link2, ReceiptText, Save, Settings2 } from "lucide-react";
import { api } from "../services/api";

type Tab = "painel" | "integracoes" | "entrada" | "emissao" | "tributos";
type NotaTipo = "ENTRADA" | "SAIDA";

interface Produto {
  id: string;
  nome: string;
  codigo?: string | null;
  preco: number;
  precoCusto?: number | null;
  estoque: number;
  ncm?: string | null;
  cest?: string | null;
  cfop?: string | null;
  origem?: string | null;
  cstIcms?: string | null;
  csosn?: string | null;
  aliquotaIcms?: number | null;
  aliquotaPis?: number | null;
  aliquotaCofins?: number | null;
  aliquotaIpi?: number | null;
}

interface NotaItemForm {
  produtoId: string;
  descricao: string;
  quantidade: string;
  valorUnitario: string;
  ncm: string;
  cfop: string;
  cstIcms: string;
  csosn: string;
  aliquotaIcms: string;
  aliquotaPis: string;
  aliquotaCofins: string;
  aliquotaIpi: string;
}

interface NotaForm {
  tipo: NotaTipo;
  modelo: "NFE" | "NFCE" | "NFSE";
  numero: string;
  serie: string;
  emissorNome: string;
  emissorDocumento: string;
  destinatarioNome: string;
  destinatarioDocumento: string;
  integrationProvider: string;
  observacoes: string;
  itens: NotaItemForm[];
}

const emptyItem: NotaItemForm = {
  produtoId: "",
  descricao: "",
  quantidade: "1",
  valorUnitario: "0",
  ncm: "",
  cfop: "",
  cstIcms: "",
  csosn: "",
  aliquotaIcms: "0",
  aliquotaPis: "0",
  aliquotaCofins: "0",
  aliquotaIpi: "0",
};

const emptyNota = (tipo: NotaTipo): NotaForm => ({
  tipo,
  modelo: tipo === "SAIDA" ? "NFE" : "NFE",
  numero: "",
  serie: "1",
  emissorNome: "",
  emissorDocumento: "",
  destinatarioNome: "",
  destinatarioDocumento: "",
  integrationProvider: "",
  observacoes: "",
  itens: [{ ...emptyItem }],
});

const fieldStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  boxSizing: "border-box" as const,
};

const labelStyle = { display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "5px" };

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function toNumber(value: string) {
  return Number(value.replace(",", ".")) || 0;
}

function calcItem(item: NotaItemForm) {
  const valorProduto = toNumber(item.quantidade) * toNumber(item.valorUnitario);
  const tributos =
    valorProduto * ((toNumber(item.aliquotaIcms) + toNumber(item.aliquotaPis) + toNumber(item.aliquotaCofins) + toNumber(item.aliquotaIpi)) / 100);
  return { valorProduto, tributos, total: valorProduto + tributos };
}

export default function Financeiro() {
  const [tab, setTab] = useState<Tab>("painel");
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [resumo, setResumo] = useState<any>(null);
  const [integracao, setIntegracao] = useState({ provider: "Bling", ambiente: "HOMOLOGACAO", status: "NAO_CONFIGURADO", baseUrl: "", clientId: "", observacoes: "" });
  const [empresa, setEmpresa] = useState({ razaoSocial: "", nomeFantasia: "", cnpj: "", inscricaoEstadual: "", inscricaoMunicipal: "", crt: "", regimeTributario: "", uf: "", municipio: "", ambiente: "HOMOLOGACAO", certificadoStatus: "NAO_CONFIGURADO", serieNfe: "1", serieNfce: "1" });
  const [notaEntrada, setNotaEntrada] = useState<NotaForm>(emptyNota("ENTRADA"));
  const [notaSaida, setNotaSaida] = useState<NotaForm>(emptyNota("SAIDA"));
  const [selectedProdutoId, setSelectedProdutoId] = useState("");
  const [tributacao, setTributacao] = useState({ ncm: "", cest: "", cfop: "", origem: "0", cstIcms: "", csosn: "", aliquotaIcms: "0", aliquotaPis: "0", aliquotaCofins: "0", aliquotaIpi: "0" });
  const [message, setMessage] = useState("");

  const token = () => localStorage.getItem("token") ?? undefined;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [produtosResponse, resumoResponse, empresaResponse] = await Promise.all([
      api.get("/produtos", token()),
      api.get("/financeiro/resumo", token()),
      api.get("/financeiro/empresa", token()),
    ]);
    setProdutos(produtosResponse);
    setResumo(resumoResponse);
    setEmpresa((current) => ({ ...current, ...empresaResponse }));
  };

  const totalsEntrada = useMemo(() => notaEntrada.itens.reduce((acc, item) => {
    const calc = calcItem(item);
    return { produtos: acc.produtos + calc.valorProduto, tributos: acc.tributos + calc.tributos, total: acc.total + calc.total };
  }, { produtos: 0, tributos: 0, total: 0 }), [notaEntrada]);

  const totalsSaida = useMemo(() => notaSaida.itens.reduce((acc, item) => {
    const calc = calcItem(item);
    return { produtos: acc.produtos + calc.valorProduto, tributos: acc.tributos + calc.tributos, total: acc.total + calc.total };
  }, { produtos: 0, tributos: 0, total: 0 }), [notaSaida]);

  const selectProductForItem = (form: NotaForm, setForm: (form: NotaForm) => void, index: number, produtoId: string) => {
    const produto = produtos.find((p) => p.id === produtoId);
    const itens = [...form.itens];
    itens[index] = {
      ...itens[index],
      produtoId,
      descricao: produto?.nome ?? itens[index].descricao,
      valorUnitario: String(form.tipo === "ENTRADA" ? produto?.precoCusto ?? produto?.preco ?? 0 : produto?.preco ?? 0),
      ncm: produto?.ncm ?? "",
      cfop: produto?.cfop ?? "",
      cstIcms: produto?.cstIcms ?? "",
      csosn: produto?.csosn ?? "",
      aliquotaIcms: String(produto?.aliquotaIcms ?? 0),
      aliquotaPis: String(produto?.aliquotaPis ?? 0),
      aliquotaCofins: String(produto?.aliquotaCofins ?? 0),
      aliquotaIpi: String(produto?.aliquotaIpi ?? 0),
    };
    setForm({ ...form, itens });
  };

  const saveNota = async (form: NotaForm) => {
    await api.post("/financeiro/notas", {
      ...form,
      itens: form.itens.map((item) => ({
        ...item,
        quantidade: toNumber(item.quantidade),
        valorUnitario: toNumber(item.valorUnitario),
        aliquotaIcms: toNumber(item.aliquotaIcms),
        aliquotaPis: toNumber(item.aliquotaPis),
        aliquotaCofins: toNumber(item.aliquotaCofins),
        aliquotaIpi: toNumber(item.aliquotaIpi),
      })),
    }, token());
    setMessage(form.tipo === "ENTRADA" ? "Nota de entrada registrada e estoque atualizado." : "Nota de saida registrada e estoque baixado.");
    setNotaEntrada(emptyNota("ENTRADA"));
    setNotaSaida(emptyNota("SAIDA"));
    await loadData();
  };

  const saveTributacaoProduto = async () => {
    if (!selectedProdutoId) return;
    await api.put(`/financeiro/produtos/${selectedProdutoId}/tributacao`, {
      ...tributacao,
      aliquotaIcms: toNumber(tributacao.aliquotaIcms),
      aliquotaPis: toNumber(tributacao.aliquotaPis),
      aliquotaCofins: toNumber(tributacao.aliquotaCofins),
      aliquotaIpi: toNumber(tributacao.aliquotaIpi),
    }, token());
    setMessage("Tributacao do produto atualizada.");
    await loadData();
  };

  const renderNotaForm = (form: NotaForm, setForm: (form: NotaForm) => void, totals: { produtos: number; tributos: number; total: number }) => (
    <div style={{ display: "grid", gap: "14px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "12px" }}>
        {["emissorNome", "emissorDocumento", "destinatarioNome", "destinatarioDocumento", "numero", "serie"].map((key) => (
          <div key={key}>
            <label style={labelStyle}>{key}</label>
            <input style={fieldStyle} value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
          </div>
        ))}
        <div>
          <label style={labelStyle}>Modelo</label>
          <select style={fieldStyle} value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value as any })}>
            <option value="NFE">NF-e</option>
            <option value="NFCE">NFC-e</option>
            <option value="NFSE">NFS-e</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Integracao</label>
          <input style={fieldStyle} value={form.integrationProvider} onChange={(e) => setForm({ ...form, integrationProvider: e.target.value })} placeholder="Bling, Sefaz, outro ERP" />
        </div>
      </div>

      {form.itens.map((item, index) => (
        <div key={index} style={{ backgroundColor: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px", display: "grid", gap: "10px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr", gap: "10px" }}>
            <select style={fieldStyle} value={item.produtoId} onChange={(e) => selectProductForItem(form, setForm, index, e.target.value)}>
              <option value="">Produto cadastrado</option>
              {produtos.map((produto) => <option key={produto.id} value={produto.id}>{produto.nome} ({produto.estoque} un)</option>)}
            </select>
            <input style={fieldStyle} value={item.descricao} onChange={(e) => { const itens = [...form.itens]; itens[index] = { ...item, descricao: e.target.value }; setForm({ ...form, itens }); }} placeholder="Descricao fiscal" />
            <input style={fieldStyle} value={item.quantidade} onChange={(e) => { const itens = [...form.itens]; itens[index] = { ...item, quantidade: e.target.value }; setForm({ ...form, itens }); }} placeholder="Qtd" />
            <input style={fieldStyle} value={item.valorUnitario} onChange={(e) => { const itens = [...form.itens]; itens[index] = { ...item, valorUnitario: e.target.value }; setForm({ ...form, itens }); }} placeholder="Valor unit." />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "10px" }}>
            {["ncm", "cfop", "cstIcms", "csosn", "aliquotaIcms", "aliquotaPis", "aliquotaCofins", "aliquotaIpi"].map((key) => (
              <input key={key} style={fieldStyle} value={(item as any)[key]} onChange={(e) => { const itens = [...form.itens]; itens[index] = { ...item, [key]: e.target.value }; setForm({ ...form, itens }); }} placeholder={key} />
            ))}
          </div>
          <strong>Total item: {money(calcItem(item).total)}</strong>
        </div>
      ))}

      <button type="button" onClick={() => setForm({ ...form, itens: [...form.itens, { ...emptyItem }] })} style={{ ...fieldStyle, cursor: "pointer", backgroundColor: "#fff" }}>Adicionar item</button>

      <div style={{ display: "flex", justifyContent: "space-between", backgroundColor: "#fff", padding: "14px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
        <span>Produtos: <strong>{money(totals.produtos)}</strong></span>
        <span>Tributos: <strong>{money(totals.tributos)}</strong></span>
        <span>Total: <strong>{money(totals.total)}</strong></span>
      </div>

      <textarea style={{ ...fieldStyle, minHeight: "70px" }} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Informacoes complementares fiscais" />
      <button onClick={() => saveNota(form)} style={{ ...fieldStyle, backgroundColor: "#16a34a", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Registrar nota e movimentar estoque</button>
    </div>
  );

  return (
    <div style={{ display: "grid", gap: "18px" }}>
      <div>
        <h1 style={{ margin: 0 }}>Financeiro Fiscal</h1>
        <p style={{ margin: "6px 0 0", color: "#6b7280" }}>Integrações, notas fiscais, estoque e tributação por produto em padrão brasileiro.</p>
      </div>
      {message && <div style={{ backgroundColor: "#ecfdf5", color: "#166534", padding: "12px", borderRadius: "8px" }}>{message}</div>}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {[
          ["painel", "Painel", ReceiptText],
          ["integracoes", "Integrações", Link2],
          ["entrada", "Nota de entrada", FileInput],
          ["emissao", "Emissão", FileOutput],
          ["tributos", "Tributos produto", Settings2],
        ].map(([id, label, Icon]: any) => (
          <button key={id} onClick={() => setTab(id)} style={{ display: "flex", alignItems: "center", gap: "7px", border: "none", borderRadius: "8px", padding: "10px 14px", cursor: "pointer", backgroundColor: tab === id ? "#17a2b8" : "#fff", color: tab === id ? "#fff" : "#374151" }}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      <section style={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "18px" }}>
        {tab === "painel" && (
          <div style={{ display: "grid", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
              <div><strong>Notas recentes</strong><h2>{resumo?.totais?.notas ?? 0}</h2></div>
              <div><strong>Entradas</strong><h2>{money(resumo?.totais?.valorEntrada ?? 0)}</h2></div>
              <div><strong>Saídas</strong><h2>{money(resumo?.totais?.valorSaida ?? 0)}</h2></div>
              <div><strong>Tributos</strong><h2>{money(resumo?.totais?.tributos ?? 0)}</h2></div>
            </div>
            <p style={{ color: "#6b7280" }}>NF-e/NFC-e oficiais exigem credenciamento na SEFAZ, certificado digital e homologação. Este módulo registra e prepara os dados para integração segura.</p>
          </div>
        )}

        {tab === "integracoes" && (
          <div style={{ display: "grid", gap: "16px" }}>
            <h2 style={{ margin: 0 }}>Empresa e integrações</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
              {Object.keys(empresa).map((key) => <input key={key} style={fieldStyle} value={(empresa as any)[key] ?? ""} onChange={(e) => setEmpresa({ ...empresa, [key]: e.target.value })} placeholder={key} />)}
            </div>
            <button onClick={async () => { await api.put("/financeiro/empresa", empresa, token()); setMessage("Configuração fiscal da empresa salva."); }} style={{ ...fieldStyle, backgroundColor: "#2563eb", color: "#fff", cursor: "pointer" }}><Building2 size={16} /> Salvar empresa fiscal</button>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
              {Object.keys(integracao).map((key) => <input key={key} style={fieldStyle} value={(integracao as any)[key]} onChange={(e) => setIntegracao({ ...integracao, [key]: e.target.value })} placeholder={key} />)}
            </div>
            <button onClick={async () => { await api.post("/financeiro/integracoes", integracao, token()); setMessage("Integração registrada."); await loadData(); }} style={{ ...fieldStyle, backgroundColor: "#16a34a", color: "#fff", cursor: "pointer" }}><Save size={16} /> Salvar integração</button>
          </div>
        )}

        {tab === "entrada" && renderNotaForm(notaEntrada, setNotaEntrada, totalsEntrada)}
        {tab === "emissao" && renderNotaForm(notaSaida, setNotaSaida, totalsSaida)}

        {tab === "tributos" && (
          <div style={{ display: "grid", gap: "12px" }}>
            <select style={fieldStyle} value={selectedProdutoId} onChange={(e) => {
              const produto = produtos.find((p) => p.id === e.target.value);
              setSelectedProdutoId(e.target.value);
              setTributacao({
                ncm: produto?.ncm ?? "", cest: produto?.cest ?? "", cfop: produto?.cfop ?? "", origem: produto?.origem ?? "0",
                cstIcms: produto?.cstIcms ?? "", csosn: produto?.csosn ?? "",
                aliquotaIcms: String(produto?.aliquotaIcms ?? 0), aliquotaPis: String(produto?.aliquotaPis ?? 0),
                aliquotaCofins: String(produto?.aliquotaCofins ?? 0), aliquotaIpi: String(produto?.aliquotaIpi ?? 0),
              });
            }}>
              <option value="">Selecione o produto</option>
              {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
              {Object.keys(tributacao).map((key) => <input key={key} style={fieldStyle} value={(tributacao as any)[key]} onChange={(e) => setTributacao({ ...tributacao, [key]: e.target.value })} placeholder={key} />)}
            </div>
            <button onClick={saveTributacaoProduto} style={{ ...fieldStyle, backgroundColor: "#16a34a", color: "#fff", cursor: "pointer" }}>Salvar tributação independente do produto</button>
          </div>
        )}
      </section>
    </div>
  );
}
