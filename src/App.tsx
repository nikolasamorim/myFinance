import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { OnboardingProvider } from './context/OnboardingContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Onboarding } from './pages/Onboarding';
import { Settings } from './pages/Settings';
import { Receitas } from './pages/managers/Receitas';
import { Despesas } from './pages/managers/Despesas';
import { Dividas } from './pages/managers/Dividas';
import { Investimentos } from './pages/managers/Investimentos';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WorkspaceProvider>
          <OnboardingProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Dashboard />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/gerenciadores/receitas"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Receitas />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/gerenciadores/despesas"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Despesas />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/gerenciadores/dividas"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Dividas />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/gerenciadores/investimentos"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Investimentos />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/onboarding"
                  element={
                    <ProtectedRoute>
                      <Onboarding />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Settings />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Navigate to="/dashboard" replace />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Router>
          </OnboardingProvider>
        </WorkspaceProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;