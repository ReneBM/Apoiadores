import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Loader2, ChevronLeft, Mail, Save, Send, CheckCircle2, AlertTriangle, Eye, EyeOff, ShieldCheck, MessageSquare, RotateCcw, MessageCircle, Info } from 'lucide-react';

// Modelos que precisam existir aprovados no painel da Meta
const MODELOS_WHATSAPP = [
  { chave: 'WHATSAPP_TPL_RESET', rotulo: 'Recuperação de senha', dica: 'Categoria "Autenticação". Recebe o código de 6 dígitos.' },
  { chave: 'WHATSAPP_TPL_ACESSO', rotulo: 'Primeiro acesso', dica: 'Categoria "Utilidade". Recebe nome, e-mail e senha temporária.' },
  { chave: 'WHATSAPP_TPL_AVISO', rotulo: 'Aviso da campanha', dica: 'Categoria "Marketing". Recebe o nome e o texto do disparo.' },
];

const CHAVES_WHATSAPP = [
  'WHATSAPP_ATIVO', 'WHATSAPP_TOKEN', 'WHATSAPP_PHONE_ID', 'WHATSAPP_IDIOMA',
  ...MODELOS_WHATSAPP.map((m) => m.chave),
];

// Textos dos e-mails, agrupados por mensagem
const MENSAGENS = [
  {
    id: 'reset',
    titulo: 'Recuperação de senha',
    descricao: 'Enviado quando alguém usa o "Esqueceu a senha?" e recebe o código de 6 dígitos.',
    campos: [
      { chave: 'EMAIL_RESET_ASSUNTO', rotulo: 'Assunto', tipo: 'texto' },
      { chave: 'EMAIL_RESET_TITULO', rotulo: 'Título dentro do e-mail', tipo: 'texto' },
      { chave: 'EMAIL_RESET_TEXTO', rotulo: 'Mensagem', tipo: 'area' },
      { chave: 'EMAIL_RESET_AVISO', rotulo: 'Aviso destacado (caixa amarela)', tipo: 'area' },
    ],
  },
  {
    id: 'acesso',
    titulo: 'Primeiro acesso',
    descricao: 'Enviado quando um cadastro é aprovado e a pessoa recebe a senha temporária.',
    campos: [
      { chave: 'EMAIL_ACESSO_ASSUNTO', rotulo: 'Assunto', tipo: 'texto' },
      { chave: 'EMAIL_ACESSO_TITULO', rotulo: 'Título dentro do e-mail', tipo: 'texto' },
      { chave: 'EMAIL_ACESSO_TEXTO', rotulo: 'Mensagem', tipo: 'area' },
      { chave: 'EMAIL_ACESSO_AVISO', rotulo: 'Aviso destacado (caixa amarela)', tipo: 'area' },
    ],
  },
];

const CHAVES_EMAIL = MENSAGENS.flatMap((m) => m.campos.map((c) => c.chave));

