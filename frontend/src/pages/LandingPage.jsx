import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api, { getMediaUrl } from '../api/axios';
import toast from 'react-hot-toast';
import { 
  MessageSquare, ShieldCheck, CheckCircle2, ArrowRight, Loader2,
  Bell, MapPin, Share2, Sparkles, Building2, Award, ChevronRight, Lock
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

  // Carrega lista de cidades do RN via IBGE
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

  const lgpdBorder = consentimento ? 'rgba(5, 150, 105, 0.4)' : errors.consentimento_lgpd ? '#dc2626' : 'var(--borda)';
  const lgpdBg = consentimento ? 'rgba(5, 150, 105, 0.04)' : errors.consentimento_lgpd ? 'rgba(220, 38, 38, 0.03)' : '#f8fafc';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#001a38', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* HEADER BAR */}
      <header style={{ 
        backgroundColor: 'rgba(0, 40, 85, 0.95)', 
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '0.75rem 1.25rem'
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo SV estilizado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              width: '42px', height: '42px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #0054A6 0%, #002855 100%)',
              border: '2px solid #3b82f6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: '1.2rem', color: '#fff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}>
              SV
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: '1rem', display: 'block', letterSpacing: '-0.3px', color: '#fff' }}>
                Tô com Styvenson
              </span>
              <span style={{ fontSize: '0.68rem', color: '#60a5fa', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Mandato Senador Styveson Valim
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '0.72rem',
              backgroundColor: 'rgba(5, 150, 105, 0.2)',
              color: '#34d399',
              border: '1px solid rgba(52, 211, 153, 0.3)',
              padding: '4px 10px',
              borderRadius: '20px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#34d399', display: 'inline-block' }} />
              Grupo Oficial WhatsApp
            </span>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section style={{
        position: 'relative',
        background: 'linear-gradient(180deg, #002855 0%, #001f42 60%, #001229 100%)',
        overflow: 'hidden',
        padding: '2.5rem 1.25rem 4rem'
      }}>
        {/* Elementos decorativos no fundo */}
        <div style={{
          position: 'absolute', top: '-10%', right: '-5%', width: '400px', height: '400px',
          background: 'radial-gradient(circle, rgba(0, 84, 166, 0.4) 0%, rgba(0,0,0,0) 70%)',
          borderRadius: '50%', pointerEvents: 'none'
        }} />

        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem', alignItems: 'center' }}>
          
          {/* LADO ESQUERDO: Texto e Foto */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Frase de Posicionamento */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255, 255, 255, 0.08)', padding: '6px 14px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.15)', width: 'fit-content' }}>
              <Sparkles size={14} color="#f59e0b" />
              <span style={{ fontSize: '0.78rem', color: '#f3f4f6', fontWeight: 600 }}>
                Mandato Transparente e Participativo
              </span>
            </div>

            {/* Título Principal H1 */}
            <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.7rem)', fontWeight: 900, lineHeight: 1.15, color: '#ffffff', margin: 0, letterSpacing: '-0.5px' }}>
              Entre para o <span style={{ background: 'linear-gradient(90deg, #60a5fa, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Time Styvenson</span>
            </h1>

            {/* Subtítulo */}
            <p style={{ fontSize: '1rem', color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
              Cadastre-se para entrar no <strong>grupo exclusivo de WhatsApp da sua cidade</strong> e receber prestação de contas, novidades e projetos em primeira mão.
            </p>

            {/* Imagem do Senador (Hero Image) */}
            <div style={{ position: 'relative', marginTop: '0.5rem' }}>
              <div style={{
                position: 'relative',
                borderRadius: '24px',
                overflow: 'hidden',
                background: 'linear-gradient(180deg, rgba(0, 84, 166, 0.3) 0%, rgba(0, 26, 56, 0.8) 100%)',
                border: '1px solid rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                paddingTop: '1rem'
              }}>
                <img 
                  src={getMediaUrl('/uploads/foto5_nobg.png')} 
                  alt="Senador Styveson Valim"
                  style={{
                    maxHeight: '340px',
                    width: 'auto',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))'
                  }}
                  onError={(e) => {
                    e.currentTarget.src = getMediaUrl('/uploads/foto4_nobg.png');
                  }}
                />

                {/* Selo no canto da foto */}
                <div style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  right: '12px',
                  backgroundColor: 'rgba(0, 40, 85, 0.85)',
                  backdropFilter: 'blur(8px)',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <ShieldCheck size={18} color="#34d399" />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f8fafc' }}>
                    Senador Styveson Valim · Trabalho de verdade pelo RN
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* LADO DIREITO: CARD DE CAPTURA DE LEAD (FORMULÁRIO OU SUCESSO) */}
          <div>
            {!submitted ? (
              <div style={{
                backgroundColor: '#ffffff',
                color: 'var(--texto)',
                borderRadius: '24px',
                padding: '2rem 1.5rem',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
                border: '2px solid rgba(255, 255, 255, 0.2)'
              }}>
                <div style={{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.72rem', fontWeight: 800, color: '#0054A6', marginBottom: '4px' }}>
                  ⚡ Cadastro Rápido & Gratuito
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.5rem 0', lineHeight: 1.25 }}>
                  Faça parte do grupo da sua cidade
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 1.25rem 0', lineHeight: 1.4 }}>
                  Preencha seus dados para entrar no WhatsApp oficial e ter acesso ao aplicativo:
                </p>

                <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {/* Nome Completo */}
                  <div>
                    <label htmlFor="lp-nome" className="form-label" style={{ fontWeight: 700, color: '#334155' }}>Nome completo *</label>
                    <input
                      id="lp-nome"
                      type="text"
                      autoCapitalize="words"
                      placeholder="Digite seu nome"
                      className={`form-input ${errors.nome ? 'border-red-500' : ''}`}
                      style={{ backgroundColor: '#f8fafc', color: '#0f172a', border: '1.5px solid #cbd5e1' }}
                      {...register('nome', { required: 'Nome é obrigatório.', minLength: { value: 3, message: 'Digite seu nome completo.' } })}
                    />
                    {errors.nome && <p className="form-error">{errors.nome.message}</p>}
                  </div>

                  {/* WhatsApp */}
                  <div>
                    <label htmlFor="lp-telefone" className="form-label" style={{ fontWeight: 700, color: '#334155' }}>WhatsApp (DDD + Celular) *</label>
                    <input
                      id="lp-telefone"
                      type="tel"
                      placeholder="(84) 9 9999-9999"
                      maxLength={15}
                      className={`form-input ${errors.telefone ? 'border-red-500' : ''}`}
                      style={{ backgroundColor: '#f8fafc', color: '#0f172a', border: '1.5px solid #cbd5e1' }}
                      value={telefoneValue || ''}
                      onChange={(e) => setValue('telefone', formatPhone(e.target.value), { shouldDirty: true })}
                      {...register('telefone', { 
                        required: 'WhatsApp é obrigatório.',
                        minLength: { value: 14, message: 'Digite o WhatsApp com DDD.' }
                      })}
                    />
                    {errors.telefone && <p className="form-error">{errors.telefone.message}</p>}
                  </div>

                  {/* Cidade */}
                  <div>
                    <label htmlFor="lp-cidade" className="form-label" style={{ fontWeight: 700, color: '#334155' }}>Sua Cidade *</label>
                    <select
                      id="lp-cidade"
                      className={`form-input ${errors.cidade ? 'border-red-500' : ''}`}
                      style={{ backgroundColor: '#fff', color: '#0f172a', border: '1.5px solid #cbd5e1' }}
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
                    <label htmlFor="lp-bairro" className="form-label" style={{ fontWeight: 700, color: '#334155' }}>Bairro (opcional)</label>
                    <input
                      id="lp-bairro"
                      type="text"
                      autoCapitalize="words"
                      placeholder="Ex: Centro"
                      className="form-input"
                      style={{ backgroundColor: '#f8fafc', color: '#0f172a', border: '1.5px solid #cbd5e1' }}
                      {...register('bairro')}
                    />
                  </div>

                  {/* Senha Opcional para Acesso ao App */}
                  <div>
                    <label htmlFor="lp-senha" className="form-label" style={{ fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Lock size={12} color="#0054A6" /> Criar Senha para Acesso ao App (opcional)
                    </label>
                    <input
                      id="lp-senha"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      className="form-input"
                      style={{ backgroundColor: '#f8fafc', color: '#0f172a', border: '1.5px solid #cbd5e1' }}
                      {...register('senha')}
                    />
                    <small style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                      Crie uma senha caso queira entrar no aplicativo Tô com Styvenson.
                    </small>
                  </div>

                  {/* LGPD Consent */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: '4px' }}>
                    <input
                      id="lp-lgpd"
                      type="checkbox"
                      style={{ marginTop: '2px', width: '16px', height: '16px', accentColor: '#059669', cursor: 'pointer' }}
                      {...register('consentimento_lgpd', { required: true })}
                    />
                    <label htmlFor="lp-lgpd" style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.4, cursor: 'pointer' }}>
                      Concordo em receber informações oficiais do mandato via WhatsApp e autorizo o tratamento de dados conforme a LGPD.
                    </label>
                  </div>

                  {/* BOTÃO CTA PRINCIPAL */}
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      marginTop: '0.5rem',
                      width: '100%',
                      padding: '1rem 1.25rem',
                      borderRadius: '14px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      color: '#ffffff',
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 8px 20px rgba(5, 150, 105, 0.4)',
                      transition: 'transform 0.15s, box-shadow 0.15s'
                    }}
                  >
                    {submitting ? (
                      <><Loader2 size={20} className="animate-spin" /> Cadastrando...</>
                    ) : (
                      <>
                        <MessageSquare size={20} />
                        Quero Participar do Time
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              /* ESTADO DE SUCESSO - APÓS CADASTRO */
              <div style={{
                backgroundColor: '#ffffff',
                color: 'var(--texto)',
                borderRadius: '24px',
                padding: '2.5rem 1.5rem',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  backgroundColor: 'rgba(5, 150, 105, 0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <CheckCircle2 size={38} color="#059669" />
                </div>

                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  Cadastro Realizado com Sucesso!
                </h2>

                <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                  Bem-vindo(a) ao Time Styvenson, <strong>{registeredData?.nome}</strong>! Você já está registrado na base oficial de {registeredData?.cidade}.
                </p>

                <div style={{ width: '100%', borderTop: '1px solid #e2e8f0', margin: '0.5rem 0' }} />

                <p style={{ fontSize: '0.82rem', color: '#0054A6', fontWeight: 700, margin: 0 }}>
                  Clique no botão abaixo para entrar direto no grupo de WhatsApp:
                </p>

                {/* Botão Entrar no WhatsApp */}
                <a
                  href={`https://api.whatsapp.com/send?phone=5584999999999&text=Ol%C3%A1!%20Acabei%20de%20me%20cadastrar%20no%20Time%20Styvenson%20em%20${encodeURIComponent(registeredData?.cidade || 'RN')}.%20Quero%20entrar%20no%20grupo!`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    width: '100%',
                    padding: '1rem',
                    borderRadius: '14px',
                    backgroundColor: '#25D366',
                    color: '#ffffff',
                    fontSize: '1rem',
                    fontWeight: 800,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 8px 20px rgba(37, 211, 102, 0.4)'
                  }}
                >
                  <MessageSquare size={20} />
                  Entrar no Grupo do WhatsApp
                  <ChevronRight size={18} />
                </a>

                {/* Botão Acessar o App */}
                <button
                  onClick={() => window.location.href = '/login'}
                  className="btn-secondary"
                  style={{ width: '100%', padding: '0.75rem', fontSize: '0.85rem' }}
                >
                  Entrar no Aplicativo Tô com Styvenson
                </button>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* SEÇÃO 3 BLOCOS DE BENEFÍCIOS */}
      <section style={{ backgroundColor: '#ffffff', color: '#0f172a', padding: '4rem 1.25rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          
          <div style={{ textAlign: 'center', maxWidth: '650px', margin: '0 auto' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0054A6', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Por que fazer parte?
            </span>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', marginTop: '6px', margin: 0 }}>
              Participe ativamente do nosso mandato
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '8px' }}>
              Sua participação fortalece as ações em prol do Rio Grande do Norte.
            </p>
          </div>

          {/* Grid de 3 Blocos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            
            {/* Bloco 1 */}
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: '20px',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              transition: 'transform 0.2s, border-color 0.2s'
            }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '16px',
                backgroundColor: 'rgba(0, 84, 166, 0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Bell size={26} color="#0054A6" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
                  Receba novidades em primeira mão
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                  Fique por dentro de todas as ações, relatórios de prestação de contas e projetos de lei antes de todos.
                </p>
              </div>
            </div>

            {/* Bloco 2 */}
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: '20px',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              transition: 'transform 0.2s, border-color 0.2s'
            }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '16px',
                backgroundColor: 'rgba(5, 150, 105, 0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <MapPin size={26} color="#059669" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
                  Entre no grupo da sua cidade
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                  Conecte-se com a comunidade e a equipe regional do seu município em um canal de WhatsApp direto.
                </p>
              </div>
            </div>

            {/* Bloco 3 */}
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: '20px',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              transition: 'transform 0.2s, border-color 0.2s'
            }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '16px',
                backgroundColor: 'rgba(217, 119, 6, 0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Share2 size={26} color="#d97706" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
                  Ajude a compartilhar conteúdos
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                  Receba artes, vídeos e informativos oficiais para espalhar nas suas redes e multiplicar o trabalho.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SEÇÃO BANNER DE IMPACTO */}
      <section style={{
        background: 'linear-gradient(135deg, #002855 0%, #001229 100%)',
        color: '#ffffff',
        padding: '3.5rem 1.25rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
          
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
            Resultados de Verdade
          </span>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 900, marginTop: '8px', margin: '8px 0 2.5rem 0' }}>
            Transparência e investimento nos 167 municípios
          </h2>

          {/* Cards de Números */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            
            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Building2 size={28} color="#60a5fa" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#38bdf8', letterSpacing: '-0.5px' }}>
                R$ 600 MILHÕES
              </div>
              <div style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, marginTop: '4px' }}>
                Destinados para Saúde, Segurança e Infraestrutura
              </div>
            </div>

            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <MapPin size={28} color="#34d399" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#34d399', letterSpacing: '-0.5px' }}>
                167 MUNICÍPIOS
              </div>
              <div style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, marginTop: '4px' }}>
                Atendidos em todo o Rio Grande do Norte
              </div>
            </div>

            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Award size={28} color="#f59e0b" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#f59e0b', letterSpacing: '-0.5px' }}>
                100% TRANSPARÊNCIA
              </div>
              <div style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, marginTop: '4px' }}>
                Prestação de contas aberta a todo cidadão
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* RODAPÉ SIMPLES */}
      <footer style={{ backgroundColor: '#000d1d', color: '#94a3b8', padding: '2rem 1.25rem', textAlign: 'center', fontSize: '0.78rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div>
            <strong>Mandato Senador Styveson Valim</strong> · Gabinete de Transparência e Participação
          </div>
          <div>
            © 2026 Todos os direitos reservados · Privacidade & Proteção de Dados (LGPD)
          </div>
        </div>
      </footer>

    </div>
  );
}
