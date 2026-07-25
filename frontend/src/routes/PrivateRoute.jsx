import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Rota privada com verificação de role ou permissão específica.
 * @param {string[]} roles — roles permitidas.
 * @param {object}   permission — objeto { func, action } para verificar permissão do perfil.
 * @param {string}   redirectTo — destino se não autenticado
 */
export function PrivateRoute({ roles = [], permission = null, redirectTo = '/login' }) {
  const { isAuthenticated, user, pesquisaConcluida, hasPermission } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // Se o usuário está autenticado mas ainda não concluiu a pesquisa de engajamento no onboarding
  if (!pesquisaConcluida) {
    return <Navigate to="/pesquisa-engajamento" replace />;
  }

  const isStaff = ['admin', 'coordenador'].includes(user?.role);
  const fallback = isStaff ? '/dashboard' : '/painel';

  if (roles.length > 0 && !roles.includes(user?.role)) {
    return <Navigate to={fallback} replace />;
  }

  if (permission && !hasPermission(permission.func, permission.action)) {
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}

