import cors from "cors";
import express from "express";
import { errorHandlingMiddleware } from "./middlewares/errorHandler";
import authRoutes from "./routes/auth.routes";
import diagnosticoRoutes from "./routes/diagnostico.routes";
import estoqueRoutes from "./routes/estoque.routes";
import financeiroRoutes from "./routes/financeiro.routes";
import fornecedoresRoutes from "./routes/fornecedores.routes";
import produtoRoutes from "./routes/produto.routes";
import vendasRoutes from "./routes/vendas.routes";

// App principal do backend SalesMind.
// Centraliza todas as rotas da API e configura o parser JSON com error handling global.
const app = express();

app.use(cors());
app.use(express.json());

// Rotas da aplicação
app.use("/auth", authRoutes);
app.use("/produtos", produtoRoutes);
app.use("/vendas", vendasRoutes);
app.use("/cadastros", fornecedoresRoutes);
app.use("/financeiro", financeiroRoutes);
app.use("/estoque", estoqueRoutes);

// Rotas de diagnóstico (sem autenticação para acesso em emergências)
app.use("/diagnostico", diagnosticoRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ success: true, status: "OK", timestamp: new Date().toISOString() });
});

// Middleware de error handling - DEVE SER O ÚLTIMO!
app.use(errorHandlingMiddleware());

export default app;
