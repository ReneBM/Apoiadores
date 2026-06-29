import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Copy, Check, Share2, Award, Video, ArrowRight, MessageSquare, MapPin, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { copyToClipboard } from '../../utils/clipboard';

export default function PainelMultiplicador() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const referralLink = `${window.location.origin}/cadastro?ref=${user?.id}`;

  const handleCopyLink = async () => {
    const success = await copyToClipboard(referralLink);
    if (success) {
      setCopied(true);
      toast.success('Link de indicação copiado!');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Erro ao copiar o link. Tente compartilhar pelo WhatsApp.');
    }
  };

  const handleShareWhatsApp = (text, url) => {
    const message = encodeURIComponent(`${text}\n\n${url}`);
    window.open(`https://api.whatsapp.com/send?text=${message}`, '_blank');
  };

  const userTier = user?.tipo || 'Apoiador';

  return (
    <div className="flex flex-col gap-4 pb-4" style={{ padding: '0 0.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Banner de Engajamento */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary-deeper) 0%, var(--primary-dark) 50%, var(--primary) 100%)',
        borderRadius: '16px',
        padding: '1.25rem',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        boxShadow: '0 8px 24px rgba(0, 84, 166, 0.2)',
        position: 'relative',
        overflow: 'visible'
      }}>
        <div style={{ flex: 1, zIndex: 1, textAlign: 'left' }}>
          <span style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--lime)', display: 'block', marginBottom: '0.25rem' }}>
            Nossa Mobilização
          </span>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 900, margin: '0 0 0.4rem 0', lineHeight: '1.3' }}>
            Tô com Styvenson!
          </h3>
          <p style={{ fontSize: '0.78rem', opacity: 0.85, margin: 0, lineHeight: '1.4' }}>
            Multiplique o nosso trabalho nas redes e nas ruas de forma oficial e segura.
          </p>
        </div>
        <img 
          src="/uploads/foto5_nobg.png" 
          alt="Senador Styvenson Valim" 
          style={{
            height: '115px',
            width: 'auto',
            objectFit: 'contain',
            margin: '-25px -10px -25px 0',
            flexShrink: 0,
            zIndex: 1,
            filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.3))'
          }} 
        />
      </div>

      {/* Saudação */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--texto)' }}>
            Olá, {user?.nome?.split(' ')[0]}! 👋
          </h2>
          <p style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--texto-medio)', margin: '0.2rem 0 0' }}>
            Painel de Ações
          </p>
        </div>
      </div>

      {/* Link de Indicação Pessoal (WhatsApp / Copiar) */}
      <div className="card" style={{ padding: '1.25rem', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid var(--borda)' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--texto-medio)', margin: '0 0 0.75rem' }}>
          Indique simpatizantes
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--texto-claro)', margin: '0 0 1rem', lineHeight: '1.4' }}>
          Compartilhe seu link pessoal. Cada simpatizante cadastrado que for aprovado pela coordenação contará para subir seu nível!
        </p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleCopyLink}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '0.65rem',
              borderRadius: '8px',
              border: '1.5px solid var(--borda)',
              backgroundColor: '#fff',
              color: 'var(--texto)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {copied ? <Check size={16} color="#059669" /> : <Copy size={16} />}
            <span>{copied ? 'Copiado!' : 'Copiar Link'}</span>
          </button>
          <button
            onClick={() => handleShareWhatsApp(
              'Olá! Convido você a fazer parte da nossa rede de apoiadores "Tô com Styvenson"! Cadastre-se através do meu link oficial:',
              referralLink
            )}
            style={{
              flex: 1.2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '0.65rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#25D366',
              color: '#fff',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 10px rgba(37, 211, 102, 0.15)',
            }}
          >
            <Share2 size={16} />
            <span>Compartilhar</span>
          </button>
        </div>
      </div>

      {/* Benefícios Exclusivos (Disponível apenas para Líder de Base) */}
      {(userTier === 'Líder de Base' || userTier === 'Coordenador') && (
        <div className="card" style={{ padding: '1.25rem', border: '1px solid rgba(0,84,166,0.15)', backgroundColor: 'rgba(0,84,166,0.02)', borderRadius: '12px' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#0054A6', margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Award size={16} />
            <span>Benefícios de {userTier}</span>
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Meet Link */}
            <a
              href="https://meet.google.com/mock-room-valim"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                textDecoration: 'none',
                color: 'var(--texto)',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Video size={18} color="#0054A6" />
                <div style={{ textAlign: 'left' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block' }}>Reunião Exclusiva Online</span>
                  <small style={{ color: '#64748b', fontSize: '0.72rem' }}>Acesse a sala vip de bate-papo</small>
                </div>
              </div>
              <ArrowRight size={14} color="#94a3b8" />
            </a>

            {/* Chat WhatsApp com Coordenação */}
            <a
              href={`https://wa.me/5584999999999?text=Olá,%20sou%20${encodeURIComponent(userTier)}%20da%20equipe%20e%20gostaria%20de%20falar%20com%20a%20coordenação.`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                textDecoration: 'none',
                color: 'var(--texto)',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <MessageSquare size={18} color="#25D366" />
                <div style={{ textAlign: 'left' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block' }}>Canal Direto Coordenação</span>
                  <small style={{ color: '#64748b', fontSize: '0.72rem' }}>Fale direto com a assessoria</small>
                </div>
              </div>
              <ArrowRight size={14} color="#94a3b8" />
            </a>
          </div>
        </div>
      )}

      {/* Ações Rápidas (Permissões) */}
      <div className="card" style={{ padding: '1.25rem', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid var(--borda)' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--texto-medio)', margin: '0 0 0.75rem' }}>
          Minhas Ferramentas
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {/* Cadastrar Apoiador */}
          <button
            onClick={() => navigate('/apoiadores/novo')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '1rem 0.5rem',
              borderRadius: '10px',
              border: '1.5px solid rgba(0, 84, 166, 0.1)',
              backgroundColor: 'rgba(0, 84, 166, 0.03)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              color: 'var(--primary)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 84, 166, 0.08)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 84, 166, 0.03)'}
          >
            <div style={{ padding: '8px', backgroundColor: '#fff', borderRadius: '50%', border: '1px solid rgba(0, 84, 166, 0.1)' }}>
              <Users size={18} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--texto)' }}>Cadastrar Apoiador</span>
          </button>

          {/* Minha Rede */}
          <button
            onClick={() => navigate('/apoiadores')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '1rem 0.5rem',
              borderRadius: '10px',
              border: '1.5px solid rgba(5, 150, 105, 0.1)',
              backgroundColor: 'rgba(5, 150, 105, 0.03)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              color: '#059669'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(5, 150, 105, 0.08)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(5, 150, 105, 0.03)'}
          >
            <div style={{ padding: '8px', backgroundColor: '#fff', borderRadius: '50%', border: '1px solid rgba(5, 150, 105, 0.1)' }}>
              <MapPin size={18} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--texto)' }}>Ver Minha Rede</span>
          </button>
        </div>
      </div>
    </div>
  );
}
