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
import AprovacoesPendentes  from '../pages/apoiadores/AprovacoesPendentes';
import CentralCoordenador   from '../pages/painel/CentralCoordenador';
import Feed          from '../pages/painel/Feed';
import PerfilLider   from '../pages/perfil/PerfilLider';
import PerfilAdmin   from '../pages/painel/PerfilAdmin';
import PerfisAcesso from '../pages/admin/PerfisAcesso';
import LandingPage from '../pages/LandingPage';

export default function AppRoutes() {
  const { isAuthenticated, user, primeiroAcesso } = useAuth();

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
            ? <Navigate to={primeiroAcesso ? '/primeiro-acesso' : (user?.role === 'multiplicador' ? '/painel' : '/dashboard')} replace />
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
            ? <Navigate to={user?.role === 'multiplicador' ? '/painel' : '/dashboard'} replace />
            : <PrimeiroAcesso />
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

          {/* Apoiadores - Visualização */}
          <Route element={<PrivateRoute permission={{ func: 'Apoiadores', action: 'visualizar' }} />}>
            <Route path="/apoiadores"           element={<ApoiadoresList />} />
            <Route path="/aprovacoes"              element={<AprovacoesPendentes />} />
          </Route>

          {/* Apoiadores - Criação */}
          <Route element={<PrivateRoute permission={{ func: 'Apoiadores', action: 'criar' }} />}>
            <Route path="/apoiadores/novo"      element={<ApoiadoresForm />} />
          </Route>

          {/* Apoiadores - Edição */}
          <Route element={<PrivateRoute permission={{ func: 'Apoiadores', action: 'editar' }} />}>
            <Route path="/apoiadores/:id/editar" element={<ApoiadoresEdit />} />
          </Route>

          {/* Equipe - Integrantes */}
          <Route element={<PrivateRoute permission={{ func: 'Equipe', action: 'visualizar' }} />}>
            <Route path="/equipe"                  element={<MultiplicadoresList title="Equipe" />} />
          </Route>

          {/* Perfis de Acesso */}
          <Route element={<PrivateRoute permission={{ func: 'Perfis de Acesso', action: 'visualizar' }} />}>
            <Route path="/perfis"                  element={<PerfisAcesso />} />
          </Route>

          <Route element={<PrivateRoute permission={{ func: 'Equipe', action: 'criar' }} />}>
            <Route path="/multiplicadores/novo"    element={<MultiplicadoresForm />} />
          </Route>

          <Route element={<PrivateRoute permission={{ func: 'Equipe', action: 'editar' }} />}>
            <Route path="/multiplicadores/:id"     element={<MultiplicadoresForm editMode />} />
          </Route>

          {/* Dashboard */}
          <Route element={<PrivateRoute permission={{ func: 'Dashboard', action: 'visualizar' }} />}>
            <Route path="/dashboard"            element={<Dashboard />} />
            <Route path="/central-coordenador"     element={<CentralCoordenador />} />
          </Route>

          {/* Notícias / Feed */}
          <Route element={<PrivateRoute permission={{ func: 'Feed de Notícias', action: 'visualizar' }} />}>
            <Route path="/feed" element={<Feed />} />
          </Route>

          {/* Painel do multiplicador — todos os roles acessam (ações internas validam permissões) */}
          <Route path="/painel" element={<Painel />} />
          <Route path="/perfil" element={['admin', 'coordenador'].includes(user?.role) ? <PerfilAdmin /> : <PerfilLider />} />

        </Route>
      </Route>

      {/* Raiz — redireciona para destino correto */}
      <Route
        path="/"
        element={
          isAuthenticated
            ? <Navigate to={primeiroAcesso ? '/primeiro-acesso' : (user?.role === 'multiplicador' ? '/painel' : '/dashboard')} replace />
            : <Navigate to="/login" replace />
        }
      />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

