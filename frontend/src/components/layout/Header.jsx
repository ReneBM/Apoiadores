import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';
import { Bell, Mail, Send, Check, Loader2, MessageCircle, X, ChevronRight, Menu, LogOut, UserPlus, CheckSquare, Megaphone, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Header({ title }) {
  const { user, logout, canManageAll } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Toggles de Popover
  const [bellOpen, setBellOpen] = useState(false);
  const [mailOpen, setMailOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // States de Dados
  const [noticias, setNoticias] = useState([]);
  const [readNews, setReadNews] = useState(() => {
    try {
      const stored = localStorage.getItem('readNews');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [myMessages, setMyMessages] = useState([]);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMsgText, setNewMsgText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [chatTab, setChatTab] = useState('conversas'); // 'conversas', 'disparo'
  const [searchQuery, setSearchQuery] = useState('');
  const [disparoForm, setDisparoForm] = useState({ titulo: '', conteudo: '', destinatarios: 'todos' });
  const [disparoLoading, setDisparoLoading] = useState(false);

  // ── Handlers de Dados ──────────────────────────────────────────────────────
  
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/chat/unread-count');
      setUnreadMsgCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error(err);
    }
  }, [user]);

  const fetchNoticias = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/noticias');
      setNoticias(res.data || []);
    } catch (err) {
      console.error(err);
    }
  }, [user]);

  const fetchMyMessages = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/chat/my-messages');
      setMyMessages(res.data || []);
      setUnreadMsgCount(0); // Zera o contador localmente após ler
    } catch (err) {
      console.error(err);
    }
  }, [user]);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/chat/conversations');
      setConversations(res.data || []);
    } catch (err) {
      console.error(err);
    }
  }, [user]);

  const fetchChatMessages = useCallback(async (contactId) => {
    try {
      const res = await api.get(`/chat/private/${contactId}`);
      setChatMessages(res.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Efeito Inicial
  useEffect(() => {
    if (user) {
      fetchNoticias();
      fetchUnreadCount();
      if (user.role === 'coordenador' || user.role === 'admin') {
        fetchConversations();
      }
    }
  }, [user, fetchNoticias, fetchUnreadCount, fetchConversations]);

  // Intervalo leve para atualizar notificações (60s)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchNoticias();
      fetchUnreadCount();
    }, 60000);
    return () => clearInterval(interval);
  }, [user, fetchNoticias, fetchUnreadCount]);

  const handleMarkNewsAsRead = (newsId) => {
    if (!readNews.includes(newsId)) {
      const updated = [...readNews, newsId];
      setReadNews(updated);
      localStorage.setItem('readNews', JSON.stringify(updated));
    }
    setBellOpen(false);
    navigate(`/painel?highlight=${newsId}`);
  };

  const handleMarkAllNewsAsRead = () => {
    const allIds = noticias.map((n) => n.id);
    setReadNews(allIds);
    localStorage.setItem('readNews', JSON.stringify(allIds));
    toast.success('Todas as notificações foram lidas.');
  };

  const unreadNewsCount = noticias.filter((n) => !readNews.includes(n.id)).length;

  // Ações de Chat
  const handleSelectContact = async (contact) => {
    setActiveChat(contact);
    await fetchChatMessages(contact.id);
  };

  const handleBackToContacts = () => {
    setActiveChat(null);
    setChatMessages([]);
    fetchConversations();
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMsgText.trim() || !activeChat) return;
    setSendingMsg(true);
    try {
      const res = await api.post('/chat/private', {
        destinatario_id: activeChat.id,
        mensagem: newMsgText.trim()
      });
      setChatMessages((prev) => [...prev, res.data]);
      setNewMsgText('');
    } catch (err) {
      toast.error('Erro ao enviar mensagem.');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleSendDisparo = async (e) => {
    e.preventDefault();
    if (!disparoForm.titulo || !disparoForm.conteudo) {
      toast.error('Preencha o título e o conteúdo da mensagem.');
      return;
    }
    setDisparoLoading(true);
    try {
      const res = await api.post('/mensagens', disparoForm);
      toast.success(res.data.message || 'Disparo efetuado com sucesso!');
      setDisparoForm({ titulo: '', conteudo: '', destinatarios: 'todos' });
      setChatTab('conversas');
    } catch (err) {
      toast.error('Erro ao efetuar o disparo.');
    } finally {
      setDisparoLoading(false);
    }
  };

  return (
    <>
      <header className="app-header" style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100 }}>
        {/* Logo + título */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
          <div className="header-logo">TS</div>
          <span className="header-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
        </div>

        {/* Inbox + Notificações */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          
          {/* 1. Inbox de Comunicação (Mensagens) - Agora vem primeiro */}
          <div style={{ position: 'relative' }}>
            <button
              id="header-btn-inbox"
              onClick={() => {
                setMailOpen(!mailOpen);
                setBellOpen(false);
                setSearchQuery('');
                setChatTab('conversas');
                setDisparoForm({ titulo: '', conteudo: '', destinatarios: 'todos' });
                if (user?.role === 'coordenador' || user?.role === 'admin') {
                  fetchConversations();
                } else {
                  fetchMyMessages();
                }
              }}
              style={iconButtonStyle}
            >
              <Mail size={20} color="#fff" />
              {unreadMsgCount > 0 && (
                <span style={{ ...badgeStyle, backgroundColor: '#ccf600', color: '#000' }}>{unreadMsgCount}</span>
              )}
            </button>

            {/* Dropdown da Caixa de Entrada */}
            {mailOpen && (
              <>
                <div style={backdropStyle} onClick={() => { setMailOpen(false); setActiveChat(null); }} />
                <div style={{ ...dropdownStyle, width: '320px' }}>
                  
                  {/* CASO APOIADOR (Apenas recebe mensagens) */}
                  {user?.role === 'multiplicador' && (
                    <>
                      <div style={dropdownHeaderStyle}>
                        <span style={{ fontWeight: 800 }}>Mensagens Recebidas</span>
                      </div>
                      <div style={dropdownBodyStyle}>
                        {myMessages.length === 0 ? (
                          <div style={emptyStateStyle}>Nenhuma mensagem recebida da coordenação.</div>
                        ) : (
                          myMessages.map((msg) => (
                            <div key={msg.id} style={messageItemStyle}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                                <span style={{ fontWeight: 800, fontSize: '0.8rem', color: '#0054A6' }}>
                                  {msg.remetente_nome || 'Coordenação'}
                                </span>
                                <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                                  {new Date(msg.created_at).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                              <p style={{ margin: 0, fontSize: '0.8rem', color: '#334155', lineHeight: '1.4' }}>
                                {msg.mensagem}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}

                  {/* CASO COORDENADOR / ADMIN (Envia e recebe mensagens) */}
                  {(user?.role === 'coordenador' || user?.role === 'admin') && (
                    <>
                      {!activeChat ? (
                        <>
                          {/* Seletor de abas dentro da caixa de entrada */}
                          <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9' }}>
                            <button
                              onClick={() => setChatTab('conversas')}
                              style={{
                                flex: 1,
                                padding: '0.75rem',
                                border: 'none',
                                background: 'none',
                                borderBottom: chatTab === 'conversas' ? '2px solid var(--primary)' : '2px solid transparent',
                                color: chatTab === 'conversas' ? 'var(--primary)' : 'var(--texto-medio)',
                                fontWeight: chatTab === 'conversas' ? 700 : 500,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                outline: 'none'
                              }}
                            >
                              Conversas
                            </button>
                            <button
                              onClick={() => setChatTab('disparo')}
                              style={{
                                flex: 1,
                                padding: '0.75rem',
                                border: 'none',
                                background: 'none',
                                borderBottom: chatTab === 'disparo' ? '2px solid var(--primary)' : '2px solid transparent',
                                color: chatTab === 'disparo' ? 'var(--primary)' : 'var(--texto-medio)',
                                fontWeight: chatTab === 'disparo' ? 700 : 500,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                outline: 'none'
                              }}
                            >
                              Novo Disparo
                            </button>
                          </div>

                          {chatTab === 'conversas' ? (
                            // Aba 1: Lista de Contatos/Conversas com busca
                            <>
                              <div style={{ padding: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                                <input
                                  type="text"
                                  placeholder="Pesquisar voluntário..."
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '0.45rem 0.75rem',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '0.78rem',
                                    outline: 'none',
                                    backgroundColor: '#f8fafc',
                                    boxSizing: 'border-box'
                                  }}
                                />
                              </div>
                              <div style={{ ...dropdownBodyStyle, maxHeight: '240px' }}>
                                {conversations.filter(c => 
                                  c.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
                                ).length === 0 ? (
                                  <div style={emptyStateStyle}>Nenhum voluntário encontrado.</div>
                                ) : (
                                  conversations.filter(c => 
                                    c.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                    (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
                                  ).map((contact) => (
                                    <div
                                      key={contact.id}
                                      onClick={() => handleSelectContact(contact)}
                                      style={contactItemStyle}
                                    >
                                      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                                        <strong style={{ fontSize: '0.82rem', color: '#0f172a', display: 'block' }}>{contact.nome}</strong>
                                        <small style={{ color: '#64748b', fontSize: '0.7rem', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                          {contact.ultima_mensagem || 'Nenhuma mensagem trocada'}
                                        </small>
                                      </div>
                                      <ChevronRight size={16} color="#94a3b8" />
                                    </div>
                                  ))
                                )}
                              </div>
                            </>
                          ) : (
                            // Aba 2: Novo Disparo de Mensagens
                            <form onSubmit={handleSendDisparo} style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', boxSizing: 'border-box' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', textAlign: 'left' }}>
                                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Título do Disparo</label>
                                <input
                                  type="text"
                                  placeholder="Digite o título do aviso..."
                                  value={disparoForm.titulo}
                                  onChange={(e) => setDisparoForm(prev => ({ ...prev, titulo: e.target.value }))}
                                  disabled={disparoLoading}
                                  required
                                  style={{
                                    padding: '0.45rem 0.6rem',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '0.78rem',
                                    outline: 'none',
                                    backgroundColor: '#fff',
                                    boxSizing: 'border-box'
                                  }}
                                />
                              </div>
                              
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', textAlign: 'left' }}>
                                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Destinatários</label>
                                <select
                                  value={disparoForm.destinatarios}
                                  onChange={(e) => setDisparoForm(prev => ({ ...prev, destinatarios: e.target.value }))}
                                  disabled={disparoLoading}
                                  style={{
                                    padding: '0.45rem 0.6rem',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '0.78rem',
                                    outline: 'none',
                                    backgroundColor: '#fff',
                                    boxSizing: 'border-box'
                                  }}
                                >
                                  <option value="todos">Todos os Voluntários</option>
                                  <option value="mobilizadores">Apenas Mobilizadores (1-10 ind.)</option>
                                  <option value="lideres">Apenas Líderes (11+ ind.)</option>
                                </select>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', textAlign: 'left' }}>
                                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Mensagem</label>
                                <textarea
                                  placeholder="Escreva a mensagem de aviso..."
                                  value={disparoForm.conteudo}
                                  onChange={(e) => setDisparoForm(prev => ({ ...prev, conteudo: e.target.value }))}
                                  disabled={disparoLoading}
                                  required
                                  rows={4}
                                  style={{
                                    padding: '0.45rem 0.6rem',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '0.78rem',
                                    outline: 'none',
                                    resize: 'none',
                                    fontFamily: 'inherit',
                                    boxSizing: 'border-box'
                                  }}
                                />
                              </div>

                              <button
                                type="submit"
                                disabled={disparoLoading || !disparoForm.titulo || !disparoForm.conteudo}
                                style={{
                                  backgroundColor: 'var(--primary)',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '0.55rem',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.4rem',
                                  transition: 'background-color 0.2s',
                                  boxSizing: 'border-box',
                                  width: '100%',
                                }}
                              >
                                {disparoLoading ? (
                                  <>
                                    <Loader2 className="spin" size={14} />
                                    <span>Enviando Disparo...</span>
                                  </>
                                ) : (
                                  <>
                                    <Send size={12} />
                                    <span>Enviar Disparo</span>
                                  </>
                                )}
                              </button>
                            </form>
                          )}
                        </>
                      ) : (
                        // Aba 2: Chat ativo com um voluntário
                        <>
                          <div style={{ ...dropdownHeaderStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <button onClick={handleBackToContacts} style={backButtonStyle}>Voltar</button>
                            <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a' }}>{activeChat.nome.split(' ')[0]}</span>
                            <span style={{ width: '40px' }} />
                          </div>
                          
                          {/* Histórico do Chat */}
                          <div style={chatBoxStyle}>
                            {chatMessages.length === 0 ? (
                              <div style={{ color: '#94a3b8', fontSize: '0.75rem', padding: '1rem 0' }}>Escreva uma mensagem de boas-vindas para iniciar!</div>
                            ) : (
                              chatMessages.map((msg) => {
                                const isMe = msg.remetente_id === user.id;
                                return (
                                  <div
                                    key={msg.id}
                                    style={{
                                      ...chatBubbleStyle,
                                      alignSelf: isMe ? 'flex-end' : 'flex-start',
                                      backgroundColor: isMe ? '#0054A6' : '#f1f5f9',
                                      color: isMe ? '#fff' : '#0f172a',
                                    }}
                                  >
                                    <p style={{ margin: 0 }}>{msg.mensagem}</p>
                                    <small style={{ fontSize: '0.58rem', display: 'block', marginTop: '0.15rem', color: isMe ? '#e2e8f0' : '#64748b', textAlign: 'right' }}>
                                      {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </small>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Input para envio */}
                          <form onSubmit={handleSendMessage} style={chatInputWrapStyle}>
                            <input
                              type="text"
                              placeholder="Digite a mensagem..."
                              value={newMsgText}
                              onChange={(e) => setNewMsgText(e.target.value)}
                              disabled={sendingMsg}
                              style={chatInputStyle}
                            />
                            <button type="submit" disabled={sendingMsg} style={chatSendButtonStyle}>
                              {sendingMsg ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
                            </button>
                          </form>
                        </>
                      )}
                    </>
                  )}

                </div>
              </>
            )}
          </div>

          {/* 2. Sininho de Notificação - Agora vem depois */}
          <div style={{ position: 'relative' }}>
            <button
              id="header-btn-notificacao"
              onClick={() => {
                setBellOpen(!bellOpen);
                setMailOpen(false);
                fetchNoticias();
              }}
              style={iconButtonStyle}
            >
              <Bell size={20} color="#fff" />
              {unreadNewsCount > 0 && (
                <span style={badgeStyle}>{unreadNewsCount}</span>
              )}
            </button>

            {/* Dropdown do Sininho */}
            {bellOpen && (
              <>
                <div style={backdropStyle} onClick={() => setBellOpen(false)} />
                <div style={dropdownStyle}>
                  <div style={dropdownHeaderStyle}>
                    <span style={{ fontWeight: 800 }}>Notificações</span>
                    {unreadNewsCount > 0 && (
                      <button onClick={handleMarkAllNewsAsRead} style={headerActionStyle}>Ler todas</button>
                    )}
                  </div>
                  <div style={dropdownBodyStyle}>
                    {noticias.length === 0 ? (
                      <div style={emptyStateStyle}>Nenhuma notificação encontrada.</div>
                    ) : (
                      noticias.map((item) => {
                        const isRead = readNews.includes(item.id);
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleMarkNewsAsRead(item.id)}
                            style={{
                              ...notificationItemStyle,
                              backgroundColor: isRead ? 'transparent' : 'rgba(0, 84, 166, 0.04)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.2rem' }}>
                              {!isRead && <span style={dotStyle} />}
                              <strong style={{ fontSize: '0.82rem', color: '#0f172a' }}>{item.titulo}</strong>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.78rem', color: '#475569', lineHeight: '1.4' }}>
                              {item.conteudo}
                            </p>
                            <small style={{ color: '#94a3b8', fontSize: '0.65rem', marginTop: '0.25rem', display: 'block' }}>
                              {new Date(item.created_at).toLocaleDateString('pt-BR')}
                            </small>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 3. Botão de Menu (Hambúrguer) - Em todas as telas */}
          <div style={{ position: 'relative' }}>
            <button
              id="header-btn-menu-perfil"
              onClick={() => setMenuOpen(true)}
              style={iconButtonStyle}
              title="Menu de Opções"
            >
              <Menu size={20} color="#fff" />
            </button>
          </div>

        </div>
      </header>

      {/* Menu Drawer / Modal */}
      {menuOpen && (
        <div
          onClick={() => {
            setMenuOpen(false);
            setConfirmLogout(false);
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: isDesktop ? 'center' : 'flex-end',
            justifyContent: 'center',
          }}
        >
          {/* Menu Container */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#fff',
              width: '100%',
              maxWidth: isDesktop ? '400px' : '100%',
              borderRadius: isDesktop ? '12px' : '16px 16px 0 0',
              overflow: 'hidden',
              boxShadow: '0 -4px 20px rgba(0,0,0,0.15), 0 4px 20px rgba(0,0,0,0.15)',
              animation: isDesktop ? 'fadeIn 0.2s ease-out' : 'slideUp 0.3s cubic-bezier(0.1, 0.76, 0.55, 0.94)',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              paddingBottom: isDesktop ? '0' : 'env(safe-area-inset-bottom, 1rem)',
            }}
          >
            {/* Header do Menu (Mobile) */}
            {!isDesktop && (
              <div style={{
                height: '4px',
                width: '40px',
                backgroundColor: '#dbdbdb',
                borderRadius: '2px',
                margin: '10px auto 4px',
              }} />
            )}

            <div style={{
              padding: '1.25rem',
              textAlign: 'center',
              borderBottom: '1px solid #dbdbdb',
              fontWeight: 700,
              fontSize: '0.95rem',
              color: '#262626',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ flex: 1, textAlign: 'center', paddingLeft: '24px' }}>Menu de Opções</span>
              <button 
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmLogout(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8e8e8e',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  padding: '4px',
                  fontWeight: 'bold'
                }}
              >
                ×
              </button>
            </div>

            {/* Opções */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              
              {/* Novo Apoiador */}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/apoiadores/novo');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1.1rem 1.5rem',
                  border: 'none',
                  background: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: '#262626',
                  borderBottom: '1px solid #f1f5f9',
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <UserPlus size={18} color="#0054A6" />
                <span>Novo Apoiador</span>
              </button>

              {user?.role === 'admin' && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/perfis');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '1.1rem 1.5rem',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: '#262626',
                    borderBottom: '1px solid #f1f5f9',
                    transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Shield size={18} color="#7c3aed" />
                  <span>Perfis de Acesso</span>
                </button>
              )}


              {/* Sair da Conta */}
              <button
                onClick={async () => {
                  if (!confirmLogout) {
                    setConfirmLogout(true);
                    return;
                  }
                  setMenuOpen(false);
                  setConfirmLogout(false);
                  await logout();
                  toast.success('Até logo!');
                  navigate('/login');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1.1rem 1.5rem',
                  border: 'none',
                  backgroundColor: confirmLogout ? '#fef2f2' : 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: confirmLogout ? '#ef4444' : '#ef4444',
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = confirmLogout ? '#fee2e2' : '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = confirmLogout ? '#fef2f2' : 'transparent'}
              >
                <LogOut size={18} color="#ef4444" />
                <span>{confirmLogout ? 'Confirmar Saída? (Clique de novo)' : 'Sair da Conta'}</span>
              </button>

            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Estilos Inline Premium para Popovers e Chat ──────────────────────────────────
const iconButtonStyle = {
  background: 'none',
  border: 'none',
  padding: '6px',
  cursor: 'pointer',
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '8px',
  transition: 'background-color 0.2s',
  outline: 'none',
};

const badgeStyle = {
  position: 'absolute',
  top: '-2px',
  right: '-2px',
  minWidth: '15px',
  height: '15px',
  borderRadius: '50%',
  backgroundColor: '#ef4444',
  color: '#fff',
  fontSize: '0.62rem',
  fontWeight: 800,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2px',
  boxSizing: 'border-box',
};

const backdropStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 998,
  background: 'transparent',
};

const dropdownStyle = {
  position: 'absolute',
  right: 0,
  top: '36px',
  width: '280px',
  backgroundColor: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: '14px',
  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  zIndex: 999,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  fontFamily: "'Inter', sans-serif",
  animation: 'dropdownFadeIn 0.2s ease-out forwards',
};

const dropdownHeaderStyle = {
  padding: '0.75rem 1rem',
  borderBottom: '1px solid #f1f5f9',
  fontSize: '0.85rem',
  color: '#0f172a',
  backgroundColor: '#fff',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const headerActionStyle = {
  background: 'none',
  border: 'none',
  color: '#0054A6',
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: '0.72rem',
  padding: 0,
};

const dropdownBodyStyle = {
  padding: '0.5rem',
  maxHeight: '300px',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
  boxSizing: 'border-box',
};

const emptyStateStyle = {
  padding: '2rem 1rem',
  color: '#94a3b8',
  fontSize: '0.78rem',
  textAlign: 'center',
};

const notificationItemStyle = {
  padding: '0.65rem 0.85rem',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
  textAlign: 'left',
};

const dotStyle = {
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  backgroundColor: '#0054A6',
  display: 'inline-block',
  flexShrink: 0,
};

const messageItemStyle = {
  padding: '0.75rem 0.85rem',
  backgroundColor: 'rgba(0, 84, 166, 0.03)',
  borderRadius: '10px',
  textAlign: 'left',
  border: '1px solid rgba(0, 84, 166, 0.05)',
};

const contactItemStyle = {
  padding: '0.65rem 0.85rem',
  borderRadius: '8px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  transition: 'background-color 0.2s',
  '&:hover': {
    backgroundColor: '#f8fafc',
  },
};

const backButtonStyle = {
  background: 'none',
  border: 'none',
  color: '#0054A6',
  fontSize: '0.75rem',
  fontWeight: 700,
  cursor: 'pointer',
  padding: '4px 0',
};

const chatBoxStyle = {
  padding: '0.75rem',
  maxHeight: '200px',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  backgroundColor: '#f8fafc',
  boxSizing: 'border-box',
};

const chatBubbleStyle = {
  padding: '0.5rem 0.75rem',
  borderRadius: '12px',
  maxWidth: '75%',
  fontSize: '0.78rem',
  lineHeight: '1.4',
  wordBreak: 'break-word',
  textAlign: 'left',
};

const chatInputWrapStyle = {
  display: 'flex',
  borderTop: '1px solid #e2e8f0',
  padding: '0.5rem',
  backgroundColor: '#fff',
  gap: '0.35rem',
};

const chatInputStyle = {
  flex: 1,
  border: '1px solid #e2e8f0',
  borderRadius: '18px',
  padding: '0.4rem 0.85rem',
  fontSize: '0.78rem',
  outline: 'none',
};

const chatSendButtonStyle = {
  backgroundColor: '#ccf600',
  color: '#0a192f',
  border: 'none',
  borderRadius: '50%',
  width: '28px',
  height: '28px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  flexShrink: 0,
};
