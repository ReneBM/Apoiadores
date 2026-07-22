import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api, { getMediaUrl } from '../api/axios';
import toast from 'react-hot-toast';
import { 
  MessageSquare, ShieldCheck, CheckCircle2, ArrowRight, Loader2,
  Bell, MapPin, Share2, Sparkles, X, Lock, Users, Building2, Award
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
        backgroundColor: '#001a36', 
        backgroundImage: `radial-gradient(circle at 10% 20%, #002d5e 0%, #001229 90%)`,
        color: '#ffffff', 
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        position: 'relative',
        overflowX: 'hidden'
      }}
    >
      
      {/* HEADER INSTITUCIONAL ELEGANTE */}
      <header style={{ 
        backgroundColor: 'rgba(0, 26, 54, 0.95)', 
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '1rem 1.5rem'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          
          {/* Logo Limpo e Profissional */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '42px', height: '42px', borderRadius: '10px',
              backgroundColor: '#0054A6',
              color: '#ffffff', fontWeight: 900, fontSize: '1.2rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              letterSpacing: '-0.5px'
            }}>
              SV
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: '1rem', color: '#ffffff', display: 'block', letterSpacing: '-0.2px' }}>
                Styvenson Valentim
              </span>
              <span style={{ fontSize: '0.68rem', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Senador do Rio Grande do Norte
              </span>
            </div>
          </div>

          {/* Badge WhatsApp */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.25)', padding: '6px 12px', borderRadius: '20px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
            <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 700 }}>WhatsApp Oficial</span>
          </div>

        </div>
      </header>

      {/* HERO SECTION DESIGN MINIMALISTA & INSTITUCIONAL */}
      <section style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '3.5rem 1.5rem 5rem',
        position: 'relative',
        zIndex: 2
      }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '3rem', alignItems: 'center' }}>
          
          {/* COLUNA ESQUERDA: APRESENTAÇÃO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Pill Tagline */}
            <div style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              padding: '6px 14px', borderRadius: '30px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              width: 'fit-content'
            }}>
              <Sparkles size={14} color="#f59e0b" />
              <span style={{ fontSize: '0.78rem', color: '#fef08a', fontWeight: 700, letterSpacing: '0.5px' }}>
                MOBILIZAÇÃO & PARTICIPAÇÃO POPULAR
              </span>
            </div>

            {/* Título H1 Limpo */}
            <h1 style={{ 
              fontSize: 'clamp(2.4rem, 5vw, 3.8rem)', 
              fontWeight: 900, 
              lineHeight: 1.1, 
              color: '#ffffff', 
              margin: 0, 
              letterSpacing: '-1.2px' 
            }}>
              Entre para o <br />
              <span style={{ color: '#ffd600' }}>Time Styvenson</span>
            </h1>

            <p style={{ fontSize: '1.1rem', color: '#cbd5e1', lineHeight: 1.6, margin: 0, fontWeight: 400 }}>
              Cadastre-se para entrar no grupo oficial de <strong style={{ color: '#ffffff' }}>WhatsApp da sua cidade</strong> e acompanhar a prestação de contas, ações e novidades do mandato em primeira mão.
            </p>

            {/* BOTÃO CTA PRINCIPAL */}
            <div>
              <button
                onClick={() => setShowModal(true)}
                style={{
                  backgroundColor: '#ffd600',
                  color: '#002952',
                  border: 'none',
                  borderRadius: '50px',
                  padding: '14px 28px',
                  fontSize: '1.1rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: '0 10px 30px rgba(255, 214, 0, 0.3)',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 14px 36px rgba(255, 214, 0, 0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(255, 214, 0, 0.3)';
                }}
              >
                <MessageSquare size={22} fill="#002952" color="#ffd600" />
                <span>QUERO PARTICIPAR</span>
                <ArrowRight size={20} strokeWidth={3} />
              </button>
            </div>

          </div>

          {/* COLUNA DIREITA: RETRATO OFICIAL */}
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>
            <div style={{
              position: 'relative',
              borderRadius: '24px',
              overflow: 'hidden',
              background: 'linear-gradient(180deg, rgba(0, 84, 166, 0.2) 0%, rgba(0, 26, 54, 0.9) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              paddingTop: '1rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
            }}>
              <img 
                src={getMediaUrl('/uploads/foto5_nobg.png')} 
                alt="Senador Styveson Valim"
                style={{
                  maxHeight: '460px',
                  width: 'auto',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 15px 30px rgba(0,0,0,0.6))'
                }}
                onError={(e) => {
                  e.currentTarget.src = getMediaUrl('/uploads/foto4_nobg.png');
                }}
              />

              <div style={{
                position: 'absolute',
                bottom: 0, left: 0, right: 0,
                padding: '16px',
                background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,26,54,0.95) 100%)',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff' }}>
                  Senador Styveson Valim
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* 3 CARDS DE BENEFÍCIOS LIMPOS */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '1.25rem',
          marginTop: '4rem'
        }}>
          
          <div style={{
            backgroundColor: '#ffffff',
            color: '#0f172a',
            borderRadius: '16px',
            padding: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '12px',
              backgroundColor: '#0054A6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <Bell size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: '0 0 2px 0' }}>
                Novidades em primeira mão
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                Fique por dentro das ações e iniciativas.
              </p>
            </div>
          </div>

          <div style={{
            backgroundColor: '#ffffff',
            color: '#0f172a',
            borderRadius: '16px',
            padding: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '12px',
              backgroundColor: '#0054A6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <Users size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: '0 0 2px 0' }}>
                Grupo da sua cidade
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                Participe do WhatsApp da sua região.
              </p>
            </div>
          </div>

          <div style={{
            backgroundColor: '#ffffff',
            color: '#0f172a',
            borderRadius: '16px',
            padding: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '12px',
              backgroundColor: '#0054A6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <Share2 size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: '0 0 2px 0' }}>
                Compartilhe conteúdos
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                Sua voz fortalece o nosso trabalho.
              </p>
            </div>
          </div>

        </div>

        {/* SEÇÃO DE ESTATÍSTICAS INSTITUCIONAIS */}
        <div style={{
          marginTop: '3rem',
          borderRadius: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '2.5rem 2rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '2rem',
          textAlign: 'center'
        }}>
          <div>
            <Building2 size={28} color="#60a5fa" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#38bdf8' }}>R$ 600 MILHÕES</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>Destinados em emendas para o RN</div>
          </div>

          <div>
            <MapPin size={28} color="#4ade80" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#4ade80' }}>167 MUNICÍPIOS</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>Atendidos com investimentos</div>
          </div>

          <div>
            <Award size={28} color="#f59e0b" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#f59e0b' }}>100% TRANSPARÊNCIA</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>Prestação de contas aberta</div>
          </div>
        </div>

      </section>

      {/* RODAPÉ INSTITUCIONAL */}
      <footer style={{ backgroundColor: '#001024', color: '#64748b', padding: '2rem 1.5rem', textAlign: 'center', fontSize: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <div style={{ color: '#cbd5e1', fontWeight: 700 }}>
            Gabinete Senador Styveson Valim · Rio Grande do Norte
          </div>
          <div>
            © 2026 Todos os direitos reservados · Privacidade sob a LGPD
          </div>
        </div>
      </footer>

      {/* MODAL DE CADASTRO LIMPO E ELEGANTE */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          backgroundColor: 'rgba(0, 15, 35, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            color: '#0f172a',
            borderRadius: '24px',
            maxWidth: '460px',
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
                <div style={{ marginBottom: '1.25rem' }}>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0' }}>
                    Entre para o Time Styvenson
                  </h2>
                  <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                    Preencha os dados para entrar no grupo oficial do WhatsApp
                  </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  <div>
                    <label htmlFor="modal-nome" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Nome Completo *
                    </label>
                    <input
                      id="modal-nome"
                      type="text"
                      autoCapitalize="words"
                      placeholder="Seu nome"
                      className={`form-input ${errors.nome ? 'border-red-500' : ''}`}
                      style={{ backgroundColor: '#f8fafc', color: '#0f172a', border: '1.5px solid #cbd5e1', borderRadius: '10px', padding: '0.7rem' }}
                      {...register('nome', { required: 'Digite seu nome.', minLength: { value: 3, message: 'Digite seu nome completo.' } })}
                    />
                    {errors.nome && <p className="form-error">{errors.nome.message}</p>}
                  </div>

                  <div>
                    <label htmlFor="modal-telefone" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '4px' }}>
                      WhatsApp (DDD + Celular) *
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
                    <label htmlFor="modal-senha" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 800, color: '#0054A6', marginBottom: '4px' }}>
                      <Lock size={12} /> Senha de Acesso ao App (Opcional)
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
                      Autorizo o recebimento de mensagens oficiais via WhatsApp conforme a LGPD.
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
                      backgroundColor: '#ffd600',
                      color: '#002952',
                      fontSize: '1rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 8px 20px rgba(255, 214, 0, 0.4)'
                    }}
                  >
                    {submitting ? (
                      <><Loader2 size={18} className="animate-spin" /> Cadastrando...</>
                    ) : (
                      <>
                        <MessageSquare size={18} />
                        ENTRAR NO GRUPO
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
