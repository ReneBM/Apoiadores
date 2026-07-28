import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Loader2, ChevronLeft, Mail, Save, Send, CheckCircle2, AlertTriangle, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function Configuracoes() {
  const navigate = useNavigate();

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const [estado, setEstado] = useState(null); // resposta do GET
  const [form, setForm] = useState({ MAIL_USER: '', MAIL_PASS: '', MAIL_FROM_NAME: '' });
  const [destinoTeste, setDestinoTeste] = useState('');

  const carregar = async () => {
    try {
      const { data } = await api.get('/config');
      setEstado(data);
      setForm({
        MAIL_USER: data.itens.MAIL_USER?.valor || '',
        MAIL_PASS: '', // sensível: sempre começa vazio (vazio = não alterar)
        MAIL_FROM_NAME: data.itens.MAIL_FROM_NAME?.valor || '',
      });
    } catch {
      toast.error('Não foi possível carregar as configurações.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const handleSalvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const { data } = await api.put('/config', form);
      toast.success(data.message);
      setForm((f) => ({ ...f, MAIL_PASS: '' })); // limpa o campo de senha
      await carregar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar as configurações.');
    } finally {
      setSalvando(false);
    }
  };

  const handleTestar = async () => {
    setTestando(true);
    try {
      const { data } = await api.post('/config/testar-email', {
        destinatario: destinoTeste.trim() || undefined,
      });
      toast.success(data.message, { duration: 6000 });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Falha no teste de e-mail.', { duration: 8000 });
    } finally {
      setTestando(false);
    }
  };

  if (carregando) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '0.75rem', color: 'var(--texto-medio)' }}>
        <Loader2 className="spin" size={22} /> Carregando configurações...
      </div>
    );
  }

  const emailPronto = estado?.emailPronto;
  const dicaSenha = estado?.itens?.MAIL_PASS?.dica;
  const origem = estado?.itens?.MAIL_PASS?.origem;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '2rem' }}>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', color: 'var(--texto-medio)', minHeight: '44px', minWidth: '44px' }}
          aria-label="Voltar"
        >
          <ChevronLeft size={22} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--texto)' }}>Configurações</h1>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--texto-claro)' }}>
            Ajustes do sistema. Alterações valem imediatamente, sem novo deploy.
          </p>
        </div>
      </div>

      {/* Situação do envio de e-mail */}
      <div className="card" style={{
        padding: '0.9rem 1rem', borderRadius: '12px',
        backgroundColor: emailPronto ? 'rgba(5,150,105,0.06)' : 'rgba(217,119,6,0.07)',
        border: `1.5px solid ${emailPronto ? 'rgba(5,150,105,0.25)' : 'rgba(217,119,6,0.3)'}`,
        display: 'flex', alignItems: 'flex-start', gap: '0.7rem',
      }}>
        {emailPronto
          ? <CheckCircle2 size={20} color="#059669" style={{ flexShrink: 0, marginTop: '1px' }} />
          : <AlertTriangle size={20} color="#d97706" style={{ flexShrink: 0, marginTop: '1px' }} />}
        <div style={{ textAlign: 'left' }}>
          <strong style={{ display: 'block', fontSize: '0.85rem', color: emailPronto ? '#047857' : '#b45309' }}>
            {emailPronto ? 'Envio de e-mail configurado' : 'Envio de e-mail não configurado'}
          </strong>
          <span style={{ fontSize: '0.78rem', color: 'var(--texto-medio)', lineHeight: 1.5 }}>
            {emailPronto
              ? 'A recuperação de senha e os avisos de primeiro acesso conseguem enviar e-mails.'
              : 'Sem isso, o "Esqueceu a senha" não consegue enviar o código aos usuários.'}
          </span>
        </div>
      </div>

      {/* Formulário de e-mail */}
      <form onSubmit={handleSalvar} className="card" style={{ padding: 'clamp(1rem, 3vw, 1.5rem)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Mail size={16} /> Envio de E-mail (Gmail)
        </h2>

        <div className="form-group">
          <label htmlFor="MAIL_USER" className="form-label">E-mail remetente *</label>
          <input
            id="MAIL_USER" type="email" className="form-input" placeholder="contato@seudominio.com.br"
            value={form.MAIL_USER}
            onChange={(e) => setForm({ ...form, MAIL_USER: e.target.value })}
            disabled={salvando}
            autoComplete="off"
          />
          <small style={{ color: 'var(--texto-claro)', fontSize: '0.72rem' }}>
            Conta Gmail que enviará as mensagens do sistema.
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="MAIL_PASS" className="form-label">
            Senha de app {estado?.itens?.MAIL_PASS?.preenchido ? '(já configurada)' : '*'}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="MAIL_PASS"
              type={mostrarSenha ? 'text' : 'password'}
              className="form-input"
              style={{ paddingRight: '3rem' }}
              placeholder={estado?.itens?.MAIL_PASS?.preenchido ? 'Deixe em branco para manter a atual' : 'Cole aqui a senha de app do Gmail'}
              value={form.MAIL_PASS}
              onChange={(e) => setForm({ ...form, MAIL_PASS: e.target.value })}
              disabled={salvando}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setMostrarSenha((v) => !v)}
              style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px', display: 'flex' }}
              aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
              tabIndex={-1}
            >
              {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {dicaSenha && (
            <small style={{ color: 'var(--texto-claro)', fontSize: '0.72rem' }}>
              Salva atualmente: <code>{dicaSenha}</code>
              {origem === 'ambiente' && ' (vinda das variáveis de ambiente)'}
            </small>
          )}
          <small style={{ color: 'var(--texto-claro)', fontSize: '0.72rem', display: 'block', marginTop: '0.2rem' }}>
            Não é a senha normal do Gmail: gere uma <strong>senha de app</strong> em
            {' '}<a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>myaccount.google.com/apppasswords</a>
            {' '}(exige verificação em duas etapas ativa).
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="MAIL_FROM_NAME" className="form-label">Nome do remetente</label>
          <input
            id="MAIL_FROM_NAME" type="text" className="form-input" placeholder="Time SV"
            value={form.MAIL_FROM_NAME}
            onChange={(e) => setForm({ ...form, MAIL_FROM_NAME: e.target.value })}
            disabled={salvando}
          />
          <small style={{ color: 'var(--texto-claro)', fontSize: '0.72rem' }}>
            Aparece como remetente na caixa de entrada de quem recebe.
          </small>
        </div>

        <button type="submit" disabled={salvando} className="submit-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', minHeight: '48px' }}>
          {salvando ? <><Loader2 size={16} className="spin" /> Salvando...</> : <><Save size={16} /> Salvar configurações</>}
        </button>
      </form>

      {/* Teste */}
      <div className="card" style={{ padding: 'clamp(1rem, 3vw, 1.5rem)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Send size={16} /> Testar o envio
        </h2>
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--texto-medio)', lineHeight: 1.5, textAlign: 'left' }}>
          Confere se as credenciais funcionam. Informe um e-mail para receber uma
          mensagem de teste, ou deixe em branco para apenas validar a conexão.
        </p>
        <input
          type="email" className="form-input" placeholder="seu@email.com (opcional)"
          value={destinoTeste}
          onChange={(e) => setDestinoTeste(e.target.value)}
          disabled={testando}
        />
        <button
          type="button" onClick={handleTestar} disabled={testando}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '0.75rem', borderRadius: '10px', border: '1.5px solid var(--borda)',
            backgroundColor: '#fff', color: 'var(--texto)', fontSize: '0.85rem',
            fontWeight: 700, cursor: testando ? 'default' : 'pointer', minHeight: '48px',
            opacity: testando ? 0.7 : 1,
          }}
        >
          {testando ? <><Loader2 size={16} className="spin" /> Testando...</> : <><Send size={16} /> Testar agora</>}
        </button>
      </div>

      {/* Nota de segurança */}
      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', padding: '0 0.25rem', color: 'var(--texto-claro)', fontSize: '0.75rem', lineHeight: 1.5, textAlign: 'left' }}>
        <ShieldCheck size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
        <span>
          A senha é guardada criptografada e nunca é exibida de volta — nem aqui, nem
          pela API. Apenas administradores acessam esta tela, e toda alteração fica
          registrada na auditoria.
        </span>
      </div>
    </div>
  );
}
