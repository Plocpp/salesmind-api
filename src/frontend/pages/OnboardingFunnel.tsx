import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import './OnboardingFunnel.css';

// ─── Dados de demonstração das telas fantasma do sistema ───────────────────
const GHOST_SCREENS = [
  {
    title: '📦 Estoque',
    lines: ['Ração Premium  ×48', 'Antiparasitário ×12', 'Shampoo Pets   ×37', '⚠ Repor: 3 itens'],
  },
  {
    title: '💰 Financeiro',
    lines: ['Receita maio  R$ 18.740', 'Despesas       R$ 6.210', 'Saldo líquido R$ 12.530', '↑ +14% vs abril'],
  },
  {
    title: '🛒 Vendas hoje',
    lines: ['12 vendas fechadas', 'Ticket médio R$ 89', 'PIX 62% | Cartão 38%', 'Última: 14:32 ✓'],
  },
  {
    title: '🔗 Integrações',
    lines: ['Mercado Livre ✓ ativo', 'Shopee        ✓ ativo', 'Ifood         ✓ ativo', 'Webhook: 99.8% uptime'],
  },
  {
    title: '📊 Fluxo de Caixa',
    lines: ['Semana 1  +R$ 4.200', 'Semana 2  +R$ 5.100', 'Semana 3  +R$ 3.980', 'Projeção  +R$ 5.460'],
  },
  {
    title: '👥 Usuários',
    lines: ['Ana (Admin) ● online', 'Carlos (PDV) ● online', 'Petra (Estq) ○ away', '4 sessões ativas'],
  },
];

const FLASHES = [
  'Baixa de estoque automática ao confirmar venda no PDV.',
  'Conciliação de cartões em tempo real com as operadoras.',
  'Webhooks HUB integrados a mais de 8 marketplaces.',
  'Governança LGPD com auditoria de acesso por área.',
  'Fluxo de caixa consolidado com previsão de 30 dias.',
  'Gestão multiempresa com isolamento de dados por tenant.',
];

// ─── Configurações fixas de plano (enriquecimento do comparador) ──────────
const PLANO_CONFIG: Record<
  string,
  { badge?: string; badgeColor?: string; destaque: boolean; economia?: string }
> = {
  starter: { destaque: false },
  growth: {
    badge: '⭐ Melhor custo-benefício',
    badgeColor: '#f6d66f',
    destaque: true,
    economia: 'Economize 41% vs Starter por usuário',
  },
  scale: { destaque: false, economia: 'Suporte premium dedicado' },
};

// ─── Linhas de feature para o comparador (label + presença por plano) ─────
const FEATURE_MATRIX = [
  { label: 'Usuários inclusos',     starter: '5',   growth: '20',  scale: '100' },
  { label: 'Empresas (tenants)',    starter: '1',   growth: '5',   scale: 'Ilimitado' },
  { label: 'Módulo de Vendas',      starter: '✓',   growth: '✓',   scale: '✓' },
  { label: 'Módulo de Estoque',     starter: '✓',   growth: '✓',   scale: '✓' },
  { label: 'Módulo Financeiro',     starter: '–',   growth: '✓',   scale: '✓' },
  { label: 'HUB Marketplaces',      starter: '–',   growth: '✓',   scale: '✓' },
  { label: 'Governança LGPD',       starter: 'Básico', growth: 'Completo', scale: 'Completo' },
  { label: 'Webhooks externos',     starter: '–',   growth: '✓',   scale: '✓' },
  { label: 'Relatórios avançados',  starter: '–',   growth: '–',   scale: '✓' },
  { label: 'Suporte',               starter: 'Email', growth: 'Email + Chat', scale: 'Dedicado' },
];

type Plano = {
  id: string;
  nome: string;
  precoMensal: number;
  moeda: 'BRL' | 'USD';
  limiteUsuarios: number;
  limiteEmpresas: number;
  recursos: string[];
};

type Preferencias = {
  resumo: string[];
  recomendacoesPorCenario: Record<string, string[]>;
  referencias: string[];
};

