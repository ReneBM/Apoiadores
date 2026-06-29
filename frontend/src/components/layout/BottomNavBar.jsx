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

  const links = [];

  // Dashboard
  if (hasPermission('Dashboard', 'visualizar')) {
    links.push({ to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' });
  }

  // Feed (Notícias)
  if (hasPermission('Notícias', 'visualizar')) {
    links.push({ to: '/feed', icon: MessageSquare, label: 'Feed' });
  }

  // Equipe
  if (hasPermission('Equipe', 'visualizar')) {
    links.push({ to: '/equipe', icon: Users, label: 'Equipe' });
  }

  // Painel
  links.push({ to: '/painel', icon: Shield, label: 'Painel' });

  // Perfil
  links.push({ to: '/perfil', icon: Grid, label: 'Perfil' });

  return (
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
  );
}
