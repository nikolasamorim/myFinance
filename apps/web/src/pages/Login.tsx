import React, { useState, useEffect, forwardRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const signInSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

const signUpSchema = z
  .object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Senhas não coincidem',
    path: ['confirmPassword'],
  });

type SignInFormData = z.infer<typeof signInSchema>;
type SignUpFormData = z.infer<typeof signUpSchema>;
type AuthTab = 'signin' | 'signup';

// ─── AuthInput ────────────────────────────────────────────────────────────────

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: React.ReactNode;
  error?: string;
  isValid?: boolean;
}

const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, icon, error, isValid, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = props.type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : props.type;

    return (
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-gray-400 tracking-wider uppercase">
          {label}
        </label>
        <div
          className={`flex items-center gap-3 border rounded-xl px-4 py-3 bg-white transition-all duration-150 ${
            error
              ? 'border-red-300 ring-1 ring-red-200'
              : 'border-gray-200 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-100'
          }`}
        >
          <span className="text-gray-400 shrink-0 flex items-center justify-center">{icon}</span>
          <input
            ref={ref}
            {...props}
            type={inputType}
            className="flex-1 text-sm text-gray-900 placeholder:text-gray-300 outline-none bg-transparent min-w-0"
          />
          {isPassword ? (
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="text-gray-300 hover:text-gray-500 transition-colors shrink-0"
              tabIndex={-1}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          ) : isValid ? (
            <span className="text-emerald-500 shrink-0">
              <CheckCircleIcon />
            </span>
          ) : null}
        </div>
        {error && <p className="text-xs text-red-500 pl-0.5">{error}</p>}
      </div>
    );
  }
);
AuthInput.displayName = 'AuthInput';

// ─── Icons ────────────────────────────────────────────────────────────────────

const EmailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M1.5 5.5L8 9.5L14.5 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="3" y="7" width="10" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <circle cx="8" cy="10.5" r="1.1" fill="currentColor" />
  </svg>
);

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M2.5 13.5c0-2.485 2.462-4.5 5.5-4.5s5.5 2.015 5.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8z" stroke="currentColor" strokeWidth="1.3" />
    <circle cx="8" cy="8" r="1.75" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 2l12 12M6.5 6.55A1.75 1.75 0 009.45 9.5M4.2 4.3C2.8 5.3 1.5 7 1.5 8c0 0 2 4.5 6.5 4.5a7 7 0 003.3-.85M7 3.55c.33-.04.66-.05 1-.05 4.5 0 6.5 4.5 6.5 4.5a10.4 10.4 0 01-1.7 2.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6.5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.1" />
    <path d="M5 8.5l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M18.17 10.2c0-.63-.06-1.25-.16-1.84H10v3.48h4.58a3.91 3.91 0 01-1.7 2.57v2.13h2.75c1.6-1.48 2.54-3.65 2.54-6.34z" fill="#4285F4" />
    <path d="M10 18.5c2.3 0 4.23-.76 5.64-2.06l-2.75-2.13c-.76.51-1.74.81-2.89.81-2.22 0-4.1-1.5-4.77-3.51H2.39v2.2A8.5 8.5 0 0010 18.5z" fill="#34A853" />
    <path d="M5.23 11.61A5.1 5.1 0 014.96 10c0-.56.1-1.1.27-1.61V6.19H2.39A8.5 8.5 0 001.5 10c0 1.37.33 2.67.89 3.81l2.84-2.2z" fill="#FBBC05" />
    <path d="M10 4.88c1.25 0 2.37.43 3.25 1.27l2.44-2.44A8.46 8.46 0 0010 1.5 8.5 8.5 0 002.39 6.19l2.84 2.2C5.9 6.38 7.78 4.88 10 4.88z" fill="#EA4335" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

// ─── Vault Illustration ───────────────────────────────────────────────────────

