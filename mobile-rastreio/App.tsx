import React from 'react';
import { SafeAreaView, StatusBar, Text, View } from 'react-native';

const colors = {
  background: '#091417',
  panel: '#123036',
  panelSoft: '#173b42',
  text: '#f2fbfa',
  muted: '#a9c7c4',
  accent: '#43d6c2',
};

export default function App() {
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
        </View>
      </View>
    </SafeAreaView>
  );
}