import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api, { getMediaUrl } from '../api/axios';
import toast from 'react-hot-toast';
import { 
  MessageSquare, ShieldCheck, CheckCircle2, ArrowRight, Loader2,
  Bell, MapPin, Share2, Sparkles, X, Lock, Users, Heart, Instagram, Facebook, Youtube
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

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#0554f2', 
      backgroundImage: `radial-gradient(circle at 10% 20%, #1562ff 0%, #0348d4 90%)`,
      color: '#ffffff', 
      fontFamily: "'Outfit', 'Inter', system-ui, -apple-system, sans-serif",
      position: 'relative',
      overflowX: 'hidden'
    }}>
      
      {/* PADRÃO DE FUNDO GEOMÉTRICO (CHEVRONS/TRIÂNGULOS EM OVERLAY SUAVE) */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 10L45 25L30 40L15 25Z' fill='none' stroke='rgba(255,255,255,0.06)' stroke-width='1.5'/%3E%3C/svg%3E")`,
        opacity: 0.6,
        pointerEvents: 'none'
      }} />

      {/* HERO SECTION EXATA DO MODELO "TIME ZENAIDE" REAPROVEITADO PARA SENADOR STYVESON */}
      <section style={{ 
        maxWidth: '1280px', 
        margin: '0 auto', 
        padding: '2.5rem 1.5rem 6rem',
        position: 'relative',
        zIndex: 2
      }}>
        
        {/* TOPO: PILL + LOGO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
          
          {/* Pill Badge Superior */}
          <div style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(8px)',
            padding: '6px 16px', borderRadius: '30px',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            width: 'fit-content'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
            <span style={{ fontSize: '0.8rem', color: '#ffffff', fontWeight: 600 }}>
              Mobilização e participação
            </span>
          </div>

          {/* Logo Estilizado Styvenson Valim */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              display: 'flex', flexDirection: 'column', lineHeight: 1
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.5px' }}>
                  Styveson
                </span>
                <span style={{ 
                  backgroundColor: '#ffd600', color: '#0348d4', fontSize: '0.7rem', 
                  fontWeight: 900, padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase'
                }}>
                  RN
                </span>
              </div>
              <span style={{ fontSize: '0.78rem', color: '#93c5fd', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', marginTop: '2px' }}>
                SENADOR DO RN
              </span>
            </div>
          </div>

        </div>

        {/* ESTRUTURA PRINCIPAL (TEXTO À ESQUERDA + FOTO À DIREITA) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'center' }}>
          
          {/* COLUNA ESQUERDA: TITULO, SUBTITULO E BOTÃO CTA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '580px' }}>
            
            <h1 style={{ 
              fontSize: 'clamp(2.5rem, 5.5vw, 4rem)', 
              fontWeight: 900, 
              lineHeight: 1.08, 
              color: '#ffffff', 
              margin: 0, 
              letterSpacing: '-1.5px' 
            }}>
              Entre para o <br />
              <span style={{ color: '#ffd600' }}>Time</span> Styveson
            </h1>

            <p style={{ fontSize: '1.15rem', color: '#e0f2fe', lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
              Cadastre-se para entrar no grupo de <span style={{ color: '#ffd600', fontWeight: 800 }}>WhatsApp</span> da sua cidade e receber novidades em primeira mão.
            </p>

            {/* BOTÃO CTA PRINCIPAL NO ESTILO PILL COM ÍCONE DE SETA */}
            <div>
              <button
                onClick={() => setShowModal(true)}
                style={{
                  backgroundColor: '#ffd600',
                  color: '#0348d4',
                  border: 'none',
                  borderRadius: '50px',
                  padding: '12px 14px 12px 24px',
                  fontSize: '1.05rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '14px',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.25)',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 16px 36px rgba(0, 0, 0, 0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.25)';
                }}
              >
                <MessageSquare size={22} fill="#0348d4" color="#ffd600" />
                <span>Quero participar</span>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  backgroundColor: '#0348d4',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <ArrowRight size={20} color="#ffffff" strokeWidth={3} />
                </div>
              </button>
            </div>

          </div>

          {/* COLUNA DIREITA: FOTO DO SENADOR EM DESTAQUE NA DIREITA */}
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>
            
            {/* Padrão de Pontos Matriz no Canto Superior */}
            <div style={{
              position: 'absolute', top: '-10px', right: '10px',
              display: 'grid', gridTemplateColumns: 'repeat(5, 6px)', gap: '8px', opacity: 0.3
            }}>
              {[...Array(25)].map((_, i) => (
                <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ffffff' }} />
              ))}
            </div>

            {/* Foto do Senador Styveson Valim sem fundo */}
            <img 
              src={getMediaUrl('/uploads/foto5_nobg.png')} 
              alt="Senador Styveson Valim"
              style={{
                maxHeight: '480px',
                width: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 20px 35px rgba(0,0,0,0.35))',
                position: 'relative',
                zIndex: 2
              }}
              onError={(e) => {
                e.currentTarget.src = getMediaUrl('/uploads/foto4_nobg.png');
              }}
            />
          </div>

        </div>

        {/* 3 CARDS BRANCOS LADO A LADO NA BASE DO HERO */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '1.25rem',
          marginTop: '3.5rem'
        }}>
          
          {/* Card 1 */}
          <div style={{
            backgroundColor: '#ffffff',
            color: '#0f172a',
            borderRadius: '20px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
          }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '50%',
              backgroundColor: '#0348d4',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <Bell size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: '0 0 2px 0' }}>
                Receba novidades em primeira mão
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, lineHeight: 1.3 }}>
                Fique por dentro das ações e iniciativas.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div style={{
            backgroundColor: '#ffffff',
            color: '#0f172a',
            borderRadius: '20px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
          }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '50%',
              backgroundColor: '#0348d4',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <Users size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: '0 0 2px 0' }}>
                Entre no grupo da sua cidade
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, lineHeight: 1.3 }}>
                Participe do WhatsApp da sua região.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div style={{
            backgroundColor: '#ffffff',
            color: '#0f172a',
            borderRadius: '20px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
          }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '50%',
              backgroundColor: '#0348d4',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <Share2 size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: '0 0 2px 0' }}>
                Ajude a compartilhar conteúdos
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, lineHeight: 1.3 }}>
                Sua voz fortalece o nosso trabalho.
              </p>
            </div>
          </div>

        </div>

        {/* SEGUNDO BANNER COLORIDO: REDES SOCIAIS E IMPACTO */}
        <div style={{
          marginTop: '2.5rem',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, #ff007a 0%, #ff5200 50%, #ffd600 100%)',
          padding: '2.5rem 2rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '2rem',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          
          <div style={{ maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative', zIndex: 2 }}>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 900, color: '#ffffff', margin: 0, lineHeight: 1.15 }}>
              Siga Styveson nas redes sociais
            </h2>
            <p style={{ fontSize: '1rem', color: '#ffffff', opacity: 0.95, margin: 0, lineHeight: 1.4 }}>
              Acompanhe de perto o trabalho do Senador que mais destina recursos para todo o Rio Grande do Norte.
            </p>

            <div style={{ display: 'flex', gap: '12px', marginTop: '0.5rem' }}>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '10px 18px', borderRadius: '30px', color: '#fff', textDecoration: 'none', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Instagram size={18} /> Instagram
              </a>
              <a href="https://facebook.com" target="_blank" rel="noreferrer" style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '10px 18px', borderRadius: '30px', color: '#fff', textDecoration: 'none', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Facebook size={18} /> Facebook
              </a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '10px 18px', borderRadius: '30px', color: '#fff', textDecoration: 'none', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Youtube size={18} /> YouTube
              </a>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>
            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', color: '#0f172a', padding: '1.25rem 1.75rem', borderRadius: '20px', boxShadow: '0 10px 20px rgba(0,0,0,0.15)' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0348d4', lineHeight: 1 }}>
                R$ 600 MILHÕES
              </div>
              <div style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 700, marginTop: '4px' }}>
                Em recursos destinados ao RN
              </div>
            </div>

            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', color: '#0f172a', padding: '1.25rem 1.75rem', borderRadius: '20px', boxShadow: '0 10px 20px rgba(0,0,0,0.15)' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0348d4', lineHeight: 1 }}>
                167 MUNICÍPIOS
              </div>
              <div style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 700, marginTop: '4px' }}>
                Contemplados com emendas
              </div>
            </div>
          </div>

        </div>

      </section>

      {/* RODAPÉ SIMPLES */}
      <footer style={{ backgroundColor: '#023db5', color: '#e0f2fe', padding: '2rem 1.5rem', textAlign: 'center', fontSize: '0.8rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <div>
            © 2026 Mandato Senador Styveson Valim · Todos os direitos reservados
          </div>
          <div style={{ opacity: 0.8, fontSize: '0.72rem' }}>
            Privacidade & Tratamento de Dados sob a LGPD (Lei nº 13.709/2018)
          </div>
        </div>
      </footer>

      {/* MODAL / CAPTURA DE LEAD (ABRE AO CLICAR EM "QUERO PARTICIPAR") */}
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
            
            {/* Botão Fechar Modal */}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MessageSquare size={20} color="#16a34a" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                      Entre para o Time Styvenson
                    </h2>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Cadastre-se para entrar no grupo de WhatsApp</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                  
                  {/* Nome Completo */}
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

                  {/* WhatsApp */}
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

                  {/* Cidade */}
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

                  {/* Bairro */}
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

                  {/* Senha Opcional */}
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

                  {/* LGPD Checkbox */}
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

                  {/* Botão Cadastrar */}
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
                      color: '#0348d4',
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
                        QUERO ENTRAR NO GRUPO
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>

                </form>
              </>
            ) : (
              /* CARD DE CONFIRMAÇÃO E LINK DO WHATSAPP */
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
