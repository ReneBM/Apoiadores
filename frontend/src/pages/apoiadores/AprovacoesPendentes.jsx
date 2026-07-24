import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Loader2, Check, X, Search, Calendar, MapPin, User, Mail, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AprovacoesPendentes() {
  const [apoiadores, setApoiadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState({});
  const [search, setSearch] = useState('');
  const [cidade, setCidade] = useState('');
  const [cidades, setCidades] = useState([]);

  const fetchPendentes = async () => {
    try {
      setLoading(true);
      const res = await api.get('/apoiadores', {
        params: {
          status: 'pendente',
          busca: search,
          cidade: cidade,
          limit: 100,
        },
      });
      setApoiadores(res.data.data || []);
    } catch (err) {
      toast.error('Erro ao buscar cadastros pendentes.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCidades = async () => {
    try {
      const res = await api.get('/apoiadores/cidades');
      setCidades(res.data || []);
    } catch (err) {
      // Ignora silenciosamente
    }
  };

  useEffect(() => {
    fetchPendentes();
  }, [search, cidade]);

  useEffect(() => {
    fetchCidades();
  }, []);

  const handleApprove = async (id, nome) => {
    setSubmitting((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await api.put(`/apoiadores/${id}/aprovar`);
      toast.success(`Apoiador "${nome}" aprovado com sucesso!`);
      if (res.data.userCreated) {
        toast.success('Conta de acesso criada. Senha temporária: SV@12345', { duration: 6000 });
      }
      setApoiadores((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao aprovar cadastro.');
    } finally {
      setSubmitting((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleReject = async (id, nome) => {
    if (!window.confirm(`Deseja realmente recusar o cadastro de ${nome}? Isso irá excluir permanentemente o registro.`)) {
      return;
    }
    setSubmitting((prev) => ({ ...prev, [id]: true }));
    try {
      await api.delete(`/apoiadores/${id}`);
      toast.success('Cadastro recusado e removido.');
      setApoiadores((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      toast.error('Erro ao recusar cadastro.');
    } finally {
      setSubmitting((prev) => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto' }}>
      {/* Filtros */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Buscar por nome ou celular..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 1rem 0.6rem 2.5rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '0.9rem',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <select
          value={cidade}
          onChange={(e) => setCidade(e.target.value)}
          style={{
            padding: '0.6rem 1rem',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            fontSize: '0.9rem',
            backgroundColor: '#fff',
            cursor: 'pointer',
          }}
        >
          <option value="">Todas as Cidades</option>
          {cidades.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader2 size={36} className="spin" color="#0054A6" />
        </div>
      ) : apoiadores.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <User size={48} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ color: '#0f172a', fontWeight: 700, margin: '0 0 0.5rem' }}>Nenhum cadastro pendente</h3>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>Tudo atualizado! Todos os apoiadores já foram revisados.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {apoiadores.map((apoiador) => (
            <div
              key={apoiador.id}
              style={{
                background: '#fff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                padding: '1.25rem',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              {/* Nome + Data */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>{apoiador.nome}</h3>
                  {apoiador.multiplicador_nome && (
                    <small style={{ color: '#0054A6', fontWeight: 600, display: 'block' }}>
                      Indicado por: {apoiador.multiplicador_nome}
                    </small>
                  )}
                  {apoiador.origem && (
                    <div style={{ marginTop: '4px' }}>
                      <span style={{ fontWeight: 700, background: 'rgba(0,84,166,0.08)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', textTransform: 'uppercase', color: '#0054A6' }}>
                        Origem: {apoiador.origem}
                      </span>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#64748b', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                  <Calendar size={12} />
                  <span>{new Date(apoiador.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>

              {/* Detalhes */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Phone size={14} color="#94a3b8" />
                  <span>{apoiador.telefone || 'Sem telefone'}</span>
                </div>
                {apoiador.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                    <Mail size={14} color="#94a3b8" style={{ flexShrink: 0 }} />
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{apoiador.email}</span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MapPin size={14} color="#94a3b8" />
                  <span>{apoiador.cidade}{apoiador.bairro ? ` - ${apoiador.bairro}` : ''}</span>
                </div>
              </div>

              {/* Ações */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                <button
                  disabled={submitting[apoiador.id]}
                  onClick={() => handleApprove(apoiador.id, apoiador.nome)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '0.5rem',
                    backgroundColor: '#ccf600',
                    color: '#0a192f',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {submitting[apoiador.id] ? (
                    <Loader2 size={16} className="spin" />
                  ) : (
                    <>
                      <Check size={16} strokeWidth={2.5} />
                      <span>Aprovar</span>
                    </>
                  )}
                </button>
                <button
                  disabled={submitting[apoiador.id]}
                  onClick={() => handleReject(apoiador.id, apoiador.nome)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.5rem 1rem',
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    border: '1px solid #fca5a5',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
