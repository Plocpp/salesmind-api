/**
 * Sistema de Error Reporting com Análise de IA
 * Detecta, classifica e reporta erros automaticamente
 */

export interface ErrorContext {
  endpoint?: string;
  method?: string;
  userId?: string;
  timestamp: Date;
  userAgent?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: unknown;
  queryParams?: Record<string, string>;
}

export interface ErrorReport {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  message: string;
  stack?: string;
  context: ErrorContext;
  suggestedFix?: string;
  relatedErrors?: string[];
  timestamp: Date;
  resolved: boolean;
}

class ErrorReporter {
  private errors: Map<string, ErrorReport> = new Map();
  private errorPatterns = [
    { pattern: /ENOENT|file not found/i, type: 'FileNotFound', severity: 'high' as const },
    { pattern: /ECONNREFUSED|connection refused/i, type: 'ConnectionRefused', severity: 'critical' as const },
    { pattern: /ENOTFOUND|ETIMEDOUT/i, type: 'NetworkError', severity: 'high' as const },
    { pattern: /SyntaxError|Unexpected token/i, type: 'SyntaxError', severity: 'high' as const },
    { pattern: /TypeError|Cannot read property/i, type: 'TypeError', severity: 'medium' as const },
    { pattern: /ReferenceError|is not defined/i, type: 'ReferenceError', severity: 'medium' as const },
    { pattern: /The column .* does not exist/i, type: 'DatabaseColumnNotFound', severity: 'critical' as const },
    { pattern: /Unique constraint failed/i, type: 'UniqueConstraintViolation', severity: 'high' as const },
    { pattern: /Foreign key constraint failed/i, type: 'ForeignKeyViolation', severity: 'high' as const },
    { pattern: /CORS|Cross-Origin/i, type: 'CORSError', severity: 'medium' as const },
    { pattern: /401|Unauthorized|Invalid token/i, type: 'AuthenticationError', severity: 'high' as const },
    { pattern: /403|Forbidden|Permission denied/i, type: 'AuthorizationError', severity: 'medium' as const },
    { pattern: /404|Not found|does not exist/i, type: 'NotFoundError', severity: 'low' as const },
    { pattern: /500|Internal Server Error/i, type: 'ServerError', severity: 'critical' as const },
    { pattern: /503|Service Unavailable/i, type: 'ServiceUnavailable', severity: 'critical' as const },
    { pattern: /Timeout|timed out|deadline exceeded/i, type: 'TimeoutError', severity: 'high' as const },
  ];

  private fixes: Record<string, string> = {
    FileNotFound: 'Verifique se o arquivo existe no caminho especificado. Execute npm run build para gerar arquivos necessários.',
    ConnectionRefused: 'O servidor não está respondendo. Reinicie o servidor Express com npm run dev.',
    NetworkError: 'Problema de rede detectado. Verifique sua conexão ou se as dependências externas estão disponíveis.',
    SyntaxError: 'Erro de sintaxe no código. Verifique a compilação com npm run build.',
    TypeError: 'Verifique se todos os objetos possuem as propriedades necessárias.',
    ReferenceError: 'Variável ou função não está definida. Verifique os imports.',
    DatabaseColumnNotFound: 'Coluna não existe no banco. Execute prisma migrate dev para sincronizar o schema.',
    UniqueConstraintViolation: 'Registro duplicado. Verifique se o registro já existe na base.',
    ForeignKeyViolation: 'Referência inválida. Verifique se o registro referenciado existe.',
    CORSError: 'Problema de CORS. Verifique as configurações de origem no servidor.',
    AuthenticationError: 'Token inválido ou expirado. Faça login novamente.',
    AuthorizationError: 'Usuário não tem permissão. Verifique as roles e permissões.',
    NotFoundError: 'Recurso não encontrado. Verifique o ID ou URL solicitado.',
    ServerError: 'Erro interno do servidor. Verifique os logs do servidor.',
    ServiceUnavailable: 'Serviço indisponível. Tente novamente mais tarde.',
    TimeoutError: 'Requisição excedeu o tempo limite. Tente novamente ou otimize a query.',
  };

