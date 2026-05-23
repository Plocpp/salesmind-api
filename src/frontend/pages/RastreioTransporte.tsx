import { FileText, MapPin, Navigation, RefreshCw, ShieldCheck, Smartphone } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

type Entregador = {
  id: string;
  nome: string;
  ativo: boolean;
  telefone?: string;
  email?: string;
};

type SessaoAtiva = {
  sessaoId: string;
  entregadorId: string;
  entregadorNome: string;
  dispositivoId: string;
  vendaId?: string;
  iniciadaEm: string;
  conexaoStatus?: 'ONLINE' | 'DESATUALIZADA' | 'SEM_PONTOS';
  minutosSemAtualizar?: number | null;
  ultimoPonto?: {
    latitude: number;
    longitude: number;
    precisao?: number | null;
    velocidade?: number | null;
    bateria?: number | null;
    fonte?: string | null;
    registradoEm: string;
    nota?: string | null;
  } | null;
};

type PontoSessao = {
  id: string;
  latitude: number;
  longitude: number;
  precisao?: number | null;
  velocidade?: number | null;
  direcao?: number | null;
  bateria?: number | null;
  fonte?: string | null;
  registradoEm: string;
  nota?: string | null;
};

type Dispositivo = {
  id: string;
  entregadorId: string;
  entregadorNome: string;
  nomeDispositivo?: string;
  plataforma: string;
  deviceId?: string;
  ativo: boolean;
  ultimoPingEm?: string;
};

type ResumoRastreio = {
  totalAtivas: number;
  online: number;
  semPontos: number;
  desatualizadas: number;
  staleMinutes: number;
  checkedAt: string;
};

const panel: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #d9e2e1',
  borderRadius: 8,
  boxShadow: '0 8px 24px rgba(36,51,50,.05)',
};

const buttonPrimary: React.CSSProperties = {
  height: 38,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  border: 'none',
  background: '#2f6f73',
  color: '#fff',
  borderRadius: 8,
  padding: '0 14px',
  cursor: 'pointer',
  fontWeight: 800,
};

const buttonSecondary: React.CSSProperties = {
  height: 36,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  border: '1px solid #c7d5d2',
  background: '#fff',
  color: '#2f6f73',
  borderRadius: 8,
  padding: '0 12px',
  cursor: 'pointer',
  fontWeight: 700,
};

const input: React.CSSProperties = {
  width: '100%',
  height: 36,
  border: '1px solid #c7d5d2',
  borderRadius: 8,
  padding: '0 10px',
  background: '#fff',
  color: '#243332',
  boxSizing: 'border-box',
};

