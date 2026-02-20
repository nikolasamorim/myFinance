import { Router } from 'express';

const router = Router();

/**
 * GET /api/v1/health
 * Public endpoint — no auth required.
 * Used by Railway keep-alive, load balancers, and uptime monitors.
 */
router.get('/', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'myfinance-api',
        version: process.env.npm_package_version ?? '0.0.0',
    });
});

export default router;
