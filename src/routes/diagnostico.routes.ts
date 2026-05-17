/**
 * Rotas de Diagnóstico e Monitoramento
 * Endpoints para verificar saúde do sistema e erros
 */

import { PrismaClient } from '@prisma/client';
import { Request, Response, Router } from 'express';
import { errorReporter } from '../utils/errorReporter';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /diagnostico/saude
 * Verifica saúde geral do sistema
 */
router.get('/saude', async (req: Request, res: Response) => {
  try {
    const diagnostico = {
      timestamp: new Date().toISOString(),
      sistema: {
        nodeVersion: process.version,
        uptime: process.uptime(),
        memoria: process.memoryUsage(),
      },
      database: {
        conectado: false,
        erro: null as string | null,
      },
      erros: errorReporter.getErrorStats(),
    };

    // Testar conexão com banco
    try {
      await prisma.$queryRaw`SELECT 1`;
      diagnostico.database.conectado = true;
    } catch (error) {
      diagnostico.database.erro = error instanceof Error ? error.message : String(error);
    }

    const status = diagnostico.database.conectado && diagnostico.erros.critical === 0 ? 'OK' : 'AVISO';
    res.status(diagnostico.database.conectado ? 200 : 503).json({
      success: true,
      status,
      diagnostico,
    });
  } catch (error) {
    const normalizedError = error instanceof Error ? error : String(error);
    errorReporter.report(normalizedError, { endpoint: '/diagnostico/saude', method: 'GET' });
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar saúde do sistema',
    });
  }
});

/**
 * GET /diagnostico/erros
 * Lista todos os erros do sistema
 */
router.get('/erros', (req: Request, res: Response) => {
  const filter = {
    type: req.query.type as string | undefined,
    severity: req.query.severity as string | undefined,
    resolved: req.query.resolved === 'true' ? true : req.query.resolved === 'false' ? false : undefined,
  };

  const erros = errorReporter.getAllErrors(filter);
  const stats = errorReporter.getErrorStats();

  res.json({
    success: true,
    stats,
    erros,
    total: erros.length,
  });
});

/**
 * GET /diagnostico/erros/:id
 * Obtém detalhes de um erro específico
 */
router.get('/erros/:id', (req: Request, res: Response) => {
  const errorId = String(req.params.id || '');
  const erro = errorReporter.getReport(errorId);

  if (!erro) {
    return res.status(404).json({
      success: false,
      message: 'Erro não encontrado',
    });
  }

  res.json({
    success: true,
    erro,
  });
});

/**
 * POST /diagnostico/erros/:id/resolver
 * Marca um erro como resolvido
 */
router.post('/erros/:id/resolver', (req: Request, res: Response) => {
  const errorId = String(req.params.id || '');
  errorReporter.markAsResolved(errorId);

  res.json({
    success: true,
    message: 'Erro marcado como resolvido',
  });
});

/**
 * GET /diagnostico/relatorio
 * Gera relatório completo de erros
 */
router.get('/relatorio', (req: Request, res: Response) => {
  const relatorio = errorReporter.generateReport();

  res.json({
    success: true,
    relatorio,
  });
});

/**
 * POST /diagnostico/testar-erro
 * Endpoint para testar o sistema de error reporting
 */
router.post('/testar-erro', (req: Request, res: Response) => {
  const { tipo = 'generic', message = 'Erro de teste' } = req.body;

  // Simular diferentes tipos de erro
  let erro: Error;

  switch (tipo) {
    case 'database':
      erro = new Error('The column `salesmind.Produto.precoCusto` does not exist in the current database');
      break;
    case 'network':
      erro = new Error('ECONNREFUSED: Connection refused on localhost:5432');
      break;
    case 'syntax':
      erro = new Error('SyntaxError: Unexpected token } in JSON');
      break;
    case 'auth':
      erro = new Error('401 Unauthorized: Invalid token');
      break;
    case 'notfound':
      erro = new Error('404 Not found: Recurso não encontrado');
      break;
    case 'timeout':
      erro = new Error('Timeout: Request exceeded 30000ms deadline');
      break;
    case 'foreign_key':
      erro = new Error('Foreign key constraint failed: Referência inválida');
      break;
    default:
      erro = new Error(message);
  }

  const report = errorReporter.report(erro, {
    endpoint: '/diagnostico/testar-erro',
    method: 'POST',
    body: req.body,
  });

  res.json({
    success: true,
    message: 'Erro de teste reportado com sucesso',
    report,
  });
});

/**
 * POST /diagnostico/migracoes/status
 * Verifica status das migrações Prisma
 */
router.post('/migracoes/status', async (req: Request, res: Response) => {
  try {
    const resultado = await prisma.$executeRawUnsafe(
      `SELECT version, execution_time FROM "_prisma_migrations" ORDER BY finished_at DESC LIMIT 20;`
    );

    res.json({
      success: true,
      migracoes: resultado,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const normalizedError = error instanceof Error ? error : String(error);
    const report = errorReporter.report(normalizedError, {
      endpoint: '/diagnostico/migracoes/status',
      method: 'POST',
    });

    res.status(400).json({
      success: false,
      errorId: report.id,
      message: 'Erro ao verificar migrações',
      suggestedFix: report.suggestedFix,
    });
  }
});

/**
 * POST /diagnostico/banco/verificar
 * Verifica integridade das tabelas e schemas
 */
router.post('/banco/verificar', async (req: Request, res: Response) => {
  try {
    // Verificar existência de tabelas principais
    const tabelasEsperadas = [
      'Usuario',
      'Produto',
      'Cliente',
      'Venda',
      'ItemVenda',
      'Caixa',
      'MovimentoCaixa',
      'Fornecedor',
      'Categoria',
      'Marca',
    ];

    const resultado = {
      timestamp: new Date().toISOString(),
      tabelasEsperadas,
      tabelasExistentes: [] as string[],
      tabelasAusentes: [] as string[],
      erros: [] as { tabela: string; erro: string }[],
    };

    for (const tabela of tabelasEsperadas) {
      try {
        await prisma.$executeRawUnsafe(`SELECT 1 FROM "${tabela}" LIMIT 1;`);
        resultado.tabelasExistentes.push(tabela);
      } catch (error) {
        resultado.tabelasAusentes.push(tabela);
        resultado.erros.push({
          tabela,
          erro: error instanceof Error ? error.message : String(error),
        });
      }
    }

    res.json({
      success: resultado.tabelasAusentes.length === 0,
      resultado,
      suggestedFix:
        resultado.tabelasAusentes.length > 0
          ? `Tabelas faltando: ${resultado.tabelasAusentes.join(', ')}. Execute: npx prisma migrate deploy`
          : undefined,
    });
  } catch (error) {
    const normalizedError = error instanceof Error ? error : String(error);
    const report = errorReporter.report(normalizedError, {
      endpoint: '/diagnostico/banco/verificar',
      method: 'POST',
    });

    res.status(500).json({
      success: false,
      errorId: report.id,
      message: 'Erro ao verificar banco de dados',
      suggestedFix: report.suggestedFix,
    });
  }
});

export default router;
