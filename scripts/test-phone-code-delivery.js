const axios = require('axios');

const baseUrl = String(process.env.PHONE_TEST_BASE_URL || 'https://salesmind-api.onrender.com').replace(/\/$/, '');
const webhookToken = String(process.env.ONBOARDING_WEBHOOK_TOKEN || '');
const telefone = String(process.argv[2] || process.env.PHONE_TEST_NUMBER || '').trim();

async function main() {
  if (!telefone) {
    throw new Error('telefone_teste_obrigatorio');
  }

  if (!webhookToken) {
    throw new Error('ONBOARDING_WEBHOOK_TOKEN_nao_configurado');
  }

  const response = await axios.post(
    `${baseUrl}/onboarding/telefone/teste-codigo`,
    {
      telefone,
      canaisPreferidos: ['sms', 'whatsapp'],
    },
    {
      timeout: 20000,
      headers: {
        'x-onboarding-webhook-token': webhookToken,
      },
    }
  );

  console.log(JSON.stringify(response.data, null, 2));
}

main().catch((error) => {
  const payload = {
    ok: false,
    error: error?.response?.data || error?.message || String(error),
  };
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
});
