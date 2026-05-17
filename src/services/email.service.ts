import nodemailer, { Transporter } from "nodemailer";

type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

type EmailResult = {
  delivered: boolean;
  mode: "mock" | "smtp";
  messageId?: string;
};

class EmailService {
  private transporter: Transporter | null = null;

  private get sender() {
    return process.env.EMAIL_FROM || "no-reply@salesmind.local";
  }

  private get mockMode() {
    const raw = process.env.EMAIL_MOCK_MODE;
    if (raw === undefined) return true;
    return String(raw).toLowerCase() === "true";
  }

  private resolveSmtpConfig() {
    const provider = String(process.env.EMAIL_PROVIDER || "custom").toLowerCase();

    const defaultHost = provider === "outlook" || provider === "office365" ? "smtp.office365.com" : "";
    const defaultPort = provider === "outlook" || provider === "office365" ? 587 : 587;

    const host = process.env.SMTP_HOST || defaultHost;
    const port = Number(process.env.SMTP_PORT || defaultPort);
    const user = process.env.SMTP_USER || "";
    const pass = process.env.SMTP_PASS || "";
    const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";

    return {
      host,
      port,
      user,
      pass,
      secure,
    };
  }

  private getTransporter() {
    if (this.transporter) return this.transporter;

    const config = this.resolveSmtpConfig();
    if (!config.host || !config.user || !config.pass) {
      throw new Error("smtp_config_incompleta");
    }

    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    return this.transporter;
  }

  async send(payload: EmailPayload): Promise<EmailResult> {
    const message = {
      from: this.sender,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html || payload.text,
      sentAt: new Date().toISOString(),
    };

    // Em modo mock, registramos no log para validar o fluxo sem dependência externa.
    if (this.mockMode) {
      console.log("[EMAIL_MOCK]", JSON.stringify(message, null, 2));
      return { delivered: false, mode: "mock" };
    }

    const transporter = this.getTransporter();
    const info = await transporter.sendMail({
      from: this.sender,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html || payload.text,
    });

    console.log("[EMAIL_SMTP]", JSON.stringify({ to: payload.to, messageId: info.messageId }));
    return { delivered: true, mode: "smtp", messageId: info.messageId };
  }
}

const emailService = new EmailService();

export default emailService;
