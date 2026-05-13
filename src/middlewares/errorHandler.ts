/**
 * Middleware de Error Handling Global
 * Captura e reporta todos os erros da API
 */

import { NextFunction, Request, Response } from 'express';
import { errorReporter } from '../utils/errorReporter';

export interface ApiErrorResponse {
  success: false;
  errorId: string;
  type: string;
  message: string;
  severity: string;
  suggestedFix?: string;
  timestamp: string;
  path: string;
  method: string;
  relatedErrors?: string[];
  stack?: string; // Incluído em desenvolvimento via spread manual
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Middleware que envolve a resposta para adicionar tratamento de erro
 */
export function errorHandlingMiddleware() {
  return (err: any, req: Request, res: Response, next: NextFunction) => {
    // Reportar erro
    const report = errorReporter.report(err, {
      endpoint: req.originalUrl,
      method: req.method,
      userId: (req as any).userId,
      userAgent: req.headers['user-agent'],
      headers: req.headers as Record<string, string>,
      body: req.body,
      queryParams: req.query as Record<string, string>,
    });

    // Determinar status HTTP baseado na severidade
    let statusCode = 500;
    if (report.type === 'NotFoundError') statusCode = 404;
    else if (report.type === 'AuthenticationError') statusCode = 401;
    else if (report.type === 'AuthorizationError') statusCode = 403;
    else if (report.type === 'ValidationError') statusCode = 400;
    else if (report.severity === 'critical') statusCode = 500;
    else if (report.severity === 'high') statusCode = 400;

    // Responder com erro estruturado
    const response: ApiErrorResponse = {
      success: false,
      errorId: report.id,
      type: report.type,
      message: report.message,
      severity: report.severity,
      suggestedFix: report.suggestedFix,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method,
      relatedErrors: report.relatedErrors,
    };

    // Incluir stack trace em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      response.stack = report.stack;
    }

    res.status(statusCode).json(response);
  };
}

/**
 * Wrapper para aplicar error handling em rotas assíncronas
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      // Reportar erro
      const report = errorReporter.report(error, {
        endpoint: req.originalUrl,
        method: req.method,
        userId: (req as any).userId,
      });

      // Enviar resposta de erro
      const statusCode =
        report.type === 'NotFoundError' ? 404
          : report.type === 'AuthenticationError' ? 401
          : report.type === 'AuthorizationError' ? 403
          : 500;

      const response: ApiErrorResponse = {
        success: false,
        errorId: report.id,
        type: report.type,
        message: report.message,
        severity: report.severity,
        suggestedFix: report.suggestedFix,
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        method: req.method,
      };

      res.status(statusCode).json(response);
    });
  };
}

/**
 * Validador de schemas com error reporting
 */
export function validateSchema(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      const report = errorReporter.report(error, {
        endpoint: req.originalUrl,
        method: 'VALIDATION',
        body: req.body,
      });

      res.status(400).json({
        success: false,
        errorId: report.id,
        type: 'ValidationError',
        message: 'Dados inválidos recebidos',
        severity: 'medium',
        errors: (error as any).errors,
        timestamp: new Date().toISOString(),
      });
    }
  };
}
