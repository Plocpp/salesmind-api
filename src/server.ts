import cors from "cors";
import "dotenv/config";
import express from "express";

import authRouter from "./routes/auth.routes"; // <- importante
import produtoRouter from "./routes/produto.routes";

const app = express();

app.use(cors());
app.use(express.json());

// rotas de produtos
app.use("/produtos", produtoRouter);

// rotas de autenticação
app.use("/auth", authRouter);

app.get("/", (req, res) => {
    res.json({ message: "SalesMind API rodando 🚀" });
    });

    app.listen(3000, () => {
    console.log("Servidor rodando na porta 3000");
    });