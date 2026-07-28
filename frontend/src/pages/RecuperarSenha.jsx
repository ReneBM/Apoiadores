import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';

export default function RecuperarSenha() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estados dos passos
  const [identificador, setIdentificador] = useState('');
  const [codigo, setCodigo] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  
  const [showPass, setShowPass] = useState(false);

  // Passo 1: Enviar email ou telefone para receber o PIN
  const handleRequestPin = async (e) => {
    e.preventDefault();
    if (!identificador) {
      setError('Informe seu e-mail ou telefone cadastrado.');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/forgot-password', { identificador });
      toast.success(res.data.message || 'Código enviado se a conta existir.');
      setStep(2);
    } catch (err) {
      const errorMsg = err.response?.data?.error;
      setError(typeof errorMsg === 'string' ? errorMsg : 'Erro ao processar solicitação.');
    } finally {
      setLoading(false);
    }
  };

  // Passo 2: Validar o PIN de 6 dígitos
  const handleVerifyPin = async (e) => {
    e.preventDefault();
    if (!codigo || codigo.length < 6) {
      setError('Informe o código de 6 dígitos recebido.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post('/auth/verify-code', { email: identificador, codigo });
      setStep(3);
    } catch (err) {
      const errorMsg = err.response?.data?.error;
      setError(typeof errorMsg === 'string' ? errorMsg : 'Código inválido ou expirado.');
    } finally {
      setLoading(false);
    }
  };

  // Passo 3: Salvar nova senha
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!novaSenha || novaSenha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/reset-password', {
        email: identificador,
        codigo,
        novaSenha
      });
      toast.success(res.data.message || 'Senha alterada com sucesso!');
      setStep(4);
    } catch (err) {
      const errorMsg = err.response?.data?.error;
      setError(typeof errorMsg === 'string' ? errorMsg : 'Erro ao redefinir a senha.');
    } finally {
      setLoading(false);
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
          overflow-x: hidden;
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
          max-width: min(420px, 92vw);
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: clamp(1.5rem, 5vw, 2.5rem);
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
          margin-bottom: 2rem;
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
          min-height: 48px;
          padding: 0.72rem 1rem;
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          font-size: 16px;
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
        
        .pin-input {
          text-align: center;
          font-size: 24px;
          letter-spacing: 12px;
          font-weight: 700;
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
          min-height: 48px;
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

        .spin {
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #64748b;
          font-size: 0.85rem;
          font-weight: 600;
          text-decoration: none;
          margin-bottom: 1.5rem;
          transition: color 0.2s;
        }
        .back-link:hover {
          color: #002855;
        }
      `}</style>

      <div className="login-page">
        <div className="login-overlay" />
        <div className="login-card">

          {/* Botão Voltar */}
          {step < 4 && (
            <Link to="/login" className="back-link">
              <ArrowLeft size={16} /> Voltar para o Login
            </Link>
          )}

          <div className="login-header">
            {step === 1 && (
              <>
                <h1>Esqueceu a senha?</h1>
                <p>Insira seu e-mail ou telefone para receber<br/>um código de recuperação.</p>
              </>
            )}
            {step === 2 && (
              <>
                <h1>Verifique seu e-mail</h1>
                <p>Enviamos um código de 6 dígitos<br/>para confirmar sua identidade.</p>
              </>
            )}
            {step === 3 && (
              <>
                <h1>Nova Senha</h1>
                <p>Crie uma nova senha de acesso.</p>
              </>
            )}
            {step === 4 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: '#16a34a' }}>
                  <CheckCircle2 size={56} />
                </div>
                <h1>Senha Redefinida!</h1>
                <p>Sua senha foi alterada com sucesso.</p>
              </>
            )}
          </div>

          {error && <div className="login-error">{error}</div>}

          {/* PASSO 1: Solicitar PIN */}
          {step === 1 && (
            <form onSubmit={handleRequestPin} noValidate>
              <div className="login-form-group">
                <label htmlFor="identificador" className="login-label">E-mail ou Telefone</label>
                <input
                  id="identificador"
                  type="text"
                  placeholder="exemplo@email.com"
                  value={identificador}
                  onChange={(e) => {
                    setError('');
                    setIdentificador(e.target.value);
                  }}
                  disabled={loading}
                  className="login-input"
                  autoFocus
                />
              </div>
              <button type="submit" disabled={loading} className="login-btn">
                {loading ? <><Loader2 size={16} className="spin" /> Enviando...</> : 'Enviar código'}
              </button>
            </form>
          )}

          {/* PASSO 2: Validar PIN */}
          {step === 2 && (
            <form onSubmit={handleVerifyPin} noValidate>
              <div className="login-form-group">
                <label htmlFor="codigo" className="login-label">Código de 6 dígitos</label>
                <input
                  id="codigo"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={codigo}
                  onChange={(e) => {
                    setError('');
                    // Permite apenas números
                    const val = e.target.value.replace(/\D/g, '');
                    setCodigo(val);
                  }}
                  disabled={loading}
                  className="login-input pin-input"
                  autoFocus
                />
              </div>
              <button type="submit" disabled={loading || codigo.length < 6} className="login-btn">
                {loading ? <><Loader2 size={16} className="spin" /> Verificando...</> : 'Verificar código'}
              </button>
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  onClick={handleRequestPin} 
                  disabled={loading}
                  style={{ background: 'none', border: 'none', color: '#0054A6', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                  Reenviar código
                </button>
              </div>
            </form>
          )}

          {/* PASSO 3: Redefinir Senha */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} noValidate>
              <div className="login-form-group">
                <label htmlFor="novaSenha" className="login-label">Nova Senha</label>
                <div className="login-input-wrap">
                  <input
                    id="novaSenha"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    disabled={loading}
                    className="login-input has-toggle"
                    autoFocus
                  />
                  <button
                    type="button"
                    className="login-toggle-pass"
                    onClick={() => setShowPass((v) => !v)}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="login-form-group">
                <label htmlFor="confirmarSenha" className="login-label">Confirmar Senha</label>
                <div className="login-input-wrap">
                  <input
                    id="confirmarSenha"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Repita a nova senha"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    disabled={loading}
                    className="login-input has-toggle"
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="login-btn">
                {loading ? <><Loader2 size={16} className="spin" /> Salvando...</> : 'Salvar nova senha'}
              </button>
            </form>
          )}

          {/* PASSO 4: Sucesso */}
          {step === 4 && (
            <button onClick={() => navigate('/login')} className="login-btn">
              Ir para o Login
            </button>
          )}

        </div>
      </div>
    </>
  );
}
