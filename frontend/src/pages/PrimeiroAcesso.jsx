import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Eye, EyeOff, ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';
import api, { getMediaUrl } from '../api/axios';
import toast from 'react-hot-toast';

export default function PrimeiroAcesso() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    senhaAtual: '',
    novaSenha: '',
    confirmar: '',
  });
  const [show, setShow] = useState({ senhaAtual: false, novaSenha: false, confirmar: false });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setErrors({});
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggleShow = (field) => setShow((prev) => ({ ...prev, [field]: !prev[field] }));

  const validate = () => {
    const errs = {};
    if (!form.senhaAtual) errs.senhaAtual = 'Informe a senha temporária.';
    if (!form.novaSenha) errs.novaSenha = 'Informe a nova senha.';
    else if (form.novaSenha.length < 8) errs.novaSenha = 'Mínimo 8 caracteres.';
    else if (!/[A-Z]/.test(form.novaSenha)) errs.novaSenha = 'Deve conter ao menos uma letra maiúscula.';
    else if (!/[0-9]/.test(form.novaSenha)) errs.novaSenha = 'Deve conter ao menos um número.';
    if (form.novaSenha && form.novaSenha === form.senhaAtual)
      errs.novaSenha = 'A nova senha não pode ser igual à senha temporária.';
    if (!form.confirmar) errs.confirmar = 'Confirme a nova senha.';
    else if (form.confirmar !== form.novaSenha) errs.confirmar = 'As senhas não coincidem.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      await api.patch('/auth/change-password', {
        senhaAtual: form.senhaAtual,
        novaSenha: form.novaSenha,
      });

      toast.success('Senha definida com sucesso! Faça login novamente.');
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao alterar senha.';
      if (msg.toLowerCase().includes('atual')) {
        setErrors({ senhaAtual: 'Senha temporária incorreta.' });
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const primeiroNome = user?.nome?.split(' ')[0] || 'Usuário';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        .primeiro-acesso-page {
          position: absolute;
          inset: 0;
          background: url('/page-bg.jpg') no-repeat center center;
          background-size: cover;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          font-family: 'Inter', -apple-system, sans-serif;
          overflow-y: auto;
          box-sizing: border-box;
        }

        .primeiro-acesso-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 20, 60, 0.15);
        }

        .primeiro-acesso-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 2.5rem 2.25rem;
          box-shadow: 0 25px 60px -10px rgba(0, 0, 0, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.5);
          animation: cardFadeIn 0.7s cubic-bezier(0.23, 1, 0.32, 1) forwards;
          max-height: 90vh;
          overflow-y: auto;
        }

        @keyframes cardFadeIn {
          from { opacity: 0; transform: translateY(28px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .logo-box {
          width: 60px;
          height: 60px;
          background: #ccf600;
          color: #000;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.4rem;
          font-weight: 900;
          margin: 0 auto 1rem;
          box-shadow: 0 8px 20px rgba(204, 246, 0, 0.25);
          letter-spacing: -1px;
        }

        .warning-box {
          background: rgba(217, 119, 6, 0.08);
          border: 1px solid rgba(217, 119, 6, 0.25);
          border-radius: 12px;
          padding: 12px 14px;
          margin-bottom: 1.5rem;
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }

        .warning-box p {
          margin: 0;
          color: #b45309;
          font-size: 0.8rem;
          line-height: 1.5;
          font-weight: 500;
        }

        .form-group {
          margin-bottom: 1.25rem;
        }

        .input-wrapper {
          position: relative;
        }

        .input-icon-left {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #8899B0;
          pointer-events: none;
        }

        .input-btn-right {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #8899B0;
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .input-btn-right:hover {
          color: #0054A6;
        }

        /* Customize scrollbar inside card if it overflows */
        .primeiro-acesso-card::-webkit-scrollbar {
          width: 4px;
        }
        .primeiro-acesso-card::-webkit-scrollbar-thumb {
          background: rgba(0, 84, 166, 0.2);
          border-radius: 4px;
        }
      `}</style>

      <div className="primeiro-acesso-page">
        <div className="primeiro-acesso-overlay" />

        <div className="primeiro-acesso-card">
          {/* Logo + Título */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <img 
              src={getMediaUrl('/uploads/foto4_nobg.png')} 
              alt="Senador Styvenson Valim" 
              style={{
                height: '135px',
                width: 'auto',
                objectFit: 'contain',
                margin: '-45px auto 0.5rem',
                display: 'block',
                filter: 'drop-shadow(0 10px 16px rgba(0, 84, 166, 0.3))'
              }}
            />
            <h1 style={{ margin: 0, color: '#002855', fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.3px' }}>
              Definir sua senha
            </h1>
            <p style={{ margin: '6px 0 0', color: '#5A6B8A', fontSize: '0.85rem', fontWeight: 500 }}>
              Olá, <span style={{ color: '#0054A6', fontWeight: 700 }}>{primeiroNome}</span>! Defina sua senha permanente abaixo.
            </p>
          </div>

          {/* Aviso */}
          <div className="warning-box">
            <AlertTriangle size={16} style={{ color: '#d97706', marginTop: '2px', flexShrink: 0 }} />
            <p>
              Você recebeu uma <strong>senha temporária</strong> por e-mail. 
              Informe-a e crie a sua senha definitiva de acesso.
            </p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Senha temporária */}
            <div className="form-group">
              <label htmlFor="senhaAtual" className="form-label">
                Senha temporária
              </label>
              <div className="input-wrapper">
                <Lock size={15} className="input-icon-left" />
                <input
                  id="senhaAtual"
                  name="senhaAtual"
                  type={show.senhaAtual ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={form.senhaAtual}
                  onChange={handleChange}
                  disabled={loading}
                  className="form-input"
                  style={{ paddingLeft: '40px', paddingRight: '44px', borderColor: errors.senhaAtual ? '#dc2626' : undefined }}
                  placeholder="Sua senha temporária"
                />
                <button type="button" onClick={() => toggleShow('senhaAtual')} className="input-btn-right">
                  {show.senhaAtual ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.senhaAtual && <p className="form-error">{errors.senhaAtual}</p>}
            </div>

            {/* Nova senha */}
            <div className="form-group">
              <label htmlFor="novaSenha" className="form-label">
                Nova senha
              </label>
              <div className="input-wrapper">
                <Lock size={15} className="input-icon-left" />
                <input
                  id="novaSenha"
                  name="novaSenha"
                  type={show.novaSenha ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.novaSenha}
                  onChange={handleChange}
                  disabled={loading}
                  className="form-input"
                  style={{ paddingLeft: '40px', paddingRight: '44px', borderColor: errors.novaSenha ? '#dc2626' : undefined }}
                  placeholder="Mín. 8 caracteres, 1 maiúscula, 1 número"
                />
                <button type="button" onClick={() => toggleShow('novaSenha')} className="input-btn-right">
                  {show.novaSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.novaSenha && <p className="form-error">{errors.novaSenha}</p>}
            </div>

            {/* Confirmar senha */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="confirmar" className="form-label">
                Confirmar nova senha
              </label>
              <div className="input-wrapper">
                <Lock size={15} className="input-icon-left" />
                <input
                  id="confirmar"
                  name="confirmar"
                  type={show.confirmar ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.confirmar}
                  onChange={handleChange}
                  disabled={loading}
                  className="form-input"
                  style={{ paddingLeft: '40px', paddingRight: '44px', borderColor: errors.confirmar ? '#dc2626' : undefined }}
                  placeholder="Repita a nova senha"
                />
                <button type="button" onClick={() => toggleShow('confirmar')} className="input-btn-right">
                  {show.confirmar ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmar && <p className="form-error">{errors.confirmar}</p>}
            </div>

            {/* Botão */}
            <button
              id="btn-definir-senha"
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Definindo...
                </>
              ) : (
                'Definir minha senha'
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', color: 'var(--texto-claro)', fontSize: '0.75rem', marginTop: '1.75rem', fontWeight: 500 }}>
            Sistema protegido · Dados sob LGPD
          </p>
        </div>
      </div>
    </>
  );
}
