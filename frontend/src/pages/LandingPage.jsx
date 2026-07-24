import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api, { getMediaUrl } from '../api/axios';
import toast from 'react-hot-toast';
import { 
  MessageSquare, CheckCircle2, ArrowRight, Loader2,
  X, Lock, UserCheck, UserPlus, Smartphone, Bell, Share2, Users
} from 'lucide-react';
import CadastroApoiador from './CadastroApoiador';

const formatPhone = (value) => {
  if (!value) return '';
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

export default function LandingPage() {
  const [cidades, setCidades] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [registeredData, setRegisteredData] = useState(null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      nome: '',
      telefone: '',
      cidade: '',
      bairro: '',
      senha: '',
      consentimento_lgpd: true,
    }
  });

  const telefoneValue = watch('telefone');

  useEffect(() => {
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/RN/municipios')
      .then(res => res.json())
      .then(data => {
        const list = data.map(c => c.nome).sort((a, b) => a.localeCompare(b));
        setCidades(list);
      })
      .catch(() => {
        setCidades([
          'Natal', 'Mossoró', 'Parnamirim', 'São Gonçalo do Amarante', 'Macaíba',
          'Caicó', 'Açu', 'Currais Novos', 'Santa Cruz', 'Nova Cruz', 'Apodi'
        ]);
      });
  }, []);

  const onSubmit = async (data) => {
    if (!data.consentimento_lgpd) {
      toast.error('O aceite da LGPD é obrigatório.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        nome: data.nome.trim(),
        telefone: data.telefone,
        cidade: data.cidade,
        bairro: data.bairro ? data.bairro.trim() : null,
        senha: data.senha || null,
        consentimento_lgpd: true,
        como_se_considera: 'Apoiador',
        observacoes: 'Cadastrado via Landing Page WhatsApp (Time Styvenson)'
      };

      const res = await api.post('/apoiadores/publico', payload);
      setRegisteredData({
        nome: data.nome,
        cidade: data.cidade,
        message: res.data?.message || 'Cadastro realizado com sucesso!'
      });
      setSubmitted(true);
      toast.success('Cadastro realizado com sucesso!');
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao realizar cadastro. Tente novamente.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    document.body.classList.add('full-page-mode');
    document.body.style.overflowY = 'auto';
    return () => {
      document.body.classList.remove('full-page-mode');
    };
  }, []);

  return (
    <div 
      className="full-page-lp"
      style={{ 
        minHeight: '100vh', 
        backgroundColor: '#0348d4', 
        backgroundImage: `url('/bg_bandeira_rn.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        color: '#ffffff', 
        fontFamily: "'Oswald', 'Outfit', 'Inter', system-ui, -apple-system, sans-serif",
        position: 'relative',
        overflowX: 'hidden'
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@700;800;900&family=Outfit:wght@800;900&display=swap');
        @import url('https://fonts.cdnfonts.com/css/gilroy-bold');
        
        @keyframes fadeInLeftNoticeable {
          0% {
            opacity: 0;
            transform: translateX(-60px) scale(0.92);
            filter: blur(8px);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
            filter: blur(0px);
          }
        }

        @keyframes fadeInUpHeadline {
          0% {
            opacity: 0;
            transform: translateY(30px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInDownBar {
          0% {
            opacity: 0;
            transform: translateY(-20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes wowModalOverlay {
          from { opacity: 0; backdrop-filter: blur(0px); }
          to { opacity: 1; backdrop-filter: blur(8px); }
        }

        @keyframes wowModalContent {
          0% { 
            opacity: 0; 
            transform: scale(0.8) translateY(60px);
          }
          100% { 
            opacity: 1; 
            transform: scale(1) translateY(0);
          }
        }

        .btn-glow-pulse {
          min-width: 160px;
          min-height: 40px;
          display: inline-flex;
          font-family: 'Oswald', sans-serif;
          font-size: 0.88rem;
          align-items: center;
          justify-content: center;
          text-transform: uppercase;
          text-align: center;
        .btn-hero-primary {
          min-height: 48px;
          display: inline-flex;
          font-family: 'Oswald', 'Inter', sans-serif;
          font-size: 0.96rem;
          align-items: center;
          justify-content: center;
          text-transform: uppercase;
          text-align: center;
          letter-spacing: 0.8px;
          font-weight: 800;
          color: #001a3d;
          background: linear-gradient(135deg, #FFF066 0%, #F7CE00 50%, #E0B400 100%);
          border: 1px solid rgba(255, 255, 255, 0.4);
          border-radius: 50px;
          box-shadow: 0 10px 28px -4px rgba(247, 206, 0, 0.5), 0 4px 12px rgba(0, 0, 0, 0.2);
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          cursor: pointer;
          outline: none;
          position: relative;
          padding: 12px 28px;
          z-index: 1;
          white-space: nowrap;
          overflow: hidden;
        }

        .btn-hero-primary::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -60%;
          width: 50%;
          height: 200%;
          background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.55), transparent);
          transform: rotate(25deg);
          transition: all 0.6s ease;
        }

        .btn-hero-primary:hover::after {
          left: 120%;
        }

        .btn-hero-primary:hover, 
        .btn-hero-primary:focus {
          color: #000f26;
          transform: translateY(-3px) scale(1.03);
          box-shadow: 0 14px 36px -2px rgba(247, 206, 0, 0.75), 0 6px 16px rgba(0, 0, 0, 0.25);
        }

        .btn-hero-secondary {
          min-height: 48px;
          display: inline-flex;
          font-family: 'Oswald', 'Inter', sans-serif;
          font-size: 0.92rem;
          align-items: center;
          justify-content: center;
          text-transform: uppercase;
          text-align: center;
          letter-spacing: 0.8px;
          font-weight: 800;
          color: #ffffff;
          background: rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1.5px solid rgba(255, 255, 255, 0.35);
          border-radius: 50px;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          cursor: pointer;
          outline: none;
          padding: 12px 26px;
          white-space: nowrap;
        }

        .btn-hero-secondary:hover {
          background: rgba(255, 255, 255, 0.25);
          border-color: #ffffff;
          color: #ffffff;
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.25);
        }

        .benefit-card-hover {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .benefit-card-hover:hover {
          transform: translateY(-6px);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.2) !important;
        }

        .mobile-text {
          display: none;
        }

        @media (max-width: 1024px) {
          .top-header-mobile {
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            width: 100% !important;
            padding: 1rem 0 0.5rem !important;
            text-align: center !important;
          }
          
          .desktop-text {
            display: none !important;
          }
          .mobile-text {
            display: inline-block !important;
          }
          
          section {
            height: auto !important;
            min-height: 100vh;
            overflow: visible !important;
          }

          .desktop-header-row {
            order: 3 !important;
            display: flex !important;
            flex-direction: column !important;
            padding: 1rem 0 !important;
            align-items: center !important;
            gap: 1rem !important;
          }
          
          .desktop-logo {
            display: none !important;
          }

          .hero-grid {
            order: 1 !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 0 !important;
            padding-top: 2rem !important;
            align-items: center !important;
          }

          .left-photo-col {
            order: 1 !important;
            margin-top: 0 !important;
            margin-bottom: -20px !important;
            margin-left: 0 !important;
            justify-content: center !important;
            width: 100% !important;
          }
          .left-photo-col > div {
            width: 100%;
            display: flex;
            justify-content: center;
          }
          .left-photo-col img {
            height: 380px !important;
            max-height: 52vh !important;
            width: auto !important;
            max-width: 100% !important;
            object-fit: contain !important;
          }

          .right-content-col {
            order: 2 !important;
            margin-top: auto !important;
            padding-top: 0 !important;
            align-items: center !important;
            text-align: center !important;
            width: 100% !important;
            position: relative !important;
            z-index: 10 !important;
          }

          .right-content-col h1 {
            text-align: center !important;
            font-size: clamp(2.5rem, 8vw, 3rem) !important;
          }

          .buttons-container {
            flex-direction: column !important;
            justify-content: center !important;
            align-items: center !important;
            width: 100% !important;
            margin-top: 0.5rem !important;
            gap: 0.85rem !important;
          }

          .btn-hero-primary, .btn-hero-secondary {
            width: 100% !important;
            max-width: 320px !important;
          }

          .benefit-cards-container {
            order: 4 !important;
            margin-top: 1rem !important;
            width: 100% !important;
            display: flex !important;
            flex-direction: column !important;
          }
        }

        /* ── TABLET E NOTEBOOKS PEQUENOS ── */
        @media (max-width: 1200px) and (min-width: 1025px) {
          .hero-grid {
            grid-template-columns: 48% 1fr !important;
            gap: 1rem !important;
          }
          .right-content-col h1 {
            font-size: clamp(3rem, 5.5vw, 4.5rem) !important;
          }
          .left-photo-col {
            margin-left: -20px !important;
          }
        }

        @media (max-width: 1024px) and (min-width: 768px) {
          .left-photo-col img {
            height: 480px !important;
            max-height: 58vh !important;
          }
          .right-content-col h1 {
            font-size: 3.5rem !important;
          }
        }

        @media (min-width: 1025px) {
          .top-header-mobile {
            display: none !important;
          }
        }

        /* ── TELAS GRANDES (FULL HD & MONITORES 1440p+) ── */
        @media (min-width: 1440px) {
          .right-content-col {
            padding-top: 8.5rem !important;
          }
          .right-content-col h1 {
            font-size: clamp(4.5rem, 6vw, 7.2rem) !important;
          }
          .left-photo-col img {
            height: 86vh !important;
            max-height: 850px !important;
          }
          .btn-hero-primary, .btn-hero-secondary {
            font-size: 1.05rem !important;
            padding: 14px 34px !important;
            min-height: 52px !important;
          }
        }

        @media (min-width: 1920px) {
          .right-content-col {
            padding-top: 11rem !important;
          }
          .right-content-col h1 {
            font-size: 7.8rem !important;
          }
          .left-photo-col img {
            height: 88vh !important;
            max-height: 940px !important;
          }
        }

        @media (max-width: 576px) {
          .btn-hero-primary, .btn-hero-secondary {
            width: 100% !important;
            min-width: 100% !important;
          }

          .top-header-mobile img {
            height: 28px !important;
          }

          .left-photo-col img {
            height: 300px !important;
          }
        }
      `}</style>

      <section style={{ 
        maxWidth: '1536px', 
        margin: '0 auto',
        padding: '0 2rem',
        position: 'relative', 
        zIndex: 2,
        minHeight: '100vh',
        height: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>

        {/* Cabeçalho Topo */}
        <header style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          width: '100%',
          padding: '1.5rem 0 0.8rem 0',
          flexShrink: 0,
          opacity: 0,
          animation: 'fadeInDownBar 0.8s ease-out forwards'
        }}>
          <img 
            src="/logo_time_sv.png" 
            alt="Logo Time SV"
            style={{ height: '42px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}
            onError={(e) => { e.currentTarget.src = '/logo_sv_2025.png'; }}
          />
        </header>

        <div className="hero-grid" style={{
          display: 'grid',
          gridTemplateColumns: '50% 1fr',
          flex: 1,
          alignItems: 'end'
        }}>
          <div className="left-photo-col" style={{ 
            display: 'flex', alignItems: 'flex-end',
            marginLeft: '15px', height: '100%', overflow: 'visible',
            opacity: 0, animation: 'fadeInLeftNoticeable 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.6s forwards'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              overflow: 'visible',
              width: '100%',
              WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 72%, transparent 97%)',
              maskImage: 'linear-gradient(to bottom, black 0%, black 72%, transparent 97%)'
            }}>
              <img 
                src="/senador/styveson_v3_nobg.png" 
                alt="Senador Styveson Valim"
                style={{ height: '85vh', maxHeight: '780px', width: 'auto', maxWidth: '100%', objectFit: 'contain', display: 'block' }}
              />
            </div>
          </div>

          <div className="right-content-col" style={{ 
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
            alignItems: 'center', alignSelf: 'flex-start', paddingTop: 'clamp(5rem, 12vh, 10rem)', paddingBottom: '1rem',
            paddingRight: '1rem', paddingLeft: '1rem',
            opacity: 0, animation: 'fadeInUpHeadline 1s ease-out 0.3s forwards'
          }}>
            <h1 style={{
              fontFamily: "'Gilroy', 'Oswald', sans-serif",
              fontSize: 'clamp(3.2rem, 6vw, 7rem)',
              fontWeight: 800, fontStyle: 'italic',
              lineHeight: 0.92, textTransform: 'uppercase',
              letterSpacing: '-1px', margin: '0 0 1.5rem 0',
              color: '#ffffff',
              textShadow: '0 4px 24px rgba(0,0,0,0.5)',
              textAlign: 'center'
            }}>
              #VEM PRO <br />NOSSO TIME
            </h1>

            {/* Botões posicionados logo abaixo da Headline */}
            <div className="buttons-container" style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', justifyContent: 'center', width: '100%', marginTop: '0.5rem' }}>
              <button onClick={() => window.open('/login', '_blank')} className="btn-hero-secondary">
                <UserCheck size={18} color="#ffffff" style={{ marginRight: '8px' }} />
                <span>Já sou Apoiador</span>
              </button>
              <button onClick={() => setShowModal(true)} className="btn-hero-primary">
                <UserPlus size={18} color="#001a3d" style={{ marginRight: '8px', position: 'relative', zIndex: 2 }} />
                <span style={{ position: 'relative', zIndex: 2, color: '#001a3d' }}>Seja Apoiador</span>
                <ArrowRight size={17} color="#001a3d" strokeWidth={3} style={{ marginLeft: '8px', position: 'relative', zIndex: 2 }} />
              </button>
            </div>
          </div>
        </div>

        <div 
          className="benefit-cards-container"
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '1rem',
            flexShrink: 0,
            marginTop: '-110px',
            paddingBottom: '2.5rem',
            position: 'relative',
            zIndex: 10
          }}
        >
          <div className="benefit-card-hover" style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 12px 30px rgba(0,0,0,0.12)', opacity: 0, animation: 'fadeInUpHeadline 0.8s ease-out 0.9s forwards' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '14px', backgroundColor: '#0348d4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 8px 18px rgba(3, 72, 212, 0.3)' }}>
              <Smartphone size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ fontFamily: "'Oswald', sans-serif", fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 2px 0', textTransform: 'uppercase' }}>Aplicativo exclusivo</h3>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.4, fontWeight: 500 }}>Receba novidades, materiais e notificações em primeira mão.</p>
            </div>
          </div>

          <div className="benefit-card-hover" style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 12px 30px rgba(0,0,0,0.12)', opacity: 0, animation: 'fadeInUpHeadline 0.8s ease-out 1.1s forwards' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '14px', backgroundColor: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 8px 18px rgba(37, 211, 102, 0.4)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill="#ffffff" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.461c-1.805 0-3.57-.485-5.114-1.402l-.366-.218-3.799.996 1.014-3.704-.239-.38c-1.008-1.603-1.541-3.468-1.54-5.378 0-5.586 4.545-10.13 10.133-10.13 2.705 0 5.247 1.054 7.159 2.968 1.912 1.913 2.965 4.457 2.964 7.163 0 5.588-4.546 10.133-10.137 10.133m0-22.016c-6.55 0-11.876 5.325-11.878 11.876 0 2.094.546 4.14 1.583 5.937l-1.68 6.136 6.279-1.647c1.733.944 3.69 1.442 5.69 1.444h.005c6.549 0 11.877-5.326 11.879-11.877 0-3.174-1.236-6.158-3.481-8.404-2.245-2.247-5.23-3.483-8.402-3.483"/></svg>
            </div>
            <div>
              <h3 style={{ fontFamily: "'Oswald', sans-serif", fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 2px 0', textTransform: 'uppercase' }}>Grupo no WhatsApp</h3>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.4, fontWeight: 500 }}>Entre no canal oficial para quem acredita no RN.</p>
            </div>
          </div>

          <div className="benefit-card-hover" style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 12px 30px rgba(0,0,0,0.12)', opacity: 0, animation: 'fadeInUpHeadline 0.8s ease-out 1.3s forwards' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '14px', backgroundColor: '#0348d4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 8px 18px rgba(3, 72, 212, 0.3)' }}>
              <Users size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ fontFamily: "'Oswald', sans-serif", fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 2px 0', textTransform: 'uppercase' }}>Monte seu time</h3>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.4, fontWeight: 500 }}>Convide amigos, monte seu time e ajude o nosso RN.</p>
            </div>
          </div>
        </div>

      </section>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,20,60,0.85)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(8px)',
          animation: 'wowModalOverlay 0.4s ease-out forwards',
          padding: '1rem'
        }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{
            background: '#ffffff', borderRadius: '24px',
            maxWidth: '650px', width: '100%', maxHeight: '95vh', overflowY: 'auto',
            boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.45)',
            position: 'relative',
            animation: 'wowModalContent 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
          }}>
            <CadastroApoiador isModal={true} onClose={() => setShowModal(false)} />
          </div>
        </div>
      )}

    </div>
  );
}
