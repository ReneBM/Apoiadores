import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api, { getMediaUrl } from '../api/axios';
import toast from 'react-hot-toast';
import { 
  MessageSquare, CheckCircle2, ArrowRight, Loader2,
  X, Lock, UserCheck, UserPlus, Smartphone, Bell, Share2
} from 'lucide-react';

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
      {/* IMPORTAÇÃO DE FONTES, MEDIA QUERIES E RESPONSIVIDADE CORRETA */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@700;800;900&family=Outfit:wght@800;900&display=swap');
        
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

        /* ESTILO DOS BOTÕES */
        .btn-glow-pulse {
          min-width: 200px;
          min-height: 52px;
          display: inline-flex;
          font-family: 'Oswald', sans-serif;
          font-size: 1.05rem;
          align-items: center;
          justify-content: center;
          text-transform: uppercase;
          text-align: center;
          letter-spacing: 0.5px;
          font-weight: 800;
          color: #0348d4;
          background: linear-gradient(90deg, #d8ff1a 0%, #ccf600 100%);
          border: none;
          border-radius: 1000px;
          box-shadow: 0 10px 25px rgba(204, 246, 0, 0.45);
          transition: all 0.3s ease-in-out;
          cursor: pointer;
          outline: none;
          position: relative;
          padding: 10px 24px;
          z-index: 1;
          white-space: nowrap;
        }

        .btn-glow-pulse::before {
          content: '';
          border-radius: 1000px;
          min-width: calc(100% + 10px);
          min-height: calc(100% + 10px);
          border: 3px solid #ccf600;
          box-shadow: 0 0 30px rgba(204, 246, 0, 0.7);
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0;
          transition: all .3s ease-in-out;
          pointer-events: none;
        }

        .btn-glow-pulse:hover, 
        .btn-glow-pulse:focus {
          color: #023db5;
          transform: translateY(-4px);
          box-shadow: 0 14px 30px rgba(204, 246, 0, 0.65);
        }

        .btn-glow-pulse:hover::before, 
        .btn-glow-pulse:focus::before {
          opacity: 1;
        }

        .btn-glow-pulse::after {
          content: '';
          width: 20px; 
          height: 20px;
          border-radius: 100%;
          border: 3px solid #ccf600;
          position: absolute;
          z-index: -1;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: ringPulse 1.8s infinite;
          pointer-events: none;
        }

        .btn-glow-pulse:hover::after, 
        .btn-glow-pulse:focus::after {
          animation: none;
          display: none;
        }

        @keyframes ringPulse {
          0% {
            width: 20px;
            height: 20px;
            opacity: 1;
          }
          100% {
            width: 220px;
            height: 80px;
            opacity: 0;
          }
        }

        .btn-glass-secondary {
          min-height: 52px;
          display: inline-flex;
          font-family: 'Oswald', sans-serif;
          font-size: 1.05rem;
          align-items: center;
          justify-content: center;
          text-transform: uppercase;
          text-align: center;
          letter-spacing: 0.5px;
          font-weight: 800;
          color: #ffffff;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(8px);
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-radius: 1000px;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
          transition: all 0.3s ease-in-out;
          cursor: pointer;
          outline: none;
          padding: 10px 24px;
          white-space: nowrap;
        }

        .btn-glass-secondary:hover {
          background: rgba(255, 255, 255, 0.3);
          border-color: #ffffff;
          transform: translateY(-4px);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.25);
        }

        .benefit-card-hover {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .benefit-card-hover:hover {
          transform: translateY(-6px);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.2) !important;
        }

        /* ── MOBILE MEDIA QUERIES (GARANTE LOGO NO TOPO ABSOLUTO DO MOBILE) ── */
        @media (max-width: 991px) {
          .top-header-mobile {
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            width: 100% !important;
            padding: 1rem 0 0.5rem !important;
            text-align: center !important;
          }
          
          .desktop-logo {
            display: none !important;
          }

          .hero-grid {
            display: flex !important;
            flex-direction: column !important;
            gap: 0.5rem !important;
            padding-top: 0 !important;
            align-items: center !important;
          }

          /* 1. Imagem do Senador subida para ficar próxima da logo */
          .left-photo-col {
            order: 1 !important;
            margin-top: -25px !important;
            margin-left: 0 !important;
            justify-content: center !important;
          }
          .left-photo-col img {
            max-height: 400px !important;
          }

          /* 2. Headline subida sobrepondo a base da imagem do Senador (rebaixada ligeiramente) */
          .right-content-col {
            order: 2 !important;
            margin-top: -75px !important;
            align-items: center !important;
            text-align: center !important;
            width: 100% !important;
            position: relative !important;
            z-index: 10 !important;
          }

          .headline-container {
            text-align: center !important;
            align-items: center !important;
          }
          .headline-container h1,
          .headline-container h2 {
            text-align: center !important;
          }

          .buttons-container {
            justify-content: center !important;
            width: 100% !important;
            margin-top: 0.75rem !important;
          }

          .benefit-cards-container {
            margin-top: 2rem !important;
            width: 100% !important;
          }
        }

        @media (min-width: 992px) {
          .top-header-mobile {
            display: none !important;
          }
        }

        @media (max-width: 576px) {
          .btn-glow-pulse, .btn-glass-secondary {
            width: 100% !important;
            min-width: 100% !important;
          }

          .top-header-mobile img {
            height: 50px !important;
          }

          .left-photo-col img {
            max-height: 340px !important;
          }
        }
      `}</style>



      {/* HEADER EXCLUSIVO DO MOBILE (EXIBE A LOGO NO TOPO ABSOLUTO DO CELULAR) */}
      <header className="top-header-mobile" style={{ position: 'relative', zIndex: 10 }}>
        <img 
          src="/logo_sv_2025.svg" 
          alt="Logo SV Styvenson 2025"
          style={{
            height: '65px',
            width: 'auto',
            maxWidth: '90%',
            objectFit: 'contain',
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))'
          }}
          onError={(e) => {
            e.currentTarget.src = '/logo_sv_2025.png';
          }}
        />
      </header>

      {/* SEÇÃO PRINCIPAL DA LANDING PAGE */}
      <section style={{ 
        maxWidth: '1280px', 
        margin: '0 auto', 
        padding: '2rem 1.5rem 1rem', 
        position: 'relative', 
        zIndex: 2
      }}>
        
        {/* GRID HERO RESPONSIVO */}
        <div 
          className="hero-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '2.5rem',
            alignItems: 'start'
          }}
        >
          
          {/* FOTO DO SENADOR (NO MOBILE FICA ABAIXO DO HEADER DE LOGO E ACIMA DA FRASE) */}
          <div 
            className="left-photo-col"
            style={{ 
              position: 'relative', 
              display: 'flex', 
              justify: 'flex-start', 
              alignItems: 'flex-start',
              marginTop: '-75px',
              marginLeft: '-40px',
              animation: 'fadeInLeftNoticeable 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards'
            }}
          >
            <div style={{
              position: 'relative',
              zIndex: 2,
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 72%, rgba(0,0,0,0) 98%)',
              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 72%, rgba(0,0,0,0) 98%)'
            }}>
              <img 
                src="/senador/styveson_capacete_exato_v2.png" 
                alt="Senador Styveson Valim"
                style={{
                  maxWidth: '100%',
                  maxHeight: '740px',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain'
                }}
              />
            </div>
          </div>

          {/* COLUNA DA DIREITA: LOGO (DESKTOP) + HEADLINE + BOTÕES */}
          <div 
            className="right-content-col"
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1.5rem',
              alignItems: 'flex-end',
              width: '100%',
              marginTop: '-50px',
              paddingTop: '0'
            }}
          >
            
            {/* LOGO DESKTOP */}
            <div 
              className="desktop-logo"
              style={{
                marginTop: '32px',
                animation: 'fadeInLeftNoticeable 1s ease-out forwards'
              }}
            >
              <img 
                src="/logo_sv_2025.svg" 
                alt="Logo SV Styvenson 2025"
                style={{
                  height: '75px',
                  width: 'auto',
                  maxWidth: '100%',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))'
                }}
                onError={(e) => {
                  e.currentTarget.src = '/logo_sv_2025.png';
                }}
              />
            </div>

            {/* HEADLINE (NO MOBILE FICA LOGO ABAIXO DA IMAGEM DO SENADOR) */}
            <div 
              className="headline-container"
              style={{
                animation: 'fadeInUpHeadline 1s ease-out 0.2s forwards',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                textAlign: 'right',
                alignItems: 'inherit'
              }}
            >
              
              <h1 style={{
                fontFamily: "'Oswald', 'Outfit', sans-serif",
                fontSize: 'clamp(2.2rem, 5.2vw, 4.2rem)',
                fontWeight: 900,
                lineHeight: 0.95,
                textTransform: 'uppercase',
                letterSpacing: '-0.5px',
                margin: 0,
                color: '#ffffff',
                textShadow: '0 4px 20px rgba(0,0,0,0.3)'
              }}>
                Sua voz pode <br />
                multiplicar mudança.
              </h1>

              <h2 style={{
                fontFamily: "'Oswald', 'Outfit', sans-serif",
                fontSize: 'clamp(1.25rem, 2.8vw, 2.3rem)',
                fontWeight: 700,
                lineHeight: 1.25,
                textTransform: 'uppercase',
                letterSpacing: '0px',
                margin: 0,
                color: '#ccf600',
                textShadow: '0 2px 10px rgba(0,0,0,0.2)'
              }}>
                Seja um <span style={{ color: '#ffd600', fontWeight: 900, fontSize: '1.15em' }}>APOIADOR</span> <br />
                do Capitão.
              </h2>

            </div>

            {/* BOTÕES COM EFEITO CSS PULSANTE (EXATAMENTE LADO A LADO NA MESMA LINHA) */}
            <div 
              className="buttons-container"
              style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'nowrap',
                gap: '1rem',
                justify: 'flex-end',
                alignItems: 'center',
                marginTop: '-15px',
                animation: 'fadeInUpHeadline 1s ease-out 0.4s forwards'
              }}
            >
              
              {/* Botão 1: Já sou Apoiador */}
              <button
                onClick={() => window.location.href = '/login'}
                className="btn-glass-secondary"
              >
                <UserCheck size={20} color="#ffffff" style={{ marginRight: '8px' }} />
                <span>Já sou Apoiador</span>
              </button>

              {/* Botão 2: Seja Apoiador */}
              <button
                onClick={() => setShowModal(true)}
                className="btn-glow-pulse"
              >
                <UserPlus size={20} color="#0348d4" style={{ marginRight: '8px', position: 'relative', zIndex: 2 }} />
                <span style={{ position: 'relative', zIndex: 2 }}>Seja Apoiador</span>
                <ArrowRight size={18} color="#0348d4" strokeWidth={3} style={{ marginLeft: '8px', position: 'relative', zIndex: 2 }} />
              </button>

            </div>

          </div>

        </div>

        {/* 3 CARDS SEGUIDOS DE BENEFÍCIOS */}
        <div 
          className="benefit-cards-container"
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '1.25rem',
            marginTop: '-210px',
            paddingBottom: '3rem',
            position: 'relative',
            zIndex: 10,
            animation: 'fadeInUpHeadline 1s ease-out 0.6s forwards'
          }}
        >
          
          {/* Card 1: Aplicativo Oficial */}
          <div 
            className="benefit-card-hover"
            style={{
              backgroundColor: '#ffffff',
              color: '#0f172a',
              borderRadius: '24px',
              padding: '1.5rem 1.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1.25rem',
              boxShadow: '0 12px 30px rgba(0,0,0,0.12)'
            }}
          >
            <div style={{
              width: '52px', height: '52px', borderRadius: '16px',
              backgroundColor: '#0348d4',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 8px 18px rgba(3, 72, 212, 0.3)'
            }}>
              <Smartphone size={26} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ fontFamily: "'Oswald', sans-serif", fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Aplicativo Exclusivo
              </h3>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.84rem', color: '#475569', margin: 0, lineHeight: 1.4, fontWeight: 500 }}>
                Acesse o app oficial do mandato, acompanhe ações e vote em enquetes.
              </p>
            </div>
          </div>

          {/* Card 2: Receber Notícias em Primeira Mão */}
          <div 
            className="benefit-card-hover"
            style={{
              backgroundColor: '#ffffff',
              color: '#0f172a',
              borderRadius: '24px',
              padding: '1.5rem 1.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1.25rem',
              boxShadow: '0 12px 30px rgba(0,0,0,0.12)'
            }}
          >
            <div style={{
              width: '52px', height: '52px', borderRadius: '16px',
              backgroundColor: '#0348d4',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 8px 18px rgba(3, 72, 212, 0.3)'
            }}>
              <Bell size={26} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ fontFamily: "'Oswald', sans-serif", fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Notícias em Primeira Mão
              </h3>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.84rem', color: '#475569', margin: 0, lineHeight: 1.4, fontWeight: 500 }}>
                Receba novidades oficiais, conquistas e avisos no WhatsApp da sua cidade.
              </p>
            </div>
          </div>

          {/* Card 3: Ajude a Compartilhar Conteúdos */}
          <div 
            className="benefit-card-hover"
            style={{
              backgroundColor: '#ffffff',
              color: '#0f172a',
              borderRadius: '24px',
              padding: '1.5rem 1.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1.25rem',
              boxShadow: '0 12px 30px rgba(0,0,0,0.12)'
            }}
          >
            <div style={{
              width: '52px', height: '52px', borderRadius: '16px',
              backgroundColor: '#0348d4',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 8px 18px rgba(3, 72, 212, 0.3)'
            }}>
              <Share2 size={26} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ fontFamily: "'Oswald', sans-serif", fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Compartilhe Conteúdos
              </h3>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.84rem', color: '#475569', margin: 0, lineHeight: 1.4, fontWeight: 500 }}>
                Sua voz fortalece o mandato. Espalhe os resultados para todo o RN.
              </p>
            </div>
          </div>

        </div>

      </section>

      {/* MODAL / CAPTURA DE LEAD */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          backgroundColor: 'rgba(0, 20, 50, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            color: '#0f172a',
            borderRadius: '28px',
            maxWidth: '480px',
            width: '100%',
            padding: '2rem 1.5rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            
            <button
              type="button"
              onClick={() => { setShowModal(false); setSubmitted(false); }}
              style={{
                position: 'absolute', top: '16px', right: '16px',
                border: 'none', background: '#f1f5f9', borderRadius: '50%',
                width: '32px', height: '32px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <X size={18} color="#64748b" />
            </button>

            {!submitted ? (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0348d4', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Mandato Styvenson Valentim
                  </span>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', margin: '2px 0 2px 0' }}>
                    Seja um Apoiador do Capitão
                  </h2>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                    Cadastre-se para entrar no grupo de WhatsApp da sua cidade
                  </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                  
                  <div>
                    <label htmlFor="modal-nome" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Seu Nome Completo *
                    </label>
                    <input
                      id="modal-nome"
                      type="text"
                      autoCapitalize="words"
                      placeholder="Digite seu nome completo"
                      className={`form-input ${errors.nome ? 'border-red-500' : ''}`}
                      style={{ backgroundColor: '#f8fafc', color: '#0f172a', border: '1.5px solid #cbd5e1', borderRadius: '10px', padding: '0.7rem' }}
                      {...register('nome', { required: 'Digite seu nome.', minLength: { value: 3, message: 'Digite seu nome completo.' } })}
                    />
                    {errors.nome && <p className="form-error">{errors.nome.message}</p>}
                  </div>

                  <div>
                    <label htmlFor="modal-telefone" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '4px' }}>
                      WhatsApp (com DDD) *
                    </label>
                    <input
                      id="modal-telefone"
                      type="tel"
                      placeholder="(84) 9 9999-9999"
                      maxLength={15}
                      className={`form-input ${errors.telefone ? 'border-red-500' : ''}`}
                      style={{ backgroundColor: '#f8fafc', color: '#0f172a', border: '1.5px solid #cbd5e1', borderRadius: '10px', padding: '0.7rem' }}
                      value={telefoneValue || ''}
                      onChange={(e) => setValue('telefone', formatPhone(e.target.value), { shouldDirty: true })}
                      {...register('telefone', { required: 'WhatsApp é obrigatório.', minLength: { value: 14, message: 'Digite o WhatsApp com DDD.' } })}
                    />
                    {errors.telefone && <p className="form-error">{errors.telefone.message}</p>}
                  </div>

                  <div>
                    <label htmlFor="modal-cidade" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Sua Cidade no RN *
                    </label>
                    <select
                      id="modal-cidade"
                      className={`form-input ${errors.cidade ? 'border-red-500' : ''}`}
                      style={{ backgroundColor: '#fff', color: '#0f172a', border: '1.5px solid #cbd5e1', borderRadius: '10px', padding: '0.7rem' }}
                      {...register('cidade', { required: 'Selecione sua cidade.' })}
                    >
                      <option value="">Selecione a cidade no RN...</option>
                      {cidades.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    {errors.cidade && <p className="form-error">{errors.cidade.message}</p>}
                  </div>

                  <div>
                    <label htmlFor="modal-bairro" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Bairro (opcional)
                    </label>
                    <input
                      id="modal-bairro"
                      type="text"
                      autoCapitalize="words"
                      placeholder="Ex: Centro"
                      className="form-input"
                      style={{ backgroundColor: '#f8fafc', color: '#0f172a', border: '1.5px solid #cbd5e1', borderRadius: '10px', padding: '0.7rem' }}
                      {...register('bairro')}
                    />
                  </div>

                  <div>
                    <label htmlFor="modal-senha" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 800, color: '#0348d4', marginBottom: '4px' }}>
                      <Lock size={12} /> Senha para Acesso ao App (Opcional)
                    </label>
                    <input
                      id="modal-senha"
                      type="password"
                      placeholder="Crie uma senha de 6 dígitos"
                      className="form-input"
                      style={{ backgroundColor: '#f8fafc', color: '#0f172a', border: '1.5px solid #cbd5e1', borderRadius: '10px', padding: '0.6rem 0.7rem' }}
                      {...register('senha')}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <input
                      id="modal-lgpd"
                      type="checkbox"
                      style={{ marginTop: '2px', width: '16px', height: '16px', accentColor: '#059669', cursor: 'pointer' }}
                      {...register('consentimento_lgpd', { required: true })}
                    />
                    <label htmlFor="modal-lgpd" style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: 1.3, cursor: 'pointer' }}>
                      Autorizo o recebimento de mensagens e o tratamento de dados conforme a LGPD.
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      marginTop: '0.5rem',
                      width: '100%',
                      padding: '0.9rem',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: '#ccf600',
                      color: '#0348d4',
                      fontSize: '1rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 8px 20px rgba(204, 246, 0, 0.4)'
                    }}
                  >
                    {submitting ? (
                      <><Loader2 size={18} className="animate-spin" /> Cadastrando...</>
                    ) : (
                      <>
                        <MessageSquare size={18} />
                        QUERO ENTRAR NO GRUPO
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>

                </form>
              </>
            ) : (
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={36} color="#16a34a" />
                </div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  Cadastro Concluído!
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#475569', margin: 0 }}>
                  Parabéns <strong>{registeredData?.nome}</strong>! Você foi cadastrado na base oficial de {registeredData?.cidade}.
                </p>

                <a
                  href={`https://api.whatsapp.com/send?phone=5584999999999&text=Ol%C3%A1!%20Acabei%20de%20me%20cadastrar%20no%20Time%20Styvenson%20em%20${encodeURIComponent(registeredData?.cidade || 'RN')}.%20Quero%20entrar%20no%20grupo!`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    width: '100%',
                    padding: '0.9rem',
                    borderRadius: '12px',
                    backgroundColor: '#25D366',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    fontWeight: 900,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginTop: '0.5rem'
                  }}
                >
                  <MessageSquare size={20} />
                  ENTRAR NO GRUPO DO WHATSAPP
                </a>

                <button
                  onClick={() => window.location.href = '/login'}
                  className="btn-secondary"
                  style={{ width: '100%', padding: '0.65rem', fontSize: '0.82rem' }}
                >
                  Fazer Login no Aplicativo
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
