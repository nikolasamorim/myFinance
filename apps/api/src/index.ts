import app from './app';

const PORT = process.env.PORT ?? 3001;

app.listen(PORT, () => {
    console.log(`✅ myFinance API rodando na porta ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/v1/health`);
    console.log(`   Modo: ${process.env.NODE_ENV ?? 'development'}`);
});
