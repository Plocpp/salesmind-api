import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StatusBar,
    Text,
    TextInput,
    View,
} from 'react-native';
import {
    ativarDispositivo,
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

  const [codigoAtivacao, setCodigoAtivacao] = useState('');
  const [nomeEntregador, setNomeEntregador] = useState('');
  const [entregadorId, setEntregadorId] = useState('');
  const [vendaId, setVendaId] = useState('');
  const [token, setToken] = useState('');
  const [notaAtual, setNotaAtual] = useState('');
  const [sessaoId, setSessaoId] = useState('');
  const [ativo, setAtivo] = useState(false);
  const [pendentes, setPendentes] = useState(0);

  const aparelhoAtivado = Boolean(token && entregadorId);

  const mountedRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const etapaRef = useRef(etapaAtual);

  function atualizarEtapa(etapa: string) {
    etapaRef.current = etapa;
    setEtapaAtual(etapa);
  }

  async function refreshEstado(origem: string) {
    if (!mountedRef.current || isRefreshingRef.current) return;

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

  async function ativarNoAparelho() {
    if (!codigoAtivacao.trim()) {
      Alert.alert('Campo obrigatorio', 'Informe o codigo de 6 digitos enviado pela administracao.');
      return;
    }

    await withSafeAction('ativar-aparelho', async () => {
      const ativacao = await ativarDispositivo({
        codigo: codigoAtivacao.trim(),
        plataforma: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
      });
      setToken(ativacao.token);
      setEntregadorId(ativacao.entregadorId);
      setNomeEntregador(ativacao.entregadorNome || '');
      setCodigoAtivacao('');
      Alert.alert('Aparelho ativado!', `Ola, ${ativacao.entregadorNome || 'entregador'}! O aparelho esta pronto para rastreio.`);
    });
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

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View style={{ backgroundColor: colors.panel, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.panelSoft, gap: 6 }}>
          <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '800', letterSpacing: 1.2 }}>
            SALESMIND RASTREIO
          </Text>
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: '900', lineHeight: 30 }}>
            {aparelhoAtivado ? `Ola, ${nomeEntregador || 'Entregador'}!` : 'Ativar aparelho'}
          </Text>
          {carregando ? <ActivityIndicator color={colors.accent} style={{ alignSelf: 'flex-start', marginTop: 4 }} /> : null}
        </View>

        {!aparelhoAtivado && (
          <View style={{ backgroundColor: colors.panel, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.panelSoft, gap: 14 }}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800' }}>Codigo de ativacao</Text>
            <Text style={{ color: colors.muted, lineHeight: 20 }}>
              Peca o codigo de 6 digitos para o responsavel da loja e informe abaixo. Voce so precisa fazer isso uma vez.
            </Text>

            <TextInput
              value={codigoAtivacao}
              onChangeText={setCodigoAtivacao}
              placeholder="000000"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              maxLength={6}
              style={{
                backgroundColor: '#0f262b',
                color: colors.text,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: codigoAtivacao.length === 6 ? colors.accent : '#29555c',
                paddingHorizontal: 16,
                height: 56,
                fontSize: 28,
                fontWeight: '900',
                letterSpacing: 8,
                textAlign: 'center',
              }}
            />

            <Pressable
              onPress={ativarNoAparelho}
              disabled={processando || codigoAtivacao.length < 4}
              style={{
                height: 52,
                borderRadius: 12,
                backgroundColor: codigoAtivacao.length >= 4 ? '#2f6f73' : '#1a3b3e',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: processando ? 0.7 : 1,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>
                {processando ? 'Ativando...' : 'Ativar aparelho'}
              </Text>
            </Pressable>
          </View>
        )}

        {aparelhoAtivado && (
          <>
            <View style={{ backgroundColor: colors.panel, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.panelSoft, gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: ativo ? '#43d6c2' : '#4a6361' }} />
                <Text style={{ color: colors.text, fontWeight: '800' }}>{ativo ? 'Rastreio ativo' : 'Rastreio parado'}</Text>
              </View>
              {ativo && sessaoId ? <Text style={{ color: colors.muted, fontSize: 12 }}>Sessao: {sessaoId}</Text> : null}
              {pendentes > 0 ? <Text style={{ color: '#f0c96a', fontSize: 12 }}>{pendentes} ponto(s) pendentes para enviar</Text> : null}
            </View>

            <View style={{ backgroundColor: colors.panel, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.panelSoft, gap: 10 }}>
              <TextInput
                value={vendaId}
                onChangeText={setVendaId}
                placeholder="Numero da entrega (opcional)"
                placeholderTextColor={colors.muted}
                autoCapitalize="characters"
                style={{ backgroundColor: '#0f262b', color: colors.text, borderRadius: 10, borderWidth: 1, borderColor: '#29555c', paddingHorizontal: 12, height: 46 }}
              />

              <TextInput
                value={notaAtual}
                onChangeText={setNotaAtual}
                placeholder="Nota fiscal (opcional)"
                placeholderTextColor={colors.muted}
                autoCapitalize="characters"
                style={{ backgroundColor: '#0f262b', color: colors.text, borderRadius: 10, borderWidth: 1, borderColor: '#29555c', paddingHorizontal: 12, height: 46 }}
              />
            </View>

            <View style={{ gap: 10 }}>
              <Pressable
                onPress={() => {
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
                style={{ height: 52, borderRadius: 12, backgroundColor: processando || ativo ? '#40615d' : colors.accent, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: '#082120', fontWeight: '800', fontSize: 16 }}>{ativo ? 'Rastreio em andamento' : 'Iniciar rastreio'}</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  void withSafeAction('atualizar-nota', async () => {
                    const v = notaAtual.trim();
                    if (v) {
                      await atualizarNotaAtiva(v);
                    } else {
                      await limparNotaAtiva();
                    }
                  });
                }}
                disabled={processando || !ativo}
                style={{ height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#325872', backgroundColor: '#123036', alignItems: 'center', justifyContent: 'center', opacity: !ativo ? 0.5 : 1 }}
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>Atualizar nota</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  void withSafeAction('sincronizar', async () => {
                    await sincronizarPendencias();
                  });
                }}
                disabled={processando}
                style={{ height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#2f7a72', backgroundColor: '#123036', alignItems: 'center', justifyContent: 'center' }}
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
                style={{ height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#7f4b56', backgroundColor: processando || !ativo ? '#3a2a2f' : '#5b2d36', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>Finalizar rastreio</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  Alert.alert('Trocar aparelho?', 'Isso vai apagar o vinculo atual. Um novo codigo sera necessario.', [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Confirmar',
                      style: 'destructive',
                      onPress: () => {
                        void withSafeAction('desativar', async () => {
                          await finalizarRastreio('DESATIVADO_MANUALMENTE');
                          setToken('');
                          setEntregadorId('');
                          setNomeEntregador('');
                        });
                      },
                    },
                  ]);
                }}
                disabled={processando}
                style={{ height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}
              >
                <Text style={{ color: colors.muted, fontSize: 12 }}>Trocar codigo de aparelho</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      {diagnosticoVisivel ? (
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: 24, backgroundColor: '#1b2224', borderRadius: 14, borderWidth: 1, borderColor: '#3a4a4d', padding: 14 }}>
          <Text style={{ color: '#ff8d8d', fontSize: 16, fontWeight: '800' }}>{diagnosticoTitulo}</Text>
          <Text style={{ color: colors.text, marginTop: 8, lineHeight: 21 }}>{diagnosticoMensagem}</Text>
          <Pressable
            onPress={() => setDiagnosticoVisivel(false)}
            style={{ marginTop: 12, alignSelf: 'flex-start', backgroundColor: '#2b4044', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}
          >
            <Text style={{ color: colors.text, fontWeight: '700' }}>Fechar</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
