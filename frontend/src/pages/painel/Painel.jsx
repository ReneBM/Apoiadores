import { useAuth } from '../../contexts/AuthContext';
import PainelMultiplicador from './PainelMultiplicador';
import PainelControleAdmin from './PainelControleAdmin';

export default function Painel() {
  const { canManageAll } = useAuth();

  if (canManageAll) {
    return <PainelControleAdmin />;
  }

  return <PainelMultiplicador />;
}
