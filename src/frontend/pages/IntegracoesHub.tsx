import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

type Segment = 'hub' | 'marketplaces' | 'gateways' | 'banks' | 'webhooks';

type Provider = {
  id: string;
  nome: string;
  segmento: Exclude<Segment, 'hub'>;
  modo: 'oauth2_standard' | 'oauth2_shop_domain' | 'api_key' | 'manual';
  descricao: string;
  docsUrl: string;
  scopes: string[];
  requisitos: string[];
  antiBlockChecks: string[];
  webhookPath?: string;
  configured: boolean;
  missing?: string[];
};

type ConnectResult = {
  providerId: string;
  providerName: string;
  ready: boolean;
  url: string;
  missing: string[];
  warning?: string;
};

type TestResult = {
  providerId: string;
  providerName: string;
  url: string;
  reachable: boolean;
  status: number | null;
  ok: boolean;
  note: string;
};

type IntegracoesStatus = {
  total: number;
  configuredCount: number;
  pendingCount: number;
};

type ContaIntegrada = {
  id: string;
  userId: string;
  providerId: string;
  providerName: string;
  externalAccountId: string;
  status: string;
  scope?: string;
  metadata?: Record<string, any>;
  connectedAt: string;
  updatedAt: string;
};

interface IntegracoesHubProps {
  initialSection?: Segment;
}

const tabs: Array<{ id: Segment; label: string }> = [
  { id: 'hub', label: 'HUB' },
  { id: 'marketplaces', label: 'Marketplaces' },
  { id: 'gateways', label: 'Gateways' },
  { id: 'banks', label: 'Bancos e Open Finance' },
  { id: 'webhooks', label: 'Webhooks' },
];

const cardStyle: React.CSSProperties = {
  border: '1px solid #d6dce5',
  borderRadius: 12,
  padding: 16,
  backgroundColor: '#ffffff',
  boxShadow: '0 2px 6px rgba(16, 24, 40, 0.05)',
};

