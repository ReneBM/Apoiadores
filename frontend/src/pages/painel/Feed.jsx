import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getMediaUrl } from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import {
  Heart, MessageCircle, Share2, Film, Grid, Loader2, Menu, LogOut, UserPlus, CheckSquare, Megaphone, Plus, Upload, X, Image, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

const isVideoUrl = (url) => {
  if (!url) return false;
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.quicktime'];
  return videoExtensions.some(ext => url.toLowerCase().endsWith(ext)) || url.toLowerCase().includes('.mp4') || url.toLowerCase().includes('.webm') || url.toLowerCase().includes('.mov') || url.toLowerCase().includes('.avi');
};

export default function FeedPerfil() {
  const { user, logout, canManageAll } = useAuth();
  const navigate = useNavigate();
  const [noticias, setNoticias] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [likes, setLikes] = useState({});
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [selectedPost, setSelectedPost] = useState(null);
  
  const [activeSubTab, setActiveSubTab] = useState('posts'); // 'posts' or 'videos'
  const isDesktop = false;
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [newsForm, setNewsForm] = useState({ titulo: '', conteudo: '', imagem_url: '', antecipada: false });
  const [newsLoading, setNewsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const loadFeed = async () => {
    try {
      setLoading(true);
      const res = await api.get('/noticias');
      setNoticias(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar o feed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (id) => {
    if (!window.confirm('Tem certeza de que deseja excluir esta publicação?')) return;
    try {
      await api.delete(`/noticias/${id}`);
      toast.success('Publicação excluída com sucesso!');
      loadFeed();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir a publicação.');
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  useEffect(() => {
    if (noticias.length > 0) {
      const initialLikes = {};
      const initialComments = {};

      noticias.forEach((news) => {
        initialLikes[news.id] = {
          liked: false,
          count: 0
        };
        initialComments[news.id] = [];
      });

      setLikes(initialLikes);
      setComments(initialComments);
    }
  }, [noticias]);

  const toggleLike = (newsId) => {
    setLikes((prev) => {
      const current = prev[newsId] || { liked: false, count: 0 };
      const liked = !current.liked;
      const count = liked ? current.count + 1 : current.count - 1;
      return {
        ...prev,
        [newsId]: { liked, count }
      };
    });
  };

  const handleAddComment = (newsId) => {
    const text = newComment[newsId]?.trim();
    if (!text) return;

    setComments((prev) => {
      const current = prev[newsId] || [];
      return {
        ...prev,
        [newsId]: [...current, { name: user?.nome || 'Você', text }]
      };
    });

    setNewComment((prev) => ({
      ...prev,
      [newsId]: ''
    }));
  };

  const handleShareWhatsApp = (text, url) => {
    const referralLink = `${window.location.origin}/cadastro?ref=${user?.id || ''}`;
    const message = encodeURIComponent(`${text}\n\n${url || referralLink}`);
    window.open(`https://api.whatsapp.com/send?text=${message}`, '_blank');
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('O arquivo é muito grande. O limite máximo é de 50MB.');
      return;
    }

    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'avi', 'webm'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      toast.error('Tipo de arquivo não suportado. Envie imagens ou vídeos.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/noticias/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setNewsForm(prev => ({ ...prev, imagem_url: res.data.url }));
      toast.success('Mídia carregada com sucesso!');
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Erro ao carregar mídia.';
      toast.error(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const handleCreateNews = async (e) => {
    e.preventDefault();
    if (!newsForm.titulo || !newsForm.conteudo) {
      toast.error('Título e Legenda são obrigatórios.');
      return;
    }
    setNewsLoading(true);
    try {
      const res = await api.post('/noticias', newsForm);
      toast.success('Publicação realizada com sucesso!');
      setNoticias((prev) => [res.data, ...prev]);
      setNewsForm({ titulo: '', conteudo: '', imagem_url: '', antecipada: false });
      setCreatePostOpen(false);
    } catch (err) {
      toast.error('Erro ao realizar a publicação.');
    } finally {
      setNewsLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '2rem', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 className="spin" size={36} color="var(--primary)" />
        <span style={{ fontSize: '0.85rem', color: 'var(--texto-medio)' }}>Carregando perfil do senador...</span>
      </div>
    );
  }

  return (
    <>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: isDesktop ? '2rem 1rem' : '0 0 2rem 0', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
      
      {/* Create post button for admins */}
      {canManageAll && (
        <div style={{ marginBottom: '1rem', padding: '0 1rem' }}>
          <button
            onClick={() => setCreatePostOpen(true)}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              backgroundColor: 'var(--primary)',
              color: '#fff',
              border: 'none',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: 'pointer'
            }}
          >
            <Plus size={18} /> Nova Publicação
          </button>
        </div>
      )}

      {/* Feed Instagram Style */}
      {noticias.length === 0 ? (
        <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#8e8e8e' }}>
          <Grid size={44} style={{ margin: '0 auto 1rem', strokeWidth: 1 }} />
          <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600, color: '#262626' }}>Nenhuma publicação disponível</h3>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isDesktop ? '2rem' : '1rem' }}>
          {noticias.map((news) => {
            const postLikes = likes[news.id] || { liked: false, count: 0 };
            const postComments = comments[news.id] || [];
            const commentText = newComment[news.id] || '';

            return (
              <div key={news.id} style={{ 
                backgroundColor: '#fff', 
                border: isDesktop ? '1px solid #dbdbdb' : 'none', 
                borderBottom: !isDesktop ? '1px solid #dbdbdb' : '1px solid #dbdbdb',
                borderRadius: isDesktop ? '8px' : '0',
                paddingBottom: '1rem'
              }}>
                {/* Post Header */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '14px', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(45deg, #f99f1b, #d82d7e, #962fbf, #4f5bd5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#fff', border: '1.5px solid #fff', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img 
                        src={getMediaUrl('/uploads/foto3_nobg.png')} 
                        alt="Senador Styveson Valim"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#262626', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      styvensonvalim 
                      <span style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px', backgroundColor: '#0095f6', color: '#fff', borderRadius: '50%' }}>✓</span>
                    </span>
                    {news.antecipada && <span style={{ fontSize: '12px', color: '#8e8e8e' }}>Exclusivo para Líderes</span>}
                  </div>
                  {canManageAll && (
                    <button
                      onClick={() => handleDeletePost(news.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>

                {/* Media */}
                <div style={{ width: '100%', backgroundColor: '#000', display: 'flex', justifyContent: 'center' }}>
                  {news.imagem_url ? (
                    isVideoUrl(news.imagem_url) ? (
                      <video src={getMediaUrl(news.imagem_url)} controls playsInline style={{ width: '100%', maxHeight: '600px', objectFit: 'contain' }} />
                    ) : (
                      <img src={getMediaUrl(news.imagem_url)} alt={news.titulo} style={{ width: '100%', maxHeight: '600px', objectFit: 'contain' }} />
                    )
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '1/1', background: 'linear-gradient(135deg, #002855 0%, #0054A6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                      <h3 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 800, textAlign: 'center' }}>{news.titulo}</h3>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '10px' }}>
                    <button onClick={() => toggleLike(news.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                      <Heart size={26} color={postLikes.liked ? '#ed4956' : '#262626'} fill={postLikes.liked ? '#ed4956' : 'none'} />
                    </button>
                    <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }} onClick={() => document.getElementById(`comment-${news.id}`).focus()}>
                      <MessageCircle size={26} color="#262626" />
                    </button>
                    <button onClick={() => handleShareWhatsApp(news.titulo, news.imagem_url)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                      <Share2 size={26} color="#262626" />
                    </button>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#262626', marginBottom: '8px' }}>
                    {postLikes.count.toLocaleString()} curtidas
                  </div>

                  {/* Caption */}
                  <div style={{ fontSize: '14px', color: '#262626', lineHeight: '1.5', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 600, marginRight: '6px' }}>styvensonvalim</span>
                    {news.conteudo}
                  </div>

                  {/* Comments */}
                  {postComments.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      {postComments.slice(0, 3).map((comm, idx) => (
                        <div key={idx} style={{ fontSize: '14px', marginBottom: '4px' }}>
                          <strong style={{ color: '#262626', marginRight: '6px' }}>{comm.name}</strong>
                          <span style={{ color: '#262626' }}>{comm.text}</span>
                        </div>
                      ))}
                      {postComments.length > 3 && (
                        <span style={{ color: '#8e8e8e', fontSize: '14px', cursor: 'pointer' }}>
                          Ver todos os {postComments.length} comentários
                        </span>
                      )}
                    </div>
                  )}

                  <div style={{ fontSize: '10px', color: '#8e8e8e', textTransform: 'uppercase', marginTop: '10px' }}>
                    {new Date(news.created_at || Date.now()).toLocaleDateString('pt-BR')}
                  </div>
                </div>

                {/* Add comment */}
                <div style={{ borderTop: '1px solid #efefef', padding: '10px 14px', display: 'flex', alignItems: 'center' }}>
                  <input 
                    id={`comment-${news.id}`}
                    type="text" 
                    placeholder="Adicione um comentário..." 
                    value={commentText}
                    onChange={(e) => setNewComment(prev => ({ ...prev, [news.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(news.id); }}
                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: '14px', color: '#262626' }}
                  />
                  <button 
                    onClick={() => handleAddComment(news.id)}
                    disabled={!commentText.trim()}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: '#0095f6', 
                      fontWeight: 600, 
                      fontSize: '14px', 
                      cursor: commentText.trim() ? 'pointer' : 'default',
                      opacity: commentText.trim() ? 1 : 0.5 
                    }}
                  >
                    Publicar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>

      {/* Modal de Criação de Postagem (Instagram Style) */}
      {createPostOpen && (
        <div
          onClick={() => {
            if (!newsLoading && !uploading) setCreatePostOpen(false);
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem',
            boxSizing: 'border-box'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 15px 40px rgba(0,0,0,0.3)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            {/* Header do Modal */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem 1.25rem',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>Nova Publicação</span>
              <button
                onClick={() => setCreatePostOpen(false)}
                disabled={newsLoading || uploading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateNews} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', padding: '1.25rem', gap: '1rem', boxSizing: 'border-box' }}>
              
              {/* Título */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', textAlign: 'left' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Título da Publicação</label>
                <input
                  type="text"
                  placeholder="Escreva um título impactante..."
                  value={newsForm.titulo}
                  onChange={(e) => setNewsForm(prev => ({ ...prev, titulo: e.target.value }))}
                  disabled={newsLoading || uploading}
                  required
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '0.6rem 0.8rem',
                    fontSize: '0.88rem',
                    outline: 'none',
                    backgroundColor: '#fff',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                />
              </div>

              {/* Legenda/Conteúdo */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', textAlign: 'left' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Legenda / Conteúdo</label>
                <textarea
                  placeholder="Escreva a legenda detalhada da publicação aqui..."
                  value={newsForm.conteudo}
                  onChange={(e) => setNewsForm(prev => ({ ...prev, conteudo: e.target.value }))}
                  disabled={newsLoading || uploading}
                  required
                  rows={4}
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '0.6rem 0.8rem',
                    fontSize: '0.88rem',
                    outline: 'none',
                    backgroundColor: '#fff',
                    resize: 'none',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                />
              </div>

              {/* Upload de Mídia (Imagens/Vídeos) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', textAlign: 'left' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Mídia (Foto ou Vídeo)</label>
                
                {!newsForm.imagem_url ? (
                  /* Área de Drop */
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    style={{
                      border: dragActive ? '2px dashed var(--primary)' : '2px dashed #cbd5e1',
                      borderRadius: '8px',
                      padding: '2rem 1rem',
                      textAlign: 'center',
                      backgroundColor: dragActive ? 'rgba(0,84,166,0.03)' : '#f8fafc',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                  >
                    <input
                      type="file"
                      id="file-upload-input-feed"
                      accept="image/*,video/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(e.target.files[0]);
                        }
                      }}
                      disabled={newsLoading || uploading}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer'
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', pointerEvents: 'none' }}>
                      {uploading ? (
                        <>
                          <Loader2 className="spin" size={28} color="var(--primary)" />
                          <span style={{ fontSize: '0.8rem', color: 'var(--texto-medio)' }}>Enviando arquivo...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={28} color="#94a3b8" />
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                            Arraste uma mídia ou clique para selecionar
                          </span>
                          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                            Imagens ou vídeos de até 50MB
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Pré-visualização de mídia carregada */
                  <div style={{
                    position: 'relative',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#000',
                    aspectRatio: '16/9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {isVideoUrl(newsForm.imagem_url) ? (
                      <video
                        src={newsForm.imagem_url}
                        controls
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <img
                        src={newsForm.imagem_url}
                        alt="Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    )}
                    
                    {/* Botão de Remover Mídia */}
                    <button
                      type="button"
                      onClick={() => setNewsForm(prev => ({ ...prev, imagem_url: '' }))}
                      disabled={newsLoading || uploading}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.6)'}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Checkbox: Comunicado Antecipado */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <input
                  type="checkbox"
                  id="feed-input-antecipada"
                  checked={newsForm.antecipada}
                  onChange={(e) => setNewsForm(prev => ({ ...prev, antecipada: e.target.checked }))}
                  disabled={newsLoading || uploading}
                  style={{
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer',
                    accentColor: 'var(--primary)'
                  }}
                />
                <label htmlFor="feed-input-antecipada" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', cursor: 'pointer', userSelect: 'none' }}>
                  Liberar antecipadamente para Líderes de Base
                </label>
              </div>

              {/* Botões de Ação */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setCreatePostOpen(false)}
                  disabled={newsLoading || uploading}
                  style={{
                    padding: '0.55rem 1.25rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#fff',
                    color: '#475569',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={newsLoading || uploading}
                  style={{
                    padding: '0.55rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--primary)',
                    color: '#fff',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: 'var(--sombra-sm)',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-light)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--primary)'}
                >
                  {newsLoading ? (
                    <>
                      <Loader2 className="spin" size={14} />
                      <span>Publicando...</span>
                    </>
                  ) : (
                    <span>Publicar</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </>
  );
}
