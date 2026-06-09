import crypto from "crypto";

type CanalComunicacao = "sms" | "whatsapp";

type SendCodigoInput = {
  telefone: string;
  codigo: string;
  finalidade: "ATIVACAO" | "RECUPERACAO" | "TESTE";
  canaisPreferidos?: CanalComunicacao[];
};

type SendResult = {
  ok: boolean;
  canal: CanalComunicacao;
  mode: "mock" | "twilio";
  delivered: boolean;
  providerMessageId?: string;
  erro?: string;
};

class ComunicacaoCodigoService {
  private normalizeTelefone(valor: string) {
    const digits = String(valor || "").replace(/\D/g, "");

    if (!digits) throw new Error("telefone_obrigatorio");

    if (digits.length === 10 || digits.length === 11) {
      return `55${digits}`;
    }

    if (digits.length === 12 || digits.length === 13) {
      return digits;
    }

    throw new Error("telefone_invalido_formato_ddd");
  }

  private get mockMode() {
    const raw = process.env.PHONE_MOCK_MODE;
    if (raw === undefined) return true;
    return String(raw).toLowerCase() === "true";
  }

  private twilioConfig() {
    return {
      sid: String(process.env.TWILIO_ACCOUNT_SID || ""),
      token: String(process.env.TWILIO_AUTH_TOKEN || ""),
      smsFrom: String(process.env.TWILIO_SMS_FROM || ""),
      whatsappFrom: String(process.env.TWILIO_WHATSAPP_FROM || ""),
    };
  }

  private mensagem(codigo: string, finalidade: SendCodigoInput["finalidade"]) {
    const finalidades: Record<SendCodigoInput["finalidade"], string> = {
      ATIVACAO: "ativação da sua conta",
      RECUPERACAO: "recuperação da sua senha",
      TESTE: "teste de comunicação",
    };

    return `SalesMind: seu código para ${finalidades[finalidade]} é ${codigo}. Validade curta por segurança.`;
  }

  private async sendTwilio(params: {
    toTelefoneE164SemMais: string;
    body: string;
    canal: CanalComunicacao;
  }): Promise<SendResult> {
    const cfg = this.twilioConfig();
    if (!cfg.sid || !cfg.token) {
      throw new Error("twilio_credenciais_ausentes");
    }

    const fromRaw = params.canal === "sms" ? cfg.smsFrom : cfg.whatsappFrom;
    if (!fromRaw) {
      throw new Error(params.canal === "sms" ? "twilio_sms_from_ausente" : "twilio_whatsapp_from_ausente");
    }

    const to = params.canal === "sms"
      ? `+${params.toTelefoneE164SemMais}`
      : `whatsapp:+${params.toTelefoneE164SemMais}`;
    const from = params.canal === "sms" ? fromRaw : fromRaw.startsWith("whatsapp:") ? fromRaw : `whatsapp:${fromRaw}`;

    const body = new URLSearchParams({
      To: to,
      From: from,
      Body: params.body,
    });

    const auth = Buffer.from(`${cfg.sid}:${cfg.token}`).toString("base64");
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const raw = await response.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      return {
        ok: false,
        canal: params.canal,
        mode: "twilio",
        delivered: false,
        erro: parsed?.message || raw || `http_${response.status}`,
      };
    }

    return {
      ok: true,
      canal: params.canal,
      mode: "twilio",
      delivered: true,
      providerMessageId: String(parsed?.sid || ""),
    };
  }

  private async sendMock(params: {
    toTelefoneE164SemMais: string;
    body: string;
    canal: CanalComunicacao;
  }): Promise<SendResult> {
    const payload = {
      to: `+${params.toTelefoneE164SemMais}`,
      canal: params.canal,
      body: params.body,
      sentAt: new Date().toISOString(),
    };

    console.log(`[PHONE_${params.canal.toUpperCase()}_MOCK]`, JSON.stringify(payload, null, 2));

    return {
      ok: true,
      canal: params.canal,
      mode: "mock",
      delivered: false,
    };
  }

  async enviarCodigo(input: SendCodigoInput): Promise<SendResult[]> {
    const telefone = this.normalizeTelefone(input.telefone);
    const codigo = String(input.codigo || "").trim();
    if (!/^\d{6}$/.test(codigo)) throw new Error("codigo_invalido_formato_6_digitos");

    const body = this.mensagem(codigo, input.finalidade);
    const canais = (input.canaisPreferidos && input.canaisPreferidos.length
      ? input.canaisPreferidos
      : ["sms", "whatsapp"]) as CanalComunicacao[];

    const results: SendResult[] = [];
    for (const canal of canais) {
      if (this.mockMode) {
        results.push(await this.sendMock({ toTelefoneE164SemMais: telefone, body, canal }));
        continue;
      }

      results.push(await this.sendTwilio({ toTelefoneE164SemMais: telefone, body, canal }));
    }

    return results;
  }

  gerarCodigoTeste() {
    return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
  }
}

const comunicacaoCodigoService = new ComunicacaoCodigoService();

export default comunicacaoCodigoService;