  generateErrorId(): string {
    return `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  analyzeError(error: Error | string, context: Partial<ErrorContext> = {}): ErrorReport {
    const errorId = this.generateErrorId();
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    // Detectar tipo de erro
    let detectedType = 'UnknownError';
    let severity: 'critical' | 'high' | 'medium' | 'low' = 'medium';

    for (const { pattern, type, severity: sev } of this.errorPatterns) {
      if (pattern.test(errorMessage) || pattern.test(stack || '')) {
        detectedType = type;
        severity = sev;
        break;
      }
    }

    // Buscar erros similares
    const relatedErrors = Array.from(this.errors.values())
      .filter((e) => e.type === detectedType && !e.resolved)
      .slice(-5)
      .map((e) => e.id);

    const report: ErrorReport = {
      id: errorId,
      severity,
      type: detectedType,
      message: errorMessage,
      stack,
      context: {
        ...context,
        timestamp: new Date(),
      } as ErrorContext,
      suggestedFix: this.fixes[detectedType],
      relatedErrors,
      timestamp: new Date(),
      resolved: false,
    };

    // Armazenar erro
    this.errors.set(errorId, report);

    return report;
  }

  report(error: Error | string, context: Partial<ErrorContext> = {}): ErrorReport {
    const report = this.analyzeError(error, context);

    // Log estruturado
    console.error(
      JSON.stringify({
        event: 'ERROR_DETECTED',
        id: report.id,
        severity: report.severity,
        type: report.type,
        message: report.message,
        endpoint: context.endpoint,
        method: context.method,
        timestamp: new Date().toISOString(),
        stack: report.stack,
        suggestedFix: report.suggestedFix,
        relatedErrors: report.relatedErrors,
      }, null, 2)
    );

    // Alertas críticos
    if (report.severity === 'critical') {
      this.alertCriticalError(report);
    }

    return report;
  }

  private alertCriticalError(report: ErrorReport): void {
    const message = `
🔴 ERRO CRÍTICO DETECTADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ID: ${report.id}
Tipo: ${report.type}
Mensagem: ${report.message}
Endpoint: ${report.context.endpoint || 'N/A'}
Horário: ${report.timestamp.toLocaleString('pt-BR')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 Sugestão: ${report.suggestedFix}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `;
    console.error(message);
  }

  getReport(id: string): ErrorReport | undefined {
    return this.errors.get(id);
  }

  getAllErrors(filter?: { type?: string; severity?: string; resolved?: boolean }): ErrorReport[] {
    let errors = Array.from(this.errors.values());

    if (filter) {
      if (filter.type) errors = errors.filter((e) => e.type === filter.type);
      if (filter.severity) errors = errors.filter((e) => e.severity === filter.severity);
      if (filter.resolved !== undefined) errors = errors.filter((e) => e.resolved === filter.resolved);
    }

    return errors.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  markAsResolved(id: string): void {
    const error = this.errors.get(id);
    if (error) {
      error.resolved = true;
      console.log(`✓ Erro ${id} marcado como resolvido`);
    }
  }

  getErrorStats(): {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    unresolved: number;
  } {
    const errors = Array.from(this.errors.values());
    return {
      total: errors.length,
      critical: errors.filter((e) => e.severity === 'critical').length,
      high: errors.filter((e) => e.severity === 'high').length,
      medium: errors.filter((e) => e.severity === 'medium').length,
      low: errors.filter((e) => e.severity === 'low').length,
      unresolved: errors.filter((e) => !e.resolved).length,
    };
  }

  generateReport(): string {
    const stats = this.getErrorStats();
    const errors = this.getAllErrors();

    let report = `
╔═══════════════════════════════════════════════════════════╗
║           RELATÓRIO DE ERROS DO SISTEMA                  ║
╚═══════════════════════════════════════════════════════════╝

📊 ESTATÍSTICAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total de erros: ${stats.total}
🔴 Críticos: ${stats.critical}
🟠 Altos: ${stats.high}
🟡 Médios: ${stats.medium}
🟢 Baixos: ${stats.low}
❗ Não resolvidos: ${stats.unresolved}

🔍 ERROS RECENTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `;

    errors.slice(0, 10).forEach((error, idx) => {
      report += `
${idx + 1}. [${error.severity.toUpperCase()}] ${error.type}
   ID: ${error.id}
   Mensagem: ${error.message}
   Endpoint: ${error.context.endpoint || 'N/A'}
   Status: ${error.resolved ? '✓ Resolvido' : '❌ Aberto'}
   Sugestão: ${error.suggestedFix}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `;
    });

    return report;
  }
}

export const errorReporter = new ErrorReporter();
