import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

type PerfilHierarquia = {
  id: string;
  nome: string;
  descricao: string;
  nivel: number;
  roleBase: string;
  areasPadrao: string[];
  dadosPermitidosPadrao: string[];
};

type FuncionarioHierarquia = {
  id: string;
  nome: string;
  email: string;
  role: string;
  createdAt: string;
  areasPermitidas: string[];
};

type PromocaoAcesso = {
  titulo: string;
  areasExtras: string[];
  dadosExtras: string[];
};

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #d8d3c6',
  borderRadius: 12,
  padding: 16,
};

function getToken() {
  return localStorage.getItem('token') || '';
}

function parseCsv(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function roleLabel(role: string) {
  const map: Record<string, string> = {
    ADMIN: 'Administrador',
    GERENTE: 'Gerente',
    VENDEDOR: 'Vendedor',
    CAIXA: 'Caixa',
    ESTOQUISTA: 'Estoquista',
    USER: 'Usuário/Estagiário',
  };
  return map[role] || role;
}

const PROMOCOES_POR_ROLE: Record<string, PromocaoAcesso | null> = {
  USER: {
    titulo: 'Promover acesso para Caixa',
    areasExtras: ['vendas', 'consulta-vendas', 'formas-pagamento'],
    dadosExtras: ['pagamentos', 'vendas'],
  },
  CAIXA: {
    titulo: 'Promover acesso para Supervisor',
    areasExtras: ['comissoes', 'devolucoes', 'relatorios'],
    dadosExtras: ['comissoes', 'devolucoes'],
  },
  VENDEDOR: {
    titulo: 'Promover acesso para Gerência',
    areasExtras: ['financeiro', 'lancamentos', 'conciliacao', 'fluxo-caixa', 'acessos'],
    dadosExtras: ['financeiro', 'integracoes', 'estoque'],
  },
  ESTOQUISTA: {
    titulo: 'Ampliar acesso operacional',
    areasExtras: ['vendas', 'consulta-vendas', 'relatorios'],
    dadosExtras: ['vendas', 'produtos'],
  },
  GERENTE: null,
  ADMIN: null,
};

export default function UsuariosHierarquia() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const [perfis, setPerfis] = useState<PerfilHierarquia[]>([]);
  const [areasDisponiveis, setAreasDisponiveis] = useState<string[]>([]);
  const [funcionarios, setFuncionarios] = useState<FuncionarioHierarquia[]>([]);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [perfilId, setPerfilId] = useState('');
  const [areasExtrasCsv, setAreasExtrasCsv] = useState('');
  const [areasRemovidasCsv, setAreasRemovidasCsv] = useState('');
  const [areasExtrasSelecionadas, setAreasExtrasSelecionadas] = useState<string[]>([]);
  const [areasRemovidasSelecionadas, setAreasRemovidasSelecionadas] = useState<string[]>([]);
  const [dadosExtrasCsv, setDadosExtrasCsv] = useState('');
  const [dadosRemovidosCsv, setDadosRemovidosCsv] = useState('');

  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState('');
  const [upAreasExtrasCsv, setUpAreasExtrasCsv] = useState('');
  const [upAreasRemovidasCsv, setUpAreasRemovidasCsv] = useState('');
  const [upAreasExtrasSelecionadas, setUpAreasExtrasSelecionadas] = useState<string[]>([]);
  const [upAreasRemovidasSelecionadas, setUpAreasRemovidasSelecionadas] = useState<string[]>([]);
  const [upDadosExtrasCsv, setUpDadosExtrasCsv] = useState('');
  const [upDadosRemovidosCsv, setUpDadosRemovidosCsv] = useState('');
  const [justificativa, setJustificativa] = useState('Ajuste operacional definido pela administração.');
  const [filtroBusca, setFiltroBusca] = useState('');
  const [filtroRole, setFiltroRole] = useState('TODOS');
  const [backendHierarquiaIndisponivel, setBackendHierarquiaIndisponivel] = useState(false);
  const [mensagemBackend, setMensagemBackend] = useState('');

  const perfilSelecionado = useMemo(
    () => perfis.find((item) => item.id === perfilId) || null,
    [perfis, perfilId],
  );

  const funcionarioAtual = useMemo(
    () => funcionarios.find((item) => item.id === funcionarioSelecionado) || null,
    [funcionarios, funcionarioSelecionado],
  );

  const funcionariosFiltrados = useMemo(() => {
    const termo = filtroBusca.trim().toLowerCase();
    return funcionarios.filter((item) => {
      const matchRole = filtroRole === 'TODOS' || item.role === filtroRole;
      const matchBusca =
        !termo ||
        item.nome.toLowerCase().includes(termo) ||
        item.email.toLowerCase().includes(termo);
      return matchRole && matchBusca;
    });
  }, [funcionarios, filtroBusca, filtroRole]);

  const toggleFromList = (
    value: string,
    selected: string[],
    setSelected: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    setSelected((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  };

  const carregarTudo = async () => {
    const token = getToken();
    if (!token) {
      setErro('Sessão expirada. Faça login novamente.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErro('');
      setMensagemBackend('');
      setBackendHierarquiaIndisponivel(false);

      const [perfisResp, funcionariosResp] = await Promise.all([
        api.acessos.listarPerfisHierarquia(token),
        api.acessos.listarFuncionariosHierarquia(token),
      ]);

      const perfisList = Array.isArray(perfisResp?.perfis) ? perfisResp.perfis : [];
      setPerfis(perfisList);
      setAreasDisponiveis(Array.isArray(perfisResp?.areasDisponiveis) ? perfisResp.areasDisponiveis : []);
      setFuncionarios(Array.isArray(funcionariosResp?.funcionarios) ? funcionariosResp.funcionarios : []);

      if (!perfilId && perfisList.length > 0) {
        setPerfilId(perfisList[0].id);
      }
    } catch (e: any) {
      const message = String(e?.message || 'Falha ao carregar dados de hierarquia.');
      const rotaNaoPublicada = message.includes('Cannot GET /acessos/hierarquia/perfis') || message.includes('HTTP 404');

      if (rotaNaoPublicada) {
        setBackendHierarquiaIndisponivel(true);
        setMensagemBackend(
          'A funcionalidade de hierarquia ainda não está publicada na API deste ambiente. Tente novamente após o deploy do backend.'
        );
        setPerfis([]);
        setFuncionarios([]);
        setAreasDisponiveis([]);
        return;
      }

      setErro(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarTudo();
  }, []);

  const criarFuncionario = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro('');
    setSucesso('');

    const token = getToken();
    if (!token) {
      setErro('Sessão expirada. Faça login novamente.');
      return;
    }

    if (!perfilId) {
      setErro('Selecione um perfil hierárquico.');
      return;
    }

    try {
      setSaving(true);
      await api.acessos.criarFuncionarioHierarquia(token, {
        nome,
        email,
        senha,
        perfilId,
        areasExtras: Array.from(new Set([...areasExtrasSelecionadas, ...parseCsv(areasExtrasCsv)])),
        areasRemovidas: Array.from(new Set([...areasRemovidasSelecionadas, ...parseCsv(areasRemovidasCsv)])),
        dadosPermitidosExtras: parseCsv(dadosExtrasCsv),
        dadosPermitidosRemovidos: parseCsv(dadosRemovidosCsv),
      });

      setNome('');
      setEmail('');
      setSenha('');
      setAreasExtrasCsv('');
      setAreasRemovidasCsv('');
      setAreasExtrasSelecionadas([]);
      setAreasRemovidasSelecionadas([]);
      setDadosExtrasCsv('');
      setDadosRemovidosCsv('');

      setSucesso('Funcionário cadastrado com sucesso.');
      await carregarTudo();
    } catch (e: any) {
      setErro(e?.message || 'Falha ao cadastrar funcionário.');
    } finally {
      setSaving(false);
    }
  };

  const atualizarPermissoes = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro('');
    setSucesso('');

    const token = getToken();
    if (!token) {
      setErro('Sessão expirada. Faça login novamente.');
      return;
    }

    if (!funcionarioSelecionado) {
      setErro('Selecione um funcionário para ajustar permissões.');
      return;
    }

    try {
      setUpdating(true);
      await api.acessos.atualizarPermissoesHierarquia(token, funcionarioSelecionado, {
        areasExtras: Array.from(new Set([...upAreasExtrasSelecionadas, ...parseCsv(upAreasExtrasCsv)])),
        areasRemovidas: Array.from(new Set([...upAreasRemovidasSelecionadas, ...parseCsv(upAreasRemovidasCsv)])),
        dadosPermitidosExtras: parseCsv(upDadosExtrasCsv),
        dadosPermitidosRemovidos: parseCsv(upDadosRemovidosCsv),
        justificativa,
      });

      setSucesso('Permissões atualizadas com sucesso.');
      await carregarTudo();
    } catch (e: any) {
      setErro(e?.message || 'Falha ao atualizar permissões.');
    } finally {
      setUpdating(false);
    }
  };

  const aplicarPromocaoRapida = async (funcionario: FuncionarioHierarquia) => {
    const promocao = PROMOCOES_POR_ROLE[funcionario.role] || null;
    if (!promocao) return;

    const token = getToken();
    if (!token) {
      setErro('Sessão expirada. Faça login novamente.');
      return;
    }

    try {
      setUpdating(true);
      setErro('');
      setSucesso('');

      await api.acessos.atualizarPermissoesHierarquia(token, funcionario.id, {
        areasExtras: promocao.areasExtras,
        areasRemovidas: [],
        dadosPermitidosExtras: promocao.dadosExtras,
        dadosPermitidosRemovidos: [],
        justificativa: `Promoção rápida de acesso: ${promocao.titulo}`,
      });

      setSucesso(`Promoção rápida aplicada para ${funcionario.nome}.`);
      await carregarTudo();
    } catch (e: any) {
      setErro(e?.message || 'Falha ao aplicar promoção rápida.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div style={{ padding: 20, display: 'grid', gap: 16 }}>
      <div style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, color: '#1f312c' }}>Hierarquia de Usuários</h1>
          <p style={{ margin: '6px 0 0', color: '#62726c' }}>
            Cadastro por perfil (Admin, Gerente, Vendedor, Caixa, Estoquista e Estagiário) com ajustes simples de permissões.
          </p>
        </div>
        <button
          type="button"
          onClick={carregarTudo}
          disabled={loading}
          style={{
            border: '1px solid #c7c1b2',
            background: '#fff',
            borderRadius: 8,
            padding: '8px 12px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          {loading ? 'Atualizando...' : 'Atualizar dados'}
        </button>
      </div>

      {erro && (
        <div style={{ ...cardStyle, borderColor: '#f5b5b5', background: '#fff4f4', color: '#8b2f2f' }}>
          {erro}
        </div>
      )}

      {backendHierarquiaIndisponivel && (
        <div style={{ ...cardStyle, borderColor: '#d9c49c', background: '#fff8ec', color: '#7c4a03' }}>
          <strong>Deploy em andamento</strong>
          <p style={{ margin: '8px 0 0' }}>{mensagemBackend}</p>
          <p style={{ margin: '8px 0 0' }}>
            Enquanto isso, as ações desta tela ficam em modo de leitura para evitar erros de operação.
          </p>
        </div>
      )}

      {sucesso && (
        <div style={{ ...cardStyle, borderColor: '#a5e1c7', background: '#effcf5', color: '#166534' }}>
          {sucesso}
        </div>
      )}

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <form onSubmit={criarFuncionario} style={{ ...cardStyle, display: 'grid', gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Cadastrar Funcionário</h2>

          <label style={{ display: 'grid', gap: 4 }}>
            <span>Nome</span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} required />
          </label>

          <label style={{ display: 'grid', gap: 4 }}>
            <span>E-mail</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>

          <label style={{ display: 'grid', gap: 4 }}>
            <span>Senha inicial</span>
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
            <small style={{ color: '#62726c' }}>
              Mínimo 10 caracteres, com maiúscula, minúscula, número e caractere especial.
            </small>
          </label>

          <label style={{ display: 'grid', gap: 4 }}>
            <span>Perfil hierárquico</span>
            <select value={perfilId} onChange={(e) => setPerfilId(e.target.value)} required>
              <option value="">Selecione</option>
              {perfis.map((perfil) => (
                <option key={perfil.id} value={perfil.id}>
                  {perfil.nome} ({perfil.roleBase})
                </option>
              ))}
            </select>
          </label>

          {perfilSelecionado && (
            <div style={{ background: '#f8faf9', border: '1px solid #d8d3c6', borderRadius: 8, padding: 10 }}>
              <strong>{perfilSelecionado.nome}</strong>
              <p style={{ margin: '6px 0', color: '#62726c' }}>{perfilSelecionado.descricao}</p>
              <small style={{ color: '#64748b' }}>
                Áreas padrão: {perfilSelecionado.areasPadrao.join(', ')}
              </small>
            </div>
          )}

          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Ajustes opcionais de requisitos</summary>
            <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <span>Áreas extras (seleção rápida)</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {areasDisponiveis.map((area) => {
                    const ativo = areasExtrasSelecionadas.includes(area);
                    return (
                      <button
                        key={`add-${area}`}
                        type="button"
                        onClick={() => toggleFromList(area, areasExtrasSelecionadas, setAreasExtrasSelecionadas)}
                        style={{
                          border: '1px solid #c8d1dc',
                          background: ativo ? '#dbeafe' : '#fff',
                          color: ativo ? '#1d4ed8' : '#334155',
                          borderRadius: 999,
                          padding: '4px 10px',
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        {ativo ? '✓ ' : ''}{area}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                <span>Áreas removidas (seleção rápida)</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {areasDisponiveis.map((area) => {
                    const ativo = areasRemovidasSelecionadas.includes(area);
                    return (
                      <button
                        key={`remove-${area}`}
                        type="button"
                        onClick={() => toggleFromList(area, areasRemovidasSelecionadas, setAreasRemovidasSelecionadas)}
                        style={{
                          border: '1px solid #f1c7c7',
                          background: ativo ? '#fee2e2' : '#fff',
                          color: ativo ? '#991b1b' : '#7f1d1d',
                          borderRadius: 999,
                          padding: '4px 10px',
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        {ativo ? '✕ ' : ''}{area}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label style={{ display: 'grid', gap: 4 }}>
                <span>Áreas extras (vírgula, opcional)</span>
                <input
                  placeholder="financeiro,relatorios"
                  value={areasExtrasCsv}
                  onChange={(e) => setAreasExtrasCsv(e.target.value)}
                />
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <span>Áreas removidas (vírgula, opcional)</span>
                <input
                  placeholder="devolucoes,integracoes"
                  value={areasRemovidasCsv}
                  onChange={(e) => setAreasRemovidasCsv(e.target.value)}
                />
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <span>Dados extras permitidos (vírgula)</span>
                <input
                  placeholder="financeiro-leitura"
                  value={dadosExtrasCsv}
                  onChange={(e) => setDadosExtrasCsv(e.target.value)}
                />
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <span>Dados removidos (vírgula)</span>
                <input
                  placeholder="pagamentos"
                  value={dadosRemovidosCsv}
                  onChange={(e) => setDadosRemovidosCsv(e.target.value)}
                />
              </label>
            </div>
          </details>

          <button
            type="submit"
            disabled={saving || loading || backendHierarquiaIndisponivel}
            style={{
              border: 'none',
              borderRadius: 8,
              padding: '10px 14px',
              background: '#0e7a6d',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {saving ? 'Cadastrando...' : 'Cadastrar funcionário'}
          </button>
        </form>

        <form onSubmit={atualizarPermissoes} style={{ ...cardStyle, display: 'grid', gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Ajustar Permissões</h2>

          <label style={{ display: 'grid', gap: 4 }}>
            <span>Funcionário</span>
            <select
              value={funcionarioSelecionado}
              onChange={(e) => setFuncionarioSelecionado(e.target.value)}
              required
            >
              <option value="">Selecione</option>
              {funcionarios.map((func) => (
                <option key={func.id} value={func.id}>
                  {func.nome} - {roleLabel(func.role)}
                </option>
              ))}
            </select>
          </label>

          {funcionarioAtual && (
            <div style={{ background: '#f8faf9', border: '1px solid #d8d3c6', borderRadius: 8, padding: 10 }}>
              <div><strong>{funcionarioAtual.nome}</strong> ({roleLabel(funcionarioAtual.role)})</div>
              <small style={{ color: '#64748b' }}>Áreas atuais: {funcionarioAtual.areasPermitidas.join(', ') || 'nenhuma'}</small>
            </div>
          )}

          <label style={{ display: 'grid', gap: 4 }}>
            <span>Adicionar áreas (vírgula)</span>
            <input
              placeholder="relatorios,integracoes"
              value={upAreasExtrasCsv}
              onChange={(e) => setUpAreasExtrasCsv(e.target.value)}
            />
          </label>

          <div style={{ display: 'grid', gap: 6 }}>
            <span>Adicionar áreas (seleção rápida)</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {areasDisponiveis.map((area) => {
                const ativo = upAreasExtrasSelecionadas.includes(area);
                return (
                  <button
                    key={`up-add-${area}`}
                    type="button"
                    onClick={() => toggleFromList(area, upAreasExtrasSelecionadas, setUpAreasExtrasSelecionadas)}
                    style={{
                      border: '1px solid #c8d1dc',
                      background: ativo ? '#dbeafe' : '#fff',
                      color: ativo ? '#1d4ed8' : '#334155',
                      borderRadius: 999,
                      padding: '4px 10px',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    {ativo ? '✓ ' : ''}{area}
                  </button>
                );
              })}
            </div>
          </div>

          <label style={{ display: 'grid', gap: 4 }}>
            <span>Remover áreas (vírgula)</span>
            <input
              placeholder="devolucoes"
              value={upAreasRemovidasCsv}
              onChange={(e) => setUpAreasRemovidasCsv(e.target.value)}
            />
          </label>

          <div style={{ display: 'grid', gap: 6 }}>
            <span>Remover áreas (seleção rápida)</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {areasDisponiveis.map((area) => {
                const ativo = upAreasRemovidasSelecionadas.includes(area);
                return (
                  <button
                    key={`up-remove-${area}`}
                    type="button"
                    onClick={() => toggleFromList(area, upAreasRemovidasSelecionadas, setUpAreasRemovidasSelecionadas)}
                    style={{
                      border: '1px solid #f1c7c7',
                      background: ativo ? '#fee2e2' : '#fff',
                      color: ativo ? '#991b1b' : '#7f1d1d',
                      borderRadius: 999,
                      padding: '4px 10px',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    {ativo ? '✕ ' : ''}{area}
                  </button>
                );
              })}
            </div>
          </div>

          <label style={{ display: 'grid', gap: 4 }}>
            <span>Adicionar dados permitidos (vírgula)</span>
            <input
              placeholder="financeiro-leitura"
              value={upDadosExtrasCsv}
              onChange={(e) => setUpDadosExtrasCsv(e.target.value)}
            />
          </label>

          <label style={{ display: 'grid', gap: 4 }}>
            <span>Remover dados permitidos (vírgula)</span>
            <input
              placeholder="pagamentos"
              value={upDadosRemovidosCsv}
              onChange={(e) => setUpDadosRemovidosCsv(e.target.value)}
            />
          </label>

          <label style={{ display: 'grid', gap: 4 }}>
            <span>Justificativa</span>
            <input value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />
          </label>

          <button
            type="submit"
            disabled={updating || loading || backendHierarquiaIndisponivel}
            style={{
              border: 'none',
              borderRadius: 8,
              padding: '10px 14px',
              background: '#1d4ed8',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {updating ? 'Atualizando...' : 'Aplicar ajustes'}
          </button>
        </form>
      </div>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 18 }}>Perfis predefinidos</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          {perfis.map((perfil) => (
            <div key={perfil.id} style={{ border: '1px solid #e6e2d6', borderRadius: 8, padding: 10 }}>
              <strong>{perfil.nome}</strong> · <span>{perfil.roleBase}</span> · <span>Nível {perfil.nivel}</span>
              <div style={{ color: '#62726c', marginTop: 4 }}>{perfil.descricao}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 18 }}>Funcionários cadastrados</h2>

        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 220px', marginBottom: 10 }}>
          <input
            placeholder="Buscar por nome ou e-mail"
            value={filtroBusca}
            onChange={(e) => setFiltroBusca(e.target.value)}
          />
          <select value={filtroRole} onChange={(e) => setFiltroRole(e.target.value)}>
            <option value="TODOS">Todos os perfis</option>
            <option value="ADMIN">Administrador</option>
            <option value="GERENTE">Gerente</option>
            <option value="VENDEDOR">Vendedor</option>
            <option value="CAIXA">Caixa</option>
            <option value="ESTOQUISTA">Estoquista</option>
            <option value="USER">Usuário/Estagiário</option>
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead>
              <tr style={{ background: '#f8faf9' }}>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e6e2d6' }}>Nome</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e6e2d6' }}>E-mail</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e6e2d6' }}>Perfil Base</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e6e2d6' }}>Áreas</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e6e2d6' }}>Ação rápida</th>
              </tr>
            </thead>
            <tbody>
              {funcionariosFiltrados.map((funcionario) => (
                <tr key={funcionario.id}>
                  <td style={{ padding: 8, borderBottom: '1px solid #f0ede5' }}>{funcionario.nome}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f0ede5' }}>{funcionario.email}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f0ede5' }}>{roleLabel(funcionario.role)}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f0ede5' }}>
                    {funcionario.areasPermitidas?.length ? funcionario.areasPermitidas.join(', ') : 'Sem áreas'}
                  </td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f0ede5' }}>
                    {PROMOCOES_POR_ROLE[funcionario.role] ? (
                      <button
                        type="button"
                        disabled={updating || backendHierarquiaIndisponivel}
                        onClick={() => aplicarPromocaoRapida(funcionario)}
                        style={{
                          border: '1px solid #c7c1b2',
                          background: '#fff',
                          borderRadius: 8,
                          padding: '6px 10px',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        {PROMOCOES_POR_ROLE[funcionario.role]?.titulo}
                      </button>
                    ) : (
                      <span style={{ color: '#64748b' }}>Sem promoção disponível</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ ...cardStyle, background: '#f8faf9' }}>
        <strong>Áreas disponíveis no sistema:</strong>
        <div style={{ marginTop: 8, color: '#475569' }}>{areasDisponiveis.join(', ')}</div>
      </div>
    </div>
  );
}
