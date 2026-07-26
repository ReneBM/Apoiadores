import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Copy, Check, Share2, Award, Video, ArrowRight, MessageSquare, MapPin, Users, TrendingUp, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';
import { copyToClipboard } from '../../utils/clipboard';
import api, { getMediaUrl } from '../../api/axios';
import ReferralCardModal from '../../components/ReferralCardModal';

// Níveis de gamificação por apoiadores ativos.
// O limiar de 11 para Líder de Base segue a regra do backend (conteúdo antecipado).
const NIVEIS = [
  { nome: 'Apoiador',      min: 0,  cor: '#64748b' },
  { nome: 'Mobilizador',   min: 5,  cor: '#0054A6' },
  { nome: 'Líder de Base', min: 11, cor: '#b45309' },
];

const nivelAtual = (total) => [...NIVEIS].reverse().find((n) => total >= n.min) || NIVEIS[0];
const proximoNivel = (total) => NIVEIS.find((n) => total < n.min) || null;

export default function PainelMultiplicador() {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState(null);
  const [barAnimada, setBarAnimada] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const isStaff = ['admin', 'coordenador'].includes(user?.role);

  const referralLink = `${window.location.origin}/cadastro?ref=${user?.id}`;

  // Carrega estatísticas pessoais (total, meta, novos hoje)
  useEffect(() => {
    let ativo = true;
    api.get('/dashboard/multiplicador')
      .then((res) => { if (ativo) setStats(res.data); })
      .catch(() => {}); // sem perfil de multiplicador → oculta o card de meta
    return () => { ativo = false; };
  }, []);

  // Dispara a animação da barra após o primeiro render com dados
  useEffect(() => {
    if (stats) {
      const t = setTimeout(() => setBarAnimada(true), 150);
      return () => clearTimeout(t);
    }
  }, [stats]);

  const total = stats?.kpis?.totalApoiadores ?? 0;
  const meta = stats?.kpis?.meta ?? 0;
  const novosHoje = stats?.kpis?.novosHoje ?? 0;
  const pctMeta = meta > 0 ? Math.min(Math.round((total / meta) * 100), 100) : null;
  const nivel = nivelAtual(total);
  const proximo = proximoNivel(total);
  const metaBatida = pctMeta !== null && pctMeta >= 100;

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
    <div className="flex flex-col gap-4 pb-4" style={{ padding: '0 0.5rem', display: 'flex', flexDirection: 'column', gap: 'clamp(1rem, 3vw, 1.5rem)' }}>
      
      {/* Banner Principal de Boas-Vindas / Mobilização */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary-deeper) 0%, var(--primary-dark) 50%, var(--primary) 100%)',
        borderRadius: '14px',
        padding: '0.85rem 0.85rem 0 1rem',
        color: '#fff',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: '0.75rem',
        boxShadow: '0 6px 18px rgba(0, 84, 166, 0.16)',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '98px'
      }}>
        <div style={{ flex: 1, zIndex: 1, textAlign: 'left', paddingBottom: '0.85rem' }}>
          <span style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--lime)', display: 'block', marginBottom: '0.15rem' }}>
            Nossa Mobilização
          </span>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 900, margin: '0 0 0.25rem 0', lineHeight: '1.2' }}>
            Time SV
          </h3>
          <p style={{ fontSize: '0.72rem', opacity: 0.88, margin: 0, lineHeight: '1.3' }}>
            Multiplique o nosso trabalho nas redes e nas ruas de forma oficial e segura.
          </p>
        </div>
        <img 
          src={getMediaUrl('/uploads/foto5_nobg.png')} 
          alt="Senador Styvenson Valentim" 
          style={{
            height: '102px',
            width: 'auto',
            objectFit: 'cover',
            objectPosition: 'top center',
            alignSelf: 'flex-end',
            marginBottom: '0',
            marginRight: '-4px',
            flexShrink: 0,
            zIndex: 1,
            filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.3))'
          }} 
        />
      </div>

      {/* Saudação */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--texto)' }}>
            Olá, {user?.nome?.split(' ')[0]}!
          </h2>
        </div>
      </div>

      {/* Minha Evolução — meta gamificada */}
      {stats && (
        <div className="card" style={{ padding: 'clamp(1rem, 3vw, 1.5rem)', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid var(--borda)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--texto-medio)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={16} />
              <span>Minha Evolução</span>
            </h3>
            {/* Selo de nível */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              backgroundColor: `${nivel.cor}14`, color: nivel.cor,
              border: `1.5px solid ${nivel.cor}33`,
              padding: '0.3rem 0.7rem', borderRadius: '999px',
              fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px'
            }}>
              <Award size={13} />
              {nivel.nome}
            </span>
          </div>

          {/* Números principais */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--texto)', lineHeight: 1 }}>{total}</span>
            <span style={{ fontSize: '0.82rem', color: 'var(--texto-claro)', fontWeight: 600 }}>
              {meta > 0 ? `de ${meta} apoiadores da sua meta` : 'apoiadores na sua rede'}
            </span>
            {novosHoje > 0 && (
              <span style={{ marginLeft: 'auto', backgroundColor: 'rgba(5,150,105,0.08)', color: '#059669', fontSize: '0.72rem', fontWeight: 800, padding: '0.25rem 0.6rem', borderRadius: '999px' }}>
                +{novosHoje} hoje
              </span>
            )}
          </div>

          {/* Barra de progresso da meta (animada) */}
          {meta > 0 && (
            <div style={{ marginBottom: '0.6rem' }}>
              <div style={{ height: '12px', backgroundColor: '#eef2f7', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: barAnimada ? `${pctMeta}%` : '0%',
                  background: metaBatida
                    ? 'linear-gradient(90deg, #059669, #34d399)'
                    : 'linear-gradient(90deg, var(--primary-dark, #003b73), var(--primary, #0054A6))',
                  borderRadius: '999px',
                  transition: 'width 1s cubic-bezier(0.22, 1, 0.36, 1)'
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: metaBatida ? '#059669' : 'var(--texto-medio)' }}>
                  {metaBatida ? '🎉 Meta batida! Parabéns!' : `${pctMeta}% da meta`}
                </span>
              </div>
            </div>
          )}

          {/* Progresso para o próximo nível */}
          <div style={{ fontSize: '0.78rem', color: 'var(--texto-claro)', lineHeight: 1.45 }}>
            {proximo ? (
              <>Faltam <strong style={{ color: 'var(--texto)' }}>{proximo.min - total}</strong> apoiadores ativos para você virar <strong style={{ color: proximo.cor }}>{proximo.nome}</strong>{proximo.nome === 'Líder de Base' ? ' e desbloquear conteúdos exclusivos' : ''}.</>
            ) : (
              <>Você alcançou o nível máximo da rede. Continue mobilizando! 🚀</>
            )}
          </div>
        </div>
      )}

      {/* Link de Indicação Pessoal (WhatsApp / Copiar) */}
      <div className="card" style={{ padding: 'clamp(1rem, 3vw, 1.5rem)', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid var(--borda)' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--texto-medio)', margin: '0 0 0.75rem' }}>
          Indique simpatizantes
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--texto-claro)', margin: '0 0 1rem', lineHeight: '1.4' }}>
          Compartilhe seu link pessoal. Cada simpatizante cadastrado que for aprovado pela coordenação contará para subir seu nível!
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
              minHeight: '44px'
            }}
          >
            {copied ? <Check size={16} color="#059669" /> : <Copy size={16} />}
            <span>{copied ? 'Copiado!' : 'Copiar Link'}</span>
          </button>
          <button
            onClick={() => handleShareWhatsApp(
              'Olá! Convido você a fazer parte da nossa rede de apoiadores "Time SV"! Cadastre-se através do meu link oficial:',
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
              minHeight: '44px'
            }}
          >
            <Share2 size={16} />
            <span>Compartilhar</span>
          </button>
        </div>

        {/* Card visual com QR — vira imagem pronta para WhatsApp/Instagram */}
        <button
          onClick={() => setCardOpen(true)}
          style={{
            width: '100%',
            marginTop: '0.6rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '0.7rem',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, var(--primary-dark, #003b73), var(--primary, #0054A6))',
            color: '#fff',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 10px rgba(0, 84, 166, 0.18)',
            minHeight: '44px'
          }}
        >
          <QrCode size={16} />
          <span>Gerar meu Card com QR Code</span>
        </button>
      </div>

      {/* Benefícios Exclusivos (Disponível apenas para Líder de Base) */}
      {(userTier === 'Líder de Base' || userTier === 'Coordenador') && (
        <div className="card" style={{ padding: 'clamp(1rem, 3vw, 1.5rem)', border: '1px solid rgba(0,84,166,0.15)', backgroundColor: 'rgba(0,84,166,0.02)', borderRadius: '12px' }}>
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
                minHeight: '44px',
                width: '100%',
                boxSizing: 'border-box'
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
                minHeight: '44px',
                width: '100%',
                boxSizing: 'border-box'
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
      {(isStaff || hasPermission('Apoiadores', 'criar') || hasPermission('Apoiadores', 'visualizar')) && (
        <div className="card" style={{ padding: 'clamp(1rem, 3vw, 1.5rem)', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid var(--borda)' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--texto-medio)', margin: '0 0 0.75rem' }}>
            Minhas Ferramentas
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: 'clamp(0.75rem, 2vw, 1rem)' }}>
            {/* Cadastrar Apoiador */}
            {(isStaff || hasPermission('Apoiadores', 'criar')) && (
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
                  color: 'var(--primary)',
                  minHeight: '44px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 84, 166, 0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 84, 166, 0.03)'}
              >
                <div style={{ padding: '8px', backgroundColor: '#fff', borderRadius: '50%', border: '1px solid rgba(0, 84, 166, 0.1)' }}>
                  <Users size={18} />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--texto)' }}>Cadastrar Apoiador</span>
              </button>
            )}

            {/* Minha Rede */}
            {(isStaff || hasPermission('Apoiadores', 'visualizar')) && (
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
                  color: '#059669',
                  minHeight: '44px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(5, 150, 105, 0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(5, 150, 105, 0.03)'}
              >
                <div style={{ padding: '8px', backgroundColor: '#fff', borderRadius: '50%', border: '1px solid rgba(5, 150, 105, 0.1)' }}>
                  <MapPin size={18} />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--texto)' }}>Ver Minha Rede</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal do Card de Indicação com QR */}
      <ReferralCardModal
        open={cardOpen}
        onClose={() => setCardOpen(false)}
        nome={user?.nome}
        link={referralLink}
      />
    </div>
  );
}
