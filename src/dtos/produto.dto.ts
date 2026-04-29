export interface CreateProdutoDTO {
    nome: string;
    marcaId: string;
    peso: number;
    porte: string;
    preco: number;
    estoque: number;
}

export interface UpdateProdutoDTO {
    nome?: string;
    marcaId?: string;
    peso?: number;
    porte?: string;
    preco?: number;
    estoque?: number;
}