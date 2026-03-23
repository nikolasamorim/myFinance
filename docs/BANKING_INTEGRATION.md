# Integração Bancária — Pluggy Open Finance

## Fluxo Completo

```
┌──────────┐     ┌──────────────┐     ┌───────────┐     ┌──────────────┐
│ Frontend │────▶│ connect-token│────▶│ Pluggy API│     │  Supabase DB │
│ (Widget) │     │   Function   │     │           │     │              │
└────┬─────┘     └──────────────┘     └─────┬─────┘     └──────┬───────┘
     │                                      │                   │
     │  1. Solicita connectToken            │                   │
     │  2. Abre Pluggy Connect Widget       │                   │
     │  3. Usuário conecta banco            │                   │
     │                                      │                   │
     │                              ┌───────▼────────┐          │
     │                              │   Webhook      │          │
     │                              │ banking-webhook│──────────▶
     │                              │                │  INSERT   │
     │                              │ item/created   │  pluggy_  │
     │                              │ item/updated   │  connections
     │                              │ item/error     │          │
     │                              │ transactions/  │  UPSERT  │
     │                              │   created      │  transactions
     │                              └────────────────┘          │
     │                                                          │
     │  4. GET /banking/connections  ◀──────────────────────────│
     │  5. GET /banking/transactions ◀──────────────────────────│
     │  6. GET /banking/consent-status ◀────────────────────────│
     │  7. DELETE /banking/disconnect ──────────────────────────▶│
```

---

## Endpoints

### POST /banking/connect-token

Gera token para o widget Pluggy Connect.

**Auth:** Bearer JWT obrigatório

**Request:**
```json
{
  "workspace_id": "uuid",
  "itemId": "optional-pluggy-item-id-para-reconexao"
}
```

**Response 200:**
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIs..."
}
```

---

### POST /banking/webhook

Recebe eventos da Pluggy. **Público (sem auth).**

**Eventos tratados:**

| Evento | Ação |
|--------|------|
| `item/created` | Cria `pluggy_connections`, busca accounts |
| `item/updated` | Sync inicial (90 dias) ou incremental, importa transações |
| `item/error` | Atualiza status para `login_error` ou `error` |
| `transactions/created` | Importação incremental (últimos 7 dias) |

**Payload exemplo — item/updated:**
```json
{
  "event": "item/updated",
  "data": {
    "item": {
      "id": "a1b2c3d4-e5f6-...",
      "status": "UPDATED"
    }
  }
}
```

**Response:** Sempre `200 { "received": true }`

---

### GET /banking/connections

Lista conexões bancárias do workspace.

**Auth:** Bearer JWT obrigatório

**Query:** `?workspace_id=uuid`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "institution_name": "Nubank",
      "status": "active",
      "balance": 1234.56,
      "last_sync_at": "2026-03-22T10:00:00Z",
      "consent_expires_at": "2026-06-22T10:00:00Z",
      "account_id": "uuid-or-null",
      "pluggy_item_id": "pluggy-item-uuid",
      "pluggy_account_id": "pluggy-account-uuid",
      "initial_sync_done": true,
      "error_message": null,
      "created_at": "2026-03-22T09:00:00Z"
    }
  ]
}
```

---

### GET /banking/transactions

Lista transações importadas via Open Finance.

**Auth:** Bearer JWT obrigatório

**Query:** `?workspace_id=uuid&account_id=uuid&from=2026-01-01&to=2026-03-22&page=1&pageSize=20`

**Response 200:**
```json
{
  "data": [ /* Transaction[] */ ],
  "total": 150,
  "page": 1,
  "pageSize": 20
}
```

---

### DELETE /banking/disconnect

Desconecta uma conta bancária. **Não deleta transações importadas.**

**Auth:** Bearer JWT obrigatório

**Query:** `?workspace_id=uuid&connection_id=uuid`

**Response 204:** (sem body)

---

### GET /banking/consent-status

Lista conexões com consentimento próximo de expirar (< 30 dias).

**Auth:** Bearer JWT obrigatório

