import { Request, Response, NextFunction } from 'express';

interface ApiError extends Error {
    status?: number;
    code?: string;
}

/**
 * Global Express error handler.
 * Returns standardized JSON matching the AppError interface from 02-CONVENTIONS.md:
 * { "error": { "code": string, "message": string, "details"?: any } }
 */
export function errorHandler(
    err: ApiError,
    req: Request,
    res: Response,
    _next: NextFunction
): void {
    const status = err.status ?? 500;

    // Map Supabase/PostgreSQL error codes to user-friendly messages
    let code = err.code ?? 'SERVER_ERROR';
    let message = err.message ?? 'Erro interno. Tente novamente.';

    if (message.includes('23505')) {
        code = 'CONFLICT';
        message = 'Este registro já existe.';
    } else if (message.includes('23503')) {
        code = 'VALIDATION_ERROR';
        message = 'Dependência inválida — verifique os campos relacionados.';
    } else if (message.includes('42501') || message.includes('PGRST301')) {
        code = 'FORBIDDEN';
        message = 'Você não tem permissão para esta operação.';
    } else if (message.includes('PGRST116')) {
        code = 'NOT_FOUND';
        message = 'Registro não encontrado.';
    } else if (message.includes('User not authenticated')) {
        code = 'UNAUTHORIZED';
        message = 'Não autenticado.';
    }

    // Logging estruturado (ponto de integração para Sentry/error tracking)
    const entry = {
        ts: new Date().toISOString(),
        status,
        code,
        method: req.method,
        path: req.originalUrl,
        message: err.message,
    };
    if (status >= 500) {
        console.error('[error]', JSON.stringify(entry), err.stack ?? '');
        // TODO(observabilidade): Sentry.captureException(err) quando integrado
    } else {
        console.warn('[warn]', JSON.stringify(entry));
    }

    res.status(status).json({
        error: { code, message },
    });
}

/**
 * Helper: throw a structured API error from route handlers.
 * Usage: throw createApiError(404, 'NOT_FOUND', 'Workspace não encontrado.')
 */
export function createApiError(status: number, code: string, message: string): ApiError {
    const err = new Error(message) as ApiError;
    err.status = status;
    err.code = code;
    return err;
}
