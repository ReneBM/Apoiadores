import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Rota privada com verificação de role ou permissão específica.
 * @param {string[]} roles — roles permitidas.
 * @param {object}   permission — objeto { func, action } para verificar permissão do perfil.
 * @param {string}   redirectTo — destino se não autenticado
 */
export function PrivateRoute({ roles = [], permission = null, redirectTo = '/login' }) {
  const { isAuthenticated, user, hasPermission } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  if (roles.length > 0 && !roles.includes(user?.role)) {
    // Redireciona para o painel correto conforme role
    const fallback = user?.role === 'multiplicador' ? '/painel' : '/dashboard';
    return <Navigate to={fallback} replace />;
  }

  if (permission && !hasPermission(permission.func, permission.action)) {
    // Redireciona se não tem permissão para a funcionalidade
    const fallback = user?.role === 'multiplicador' ? '/painel' : '/dashboard';
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}

