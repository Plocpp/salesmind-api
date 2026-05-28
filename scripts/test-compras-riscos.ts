import { calcularRiscosRecebimento } from '../src/frontend/pages/comprasRecebimentoUtils';

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function run() {
  const riscosCriticos = calcularRiscosRecebimento({
    itens: [
      { quantidadePendente: 3, quantidadeRecebida: 5, custoUnitario: 10 },
      { quantidadePendente: 2, quantidadeRecebida: 1, custoUnitario: 0 },
    ],
    chaveAcesso: '1234',
    alertasCriticos: ['valor total distante do pedido'],
  });

  assert(riscosCriticos.some((r) => r.categoria === 'quantidade' && r.severidade === 'alta'), 'Esperava risco alto de quantidade.');
  assert(riscosCriticos.some((r) => r.categoria === 'custo' && r.severidade === 'alta'), 'Esperava risco alto de custo.');
  assert(riscosCriticos.some((r) => r.categoria === 'fiscal' && r.severidade === 'alta'), 'Esperava risco alto fiscal.');
  assert(riscosCriticos.some((r) => r.categoria === 'compatibilidade' && r.severidade === 'alta'), 'Esperava risco alto de compatibilidade.');

  const riscosMedios = calcularRiscosRecebimento({
    itens: [{ quantidadePendente: 2, quantidadeRecebida: 2, custoUnitario: 10 }],
    chaveAcesso: '12345678901234567890123456789012345678901234',
    alertasCriticos: ['quantidade total com baixa aderência ao pedido'],
  });

  assert(riscosMedios.length === 1, 'Esperava apenas um risco medio de compatibilidade.');
  assert(riscosMedios[0].severidade === 'media', 'Esperava severidade media para baixa aderencia.');

  const semRisco = calcularRiscosRecebimento({
    itens: [{ quantidadePendente: 2, quantidadeRecebida: 2, custoUnitario: 11 }],
    chaveAcesso: '12345678901234567890123456789012345678901234',
    alertasCriticos: [],
  });

  assert(semRisco.length === 0, 'Nao deveria gerar riscos em cenario valido.');

  console.log('Teste compras-riscos: OK');
}

run();
