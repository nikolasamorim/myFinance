import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { OnboardingProvider } from './context/OnboardingContext';
import { SidebarProvider } from './context/SidebarContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { AuthCallback } from './pages/AuthCallback';
import { Dashboard } from './pages/Dashboard';
import { Overview } from './pages/Overview';
import { Settings } from './pages/Settings';
import { Receitas } from './pages/managers/Receitas';
import { Despesas } from './pages/managers/Despesas';
import { Dividas } from './pages/managers/Dividas';
import { Investimentos } from './pages/managers/Investimentos';
import { Instituicoes } from './pages/organizadores/Instituicoes';
import { Cartoes } from './pages/organizadores/Cartoes';
import { Contas } from './pages/organizadores/Contas';
import { Categorias } from './pages/organizadores/Categorias';
import { CentrosDeCusto } from './pages/organizadores/CentrosDeCusto';
import { History } from './pages/History';
import Invoice from './pages/Invoice';
import { Notifications } from './pages/Notifications';
import { NotificationSettings } from './pages/NotificationSettings';
import { Reconciliation } from './pages/Reconciliation';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
      <AuthProvider>
        <WorkspaceProvider>
          <SidebarProvider>
            <OnboardingProvider>
              <Router>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
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
                    path="/organizadores/instituicoes"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Instituicoes />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/organizadores/cartoes"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Cartoes />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/organizadores/contas"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Contas />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/organizadores/categorias"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Categorias />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/organizadores/centros-de-custo"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <CentrosDeCusto />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/history"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <History />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/invoice"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Invoice />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/overview"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Overview />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/onboarding" element={<Navigate to="/overview" replace />} />
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
                    path="/notifications"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Notifications />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings/notifications"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <NotificationSettings />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/reconciliacao"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Reconciliation />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Navigate to="/overview" replace />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </Router>
            </OnboardingProvider>
          </SidebarProvider>
        </WorkspaceProvider>
      </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;