export default function Configuracoes() {
  const navigate = useNavigate();

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarToken, setMostrarToken] = useState(false);
  const [aba, setAba] = useState('email'); // 'email' | 'mensagens' | 'whatsapp'

  const [estado, setEstado] = useState(null); // resposta do GET
  const [form, setForm] = useState({ MAIL_USER: '', MAIL_PASS: '', MAIL_FROM_NAME: '' });
  const [destinoTeste, setDestinoTeste] = useState('');
  const [testandoZap, setTestandoZap] = useState(false);
  const [destinoZap, setDestinoZap] = useState('');

  const carregar = async () => {
    try {
      const { data } = await api.get('/config');
      setEstado(data);
      const textos = {};
      CHAVES_EMAIL.forEach((k) => { textos[k] = data.itens[k]?.valor || ''; });
      const zap = {};
      CHAVES_WHATSAPP.forEach((k) => { zap[k] = data.itens[k]?.valor || ''; });
      setForm({
        MAIL_USER: data.itens.MAIL_USER?.valor || '',
        MAIL_PASS: '', // sensível: sempre começa vazio (vazio = não alterar)
        MAIL_FROM_NAME: data.itens.MAIL_FROM_NAME?.valor || '',
        ...textos,
        ...zap,
        WHATSAPP_TOKEN: '', // sensível: idem
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
      setForm((f) => ({ ...f, MAIL_PASS: '', WHATSAPP_TOKEN: '' })); // limpa os campos sensíveis
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

  const handleTestarWhatsapp = async () => {
    setTestandoZap(true);
    try {
      const { data } = await api.post('/config/testar-whatsapp', {
        destinatario: destinoZap.trim() || undefined,
      });
      toast.success(data.message, { duration: 8000 });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Falha no teste do WhatsApp.', { duration: 10000 });
    } finally {
      setTestandoZap(false);
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
  const whatsappPronto = estado?.whatsappPronto;
  const dicaToken = estado?.itens?.WHATSAPP_TOKEN?.dica;

  const restaurarPadrao = (chave) => {
    const padrao = estado?.itens?.[chave]?.padrao || '';
    setForm((f) => ({ ...f, [chave]: padrao }));
    toast.success('Texto padrão restaurado. Salve para aplicar.');
  };

  const estiloAba = (ativa) => ({
    flex: 1, padding: '0.7rem 0.5rem', border: 'none', cursor: 'pointer',
    background: 'none', fontSize: '0.85rem', fontWeight: 700, minHeight: '44px',
    color: ativa ? 'var(--primary)' : 'var(--texto-claro)',
    borderBottom: `2.5px solid ${ativa ? 'var(--primary)' : 'transparent'}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
  });

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

      {/* Abas */}
      <div style={{ display: 'flex', borderBottom: '1.5px solid var(--borda)', backgroundColor: '#fff', borderRadius: '12px 12px 0 0' }}>
        <button type="button" onClick={() => setAba('email')} style={estiloAba(aba === 'email')}>
          <Mail size={15} /> Envio de e-mail
        </button>
        <button type="button" onClick={() => setAba('whatsapp')} style={estiloAba(aba === 'whatsapp')}>
          <MessageCircle size={15} /> WhatsApp
        </button>
        <button type="button" onClick={() => setAba('mensagens')} style={estiloAba(aba === 'mensagens')}>
          <MessageSquare size={15} /> Mensagens
        </button>
      </div>

      {aba === 'mensagens' && (
        <>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--texto-medio)', lineHeight: 1.5, textAlign: 'left', padding: '0 0.25rem' }}>
            Personalize o que os usuários leem nos e-mails automáticos. O visual e a
            identidade do e-mail continuam os mesmos — aqui você ajusta só os textos.
          </p>

          {MENSAGENS.map((msg) => (
            <form key={msg.id} onSubmit={handleSalvar} className="card" style={{ padding: 'clamp(1rem, 3vw, 1.5rem)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ textAlign: 'left' }}>
                <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>{msg.titulo}</h2>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.76rem', color: 'var(--texto-claro)', lineHeight: 1.45 }}>{msg.descricao}</p>
              </div>

              {msg.campos.map((campo) => {
                const info = estado?.itens?.[campo.chave];
                const variaveis = info?.variaveis || [];
                const alterado = (form[campo.chave] || '') !== (info?.padrao || '');
                return (
                  <div className="form-group" key={campo.chave}>
                    <label htmlFor={campo.chave} className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <span>{campo.rotulo}</span>
                      {alterado && (
                        <button
                          type="button"
                          onClick={() => restaurarPadrao(campo.chave)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--texto-claro)', fontSize: '0.68rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'none', letterSpacing: 0, padding: '2px 4px' }}
                          title="Voltar ao texto padrão"
                        >
                          <RotateCcw size={12} /> restaurar padrão
                        </button>
                      )}
                    </label>
                    {campo.tipo === 'area' ? (
                      <textarea
                        id={campo.chave} className="form-input" rows={3}
                        style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
                        value={form[campo.chave] || ''}
                        onChange={(e) => setForm({ ...form, [campo.chave]: e.target.value })}
                        disabled={salvando}
                      />
                    ) : (
                      <input
                        id={campo.chave} type="text" className="form-input"
                        value={form[campo.chave] || ''}
                        onChange={(e) => setForm({ ...form, [campo.chave]: e.target.value })}
                        disabled={salvando}
                      />
                    )}
                    {variaveis.length > 0 && (
                      <small style={{ color: 'var(--texto-claro)', fontSize: '0.7rem' }}>
                        Você pode usar: {variaveis.map((v) => <code key={v} style={{ marginRight: '6px' }}>{v}</code>)}
                      </small>
                    )}
                  </div>
                );
              })}

              <button type="submit" disabled={salvando} className="submit-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', minHeight: '48px' }}>
                {salvando ? <><Loader2 size={16} className="spin" /> Salvando...</> : <><Save size={16} /> Salvar mensagens</>}
              </button>
            </form>
          ))}

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', padding: '0 0.25rem', color: 'var(--texto-claro)', fontSize: '0.75rem', lineHeight: 1.5, textAlign: 'left' }}>
            <MessageSquare size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              O código de 6 dígitos, a senha temporária e o botão de acesso são inseridos
              automaticamente pelo sistema — não é preciso escrevê-los no texto.
            </span>
          </div>
        </>
      )}

      {aba === 'whatsapp' && (
      <>
      {/* Situação do WhatsApp */}
      <div className="card" style={{
        padding: '0.9rem 1rem', borderRadius: '12px',
        backgroundColor: whatsappPronto ? 'rgba(5,150,105,0.06)' : 'rgba(217,119,6,0.07)',
        border: `1.5px solid ${whatsappPronto ? 'rgba(5,150,105,0.25)' : 'rgba(217,119,6,0.3)'}`,
        display: 'flex', alignItems: 'flex-start', gap: '0.7rem',
      }}>
        {whatsappPronto
          ? <CheckCircle2 size={20} color="#059669" style={{ flexShrink: 0, marginTop: '1px' }} />
          : <AlertTriangle size={20} color="#d97706" style={{ flexShrink: 0, marginTop: '1px' }} />}
        <div style={{ textAlign: 'left' }}>
          <strong style={{ display: 'block', fontSize: '0.85rem', color: whatsappPronto ? '#047857' : '#b45309' }}>
            {whatsappPronto ? 'WhatsApp ligado' : 'WhatsApp desligado'}
          </strong>
          <span style={{ fontSize: '0.78rem', color: 'var(--texto-medio)', lineHeight: 1.5 }}>
            {whatsappPronto
              ? 'O código de senha, o primeiro acesso e os disparos podem sair pelo WhatsApp.'
              : 'Preencha o token e o ID do número abaixo, e marque "Ativar", para começar a enviar.'}
          </span>
        </div>
      </div>

      <form onSubmit={handleSalvar} className="card" style={{ padding: 'clamp(1rem, 3vw, 1.5rem)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MessageCircle size={16} /> Conexão com a Meta
        </h2>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer', textAlign: 'left' }}>
          <input
            type="checkbox"
            checked={form.WHATSAPP_ATIVO === 'sim'}
            onChange={(e) => setForm({ ...form, WHATSAPP_ATIVO: e.target.checked ? 'sim' : 'nao' })}
            disabled={salvando}
            style={{ width: '18px', height: '18px', marginTop: '2px', flexShrink: 0, accentColor: 'var(--primary)' }}
          />
          <span>
            <strong style={{ fontSize: '0.85rem', color: 'var(--texto)' }}>Ativar envio por WhatsApp</strong>
            <small style={{ display: 'block', color: 'var(--texto-claro)', fontSize: '0.72rem', lineHeight: 1.5 }}>
              Desmarcado, o sistema continua enviando só por e-mail.
            </small>
          </span>
        </label>

        <div className="form-group">
          <label htmlFor="WHATSAPP_TOKEN" className="form-label">
            Token de acesso {estado?.itens?.WHATSAPP_TOKEN?.preenchido ? '(já configurado)' : '*'}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="WHATSAPP_TOKEN"
              type={mostrarToken ? 'text' : 'password'}
              className="form-input"
              style={{ paddingRight: '3rem' }}
              placeholder={estado?.itens?.WHATSAPP_TOKEN?.preenchido ? 'Deixe em branco para manter o atual' : 'Cole aqui o token permanente da Meta'}
              value={form.WHATSAPP_TOKEN}
              onChange={(e) => setForm({ ...form, WHATSAPP_TOKEN: e.target.value })}
              disabled={salvando}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setMostrarToken((v) => !v)}
              style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px', display: 'flex' }}
              aria-label={mostrarToken ? 'Ocultar token' : 'Mostrar token'}
              tabIndex={-1}
            >
              {mostrarToken ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {dicaToken && (
            <small style={{ color: 'var(--texto-claro)', fontSize: '0.72rem' }}>
              Salvo atualmente: <code>{dicaToken}</code>
              {estado?.itens?.WHATSAPP_TOKEN?.origem === 'ambiente' && ' (vindo das variáveis de ambiente)'}
            </small>
          )}
          <small style={{ color: 'var(--texto-claro)', fontSize: '0.72rem', display: 'block', marginTop: '0.2rem' }}>
            Gere um <strong>token permanente</strong> em business.facebook.com → Configurações do
            negócio → Usuários do sistema. O token de teste do painel expira em 24 horas.
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="WHATSAPP_PHONE_ID" className="form-label">ID do número de telefone *</label>
          <input
            id="WHATSAPP_PHONE_ID" type="text" inputMode="numeric" className="form-input"
            placeholder="Ex.: 123456789012345"
            value={form.WHATSAPP_PHONE_ID}
            onChange={(e) => setForm({ ...form, WHATSAPP_PHONE_ID: e.target.value })}
            disabled={salvando}
            autoComplete="off"
          />
          <small style={{ color: 'var(--texto-claro)', fontSize: '0.72rem' }}>
            É o <em>Phone number ID</em> que aparece na área de API do WhatsApp — só números,
            não é o telefone da campanha.
          </small>
        </div>

        <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', margin: '0.4rem 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MessageSquare size={16} /> Modelos aprovados
        </h2>
        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--texto-medio)', lineHeight: 1.5, textAlign: 'left' }}>
          A Meta exige que o texto de cada mensagem seja aprovado por ela. Cadastre os modelos
          no painel da Meta e escreva aqui o nome exato de cada um.
        </p>

        {MODELOS_WHATSAPP.map((m) => (
          <div className="form-group" key={m.chave}>
            <label htmlFor={m.chave} className="form-label">{m.rotulo}</label>
            <input
              id={m.chave} type="text" className="form-input"
              placeholder={estado?.itens?.[m.chave]?.padrao || ''}
              value={form[m.chave]}
              onChange={(e) => setForm({ ...form, [m.chave]: e.target.value })}
              disabled={salvando}
              autoComplete="off"
            />
            <small style={{ color: 'var(--texto-claro)', fontSize: '0.72rem' }}>{m.dica}</small>
          </div>
        ))}

        <button type="submit" disabled={salvando} className="submit-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', minHeight: '48px' }}>
          {salvando ? <><Loader2 size={16} className="spin" /> Salvando...</> : <><Save size={16} /> Salvar WhatsApp</>}
        </button>
      </form>

      {/* Teste */}
      <div className="card" style={{ padding: 'clamp(1rem, 3vw, 1.5rem)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Send size={16} /> Testar o envio
        </h2>
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--texto-medio)', lineHeight: 1.5, textAlign: 'left' }}>
          Informe um celular com DDD para receber uma mensagem de teste, ou deixe em
          branco para apenas conferir a conexão com a Meta.
        </p>
        <input
          type="tel" className="form-input" placeholder="(84) 99999-8888 (opcional)"
          value={destinoZap}
          onChange={(e) => setDestinoZap(e.target.value)}
          disabled={testandoZap}
        />
        <button
          type="button" onClick={handleTestarWhatsapp} disabled={testandoZap}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '0.75rem', borderRadius: '10px', border: '1.5px solid var(--borda)',
            backgroundColor: '#fff', color: 'var(--texto)', fontSize: '0.85rem',
            fontWeight: 700, cursor: testandoZap ? 'default' : 'pointer', minHeight: '48px',
            opacity: testandoZap ? 0.7 : 1,
          }}
        >
          {testandoZap ? <><Loader2 size={16} className="spin" /> Testando...</> : <><Send size={16} /> Testar agora</>}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', padding: '0 0.25rem', color: 'var(--texto-claro)', fontSize: '0.75rem', lineHeight: 1.5, textAlign: 'left' }}>
        <Info size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
        <span>
          O disparo de campanha só vai para quem tem telefone cadastrado e não pediu
          descadastro. Mensagens de serviço — código de senha e primeiro acesso — saem
          normalmente para todos.
        </span>
      </div>
      </>
      )}

      {aba === 'email' && (
      <>
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
      </>
      )}
    </div>
  );
}
