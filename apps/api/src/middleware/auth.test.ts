import { describe, it, expect } from 'vitest';
import { SignJWT } from 'jose';

const SECRET = 'unit-test-secret-unit-test-secret-32bytes';

function mockRes() {
    let statusCode = 0;
    let body: unknown = null;
    const res = {
        status(code: number) { statusCode = code; return res; },
        json(payload: unknown) { body = payload; return res; },
        get statusCode() { return statusCode; },
        get body() { return body; },
    };
    return res as any;
}

describe('requireAuth — local JWT verification', () => {
    it('verifies a valid HS256 token locally and populates req.user (no remote call)', async () => {
        process.env.SUPABASE_JWT_SECRET = SECRET;
        process.env.SUPABASE_URL = 'http://localhost:54321';
        process.env.SUPABASE_ANON_KEY = 'anon-key';
        const { requireAuth } = await import('./auth');

        const token = await new SignJWT({ sub: 'user-123', email: 'user@example.com', role: 'authenticated' })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('1h')
            .sign(new TextEncoder().encode(SECRET));

        const req: any = { headers: { authorization: `Bearer ${token}` } };
        const res = mockRes();
        let nextCalled = false;

        await requireAuth(req, res, () => { nextCalled = true; });

        expect(nextCalled).toBe(true);
        expect(res.statusCode).toBe(0);
        expect(req.user.id).toBe('user-123');
        expect(req.user.email).toBe('user@example.com');
        expect(req.jwt).toBe(token);
        expect(req.supabase).toBeDefined();
    });

    it('returns 401 when the Authorization header is missing', async () => {
        const { requireAuth } = await import('./auth');
        const req: any = { headers: {} };
        const res = mockRes();
        let nextCalled = false;

        await requireAuth(req, res, () => { nextCalled = true; });

        expect(nextCalled).toBe(false);
        expect(res.statusCode).toBe(401);
    });
});
