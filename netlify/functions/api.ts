import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import serverless from 'serverless-http';
import app from '../../apps/api/src/app';

// Diagnóstico: loga no cold start para confirmar que a function e as env vars carregaram
console.log('[api] function loaded — env check:', {
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    nodeEnv: process.env.NODE_ENV,
});

const serverlessHandler = serverless(app);

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    console.log('[api] called:', event.httpMethod, event.path);
    console.log('[api] env check:', {
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    });

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        console.error('[api] FATAL: SUPABASE_URL ou SUPABASE_ANON_KEY não configuradas');
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: {
                    code: 'SERVER_CONFIG_ERROR',
                    message: 'Variáveis de ambiente não configuradas no servidor.',
                },
            }),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    // Netlify strips the function prefix from event.path.
    // Redirect: /api/* → /.netlify/functions/api/:splat
    // event.path arrives as /v1/... but Express routes expect /api/v1/...
    const fixedEvent = { ...event, path: `/api${event.path}` };

    return serverlessHandler(fixedEvent, context) as any;
};
