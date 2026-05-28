# NFC-e para CNPJ - Estrutura recomendada

## Referencias consultadas
- Portal Nacional NF-e/NFC-e: https://www.nfe.fazenda.gov.br/portal/principal.aspx
- Avisos tecnicos no Portal NF-e (ex.: NT 2026.002, NT 2026.003, NT 2025.002) para leiaute e DANFE simplificado.
- Pagina oficial de disponibilidade dos servicos: https://www.nfe.fazenda.gov.br/portal/disponibilidade.aspx

## Campos essenciais para destinatario CNPJ
- CNPJ valido (14 digitos + DV valido)
- Razao social
- Indicador de IE (`CONTRIBUINTE`, `CONTRIBUINTE_ISENTO`, `NAO_CONTRIBUINTE`)
- Inscricao estadual (quando contribuinte)
- Endereco (logradouro, numero, bairro, municipio IBGE, municipio, UF, CEP)
- Email e telefone (recomendado para contingencia operacional)

## Campos essenciais da NFC-e (estrutura de trabalho)
- Identificacao:
  - `naturezaOperacao`
  - `consumidorFinal`
  - `presencaComprador`
  - `ambiente` (`HOMOLOGACAO` ou `PRODUCAO`)
- Itens fiscais:
  - `codigo`, `descricao`
  - `NCM` (8 digitos)
  - `CFOP` (4 digitos)
  - `unidadeComercial`, `quantidadeComercial`, `valorUnitarioComercial`
  - `origemIcms`, `cstIcms`, `cstPis`, `cstCofins`
- Totais:
  - subtotal, desconto, frete, seguro, outras despesas, total
- Pagamentos:
  - tipo, valor, integracao
  - quando cartao: credenciadora, bandeira, autorizacao

## Regras operacionais implementadas no sistema
- Validacao de CPF/CNPJ no backend antes de emitir.
- Exigencia de razao social para destinatario juridico.
- Possibilidade de envio de destinatario completo, itens fiscais, totais e pagamentos.
- Registro da emissao no metadata da venda para rastreabilidade.

## Observacao importante
- Regras fiscais variam por UF e por Nota Tecnica vigente. Para ambiente de producao, manter monitoramento continuo das NTs publicadas no Portal NF-e.
