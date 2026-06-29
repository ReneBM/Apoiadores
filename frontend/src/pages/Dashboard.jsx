import { useAuth } from '../contexts/AuthContext';
import DashboardAdmin from './DashboardAdmin';
import DashboardMultiplicador from './DashboardMultiplicador';

export default function Dashboard() {
  const { user, isAdmin, isCoordenador } = useAuth();

  if (isAdmin || isCoordenador) {
    return <DashboardAdmin />;
  }

  return <DashboardMultiplicador />;
}
