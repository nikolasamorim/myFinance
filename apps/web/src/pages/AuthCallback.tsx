import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthInternal } from '../context/AuthContext';

export function AuthCallback() {
  const { hydrateFromToken } = useAuthInternal();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const processedRef = useRef(false);

  useEffect(() => {
    // The URL hash is consumed and cleared on the first invocation.
    // React 18 StrictMode re-invokes effects — guard against running twice.
    if (processedRef.current) return;
    processedRef.current = true;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const handleCallback = async () => {
      // Check for error in query params
      const errorParam = searchParams.get('error');
      if (errorParam) {
        setError('Não foi possível completar a autenticação. Tente novamente.');
        timeoutId = setTimeout(() => navigate('/login', { replace: true }), 3000);
        return;
      }

      // Extract access_token from URL fragment (#access_token=...)
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');

      if (!accessToken) {
        setError('Token de autenticação não encontrado.');
        timeoutId = setTimeout(() => navigate('/login', { replace: true }), 3000);
        return;
      }

      // Clear the hash from the URL (security: don't leave token in address bar)
      window.history.replaceState(null, '', window.location.pathname);

      try {
        await hydrateFromToken(accessToken);
        navigate('/', { replace: true });
      } catch {
        setError('Erro ao processar autenticação. Tente novamente.');
        timeoutId = setTimeout(() => navigate('/login', { replace: true }), 3000);
      }
    };

    handleCallback();

    return () => {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-page">
        <div className="text-center">
          <p className="text-red-500 text-sm font-medium">{error}</p>
          <p className="text-text-muted text-xs mt-2">Redirecionando para login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-page">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full mx-auto" />
        <p className="text-text-muted text-sm mt-4">Finalizando autenticação...</p>
      </div>
    </div>
  );
}