const VaultIllustration = () => (
  <svg width="210" height="210" viewBox="0 0 210 210" fill="none">
    {/* Shadow */}
    <ellipse cx="105" cy="198" rx="55" ry="8" fill="black" fillOpacity="0.08" />

    {/* Body */}
    <rect x="20" y="18" width="170" height="170" rx="26" fill="url(#vBody)" />
    <rect x="20" y="18" width="170" height="170" rx="26" stroke="white" strokeOpacity="0.18" strokeWidth="1.5" />

    {/* Door inset */}
    <rect x="36" y="34" width="138" height="138" rx="20" fill="black" fillOpacity="0.07" />

    {/* Dial outer ring */}
    <circle cx="105" cy="103" r="45" fill="url(#vRing)" />
    <circle cx="105" cy="103" r="45" stroke="white" strokeOpacity="0.2" strokeWidth="1" />

    {/* Tick marks */}
    {Array.from({ length: 8 }).map((_, i) => {
      const angle = (i * 45 * Math.PI) / 180;
      const x = 105 + 39 * Math.cos(angle);
      const y = 103 + 39 * Math.sin(angle);
      return <circle key={i} cx={x} cy={y} r="2.5" fill="white" fillOpacity="0.45" />;
    })}

    {/* Inner dial */}
    <circle cx="105" cy="103" r="30" fill="url(#vInner)" />

    {/* Handle arms */}
    <line x1="105" y1="103" x2="105" y2="77" stroke="white" strokeWidth="5.5" strokeLinecap="round" />
    <line x1="105" y1="103" x2="127" y2="116" stroke="white" strokeWidth="5.5" strokeLinecap="round" />
    <line x1="105" y1="103" x2="83" y2="116" stroke="white" strokeWidth="5.5" strokeLinecap="round" />

    {/* Hub */}
    <circle cx="105" cy="103" r="9" fill="white" fillOpacity="0.9" />
    <circle cx="105" cy="103" r="5" fill="url(#vRing)" />

    {/* Hinge bolts */}
    {[68, 103, 138].map((y) => (
      <circle key={y} cx="38" cy={y} r="6.5" fill="white" fillOpacity="0.18" stroke="white" strokeOpacity="0.35" strokeWidth="1" />
    ))}

    {/* Highlight */}
    <ellipse cx="82" cy="52" rx="20" ry="9" fill="white" fillOpacity="0.13" transform="rotate(-20 82 52)" />

    <defs>
      <linearGradient id="vBody" x1="20" y1="18" x2="190" y2="188" gradientUnits="userSpaceOnUse">
        <stop stopColor="#60A5FA" />
        <stop offset="1" stopColor="#1D4ED8" />
      </linearGradient>
      <linearGradient id="vRing" x1="60" y1="58" x2="150" y2="148" gradientUnits="userSpaceOnUse">
        <stop stopColor="#93C5FD" />
        <stop offset="1" stopColor="#1E40AF" />
      </linearGradient>
      <linearGradient id="vInner" x1="75" y1="73" x2="135" y2="133" gradientUnits="userSpaceOnUse">
        <stop stopColor="#BFDBFE" />
        <stop offset="1" stopColor="#3B82F6" />
      </linearGradient>
    </defs>
  </svg>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Login() {
  const { login, register: registerUser, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [tab, setTab] = useState<AuthTab>(
    searchParams.get('tab') === 'signup' ? 'signup' : 'signin'
  );
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  // Sync tab from URL params
  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'signup') setTab('signup');
    else if (t === 'signin') setTab('signin');
  }, [searchParams]);

  const signInForm = useForm<SignInFormData>({ resolver: zodResolver(signInSchema) });
  const signUpForm = useForm<SignUpFormData>({ resolver: zodResolver(signUpSchema) });

  const handleTabChange = (newTab: AuthTab) => {
    setTab(newTab);
    setError('');
    setSuccess('');
  };

  const handleSignIn = async (data: SignInFormData) => {
    try {
      setError('');
      await login(data.email.trim(), data.password);
      navigate('/', { replace: true });
    } catch (err: any) {
      if (err.message?.includes('Invalid login credentials') || err.code === 'invalid_credentials') {
        setError('Email ou senha incorretos. Verifique suas credenciais.');
      } else {
        setError(err.message || 'Erro ao fazer login. Tente novamente.');
      }
    }
  };

  const handleSignUp = async (data: SignUpFormData) => {
    try {
      setError('');
      setSuccess('');
      await registerUser(data.email.trim(), data.password, data.name.trim());
      setSuccess('Conta criada com sucesso! Faça login para continuar.');
      setTimeout(() => {
        setTab('signin');
        setSuccess('');
        signUpForm.reset();
      }, 2000);
    } catch (err: any) {
      if (err.message?.includes('User already registered') || err.code === 'user_already_exists') {
        setError('Este email já está cadastrado. Tente fazer login.');
      } else {
        setError(err.message || 'Erro ao criar conta. Tente novamente.');
      }
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setGoogleLoading(true);
      await loginWithGoogle();
    } catch {
      setError('Não foi possível entrar com Google. Tente novamente.');
      setGoogleLoading(false);
    }
  };

  // Derived validation state for email fields
  const signInEmailValue = signInForm.watch('email');
  const signInEmailValid = !!signInEmailValue && !signInForm.formState.errors.email;
  const signUpEmailValue = signUpForm.watch('email');
  const signUpEmailValid = !!signUpEmailValue && !signUpForm.formState.errors.email;

  return (
    <div className="min-h-screen flex bg-white">

      {/* ────────────── Left Panel: Form ────────────── */}
      <div className="flex-1 lg:w-1/2 flex flex-col min-h-screen">

        {/* Logo bar 
        <div className="flex items-center gap-2.5 px-6 pt-6 sm:px-10 sm:pt-8">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2.5L13.5 5.5v7L9 15.5 4.5 12.5v-7L9 2.5z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M9 6l2.5 1.5v3L9 12 6.5 10.5v-3L9 6z" fill="white" fillOpacity="0.55" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900 text-sm tracking-tight">myFinance</span>
        </div>
        */}

        {/* Centered form */}
        <div className="flex-1 flex items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-[380px]">

            {/* Heading */}
            <div className="mb-7">
              <h1 className="text-[1.6rem] font-bold text-gray-900 leading-tight tracking-tight">
                {tab === 'signin' ? 'Bem-vindo de volta' : 'Criar sua conta'}
              </h1>
              <p className="mt-1.5 text-sm text-gray-400">
                {tab === 'signin'
                  ? 'Entre para acessar seu painel financeiro'
                  : 'Comece a controlar suas finanças hoje'}
              </p>
            </div>

            {/* Tab toggle */}
            <div className="flex bg-gray-100 rounded-xl p-1 mb-7">
              {(['signin', 'signup'] as AuthTab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTabChange(t)}
                  className={`flex-1 text-sm font-medium py-2 px-4 rounded-lg transition-all duration-200 ${
                    tab === t
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {t === 'signin' ? 'Entrar' : 'Cadastrar'}
                </button>
              ))}
            </div>

            {/* Alerts */}
            {error && (
              <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl">
                <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-xs text-red-600 font-medium leading-relaxed">{error}</p>
              </div>
            )}
            {success && (
              <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                <svg className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="text-xs text-emerald-600 font-medium leading-relaxed">{success}</p>
              </div>
            )}

            {/* ── Sign In Form ── */}
            {tab === 'signin' && (
              <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4" noValidate>
                <AuthInput
                  label="Endereço de email"
                  type="email"
                  placeholder="seu@email.com"
                  autoComplete="email"
                  icon={<EmailIcon />}
                  isValid={signInEmailValid}
                  error={signInForm.formState.errors.email?.message}
                  {...signInForm.register('email')}
                />
                <AuthInput
                  label="Senha"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  icon={<LockIcon />}
                  error={signInForm.formState.errors.password?.message}
                  {...signInForm.register('password')}
                />
                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={signInForm.formState.isSubmitting}
                    className="w-full bg-gray-900 hover:bg-gray-700 active:bg-gray-800 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-150 text-sm shadow-sm shadow-gray-100 disabled:cursor-not-allowed"
                  >
                    {signInForm.formState.isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <SpinnerIcon /> Aguarde...
                      </span>
                    ) : 'Continuar'}
                  </button>
                </div>
              </form>
            )}

            {/* ── Sign Up Form ── */}
            {tab === 'signup' && (
              <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4" noValidate>
                <AuthInput
                  label="Nome completo"
                  type="text"
                  placeholder="Seu nome"
                  autoComplete="name"
                  icon={<UserIcon />}
                  error={signUpForm.formState.errors.name?.message}
                  {...signUpForm.register('name')}
                />
                <AuthInput
                  label="Endereço de email"
                  type="email"
                  placeholder="seu@email.com"
                  autoComplete="email"
                  icon={<EmailIcon />}
                  isValid={signUpEmailValid}
                  error={signUpForm.formState.errors.email?.message}
                  {...signUpForm.register('email')}
                />
                <AuthInput
                  label="Senha"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  icon={<LockIcon />}
                  error={signUpForm.formState.errors.password?.message}
                  {...signUpForm.register('password')}
                />
                <AuthInput
                  label="Confirmar senha"
                  type="password"
                  placeholder="Repita sua senha"
                  autoComplete="new-password"
                  icon={<LockIcon />}
                  error={signUpForm.formState.errors.confirmPassword?.message}
                  {...signUpForm.register('confirmPassword')}
                />
                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={signUpForm.formState.isSubmitting}
                    className="w-full bg-gray-900 hover:bg-gray-700 active:bg-gray-800 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-150 text-sm shadow-sm shadow-gray-100 disabled:cursor-not-allowed"
                  >
                    {signUpForm.formState.isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <SpinnerIcon /> Criando conta...
                      </span>
                    ) : 'Criar conta'}
                  </button>
                </div>
              </form>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Ou entre com</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Google button */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="w-14 h-14 rounded-full border border-gray-200 hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100 flex items-center justify-center transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Entrar com Google"
              >
                {googleLoading ? <SpinnerIcon /> : <GoogleIcon />}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-300 px-6 pb-6 sm:px-10 sm:pb-8">
          Seus dados são protegidos com criptografia de ponta a ponta.
        </p>
      </div>

      {/* ────────────── Right Panel: Visual (lg+) ────────────── */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col items-center justify-center gap-6"
        style={{ background: 'linear-gradient(145deg, #EFF6FF 0%, #DBEAFE 35%, #BFDBFE 70%, #93C5FD 100%)' }}
      >
        {/* Atmospheric blobs */}
        <div className="absolute top-16 left-12 w-52 h-52 rounded-full bg-white/25 blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 right-10 w-60 h-60 rounded-full bg-blue-400/15 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-blue-200/20 blur-3xl pointer-events-none" />

        {/* Illustration with drop shadow */}
        <div className="relative z-10" style={{ filter: 'drop-shadow(0 28px 40px rgba(37,99,235,0.22))' }}>
          <VaultIllustration />
        </div>

        <div className="relative z-10 text-center px-10">
          <p className="text-blue-900/55 text-sm font-medium leading-relaxed max-w-[220px] mx-auto">
            Controle total sobre suas finanças pessoais, investimentos e metas.
          </p>
        </div>

        {/* Decorative pill dots */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-300/50" />
          <div className="w-5 h-2 rounded-full bg-blue-400/60" />
          <div className="w-2 h-2 rounded-full bg-blue-300/50" />
        </div>
      </div>
    </div>
  );
}
