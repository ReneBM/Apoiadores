import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, NavLink } from 'react-router-dom';
import BottomNavBar from './BottomNavBar';
import Header from './Header';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, Users, Target, CheckSquare, Megaphone, LogOut, Shield, Eye, Grid, Lock, MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, canManageAll, hasPermission } = useAuth();
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [activeAviso, setActiveAviso] = useState(null);
  const [avisosQueue, setAvisosQueue] = useState([]);

  useEffect(() => {
    if (!user) return;

    const fetchAvisos = async () => {
      try {
        const res = await api.get('/mensagens/popup');
        const activeAvisos = res.data || [];
        
        // Obter os avisos já visualizados pelo usuário do localStorage
        const key = `seen_avisos_${user.id}`;
        const seenAvisos = JSON.parse(localStorage.getItem(key) || '[]');
        
        // Filtrar apenas os não lidos
        const unread = activeAvisos.filter(aviso => !seenAvisos.includes(aviso.id));
        
        setAvisosQueue(unread);
        if (unread.length > 0) {
          setActiveAviso(unread[0]);
        }
      } catch (err) {
        console.error('Erro ao carregar avisos pop-up:', err);
      }
    };

    fetchAvisos();
  }, [user]);

  const handleDismissAviso = () => {
    if (!activeAviso || !user) return;
    
    // Salvar no localStorage que este aviso foi visualizado
    const key = `seen_avisos_${user.id}`;
    const seenAvisos = JSON.parse(localStorage.getItem(key) || '[]');
    if (!seenAvisos.includes(activeAviso.id)) {
      seenAvisos.push(activeAviso.id);
      localStorage.setItem(key, JSON.stringify(seenAvisos));
    }
    
    // Atualizar a fila de não lidos
    const nextQueue = avisosQueue.filter(aviso => aviso.id !== activeAviso.id);
    setAvisosQueue(nextQueue);
    
    // Se houver mais, mostra o próximo
    if (nextQueue.length > 0) {
      setActiveAviso(nextQueue[0]);
    } else {
      setActiveAviso(null);
    }
  };

  const renderAvisoModal = () => {
    if (!activeAviso) return null;

    return (
      <div 
        className="overlay-premium"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 8, 20, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '1.5rem',
          boxSizing: 'border-box'
        }}
      >
        <div 
          className="modal-bounce"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 20px 50px rgba(0, 40, 100, 0.3)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            position: 'relative'
          }}
        >
          {/* Top Premium Color Bar */}
          <div style={{
            height: '8px',
            background: 'linear-gradient(90deg, var(--primary) 0%, var(--primary-light) 50%, var(--lime) 100%)'
          }} />
          
          {/* Close Button on top right */}
          <button 
            onClick={handleDismissAviso}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(0, 30, 80, 0.04)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--texto-medio)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              zIndex: 2
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 30, 80, 0.08)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 30, 80, 0.04)'}
          >
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>×</span>
          </button>

          {/* Header / Announcement Info */}
          <div style={{ padding: '2.5rem 2rem 1.25rem 2rem', textAlign: 'center' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(0, 84, 166, 0.1) 0%, rgba(204, 246, 0, 0.15) 100%)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto',
            }}>
              <Megaphone size={28} />
            </div>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              color: 'var(--primary)',
              letterSpacing: '1.5px',
              display: 'block',
              marginBottom: '0.5rem'
            }}>
              Comunicado Oficial
            </span>
            <h2 style={{
              fontSize: '1.35rem',
              fontWeight: 900,
              color: 'var(--texto)',
              margin: 0,
              lineHeight: 1.25,
              letterSpacing: '-0.3px'
            }}>
              {activeAviso.titulo}
            </h2>
            <span style={{
              fontSize: '0.7rem',
              color: 'var(--texto-claro)',
              display: 'block',
              marginTop: '0.4rem'
            }}>
              Postado em {new Date(activeAviso.created_at).toLocaleDateString('pt-BR')} às {new Date(activeAviso.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Body Content */}
          <div style={{
            padding: '1.25rem 2rem',
            maxHeight: '260px',
            overflowY: 'auto',
            fontSize: '0.9rem',
            color: 'var(--texto-medio)',
            lineHeight: 1.6,
            textAlign: 'left',
            whiteSpace: 'pre-line',
            borderTop: '1px solid rgba(0, 30, 80, 0.06)',
            borderBottom: '1px solid rgba(0, 30, 80, 0.06)',
            backgroundColor: 'rgba(0, 30, 80, 0.01)',
          }}>
            {activeAviso.imagem_url && (
              <div style={{ marginBottom: '1rem', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--borda)', backgroundColor: '#f8fafc' }}>
                <img 
                  src={activeAviso.imagem_url} 
                  alt="Aviso" 
                  style={{ width: '100%', height: 'auto', maxHeight: '180px', objectFit: 'contain', display: 'block', margin: '0 auto' }} 
                />
              </div>
            )}
            {activeAviso.conteudo}
          </div>

          {/* Footer / Confirm Button */}
          <div style={{ padding: '1.5rem 2rem 2rem 2rem', display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={handleDismissAviso}
              style={{
                padding: '0.8rem 2.5rem',
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '30px',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(0, 84, 166, 0.25)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--primary-light)';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 10px 22px rgba(0, 84, 166, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--primary)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 84, 166, 0.25)';
              }}
            >
              <span>Entendi e Confirmar</span>
            </button>
          </div>

        </div>
      </div>
    );
  };

  const titles = {
    '/dashboard':           'Dashboard',
    '/apoiadores':          'Apoiadores',
    '/apoiadores/novo':     'Novo Apoiador',
    '/equipe':              'Equipe',
    '/perfis':              'Perfis de Acesso',
    '/painel':              'Meu Painel',
    '/aprovacoes':          'Aprovações Pendentes',
    '/central-coordenador': 'Central Coordenador',
    '/feed':                'Feed de Notícias',
  };

  const title = Object.entries(titles).find(([path]) =>
    location.pathname === path || location.pathname.startsWith(path + '/')
  )?.[1] ?? 'Apoiadores';

  const handleLogout = async () => {
    if (!confirmLogout) {
      setConfirmLogout(true);
      setTimeout(() => setConfirmLogout(false), 3000);
      return;
    }
    setConfirmLogout(false);
    await logout();
    toast.success('Até logo!');
    navigate('/login');
  };

  const sidebarLinks = [];
  
  // Painel - Sempre visível
  sidebarLinks.push({ 
    to: '/painel', 
    icon: Shield, 
    label: (user?.role === 'admin' || user?.role === 'coordenador') ? 'Painel de Controle' : 'Meu Painel' 
  });

  // Dashboard
  if (hasPermission('Dashboard', 'visualizar')) {
    sidebarLinks.push({ to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' });
  }

  // Apoiadores
  if (hasPermission('Apoiadores', 'visualizar')) {
    sidebarLinks.push({ to: '/apoiadores', icon: Users, label: 'Apoiadores' });
  }

  // Equipe (Integrantes e Perfis)
  if (hasPermission('Equipe', 'visualizar')) {
    sidebarLinks.push({ to: '/equipe', icon: Users, label: 'Equipe' });
  }
  if (hasPermission('Perfis de Acesso', 'visualizar')) {
    sidebarLinks.push({ to: '/perfis', icon: Shield, label: 'Perfis de Acesso' });
  }

  // Feed (Notícias)
  if (hasPermission('Notícias', 'visualizar')) {
    sidebarLinks.push({ to: '/feed', icon: MessageSquare, label: 'Feed de Notícias' });
  }

  return (
    <>
      <div className="app-layout-container">
        
        {/* Sidebar Desktop */}
        <aside className="app-sidebar-desktop">
          {/* Logo Section */}
          <div className="sidebar-logo-section">
            <div className="sidebar-logo-icon">
              TS
            </div>
            <div style={{ textAlign: 'left' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, display: 'block', letterSpacing: '-0.2px' }}>Tô com Styvenson</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase' }}>
                {user?.role === 'admin' ? 'Administrador' : user?.role === 'coordenador' ? 'Coordenador' : 'Multiplicador'}
              </span>
            </div>
          </div>

          {/* Links Section */}
          <nav className="sidebar-nav">
            {sidebarLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon size={18} />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* User Info / Profile & Logout */}
          <div className="sidebar-footer">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div className="sidebar-user-avatar">
                {user?.nome?.charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0, textAlign: 'left' }}>
                <span className="sidebar-user-name">
                  {user?.nome}
                </span>
                <span className="sidebar-user-email">
                  {user?.email}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="sidebar-logout-btn"
              style={{
                backgroundColor: confirmLogout ? '#ef4444' : 'rgba(255,255,255,0.08)'
              }}
            >
              <LogOut size={14} />
              <span>{confirmLogout ? 'Confirmar Saída?' : 'Sair da Conta'}</span>
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <div className="app-main-wrapper">
          <Header title={title} />
          <main className="app-main-content">
            <Outlet />
          </main>
          <BottomNavBar />
        </div>

      </div>
      {activeAviso && renderAvisoModal()}
    </>
  );
}

