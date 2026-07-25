import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Grid,
  Shield,
  MessageSquare,
  Lock
} from 'lucide-react';

export default function BottomNavBar() {
  const { user, hasPermission } = useAuth();

  const isStaff = ['admin', 'coordenador'].includes(user?.role);
  const links = [];

  if (isStaff) {
    // Dashboard
    if (hasPermission('Dashboard', 'visualizar')) {
      links.push({ to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' });
    }

    // Feed (Notícias)
    if (hasPermission('Feed de Notícias', 'visualizar') || hasPermission('Notícias', 'visualizar')) {
      links.push({ to: '/feed', icon: MessageSquare, label: 'Feed' });
    }

    // Equipe / Apoiadores
    if (hasPermission('Apoiadores', 'visualizar')) {
      links.push({ to: '/apoiadores', icon: Users, label: 'Apoiadores' });
    } else if (hasPermission('Equipe', 'visualizar')) {
      links.push({ to: '/equipe', icon: Users, label: 'Equipe' });
    }

    // Painel
    links.push({ to: '/painel', icon: Shield, label: 'Painel' });

    // Perfil
    links.push({ to: '/perfil', icon: Grid, label: 'Perfil' });
  } else {
    // Apoiador comum: Apenas Painel, Feed e Perfil
    links.push({ to: '/painel', icon: Shield, label: 'Painel' });
    links.push({ to: '/feed', icon: MessageSquare, label: 'Feed' });
    links.push({ to: '/perfil', icon: Grid, label: 'Perfil' });
  }

  return (
    <>
      <style>{`
        .bottom-nav {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
        .nav-link {
          min-height: 44px;
        }
        @media (min-width: 320px) and (max-width: 375px) {
          .nav-link span {
            font-size: 0.58rem !important;
          }
        }
      `}</style>
      <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            id={`nav-${label.toLowerCase().replace(/\s/g, '-')}`}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            {({ isActive }) => (
              <>
                <div className="nav-icon-wrap">
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                </div>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
    </>
  );
}
