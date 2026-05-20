import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import healthRouter from './routes/health';
import authRouter from './routes/auth';
import workspacesRouter from './routes/workspaces';
import transactionsRouter from './routes/transactions';
import accountsRouter from './routes/accounts';
import categoriesRouter from './routes/categories';
import costCentersRouter from './routes/costCenters';
import creditCardsRouter from './routes/creditCards';
import recurrenceRouter from './routes/recurrence';
import dashboardRouter from './routes/dashboard';
import statementsRouter from './routes/statements';
import notificationsRouter from './routes/notifications';
import notificationPreferencesRouter from './routes/notificationPreferences';
import reconciliationsRouter from './routes/reconciliations';
import installmentGroupsRouter from './routes/installmentGroups';
import visualizationsRouter from './routes/visualizations';
import activityLogsRouter from './routes/activityLogs';
import workspaceMigrationsRouter from './routes/workspaceMigrations';
import bankingRouter from './routes/banking';
import usersRouter from './routes/users';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim());

// Include the API's own origin (needed for the OAuth callback bridge page)
const apiSelfOrigin = process.env.API_ORIGIN ?? `http://localhost:${process.env.PORT ?? 3001}`;
if (!allowedOrigins.includes(apiSelfOrigin)) {
    allowedOrigins.push(apiSelfOrigin);
}

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (mobile apps, curl, Postman)
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin)) return callback(null, true);
            callback(new Error(`CORS: origin '${origin}' not allowed`));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'apikey'],
    })
);

// ─── Security & Parsing ────────────────────────────────────────────────────────
app.use(helmet());
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Rate limiting ─────────────────────────────────────────────────────────────
// Baseline contra brute-force/abuso nas rotas de autenticação.
// NOTA: em serverless o store é em memória (por container, reseta no cold start e
// não é compartilhado entre instâncias). Para proteção robusta em escala, usar um
// store compartilhado (ex.: Redis/Upstash) ou o rate limiting na borda da Netlify.
const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    validate: false, // serverless: keyGenerator próprio em vez do trust-proxy padrão
    keyGenerator: (req) => {
        const fwd = req.headers['x-nf-client-connection-ip'] ?? req.headers['x-forwarded-for'];
        const raw = Array.isArray(fwd) ? fwd[0] : fwd;
        return raw?.split(',')[0].trim() || req.ip || 'unknown';
    },
    handler: (_req, res) => {
        res.status(429).json({
            error: { code: 'RATE_LIMITED', message: 'Muitas requisições. Tente novamente em instantes.' },
        });
    },
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/v1/health', healthRouter);
app.use('/api/v1/auth', authLimiter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/workspaces', workspacesRouter);

// Nested under workspaces/:wid
app.use('/api/v1/workspaces/:wid/transactions', transactionsRouter);
app.use('/api/v1/workspaces/:wid/accounts', accountsRouter);
app.use('/api/v1/workspaces/:wid/categories', categoriesRouter);
app.use('/api/v1/workspaces/:wid/cost-centers', costCentersRouter);
app.use('/api/v1/workspaces/:wid/credit-cards', creditCardsRouter);
app.use('/api/v1/workspaces/:wid/recurrence-rules', recurrenceRouter);
app.use('/api/v1/workspaces/:wid/dashboard', dashboardRouter);
app.use('/api/v1/workspaces/:wid/credit-cards/:cardId/statements', statementsRouter);
app.use('/api/v1/workspaces/:wid/notifications', notificationsRouter);
app.use('/api/v1/workspaces/:wid/notification-preferences', notificationPreferencesRouter);
app.use('/api/v1/workspaces/:wid/reconciliations', reconciliationsRouter);
app.use('/api/v1/workspaces/:wid/installment-groups', installmentGroupsRouter);
app.use('/api/v1/workspaces/:wid/visualizations', visualizationsRouter);
app.use('/api/v1/workspaces/:wid/activity-logs', activityLogsRouter);
app.use('/api/v1/workspaces/:wid/migrations', workspaceMigrationsRouter);

// Banking (Pluggy Open Finance) — standalone, fora do padrão /workspaces/:wid
app.use('/api/v1/banking', bankingRouter);

app.use('/api/v1/users', usersRouter);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rota não encontrada.' } });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use(errorHandler as any);

export default app;
