import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, CheckCircle2, ClipboardList, ArrowRight } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function PesquisaEngajamento() {
  const { user, completarPesquisa } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
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
    }
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('rs_')) {
      const rsName = name.replace('rs_', '');
      setForm(prev => ({
        ...prev,
        redes_sociais: { ...prev.redes_sociais, [rsName]: value }
      }));
      return;
    }
    setForm(prev => ({ ...prev, [name]: value }));
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

    if (!form.como_se_considera) {
      toast.error('Por favor, selecione como você se considera hoje.');
      return;
    }

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
      const payload = {
        acao_impacto: form.acao_impacto,
        como_se_considera: form.como_se_considera,
        como_ajudar: finalComoAjudar,
        pessoas_mobilizar: form.pessoas_mobilizar,
        grupo_organizacao: form.grupo_organizacao,
        temas_interesse: finalTemas,
        redes_sociais: form.redes_sociais,
      };

      await api.post('/apoiadores/pesquisa', payload);
      
      toast.success('Pesquisa de engajamento concluída! Bem-vindo ao sistema.');
      
      if (completarPesquisa) {
        completarPesquisa();
      }

      const targetPath = ['admin', 'coordenador'].includes(user?.role) ? '/dashboard' : '/painel';
      navigate(targetPath, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao enviar pesquisa de engajamento.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const primeiroNome = user?.nome?.split(' ')[0] || 'Apoiador';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        .survey-page {
          position: absolute;
          inset: 0;
          overflow-y: auto;
          background: url('/page-bg.jpg') no-repeat center center fixed;
          background-size: cover;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 2.5rem 1rem;
          font-family: 'Inter', -apple-system, sans-serif;
          box-sizing: border-box;
        }

        .survey-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 20, 60, 0.25);
          backdrop-filter: blur(4px);
          z-index: 0;
        }

        .survey-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 660px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 3rem 2.5rem;
          box-shadow: 0 25px 60px -10px rgba(0, 0, 0, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.7);
          animation: fadeUp 0.5s ease-out forwards;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .survey-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .survey-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #e0f2fe;
          border: 1px solid #bae6fd;
          color: #0369a1;
          font-size: 0.8rem;
          font-weight: 700;
          padding: 0.4rem 0.9rem;
          border-radius: 20px;
          margin-bottom: 1rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .survey-header h1 {
          font-size: 1.65rem;
          font-weight: 800;
          color: #002855;
          margin: 0 0 0.5rem;
          letter-spacing: -0.3px;
        }

        .survey-header p {
          color: #475569;
          font-size: 0.92rem;
          line-height: 1.5;
          margin: 0;
        }

        .section-title {
          font-size: 1.05rem;
          font-weight: 800;
          color: #0054A6;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 0.6rem;
          margin: 2rem 0 1.25rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-question {
          display: block;
          font-size: 0.9rem;
          font-weight: 700;
          color: #002855;
          margin-bottom: 0.6rem;
          line-height: 1.4;
        }

        .options-grid {
          display: grid;
          gap: 0.6rem;
          background: #f8fafc;
          padding: 0.9rem;
          border-radius: 12px;
          border: 1.5px solid #e2e8f0;
        }

        .option-label {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          color: #334155;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
        }

        .option-input {
          accent-color: #0054A6;
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .submit-btn {
          width: 100%;
          padding: 1.1rem;
          background: #0054A6;
          color: #fff;
          border: none;
          border-radius: 12px;
          font-size: 1.05rem;
          font-weight: 800;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 2rem;
          box-shadow: 0 6px 18px rgba(0, 84, 166, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .submit-btn:hover:not(:disabled) {
          background: #0066CC;
          transform: translateY(-2px);
          box-shadow: 0 10px 26px rgba(0, 84, 166, 0.38);
        }

        .submit-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .spin {
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 600px) {
          .survey-card {
            padding: 2rem 1.25rem;
          }
        }
      `}</style>

      <div className="survey-page">
        <div className="survey-overlay" />
        <div className="survey-card">
          
          <div className="survey-header">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
              <img 
                src="/logo_time_sv.png" 
                alt="Logo Time SV" 
                style={{
                  height: '18px',
                  width: 'auto',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 4px 10px rgba(0, 84, 166, 0.2))'
                }}
                onError={(e) => { e.currentTarget.src = '/logo_sv_2025.png'; }}
              />
            </div>
            <div className="survey-badge">
              <ClipboardList size={16} />
              <span>Onboarding de Primeiro Acesso</span>
            </div>
            <h1>Olá, {primeiroNome}! Bem-vindo ao Time SV</h1>
            <p>
              Para liberar seu acesso completo ao sistema e personalizar sua experiência, responda à nossa pesquisa de engajamento.
            </p>
          </div>

          <form onSubmit={handleSubmit}>

            <h3 className="section-title">Pesquisa de Engajamento</h3>

            <div className="form-group">
              <label className="form-question">1. Qual foi a principal ação de Styvenson que impactou você ou sua cidade?</label>
              <textarea
                name="acao_impacto" rows={3} placeholder="Descreva brevemente..."
                value={form.acao_impacto} onChange={handleChange} disabled={loading}
                className="form-input" style={{ resize: 'vertical' }}
              />
            </div>

            <div className="form-group">
              <label className="form-question">2. Como você se considera hoje? *</label>
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
              <label className="form-question">3. Como você gostaria de ajudar?</label>
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
              <label className="form-question">4. Quantas pessoas você acredita conseguir mobilizar?</label>
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
              <label className="form-question">5. Você participa de algum grupo ou organização?</label>
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
              <label className="form-question">6. Quais temas mais te interessam?</label>
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

            <h3 className="section-title">Redes Sociais (Opcional)</h3>
            
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

            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? (
                <>
                  <Loader2 size={20} className="spin" />
                  <span>Salvando respostas...</span>
                </>
              ) : (
                <>
                  <span>Concluir Onboarding e Entrar</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

        </div>
      </div>
    </>
  );
}
