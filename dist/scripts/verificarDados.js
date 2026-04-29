"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 📊 VERIFICAR DADOS NO BANCO
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function verificarDados() {
    try {
        console.log('🔍 Verificando dados no banco...\n');
        // Contar fornecedores
        const totalFornecedores = await prisma.fornecedor.count();
        console.log(`🏭 Total de fornecedores: ${totalFornecedores}`);
        // Listar fornecedores
        const fornecedores = await prisma.fornecedor.findMany({
            include: {
                marcas: {
                    include: {
                        produtos: true
                    }
                }
            }
        });
        fornecedores.forEach(fornecedor => {
            console.log(`  - ${fornecedor.nome} (${fornecedor.cnpj})`);
            console.log(`    Marcas: ${fornecedor.marcas.length}`);
            fornecedor.marcas.forEach(marca => {
                console.log(`      * ${marca.nome} (${marca.produtos.length} produtos)`);
            });
        });
        console.log('\n📦 Produtos criados:');
        const produtos = await prisma.produto.findMany({
            include: {
                marca: {
                    include: {
                        fornecedor: true
                    }
                }
            }
        });
        produtos.forEach(produto => {
            console.log(`  - ${produto.nome} (${produto.marca?.nome || 'Sem marca'}) - R$ ${produto.preco.toFixed(2)} - Estoque: ${produto.estoque}`);
            if (produto.validade) {
                console.log(`    Validade: ${produto.validade.toISOString().split('T')[0]}`);
            }
        });
        // Contar usuários e clientes
        const totalUsuarios = await prisma.usuario.count();
        const totalClientes = await prisma.cliente.count();
        console.log(`\n👥 Total de usuários: ${totalUsuarios}`);
        console.log(`👤 Total de clientes: ${totalClientes}`);
    }
    catch (error) {
        console.error('❌ Erro ao verificar dados:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
verificarDados();
