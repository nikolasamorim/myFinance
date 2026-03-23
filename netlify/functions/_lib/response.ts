import type { HandlerResponse } from '@netlify/functions';
import { corsHeaders } from './cors';

export function jsonResponse(
    statusCode: number,
    body: unknown,
    origin?: string,
): HandlerResponse {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(origin),
        },
        body: JSON.stringify(body),
    };
}

export function errorResponse(
    statusCode: number,
    code: string,
    message: string,
    origin?: string,
): HandlerResponse {
    return jsonResponse(statusCode, { error: { code, message } }, origin);
}
