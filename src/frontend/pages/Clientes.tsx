import { type CSSProperties, useEffect, useMemo, useState } from "react";
import {
  Mail,
  MapPin,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { api } from "../services/api";

interface Cliente {
  id: string;
  nome: string;
  telefone?: string | null;
  cpf?: string | null;
  email?: string | null;
  dataNascimento?: string | null;
  cep?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  observacoes?: string | null;
}

interface ClienteForm {
  nome: string;
  telefone: string;
  cpf: string;
  email: string;
  dataNascimento: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  observacoes: string;
}

const emptyForm: ClienteForm = {
  nome: "",
  telefone: "",
  cpf: "",
  email: "",
  dataNascimento: "",
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  observacoes: "",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  fontSize: "14px",
  boxSizing: "border-box",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 600,
  color: "#374151",
  marginBottom: "6px",
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatDateForInput(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [formData, setFormData] = useState<ClienteForm>(emptyForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadClientes();
  }, []);

  const getToken = () => localStorage.getItem("token") ?? undefined;

  const loadClientes = async () => {
    try {
      setError("");
      const response = await api.get("/cadastros/clientes", getToken());
      setClientes(response);
    } catch (err) {
      console.error("Erro ao carregar clientes:", err);
      setError("Nao foi possivel carregar os clientes cadastrados.");
    } finally {
      setLoading(false);
    }
  };

  const filteredClientes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return clientes;

    return clientes.filter((cliente) => {
      return [
        cliente.nome,
        cliente.telefone,
        cliente.email,
        cliente.cpf,
        cliente.cidade,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [clientes, searchTerm]);

  const openNewForm = () => {
    setEditingCliente(null);
    setFormData(emptyForm);
    setShowForm(true);
    setError("");
  };

  const closeForm = () => {
    setEditingCliente(null);
    setFormData(emptyForm);
    setShowForm(false);
  };

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setFormData({
      nome: cliente.nome ?? "",
      telefone: cliente.telefone ?? "",
      cpf: cliente.cpf ?? "",
      email: cliente.email ?? "",
      dataNascimento: formatDateForInput(cliente.dataNascimento),
      cep: cliente.cep ?? "",
      endereco: cliente.endereco ?? "",
      numero: cliente.numero ?? "",
      complemento: cliente.complemento ?? "",
      bairro: cliente.bairro ?? "",
      cidade: cliente.cidade ?? "",
      estado: cliente.estado ?? "",
      observacoes: cliente.observacoes ?? "",
    });
    setShowForm(true);
    setError("");
  };

  const buscarEnderecoPorCep = async () => {
    const cep = onlyDigits(formData.cep);
    if (cep.length !== 8) {
      setError("Informe um CEP com 8 digitos para buscar o endereco.");
      return;
    }

    try {
      setBuscandoCep(true);
      setError("");
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        setError("CEP nao encontrado.");
        return;
      }

      setFormData((current) => ({
        ...current,
        cep,
        endereco: data.logradouro || current.endereco,
        bairro: data.bairro || current.bairro,
        cidade: data.localidade || current.cidade,
        estado: data.uf || current.estado,
      }));
    } catch (err) {
      console.error("Erro ao buscar CEP:", err);
      setError("Nao foi possivel buscar o endereco pelo CEP.");
    } finally {
      setBuscandoCep(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      ...formData,
      cep: onlyDigits(formData.cep),
      cpf: onlyDigits(formData.cpf),
      telefone: formData.telefone.trim(),
      email: formData.email.trim(),
      estado: formData.estado.trim().toUpperCase(),
    };

    try {
      if (editingCliente) {
        await api.put(`/cadastros/clientes/${editingCliente.id}`, payload, getToken());
      } else {
        await api.post("/cadastros/clientes", payload, getToken());
      }

      closeForm();
      await loadClientes();
    } catch (err) {
      console.error("Erro ao salvar cliente:", err);
      setError("Nao foi possivel salvar o cliente. Confira os dados informados.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;

    try {
      setError("");
      await api.delete(`/cadastros/clientes/${id}`, getToken());
      await loadClientes();
    } catch (err) {
      console.error("Erro ao excluir cliente:", err);
      setError("Nao foi possivel excluir o cliente.");
    }
  };

  return (
    <div style={{ display: "grid", gap: "18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, color: "#111827", fontSize: "26px" }}>Clientes</h1>
          <p style={{ margin: "6px 0 0", color: "#6b7280", fontSize: "14px" }}>
            Consulte os clientes cadastrados e mantenha os dados de contato atualizados.
          </p>
        </div>

        <button
          onClick={openNewForm}
          title="Cadastrar cliente"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "#17a2b8",
            border: "none",
            borderRadius: "6px",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 700,
            padding: "11px 16px",
          }}
        >
          <UserPlus size={18} />
          Cadastrar Cliente
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: "#fff1f2", color: "#be123c", padding: "12px", borderRadius: "6px" }}>
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            backgroundColor: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "18px",
            display: "grid",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0, fontSize: "18px", color: "#111827" }}>
              {editingCliente ? "Editar cliente" : "Novo cliente"}
            </h2>
            <button
              type="button"
              onClick={closeForm}
              title="Cancelar"
              style={{ border: "none", background: "transparent", cursor: "pointer", color: "#6b7280" }}
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
            <div>
              <label style={labelStyle}>Nome completo *</label>
              <input
                style={inputStyle}
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>Telefone *</label>
              <input
                style={inputStyle}
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
                required
              />
            </div>

            <div>
              <label style={labelStyle}>CPF opcional</label>
              <input
                style={inputStyle}
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                placeholder="000.000.000-00"
              />
            </div>

            <div>
              <label style={labelStyle}>E-mail</label>
              <input
                style={inputStyle}
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="cliente@email.com"
              />
            </div>

            <div>
              <label style={labelStyle}>Data de nascimento</label>
              <input
                style={inputStyle}
                type="date"
                value={formData.dataNascimento}
                onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
              />
            </div>

            <div>
              <label style={labelStyle}>CEP</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  style={inputStyle}
                  value={formData.cep}
                  onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                  placeholder="00000000"
                />
                <button
                  type="button"
                  onClick={buscarEnderecoPorCep}
                  disabled={buscandoCep}
                  title="Buscar endereco pelo CEP"
                  style={{
                    width: "44px",
                    border: "none",
                    borderRadius: "6px",
                    backgroundColor: "#e0f2fe",
                    color: "#0369a1",
                    cursor: buscandoCep ? "wait" : "pointer",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Search size={18} />
                </button>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Endereco</label>
              <input
                style={inputStyle}
                value={formData.endereco}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
              />
            </div>

            <div>
              <label style={labelStyle}>Numero</label>
              <input
                style={inputStyle}
                value={formData.numero}
                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
              />
            </div>

            <div>
              <label style={labelStyle}>Complemento</label>
              <input
                style={inputStyle}
                value={formData.complemento}
                onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
              />
            </div>

            <div>
              <label style={labelStyle}>Bairro</label>
              <input
                style={inputStyle}
                value={formData.bairro}
                onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
              />
            </div>

            <div>
              <label style={labelStyle}>Cidade</label>
              <input
                style={inputStyle}
                value={formData.cidade}
                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
              />
            </div>

            <div>
              <label style={labelStyle}>UF</label>
              <input
                style={inputStyle}
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                maxLength={2}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Observacoes</label>
            <textarea
              style={{ ...inputStyle, minHeight: "76px", resize: "vertical" }}
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Preferencias, restricoes, nome do pet ou qualquer observacao util."
            />
          </div>

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={closeForm}
              style={{
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                backgroundColor: "#fff",
                cursor: "pointer",
                padding: "10px 14px",
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                border: "none",
                borderRadius: "6px",
                backgroundColor: "#16a34a",
                color: "#fff",
                cursor: saving ? "wait" : "pointer",
                fontWeight: 700,
                padding: "10px 14px",
              }}
            >
              {editingCliente ? <Save size={16} /> : <Plus size={16} />}
              {saving ? "Salvando..." : editingCliente ? "Salvar" : "Cadastrar"}
            </button>
          </div>
        </form>
      )}

      <div style={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden" }}>
        <div style={{ padding: "14px", borderBottom: "1px solid #e5e7eb", display: "flex", gap: "12px", alignItems: "center" }}>
          <Search size={18} color="#6b7280" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, telefone, e-mail, CPF ou cidade"
            style={{ border: "none", outline: "none", flex: 1, fontSize: "14px" }}
          />
        </div>

        {loading ? (
          <div style={{ padding: "20px", color: "#6b7280" }}>Carregando clientes...</div>
        ) : filteredClientes.length === 0 ? (
          <div style={{ padding: "28px", color: "#6b7280", textAlign: "center" }}>
            Nenhum cliente cadastrado ainda.
          </div>
        ) : (
          <div style={{ display: "grid" }}>
            {filteredClientes.map((cliente) => (
              <div
                key={cliente.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.4fr 1fr auto",
                  gap: "16px",
                  alignItems: "center",
                  padding: "16px",
                  borderBottom: "1px solid #f3f4f6",
                }}
              >
                <div>
                  <strong style={{ color: "#111827", fontSize: "15px" }}>{cliente.nome}</strong>
                  <div style={{ color: "#6b7280", marginTop: "5px", fontSize: "13px" }}>
                    {cliente.telefone || "Telefone nao informado"}
                    {cliente.cpf ? ` | CPF ${cliente.cpf}` : ""}
                  </div>
                </div>

                <div style={{ display: "grid", gap: "6px", color: "#4b5563", fontSize: "13px" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Mail size={14} /> {cliente.email || "E-mail nao informado"}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <MapPin size={14} />
                    {[cliente.cidade, cliente.estado].filter(Boolean).join(" - ") || "Endereco nao informado"}
                  </span>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => handleEdit(cliente)}
                    title="Editar cliente"
                    style={{
                      width: "36px",
                      height: "36px",
                      display: "grid",
                      placeItems: "center",
                      border: "none",
                      borderRadius: "6px",
                      backgroundColor: "#fef3c7",
                      color: "#92400e",
                      cursor: "pointer",
                    }}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(cliente.id)}
                    title="Excluir cliente"
                    style={{
                      width: "36px",
                      height: "36px",
                      display: "grid",
                      placeItems: "center",
                      border: "none",
                      borderRadius: "6px",
                      backgroundColor: "#fee2e2",
                      color: "#991b1b",
                      cursor: "pointer",
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
