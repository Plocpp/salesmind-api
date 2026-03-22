import { z } from "zod";

export const produtoSchema = z.object({
    nome: z.string().min(1, "Nome é obrigatório"),
    marca: z.string().min(1, "Marca é obrigatória"),
    peso: z.number().positive("Peso deve ser positivo"),
    porte: z.string(),
    preco: z.number().positive("Preço deve ser positivo"),
    estoque: z.number().int().nonnegative("Estoque não pode ser negativo")
});

export type ProdutoInput = z.infer<typeof produtoSchema>;