const parseApiError = (error: unknown, fallback: string) => {
  if (!(error instanceof Error)) return fallback;
  const raw = error.message || '';
  const jsonStart = raw.indexOf('{');
  if (jsonStart >= 0) {
    try {
      const parsed = JSON.parse(raw.slice(jsonStart));
      if (typeof parsed?.error === 'string' && parsed.error) {
        return parsed.error;
      }
    } catch {
      return raw;
    }
  }
  return raw || fallback;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR');
};

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const buildMapaHtml = (pontos: Array<{ latitude: number; longitude: number; titulo: string; nota?: string | null; atualizadoEm?: string | null }>) => {
  const serialized = JSON.stringify(pontos.map((ponto) => ({
    ...ponto,
    titulo: escapeHtml(ponto.titulo),
    nota: ponto.nota ? escapeHtml(ponto.nota) : null,
    atualizadoEm: ponto.atualizadoEm ? escapeHtml(ponto.atualizadoEm) : null,
  })));
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
  <style>
    html, body, #map { height: 100%; margin: 0; }
    body { background: #e9efee; font-family: Arial, sans-serif; }
    .tag { display:inline-block; margin-top:6px; padding:4px 8px; border-radius:999px; background:#e5f4ef; color:#245e5c; font-size:12px; font-weight:700; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
  <script>
    const pontos = ${serialized};
    const map = L.map('map', { zoomControl: true }).setView([-14.235, -51.9253], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
    const bounds = [];
    pontos.forEach((p) => {
      if (typeof p.latitude !== 'number' || typeof p.longitude !== 'number') return;
      const marker = L.marker([p.latitude, p.longitude]).addTo(map);
      const popup = '<div><strong>' + (p.titulo || 'Motorista') + '</strong><br />' +
        'Lat: ' + p.latitude.toFixed(6) + '<br />' +
        'Lng: ' + p.longitude.toFixed(6) + '<br />' +
        (p.nota ? '<div class="tag">Nota: ' + p.nota + '</div>' : '') +
        (p.atualizadoEm ? '<div style="margin-top:6px;color:#647674;font-size:12px;">Atualizado em ' + p.atualizadoEm + '</div>' : '') +
      '</div>';
      marker.bindPopup(popup);
      bounds.push([p.latitude, p.longitude]);
    });
    if (bounds.length) {
      map.fitBounds(bounds, { padding: [24, 24] });
    }
  </script>
</body>
</html>`;
};

export default function RastreioTransporte() {
  const [entregadores, setEntregadores] = useState<Entregador[]>([]);
  const [sessoes, setSessoes] = useState<SessaoAtiva[]>([]);
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [selectedSessaoId, setSelectedSessaoId] = useState('');
  const [pontosSessao, setPontosSessao] = useState<PontoSessao[]>([]);
  const [mapaLoading, setMapaLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');
  const [resumo, setResumo] = useState<ResumoRastreio | null>(null);
  const [novoTokenGerado, setNovoTokenGerado] = useState<string | null>(null);
  const [form, setForm] = useState({
    entregadorId: '',
    nomeDispositivo: '',
    plataforma: 'ANDROID',
    deviceId: '',
  });

  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole') || '';

  const carregarTudo = async () => {
    try {
      setLoading(true);
      setErro('');

      const [entregadoresData, sessoesData, dispositivosData] = await Promise.all([
        api.get('/rastreio/entregadores', token),
        api.get('/rastreio/sessoes/ativas', token),
        api.get('/rastreio/dispositivos', token),
      ]);

      const resumoData = await api.get('/rastreio/resumo?staleMinutes=5', token);

      setEntregadores(Array.isArray(entregadoresData) ? entregadoresData : []);
      setSessoes(Array.isArray(sessoesData) ? sessoesData : []);
      setDispositivos(Array.isArray(dispositivosData) ? dispositivosData : []);
      setResumo(resumoData || null);

      if (!selectedSessaoId && Array.isArray(sessoesData) && sessoesData[0]?.sessaoId) {
        setSelectedSessaoId(sessoesData[0].sessaoId);
      }

      if (!form.entregadorId && Array.isArray(entregadoresData) && entregadoresData[0]?.id) {
        setForm((current) => ({ ...current, entregadorId: entregadoresData[0].id }));
      }
    } catch (error) {
      console.error(error);
      setErro(parseApiError(error, 'Falha ao carregar dados de rastreio.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarTudo();
  }, []);

  useEffect(() => {
    if (!selectedSessaoId && sessoes[0]?.sessaoId) {
      setSelectedSessaoId(sessoes[0].sessaoId);
    }
  }, [sessoes, selectedSessaoId]);

  useEffect(() => {
    const carregarPontos = async () => {
      if (!selectedSessaoId) {
        setPontosSessao([]);
        return;
      }

      try {
        setMapaLoading(true);
        const pontosData = await api.get(`/rastreio/sessoes/${selectedSessaoId}/pontos?limit=80`, token);
        setPontosSessao(Array.isArray(pontosData) ? pontosData : []);
      } catch (error) {
        console.error(error);
        setPontosSessao([]);
      } finally {
        setMapaLoading(false);
      }
    };

    carregarPontos();
  }, [selectedSessaoId, token]);

  const onlineAgora = useMemo(() => (
    sessoes.filter((sessao) => Boolean(sessao.ultimoPonto)).length
  ), [sessoes]);

  const pontosMapa = useMemo(() => (
    sessoes
      .filter((sessao) => sessao.ultimoPonto)
      .map((sessao) => ({
        latitude: sessao.ultimoPonto!.latitude,
        longitude: sessao.ultimoPonto!.longitude,
        titulo: sessao.entregadorNome,
        nota: sessao.ultimoPonto?.nota || null,
        atualizadoEm: sessao.ultimoPonto?.registradoEm || null,
      }))
  ), [sessoes]);

  const mapaHtml = useMemo(() => buildMapaHtml(pontosMapa), [pontosMapa]);

  const notasSessao = useMemo(() => pontosSessao.filter((ponto) => Boolean(ponto.nota)), [pontosSessao]);

  const gerarTokenDispositivo = async () => {
    if (!form.entregadorId) {
      alert('Selecione um entregador para gerar o token.');
      return;
    }

    try {
      setSaving(true);
      setNovoTokenGerado(null);
      const response = await api.post('/rastreio/dispositivos', {
        entregadorId: form.entregadorId,
        nomeDispositivo: form.nomeDispositivo || undefined,
        plataforma: form.plataforma,
        deviceId: form.deviceId || undefined,
      }, token);

      setNovoTokenGerado(response?.token || null);
      await carregarTudo();
    } catch (error) {
      console.error(error);
      alert(parseApiError(error, 'Nao foi possivel gerar token de rastreio.'));
    } finally {
      setSaving(false);
    }
  };

  const revogarDispositivo = async (dispositivoId: string) => {
    if (!window.confirm('Deseja revogar este dispositivo de rastreio?')) return;

    try {
      await api.post(`/rastreio/dispositivos/${dispositivoId}/revogar`, {}, token);
      await carregarTudo();
    } catch (error) {
      console.error(error);
      alert(parseApiError(error, 'Falha ao revogar dispositivo.'));
    }
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, color: '#243332', fontSize: 26 }}>Rastreio de Transporte</h1>
          <p style={{ margin: '6px 0 0', color: '#647674' }}>
            Monitoramento em segundo plano para app de entregadores com token por dispositivo.
          </p>
        </div>
        <div style={{ display: 'grid', gap: 8, justifyItems: 'end' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 999, background: '#e8f3f0', color: '#245e5c', fontWeight: 800, fontSize: 12 }}>
            <ShieldCheck size={15} /> Painel administrativo
          </div>
          <button onClick={carregarTudo} style={buttonSecondary} disabled={loading}>
            <RefreshCw size={16} /> Atualizar
          </button>
        </div>
      </header>

      <section style={{ ...panel, padding: 14, background: 'linear-gradient(135deg, #f8fbfa 0%, #eef7f4 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#245e5c', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Acesso restrito
            </div>
            <h3 style={{ margin: '6px 0 4px', color: '#243332' }}>Operação sob governança da administração</h3>
            <div style={{ color: '#647674', fontSize: 13, maxWidth: 760 }}>
              Este painel consolida rastreamento, dispositivos e notas de entrega para auditoria, suporte e decisão operacional.
            </div>
          </div>

          <div style={{ minWidth: 220, display: 'grid', gap: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              <div style={{ border: '1px solid #d9e2e1', borderRadius: 10, padding: 10, background: '#fff' }}>
                <div style={{ color: '#647674', fontSize: 11 }}>Perfil</div>
                <div style={{ marginTop: 4, color: '#243332', fontWeight: 800 }}>{userRole || 'ADMIN'}</div>
              </div>
              <div style={{ border: '1px solid #d9e2e1', borderRadius: 10, padding: 10, background: '#fff' }}>
                <div style={{ color: '#647674', fontSize: 11 }}>Escopo</div>
                <div style={{ marginTop: 4, color: '#243332', fontWeight: 800 }}>Mapa + notas</div>
              </div>
            </div>
            <div style={{ color: '#647674', fontSize: 12, textAlign: 'right' }}>
              Dica: use a aba de dispositivos para revogar acessos em caso de troca de aparelho.
            </div>
          </div>
        </div>
      </section>

      {erro && (
        <div style={{ ...panel, padding: 12, color: '#8a4b20', background: '#fff8ed' }}>{erro}</div>
      )}

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div style={{ ...panel, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#647674', fontSize: 12 }}>
            Sessoes ativas
            <Navigation size={16} color="#2f6f73" />
          </div>
          <div style={{ marginTop: 8, fontSize: 24, fontWeight: 900, color: '#243332' }}>{sessoes.length}</div>
        </div>

        <div style={{ ...panel, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#647674', fontSize: 12 }}>
            Entregadores online
            <Smartphone size={16} color="#2f6f73" />
          </div>
          <div style={{ marginTop: 8, fontSize: 24, fontWeight: 900, color: '#243332' }}>{resumo?.online ?? onlineAgora}</div>
        </div>

        <div style={{ ...panel, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#647674', fontSize: 12 }}>
            Dispositivos ativos
            <ShieldCheck size={16} color="#2f6f73" />
          </div>
          <div style={{ marginTop: 8, fontSize: 24, fontWeight: 900, color: '#243332' }}>
            {dispositivos.filter((item) => item.ativo).length}
          </div>
        </div>

        <div style={{ ...panel, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#647674', fontSize: 12 }}>
            Sessoes desatualizadas
            <Navigation size={16} color="#a64b4b" />
          </div>
          <div style={{ marginTop: 8, fontSize: 24, fontWeight: 900, color: '#a64b4b' }}>{resumo?.desatualizadas ?? 0}</div>
        </div>
      </section>

      {resumo && (
        <div style={{ ...panel, padding: 10, fontSize: 12, color: '#647674' }}>
          Janela de stale: {resumo.staleMinutes} min | sem pontos: {resumo.semPontos} | atualizado em {formatDateTime(resumo.checkedAt)}
        </div>
      )}

      <section style={{ ...panel, padding: 14, display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, color: '#243332' }}>Central de rastreamento</h3>
            <div style={{ color: '#647674', fontSize: 12 }}>
              Mapa com a ultima posicao das sessoes ativas e notas registradas no celular do motorista.
            </div>
          </div>

          <div style={{ minWidth: 260, display: 'grid', gap: 6 }}>
            <label style={{ color: '#647674', fontSize: 12, fontWeight: 700 }}>Sessao para notas</label>
            <select
              value={selectedSessaoId}
              onChange={(event) => setSelectedSessaoId(event.target.value)}
              style={input}
            >
              <option value="">Selecione uma sessao</option>
              {sessoes.map((sessao) => (
                <option key={sessao.sessaoId} value={sessao.sessaoId}>
                  {sessao.entregadorNome} - {formatDateTime(sessao.iniciadaEm)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ border: '1px solid #d9e2e1', borderRadius: 12, overflow: 'hidden', minHeight: 460, background: '#e9efee' }}>
          {mapaLoading ? (
            <div style={{ padding: 20, color: '#647674' }}>Carregando mapa...</div>
          ) : (
            <iframe
              title="Mapa operacional de rastreio"
              srcDoc={mapaHtml}
              style={{ width: '100%', height: 460, border: 0, display: 'block' }}
            />
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          <div style={{ border: '1px solid #d9e2e1', borderRadius: 12, padding: 12, background: '#f8faf9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#243332', fontWeight: 800 }}>
              <FileText size={16} /> Notas da sessao selecionada
            </div>

            {notasSessao.length > 0 ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {notasSessao.slice(0, 12).map((ponto) => (
                  <div key={ponto.id} style={{ border: '1px solid #d9e2e1', borderRadius: 10, padding: 10, background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <strong style={{ color: '#243332' }}>{formatDateTime(ponto.registradoEm)}</strong>
                      <span style={{ color: '#647674', fontSize: 12 }}>{ponto.fonte || 'GPS'}</span>
                    </div>
                    <div style={{ marginTop: 6, color: '#243332', fontSize: 13 }}>{ponto.nota}</div>
                    <div style={{ marginTop: 6, color: '#647674', fontSize: 12 }}>
                      {ponto.latitude.toFixed(6)}, {ponto.longitude.toFixed(6)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#647674', fontSize: 13 }}>
                Nenhuma nota encontrada na sessao selecionada.
              </div>
            )}
          </div>

          <div style={{ border: '1px solid #d9e2e1', borderRadius: 12, padding: 12, background: '#f8faf9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#243332', fontWeight: 800 }}>
              <MapPin size={16} /> Visao rapida da ultima posicao
            </div>

            {sessoes.filter((sessao) => sessao.ultimoPonto).length > 0 ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {sessoes.filter((sessao) => sessao.ultimoPonto).slice(0, 8).map((sessao) => (
                  <div key={sessao.sessaoId} style={{ border: '1px solid #d9e2e1', borderRadius: 10, padding: 10, background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <strong style={{ color: '#243332' }}>{sessao.entregadorNome}</strong>
                      <span style={{ color: '#647674', fontSize: 12 }}>{sessao.conexaoStatus || 'SEM_PONTOS'}</span>
                    </div>
                    <div style={{ marginTop: 6, color: '#647674', fontSize: 12 }}>
                      {sessao.ultimoPonto?.latitude.toFixed(6)}, {sessao.ultimoPonto?.longitude.toFixed(6)}
                    </div>
                    {sessao.ultimoPonto?.nota ? (
                      <div style={{ marginTop: 6, color: '#243332', fontSize: 13 }}>Nota: {sessao.ultimoPonto.nota}</div>
                    ) : (
                      <div style={{ marginTop: 6, color: '#8a9b99', fontSize: 12 }}>Sem nota nesta ultima posicao.</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#647674', fontSize: 13 }}>Nenhuma posicao disponivel no momento.</div>
            )}
          </div>
        </div>
      </section>

      <section style={{ ...panel, padding: 14, display: 'grid', gap: 10 }}>
        <h3 style={{ margin: '0 0 2px', color: '#243332' }}>Gerar token de dispositivo</h3>
        <div style={{ color: '#647674', fontSize: 12 }}>
          Gere o token e informe no app instalado no smartphone do entregador.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 8 }}>
          <select
            value={form.entregadorId}
            onChange={(event) => setForm((current) => ({ ...current, entregadorId: event.target.value }))}
            style={input}
          >
            <option value="">Selecione o entregador</option>
            {entregadores.map((entregador) => (
              <option key={entregador.id} value={entregador.id}>
                {entregador.nome}
              </option>
            ))}
          </select>

          <input
            value={form.nomeDispositivo}
            onChange={(event) => setForm((current) => ({ ...current, nomeDispositivo: event.target.value }))}
            placeholder="Nome do aparelho"
            style={input}
          />

          <select
            value={form.plataforma}
            onChange={(event) => setForm((current) => ({ ...current, plataforma: event.target.value }))}
            style={input}
          >
            <option value="ANDROID">ANDROID</option>
            <option value="IOS">IOS</option>
            <option value="OUTRO">OUTRO</option>
          </select>

          <input
            value={form.deviceId}
            onChange={(event) => setForm((current) => ({ ...current, deviceId: event.target.value }))}
            placeholder="Device ID (opcional)"
            style={input}
          />
        </div>

        <div>
          <button onClick={gerarTokenDispositivo} style={buttonPrimary} disabled={saving}>
            {saving ? 'Gerando...' : 'Gerar token'}
          </button>
        </div>

        {novoTokenGerado && (
          <div style={{ border: '1px solid #b7d8ce', background: '#ecf8f4', borderRadius: 8, padding: 10, color: '#214f47' }}>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>Token gerado (mostrar apenas uma vez)</div>
            <code style={{ wordBreak: 'break-all' }}>{novoTokenGerado}</code>
          </div>
        )}
      </section>

      <section style={{ ...panel, padding: 14 }}>
        <h3 style={{ marginTop: 0, color: '#243332' }}>Sessoes de rastreio ativas</h3>
        <div style={{ display: 'grid', gap: 8 }}>
          {sessoes.map((sessao) => (
            <div key={sessao.sessaoId} style={{ border: '1px solid #d9e2e1', borderRadius: 8, padding: 10, background: '#f8faf9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <strong>{sessao.entregadorNome}</strong>
                <span style={{ color: '#647674', fontSize: 12 }}>Iniciada em {formatDateTime(sessao.iniciadaEm)}</span>
              </div>
              <div style={{ marginTop: 6, color: '#647674', fontSize: 12 }}>
                Sessao: {sessao.sessaoId} | Dispositivo: {sessao.dispositivoId}
              </div>
              {sessao.ultimoPonto ? (
                <div style={{ marginTop: 6, fontSize: 12, color: '#243332' }}>
                  Ultimo ponto: {sessao.ultimoPonto.latitude.toFixed(6)}, {sessao.ultimoPonto.longitude.toFixed(6)}
                  {' | '}precisao {sessao.ultimoPonto.precisao ?? '-'}m
                  {' | '}bateria {sessao.ultimoPonto.bateria ?? '-'}%
                  {' | '}registrado em {formatDateTime(sessao.ultimoPonto.registradoEm)}
                </div>
              ) : (
                <div style={{ marginTop: 6, fontSize: 12, color: '#8a9b99' }}>Sessao sem pontos recebidos ainda.</div>
              )}
              <div style={{ marginTop: 6, fontSize: 12 }}>
                <span
                  style={{
                    padding: '4px 8px',
                    borderRadius: 999,
                    fontWeight: 700,
                    color: sessao.conexaoStatus === 'ONLINE' ? '#2f6f73' : sessao.conexaoStatus === 'DESATUALIZADA' ? '#a64b4b' : '#9a6a2f',
                    background: sessao.conexaoStatus === 'ONLINE' ? '#dff3ee' : sessao.conexaoStatus === 'DESATUALIZADA' ? '#fde9e9' : '#fff4e2',
                  }}
                >
                  {sessao.conexaoStatus || 'SEM_PONTOS'}
                </span>
                {typeof sessao.minutosSemAtualizar === 'number' && (
                  <span style={{ marginLeft: 8, color: '#647674' }}>sem atualizar ha {sessao.minutosSemAtualizar} min</span>
                )}
              </div>
            </div>
          ))}
          {sessoes.length === 0 && <div style={{ color: '#647674', fontSize: 13 }}>Nenhuma sessao ativa no momento.</div>}
        </div>
      </section>

      <section style={{ ...panel, padding: 14 }}>
        <h3 style={{ marginTop: 0, color: '#243332' }}>Dispositivos cadastrados</h3>
        <div style={{ display: 'grid', gap: 8 }}>
          {dispositivos.map((dispositivo) => (
            <div key={dispositivo.id} style={{ border: '1px solid #d9e2e1', borderRadius: 8, padding: 10, background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <strong>{dispositivo.entregadorNome}</strong>
                <span style={{ color: dispositivo.ativo ? '#2f6f73' : '#a64b4b', fontWeight: 700, fontSize: 12 }}>
                  {dispositivo.ativo ? 'ATIVO' : 'REVOGADO'}
                </span>
              </div>
              <div style={{ marginTop: 6, color: '#647674', fontSize: 12 }}>
                {dispositivo.plataforma} | {dispositivo.nomeDispositivo || 'Sem nome'} | ping {formatDateTime(dispositivo.ultimoPingEm || null)}
              </div>
              {dispositivo.ativo && (
                <div style={{ marginTop: 8 }}>
                  <button onClick={() => revogarDispositivo(dispositivo.id)} style={{ ...buttonSecondary, color: '#a64b4b', borderColor: '#e6c4c4' }}>
                    Revogar dispositivo
                  </button>
                </div>
              )}
            </div>
          ))}
          {dispositivos.length === 0 && <div style={{ color: '#647674', fontSize: 13 }}>Nenhum dispositivo cadastrado.</div>}
        </div>
      </section>
    </div>
  );
}
