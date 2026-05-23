import { MapPin, RefreshCw, ShieldCheck, Truck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

type PontoRastreio = {
  id: string;
  latitude: number;
  longitude: number;
  precisao?: number | null;
  velocidade?: number | null;
  fonte?: string | null;
  registradoEm: string;
  nota?: string | null;
};

type RastreioPublico = {
  sessaoId: string;
  entregadorNome: string;
  vendaId?: string | null;
  status: string;
  motivo?: string | null;
  iniciadaEm: string;
  finalizadaEm?: string | null;
  ultimaPosicao?: PontoRastreio | null;
  notaAtual?: string | null;
  pontos: PontoRastreio[];
  atualizadaEm?: string | null;
};

const panel: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #d7e3e0',
  borderRadius: 18,
  boxShadow: '0 16px 44px rgba(24, 51, 49, 0.08)',
};

const softButton: React.CSSProperties = {
  height: 40,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  border: '1px solid #c5d5d1',
  background: '#fff',
  color: '#17555a',
  borderRadius: 999,
  padding: '0 16px',
  cursor: 'pointer',
  fontWeight: 800,
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

const buildMapaHtml = (pontos: PontoRastreio[]) => {
  const serialized = JSON.stringify(pontos.map((ponto) => ({
    ...ponto,
    nota: ponto.nota ? escapeHtml(ponto.nota) : null,
    fonte: ponto.fonte ? escapeHtml(ponto.fonte) : null,
  })));

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
  <style>
    html, body, #map { height: 100%; margin: 0; }
    body { background: #eef5f3; font-family: Arial, sans-serif; }
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
      const popup = '<div><strong>' + (p.fonte || 'Posicao atual') + '</strong><br />' +
        'Lat: ' + p.latitude.toFixed(6) + '<br />' +
        'Lng: ' + p.longitude.toFixed(6) + '<br />' +
        (p.nota ? '<div class="tag">Nota: ' + p.nota + '</div>' : '') +
      '</div>';
      marker.bindPopup(popup);
      bounds.push([p.latitude, p.longitude]);
    });
    if (bounds.length) {
      map.fitBounds(bounds, { padding: [26, 26] });
    }
  </script>
</body>
</html>`;
};

interface RastreioPublicoProps {
  sessaoId: string;
  onVoltar?: () => void;
}

export default function RastreioPublico({ sessaoId, onVoltar }: RastreioPublicoProps) {
  const [data, setData] = useState<RastreioPublico | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const carregar = async (background = false) => {
    try {
      if (background) setRefreshing(true); else setLoading(true);
      setErro('');
      const result = await api.get(`/rastreio/publico/sessoes/${encodeURIComponent(sessaoId)}?limit=60`);
      setData(result || null);
    } catch (error) {
      console.error(error);
      setErro(error instanceof Error ? error.message : 'Nao foi possivel carregar o rastreio.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    carregar();
    const timer = window.setInterval(() => {
      carregar(true);
    }, 8000);

    return () => window.clearInterval(timer);
  }, [sessaoId]);

  const mapaHtml = useMemo(() => buildMapaHtml(data?.pontos || []), [data?.pontos]);
  const notaAtual = data?.ultimaPosicao?.nota || data?.notaAtual || null;
  const statusTexto = data?.status === 'ATIVA' ? 'Em entrega' : data?.status === 'FINALIZADA' ? 'Entrega concluida' : data?.status || 'Aguardando';

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at top, #f2fbf8 0%, #eff5f4 40%, #edf2f1 100%)', padding: 16 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gap: 16 }}>
        <header style={{ ...panel, padding: 16, display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#17555a', fontWeight: 900, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              <Truck size={16} /> Acompanhamento ao cliente
            </div>
            <h1 style={{ margin: '8px 0 6px', color: '#163133', fontSize: 28 }}>Onde esta sua entrega</h1>
            <div style={{ color: '#5a6f6d' }}>
              Atualizacao automatica do percurso e da ultima nota enviada pelo motorista.
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8, justifyItems: 'end' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 999, background: '#e6f4ef', color: '#1f5c58', fontWeight: 900, fontSize: 12 }}>
              <ShieldCheck size={15} /> Visao publica e segura
            </div>
            <button onClick={() => carregar(true)} style={softButton} disabled={refreshing || loading}>
              <RefreshCw size={16} /> {refreshing ? 'Atualizando...' : 'Atualizar agora'}
            </button>
          </div>
        </header>

        {erro && <div style={{ ...panel, padding: 14, color: '#8a4b20', background: '#fff8ed' }}>{erro}</div>}

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div style={{ ...panel, padding: 14 }}>
            <div style={{ color: '#6c7d7b', fontSize: 12 }}>Status</div>
            <div style={{ marginTop: 8, color: '#163133', fontSize: 22, fontWeight: 900 }}>{statusTexto}</div>
          </div>
          <div style={{ ...panel, padding: 14 }}>
            <div style={{ color: '#6c7d7b', fontSize: 12 }}>Motorista</div>
            <div style={{ marginTop: 8, color: '#163133', fontSize: 18, fontWeight: 900 }}>{data?.entregadorNome || '-'}</div>
          </div>
          <div style={{ ...panel, padding: 14 }}>
            <div style={{ color: '#6c7d7b', fontSize: 12 }}>Ultima atualizacao</div>
            <div style={{ marginTop: 8, color: '#163133', fontSize: 18, fontWeight: 900 }}>{formatDateTime(data?.atualizadaEm)}</div>
          </div>
          <div style={{ ...panel, padding: 14 }}>
            <div style={{ color: '#6c7d7b', fontSize: 12 }}>Sessao</div>
            <div style={{ marginTop: 8, color: '#163133', fontSize: 14, fontWeight: 900, wordBreak: 'break-all' }}>{data?.sessaoId || sessaoId}</div>
          </div>
        </section>

        <section style={{ ...panel, padding: 14, display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, color: '#163133' }}>Mapa em tempo real</h2>
              <div style={{ color: '#5a6f6d', fontSize: 13 }}>O mapa e a nota sao atualizados automaticamente enquanto a entrega estiver em andamento.</div>
            </div>
            {onVoltar && (
              <button onClick={onVoltar} style={softButton}>
                Voltar
              </button>
            )}
          </div>

          <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #d7e3e0', minHeight: 520, background: '#eaf2ef' }}>
            {loading && !data ? (
              <div style={{ padding: 20, color: '#5a6f6d' }}>Carregando rastreio...</div>
            ) : (
              <iframe title="Mapa de rastreio publico" srcDoc={mapaHtml} style={{ width: '100%', height: 520, border: 0, display: 'block' }} />
            )}
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1.2fr) minmax(260px, 0.8fr)', gap: 12 }}>
          <div style={{ ...panel, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: '#163133', fontWeight: 900 }}>
              <MapPin size={16} /> Ultima posicao
            </div>

            {data?.ultimaPosicao ? (
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ color: '#163133', fontSize: 18, fontWeight: 900 }}>{data.entregadorNome}</div>
                <div style={{ color: '#5a6f6d', fontSize: 13 }}>Recebido em {formatDateTime(data.ultimaPosicao.registradoEm)}</div>
                <div style={{ color: '#163133' }}>{data.ultimaPosicao.latitude.toFixed(6)}, {data.ultimaPosicao.longitude.toFixed(6)}</div>
                <div style={{ color: '#5a6f6d', fontSize: 13 }}>Fonte: {data.ultimaPosicao.fonte || 'GPS'}</div>
                <div style={{ color: '#5a6f6d', fontSize: 13 }}>Precisao: {data.ultimaPosicao.precisao ?? '-'} m</div>
                <div style={{ color: '#5a6f6d', fontSize: 13 }}>Velocidade: {data.ultimaPosicao.velocidade ?? '-'} m/s</div>
              </div>
            ) : (
              <div style={{ color: '#5a6f6d' }}>Aguardando o primeiro ponto da entrega.</div>
            )}
          </div>

          <div style={{ ...panel, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: '#163133', fontWeight: 900 }}>
              <Truck size={16} /> Nota do motorista
            </div>

            {notaAtual ? (
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ padding: 12, borderRadius: 12, background: '#f4fbf8', border: '1px solid #d8ebe4', color: '#163133', lineHeight: 1.5 }}>
                  {notaAtual}
                </div>
                <div style={{ color: '#5a6f6d', fontSize: 12 }}>A nota acompanha a sessao enquanto o motorista atualizar o app.</div>
              </div>
            ) : (
              <div style={{ color: '#5a6f6d' }}>Ainda nao ha nota registrada para esta entrega.</div>
            )}
          </div>
        </section>

        <section style={{ ...panel, padding: 14 }}>
          <h3 style={{ margin: '0 0 10px', color: '#163133' }}>Historico recente</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {(data?.pontos || []).slice(0, 10).map((ponto) => (
              <div key={ponto.id} style={{ padding: 10, borderRadius: 12, border: '1px solid #d7e3e0', background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <strong style={{ color: '#163133' }}>{formatDateTime(ponto.registradoEm)}</strong>
                  <span style={{ color: '#5a6f6d', fontSize: 12 }}>{ponto.fonte || 'GPS'}</span>
                </div>
                <div style={{ marginTop: 6, color: '#5a6f6d', fontSize: 13 }}>{ponto.latitude.toFixed(6)}, {ponto.longitude.toFixed(6)}</div>
                {ponto.nota ? <div style={{ marginTop: 6, color: '#163133' }}>Nota: {ponto.nota}</div> : null}
              </div>
            ))}
            {(data?.pontos || []).length === 0 && <div style={{ color: '#5a6f6d' }}>Nenhum ponto recebido ainda.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}