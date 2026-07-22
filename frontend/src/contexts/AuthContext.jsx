import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  // Busca dados e permissões atualizados do servidor ao carregar
  const fetchCurrentUser = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    try {
      const { data } = await api.get('/auth/me');
      if (data) {
        setUser((prev) => {
          const updated = { ...prev, ...data };
          localStorage.setItem('user', JSON.stringify(updated));
          return updated;
        });
      }
    } catch (err) {
      // Interceptor trata erros de autenticação se token estiver inválido
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Escuta o evento de logout disparado pelo interceptor Axios
  const handleForceLogout = useCallback(() => {
    setUser(null);
  }, []);

  useEffect(() => {
    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, [handleForceLogout]);

  const login = async (email, senha) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, senha });

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      setUser(data.user);
      return {
        success: true,
        role: data.user.role,
        primeiroAcesso: data.user.primeiro_acesso,
      };
    } catch (err) {
      const message = err.response?.data?.error || 'Erro ao fazer login.';
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // ignora erros no logout
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  const isAdmin = user?.role === 'admin';
  const isCoordenador = user?.role === 'coordenador';
  const isMultiplicador = user?.role === 'multiplicador';
  const canManageAll = isAdmin || isCoordenador;
  const primeiroAcesso = user?.primeiro_acesso === true;

  const hasPermission = useCallback((funcionalidade, acao) => {
    if (user?.role === 'admin') return true;
    return user?.permissoes?.[funcionalidade]?.[acao] === true;
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      isAdmin,
      isCoordenador,
      isMultiplicador,
      canManageAll,
      primeiroAcesso,
      hasPermission,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>

  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
};
