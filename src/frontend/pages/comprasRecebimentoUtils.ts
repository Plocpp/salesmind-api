export type RiscoRecebimento = {
  mensagem: string;
  severidade: 'alta' | 'media';
  categoria: 'quantidade' | 'custo' | 'fiscal' | 'compatibilidade';
};

type RecebimentoItemRiscoInput = {
  quantidadePendente: number | string;
  quantidadeRecebida: number | string;
  custoUnitario: number | string;
};

type CalcularRiscosRecebimentoInput = {
  itens: RecebimentoItemRiscoInput[];
  chaveAcesso: string;
  alertasCriticos?: string[];
};

export const getRiscoCategoriaLabel = (categoria: RiscoRecebimento['categoria']) => {
  if (categoria === 'quantidade') return 'Quantidade';
  if (categoria === 'custo') return 'Custo';
  if (categoria === 'fiscal') return 'Fiscal';
  return 'Compatibilidade XML';
};

export const calcularRiscosRecebimento = (input: CalcularRiscosRecebimentoInput): RiscoRecebimento[] => {
  const riscos: RiscoRecebimento[] = [];

  const itensAcimaDoPendente = input.itens.filter((item) => Number(item.quantidadeRecebida || 0) > Number(item.quantidadePendente || 0));
  if (itensAcimaDoPendente.length > 0) {
    riscos.push({
      mensagem: `${itensAcimaDoPendente.length} item(ns) com quantidade acima do pendente`,
      severidade: 'alta',
      categoria: 'quantidade',
    });
  }

  const itensCustoInvalido = input.itens.filter((item) => Number(item.quantidadeRecebida || 0) > 0 && Number(item.custoUnitario || 0) <= 0);
  if (itensCustoInvalido.length > 0) {
    riscos.push({
      mensagem: `${itensCustoInvalido.length} item(ns) com custo unitario zerado`,
      severidade: 'alta',
      categoria: 'custo',
    });
  }

  const chaveAcessoNormalizada = String(input.chaveAcesso || '').trim();
  if (chaveAcessoNormalizada && chaveAcessoNormalizada.length < 44) {
    riscos.push({
      mensagem: 'chave de acesso com tamanho menor que 44 caracteres',
      severidade: 'alta',
      categoria: 'fiscal',
    });
  }

  const alertasCriticos = (input.alertasCriticos || []).filter((alerta) => alerta && alerta.trim().length > 0);
  riscos.push(...alertasCriticos.map((alerta) => ({
    mensagem: alerta,
    severidade: alerta.includes('baixa aderência') ? 'media' : 'alta',
    categoria: 'compatibilidade' as const,
  })));

  return riscos;
};
