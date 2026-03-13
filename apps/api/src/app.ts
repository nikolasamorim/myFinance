import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

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
import { errorHandler } from './middleware/errorHandler';

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim());

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
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/v1/health', healthRouter);
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

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rota não encontrada.' } });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use(errorHandler as any);

export default app;
