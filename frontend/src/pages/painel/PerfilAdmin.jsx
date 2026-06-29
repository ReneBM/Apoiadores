import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Grid, Film, Plus, X, Heart, MessageCircle, Share2, Loader2, Upload, LogOut, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getMediaUrl } from '../../api/axios';

export default function PerfilAdmin() {
  const { user, logout } = useAuth();
  const [noticias, setNoticias] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals & States
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('posts');
  
  // Likes & Comments local state (mock)
  const [likes, setLikes] = useState({});
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState({});

  // Form states
  const [newsForm, setNewsForm] = useState({ titulo: '', conteudo: '', imagem_url: '', antecipada: false });
  const [newsLoading, setNewsLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [stats, setStats] = useState({ totalApoiadores: 0, totalMultiplicadores: 0 });

  const isDesktop = false;
  const canManageAll = user?.role === 'admin';

  useEffect(() => {
    fetchNoticias();
  }, []);

  const fetchNoticias = async () => {
    try {
      setLoading(true);

      if (user?.role === 'admin' || user?.role === 'coordenador') {
        try {
          const statsRes = await api.get('/dashboard/admin');
          setStats({
            totalApoiadores: statsRes.data?.kpis?.totalApoiadores || 0,
            totalMultiplicadores: statsRes.data?.kpis?.totalMultiplicadores || 0
          });
        } catch (e) {
          console.error(e);
        }
      }

      const res = await api.get('/noticias');
      setNoticias(res.data);
      
      const initialLikes = {};
      const initialComments = {};
      res.data.forEach(n => {
        initialLikes[n.id] = { liked: false, count: 0 };
        initialComments[n.id] = [];
      });
      setLikes(initialLikes);
      setComments(initialComments);
    } catch (err) {
      toast.error('Erro ao buscar publicações.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (id) => {
    if (!window.confirm('Tem certeza de que deseja excluir esta publicação?')) return;
    try {
      await api.delete(`/noticias/${id}`);
      toast.success('Publicação excluída!');
      setSelectedPost(null);
      fetchNoticias();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir publicação.');
    }
  };

  const isVideoUrl = (url) => url && url.match(/\.(mp4|webm|ogg)$/i);

  const toggleLike = (id) => {
    setLikes(prev => {
      const current = prev[id];
      return {
        ...prev,
        [id]: {
          liked: !current.liked,
          count: current.liked ? current.count - 1 : current.count + 1
        }
      };
    });
  };

  const handleAddComment = (id) => {
    const text = newComment[id];
    if (!text || !text.trim()) return;
    
    setComments(prev => ({
      ...prev,
      [id]: [...(prev[id] || []), { name: 'meu_usuario', text: text.trim() }]
    }));
    setNewComment(prev => ({ ...prev, [id]: '' }));
    toast.success('Comentário adicionado!');
  };

  const handleShareWhatsApp = (titulo, url) => {
    const text = `Confira essa publicação: *${titulo}*\n${url || ''}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
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

  const videosList = noticias.filter(n => n.imagem_url && isVideoUrl(n.imagem_url));
  const activeList = activeSubTab === 'videos' ? videosList : noticias;

  return (
    <div style={{ maxWidth: '935px', margin: '0 auto', padding: isDesktop ? '2rem 1rem' : '1rem 0.5rem', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
      
      {/* 1. Header do Perfil (Instagram Style) */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: isDesktop ? '3rem' : '1.5rem', 
        paddingBottom: '2.5rem', 
        borderBottom: '1px solid #dbdbdb',
        marginBottom: '1rem',
        textAlign: 'left'
      }}>
        
        {/* Avatar */}
        <div style={{
          padding: '4px',
          borderRadius: '50%',
          background: 'linear-gradient(45deg, #f99f1b, #d82d7e, #962fbf, #4f5bd5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <div style={{
            width: isDesktop ? '140px' : '76px',
            height: isDesktop ? '140px' : '76px',
            borderRadius: '50%',
            backgroundColor: '#ccf600',
            color: '#002855',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isDesktop ? '3.2rem' : '1.8rem',
            fontWeight: 900,
            border: '4px solid #fff',
          }}>
            TS
          </div>
        </div>

        {/* Bio & Stats Info */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#002855' }}>Tô com Styvenson</h2>
            {canManageAll && (
              <button
                onClick={() => setCreatePostOpen(true)}
                id="feed-btn-nova-publicacao"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'var(--primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '0.45rem 1rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: 'var(--sombra-sm)',
                  transition: 'background-color 0.2s',
                }}
              >
                <Plus size={14} />
                <span>Nova Publicação</span>
              </button>
            )}
          </div>

          {/* Stats count (desktop only) */}
          {isDesktop && (
            <div style={{ display: 'flex', gap: '2.5rem', marginBottom: '0px', fontSize: '0.95rem', color: '#262626' }}>
              <span><strong>{noticias.length}</strong> publicações</span>
              <span><strong>{stats.totalApoiadores}</strong> voluntários</span>
              <span><strong>{stats.totalMultiplicadores}</strong> coordenadores</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats counts for mobile */}
      {!isDesktop && (
        <div style={{ display: 'flex', justifyContent: 'space-around', padding: '0.75rem 0', borderBottom: '1px solid #dbdbdb', fontSize: '0.82rem', color: '#262626', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <strong>{noticias.length}</strong>
            <span style={{ color: '#8e8e8e' }}>posts</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <strong>{stats.totalApoiadores}</strong>
            <span style={{ color: '#8e8e8e' }}>voluntários</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <strong>{stats.totalMultiplicadores}</strong>
            <span style={{ color: '#8e8e8e' }}>líderes</span>
          </div>
        </div>
      )}

      {/* 2. Sub-Abas (Grid vs Videos) */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', borderTop: isDesktop ? 'none' : '1px solid #dbdbdb', paddingBottom: '1rem' }}>
        <button
          onClick={() => setActiveSubTab('posts')}
          style={{
            background: 'none',
            border: 'none',
            borderTop: activeSubTab === 'posts' ? '1px solid #262626' : '1px solid transparent',
            marginTop: '-1px',
            padding: '12px 0',
            color: activeSubTab === 'posts' ? '#262626' : '#8e8e8e',
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Grid size={14} />
          <span>Publicações</span>
        </button>
        <button
          onClick={() => setActiveSubTab('videos')}
          style={{
            background: 'none',
            border: 'none',
            borderTop: activeSubTab === 'videos' ? '1px solid #262626' : '1px solid transparent',
            marginTop: '-1px',
            padding: '12px 0',
            color: activeSubTab === 'videos' ? '#262626' : '#8e8e8e',
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Film size={14} />
          <span>Vídeos</span>
        </button>
      </div>

      {/* 3. Grid de Mídias */}
      {activeList.length === 0 ? (
        <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#8e8e8e' }}>
          <Grid size={44} style={{ margin: '0 auto 1rem', strokeWidth: 1 }} />
          <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600, color: '#262626' }}>Nenhuma publicação disponível</h3>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isDesktop ? '28px' : '4px' }}>
          {activeList.map((news) => (
            <div
              key={news.id}
              onClick={() => setSelectedPost(news)}
              style={{
                position: 'relative',
                width: '100%',
                paddingBottom: '100%',
                overflow: 'hidden',
                backgroundColor: '#f1f5f9',
                cursor: 'pointer',
                borderRadius: isDesktop ? '12px' : '6px',
                boxShadow: '0 4px 10px rgba(0,0,0,0.02)',
                transition: 'all 0.25s ease',
                border: '1px solid #dbdbdb'
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                {news.imagem_url ? (
                  isVideoUrl(news.imagem_url) ? (
                    <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#000' }}>
                      <video
                        src={getMediaUrl(news.imagem_url)}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        muted
                      />
                      <div style={{ position: 'absolute', top: '8px', right: '8px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Film size={12} />
                      </div>
                    </div>
                  ) : (
                    <img
                      src={getMediaUrl(news.imagem_url)}
                      alt={news.titulo}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #002855 0%, #0054A6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.75rem',
                    boxSizing: 'border-box',
                    textAlign: 'center',
                  }}>
                    <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', lineHeight: '1.4' }}>
                      {news.titulo}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Modal (Instagram Style Details Popup) */}
      {selectedPost && (() => {
        const news = selectedPost;
        const postLikes = likes[news.id] || { liked: false, count: 0 };
        const postComments = comments[news.id] || [];
        const commentText = newComment[news.id] || '';

        return (
          <div 
            onClick={() => setSelectedPost(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(5px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '1rem',
              boxSizing: 'border-box',
            }}
          >
            {/* Modal Body */}
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: '#fff',
                borderRadius: '16px',
                width: '100%',
                maxWidth: isDesktop ? '850px' : '450px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: isDesktop ? 'row' : 'column',
                overflow: 'hidden',
                boxShadow: '0 15px 40px rgba(0,0,0,0.3)',
              }}
            >
              {/* Media Section */}
              <div style={{ 
                flex: 1.2, 
                backgroundColor: '#000', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                aspectRatio: '1/1',
                maxHeight: isDesktop ? '600px' : '400px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                {news.imagem_url ? (
                  isVideoUrl(news.imagem_url) ? (
                    <video
                      src={getMediaUrl(news.imagem_url)}
                      controls
                      autoPlay
                      playsInline
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <img
                      src={getMediaUrl(news.imagem_url)}
                      alt={news.titulo}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  )
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #002855 0%, #0054A6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem',
                    boxSizing: 'border-box',
                    textAlign: 'center',
                  }}>
                    <h3 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                      {news.titulo}
                    </h3>
                  </div>
                )}
              </div>

              {/* Detail Section */}
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                maxHeight: isDesktop ? '600px' : '380px',
                backgroundColor: '#fff'
              }}>
                
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{
                      padding: '2px',
                      borderRadius: '50%',
                      background: 'linear-gradient(45deg, #f99f1b, #d82d7e, #962fbf, #4f5bd5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: '#ccf600',
                        color: '#002855',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.65rem',
                        fontWeight: 900,
                        border: '2px solid #fff',
                      }}>
                        TS
                      </div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', display: 'block' }}>styvensonvalim</span>
                      <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                        {news.antecipada ? 'Exclusivo' : 'Oficial'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                        <Trash2 size={16} />
                      </button>
                    )}
                    <button 
                      onClick={() => setSelectedPost(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--texto-medio)',
                        cursor: 'pointer',
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        padding: '4px'
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Body legend and comments */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.82rem', marginRight: '0.4rem' }}>styvensonvalim</span>
                    <strong style={{ display: 'block', margin: '0.2rem 0', color: '#0054A6', fontSize: '0.85rem' }}>{news.titulo}</strong>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#1e293b', lineHeight: '1.4' }}>{news.conteudo}</p>
                  </div>
                  
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--texto-claro)', display: 'block', marginBottom: '0.5rem' }}>Comentários ({postComments.length})</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {postComments.map((comment, index) => (
                        <div key={index} style={{ fontSize: '0.78rem', color: '#334155' }}>
                          <strong style={{ color: '#0f172a', marginRight: '0.35rem' }}>{comment.name.split(' ')[0]}</strong>
                          {comment.text}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions & Comment Input Form */}
                <div style={{ borderTop: '1px solid #f1f5f9', padding: '0.75rem 1rem', backgroundColor: '#fafafa' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <button
                        onClick={() => toggleLike(news.id)}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        <Heart
                          size={20}
                          color={postLikes.liked ? '#ef4444' : '#27272a'}
                          fill={postLikes.liked ? '#ef4444' : 'none'}
                        />
                      </button>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--texto)' }}>{postLikes.count} curtidas</span>
                    </div>
                    <button
                      onClick={() => handleShareWhatsApp(
                        `Confira o comunicado oficial no app "Tô com Styvenson": *${news.titulo}*\n\n${news.conteudo}\n\n`,
                        null
                      )}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <Share2 size={18} color="#27272a" />
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Adicione um comentário..."
                      value={commentText}
                      onChange={(e) => setNewComment((prev) => ({ ...prev, [news.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddComment(news.id);
                      }}
                      style={{
                        flex: 1,
                        border: '1px solid #e2e8f0',
                        borderRadius: '16px',
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.75rem',
                        outline: 'none',
                        backgroundColor: '#fff'
                      }}
                    />
                    <button
                      onClick={() => handleAddComment(news.id)}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#0054A6',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Publicar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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

    </div>
  );
}
