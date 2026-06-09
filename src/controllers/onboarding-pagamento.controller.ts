import crypto from "crypto";
import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import comunicacaoCodigoService from "../services/comunicacao-codigo.service";
import emailService from "../services/email.service";
import onboardingAcessoService from "../services/onboarding-acesso.service";
import onboardingPagamentoService from "../services/onboarding-pagamento.service";

class OnboardingPagamentoController {
  private statusForOnboardingCodeError(errorMessage: string) {
    const throttledErrors = new Set([
      "codigo_reenvio_aguardar",
      "codigo_limite_envio_excedido",
      "codigo_bloqueado_por_tentativas",
    ]);

    return throttledErrors.has(errorMessage) ? 429 : 400;
  }

  private validarTokenWebhook(req: Request) {
    const expected = String(process.env.ONBOARDING_WEBHOOK_TOKEN || "");
    const rawHeader = req.headers["x-onboarding-webhook-token"];
    const provided = typeof rawHeader === "string" ? rawHeader : Array.isArray(rawHeader) ? rawHeader[0] || "" : "";

    if (!expected || !provided) return false;

    const expectedBuffer = Buffer.from(expected);
    const providedBuffer = Buffer.from(provided);
    if (expectedBuffer.length !== providedBuffer.length) return false;

    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  }

  private ensureAdmin(req: AuthRequest, res: Response) {
    if (req.role !== "ADMIN") {
      res.status(403).json({ error: "acesso_restrito_admin" });
      return false;
    }

    return true;
  }

