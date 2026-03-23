// Credenciais e configuração Pluggy — importar DAQUI em todo o código.
// NUNCA duplicar essas strings em outros arquivos.

export const PLUGGY_CLIENT_ID = '335f8e72-ccff-4c70-93e1-563d762bab10';
export const PLUGGY_CLIENT_SECRET = 'a2866860-f581-426e-9e92-84fcd50c968e';
export const PLUGGY_WEBHOOK_URL = 'https://azami-app.netlify.app/.netlify/functions/banking-webhook';
export const PLUGGY_API_BASE = 'https://api.pluggy.ai';

// IDs de conectores permitidos — em trial, use "0" (Pluggy Bank sandbox).
// Em produção, remova a variável para liberar todos os conectores.
export const PLUGGY_CONNECTOR_IDS: number[] | undefined = process.env.PLUGGY_CONNECTOR_IDS
    ? process.env.PLUGGY_CONNECTOR_IDS.split(',').map((id) => Number(id.trim()))
    : undefined;
