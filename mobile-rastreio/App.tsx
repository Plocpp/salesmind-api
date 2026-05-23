import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StatusBar, Text, TextInput, View } from 'react-native';
import { atualizarNotaAtiva, finalizarRastreio, iniciarRastreio, limparNotaAtiva, obterEstadoRastreio, sincronizarPendencias } from './src/tracking';

const colors = {
  bg: '#f3f8f8',
  card: '#ffffff',
  accent: '#0f5d63',
  danger: '#b6413d',
  text: '#153133',
  muted: '#607674',
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
          <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 8 }}>
            Reinicie o aplicativo. Se persistir, me avise que eu ajusto o build.
          </Text>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [entregadorId, setEntregadorId] = useState('');
  const [vendaId, setVendaId] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [ativo, setAtivo] = useState(false);
  const [sessaoId, setSessaoId] = useState('');
  const [notaAtual, setNotaAtual] = useState('');
  const [pendentes, setPendentes] = useState(0);
  const [status, setStatus] = useState('Pronto para iniciar.');

  useEffect(() => {
    obterEstadoRastreio()
      .then((estado) => {
        setAtivo(estado.ativo);
        setSessaoId(estado.sessionId);
        setEntregadorId(estado.entregadorId);
        setVendaId(estado.vendaId);
        setToken(estado.token);
        setNotaAtual(estado.notaAtual);
        setPendentes(estado.pendentes);
        if (estado.ativo) {
          setStatus('Sessao restaurada no dispositivo.');
        }
      })
      .catch(() => setAtivo(false));
  }, []);

  const ready = useMemo(() => entregadorId.trim() && token.trim(), [entregadorId, token]);

  async function handleIniciar() {
    if (!ready) {
      setStatus('Informe o ID do entregador e o token do dispositivo.');
      return;
    }

    try {
      setLoading(true);
      const result = await iniciarRastreio({
        entregadorId: entregadorId.trim(),
        vendaId: vendaId.trim() || undefined,
        token: token.trim(),
      });
      setSessaoId(result.sessaoId);
      setPendentes(0);
      setAtivo(true);
      setStatus('Rastreio iniciado com sucesso.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Falha ao iniciar rastreio.');
    } finally {
      setLoading(false);
    }
  }

  async function handleFinalizar() {
    try {
      setLoading(true);
      await finalizarRastreio('FINALIZADO_MANUALMENTE');
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
      const result = await sincronizarPendencias();
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
      const value = await atualizarNotaAtiva(notaAtual);
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
      await limparNotaAtiva();
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
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <View style={{ backgroundColor: colors.card, padding: 14, borderRadius: 14 }}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 22 }}>SalesMind Rastreio</Text>
            <Text style={{ color: colors.muted, marginTop: 6 }}>
              App de rastreamento em segundo plano para entregadores.
            </Text>
          </View>

        <View style={{ backgroundColor: colors.card, padding: 14, borderRadius: 14, gap: 10 }}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>Configuracao de sessao</Text>

          <TextInput
            placeholder="Entregador ID"
            value={entregadorId}
            onChangeText={setEntregadorId}
            autoCapitalize="none"
            style={{ borderWidth: 1, borderColor: '#c9d9d8', borderRadius: 10, padding: 10 }}
          />

          <TextInput
            placeholder="Venda ID (opcional)"
            value={vendaId}
            onChangeText={setVendaId}
            autoCapitalize="none"
            style={{ borderWidth: 1, borderColor: '#c9d9d8', borderRadius: 10, padding: 10 }}
          />

          <TextInput
            placeholder="Token do dispositivo"
            value={token}
            onChangeText={setToken}
            autoCapitalize="none"
            secureTextEntry
            style={{ borderWidth: 1, borderColor: '#c9d9d8', borderRadius: 10, padding: 10 }}
          />

          <TextInput
            placeholder="Nota ativa do motorista"
            value={notaAtual}
            onChangeText={setNotaAtual}
            autoCapitalize="sentences"
            multiline
            numberOfLines={3}
            style={{ borderWidth: 1, borderColor: '#c9d9d8', borderRadius: 10, padding: 10, minHeight: 72, textAlignVertical: 'top' }}
          />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={handleSalvarNota}
              disabled={loading}
              style={{
                backgroundColor: loading ? '#9db4b3' : '#295d80',
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
                backgroundColor: loading ? '#d7a8a6' : '#7b8b8a',
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
              disabled={!ready || loading || ativo}
              style={{
                backgroundColor: !ready || loading || ativo ? '#9db4b3' : colors.accent,
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
              backgroundColor: loading || !ativo ? '#a7bcc0' : '#295d80',
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Sincronizar pendencias</Text>
          </Pressable>
        </View>

        <View style={{ backgroundColor: colors.card, padding: 14, borderRadius: 14, gap: 8 }}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>Status</Text>
          <Text style={{ color: ativo ? colors.accent : colors.muted, fontWeight: '700' }}>
            {ativo ? 'ATIVO' : 'INATIVO'}
          </Text>
          {sessaoId ? <Text style={{ color: colors.muted }}>Sessao: {sessaoId}</Text> : null}
          {notaAtual ? <Text style={{ color: colors.muted }}>Nota ativa: {notaAtual}</Text> : null}
          <Text style={{ color: colors.muted }}>Pontos pendentes: {pendentes}</Text>
          <Text style={{ color: colors.muted }}>{status}</Text>
        </View>
        </ScrollView>
      </SafeAreaView>
    </AppErrorBoundary>
  );
}