type CadastroPayload = {
  empresaNome: string;
  empresaCnpj: string;
  adminNome: string;
  adminEmail: string;
  adminSenha: string;
  planoId: string;
  providerPreferido: string;
  pais: string;
  moeda: string;
  precisaPix: boolean;
  finalidade: string;
  baseLegal: string;
  consentimentoLgpd: boolean;
};

interface OnboardingFunnelProps {
  onVoltarLogin: () => void;
}

const ETAPAS = ['Escolher Plano', 'Dados da Empresa', 'Pagamento'];

const defaultPayload: CadastroPayload = {
  empresaNome: '',
  empresaCnpj: '',
  adminNome: '',
  adminEmail: '',
  adminSenha: '',
  planoId: 'growth',
  providerPreferido: '',
  pais: 'BR',
  moeda: 'BRL',
  precisaPix: true,
  finalidade: 'contratacao da plataforma para operacao comercial da empresa',
  baseLegal: 'execucao_de_contrato',
  consentimentoLgpd: false,
};

const OnboardingFunnel: React.FC<OnboardingFunnelProps> = ({ onVoltarLogin }) => {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [preferencias, setPreferencias] = useState<Preferencias | null>(null);
  const [payload, setPayload] = useState<CadastroPayload>(defaultPayload);
  const [loading, setLoading] = useState(false);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [activeFlash, setActiveFlash] = useState(0);
  const [etapa, setEtapa] = useState(0); // 0=plano, 1=dados, 2=checkout
  const [vendedores, setVendedores] = useState(3);
  const [ticketMedio, setTicketMedio] = useState(90);

  // Rotaciona os flashes de fundo
  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveFlash((prev) => (prev + 1) % FLASHES.length);
    }, 2800);
    return () => window.clearInterval(timer);
  }, []);

  // Carrega planos e preferências
  useEffect(() => {
    const load = async () => {
      try {
        setCarregandoDados(true);
        const [planosResp, prefResp] = await Promise.all([
          api.get('/onboarding/planos'),
          api.get('/onboarding/preferencias'),
        ]);
        setPlanos(planosResp.planos || []);
        setPreferencias(prefResp);
      } catch (error: any) {
        setMensagem(error?.message || 'Não foi possível carregar as opções comerciais.');
      } finally {
        setCarregandoDados(false);
      }
    };
    load();
  }, []);

  const planoSelecionado = useMemo(
    () => planos.find((p) => p.id === payload.planoId) || null,
    [planos, payload.planoId],
  );

  // ─── Simulador de ROI ─────────────────────────────────────────────────────
  const roiSimulado = useMemo(() => {
    if (!planoSelecionado) return null;
    const custoManualMensal = vendedores * 15 * 25; // 15h/mês × R$25/h por vendedor
    const receita = vendedores * ticketMedio * 22; // 22 dias de trabalho
    const planoMensal = planoSelecionado.precoMensal;
    const economia = custoManualMensal - planoMensal;
    const roi = Math.round(((custoManualMensal - planoMensal) / planoMensal) * 100);
    const ganhoExtra = Math.round(receita * 0.08); // 8% mais vendas com automação
    return { custoManual: custoManualMensal, planoMensal, economia, roi, ganhoExtra };
  }, [planoSelecionado, vendedores, ticketMedio]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMensagem('');
    if (!payload.consentimentoLgpd) {
      setMensagem('É necessário aceitar o tratamento de dados (LGPD) para continuar.');
      return;
    }
    try {
      setLoading(true);
      const response = await api.post('/onboarding/cadastro', {
        ...payload,
        providerPreferido: payload.providerPreferido || undefined,
        empresaCnpj: payload.empresaCnpj || undefined,
      });
      setCheckoutUrl(response.checkoutUrl || '');
      setMensagem('Cadastro iniciado! Conclua o pagamento para ativar sua empresa.');
      setEtapa(2);
    } catch (error: any) {
      setMensagem(error?.message || 'Falha ao iniciar cadastro com pagamento.');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (key: keyof CadastroPayload, value: string | boolean) => {
    setPayload((prev) => ({ ...prev, [key]: value }));
  };

  const normalizeCheckoutUrl = (url: string) => {
    const trimmed = String(url || '').trim();
    if (!trimmed) return '';

    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    if (trimmed.startsWith('/')) return `${window.location.origin}${trimmed}`;

    return `https://${trimmed}`;
  };

  const abrirCheckout = () => {
    const targetUrl = normalizeCheckoutUrl(checkoutUrl);
    if (!targetUrl) {
      setMensagem('Link de checkout indisponível no momento. Tente novamente em alguns instantes.');
      return;
    }

    try {
      const checkoutWindow = window.open(targetUrl, '_blank', 'noopener,noreferrer');
      if (!checkoutWindow) {
        // Fallback para ambientes que bloqueiam popup.
        window.location.assign(targetUrl);
      }
    } catch {
      window.location.assign(targetUrl);
    }
  };

  // ─── Força da senha ────────────────────────────────────────────────────────
  const forcaSenha = useMemo(() => {
    const s = payload.adminSenha;
    if (!s) return 0;
    let score = 0;
    if (s.length >= 8) score++;
    if (/[A-Z]/.test(s)) score++;
    if (/[0-9]/.test(s)) score++;
    if (/[^A-Za-z0-9]/.test(s)) score++;
    return score;
  }, [payload.adminSenha]);

  const forcaLabel = ['', 'Fraca', 'Média', 'Boa', 'Forte'][forcaSenha];
  const forcaColor = ['', '#f55', '#f90', '#9d0', '#1ec9b1'][forcaSenha];

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="funnel-root">

      {/* ── Telas fantasma do sistema ao fundo (efeito espelho) ── */}
      <div className="funnel-ghost-layer" aria-hidden="true">
        {GHOST_SCREENS.map((screen, idx) => (
          <div key={screen.title} className={`ghost-screen ghost-screen-${idx}`}>
            <div className="ghost-screen-title">{screen.title}</div>
            {screen.lines.map((line) => (
              <div key={line} className="ghost-screen-line">{line}</div>
            ))}
          </div>
        ))}
        {/* Flash ticker no canto */}
        <div className="ghost-ticker">
          {FLASHES.map((f, i) => (
            <span key={f} className={`ticker-item ${activeFlash === i ? 'ticker-active' : ''}`}>{f}</span>
          ))}
        </div>
      </div>

      <div className="funnel-shell">

        {/* ── Cabeçalho ── */}
        <header className="funnel-header">
          <div>
            <div className="funnel-logo-pill">SALESMIND</div>
            <h1>Plataforma SaaS para Gestão Comercial</h1>
            <p>Funil guiado · Pagamento recorrente · Ativação automática de tenant</p>
          </div>
          <button type="button" className="btn-ghost" onClick={onVoltarLogin}>
            ← Voltar ao login
          </button>
        </header>

        {/* ── Barra de progresso em etapas ── */}
        <div className="funnel-steps">
          {ETAPAS.map((label, i) => (
            <React.Fragment key={label}>
              <button
                type="button"
                className={`step-pill ${etapa === i ? 'step-active' : ''} ${etapa > i ? 'step-done' : ''}`}
                onClick={() => { if (etapa > i) setEtapa(i); }}
                disabled={etapa < i}
              >
                <span className="step-num">{etapa > i ? '✓' : i + 1}</span>
                <span className="step-label">{label}</span>
              </button>
              {i < ETAPAS.length - 1 && (
                <div className={`step-connector ${etapa > i ? 'connector-done' : ''}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════
            ETAPA 0 — Comparador de planos + Simulador de ROI
        ══════════════════════════════════════════════════════ */}
        {etapa === 0 && (
          <div className="funnel-stage">
            <div className="comparator-header">
              <h2>Escolha seu plano</h2>
              <p>Todos os planos incluem onboarding guiado e suporte na ativação.</p>
            </div>

            {carregandoDados && (
              <div className="loading-shimmer">
                <div className="shimmer-card" /><div className="shimmer-card" /><div className="shimmer-card" />
              </div>
            )}

            {/* Cards de plano lado a lado */}
            {!carregandoDados && planos.length > 0 && (
              <div className="plan-comparator">
                {planos.map((plano) => {
                  const cfg = PLANO_CONFIG[plano.id] || { destaque: false };
                  const selected = payload.planoId === plano.id;
                  return (
                    <button
                      key={plano.id}
                      type="button"
                      className={`comparator-card ${selected ? 'comp-selected' : ''} ${cfg.destaque ? 'comp-destaque' : ''}`}
                      onClick={() => updateField('planoId', plano.id)}
                    >
                      {cfg.badge && (
                        <div className="comp-badge" style={{ background: cfg.badgeColor ?? '#f6d66f', color: '#1a1000' }}>
                          {cfg.badge}
                        </div>
                      )}
                      <div className="comp-nome">{plano.nome}</div>
                      <div className="comp-preco">
                        <span className="comp-moeda">{plano.moeda}</span>
                        <span className="comp-valor">{plano.precoMensal.toLocaleString('pt-BR')}</span>
                        <span className="comp-periodo">/mês</span>
                      </div>
                      <div className="comp-meta">
                        {plano.limiteUsuarios} usuário{plano.limiteUsuarios !== 1 ? 's' : ''} ·{' '}
                        {plano.limiteEmpresas === 999 ? 'ilimitado' : plano.limiteEmpresas} empresa{plano.limiteEmpresas !== 1 ? 's' : ''}
                      </div>
                      {cfg.economia && <div className="comp-economia">{cfg.economia}</div>}
                      <div className={`comp-select-indicator ${selected ? 'sel-active' : ''}`}>
                        {selected ? '● Selecionado' : 'Selecionar'}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Tabela de comparação de features */}
            {!carregandoDados && planos.length > 0 && (
              <div className="feature-matrix-wrap">
                <h3>Comparativo de recursos</h3>
                <div className="feature-matrix-scroll">
                  <table className="feature-matrix">
                    <thead>
                      <tr>
                        <th>Recurso</th>
                        {planos.map((p) => (
                          <th key={p.id} className={payload.planoId === p.id ? 'fm-th-selected' : ''}>
                            {p.nome}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {FEATURE_MATRIX.map((row) => (
                        <tr key={row.label}>
                          <td className="fm-label">{row.label}</td>
                          {planos.map((p) => {
                            const val = (row as Record<string, string>)[p.id] ?? '–';
                            const isCheck = val === '✓';
                            const isDash = val === '–';
                            return (
                              <td
                                key={p.id}
                                className={`fm-cell ${payload.planoId === p.id ? 'fm-cell-selected' : ''} ${isCheck ? 'fm-check' : ''} ${isDash ? 'fm-dash' : ''}`}
                              >
                                {val}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Simulador de ROI */}
            <div className="roi-simulator">
              <h3>📈 Simulador de Economia e ROI</h3>
              <p className="roi-desc">Estime o retorno financeiro com base na sua operação atual.</p>
              <div className="roi-inputs">
                <label>
                  <span>Qtd de vendedores</span>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={vendedores}
                    onChange={(e) => setVendedores(Math.max(1, Number(e.target.value)))}
                  />
                </label>
                <label>
                  <span>Ticket médio (R$)</span>
                  <input
                    type="number"
                    min={10}
                    max={100000}
                    value={ticketMedio}
                    onChange={(e) => setTicketMedio(Math.max(10, Number(e.target.value)))}
                  />
                </label>
              </div>

              {roiSimulado && (
                <div className="roi-results">
                  <div className="roi-card">
                    <span className="roi-card-label">Custo manual estimado/mês</span>
                    <span className="roi-card-val roi-red">R$ {roiSimulado.custoManual.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="roi-card">
                    <span className="roi-card-label">Investimento no plano</span>
                    <span className="roi-card-val roi-blue">R$ {roiSimulado.planoMensal.toLocaleString('pt-BR')}/mês</span>
                  </div>
                  <div className="roi-card roi-card-highlight">
                    <span className="roi-card-label">💰 Economia mensal</span>
                    <span className="roi-card-val roi-green">
                      R$ {Math.max(0, roiSimulado.economia).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="roi-card roi-card-highlight">
                    <span className="roi-card-label">🚀 ROI estimado</span>
                    <span className="roi-card-val roi-gold">{Math.max(0, roiSimulado.roi)}%</span>
                  </div>
                  <div className="roi-card">
                    <span className="roi-card-label">📦 Ganho c/ automação de vendas</span>
                    <span className="roi-card-val roi-green">+ R$ {roiSimulado.ganhoExtra.toLocaleString('pt-BR')}/mês</span>
                  </div>
                </div>
              )}
            </div>

            <div className="stage-footer">
              <button
                type="button"
                className="btn-primary btn-lg"
                disabled={!payload.planoId || carregandoDados}
                onClick={() => setEtapa(1)}
              >
                Continuar com {planoSelecionado?.nome || 'plano selecionado'} →
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            ETAPA 1 — Dados da Empresa e do Administrador
        ══════════════════════════════════════════════════════ */}
        {etapa === 1 && (
          <div className="funnel-stage">
            {planoSelecionado && (
              <div className="selected-plan-banner">
                <span>Plano selecionado:</span>
                <strong>{planoSelecionado.nome}</strong>
                <span className="banner-price">
                  {planoSelecionado.moeda} {planoSelecionado.precoMensal.toLocaleString('pt-BR')}/mês
                </span>
                <button type="button" className="btn-ghost btn-sm" onClick={() => setEtapa(0)}>
                  Trocar plano
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="funnel-form-v2">
              <div className="form-section">
                <h3>🏢 Dados da empresa</h3>
                <div className="form-row-2">
                  <div className="form-field">
                    <label>Razão Social / Nome Fantasia *</label>
                    <input
                      placeholder="Ex: Pet Shop Alegria Ltda"
                      value={payload.empresaNome}
                      onChange={(e) => updateField('empresaNome', e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>CNPJ (opcional)</label>
                    <input
                      placeholder="00.000.000/0000-00"
                      value={payload.empresaCnpj}
                      onChange={(e) => updateField('empresaCnpj', e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-row-3">
                  <div className="form-field">
                    <label>País</label>
                    <select value={payload.pais} onChange={(e) => updateField('pais', e.target.value)}>
                      <option value="BR">🇧🇷 Brasil</option>
                      <option value="US">🇺🇸 Estados Unidos</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Moeda</label>
                    <select value={payload.moeda} onChange={(e) => updateField('moeda', e.target.value)}>
                      <option value="BRL">BRL — Real</option>
                      <option value="USD">USD — Dólar</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Pagamento via PIX</label>
                    <select
                      value={payload.precisaPix ? 'sim' : 'nao'}
                      onChange={(e) => updateField('precisaPix', e.target.value === 'sim')}
                    >
                      <option value="sim">✓ Quero PIX / instantâneo</option>
                      <option value="nao">Não necessário</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>👤 Administrador principal</h3>
                <div className="form-row-2">
                  <div className="form-field">
                    <label>Nome completo *</label>
                    <input
                      placeholder="Ex: Ana Lima"
                      value={payload.adminNome}
                      onChange={(e) => updateField('adminNome', e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>E-mail de acesso *</label>
                    <input
                      type="email"
                      placeholder="ana@empresa.com.br"
                      value={payload.adminEmail}
                      onChange={(e) => updateField('adminEmail', e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-row-2">
                  <div className="form-field">
                    <label>Senha inicial *</label>
                    <input
                      type="password"
                      placeholder="Mínimo 8 caracteres"
                      value={payload.adminSenha}
                      onChange={(e) => updateField('adminSenha', e.target.value)}
                      required
                      minLength={8}
                    />
                    {payload.adminSenha && (
                      <div className="senha-forca">
                        <div className="senha-bar">
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className="senha-seg"
                              style={{ background: i <= forcaSenha ? forcaColor : 'rgba(255,255,255,0.1)' }}
                            />
                          ))}
                        </div>
                        <span style={{ color: forcaColor }}>{forcaLabel}</span>
                      </div>
                    )}
                  </div>
                  <div className="form-field">
                    <label>Gateway de pagamento</label>
                    <select
                      value={payload.providerPreferido}
                      onChange={(e) => updateField('providerPreferido', e.target.value)}
                    >
                      <option value="">⚡ Automático (recomendado)</option>
                      <option value="ASAAS">Asaas</option>
                      <option value="MERCADO_PAGO">Mercado Pago</option>
                      <option value="STRIPE">Stripe</option>
                      <option value="PAYPAL">PayPal</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section lgpd-section">
                <h3>🔒 Consentimento LGPD</h3>
                <p className="lgpd-info">
                  Seus dados são tratados exclusivamente para execução do contrato de prestação de serviço,
                  com base legal no Art. 7º, V da Lei 13.709/2018 (LGPD). Você pode solicitar exclusão,
                  portabilidade ou auditoria a qualquer momento.
                </p>
                <label className="checkbox-row-v2">
                  <input
                    type="checkbox"
                    checked={payload.consentimentoLgpd}
                    onChange={(e) => updateField('consentimentoLgpd', e.target.checked)}
                    required
                  />
                  <span>
                    Concordo com o tratamento dos dados acima para execução do contrato de assinatura SalesMind.
                  </span>
                </label>
              </div>

              <div className="stage-footer">
                <button type="button" className="btn-ghost" onClick={() => setEtapa(0)}>
                  ← Voltar
                </button>
                <button type="submit" className="btn-primary btn-lg" disabled={loading}>
                  {loading ? '⏳ Processando...' : 'Continuar para pagamento →'}
                </button>
              </div>
            </form>

            {mensagem && !checkoutUrl && (
              <p className="feedback-msg feedback-error">{mensagem}</p>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            ETAPA 2 — Checkout / Confirmação
        ══════════════════════════════════════════════════════ */}
        {etapa === 2 && (
          <div className="funnel-stage checkout-stage">
            <div className="checkout-icon">🎉</div>
            <h2>Tudo pronto! Conclua o pagamento para ativar sua empresa.</h2>
            <p className="checkout-desc">{mensagem}</p>

            {planoSelecionado && (
              <div className="checkout-summary">
                <div className="cs-row"><span>Empresa</span><strong>{payload.empresaNome}</strong></div>
                <div className="cs-row"><span>Plano</span><strong>{planoSelecionado.nome}</strong></div>
                <div className="cs-row">
                  <span>Valor</span>
                  <strong>{planoSelecionado.moeda} {planoSelecionado.precoMensal.toLocaleString('pt-BR')}/mês</strong>
                </div>
                <div className="cs-row"><span>Administrador</span><strong>{payload.adminEmail}</strong></div>
                {preferencias && (
                  <div className="cs-row">
                    <span>Gateway</span>
                    <strong>{payload.providerPreferido || 'Automático'}</strong>
                  </div>
                )}
              </div>
            )}

            {checkoutUrl && (
              <>
                <button
                  type="button"
                  className="btn-checkout btn-lg"
                  onClick={abrirCheckout}
                >
                  💳 Abrir checkout da assinatura
                </button>
                <p className="checkout-link-fallback">
                  Se o botão não abrir, acesse direto:{' '}
                  <a href={normalizeCheckoutUrl(checkoutUrl)} target="_blank" rel="noopener noreferrer">
                    abrir checkout
                  </a>
                </p>
              </>
            )}

            <div className="checkout-timeline">
              <div className="ct-step ct-done">✓ Cadastro iniciado</div>
              <div className={`ct-step ${checkoutUrl ? 'ct-pending' : 'ct-waiting'}`}>
                {checkoutUrl ? '⏳ Aguardando pagamento' : '...'}
              </div>
              <div className="ct-step ct-waiting">🏢 Empresa ativada automaticamente</div>
              <div className="ct-step ct-waiting">🔑 Credenciais enviadas por e-mail</div>
            </div>

            <div className="stage-footer" style={{ justifyContent: 'center', marginTop: '32px' }}>
              <button type="button" className="btn-ghost" onClick={onVoltarLogin}>
                Voltar ao login
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default OnboardingFunnel;
