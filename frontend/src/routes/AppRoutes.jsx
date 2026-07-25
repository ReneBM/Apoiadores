import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PrivateRoute } from './PrivateRoute';
import AppLayout from '../components/layout/AppLayout';

// Páginas
import Login               from '../pages/Login';
import PrimeiroAcesso      from '../pages/PrimeiroAcesso';
import Dashboard           from '../pages/Dashboard';
import ApoiadoresList      from '../pages/apoiadores/ApoiadoresList';
import ApoiadoresForm      from '../pages/apoiadores/ApoiadoresForm';
import ApoiadoresEdit      from '../pages/apoiadores/ApoiadoresEdit';
import MultiplicadoresList from '../pages/multiplicadores/MultiplicadoresList';
import MultiplicadoresForm from '../pages/multiplicadores/MultiplicadoresForm';
import Painel from '../pages/painel/Painel';
import CadastroApoiador from '../pages/CadastroApoiador';
import PesquisaEngajamento from '../pages/PesquisaEngajamento';
import AprovacoesPendentes  from '../pages/apoiadores/AprovacoesPendentes';
import CentralCoordenador   from '../pages/painel/CentralCoordenador';
import Feed          from '../pages/painel/Feed';
import PerfilLider   from '../pages/perfil/PerfilLider';
import PerfilAdmin   from '../pages/painel/PerfilAdmin';
import PerfisAcesso from '../pages/admin/PerfisAcesso';
import LandingPage from '../pages/LandingPage';

export default function AppRoutes() {
  const { isAuthenticated, user, primeiroAcesso, pesquisaConcluida } = useAuth();

  const getHomeRedirect = () => {
    if (primeiroAcesso) return '/primeiro-acesso';
    if (!pesquisaConcluida) return '/pesquisa-engajamento';
    return ['admin', 'coordenador'].includes(user?.role) ? '/dashboard' : '/painel';
  };

  return (
    <Routes>
      {/* Rotas públicas da Landing Page (Squeeze Page WhatsApp) */}
      <Route path="/lp" element={<LandingPage />} />
      <Route path="/time" element={<LandingPage />} />
      <Route path="/participar" element={<LandingPage />} />

      {/* Rota de login — redireciona se já autenticado */}
      <Route
        path="/login"
        element={
          isAuthenticated
            ? <Navigate to={getHomeRedirect()} replace />
            : <Login />
        }
      />

      {/* Rota de primeiro acesso — apenas para usuários autenticados com senha temporária */}
      <Route
        path="/primeiro-acesso"
        element={
          !isAuthenticated
            ? <Navigate to="/login" replace />
            : !primeiroAcesso
            ? <Navigate to={getHomeRedirect()} replace />
            : <PrimeiroAcesso />
        }
      />

      {/* Rota de Pesquisa de Engajamento — Onboarding Obrigatório do Primeiro Acesso */}
      <Route
        path="/pesquisa-engajamento"
        element={
          !isAuthenticated
            ? <Navigate to="/login" replace />
            : pesquisaConcluida
            ? <Navigate to={['admin', 'coordenador'].includes(user?.role) ? '/dashboard' : '/painel'} replace />
            : <PesquisaEngajamento />
        }
      />

      {/* Rota pública de cadastro de apoiadores */}
      <Route
        path="/cadastro"
        element={<CadastroApoiador />}
      />

      {/* Rotas protegidas — com layout (BottomNavBar + Header) */}
      <Route element={<PrivateRoute />}>
        <Route element={<AppLayout />}>

          {/* Apoiadores - Visualização (Apenas Staff) */}
          <Route element={<PrivateRoute roles={['admin', 'coordenador']} permission={{ func: 'Apoiadores', action: 'visualizar' }} />}>
            <Route path="/apoiadores"           element={<ApoiadoresList />} />
            <Route path="/aprovacoes"              element={<AprovacoesPendentes />} />
          </Route>

          {/* Apoiadores - Criação (Apenas Staff) */}
          <Route element={<PrivateRoute roles={['admin', 'coordenador']} permission={{ func: 'Apoiadores', action: 'criar' }} />}>
            <Route path="/apoiadores/novo"      element={<ApoiadoresForm />} />
          </Route>

          {/* Apoiadores - Edição (Apenas Staff) */}
          <Route element={<PrivateRoute roles={['admin', 'coordenador']} permission={{ func: 'Apoiadores', action: 'editar' }} />}>
            <Route path="/apoiadores/:id/editar" element={<ApoiadoresEdit />} />
          </Route>

          {/* Equipe - Integrantes (Apenas Staff) */}
          <Route element={<PrivateRoute roles={['admin', 'coordenador']} permission={{ func: 'Equipe', action: 'visualizar' }} />}>
            <Route path="/equipe"                  element={<MultiplicadoresList title="Equipe" />} />
          </Route>

          {/* Perfis de Acesso (Apenas Staff) */}
          <Route element={<PrivateRoute roles={['admin', 'coordenador']} permission={{ func: 'Perfis de Acesso', action: 'visualizar' }} />}>
            <Route path="/perfis"                  element={<PerfisAcesso />} />
          </Route>

          <Route element={<PrivateRoute roles={['admin', 'coordenador']} permission={{ func: 'Equipe', action: 'criar' }} />}>
            <Route path="/multiplicadores/novo"    element={<MultiplicadoresForm />} />
          </Route>

          <Route element={<PrivateRoute roles={['admin', 'coordenador']} permission={{ func: 'Equipe', action: 'editar' }} />}>
            <Route path="/multiplicadores/:id"     element={<MultiplicadoresForm editMode />} />
          </Route>

          {/* Dashboard (Apenas Staff) */}
          <Route element={<PrivateRoute roles={['admin', 'coordenador']} permission={{ func: 'Dashboard', action: 'visualizar' }} />}>
            <Route path="/dashboard"            element={<Dashboard />} />
            <Route path="/central-coordenador"     element={<CentralCoordenador />} />
          </Route>

          {/* Liberados para todo Apoiador: Feed, Painel e Perfil */}
          <Route path="/feed" element={<Feed />} />
          <Route path="/painel" element={<Painel />} />
          <Route path="/perfil" element={['admin', 'coordenador'].includes(user?.role) ? <PerfilAdmin /> : <PerfilLider />} />

        </Route>
      </Route>

      {/* Raiz — Landing Page pública. Usuários já autenticados vão para o app. */}
      <Route
        path="/"
        element={
          isAuthenticated
            ? <Navigate to={getHomeRedirect()} replace />
            : <LandingPage />
        }
      />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