**Query:** `?workspace_id=uuid`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "institution_name": "Banco do Brasil",
      "status": "active",
      "consent_expires_at": "2026-04-10T00:00:00Z",
      "last_sync_at": "2026-03-22T10:00:00Z",
      "pluggy_item_id": "...",
      "account_id": "uuid-or-null"
    }
  ]
}
```

---

## Mapeamento Pluggy → transactions

| Campo Pluggy | Campo transactions | Transformação |
|---|---|---|
| `id` | `external_id` | Direto |
| `description` | `transaction_description` | Direto |
| `amount` (positivo) | `transaction_type` = `'income'` | `amount > 0` |
| `amount` (negativo) | `transaction_type` = `'expense'` | `amount < 0` |
| `amount` | `transaction_amount` | `Math.abs(amount)` |
| `date` | `transaction_date` | `date.split('T')[0]` |
| (payload completo) | `raw_data` | JSONB |
| — | `import_source` | `'open_finance'` (fixo) |
| — | `transaction_origin` | `'api'` (fixo) |
| — | `transaction_status` | `'pending'` (fixo) |
| — | `transaction_bank_id` | `connection.account_id` |
| — | `transaction_created_by_user_id` | `connection.created_by` |

---

## Testes em Sandbox

1. **Credenciais de sandbox:** usar `connectorId = 0` no widget Pluggy Connect
2. **Configurar widget:**
   ```javascript
   const pluggyConnect = new PluggyConnect({
     connectToken: accessToken,
     includeSandbox: true, // Habilita conectores sandbox
     onSuccess: (data) => console.log('Conectado:', data),
     onError: (error) => console.error('Erro:', error),
   });
   pluggyConnect.init();
   ```
3. **Credenciais sandbox padrão:** user `user-ok`, password `password-ok`
4. **URL do webhook (produção):**
   ```
   https://azami-app.netlify.app/.netlify/functions/banking-webhook
   ```

---

## Checklist de Go-Live

- [ ] Variáveis de ambiente configuradas no Netlify Dashboard:
  - `PLUGGY_CLIENT_ID`
  - `PLUGGY_CLIENT_SECRET`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Migration aplicada no Supabase de produção
- [ ] Webhook URL cadastrada na Pluggy: `https://azami-app.netlify.app/.netlify/functions/banking-webhook`
- [ ] Testar fluxo completo em sandbox (connectorId=0)
- [ ] Testar reconexão (passar `itemId` no connect-token)
- [ ] Testar disconnect (verificar que transações são mantidas)
- [ ] Validar idempotência (reenviar webhook e confirmar zero duplicatas)
- [ ] Monitorar logs do Netlify Functions nos primeiros dias

---

## Renovação de Consentimento

O Open Finance brasileiro exige renovação periódica do consentimento do usuário.

**Regra:** alertar o frontend quando `consent_expires_at` estiver a menos de **30 dias** de expirar.

O endpoint `GET /banking/consent-status` retorna apenas conexões nesse estado. O frontend deve:
1. Exibir banner/alerta na tela de contas bancárias
2. Permitir reconexão via `POST /banking/connect-token` com `itemId` existente
3. O widget Pluggy solicita nova autorização ao usuário

---

## Estrutura de Arquivos

```
netlify/functions/
  _lib/
    pluggy.constants.ts    — Credenciais e URLs
    pluggy.service.ts      — Client Pluggy API (auth, accounts, transactions)
    supabase.ts            — Client Supabase (admin + user-scoped)
    auth.ts                — Autenticação JWT para functions standalone
    cors.ts                — CORS preflight e headers
    response.ts            — Helpers de resposta JSON
  banking-connect-token.ts — POST: gera token para widget
  banking-webhook.ts       — POST: recebe eventos da Pluggy
  banking-connections.ts   — GET: lista conexões bancárias
  banking-transactions.ts  — GET: lista transações Open Finance
  banking-disconnect.ts    — DELETE: desconecta conta
  banking-consent-status.ts— GET: verifica expiração de consentimento

supabase/migrations/
  20260322130000_pluggy_integration.sql — Tabelas pluggy_connections + pluggy_api_key_cache
```
