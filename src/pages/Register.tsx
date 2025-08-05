import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function Register() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      console.log('📝 Register: Starting registration process');
      setError('');
      setSuccess('');
      
      await registerUser(data.email.trim(), data.password, data.name.trim());
      
      setSuccess('Conta criada com sucesso! Você pode fazer login agora.');
      
      // Redirecionar para login após 2 segundos
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (err: any) {
      console.error('❌ Register: Error:', err);
      
      if (err.message?.includes('User already registered') || 
          err.message?.includes('user_already_exists') || 
          err.message?.includes('duplicate key value violates unique constraint') ||
          err.code === 'user_already_exists') {
        setError('Este email já está cadastrado. Tente fazer login ou use outro email.');
      } else {
        setError(err.message || 'Erro ao criar conta. Tente novamente.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
          Crie sua conta
        </h2>
        <p className="mt-2 text-center text-xs text-gray-600">
          Ou{' '}
          <Link
            to="/login"
            className="font-medium text-black hover:text-gray-800"
          >
            entre na sua conta existente
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                <p className="text-xs font-medium">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg">
                <p className="text-xs font-medium">{success}</p>
              </div>
            )}

            <Input
              label="Nome completo"
              type="text"
              autoComplete="name"
              placeholder="Digite seu nome completo"
              {...register('name')}
              error={errors.name?.message}
            />

            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="Digite seu email"
              {...register('email')}
              error={errors.email?.message}
            />

            <Input
              label="Senha"
              type="password"
              autoComplete="new-password"
              placeholder="Digite sua senha"
              showPasswordToggle
              {...register('password')}
              error={errors.password?.message}
            />

            <Input
              label="Confirmar senha"
              type="password"
              autoComplete="new-password"
              placeholder="Confirme sua senha"
              showPasswordToggle
              {...register('confirmPassword')}
              error={errors.confirmPassword?.message}
            />

            <Button
              type="submit"
              className="w-full"
              loading={isSubmitting}
            >
              Criar conta
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}