  listarPlanos(req: Request, res: Response) {
    try {
      const planos = onboardingPagamentoService.listarPlanos();
      return res.json({ planos });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || "erro_listar_planos" });
    }
  }

  preferencias(req: Request, res: Response) {
    try {
      const preferencias = onboardingPagamentoService.preferenciasModulo();
      return res.json(preferencias);
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || "erro_preferencias_modulo" });
    }
  }

  async iniciarCadastro(req: Request, res: Response) {
    try {
      const payload = req.body || {};
      const result = await onboardingPagamentoService.iniciarCadastroComPagamento({
        empresaNome: String(payload.empresaNome || ""),
        empresaCnpj: payload.empresaCnpj ? String(payload.empresaCnpj) : undefined,
        adminNome: String(payload.adminNome || ""),
        adminEmail: String(payload.adminEmail || ""),
        adminSenha: String(payload.adminSenha || ""),
        planoId: String(payload.planoId || ""),
        providerPreferido: payload.providerPreferido,
        pais: payload.pais ? String(payload.pais) : undefined,
        moeda: payload.moeda ? String(payload.moeda) : undefined,
        precisaPix: Boolean(payload.precisaPix),
        finalidade: String(payload.finalidade || ""),
        baseLegal: String(payload.baseLegal || ""),
        consentimentoLgpd: Boolean(payload.consentimentoLgpd),
      });

      return res.status(201).json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error?.message || "erro_iniciar_cadastro" });
    }
  }

  async statusCadastro(req: Request, res: Response) {
    try {
      const id = String(req.params.id || "");
      const result = await onboardingPagamentoService.statusPreCadastro(id);
      return res.json(result);
    } catch (error: any) {
      return res.status(404).json({ error: error?.message || "erro_status_pre_cadastro" });
    }
  }

  async webhookPagamento(req: Request, res: Response) {
    try {
      if (!this.validarTokenWebhook(req)) {
        return res.status(401).json({ error: "webhook_token_invalido" });
      }

      const payload = req.body || {};
      const result = await onboardingPagamentoService.confirmarPagamento({
        preCadastroId: String(payload.preCadastroId || ""),
        provider: payload.provider,
        paymentStatus: payload.paymentStatus,
        externalPaymentId: payload.externalPaymentId ? String(payload.externalPaymentId) : undefined,
        externalSubscriptionId: payload.externalSubscriptionId ? String(payload.externalSubscriptionId) : undefined,
        metadata: payload.metadata || {},
      });

      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error?.message || "erro_webhook_pagamento" });
    }
  }

  async mockCheckout(req: Request, res: Response) {
    try {
      const id = String(req.params.id || "");
      const provider = String(req.query.provider || "ASAAS");
      const mode = String(req.query.result || "paid").toLowerCase();

      const result = await onboardingPagamentoService.confirmarPagamento({
        preCadastroId: id,
        provider: provider as any,
        paymentStatus: mode === "failed" ? "FAILED" : "PAID",
        externalPaymentId: `mock-pay-${Date.now()}`,
        externalSubscriptionId: `mock-sub-${Date.now()}`,
        metadata: { mockCheckout: true },
      });

      return res.json({
        success: true,
        mode,
        result,
      });
    } catch (error: any) {
      return res.status(400).json({ error: error?.message || "erro_mock_checkout" });
    }
  }

  async enviarCodigoAtivacao(req: Request, res: Response) {
    try {
      const payload = req.body || {};
      const result = await onboardingPagamentoService.reenviarCodigoAtivacao(
        String(payload.preCadastroId || "")
      );
      return res.json(result);
    } catch (error: any) {
      const message = error?.message || "erro_enviar_codigo_ativacao";
      return res.status(this.statusForOnboardingCodeError(message)).json({ error: message });
    }
  }

  async testeEmail(req: Request, res: Response) {
    try {
      if (!this.validarTokenWebhook(req)) {
        return res.status(401).json({ error: "webhook_token_invalido" });
      }

      const payload = req.body || {};
      const to = String(payload.email || "").trim().toLowerCase();
      if (!to) {
        return res.status(400).json({ error: "email_obrigatorio" });
      }

      const result = await emailService.send({
        to,
        subject: "Teste de comunicação de e-mail - SalesMind",
        text: "Este é um e-mail de teste do fluxo de ativação SalesMind.",
        html: "<p>Este é um e-mail de teste do fluxo de ativação <b>SalesMind</b>.</p>",
      });

      return res.json({ ok: true, to, result });
    } catch (error: any) {
      return res.status(400).json({ error: error?.message || "erro_teste_email" });
    }
  }

  async testeTelefoneCodigo(req: Request, res: Response) {
    try {
      if (!this.validarTokenWebhook(req)) {
        return res.status(401).json({ error: "webhook_token_invalido" });
      }

      const payload = req.body || {};
      const telefone = String(payload.telefone || "").trim();
      if (!telefone) {
        return res.status(400).json({ error: "telefone_obrigatorio" });
      }

      const canaisPreferidos = Array.isArray(payload.canaisPreferidos)
        ? payload.canaisPreferidos.filter((item: any) => item === "sms" || item === "whatsapp")
        : undefined;

      const codigo = comunicacaoCodigoService.gerarCodigoTeste();
      const results = await comunicacaoCodigoService.enviarCodigo({
        telefone,
        codigo,
        finalidade: "TESTE",
        canaisPreferidos,
      });

      return res.json({
        ok: true,
        telefone,
        results,
        // Exibido somente se habilitado explicitamente para ambiente de teste.
        ...(String(process.env.PHONE_DEV_RETURN_CODE || "false").toLowerCase() === "true" ? { codigo } : {}),
      });
    } catch (error: any) {
      return res.status(400).json({ error: error?.message || "erro_teste_telefone_codigo" });
    }
  }

  async confirmarCodigoAtivacao(req: Request, res: Response) {
    try {
      const payload = req.body || {};
      const result = await onboardingAcessoService.confirmarCodigoAtivacao({
        email: String(payload.email || ""),
        codigo: String(payload.codigo || ""),
      });
      return res.json(result);
    } catch (error: any) {
      const message = error?.message || "erro_confirmar_codigo_ativacao";
      return res.status(this.statusForOnboardingCodeError(message)).json({ error: message });
    }
  }

  async solicitarResetSenha(req: Request, res: Response) {
    try {
      const payload = req.body || {};
      const result = await onboardingAcessoService.solicitarRecuperacaoSenha(
        String(payload.email || "")
      );
      return res.json(result);
    } catch (error: any) {
      const message = error?.message || "erro_solicitar_reset_senha";
      return res.status(this.statusForOnboardingCodeError(message)).json({ error: message });
    }
  }

  async confirmarResetSenha(req: Request, res: Response) {
    try {
      const payload = req.body || {};
      const result = await onboardingAcessoService.redefinirSenhaComCodigo({
        email: String(payload.email || ""),
        codigo: String(payload.codigo || ""),
        novaSenha: String(payload.novaSenha || ""),
      });
      return res.json(result);
    } catch (error: any) {
      const message = error?.message || "erro_confirmar_reset_senha";
      return res.status(this.statusForOnboardingCodeError(message)).json({ error: message });
    }
  }

  async listarAssinaturas(req: AuthRequest, res: Response) {
    if (!this.ensureAdmin(req, res)) return;

    try {
      const result = await onboardingPagamentoService.listarAssinaturasPagas();
      return res.json({ assinaturas: result });
    } catch (error: any) {
      return res.status(400).json({ error: error?.message || "erro_listar_assinaturas" });
    }
  }

  async editarAssinatura(req: AuthRequest, res: Response) {
    if (!this.ensureAdmin(req, res)) return;

    try {
      const assinaturaId = String(req.params.assinaturaId || "");
      const payload = req.body || {};

      const result = await onboardingPagamentoService.editarAssinatura({
        assinaturaId,
        planoId: payload.planoId ? String(payload.planoId) : undefined,
        status: payload.status ? String(payload.status) : undefined,
        periodicidade: payload.periodicidade ? String(payload.periodicidade) as "MENSAL" | "ANUAL" : undefined,
        nextBillingAt: payload.nextBillingAt ? String(payload.nextBillingAt) : undefined,
      });

      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error?.message || "erro_editar_assinatura" });
    }
  }

  async editarMeioPagamento(req: AuthRequest, res: Response) {
    if (!this.ensureAdmin(req, res)) return;

    try {
      const assinaturaId = String(req.params.assinaturaId || "");
      const payload = req.body || {};

      const result = await onboardingPagamentoService.editarMeioPagamento({
        assinaturaId,
        metodo: String(payload.metodo || ""),
        titular: payload.titular ? String(payload.titular) : undefined,
        finalCartao: payload.finalCartao ? String(payload.finalCartao) : undefined,
        bandeira: payload.bandeira ? String(payload.bandeira) : undefined,
        tokenReferencia: payload.tokenReferencia ? String(payload.tokenReferencia) : undefined,
      });

      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error?.message || "erro_editar_meio_pagamento" });
    }
  }

  async editarLoginCliente(req: AuthRequest, res: Response) {
    if (!this.ensureAdmin(req, res)) return;

    try {
      const usuarioId = String(req.params.usuarioId || "");
      const payload = req.body || {};

      const result = await onboardingPagamentoService.editarLoginCliente({
        usuarioId,
        nome: payload.nome ? String(payload.nome) : undefined,
        email: payload.email ? String(payload.email) : undefined,
      });

      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error?.message || "erro_editar_login_cliente" });
    }
  }
}

export default new OnboardingPagamentoController();
