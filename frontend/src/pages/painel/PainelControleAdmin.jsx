import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users, CheckSquare, Megaphone, Download, Shield, Loader2, Calendar, FileText, Send, Image, Trash2, Share2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { copyToClipboard } from '../../utils/clipboard';

// ── Componentes internos ──────────────────────────────────────────────────

// ── Componente Principal ───────────────────────────────────────────────────

export default function PainelControleAdmin() {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [showAvisoModal, setShowAvisoModal] = useState(false);
  const [msgForm, setMsgForm] = useState({ titulo: '', conteudo: '', destinatarios: 'todos', imagem_url: '' });
  const [msgLoading, setMsgLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadPainelData = async () => {
    try {
      setLoading(true);
      const pendingRes = await api.get('/apoiadores?status=pendente&limit=1');
      setPendingCount(pendingRes.data.total || 0);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar dados do painel de controle.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPainelData();
  }, []);

  const handleSendAviso = async (e) => {
    e.preventDefault();
    if (!msgForm.titulo || !msgForm.conteudo) {
      toast.error('Preencha o título e o conteúdo do aviso.');
      return;
    }
    setMsgLoading(true);
    try {
      const res = await api.post('/mensagens', msgForm);
      toast.success(res.data.message || 'Aviso cadastrado e disparado!');
      setMsgForm({ titulo: '', conteudo: '', destinatarios: 'todos', imagem_url: '' });
      setShowAvisoModal(false);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao disparar aviso.');
    } finally {
      setMsgLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione apenas arquivos de imagem.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 10MB.');
      return;
    }

    setUploading(true);
    const toastId = toast.loading('Carregando imagem...');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/noticias/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setMsgForm(prev => ({ ...prev, imagem_url: res.data.url }));
      toast.success('Imagem carregada com sucesso!', { id: toastId });
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.error || 'Erro ao carregar imagem.';
      toast.error(errorMsg, { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handleExportCSV = async () => {
    if (exporting) return;
    setExporting(true);
    const toastId = toast.loading('Preparando exportação de apoiadores...');
    try {
      const response = await api.get('/export/apoiadores', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `apoiadores_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('Banco de dados exportado com sucesso!', { id: toastId });
    } catch (err) {
      toast.error('Erro ao exportar base de apoiadores.', { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  const handleShareLink = async () => {
    const shareUrl = `${window.location.origin}/cadastro`;
    const success = await copyToClipboard(shareUrl);
    if (success) {
      toast.success('Link público de cadastro copiado!');
    } else {
      toast.error('Erro ao copiar. Seu navegador bloqueou a ação.');
    }
  };

  const dataAtualFormatada = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Linha de Boas-Vindas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div className="flex flex-col gap-0.5">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={20} color="var(--primary)" />
            <h1 className="text-xl font-black tracking-tight" style={{ color: 'var(--texto)' }}>
              Painel de Controle
            </h1>
          </div>
          <p className="text-xs flex items-center gap-1 font-medium" style={{ color: 'var(--texto-medio)' }}>
            <Calendar size={12} style={{ color: 'var(--primary)' }} />
            {dataAtualFormatada} • Olá, {user?.nome || 'Admin'}
          </p>
        </div>

        {/* Botões no Cabeçalho */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleShareLink}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(5, 150, 105, 0.08)',
              border: 'none',
              borderRadius: '20px',
              padding: '0.45rem 1rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#059669',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(5, 150, 105, 0.12)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(5, 150, 105, 0.08)'; }}
          >
            <Share2 size={14} />
            <span>Link de Cadastro</span>
          </button>

          {hasPermission('Apoiadores', 'visualizar') && (
            <button
              onClick={handleExportCSV}
              disabled={exporting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'rgba(0, 84, 166, 0.08)',
                border: 'none',
                borderRadius: '20px',
                padding: '0.45rem 1rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--primary)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: exporting ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!exporting) e.currentTarget.style.backgroundColor = 'rgba(0, 84, 166, 0.12)';
              }}
              onMouseLeave={(e) => {
                if (!exporting) e.currentTarget.style.backgroundColor = 'rgba(0, 84, 166, 0.08)';
              }}
            >
              {exporting ? (
                <Loader2 size={14} className="spin" color="var(--primary)" />
              ) : (
                <Download size={14} />
              )}
              <span>Exportar Base</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid de Atalhos Rápidos para Gestão */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '0.5rem' }}>
        
        {/* Fila de Aprovações */}
        {hasPermission('Apoiadores', 'visualizar') && (
          <div 
            onClick={() => navigate('/aprovacoes')}
            className="card cursor-pointer" 
            style={{ 
              padding: '1rem', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              textAlign: 'center',
              gap: '0.5rem',
              border: '1.5px solid var(--borda)',
              transition: 'all 0.2s',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--borda)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {pendingCount > 0 && (
              <span style={{ 
                position: 'absolute', 
                top: '6px', 
                right: '6px', 
                backgroundColor: '#ef4444', 
                color: '#fff', 
                fontSize: '0.65rem', 
                fontWeight: 800, 
                padding: '2px 6px', 
                borderRadius: '99px' 
              }}>
                {pendingCount}
              </span>
            )}
            <CheckSquare size={24} color="var(--primary)" />
            <strong style={{ fontSize: '0.8rem', color: 'var(--texto)' }}>Aprovações</strong>
            <span style={{ fontSize: '0.65rem', color: 'var(--texto-claro)' }}>Aprovar simpatizantes</span>
          </div>
        )}

        {/* Gestão de Equipe */}
        {hasPermission('Equipe', 'visualizar') && (
          <div 
            onClick={() => navigate('/equipe')}
            className="card cursor-pointer" 
            style={{ 
              padding: '1rem', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              textAlign: 'center',
              gap: '0.5rem',
              border: '1.5px solid var(--borda)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--borda)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Users size={24} color="#059669" />
            <strong style={{ fontSize: '0.8rem', color: 'var(--texto)' }}>Gestão de Equipe</strong>
            <span style={{ fontSize: '0.65rem', color: 'var(--texto-claro)' }}>Contas & Acessos</span>
          </div>
        )}

        {/* Perfis de Acesso */}
        {hasPermission('Perfis de Acesso', 'visualizar') && (
          <div 
            onClick={() => navigate('/perfis')}
            className="card cursor-pointer" 
            style={{ 
              padding: '1rem', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              textAlign: 'center',
              gap: '0.5rem',
              border: '1.5px solid var(--borda)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--borda)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Shield size={24} color="#e11d48" />
            <strong style={{ fontSize: '0.8rem', color: 'var(--texto)' }}>Perfis de Acesso</strong>
            <span style={{ fontSize: '0.65rem', color: 'var(--texto-claro)' }}>Regras & Permissões</span>
          </div>
        )}

        {/* Apoiadores */}
        {hasPermission('Apoiadores', 'visualizar') && (
          <div 
            onClick={() => navigate('/apoiadores')}
            className="card cursor-pointer" 
            style={{ 
              padding: '1rem', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              textAlign: 'center',
              gap: '0.5rem',
              border: '1.5px solid var(--borda)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--borda)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Users size={24} color="#0054A6" />
            <strong style={{ fontSize: '0.8rem', color: 'var(--texto)' }}>Apoiadores</strong>
            <span style={{ fontSize: '0.65rem', color: 'var(--texto-claro)' }}>Base de cadastrados</span>
          </div>
        )}

        {/* Materiais de Campanha */}
        {hasPermission('Materiais', 'visualizar') && (
          <div 
            onClick={() => navigate('/central-coordenador?tab=materiais')}
            className="card cursor-pointer" 
            style={{ 
              padding: '1rem', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              textAlign: 'center',
              gap: '0.5rem',
              border: '1.5px solid var(--borda)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--borda)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <FileText size={24} color="#7c3aed" />
            <strong style={{ fontSize: '0.8rem', color: 'var(--texto)' }}>Materiais de Campanha</strong>
            <span style={{ fontSize: '0.65rem', color: 'var(--texto-claro)' }}>Adicionar artes e links</span>
          </div>
        )}

        {/* Avisos (Pop-up) */}
        {hasPermission('Mensagens', 'criar') && (
          <div 
            onClick={() => setShowAvisoModal(true)}
            className="card cursor-pointer" 
            style={{ 
              padding: '1rem', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              textAlign: 'center',
              gap: '0.5rem',
              border: '1.5px solid var(--borda)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--borda)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Megaphone size={24} color="#d97706" />
            <strong style={{ fontSize: '0.8rem', color: 'var(--texto)' }}>Avisos (Pop-up)</strong>
            <span style={{ fontSize: '0.65rem', color: 'var(--texto-claro)' }}>Disparar avisos pop-up</span>
          </div>
        )}



      </div>


      {showAvisoModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 8, 20, 0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem',
            boxSizing: 'border-box'
          }}
        >
          <div 
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 40px rgba(0, 30, 80, 0.25)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid rgba(0, 0, 0, 0.05)',
              animation: 'modalBounceIn 0.3s ease-out'
            }}
          >
            <div style={{ height: '6px', background: 'linear-gradient(90deg, #d97706 0%, #f59e0b 100%)' }} />
            
            <div style={{ padding: '1.75rem 1.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--texto)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Megaphone size={20} color="#d97706" />
                Disparar Aviso Pop-up
              </h3>
              <button 
                onClick={() => {
                  setShowAvisoModal(false);
                  setMsgForm({ titulo: '', conteudo: '', destinatarios: 'todos', imagem_url: '' });
                }}
                style={{ background: 'none', border: 'none', fontSize: '1.35rem', cursor: 'pointer', color: 'var(--texto-medio)', fontWeight: 'bold' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSendAviso} style={{ padding: '0 1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Destinatários (Público-alvo)</label>
                <select
                  value={msgForm.destinatarios}
                  onChange={(e) => setMsgForm(prev => ({ ...prev, destinatarios: e.target.value }))}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.88rem', backgroundColor: '#fff', outline: 'none' }}
                >
                  <option value="todos">Todos os Multiplicadores</option>
                  <option value="mobilizadores">Apenas Mobilizadores (1 a 10 indicações)</option>
                  <option value="lideres">Apenas Líderes de Base (11+ indicações)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Título do Aviso *</label>
                <input
                  type="text"
                  placeholder="Ex: Reunião geral hoje às 20h"
                  value={msgForm.titulo}
                  onChange={(e) => setMsgForm(prev => ({ ...prev, titulo: e.target.value }))}
                  required
                  style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Campo de Imagem do Aviso */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Imagem do Aviso (Opcional)</label>
                {msgForm.imagem_url ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.5rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', backgroundColor: '#f8fafc' }}>
                    <img 
                      src={msgForm.imagem_url} 
                      alt="Miniatura" 
                      style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1' }} 
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '0.75rem', color: '#475569', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        Imagem anexada
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMsgForm(prev => ({ ...prev, imagem_url: '' }))}
                      style={{
                        padding: '0.4rem',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#ef4444',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <input
                      type="file"
                      accept="image/*"
                      id="aviso-file-input"
                      onChange={handleImageUpload}
                      disabled={uploading}
                      style={{ display: 'none' }}
                    />
                    <label
                      htmlFor="aviso-file-input"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '0.65rem 0.85rem',
                        border: '1.5px dashed #cbd5e1',
                        borderRadius: '10px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: '#64748b',
                        backgroundColor: '#f8fafc',
                        cursor: uploading ? 'not-allowed' : 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!uploading) {
                          e.currentTarget.style.borderColor = 'var(--primary)';
                          e.currentTarget.style.backgroundColor = 'rgba(0, 84, 166, 0.02)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!uploading) {
                          e.currentTarget.style.borderColor = '#cbd5e1';
                          e.currentTarget.style.backgroundColor = '#f8fafc';
                        }
                      }}
                    >
                      {uploading ? (
                        <>
                          <Loader2 size={16} className="spin" color="var(--primary)" />
                          <span>Enviando imagem...</span>
                        </>
                      ) : (
                        <>
                          <Image size={16} color="var(--primary)" />
                          <span>Anexar Imagem</span>
                        </>
                      )}
                    </label>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Conteúdo da Mensagem *</label>
                <textarea
                  placeholder="Esta mensagem aparecerá como um pop-up de tela cheia na entrada do app para os destinatários selecionados."
                  rows={4}
                  value={msgForm.conteudo}
                  onChange={(e) => setMsgForm(prev => ({ ...prev, conteudo: e.target.value }))}
                  required
                  style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.88rem', outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAvisoModal(false);
                    setMsgForm({ titulo: '', conteudo: '', destinatarios: 'todos', imagem_url: '' });
                  }}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={msgLoading || uploading}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#d97706',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(217, 119, 6, 0.2)',
                    opacity: (msgLoading || uploading) ? 0.7 : 1
                  }}
                >
                  {msgLoading ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
                  <span>Disparar pop-up</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
