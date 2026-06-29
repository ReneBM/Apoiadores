import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Target, Trophy, Award, Download, Share2, Copy, CheckCircle2, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { copyToClipboard } from '../../utils/clipboard';

export default function PerfilLider() {
  const { user, logout } = useAuth();
  const [meta, setMeta] = useState(0);
  const [cadastrados, setCadastrados] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  // Mock dados iniciais (simulando que backend vai enviar na tela de dashboard ou fetch aqui mesmo)
  useEffect(() => {
    // Simulando fetch de dashboard pessoal
    setTimeout(() => {
      setMeta(50);
      setCadastrados(12);
    }, 500);
  }, []);

  const progress = meta > 0 ? Math.min((cadastrados / meta) * 100, 100) : 0;

  const materiais = [
    {
      id: 1,
      tipo: 'Imagem',
      titulo: 'Card de Apoio 1',
      url: 'https://via.placeholder.com/600x600/0054A6/FFFFFF?text=Card+1'
    },
    {
      id: 2,
      tipo: 'Vídeo',
      titulo: 'Vídeo Campanha - O Trabalho Não Para',
      url: 'https://via.placeholder.com/600x600/ccf600/002855?text=Video+Campanha'
    }
  ];

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/cadastro?ref=${user?.id}`;
    const success = await copyToClipboard(link);
    if (success) {
      setCopiedLink(true);
      toast.success('Link de indicação copiado!');
      setTimeout(() => setCopiedLink(false), 3000);
    } else {
      toast.error('Erro ao copiar. Seu navegador bloqueou a ação.');
    }
  };

  const handleShareMaterial = async (mat) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: mat.titulo,
          text: 'Veja esse material!',
          url: mat.url,
        });
      } catch (err) {
        console.log('Error sharing', err);
      }
    } else {
      const success = await copyToClipboard(mat.url);
      if (success) {
        toast.success('Link do material copiado!');
      } else {
        toast.error('Erro ao copiar.');
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-24" style={{ padding: '0 0.5rem' }}>
      <div className="flex items-center justify-between" style={{ marginTop: '0.5rem' }}>
        <h1 className="text-xl font-bold" style={{ color: 'var(--texto)' }}>Meu Perfil</h1>
      </div>

      {/* Card do Nível Atual */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #002855 0%, #0054A6 100%)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '1.5rem'
      }}>
        <div style={{
          width: '60px', height: '60px',
          borderRadius: '50%',
          backgroundColor: '#ccf600',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#002855'
        }}>
          <Trophy size={32} />
        </div>
        <div>
          <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '1px' }}>Nível Atual</span>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>
            {user?.tipo || (user?.role === 'admin' ? 'Administrador' : 'Líder de Base')}
          </h2>
        </div>
      </div>

      {/* Minha Meta */}
      <div className="card flex flex-col gap-4">
        <h3 className="font-bold text-lg" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Target size={20} /> Progresso da Meta
        </h3>
        
        <div className="flex items-center justify-between mt-2">
          <div className="text-center">
            <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--texto)' }}>{cadastrados}</span>
            <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--texto-medio)' }}>Cadastrados</span>
          </div>
          <div className="text-center">
            <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--texto)' }}>{meta}</span>
            <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--texto-medio)' }}>Meta</span>
          </div>
        </div>

        <div style={{ width: '100%', height: '12px', backgroundColor: '#f1f5f9', borderRadius: '6px', overflow: 'hidden', marginTop: '1rem' }}>
          <div style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--primary)', transition: 'width 0.5s ease-out' }} />
        </div>
        <p className="text-center text-sm mt-2 font-medium" style={{ color: 'var(--texto-claro)' }}>
          {progress >= 100 ? 'Meta atingida! Parabéns!' : `Faltam ${meta - cadastrados} para bater sua meta.`}
        </p>

        {/* Link de Cadastro */}
        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--texto-medio)', display: 'block', marginBottom: '0.5rem' }}>
            Seu Link Exclusivo de Indicação:
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              readOnly 
              value={`${window.location.origin}/cadastro?ref=${user?.id}`} 
              className="form-input"
              style={{ flex: 1, backgroundColor: '#fff', fontSize: '0.85rem' }}
            />
            <button 
              onClick={handleCopyLink}
              className="btn-primary"
              style={{ minWidth: '44px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {copiedLink ? <CheckCircle2 size={18} /> : <Copy size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Materiais para Divulgar */}
      <div className="card flex flex-col gap-4">
        <h3 className="font-bold text-lg" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Award size={20} /> Materiais para Divulgar
        </h3>
        <p className="text-sm" style={{ color: 'var(--texto-medio)' }}>
          Baixe ou compartilhe diretamente nas suas redes sociais.
        </p>

        <div className="grid grid-cols-1 gap-4 mt-2">
          {materiais.map(mat => (
            <div key={mat.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', border: '1px solid var(--borda)', borderRadius: '12px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, backgroundColor: '#f1f5f9' }}>
                <img src={mat.url} alt={mat.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ flex: 1 }}>
                <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--texto)', marginBottom: '0.2rem' }}>{mat.titulo}</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--texto-claro)', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '12px' }}>{mat.tipo}</span>
              </div>
              <button 
                onClick={() => handleShareMaterial(mat)}
                className="btn-secondary"
                style={{ width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
              >
                <Share2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