const IntegracoesHub: React.FC<IntegracoesHubProps> = ({ initialSection = 'hub' }) => {
  const [segment, setSegment] = useState<Segment>(initialSection);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [busyProviderId, setBusyProviderId] = useState('');
  const [busyAllTests, setBusyAllTests] = useState(false);
  const [connectResultByProvider, setConnectResultByProvider] = useState<Record<string, ConnectResult>>({});
  const [testResultByProvider, setTestResultByProvider] = useState<Record<string, TestResult>>({});
  const [statusResumo, setStatusResumo] = useState<IntegracoesStatus | null>(null);
  const [contasIntegradas, setContasIntegradas] = useState<ContaIntegrada[]>([]);
  const [callbackInfo, setCallbackInfo] = useState('');

  useEffect(() => {
    setSegment(initialSection);
  }, [initialSection]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const loadProviders = async () => {
      try {
        setLoading(true);
        setErrorMsg('');
        const [response, status, accounts] = await Promise.all([
          api.get(`/integracoes/providers?segment=${segment}`, token),
          api.get('/integracoes/status', token),
          api.get('/integracoes/accounts', token),
        ]);
        setProviders(response.providers || []);
        setStatusResumo({
          total: status.total || 0,
          configuredCount: status.configuredCount || 0,
          pendingCount: status.pendingCount || 0,
        });
        setContasIntegradas(accounts.contas || []);
      } catch (error: any) {
        setErrorMsg(error?.message || 'Falha ao carregar integracoes.');
      } finally {
        setLoading(false);
      }
    };

    loadProviders();
  }, [segment]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('integracaoCallback') !== '1') return;

    const status = params.get('status') || 'desconhecido';
    const provider = params.get('provider') || 'provedor';
    const accountId = params.get('accountId') || '';
    const details = params.get('details') || '';

    if (status === 'sucesso') {
      setCallbackInfo(`Integracao confirmada com ${provider}${accountId ? ` (${accountId})` : ''}.`);
    } else {
      setCallbackInfo(`Falha no callback de ${provider}: ${details || 'erro nao informado'}.`);
    }

    params.delete('integracaoCallback');
    params.delete('status');
    params.delete('provider');
    params.delete('accountId');
    params.delete('details');
    const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState({}, '', next);
  }, []);

  const sectionSubtitle = useMemo(() => {
    if (segment === 'hub') return 'Visao unica para vinculos, testes tecnicos e checklist anti-bloqueio.';
    if (segment === 'marketplaces') return 'Conecte canais de venda e sincronize catalogo, pedidos e estoque.';
    if (segment === 'gateways') return 'Centralize recebimentos, conciliacao e eventos de pagamento.';
    if (segment === 'banks') return 'Prepare conectividade bancaria e fluxos com Open Finance.';
    return 'Configure endpoints e seguranca para eventos assinados dos provedores.';
  }, [segment]);

  const abrirConexao = async (provider: Provider) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setBusyProviderId(provider.id);
      let endpoint = `/integracoes/providers/${provider.id}/connect-url`;

      if (provider.modo === 'oauth2_shop_domain') {
        const shopDomain = window.prompt('Informe o dominio Shopify (ex: sua-loja.myshopify.com):', '');
        if (!shopDomain) {
          return;
        }
        endpoint = `${endpoint}?shopDomain=${encodeURIComponent(shopDomain.trim())}`;
      }

      const result: ConnectResult = await api.get(endpoint, token);
      setConnectResultByProvider((prev) => ({ ...prev, [provider.id]: result }));
      window.open(result.url, '_blank', 'noopener,noreferrer');
    } catch (error: any) {
      setErrorMsg(error?.message || 'Nao foi possivel gerar URL de conexao.');
    } finally {
      setBusyProviderId('');
    }
  };

  const testarTodos = async () => {
    const token = localStorage.getItem('token');
    if (!token || providers.length === 0) return;

    try {
      setBusyAllTests(true);
      const resultEntries = await Promise.all(
        providers.map(async (provider) => {
          try {
            const result: TestResult = await api.post(`/integracoes/providers/${provider.id}/test`, {}, token);
            return [provider.id, result] as const;
          } catch (error: any) {
            const fallback: TestResult = {
              providerId: provider.id,
              providerName: provider.nome,
              url: '',
              reachable: false,
              status: null,
              ok: false,
              note: error?.message || 'Falha no teste deste provedor.',
            };
            return [provider.id, fallback] as const;
          }
        })
      );

      setTestResultByProvider((prev) => {
        const next = { ...prev };
        resultEntries.forEach(([providerId, result]) => {
          next[providerId] = result;
        });
        return next;
      });
    } finally {
      setBusyAllTests(false);
    }
  };

  const testarAcesso = async (provider: Provider) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setBusyProviderId(provider.id);
      const result: TestResult = await api.post(`/integracoes/providers/${provider.id}/test`, {}, token);
      setTestResultByProvider((prev) => ({ ...prev, [provider.id]: result }));
    } catch (error: any) {
      setErrorMsg(error?.message || 'Falha no teste de acesso.');
    } finally {
      setBusyProviderId('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #0a2647 0%, #144272 60%, #205295 100%)', color: '#fff' }}>
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>Integracoes e HUB</h2>
        <p style={{ margin: 0, opacity: 0.92 }}>
          Mapa completo para conexoes com plataformas de e-commerce, pagamento e bancos, com validacoes para reduzir bloqueios futuros.
        </p>
        {statusResumo && (
          <div style={{ marginTop: 10, fontSize: 13, opacity: 0.95 }}>
            Prontidao geral: {statusResumo.configuredCount}/{statusResumo.total} configuradas, {statusResumo.pendingCount} pendentes.
          </div>
        )}
      </div>

      <div style={{ ...cardStyle }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSegment(tab.id)}
              style={{
                border: tab.id === segment ? '1px solid #0f5fc6' : '1px solid #c8d1dc',
                backgroundColor: tab.id === segment ? '#eaf3ff' : '#fff',
                color: '#1f2937',
                borderRadius: 999,
                padding: '8px 12px',
                cursor: 'pointer',
                fontWeight: tab.id === segment ? 700 : 500,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p style={{ margin: 0, color: '#4b5563' }}>{sectionSubtitle}</p>
      </div>

      {errorMsg && (
        <div style={{ ...cardStyle, border: '1px solid #f1b7b7', backgroundColor: '#fff2f2', color: '#8a1f1f' }}>
          {errorMsg}
        </div>
      )}

      {callbackInfo && (
        <div style={{ ...cardStyle, border: '1px solid #bfd8ff', backgroundColor: '#eef5ff', color: '#163b66' }}>
          {callbackInfo}
        </div>
      )}

      <div style={{ ...cardStyle }}>
        <h3 style={{ marginTop: 0, marginBottom: 10 }}>Contas Integradas</h3>
        {contasIntegradas.length === 0 && (
          <div style={{ color: '#4b5563' }}>Nenhuma conta vinculada ainda neste usuario.</div>
        )}
        {contasIntegradas.length > 0 && (
          <div style={{ display: 'grid', gap: 8 }}>
            {contasIntegradas.map((conta) => (
              <div key={conta.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 10 }}>
                <div style={{ fontWeight: 700 }}>{conta.providerName}</div>
                <div style={{ color: '#4b5563' }}>Conta: {conta.externalAccountId || 'nao identificado'}</div>
                <div style={{ color: '#4b5563' }}>Status: {conta.status}</div>
                {conta.scope && <div style={{ color: '#4b5563' }}>Scope: {conta.scope}</div>}
                <div style={{ color: '#4b5563' }}>Atualizado em: {new Date(conta.updatedAt).toLocaleString('pt-BR')}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ ...cardStyle }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>Checklist Senior Anti-Bloqueio</h3>
          <button
            type="button"
            onClick={testarTodos}
            disabled={busyAllTests || loading || providers.length === 0}
            style={{ border: '1px solid #1d4ed8', backgroundColor: '#1d4ed8', color: '#fff', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}
          >
            {busyAllTests ? 'Testando...' : 'Testar todos'}
          </button>
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, color: '#374151', lineHeight: 1.6 }}>
          <li>Redirect URI deve ser estatico e previamente cadastrado em cada app de integracao.</li>
          <li>State/nonce obrigatorio em OAuth e validacao de assinatura em todos os webhooks.</li>
          <li>Idempotencia em criacao de pedidos/cobrancas para evitar duplicidade por retry.</li>
          <li>Separar credenciais por ambiente (sandbox/producao) e rotacionar segredos periodicamente.</li>
          <li>Tratar 429/rate-limit com backoff exponencial e fila assicrona para reprocessamento.</li>
        </ul>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {loading && <div style={{ ...cardStyle }}>Carregando provedores...</div>}

        {!loading && providers.length === 0 && (
          <div style={{ ...cardStyle }}>Nenhuma integracao disponivel para este modulo.</div>
        )}

        {!loading && providers.map((provider) => {
          const connectResult = connectResultByProvider[provider.id];
          const testResult = testResultByProvider[provider.id];

          return (
            <div key={provider.id} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
                <div>
                  <h3 style={{ marginTop: 0, marginBottom: 6 }}>{provider.nome}</h3>
                  <p style={{ marginTop: 0, marginBottom: 8, color: '#4b5563' }}>{provider.descricao}</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, backgroundColor: '#eef2ff', color: '#1d4ed8', padding: '4px 8px', borderRadius: 999 }}>
                      {provider.segmento}
                    </span>
                    <span style={{ fontSize: 12, backgroundColor: provider.configured ? '#e8f7ea' : '#fff7e8', color: provider.configured ? '#166534' : '#92400e', padding: '4px 8px', borderRadius: 999 }}>
                      {provider.configured ? 'credenciais detectadas' : 'credenciais pendentes'}
                    </span>
                    <span style={{ fontSize: 12, backgroundColor: '#f3f4f6', color: '#374151', padding: '4px 8px', borderRadius: 999 }}>
                      modo: {provider.modo}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'end' }}>
                  <button
                    type="button"
                    onClick={() => abrirConexao(provider)}
                    disabled={busyProviderId === provider.id}
                    style={{ border: '1px solid #0f5fc6', backgroundColor: '#0f5fc6', color: '#fff', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}
                  >
                    Conectar
                  </button>
                  <button
                    type="button"
                    onClick={() => testarAcesso(provider)}
                    disabled={busyProviderId === provider.id}
                    style={{ border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#111827', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}
                  >
                    Testar acesso
                  </button>
                  <button
                    type="button"
                    onClick={() => window.open(provider.docsUrl, '_blank', 'noopener,noreferrer')}
                    style={{ border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#111827', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}
                  >
                    Docs oficiais
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                <div style={{ color: '#374151' }}>
                  <strong>Requisitos:</strong> {provider.requisitos.join(' | ')}
                </div>
                <div style={{ color: '#374151' }}>
                  <strong>Checks anti-bloqueio:</strong> {provider.antiBlockChecks.join(' | ')}
                </div>
                {provider.scopes.length > 0 && (
                  <div style={{ color: '#374151' }}>
                    <strong>Scopes sugeridos:</strong> {provider.scopes.join(', ')}
                  </div>
                )}
                {provider.webhookPath && (
                  <div style={{ color: '#374151' }}>
                    <strong>Webhook sugerido:</strong> {provider.webhookPath}
                  </div>
                )}
              </div>

              {connectResult && (
                <div style={{ marginTop: 12, padding: 10, borderRadius: 8, backgroundColor: connectResult.ready ? '#edfdf0' : '#fff8e8', color: '#1f2937' }}>
                  <div><strong>Conexao:</strong> {connectResult.ready ? 'pronta para vinculo' : 'revisar pendencias antes do vinculo'}</div>
                  {connectResult.missing.length > 0 && <div>Pendencias: {connectResult.missing.join(', ')}</div>}
                  {connectResult.warning && <div>Nota: {connectResult.warning}</div>}
                </div>
              )}

              {!connectResult && provider.missing && provider.missing.length > 0 && (
                <div style={{ marginTop: 12, padding: 10, borderRadius: 8, backgroundColor: '#fff8e8', color: '#1f2937' }}>
                  <div><strong>Pendencias de configuracao:</strong> {provider.missing.join(', ')}</div>
                </div>
              )}

              {testResult && (
                <div style={{ marginTop: 12, padding: 10, borderRadius: 8, backgroundColor: testResult.reachable ? '#edfdf0' : '#fff2f2', color: '#1f2937' }}>
                  <div><strong>Teste tecnico:</strong> {testResult.reachable ? 'host acessivel' : 'host indisponivel'}</div>
                  <div>Status HTTP: {testResult.status ?? 'sem resposta'}</div>
                  <div>{testResult.note}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IntegracoesHub;
