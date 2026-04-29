"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 📦 POPULAR BANCO COM DADOS DE TESTE
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function popularBanco() {
    try {
        console.log('🌱 Populando banco de dados...');
        // Criar usuários de teste
        const admin = await prisma.usuario.upsert({
            where: { email: 'admin@test.com' },
            update: {},
            create: {
                nome: 'Administrador',
                email: 'admin@test.com',
                senha: '$2a$10$hashedpassword', // senha: 123456
                role: 'ADMIN',
            },
        });
        const vendedor = await prisma.usuario.upsert({
            where: { email: 'vendedor@test.com' },
            update: {},
            create: {
                nome: 'Vendedor',
                email: 'vendedor@test.com',
                senha: '$2a$10$hashedpassword', // senha: 123456
                role: 'VENDEDOR',
            },
        });
        console.log('👥 Usuários criados:', { admin: admin.id, vendedor: vendedor.id });
        console.log('🏭 Criando fornecedores...');
        // Criar fornecedores
        const fornecedor1 = await prisma.fornecedor.upsert({
            where: { cnpj: '12345678000100' },
            update: {},
            create: {
                nome: 'PetFood Distribuidora',
                cnpj: '12345678000100',
                telefone: '1133334444',
                email: 'contato@petfood.com',
                endereco: 'Rua das Indústrias, 1000, São Paulo - SP',
            },
        });
        const fornecedor2 = await prisma.fornecedor.upsert({
            where: { cnpj: '98765432000111' },
            update: {},
            create: {
                nome: 'VetCare Brasil',
                cnpj: '98765432000111',
                telefone: '1144445555',
                email: 'vendas@vetcare.com.br',
                endereco: 'Av. Paulista, 2000, São Paulo - SP',
            },
        });
        console.log('🏷️ Criando marcas...');
        // Criar marcas vinculadas aos fornecedores
        const marca1 = await prisma.marca.upsert({
            where: { nome: 'PetFood' },
            update: {},
            create: {
                nome: 'PetFood',
                fornecedorId: fornecedor1.id,
            },
        });
        const marca2 = await prisma.marca.upsert({
            where: { nome: 'VetCare' },
            update: {},
            create: {
                nome: 'VetCare',
                fornecedorId: fornecedor2.id,
            },
        });
        const marca3 = await prisma.marca.upsert({
            where: { nome: 'PetStyle' },
            update: {},
            create: {
                nome: 'PetStyle',
                fornecedorId: fornecedor1.id,
            },
        });
        const marca4 = await prisma.marca.upsert({
            where: { nome: 'FunPet' },
            update: {},
            create: {
                nome: 'FunPet',
                fornecedorId: fornecedor2.id,
            },
        });
        const marca5 = await prisma.marca.upsert({
            where: { nome: 'PetHome' },
            update: {},
            create: {
                nome: 'PetHome',
                fornecedorId: fornecedor1.id,
            },
        });
        console.log('📦 Criando produtos com marcas e validade...');
        // Criar produtos com as novas relações e validade
        const produtos = [
            {
                nome: 'Ração Premium para Cães',
                peso: 15.0,
                porte: 'Grande',
                preco: 89.90,
                estoque: 50,
                codigo: 'RAC001',
                codigoBarras: '7891234567890',
                cor: 'Marrom',
                tamanho: '15kg',
                validade: new Date('2025-12-31'),
                marcaId: marca1.id,
                usuarioId: admin.id,
            },
            {
                nome: 'Shampoo Antípulgas',
                peso: 0.5,
                porte: 'Todos',
                preco: 45.50,
                estoque: 30,
                codigo: 'SHA001',
                codigoBarras: '7891234567891',
                cor: 'Azul',
                tamanho: '500ml',
                validade: new Date('2026-06-30'),
                marcaId: marca2.id,
                usuarioId: admin.id,
            },
            {
                nome: 'Coleira Ajustável',
                peso: 0.2,
                porte: 'Médio',
                preco: 29.90,
                estoque: 25,
                codigo: 'COL001',
                codigoBarras: '7891234567892',
                cor: 'Preto',
                tamanho: 'M',
                validade: null, // Sem validade
                marcaId: marca3.id,
                usuarioId: vendedor.id,
            },
            {
                nome: 'Brinquedo Mordedor',
                peso: 0.3,
                porte: 'Pequeno',
                preco: 19.90,
                estoque: 40,
                codigo: 'BRI001',
                codigoBarras: '7891234567893',
                cor: 'Verde',
                tamanho: 'Único',
                validade: null, // Sem validade
                marcaId: marca4.id,
                usuarioId: admin.id,
            },
            {
                nome: 'Cama Pet Confortável',
                peso: 2.0,
                porte: 'Grande',
                preco: 149.90,
                estoque: 15,
                codigo: 'CAM001',
                codigoBarras: '7891234567894',
                cor: 'Bege',
                tamanho: '80x60cm',
                validade: null, // Sem validade
                marcaId: marca5.id,
                usuarioId: vendedor.id,
            },
        ];
        for (const produto of produtos) {
            await prisma.produto.upsert({
                where: { codigo: produto.codigo },
                update: {},
                create: produto,
            });
        }
        console.log('📦 Produtos criados com sucesso!');
        // Criar clientes de exemplo
        const clientes = [
            {
                nome: 'João Silva',
                telefone: '11999999999',
                email: 'joao@email.com',
            },
            {
                nome: 'Maria Santos',
                telefone: '11888888888',
                email: 'maria@email.com',
            },
        ];
        for (const cliente of clientes) {
            await prisma.cliente.upsert({
                where: { email: cliente.email },
                update: {},
                create: cliente,
            });
        }
        console.log('👤 Clientes criados com sucesso!');
        console.log('✅ Banco populado com sucesso!');
    }
    catch (error) {
        console.error('❌ Erro ao popular banco:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
// Executar se chamado diretamente
if (require.main === module) {
    popularBanco();
}
exports.default = popularBanco;
