import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api, { getMediaUrl } from '../api/axios';
import toast from 'react-hot-toast';
import { 
  MessageSquare, ShieldCheck, CheckCircle2, ArrowRight, Loader2,
  Bell, MapPin, Share2, Sparkles, Building2, Award, Lock, Users, Star, Check
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
  const consentimento = watch('consentimento_lgpd');

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
      backgroundColor: '#00142b', 
      color: '#f8fafc', 
      fontFamily: "'Outfit', 'Inter', system-ui, -apple-system, sans-serif" 
    }}>
      
      {/* BARRA SUPERIOR ELEGANTE */}
      <header style={{ 
        backgroundColor: 'rgba(0, 20, 43, 0.9)', 
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '0.85rem 1.5rem'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          
          {/* Logo Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '44px', height: '44px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #0054A6 0%, #002855 100%)',
              border: '1.5px solid rgba(56, 189, 248, 0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: '1.25rem', color: '#ffffff',
              boxShadow: '0 0 20px rgba(0, 84, 166, 0.5)'
            }}>
              SV
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: '1.05rem', display: 'block', letterSpacing: '-0.3px', color: '#ffffff' }}>
                Tô com Styvenson
              </span>
              <span style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                Senador Styveson Valim · RN
              </span>
            </div>
          </div>

          {/* Badge Live */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '0.75rem',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              border: '1px solid rgba(52, 211, 153, 0.3)',
              padding: '6px 14px',
              borderRadius: '30px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 0 15px rgba(52, 211, 153, 0.15)'
            }}>
              <span style={{ 
                width: '8px', height: '8px', borderRadius: '50%', 
                backgroundColor: '#34d399', display: 'inline-block',
                boxShadow: '0 0 10px #34d399'
              }} />
              WhatsApp Oficial Ativo
            </span>
          </div>
        </div>
      </header>

      {/* HERO SECTION DESIGN IMPRESSIVO */}
      <section style={{
        position: 'relative',
        background: 'radial-gradient(circle at 50% 20%, #003366 0%, #001938 50%, #000f24 100%)',
        overflow: 'hidden',
        padding: '3rem 1.25rem 5rem'
      }}>
        {/* Glow ambient background */}
        <div style={{
          position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(0, 84, 166, 0.25) 0%, rgba(0,0,0,0) 70%)',
          borderRadius: '50%', pointerEvents: 'none'
        }} />

        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '3rem', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          
          {/* COLUNA ESQUERDA: Apresentação & Foto Blended */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Pill Tagline */}
            <div style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.15) 0%, rgba(0, 84, 166, 0.2) 100%)',
              padding: '6px 16px', borderRadius: '30px',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              width: 'fit-content'
            }}>
              <Sparkles size={15} color="#f59e0b" />
              <span style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 700, letterSpacing: '0.5px' }}>
                MANDATO TRANSPARENTE & PARTICIPATIVO
              </span>
            </div>

            {/* Título Impactante H1 */}
            <h1 style={{ 
              fontSize: 'clamp(2.2rem, 5vw, 3.4rem)', 
              fontWeight: 900, 
              lineHeight: 1.1, 
              color: '#ffffff', 
              margin: 0, 
              letterSpacing: '-1px' 
            }}>
              Faça parte do <br />
              <span style={{ 
                background: 'linear-gradient(90deg, #38bdf8 0%, #60a5fa 50%, #f59e0b 100%)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 2px 10px rgba(56, 189, 248, 0.3))'
              }}>
                Time Styvenson
              </span>
            </h1>

            {/* Subtítulo Claro */}
            <p style={{ fontSize: '1.1rem', color: '#cbd5e1', lineHeight: 1.6, margin: 0, fontWeight: 400 }}>
              Entre no <strong>grupo oficial de WhatsApp da sua cidade</strong> para receber informativos, prestação de contas dos R$ 600 milhões investidos no RN e ações exclusivas.
            </p>

            {/* Bullets de destaques rápida conversão */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '0.25rem' }}>
              {[
                'Comunicação direta sem intermediários',
                'Informativos de verbas e ações para o seu município',
                'Acesso livre ao aplicativo Tô com Styvenson'
              ].map((text, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#e2e8f0' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'rgba(52, 211, 153, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={14} color="#34d399" strokeWidth={3} />
                  </div>
                  <span>{text}</span>
                </div>
              ))}
            </div>

            {/* Moldura da Foto do Senador com Gradiente de Integração */}
            <div style={{ 
              position: 'relative', 
              marginTop: '1rem',
              borderRadius: '24px',
              background: 'linear-gradient(180deg, rgba(0, 84, 166, 0.4) 0%, rgba(0, 20, 43, 0.95) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              paddingTop: '1.5rem'
            }}>
              <img 
                src={getMediaUrl('/uploads/foto5_nobg.png')} 
                alt="Senador Styveson Valim"
                style={{
                  maxHeight: '380px',
                  width: 'auto',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 15px 30px rgba(0,0,0,0.7))'
                }}
                onError={(e) => {
                  e.currentTarget.src = getMediaUrl('/uploads/foto4_nobg.png');
                }}
              />
              
              {/* Degradê suave na base da foto */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: '100px',
                background: 'linear-gradient(180deg, rgba(0, 20, 43, 0) 0%, #00142b 100%)'
              }} />

              {/* Tag com nome e cargo na foto */}
              <div style={{
                position: 'absolute',
                bottom: '16px',
                left: '16px',
                right: '16px',
                backgroundColor: 'rgba(0, 26, 56, 0.9)',
                backdropFilter: 'blur(12px)',
                padding: '10px 16px',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 2
              }}>
                <div>
                  <strong style={{ fontSize: '0.9rem', color: '#ffffff', display: 'block' }}>Senador Styveson Valim</strong>
                  <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 600 }}>Senador da República · RN</span>
                </div>
                <div style={{ backgroundColor: 'rgba(52, 211, 153, 0.2)', padding: '6px', borderRadius: '10px' }}>
                  <ShieldCheck size={20} color="#34d399" />
                </div>
              </div>
            </div>

          </div>

          {/* COLUNA DIREITA: FORMULÁRIO DE CAPTURA HIGH-CONVERSION */}
          <div>
            {!submitted ? (
              <div style={{
                backgroundColor: '#ffffff',
                color: '#0f172a',
                borderRadius: '28px',
                padding: '2.25rem 1.75rem',
                boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.2)',
                position: 'relative'
              }}>
                
                {/* Tag de destaque do formulário */}
                <div style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px', 
                  backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0',
                  color: '#15803d', padding: '6px 12px', borderRadius: '20px',
                  fontSize: '0.75rem', fontWeight: 800, width: 'fit-content',
                  marginBottom: '1rem'
                }}>
                  <MessageSquare size={14} color="#16a34a" />
                  CADASTRO PARA O WHATSAPP DA SUA CIDADE
                </div>

                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.5rem 0', lineHeight: 1.25 }}>
                  Cadastre-se e entre no Grupo Oficial
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1.5rem 0', lineHeight: 1.4 }}>
                  Preencha seus dados para receber o link do WhatsApp regional e acessar o app:
                </p>

                <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                  
                  {/* Nome Completo */}
                  <div>
                    <label htmlFor="lp-nome" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                      Seu Nome Completo *
                    </label>
                    <input
                      id="lp-nome"
                      type="text"
                      autoCapitalize="words"
                      placeholder="Ex: Maria da Silva"
                      className={`form-input ${errors.nome ? 'border-red-500' : ''}`}
                      style={{ 
                        backgroundColor: '#f8fafc', color: '#0f172a', border: '1.5px solid #cbd5e1',
                        borderRadius: '12px', padding: '0.75rem 1rem', fontSize: '0.95rem'
                      }}
                      {...register('nome', { required: 'Digite seu nome completo.', minLength: { value: 3, message: 'Digite seu nome completo.' } })}
                    />
                    {errors.nome && <p className="form-error">{errors.nome.message}</p>}
                  </div>

                  {/* WhatsApp */}
                  <div>
                    <label htmlFor="lp-telefone" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                      Celular / WhatsApp (com DDD) *
                    </label>
                    <input
                      id="lp-telefone"
                      type="tel"
                      placeholder="(84) 9 9999-9999"
                      maxLength={15}
                      className={`form-input ${errors.telefone ? 'border-red-500' : ''}`}
                      style={{ 
                        backgroundColor: '#f8fafc', color: '#0f172a', border: '1.5px solid #cbd5e1',
                        borderRadius: '12px', padding: '0.75rem 1rem', fontSize: '0.95rem'
                      }}
                      value={telefoneValue || ''}
                      onChange={(e) => setValue('telefone', formatPhone(e.target.value), { shouldDirty: true })}
                      {...register('telefone', { 
                        required: 'WhatsApp é obrigatório para entrar no grupo.',
                        minLength: { value: 14, message: 'Digite o WhatsApp completo com DDD.' }
                      })}
                    />
                    {errors.telefone && <p className="form-error">{errors.telefone.message}</p>}
                  </div>

                  {/* Cidade */}
                  <div>
                    <label htmlFor="lp-cidade" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                      Sua Cidade no RN *
                    </label>
                    <select
                      id="lp-cidade"
                      className={`form-input ${errors.cidade ? 'border-red-500' : ''}`}
                      style={{ 
                        backgroundColor: '#fff', color: '#0f172a', border: '1.5px solid #cbd5e1',
                        borderRadius: '12px', padding: '0.75rem 1rem', fontSize: '0.95rem'
                      }}
                      {...register('cidade', { required: 'Selecione a sua cidade.' })}
                    >
                      <option value="">Selecione sua cidade...</option>
                      {cidades.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    {errors.cidade && <p className="form-error">{errors.cidade.message}</p>}
                  </div>

                  {/* Bairro */}
                  <div>
                    <label htmlFor="lp-bairro" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                      Bairro (opcional)
                    </label>
                    <input
                      id="lp-bairro"
                      type="text"
                      autoCapitalize="words"
                      placeholder="Ex: Candelária, Centro..."
                      className="form-input"
                      style={{ 
                        backgroundColor: '#f8fafc', color: '#0f172a', border: '1.5px solid #cbd5e1',
                        borderRadius: '12px', padding: '0.75rem 1rem', fontSize: '0.95rem'
                      }}
                      {...register('bairro')}
                    />
                  </div>

                  {/* Senha Opcional para Acesso ao App */}
                  <div style={{ backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    <label htmlFor="lp-senha" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 800, color: '#0054A6', marginBottom: '4px' }}>
                      <Lock size={14} /> Criar Senha de Acesso ao App (Opcional)
                    </label>
                    <input
                      id="lp-senha"
                      type="password"
                      placeholder="Crie uma senha de 6 dígitos"
                      className="form-input"
                      style={{ 
                        backgroundColor: '#fff', color: '#0f172a', border: '1px solid #cbd5e1',
                        borderRadius: '8px', padding: '0.6rem 0.8rem', fontSize: '0.88rem'
                      }}
                      {...register('senha')}
                    />
                    <small style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', marginTop: '4px' }}>
                      Com essa senha você poderá fazer login no app Tô com Styvenson.
                    </small>
                  </div>

                  {/* Checkbox LGPD */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginTop: '4px' }}>
                    <input
                      id="lp-lgpd"
                      type="checkbox"
                      style={{ marginTop: '3px', width: '18px', height: '18px', accentColor: '#059669', cursor: 'pointer' }}
                      {...register('consentimento_lgpd', { required: true })}
                    />
                    <label htmlFor="lp-lgpd" style={{ fontSize: '0.73rem', color: '#64748b', lineHeight: 1.4, cursor: 'pointer' }}>
                      Concordo em receber informações oficiais do mandato via WhatsApp e autorizo o tratamento dos dados pessoais conforme a LGPD.
                    </label>
                  </div>

                  {/* BOTÃO CTA VIBRANTE DE CONVERSÃO */}
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      marginTop: '0.5rem',
                      width: '100%',
                      padding: '1.15rem 1.5rem',
                      borderRadius: '16px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                      color: '#ffffff',
                      fontSize: '1.1rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      boxShadow: '0 10px 25px rgba(5, 150, 105, 0.45)',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    {submitting ? (
                      <><Loader2 size={22} className="animate-spin" /> Cadastrando...</>
                    ) : (
                      <>
                        <MessageSquare size={22} />
                        QUERO PARTICIPAR DO TIME
                        <ArrowRight size={20} />
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              /* CARD DE SUCESSO E REDIRECIONAMENTO AO WHATSAPP */
              <div style={{
                backgroundColor: '#ffffff',
                color: '#0f172a',
                borderRadius: '28px',
                padding: '2.75rem 1.75rem',
                boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.6)',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1.25rem'
              }}>
                <div style={{
                  width: '72px', height: '72px', borderRadius: '50%',
                  backgroundColor: '#dcfce7',
                  border: '2px solid #86efac',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <CheckCircle2 size={44} color="#16a34a" />
                </div>

                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  Cadastro Concluído!
                </h2>

                <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                  Seja muito bem-vindo(a) ao Time Styvenson, <strong>{registeredData?.nome}</strong>! Você já está registrado na nossa base oficial de <strong>{registeredData?.cidade}</strong>.
                </p>

                <div style={{ width: '100%', borderTop: '1.5px solid #e2e8f0', margin: '0.5rem 0' }} />

                <p style={{ fontSize: '0.88rem', color: '#0054A6', fontWeight: 800, margin: 0 }}>
                  Clique no botão verde abaixo para entrar no Grupo Oficial de WhatsApp:
                </p>

                {/* BOTÃO WHATSAPP DIRECT LINK */}
                <a
                  href={`https://api.whatsapp.com/send?phone=5584999999999&text=Ol%C3%A1!%20Fiz%20meu%20cadastro%20no%20Time%20Styvenson%20em%20${encodeURIComponent(registeredData?.cidade || 'RN')}.%20Quero%20entrar%20no%20grupo%20oficial!`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    width: '100%',
                    padding: '1.15rem 1rem',
                    borderRadius: '16px',
                    backgroundColor: '#25D366',
                    color: '#ffffff',
                    fontSize: '1.05rem',
                    fontWeight: 900,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    boxShadow: '0 10px 25px rgba(37, 211, 102, 0.45)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  <MessageSquare size={22} />
                  ENTRAR NO GRUPO DE WHATSAPP
                </a>

                {/* Acessar o App */}
                <button
                  onClick={() => window.location.href = '/login'}
                  className="btn-secondary"
                  style={{ width: '100%', padding: '0.85rem', fontSize: '0.88rem', borderRadius: '12px', marginTop: '0.5rem' }}
                >
                  Fazer Login no App Tô com Styvenson
                </button>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* SEÇÃO DE 3 BLOCOS DE BENEFÍCIOS (LAYOUT MODERNO) */}
      <section style={{ backgroundColor: '#ffffff', color: '#0f172a', padding: '5rem 1.25rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          
          <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0054A6', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
              VANTAGENS EXCLUSIVAS
            </span>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', marginTop: '8px', margin: '8px 0 0 0' }}>
              Por que participar do Time Styvenson?
            </h2>
            <p style={{ fontSize: '0.98rem', color: '#64748b', marginTop: '10px', lineHeight: 1.5 }}>
              Juntos fortalecemos a fiscalização e a transparência em todo o Rio Grande do Norte.
            </p>
          </div>

          {/* Grid dos 3 Blocos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            
            {/* Bloco 1 */}
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: '24px',
              padding: '2.25rem 1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)'
            }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '18px',
                backgroundColor: 'rgba(0, 84, 166, 0.1)',
                border: '1px solid rgba(0, 84, 166, 0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Bell size={28} color="#0054A6" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 8px 0' }}>
                  Receba novidades em primeira mão
                </h3>
                <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                  Acompanhe informativos de projetos de lei, prestação de contas dos investimentos e ações parlamentares antes de todo mundo.
                </p>
              </div>
            </div>

            {/* Bloco 2 */}
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: '24px',
              padding: '2.25rem 1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)'
            }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '18px',
                backgroundColor: 'rgba(5, 150, 105, 0.1)',
                border: '1px solid rgba(5, 150, 105, 0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <MapPin size={28} color="#059669" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 8px 0' }}>
                  Entre no grupo da sua cidade
                </h3>
                <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                  Conecte-se diretamente com apoiadores e a equipe regional do seu município em um canal de comunicação via WhatsApp.
                </p>
              </div>
            </div>

            {/* Bloco 3 */}
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: '24px',
              padding: '2.25rem 1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)'
            }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '18px',
                backgroundColor: 'rgba(217, 119, 6, 0.1)',
                border: '1px solid rgba(217, 119, 6, 0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Share2 size={28} color="#d97706" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 8px 0' }}>
                  Ajude a compartilhar conteúdos
                </h3>
                <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                  Receba artes, vídeos e informativos oficiais para compartilhar com amigos e redes sociais, fortalecendo nossa mensagem.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SEÇÃO BANNER DE IMPACTO & PRESTAÇÃO DE CONTAS */}
      <section style={{
        background: 'linear-gradient(135deg, #001f42 0%, #001026 100%)',
        color: '#ffffff',
        padding: '4.5rem 1.25rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
            TRABALHO COMPROVADO
          </span>
          <h2 style={{ fontSize: 'clamp(1.7rem, 4vw, 2.4rem)', fontWeight: 900, marginTop: '8px', margin: '8px 0 3rem 0' }}>
            Resultados de verdade para o Rio Grande do Norte
          </h2>

          {/* Cards de Números de Impacto */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2rem' }}>
            
            <div style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.04)', 
              padding: '2rem 1.5rem', 
              borderRadius: '20px', 
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)'
            }}>
              <Building2 size={32} color="#38bdf8" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#38bdf8', letterSpacing: '-0.5px' }}>
                R$ 600 MILHÕES
              </div>
              <div style={{ fontSize: '0.88rem', color: '#cbd5e1', fontWeight: 600, marginTop: '6px' }}>
                Destinados para Saúde, Segurança e Infraestrutura
              </div>
            </div>

            <div style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.04)', 
              padding: '2rem 1.5rem', 
              borderRadius: '20px', 
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)'
            }}>
              <MapPin size={32} color="#34d399" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#34d399', letterSpacing: '-0.5px' }}>
                167 MUNICÍPIOS
              </div>
              <div style={{ fontSize: '0.88rem', color: '#cbd5e1', fontWeight: 600, marginTop: '6px' }}>
                Atendidos com emendas e recursos em todo o estado
              </div>
            </div>

            <div style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.04)', 
              padding: '2rem 1.5rem', 
              borderRadius: '20px', 
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)'
            }}>
              <Award size={32} color="#f59e0b" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#f59e0b', letterSpacing: '-0.5px' }}>
                100% TRANSPARÊNCIA
              </div>
              <div style={{ fontSize: '0.88rem', color: '#cbd5e1', fontWeight: 600, marginTop: '6px' }}>
                Prestação de contas aberta a todo cidadão potiguar
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* RODAPÉ E PRIVACIDADE */}
      <footer style={{ backgroundColor: '#000814', color: '#64748b', padding: '2.5rem 1.25rem', textAlign: 'center', fontSize: '0.82rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{ color: '#cbd5e1', fontWeight: 700 }}>
            Mandato Senador Styveson Valim · Gabinete de Transparência & Participação
          </div>
          <div>
            © 2026 Todos os direitos reservados · Privacidade e Tratamento de Dados sob a LGPD
          </div>
        </div>
      </footer>

    </div>
  );
}
