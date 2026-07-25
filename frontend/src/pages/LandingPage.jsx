import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api, { getMediaUrl } from '../api/axios';
import toast from 'react-hot-toast';
import { 
  ArrowRight, X, UserCheck, UserPlus, Smartphone, Users
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
  const [searchParams] = useSearchParams();
  const [cidades, setCidades] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [registeredData, setRegisteredData] = useState(null);
  const [hoverPrimary, setHoverPrimary] = useState(false);
  const [hoverSecondary, setHoverSecondary] = useState(false);

  useEffect(() => {
    if (searchParams.get('cadastro') === 'true' || searchParams.get('modal') === 'true') {
      setShowModal(true);
    }
  }, [searchParams]);

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
        overflowX: 'hidden',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@700;800;900&family=Outfit:wght@800;900&display=swap');
        @import url('https://fonts.cdnfonts.com/css/gilroy-bold');

        @keyframes lpFadeInLeft {
          0%   { opacity: 0; transform: translateX(-55px) scale(0.95); filter: blur(6px); }
          100% { opacity: 1; transform: translateX(0) scale(1); filter: blur(0); }
        }
        @keyframes lpFadeInUp {
          0%   { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes lpFadeInCards {
          0%   { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes lpModalOverlay {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes lpModalContent {
          0%   { opacity: 0; transform: scale(0.88) translateY(40px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }

        /* ── Botão Principal — Amarelo Dourado ── */
        .lp-btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          min-height: 54px;
          padding: 0 38px;
          font-family: 'Oswald', sans-serif;
          font-size: 1rem;
          font-weight: 800;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #001a3d;
          background: linear-gradient(135deg, #FFF066 0%, #F7CE00 55%, #E0B400 100%);
          border: none;
          border-radius: 50px;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 8px 30px rgba(247,206,0,0.5);
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
                      box-shadow 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          overflow: hidden;
        }
        .lp-btn-primary::after {
          content: '';
          position: absolute;
          top: -50%; left: -65%;
          width: 45%; height: 200%;
          background: linear-gradient(to right, transparent, rgba(255,255,255,0.52), transparent);
          transform: rotate(25deg);
          transition: left 0.5s ease;
          pointer-events: none;
        }
        .lp-btn-primary:hover::after { left: 120%; }
        .lp-btn-primary:hover {
          transform: translateY(-4px) scale(1.045);
          box-shadow: 0 16px 38px rgba(247,206,0,0.6);
        }
        .lp-btn-primary .lp-arrow {
          transition: transform 0.25s ease;
        }
        .lp-btn-primary:hover .lp-arrow {
          transform: translateX(6px);
        }

        /* ── Botão Secundário — Glass ── */
        .lp-btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          min-height: 54px;
          padding: 0 34px;
          font-family: 'Oswald', sans-serif;
          font-size: 0.95rem;
          font-weight: 800;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          color: #ffffff;
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1.5px solid rgba(255,255,255,0.28);
          border-radius: 50px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .lp-btn-secondary:hover {
          background: rgba(255,255,255,0.2);
          border-color: rgba(255,255,255,0.65);
          transform: translateY(-4px) scale(1.03);
        }

        /* ── Benefit Cards ── */
        .lp-card {
          background: rgba(255,255,255,0.97);
          border-radius: 20px;
          padding: 1.1rem 1.3rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 14px 36px rgba(0,0,0,0.2);
          transition: transform 0.28s ease, box-shadow 0.28s ease;
        }
        .lp-card:hover {
          transform: translateY(-7px);
          box-shadow: 0 22px 48px rgba(0,0,0,0.28);
        }
      `}</style>

      {/* ════════════════════════════════════════════════════════════
          HERO SECTION — LAYOUT DESKTOP
          
          Estrutura horizontal:
          ┌─────────────────┬────────────────────────────────┐
          │  Foto Senador   │  Logo                          │
          │  (esq. grande)  │  Headline                      │
          │                 │  Subheadline                   │
          │                 │  [Botão Primário] [Secundário] │
          └─────────────────┴────────────────────────────────┘
          ┌─── Card 1 ───┬──── Card 2 ────┬──── Card 3 ────┐  ← cintura
          └──────────────┴────────────────┴────────────────┘
      ════════════════════════════════════════════════════════════ */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '1440px',
        margin: '0 auto',
        height: '100vh',
        minHeight: '700px',
        display: 'grid',
        gridTemplateColumns: '42% 1fr',
      }}>

        {/* ── Coluna Esquerda: Foto do Senador ─────────────────── */}
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-start',
          paddingLeft: '0',
          marginLeft: '-2.8rem',
          overflow: 'visible',
          opacity: 0,
          animation: 'lpFadeInLeft 1.15s cubic-bezier(0.22,1,0.36,1) 0.15s forwards',
        }}>
          <img
            src="/senador/styveson_v3_nobg.png"
            alt="Senador Styveson Valim"
            style={{
              height: '84vh',
              width: 'auto',
              objectFit: 'contain',
              display: 'block',
              flexShrink: 0,
            }}
          />
        </div>

        {/* ── Coluna Direita: Conteúdo ─────────────────────────── */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-end',
          textAlign: 'right',
          paddingRight: '4rem',
          paddingLeft: '2rem',
          paddingBottom: '9rem',
          opacity: 0,
          animation: 'lpFadeInUp 0.9s ease-out 0.45s forwards',
        }}>

          {/* Logo */}
          <img
            src="/logo_time_sv.png"
            alt="Logo Time Styveson Valim"
            onError={e => { e.currentTarget.src = '/logo_sv_2025.png'; }}
            style={{
              height: '48px',
              width: 'auto',
              objectFit: 'contain',
              marginBottom: '1.8rem',
              filter: 'drop-shadow(0 4px 18px rgba(0,0,0,0.38))',
            }}
          />

          {/* Headline principal */}
          <h1 style={{
            fontFamily: "'Gilroy', 'Oswald', 'Outfit', sans-serif",
            fontSize: 'clamp(3.6rem, 6.2vw, 7rem)',
            fontWeight: 900,
            fontStyle: 'normal',
            lineHeight: 0.9,
            textTransform: 'uppercase',
            letterSpacing: '-1.5px',
            color: '#ffffff',
            textShadow: '0 4px 30px rgba(0,0,0,0.5)',
            margin: '0 0 1.1rem 0',
            whiteSpace: 'nowrap',
          }}>
            #VEM PRO<br />NOSSO TIME
          </h1>

          {/* Subheadline / Texto de apoio */}
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '1.05rem',
            fontWeight: 500,
            lineHeight: 1.65,
            color: 'rgba(255,255,255,0.72)',
            margin: '0 0 2.5rem 0',
            maxWidth: '370px',
          }}>
            Faça parte do time que está transformando o Rio Grande do Norte.
            Juntos somos muito mais fortes!
          </p>

          {/* Botões de ação */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            justifyContent: 'flex-end',
            flexWrap: 'nowrap',
          }}>
            <button
              className="lp-btn-primary"
              onClick={() => setShowModal(true)}
              onMouseEnter={() => setHoverPrimary(true)}
              onMouseLeave={() => setHoverPrimary(false)}
            >
              <UserPlus size={18} color="#001a3d" />
              <span>Seja Apoiador</span>
              <ArrowRight size={17} color="#001a3d" strokeWidth={3} className="lp-arrow" />
            </button>

            <button
              className="lp-btn-secondary"
              onClick={() => window.open('/login', '_blank')}
              onMouseEnter={() => setHoverSecondary(true)}
              onMouseLeave={() => setHoverSecondary(false)}
            >
              <UserCheck size={18} color="#ffffff" />
              <span>Já sou Apoiador</span>
            </button>
          </div>
        </div>

        {/* ── Cards — Flutuam na cintura do Senador ────────────── */}
        <div style={{
          position: 'absolute',
          bottom: '2.5rem',
          left: '3%',
          right: '4rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
          zIndex: 20,
          opacity: 0,
          animation: 'lpFadeInCards 0.85s ease-out 1.1s forwards',
        }}>

          {/* Card 1 — Aplicativo Exclusivo */}
          <div className="lp-card">
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              backgroundColor: '#0348d4', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(3,72,212,0.38)',
            }}>
              <Smartphone size={23} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ fontFamily: "'Oswald', sans-serif", fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Aplicativo exclusivo
              </h3>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.74rem', color: '#475569', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
                Receba novidades, materiais e notificações em primeira mão.
              </p>
            </div>
          </div>

          {/* Card 2 — Grupo WhatsApp */}
          <div className="lp-card">
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              backgroundColor: '#25D366', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(37,211,102,0.45)',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path fill="#ffffff" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.461c-1.805 0-3.57-.485-5.114-1.402l-.366-.218-3.799.996 1.014-3.704-.239-.38c-1.008-1.603-1.541-3.468-1.54-5.378 0-5.586 4.545-10.13 10.133-10.13 2.705 0 5.247 1.054 7.159 2.968 1.912 1.913 2.965 4.457 2.964 7.163 0 5.588-4.546 10.133-10.137 10.133m0-22.016c-6.55 0-11.876 5.325-11.878 11.876 0 2.094.546 4.14 1.583 5.937l-1.68 6.136 6.279-1.647c1.733.944 3.69 1.442 5.69 1.444h.005c6.549 0 11.877-5.326 11.879-11.877 0-3.174-1.236-6.158-3.481-8.404-2.245-2.247-5.23-3.483-8.402-3.483"/>
              </svg>
            </div>
            <div>
              <h3 style={{ fontFamily: "'Oswald', sans-serif", fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Grupo no WhatsApp
              </h3>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.74rem', color: '#475569', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
                Entre no canal oficial para quem acredita no RN.
              </p>
            </div>
          </div>

          {/* Card 3 — Monte seu Time */}
          <div className="lp-card">
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              backgroundColor: '#0348d4', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(3,72,212,0.38)',
            }}>
              <Users size={23} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ fontFamily: "'Oswald', sans-serif", fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Monte seu time
              </h3>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.74rem', color: '#475569', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
                Convide amigos, monte seu time e ajude o nosso RN.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* ── Modal de Cadastro ── */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,20,60,0.85)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(8px)',
            animation: 'lpModalOverlay 0.38s ease-out forwards',
            padding: '1rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff', borderRadius: '24px',
              maxWidth: '650px', width: '100%', maxHeight: '95vh', overflowY: 'auto',
              boxShadow: '0 28px 65px -10px rgba(0,0,0,0.48)',
              position: 'relative',
              animation: 'lpModalContent 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            }}
          >
            <CadastroApoiador isModal={true} onClose={() => setShowModal(false)} />
          </div>
        </div>
      )}

    </div>
  );
}
