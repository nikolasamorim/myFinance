import type { HandlerEvent, HandlerResponse } from '@netlify/functions';

function getAllowedOrigins(): string[] {
    const env = process.env.CORS_ORIGINS || 'http://localhost:5173';
    return env.split(',').map((o) => o.trim()).filter(Boolean);
}

export function corsHeaders(origin?: string): Record<string, string> {
    const allowed = getAllowedOrigins();
    const resolvedOrigin =
        origin && allowed.includes(origin) ? origin : allowed[0] || '*';

    return {
        'Access-Control-Allow-Origin': resolvedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
    };
}

/**
 * Retorna uma resposta 204 para preflight OPTIONS, ou null se não for preflight.
 */
export function handlePreflight(event: HandlerEvent): HandlerResponse | null {
    if (event.httpMethod !== 'OPTIONS') return null;

    return {
        statusCode: 204,
        headers: corsHeaders(event.headers.origin),
        body: '',
    };
}
