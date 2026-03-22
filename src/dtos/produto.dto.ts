export interface CreateProdutoDTO {
    nome: string;
    marca: string;
    peso: number;
    porte: string;
    preco: number;
    estoque: number;
}

export interface UpdateProdutoDTO {
    nome?: string;
    marca?: string;
    peso?: number;
    porte?: string;
    preco?: number;
    estoque?: number;
}