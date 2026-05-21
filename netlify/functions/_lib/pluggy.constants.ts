// Configuração Pluggy — credenciais vêm de variáveis de ambiente (NUNCA hardcoded).
// Defina PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET no .env / nas env vars da Netlify.
// Importar DAQUI em todo o código; não duplicar.

export const PLUGGY_CLIENT_ID = process.env.PLUGGY_CLIENT_ID ?? '';
export const PLUGGY_CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET ?? '';
export const PLUGGY_WEBHOOK_URL =
    process.env.PLUGGY_WEBHOOK_URL ?? 'https://app.azamifinanceiro.com/.netlify/functions/banking-webhook';
export const PLUGGY_API_BASE = process.env.PLUGGY_API_BASE ?? 'https://api.pluggy.ai';

// IDs de conectores permitidos — em trial, use "0" (Pluggy Bank sandbox).
// Em produção, remova a variável para liberar todos os conectores.
export const PLUGGY_CONNECTOR_IDS: number[] | undefined = process.env.PLUGGY_CONNECTOR_IDS
    ? process.env.PLUGGY_CONNECTOR_IDS.split(',').map((id) => Number(id.trim()))
    : undefined;
