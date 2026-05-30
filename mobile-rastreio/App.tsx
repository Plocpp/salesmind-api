import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    SafeAreaView,
    ScrollView,
    StatusBar,
    Text,
    TextInput,
    View,
} from 'react-native';
import {
    atualizarNotaAtiva,
    finalizarRastreio,
    iniciarRastreio,
    limparNotaAtiva,
    obterEstadoRastreio,
    sincronizarPendencias,
} from './src/tracking';

const colors = {
  background: '#091417',
  panel: '#123036',
  panelSoft: '#173b42',
  text: '#f2fbfa',
  muted: '#a9c7c4',
  accent: '#43d6c2',
};

export default function App() {
  const [etapaAtual, setEtapaAtual] = useState('boot-inicial');
  const [diagnosticoVisivel, setDiagnosticoVisivel] = useState(false);
  const [diagnosticoTitulo, setDiagnosticoTitulo] = useState('Falha detectada');
  const [diagnosticoMensagem, setDiagnosticoMensagem] = useState('Sem detalhes.');
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);

  const [entregadorId, setEntregadorId] = useState('');
  const [vendaId, setVendaId] = useState('');
  const [token, setToken] = useState('');
  const [notaAtual, setNotaAtual] = useState('');
  const [sessaoId, setSessaoId] = useState('');
  const [ativo, setAtivo] = useState(false);
  const [pendentes, setPendentes] = useState(0);

  const mountedRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const etapaRef = useRef(etapaAtual);

  function atualizarEtapa(etapa: string) {
    etapaRef.current = etapa;
    setEtapaAtual(etapa);
  }

  async function refreshEstado(origem: string) {
    if (!mountedRef.current || isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;
    try {
      const estado = await obterEstadoRastreio();
      if (!mountedRef.current) return;

      setEntregadorId((prev) => prev || estado.entregadorId || '');
      setVendaId((prev) => prev || estado.vendaId || '');
      setToken((prev) => prev || estado.token || '');
      setNotaAtual(estado.notaAtual || '');
      setSessaoId(estado.sessionId || '');
      setAtivo(Boolean(estado.ativo));
      setPendentes(Number(estado.pendentes || 0));
      atualizarEtapa(`estado-atualizado:${origem}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error || 'Falha ao ler estado');
      if (mountedRef.current) {
        setDiagnosticoTitulo('Falha ao ler estado do rastreio');
        setDiagnosticoMensagem(message);
        setDiagnosticoVisivel(true);
      }
    } finally {
      isRefreshingRef.current = false;
      if (mountedRef.current) {
        setCarregando(false);
      }
    }
  }

  async function withSafeAction(label: string, action: () => Promise<void>) {
    if (processando) return;

    setProcessando(true);
    atualizarEtapa(`acao:${label}`);

    try {
      await action();
      await refreshEstado(`pos-${label}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error || `Falha na acao ${label}`);
      Alert.alert('Operacao nao concluida', message);
      setDiagnosticoTitulo(`Erro em ${label}`);
      setDiagnosticoMensagem(message);
      setDiagnosticoVisivel(true);
    } finally {
      if (mountedRef.current) {
        setProcessando(false);
      }
    }
  }

  function validarInicio() {
    if (!entregadorId.trim()) {
      Alert.alert('Campo obrigatorio', 'Informe o Entregador ID.');
      return false;
    }

    if (!token.trim()) {
      Alert.alert('Campo obrigatorio', 'Informe o token do dispositivo.');
      return false;
    }

    return true;
  }

  useEffect(() => {
    mountedRef.current = true;
    atualizarEtapa('ui-montada');

    const globalObj = globalThis as {
      ErrorUtils?: {
        getGlobalHandler?: () => ((error: unknown, isFatal?: boolean) => void) | undefined;
        setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
      };
    };

    const handlerAnterior = globalObj.ErrorUtils?.getGlobalHandler?.();

    globalObj.ErrorUtils?.setGlobalHandler?.((error: unknown, isFatal?: boolean) => {
      const message = error instanceof Error ? error.message : String(error || 'Erro desconhecido');
      setDiagnosticoTitulo(isFatal ? 'Erro fatal JavaScript' : 'Erro JavaScript');
      setDiagnosticoMensagem(`Motivo: ${message}\nEtapa: ${etapaRef.current}`);
      setDiagnosticoVisivel(true);

      if (!isFatal && handlerAnterior) {
        handlerAnterior(error, isFatal);
      }
    });

    void refreshEstado('boot');

    const intervalId = setInterval(() => {
      void refreshEstado('poll');
    }, 15000);

    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
      if (handlerAnterior) {
        globalObj.ErrorUtils?.setGlobalHandler?.(handlerAnterior);
      }
    };
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            backgroundColor: colors.panel,
            borderRadius: 20,
            padding: 20,
            borderWidth: 1,
            borderColor: colors.panelSoft,
            gap: 10,
          }}
        >
          <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '800', letterSpacing: 1.2 }}>
            SALESMIND RASTREIO MOBILE
          </Text>
          <Text style={{ color: colors.text, fontSize: 26, fontWeight: '900', lineHeight: 32 }}>
            Controle operacional
          </Text>
          <Text style={{ color: colors.muted, lineHeight: 21 }}>
            Fluxo protegido contra loop: sem auto-start, sem recursao de acoes e com refresh controlado de estado.
          </Text>
          <Text style={{ color: colors.muted }}>Etapa atual: {etapaAtual}</Text>
        </View>

        <View
          style={{
            backgroundColor: colors.panel,
            borderRadius: 20,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.panelSoft,
            gap: 12,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800' }}>Estado da sessao</Text>
          <Text style={{ color: colors.muted }}>Ativo: {ativo ? 'SIM' : 'NAO'}</Text>
          <Text style={{ color: colors.muted }}>Sessao: {sessaoId || '-'}</Text>
          <Text style={{ color: colors.muted }}>Pendentes offline: {pendentes}</Text>
          {carregando ? <ActivityIndicator color={colors.accent} /> : null}
        </View>

        <View
          style={{
            backgroundColor: colors.panel,
            borderRadius: 20,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.panelSoft,
            gap: 10,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800' }}>Parametros</Text>

          <TextInput
            value={entregadorId}
            onChangeText={setEntregadorId}
            placeholder="Entregador ID"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            style={{
              backgroundColor: '#0f262b',
              color: colors.text,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#29555c',
              paddingHorizontal: 12,
              height: 46,
            }}
          />

          <TextInput
            value={vendaId}
            onChangeText={setVendaId}
            placeholder="Venda ID (opcional)"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            style={{
              backgroundColor: '#0f262b',
              color: colors.text,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#29555c',
              paddingHorizontal: 12,
              height: 46,
            }}
          />

          <TextInput
            value={token}
            onChangeText={setToken}
            placeholder="Token do dispositivo"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            secureTextEntry
            style={{
              backgroundColor: '#0f262b',
              color: colors.text,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#29555c',
              paddingHorizontal: 12,
              height: 46,
            }}
          />

          <TextInput
            value={notaAtual}
            onChangeText={setNotaAtual}
            placeholder="Nota atual (opcional)"
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
            style={{
              backgroundColor: '#0f262b',
              color: colors.text,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#29555c',
              paddingHorizontal: 12,
              height: 46,
            }}
          />
        </View>

        <View style={{ gap: 10 }}>
          <Pressable
            onPress={() => {
              if (!validarInicio()) return;
              void withSafeAction('iniciar', async () => {
                const nota = notaAtual.trim();
                if (nota) {
                  await atualizarNotaAtiva(nota);
                } else {
                  await limparNotaAtiva();
                }

                await iniciarRastreio({
                  entregadorId: entregadorId.trim(),
                  vendaId: vendaId.trim() || undefined,
                  token: token.trim(),
                });
              });
            }}
            disabled={processando || ativo}
            style={{
              height: 46,
              borderRadius: 12,
              backgroundColor: processando || ativo ? '#40615d' : colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#082120', fontWeight: '800' }}>{ativo ? 'Rastreio ativo' : 'Iniciar rastreio'}</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              void withSafeAction('sincronizar', async () => {
                await sincronizarPendencias();
              });
            }}
            disabled={processando}
            style={{
              height: 44,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#2f7a72',
              backgroundColor: '#123036',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: colors.text, fontWeight: '700' }}>Sincronizar pendencias</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              void withSafeAction('finalizar', async () => {
                await finalizarRastreio('FINALIZADO_NO_APP');
              });
            }}
            disabled={processando || !ativo}
            style={{
              height: 44,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#7f4b56',
              backgroundColor: processando || !ativo ? '#3a2a2f' : '#5b2d36',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: colors.text, fontWeight: '700' }}>Finalizar rastreio</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              void withSafeAction('atualizar-nota', async () => {
                const value = notaAtual.trim();
                if (value) {
                  await atualizarNotaAtiva(value);
                } else {
                  await limparNotaAtiva();
                }
              });
            }}
            disabled={processando}
            style={{
              height: 44,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#325872',
              backgroundColor: '#123036',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: colors.text, fontWeight: '700' }}>Salvar nota atual</Text>
          </Pressable>
        </View>
      </ScrollView>

      {diagnosticoVisivel ? (
        <View
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 24,
            backgroundColor: '#1b2224',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#3a4a4d',
            padding: 14,
          }}
        >
          <Text style={{ color: '#ff8d8d', fontSize: 16, fontWeight: '800' }}>{diagnosticoTitulo}</Text>
          <Text style={{ color: colors.text, marginTop: 8, lineHeight: 21 }}>{diagnosticoMensagem}</Text>
          <Pressable
            onPress={() => setDiagnosticoVisivel(false)}
            style={{
              marginTop: 12,
              alignSelf: 'flex-start',
              backgroundColor: '#2b4044',
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text style={{ color: colors.text, fontWeight: '700' }}>Fechar popup</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}