import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { errorHandlingMiddleware } from "./middlewares/errorHandler";
import acessosRoutes from "./routes/acessos.routes";
import authRoutes from "./routes/auth.routes";
import diagnosticoRoutes from "./routes/diagnostico.routes";
import estoqueRoutes from "./routes/estoque.routes";
import financeiroRoutes from "./routes/financeiro.routes";
import fornecedoresRoutes from "./routes/fornecedores.routes";
import integracoesRoutes from "./routes/integracoes.routes";
import onboardingPagamentoRoutes from "./routes/onboarding-pagamento.routes";
import produtoRoutes from "./routes/produto.routes";
import rastreioTransporteRoutes from "./routes/rastreio-transporte.routes";
import vendasRoutes from "./routes/vendas.routes";

// App principal do backend SalesMind.
// Centraliza todas as rotas da API e configura o parser JSON com error handling global.
const app = express();

const isProduction = process.env.NODE_ENV === "production";
const jsonBodyLimit = process.env.JSON_BODY_LIMIT || "1mb";
const corsAllowedMethods = process.env.CORS_ALLOWED_METHODS || "GET,POST,PUT,PATCH,DELETE,OPTIONS";
const corsAllowedHeaders = process.env.CORS_ALLOWED_HEADERS || "Authorization,Content-Type,x-onboarding-webhook-token";

const trustProxyRaw = process.env.TRUST_PROXY;
if (trustProxyRaw === "true") {
  app.set("trust proxy", true);
} else if (trustProxyRaw && /^\d+$/.test(trustProxyRaw)) {
  app.set("trust proxy", Number(trustProxyRaw));
}

const corsAllowlist = [
  process.env.FRONTEND_BASE_URL,
  ...(process.env.CORS_ORIGIN_ALLOWLIST || "").split(",").map((item) => item.trim()),
]
  .filter(Boolean)
  .map((origin) => origin!.toLowerCase());

app.disable("x-powered-by");

app.use(
  helmet({
    // API publica nao depende de policy de recurso entre origens.
    crossOriginResourcePolicy: false,
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!isProduction) {
        return callback(null, true);
      }

      if (!origin) {
        return callback(null, true);
      }

      if (corsAllowlist.includes(origin.toLowerCase())) {
        return callback(null, true);
      }

      return callback(new Error("Origem nao permitida pelo CORS"));
    },
    methods: corsAllowedMethods.split(",").map((item) => item.trim()),
    allowedHeaders: corsAllowedHeaders.split(",").map((item) => item.trim()),
    credentials: true,
    maxAge: 86400,
  })
);

app.use(express.json({ limit: jsonBodyLimit }));
app.use(express.urlencoded({ extended: false, limit: jsonBodyLimit }));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX_GLOBAL || 600),
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Muitas requisicoes, tente novamente em alguns minutos." },
  })
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX_AUTH || 60),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Muitas tentativas de autenticacao. Aguarde e tente novamente." },
});

app.use("/auth", authLimiter);
app.use("/api/v1/auth", authLimiter);

app.use(
  "/rastreio/mobile",
  rateLimit({
    windowMs: 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX_RASTREIO_MOBILE || 240),
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Limite de envio de localizacao excedido. Tente novamente em instantes." },
  })
);

// Rotas da aplicação
app.use("/auth", authRoutes);
app.use("/acessos", acessosRoutes);
app.use("/produtos", produtoRoutes);
app.use("/vendas", vendasRoutes);
app.use("/cadastros", fornecedoresRoutes);
app.use("/financeiro", financeiroRoutes);
app.use("/estoque", estoqueRoutes);
app.use("/integracoes", integracoesRoutes);
app.use("/onboarding", onboardingPagamentoRoutes);
app.use("/rastreio", rastreioTransporteRoutes);

// Alias versionado para padrao enterprise sem quebrar clientes legados.
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/acessos", acessosRoutes);
app.use("/api/v1/produtos", produtoRoutes);
app.use("/api/v1/vendas", vendasRoutes);
app.use("/api/v1/cadastros", fornecedoresRoutes);
app.use("/api/v1/financeiro", financeiroRoutes);
app.use("/api/v1/estoque", estoqueRoutes);
app.use("/api/v1/integracoes", integracoesRoutes);
app.use("/api/v1/onboarding", onboardingPagamentoRoutes);
app.use("/api/v1/rastreio", rastreioTransporteRoutes);

// Rotas de diagnóstico (sem autenticação para acesso em emergências)
app.use("/diagnostico", diagnosticoRoutes);
app.use("/api/v1/diagnostico", diagnosticoRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ success: true, status: "OK", timestamp: new Date().toISOString() });
});

app.get("/api/v1/health", (req, res) => {
  res.json({ success: true, status: "OK", timestamp: new Date().toISOString() });
});

// Middleware de error handling - DEVE SER O ÚLTIMO!
app.use(errorHandlingMiddleware());

export default app;
