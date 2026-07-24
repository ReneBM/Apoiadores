import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getMediaUrl } from '../api/axios';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm]         = useState({ email: '', senha: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleChange = (e) => {
    setError('');
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.senha) {
      setError('Preencha e-mail e senha.');
      return;
    }
    setLoading(true);
    setError('');

    const result = await login(form.email, form.senha);
    setLoading(false);

    if (result.success) {
      if (result.primeiroAcesso) {
        navigate('/primeiro-acesso', { replace: true });
      } else {
        toast.success('Bem-vindo!');
        navigate(result.role === 'multiplicador' ? '/painel' : '/dashboard', { replace: true });
      }
    } else {
      setError(result.message);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        .login-page {
          position: absolute;
          inset: 0;
          overflow-y: auto;
          background: url('/page-bg.jpg') no-repeat center center;
          background-size: cover;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          font-family: 'Inter', -apple-system, sans-serif;
          box-sizing: border-box;
        }

        .login-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 20, 60, 0.15);
        }

        .login-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 400px;
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 3rem 2.5rem;
          box-shadow: 0 25px 60px -10px rgba(0, 0, 0, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.5);
          animation: loginFadeIn 0.7s cubic-bezier(0.23, 1, 0.32, 1) forwards;
        }

        @keyframes loginFadeIn {
          from { opacity: 0; transform: translateY(28px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .login-header {
          text-align: center;
          margin-bottom: 2.25rem;
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
          font-size: 1.4rem;
          font-weight: 800;
          color: #002855;
          margin: 0 0 0.4rem;
          letter-spacing: -0.3px;
        }

        .login-header p {
          color: #64748b;
          font-size: 0.875rem;
          margin: 0;
        }

        .login-form-group {
          margin-bottom: 1.25rem;
        }

        .login-label {
          display: block;
          font-size: 0.72rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 0.4rem;
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }

        .login-input-wrap {
          position: relative;
        }

        .login-input {
          width: 100%;
          padding: 0.72rem 1rem;
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          font-size: 0.95rem;
          color: #1e293b;
          font-family: inherit;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .login-input:focus {
          outline: none;
          border-color: #0054A6;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(0, 84, 166, 0.1);
        }

        .login-input.has-toggle {
          padding-right: 2.8rem;
        }

        .login-toggle-pass {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #94a3b8;
          padding: 4px;
          display: flex;
          align-items: center;
          transition: color 0.2s;
        }

        .login-toggle-pass:hover {
          color: #475569;
        }

        .login-error {
          background: #fee2e2;
          color: #dc2626;
          padding: 0.7rem 0.9rem;
          border-radius: 8px;
          font-size: 0.83rem;
          font-weight: 600;
          margin-bottom: 1.25rem;
          border: 1px solid #fca5a5;
          text-align: center;
        }

        .login-btn {
          width: 100%;
          padding: 0.9rem;
          background: #0054A6;
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 0.95rem;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 0.5rem;
          box-shadow: 0 6px 16px rgba(0, 84, 166, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .login-btn:hover:not(:disabled) {
          background: #0066CC;
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(0, 84, 166, 0.32);
        }

        .login-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .login-footer {
          margin-top: 1.75rem;
          text-align: center;
          font-size: 0.78rem;
          color: #94a3b8;
        }

        .spin {
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="login-page">
        {/* Overlay escuro sobre o fundo */}
        <div className="login-overlay" />

        {/* Card central */}
        <div className="login-card">

          {/* Cabeçalho */}
          <div className="login-header">
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '0.75rem'
            }}>
              <img 
                src="/logo_time_sv.png" 
                alt="Logo Time SV" 
                style={{
                  height: '38px',
                  width: 'auto',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 4px 12px rgba(0, 84, 166, 0.2))'
                }}
                onError={(e) => { e.currentTarget.src = '/logo_sv_2025.png'; }}
              />
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, fontWeight: 500 }}>Aplicativo Oficial de Mobilização</p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} noValidate>

            {/* Erro */}
            {error && (
              <div className="login-error">{error}</div>
            )}

            {/* E-mail */}
            <div className="login-form-group">
              <label htmlFor="email" className="login-label">E-mail</label>
              <input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="seu@email.com.br"
                value={form.email}
                onChange={handleChange}
                disabled={loading}
                className="login-input"
              />
            </div>

            {/* Senha */}
            <div className="login-form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label htmlFor="senha" className="login-label" style={{ margin: 0 }}>Senha</label>
                <button
                  type="button"
                  onClick={() => toast.info('Para redefinir sua senha, entre em contato com a coordenação do Time Styvenson.', { duration: 5000 })}
                  style={{ background: 'none', border: 'none', color: '#0054A6', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="login-input-wrap">
                <input
                  id="senha"
                  name="senha"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.senha}
                  onChange={handleChange}
                  disabled={loading}
                  className="login-input has-toggle"
                />
                <button
                  type="button"
                  className="login-toggle-pass"
                  onClick={() => setShowPass((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Botão */}
            <button
              id="btn-login"
              type="submit"
              disabled={loading}
              className="login-btn"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spin" />
                  Entrando...
                </>
              ) : 'Entrar'}
            </button>

          </form>

          <p className="login-footer" style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', marginTop: '1.5rem' }}>
            <div style={{ fontSize: '0.85rem', color: '#475569' }}>
              Não tem uma conta?{' '}
              <Link to="/cadastro" style={{ color: '#0054A6', fontWeight: 700, textDecoration: 'none' }}>
                Quero me cadastrar
              </Link>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Sistema protegido · Dados sob LGPD</span>
          </p>
        </div>
      </div>
    </>
  );
}
