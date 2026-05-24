import { useEffect, useRef, useState } from 'react';
import { Pressable, SafeAreaView, StatusBar, Text, View } from 'react-native';

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
  const etapaRef = useRef(etapaAtual);

  function atualizarEtapa(etapa: string) {
    etapaRef.current = etapa;
    setEtapaAtual(etapa);
  }

  useEffect(() => {
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

    return () => {
      if (handlerAnterior) {
        globalObj.ErrorUtils?.setGlobalHandler?.(handlerAnterior);
      }
    };
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
        <View
          style={{
            backgroundColor: colors.panel,
            borderRadius: 20,
            padding: 22,
            borderWidth: 1,
            borderColor: colors.panelSoft,
          }}
        >
          <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '800', letterSpacing: 1.2 }}>
            SALESMIND RASTREIO
          </Text>
          <Text style={{ color: colors.text, fontSize: 30, fontWeight: '900', marginTop: 10, lineHeight: 36 }}>
            Tela mínima de diagnóstico
          </Text>
          <Text style={{ color: colors.muted, fontSize: 16, marginTop: 14, lineHeight: 23 }}>
            Esta versão não carrega rastreio, permissões, módulos nativos nem ações automáticas no boot.
            O objetivo é apenas confirmar que o APK permanece aberto.
          </Text>

          <Text style={{ color: colors.muted, marginTop: 10 }}>Etapa atual: {etapaAtual}</Text>

          <View
            style={{
              marginTop: 18,
              backgroundColor: colors.panelSoft,
              borderRadius: 14,
              padding: 14,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Se esta tela fechar:</Text>
            <Text style={{ color: colors.muted, marginTop: 8, lineHeight: 21 }}>
              então o problema está no build nativo, na configuração do Expo ou em alguma dependência carregada fora do App.tsx.
            </Text>
          </View>

          <Text style={{ color: colors.muted, marginTop: 12, lineHeight: 21 }}>
            Se não aparecer este popup e o app fechar direto, o problema provavelmente é nativo (fora do JavaScript).
          </Text>
        </View>
      </View>

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