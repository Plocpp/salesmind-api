import * as React from 'react';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StatusBar, Text, TextInput, View } from 'react-native';

type TrackingModule = typeof import('./src/tracking');

let trackingModulePromise: Promise<TrackingModule> | null = null;

function loadTrackingModule() {
  if (!trackingModulePromise) {
    trackingModulePromise = import('./src/tracking');
  }
  return trackingModulePromise;
}

const colors = {
  bg: '#f7f9f9',
  hero: '#112428',
  card: '#ffffff',
  accent: '#17766e',
  accentSoft: '#deeeeb',
  danger: '#c9463d',
  neutral: '#4b6461',
  text: '#0d2224',
  border: '#c6d7d4',
};

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center' }}>
            O app encontrou um erro ao iniciar.
          </Text>
          <Text style={{ color: colors.neutral, textAlign: 'center', marginTop: 8 }}>
            Reinicie o aplicativo. Se persistir, me avise que eu ajusto o build.
          </Text>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [moduleLoaded, setModuleLoaded] = useState(false);
  const [bootingModule, setBootingModule] = useState(false);
  const [entregadorId, setEntregadorId] = useState('');
  const [vendaId, setVendaId] = useState('');
  const [token, setToken] = useState('');
  const [mostrarToken, setMostrarToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ativo, setAtivo] = useState(false);
  const [sessaoId, setSessaoId] = useState('');
  const [notaAtual, setNotaAtual] = useState('');
  const [pendentes, setPendentes] = useState(0);
  const [status, setStatus] = useState('App aberto em modo de contingencia. Toque em "Carregar recursos".');

  const ready = useMemo(() => entregadorId.trim() && token.trim(), [entregadorId, token]);

  async function handleCarregarRecursos() {
    try {
      setBootingModule(true);
      setStatus('Carregando recursos de rastreio...');
      const tracking = await loadTrackingModule();
      const estado = await tracking.obterEstadoRastreio();

      setEntregadorId(estado.entregadorId);
      setVendaId(estado.vendaId);
      setToken(estado.token);
      setNotaAtual(estado.notaAtual);
      setSessaoId(estado.sessionId);
      setPendentes(estado.pendentes);
      setAtivo(estado.ativo);
      setModuleLoaded(true);
      setStatus(estado.ativo ? 'Recursos carregados. Sessao ativa recuperada.' : 'Recursos carregados com sucesso.');
    } catch (error) {
      setModuleLoaded(false);
      setStatus(error instanceof Error ? error.message : 'Falha ao carregar recursos de rastreio.');
    } finally {
      setBootingModule(false);
    }
  }

  async function handleIniciar() {
    if (!ready) {
      setStatus('Informe o ID do entregador e o token do dispositivo.');
      return;
    }

    try {
      setLoading(true);
      if (!moduleLoaded) {
        await handleCarregarRecursos();
      }
      const tracking = await loadTrackingModule();
      const result = await tracking.iniciarRastreio({
        entregadorId: entregadorId.trim(),
        vendaId: vendaId.trim() || undefined,
        token: token.trim(),
      });
      setSessaoId(result.sessaoId);
      setToken(token.trim());
      setEntregadorId(entregadorId.trim());
      setVendaId(vendaId.trim());
      setPendentes(0);
      setAtivo(true);
      setStatus('Rastreio iniciado em modo seguro (foreground).');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Falha ao iniciar rastreio.');
    } finally {
      setLoading(false);
    }
  }

  async function handleFinalizar() {
    try {
      setLoading(true);
      if (!moduleLoaded) {
        setStatus('Carregue os recursos antes de finalizar.');
        return;
      }
      const tracking = await loadTrackingModule();
      await tracking.finalizarRastreio('FINALIZADO_MANUALMENTE');
      setAtivo(false);
      setSessaoId('');
      setPendentes(0);
      setStatus('Rastreio finalizado.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Falha ao finalizar rastreio.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSincronizar() {
    try {
      setLoading(true);
      if (!moduleLoaded) {
        setStatus('Carregue os recursos antes de sincronizar.');
        return;
      }
      const tracking = await loadTrackingModule();
      const result = await tracking.sincronizarPendencias();
      setPendentes(result.pendentes);
      setStatus(`Sincronizacao concluida: ${result.enviados} enviados, ${result.pendentes} pendentes.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Falha ao sincronizar pendencias.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSalvarNota() {
    try {
      setLoading(true);
      if (!moduleLoaded) {
        setStatus('Carregue os recursos antes de salvar nota.');
        return;
      }
      const tracking = await loadTrackingModule();
      const value = await tracking.atualizarNotaAtiva(notaAtual);
      setNotaAtual(value);
      setStatus(value ? 'Nota ativa salva no dispositivo.' : 'Nota limpa do dispositivo.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Falha ao salvar nota.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLimparNota() {
    try {
      setLoading(true);
      if (!moduleLoaded) {
        setStatus('Carregue os recursos antes de limpar nota.');
        return;
      }
      const tracking = await loadTrackingModule();
      await tracking.limparNotaAtiva();
      setNotaAtual('');
      setStatus('Nota ativa removida.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Falha ao limpar nota.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppErrorBoundary>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar barStyle="light-content" />
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>
          <View style={{ backgroundColor: colors.hero, padding: 18, borderRadius: 18 }}>
            <Text style={{ color: '#d6f1eb', fontWeight: '700', letterSpacing: 1 }}>OPERACAO EM CAMPO</Text>
            <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 24, marginTop: 6 }}>SalesMind Rastreio</Text>
            <Text style={{ color: '#d0dfdd', marginTop: 8 }}>
              Inicio estatico: sem modulos nativos no boot para impedir fechamento automatico.
            </Text>

            <Pressable
              onPress={handleCarregarRecursos}
              disabled={bootingModule || loading}
              style={{
                marginTop: 12,
                backgroundColor: bootingModule || loading ? '#40666b' : '#2f8c83',
                borderRadius: 10,
                paddingVertical: 10,
                alignItems: 'center',
              }}
            >
              {bootingModule ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={{ color: '#ffffff', fontWeight: '800' }}>{moduleLoaded ? 'Recursos carregados' : 'Carregar recursos'}</Text>
              )}
            </Pressable>

            <View
              style={{
                marginTop: 14,
                backgroundColor: ativo ? '#1f544f' : '#264247',
                borderRadius: 12,
                padding: 10,
                borderWidth: 1,
                borderColor: ativo ? '#3db3a7' : '#3e6166',
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: '800' }}>{ativo ? 'STATUS: RASTREIO ATIVO' : 'STATUS: RASTREIO INATIVO'}</Text>
              <Text style={{ color: '#c8e6e2', marginTop: 4 }}>Recursos: {moduleLoaded ? 'carregados' : 'nao carregados'}</Text>
              {sessaoId ? <Text style={{ color: '#c8e6e2', marginTop: 4 }}>Sessao atual: {sessaoId}</Text> : null}
            </View>
          </View>

          <View style={{ backgroundColor: colors.card, padding: 14, borderRadius: 14, gap: 10, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>Credenciais da sessao</Text>

          <TextInput
            placeholder="Entregador ID"
            value={entregadorId}
            onChangeText={setEntregadorId}
            autoCapitalize="none"
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.text }}
            placeholderTextColor={colors.neutral}
          />

          <TextInput
            placeholder="Venda ID (opcional)"
            value={vendaId}
            onChangeText={setVendaId}
            autoCapitalize="none"
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.text }}
            placeholderTextColor={colors.neutral}
          />

          <TextInput
            placeholder="Token do dispositivo"
            value={token}
            onChangeText={setToken}
            autoCapitalize="none"
            secureTextEntry={!mostrarToken}
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.text }}
            placeholderTextColor={colors.neutral}
          />

          <Pressable
            onPress={() => setMostrarToken((v) => !v)}
            style={{ alignSelf: 'flex-start', backgroundColor: colors.accentSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}
          >
            <Text style={{ color: colors.accent, fontWeight: '700' }}>{mostrarToken ? 'Ocultar token' : 'Mostrar token'}</Text>
          </Pressable>

          <TextInput
            placeholder="Nota ativa do motorista"
            value={notaAtual}
            onChangeText={setNotaAtual}
            autoCapitalize="sentences"
            multiline
            numberOfLines={3}
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, minHeight: 78, textAlignVertical: 'top', color: colors.text }}
            placeholderTextColor={colors.neutral}
          />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={handleSalvarNota}
              disabled={loading}
              style={{
                backgroundColor: loading ? '#9db4b3' : '#245e79',
                paddingVertical: 12,
                borderRadius: 10,
                flex: 1,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Salvar nota</Text>
            </Pressable>

            <Pressable
              onPress={handleLimparNota}
              disabled={loading}
              style={{
                backgroundColor: loading ? '#d7a8a6' : '#7b8a89',
                paddingVertical: 12,
                borderRadius: 10,
                flex: 1,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Limpar nota</Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={handleIniciar}
              disabled={!ready || loading || ativo || !moduleLoaded}
              style={{
                backgroundColor: !ready || loading || ativo || !moduleLoaded ? '#9db4b3' : colors.accent,
                paddingVertical: 12,
                borderRadius: 10,
                flex: 1,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Iniciar</Text>
            </Pressable>

            <Pressable
              onPress={handleFinalizar}
              disabled={loading || !ativo}
              style={{
                backgroundColor: loading || !ativo ? '#d7a8a6' : colors.danger,
                paddingVertical: 12,
                borderRadius: 10,
                flex: 1,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Finalizar</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={handleSincronizar}
            disabled={loading || !ativo}
            style={{
              backgroundColor: loading || !ativo ? '#a7bcc0' : '#245e79',
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Sincronizar pendencias</Text>
          </Pressable>
        </View>

          <View style={{ backgroundColor: colors.card, padding: 14, borderRadius: 14, gap: 8, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>Painel operacional</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, backgroundColor: colors.accentSoft, borderRadius: 10, padding: 10 }}>
                <Text style={{ color: colors.accent, fontWeight: '700' }}>Pendentes</Text>
                <Text style={{ color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 3 }}>{pendentes}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#f0e9df', borderRadius: 10, padding: 10 }}>
                <Text style={{ color: '#9a5e2d', fontWeight: '700' }}>Modo</Text>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '900', marginTop: 4 }}>Seguro</Text>
              </View>
            </View>
            <Text style={{ color: colors.neutral }}>{status}</Text>
          </View>

          <Text style={{ color: '#6f8683', textAlign: 'center', marginTop: 6, fontWeight: '600' }}>
            Contingencia ativa: primeiro validamos abertura estavel, depois ativamos o rastreio.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </AppErrorBoundary>
  );
}
