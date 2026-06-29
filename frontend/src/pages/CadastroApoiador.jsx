import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { getMediaUrl } from '../api/axios';
import { Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { validarCPF } from '../utils/cpf';

// --- Formatter helper ---
const formatCPF = (value) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

const formatPhone = (value) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

export default function CadastroApoiador() {
  const [searchParams] = useSearchParams();
  const ref = searchParams.get('ref') || '';

  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    cpf: '',
    cep: '',
    sexo: '',
    cidade: '',
    bairro: '',
    acao_impacto: '',
    como_se_considera: '',
    como_ajudar: [],
    como_ajudar_outro: '',
    pessoas_mobilizar: '',
    grupo_organizacao: [],
    temas_interesse: [],
    temas_interesse_outro: '',
    redes_sociais: {
      instagram: '',
      facebook: '',
      tiktok: '',
      youtube: ''
    },
    consentimento_lgpd: false,
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cidades, setCidades] = useState([]);

  useEffect(() => {
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/RN/municipios')
      .then(res => res.json())
      .then(data => {
        setCidades(data.map(c => c.nome).sort((a, b) => a.localeCompare(b)));
      })
      .catch(err => {
        console.error('Erro ao buscar cidades', err);
        setCidades(['Natal', 'Mossoró', 'Parnamirim', 'São Gonçalo do Amarante', 'Macaíba']);
      });
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'cpf') {
      setForm(prev => ({ ...prev, cpf: formatCPF(value) }));
      return;
    }
    if (name === 'telefone') {
      setForm(prev => ({ ...prev, telefone: formatPhone(value) }));
      return;
    }
    if (name === 'cep') {
      let val = value.replace(/\D/g, '');
      if (val.length > 5) val = val.replace(/^(\d{5})(\d)/, '$1-$2');
      if (val.length > 9) val = val.slice(0, 9);
      setForm(prev => ({ ...prev, cep: val }));
      
      // Auto-busca do CEP se completo (8 digitos numéricos)
      if (val.replace(/\D/g, '').length === 8) {
        buscarCep(val.replace(/\D/g, ''));
      }
      return;
    }

    if (name.startsWith('rs_')) {
      const rsName = name.replace('rs_', '');
      setForm(prev => ({
        ...prev,
        redes_sociais: { ...prev.redes_sociais, [rsName]: value }
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const buscarCep = async (cepNumerico) => {
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepNumerico}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm(prev => ({
          ...prev,
          cidade: data.localidade || prev.cidade,
          bairro: data.bairro || prev.bairro
        }));
        if (data.localidade) {
          toast.success('Endereço preenchido pelo CEP!');
        }
      }
    } catch (err) {
      console.error('Erro ao buscar CEP', err);
    }
  };

  const handleArrayChange = (field, value, checked) => {
    setForm(prev => {
      const array = [...prev[field]];
      if (checked) {
        if (!array.includes(value)) array.push(value);
      } else {
        const index = array.indexOf(value);
        if (index > -1) array.splice(index, 1);
      }
      return { ...prev, [field]: array };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.nome || !form.cpf || !form.cidade || !form.telefone || !form.email) {
      toast.error('Por favor, preencha os campos obrigatórios (Nome, CPF, Celular, Cidade e E-mail).');
      return;
    }

    if (form.cpf.length !== 14 || !validarCPF(form.cpf)) {
      toast.error('O CPF informado é inválido. Verifique os números.');
      return;
    }

    if (!form.consentimento_lgpd) {
      toast.error('É necessário aceitar os termos da LGPD para continuar.');
      return;
    }

    // Preparar dados de múltiplos valores com "Outro"
    const finalComoAjudar = [...form.como_ajudar];
    if (finalComoAjudar.includes('Outro') && form.como_ajudar_outro.trim()) {
      const idx = finalComoAjudar.indexOf('Outro');
      finalComoAjudar[idx] = `Outro: ${form.como_ajudar_outro.trim()}`;
    }

    const finalTemas = [...form.temas_interesse];
    if (finalTemas.includes('Outro') && form.temas_interesse_outro.trim()) {
      const idx = finalTemas.indexOf('Outro');
      finalTemas[idx] = `Outro: ${form.temas_interesse_outro.trim()}`;
    }

    setLoading(true);
    try {
      await api.post('/apoiadores/publico', {
        ...form,
        como_ajudar: finalComoAjudar,
        temas_interesse: finalTemas,
        ref,
      });
      setSuccess(true);
      toast.success('Cadastro enviado!');
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Erro ao enviar cadastro. Tente novamente.';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const pageStyles = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

      .signup-page {
        position: absolute;
        inset: 0;
        overflow-y: auto;
        background: url('/page-bg.jpg') no-repeat center center fixed;
        background-size: cover;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: 2rem 1rem;
        font-family: 'Inter', -apple-system, sans-serif;
        box-sizing: border-box;
      }

      .signup-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 20, 60, 0.15);
        z-index: 0;
      }

      .signup-card {
        position: relative;
        z-index: 1;
        width: 100%;
        max-width: 600px;
        background: rgba(255, 255, 255, 0.92);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-radius: 24px;
        padding: 3rem 2.5rem;
        box-shadow: 0 25px 60px -10px rgba(0, 0, 0, 0.45);
        border: 1px solid rgba(255, 255, 255, 0.6);
        animation: fadeUp 0.6s ease-out forwards;
      }

      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .login-logo {
        width: 68px;
        height: 68px;
        background: #ccf600;
        color: #000;
        border-radius: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.6rem;
        font-weight: 900;
        margin: 0 auto 1.25rem;
        box-shadow: 0 8px 20px rgba(204, 246, 0, 0.25);
        letter-spacing: -1px;
      }

      .login-header h1 {
        font-size: 1.6rem;
        font-weight: 800;
        color: #002855;
        margin: 0 0 0.4rem;
        letter-spacing: -0.3px;
      }

      .login-header p {
        color: #64748b;
        font-size: 0.9rem;
        margin: 0;
      }

      .section-title {
        font-size: 1.05rem;
        font-weight: 800;
        color: #0054A6;
        border-bottom: 2px solid #e2e8f0;
        padding-bottom: 0.6rem;
        margin: 2.5rem 0 1.5rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      /* Classes de form foram removidas daqui para usar o index.css (que já tem o min-height e paddings perfeitos) */

      .form-question {
        display: block;
        font-size: 0.85rem;
        font-weight: 700;
        color: #002855;
        margin-bottom: 0.6rem;
        line-height: 1.4;
      }

      .options-grid {
        display: grid;
        gap: 0.6rem;
        background: #f8fafc;
        padding: 0.8rem;
        border-radius: 10px;
        border: 1.5px solid #e2e8f0;
      }

      .option-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #334155;
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
      }

      .option-input {
        accent-color: #0054A6;
        width: 16px;
        height: 16px;
        cursor: pointer;
      }

      .submit-btn {
        width: 100%;
        padding: 1rem;
        background: #0054A6;
        color: #fff;
        border: none;
        border-radius: 10px;
        font-size: 1rem;
        font-weight: 700;
        font-family: inherit;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-top: 1.5rem;
        box-shadow: 0 6px 16px rgba(0, 84, 166, 0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .submit-btn:hover:not(:disabled) {
        background: #0066CC;
        transform: translateY(-2px);
        box-shadow: 0 10px 24px rgba(0, 84, 166, 0.32);
      }

      .submit-btn:disabled {
        opacity: 0.65;
        cursor: not-allowed;
      }

      .success-box {
        text-align: center;
        padding: 1rem;
      }

      .success-icon {
        color: #059669;
        margin: 0 auto 1.5rem;
        filter: drop-shadow(0 4px 12px rgba(5, 150, 105, 0.2));
      }

      .temp-password-box {
        background: #f8fafc;
        padding: 1.25rem;
        border-radius: 12px;
        border: 1.5px dashed #cbd5e1;
        margin-top: 1.5rem;
      }

      .spin {
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
    `}</style>
  );

  if (success) {
    return (
      <>
        {pageStyles}
        <div className="signup-page">
          <div className="signup-overlay" />
          <div className="signup-card">
            <div className="success-box">
              <CheckCircle2 size={72} className="success-icon" />
              <h2 style={{ color: '#002855', fontSize: '1.6rem', fontWeight: 800, marginBottom: '1rem' }}>Obrigado por se juntar a nós!</h2>
              <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                Seu cadastro foi enviado com sucesso e está pendente de aprovação. Em breve, sua conta será analisada por um coordenador.
              </p>
              <div className="temp-password-box">
                <span style={{ color: '#0054A6', fontWeight: 800, display: 'block', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.5px' }}>Senha Temporária</span>
                <p style={{ color: '#0f172a', fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '1.5px' }}>SV@12345</p>
                <small style={{ color: '#64748b', display: 'block', marginTop: '0.75rem', fontWeight: 500 }}>Use esta senha no seu primeiro acesso após seu cadastro ser aprovado por e-mail.</small>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {pageStyles}
      <div className="signup-page">
        <div className="signup-overlay" />
        <div className="signup-card">
          <div className="login-header" style={{ textAlign: 'center' }}>
            <div style={{
              height: '115px',
              overflow: 'hidden',
              margin: '-50px auto 0.5rem',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start'
            }}>
              <img 
                src={getMediaUrl('/uploads/foto5_nobg.png')} 
                alt="Senador Styvenson Valim" 
                style={{
                  height: '145px',
                  width: 'auto',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 10px 16px rgba(0, 84, 166, 0.3))'
                }}
              />
            </div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--texto)', margin: '0 0 4px 0', textAlign: 'center' }}>Tô com Styvenson</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--texto-claro)', margin: '12px 0 0 0', textAlign: 'center' }}>Faça seu cadastro como apoiador</p>
            {ref && (
              <div style={{ display: 'inline-block', backgroundColor: '#e0f2fe', border: '1px solid #bae6fd', padding: '0.4rem 0.8rem', borderRadius: '20px', marginTop: '0.75rem' }}>
                <span style={{ color: '#0369a1', fontSize: '0.75rem', fontWeight: 700 }}>Você foi indicado por um multiplicador oficial</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} noValidate>
            
            <h3 className="section-title">1. Dados Pessoais</h3>

            <div className="form-group">
              <label className="form-label">Nome Completo *</label>
              <input
                type="text" name="nome" placeholder="Digite seu nome completo"
                value={form.nome} onChange={handleChange} disabled={loading}
                className="form-input" required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">CPF *</label>
                <input
                  type="text" name="cpf" placeholder="000.000.000-00"
                  value={form.cpf} onChange={handleChange} disabled={loading}
                  className="form-input" required maxLength={14}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Sexo</label>
                <select name="sexo" value={form.sexo} onChange={handleChange} disabled={loading} className="form-input">
                  <option value="">Selecione</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Outro">Outro</option>
                  <option value="Prefiro não informar">Prefiro não informar</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Celular / WhatsApp *</label>
                <input
                  type="tel" name="telefone" placeholder="(84) 99999-9999"
                  value={form.telefone} onChange={handleChange} disabled={loading}
                  className="form-input" required maxLength={15}
                />
              </div>
              <div className="form-group">
                <label className="form-label">E-mail *</label>
                <input
                  type="email" name="email" placeholder="seu@email.com"
                  value={form.email} onChange={handleChange} disabled={loading}
                  className="form-input" required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">CEP</label>
                <input
                  type="text" name="cep" placeholder="00000-000"
                  value={form.cep} onChange={handleChange} disabled={loading}
                  className="form-input" maxLength={9}
                />
                <small style={{ color: '#64748b', marginTop: '0.2rem', display: 'block' }}>Digite o CEP para preencher cidade e bairro automaticamente</small>
              </div>
              <div className="form-group">
                <label className="form-label">Cidade *</label>
                <select
                  name="cidade"
                  value={form.cidade} onChange={handleChange} disabled={loading || cidades.length === 0}
                  className="form-input" required
                >
                  <option value="">Selecione sua cidade...</option>
                  {cidades.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Bairro</label>
                <input
                  type="text" name="bairro" placeholder="Ex: Tirol"
                  value={form.bairro} onChange={handleChange} disabled={loading}
                  className="form-input"
                />
              </div>
            </div>

            <h3 className="section-title">2. Pesquisa de Engajamento</h3>

            <div className="form-group">
              <label className="form-question">Qual foi a principal ação de Styvenson que impactou você ou sua cidade?</label>
              <textarea
                name="acao_impacto" rows={3} placeholder="Descreva brevemente..."
                value={form.acao_impacto} onChange={handleChange} disabled={loading}
                className="form-input" style={{ resize: 'vertical' }}
              />
            </div>

            <div className="form-group">
              <label className="form-question">Como você se considera hoje?</label>
              <div className="options-grid">
                {['Simpatizante', 'Apoiador', 'Defensor', 'Multiplicador', 'Voluntário ativo'].map(opt => (
                  <label key={opt} className="option-label">
                    <input type="radio" name="como_se_considera" value={opt} checked={form.como_se_considera === opt} onChange={handleChange} className="option-input" />
                    {opt}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-question">Como você gostaria de ajudar?</label>
              <div className="options-grid">
                {['Compartilhando conteúdos', 'Participando de grupos', 'Mobilização de rua', 'Mobilização digital', 'Conseguindo mais apoiadores', 'Fiscalização eleitoral', 'Doações', 'Outro'].map(opt => (
                  <label key={opt} className="option-label">
                    <input type="checkbox" checked={form.como_ajudar.includes(opt)} onChange={(e) => handleArrayChange('como_ajudar', opt, e.target.checked)} className="option-input" />
                    {opt}
                  </label>
                ))}
                {form.como_ajudar.includes('Outro') && (
                  <input type="text" name="como_ajudar_outro" placeholder="Qual?" value={form.como_ajudar_outro} onChange={handleChange} className="form-input" style={{ marginTop: '0.5rem' }} />
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-question">Quantas pessoas você acredita conseguir mobilizar?</label>
              <div className="options-grid">
                {['Apenas eu', 'Até 10 pessoas', '10 a 50', '50 a 100', 'Mais de 100'].map(opt => (
                  <label key={opt} className="option-label">
                    <input type="radio" name="pessoas_mobilizar" value={opt} checked={form.pessoas_mobilizar === opt} onChange={handleChange} className="option-input" />
                    {opt}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-question">Você participa de algum grupo ou organização?</label>
              <div className="options-grid">
                {['Igreja', 'Associação', 'Sindicato', 'Grupo esportivo', 'Movimento social', 'Nenhum'].map(opt => (
                  <label key={opt} className="option-label">
                    <input type="checkbox" checked={form.grupo_organizacao.includes(opt)} onChange={(e) => handleArrayChange('grupo_organizacao', opt, e.target.checked)} className="option-input" />
                    {opt}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-question">Quais temas mais te interessam?</label>
              <div className="options-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {['Saúde', 'Educação', 'Segurança', 'Infraestrutura', 'Combate à corrupção', 'Esporte', 'Agricultura', 'Assistência social', 'Empreendedorismo', 'Outro'].map(opt => (
                  <label key={opt} className="option-label">
                    <input type="checkbox" checked={form.temas_interesse.includes(opt)} onChange={(e) => handleArrayChange('temas_interesse', opt, e.target.checked)} className="option-input" />
                    {opt}
                  </label>
                ))}
              </div>
              {form.temas_interesse.includes('Outro') && (
                <input type="text" name="temas_interesse_outro" placeholder="Qual?" value={form.temas_interesse_outro} onChange={handleChange} className="form-input" style={{ marginTop: '0.5rem' }} />
              )}
            </div>

            <h3 className="section-title">3. Redes Sociais</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label className="form-label">Instagram</label>
                <input type="text" name="rs_instagram" placeholder="@seu.usuario" value={form.redes_sociais.instagram} onChange={handleChange} className="form-input" />
              </div>
              <div>
                <label className="form-label">Facebook</label>
                <input type="text" name="rs_facebook" placeholder="Perfil ou Página" value={form.redes_sociais.facebook} onChange={handleChange} className="form-input" />
              </div>
              <div>
                <label className="form-label">TikTok</label>
                <input type="text" name="rs_tiktok" placeholder="@seu.usuario" value={form.redes_sociais.tiktok} onChange={handleChange} className="form-input" />
              </div>
              <div>
                <label className="form-label">YouTube</label>
                <input type="text" name="rs_youtube" placeholder="Canal" value={form.redes_sociais.youtube} onChange={handleChange} className="form-input" />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1.5rem', textAlign: 'left', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0' }}>
              <input
                type="checkbox"
                id="consentimento_lgpd"
                name="consentimento_lgpd"
                checked={form.consentimento_lgpd}
                onChange={handleChange}
                disabled={loading}
                style={{ marginTop: '0.25rem', accentColor: '#0054A6', width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="consentimento_lgpd" style={{ color: '#334155', fontSize: '0.85rem', lineHeight: '1.4', cursor: 'pointer', fontWeight: 500 }}>
                Autorizo o tratamento dos meus dados pessoais fornecidos acima para fins de comunicação, campanhas de mobilização e informativos do aplicativo Apoiadores, conforme a Lei Geral de Proteção de Dados (LGPD).
              </label>
            </div>

            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? (
                <>
                  <Loader2 size={18} className="spin" />
                  <span>Enviando cadastro...</span>
                </>
              ) : (
                <span>Cadastrar como Apoiador</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
