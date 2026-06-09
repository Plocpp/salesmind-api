import comunicacaoCodigoService from "../src/services/comunicacao-codigo.service";

async function main() {
  const telefone = String(process.argv[2] || process.env.PHONE_TEST_NUMBER || "").trim();
  if (!telefone) {
    throw new Error("telefone_teste_obrigatorio");
  }

  const codigo = comunicacaoCodigoService.gerarCodigoTeste();
  const results = await comunicacaoCodigoService.enviarCodigo({
    telefone,
    codigo,
    finalidade: "TESTE",
    canaisPreferidos: ["sms", "whatsapp"],
  });

  const payload = {
    ok: true,
    telefone,
    mode: String(process.env.PHONE_MOCK_MODE || "true").toLowerCase() === "true" ? "mock" : "twilio",
    ...(String(process.env.PHONE_DEV_RETURN_CODE || "false").toLowerCase() === "true" ? { codigo } : {}),
    results,
  };

  console.log(JSON.stringify(payload, null, 2));
}

main().catch((error: any) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error?.message || String(error),
      },
      null,
      2
    )
  );
  process.exit(1);
});
