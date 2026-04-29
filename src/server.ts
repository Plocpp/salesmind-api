import cors from "cors";
import "dotenv/config";
import app from "./app";

const port = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(cors());

app.get("/", (req, res) => {
  res.json({ message: "SalesMind API rodando 🚀" });
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});