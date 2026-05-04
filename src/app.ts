import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import fornecedoresRoutes from "./routes/fornecedores.routes";
import produtoRoutes from "./routes/produto.routes";
import vendasRoutes from "./routes/vendas.routes";

// App principal do backend SalesMind.
// Centraliza todas as rotas da API e configura o parser JSON.
const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/produtos", produtoRoutes);
app.use("/vendas", vendasRoutes);
app.use("/cadastros", fornecedoresRoutes);

export default app;