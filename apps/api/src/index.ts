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
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT ?? 3001;

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

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rota não encontrada.' } });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use(errorHandler as any);

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`✅ myFinance API rodando na porta ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/v1/health`);
    console.log(`   Modo: ${process.env.NODE_ENV ?? 'development'}`);
    console.log(`   CORS origins: ${allowedOrigins.join(', ')}`);
});

export default app;
