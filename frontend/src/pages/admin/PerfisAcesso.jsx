import { useState, useEffect } from 'react';
import { Shield, Plus, Edit2, Trash2, Check, X, ShieldAlert, CheckSquare, Square } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const FUNC_ACTIONS = {
  'Apoiadores': ['visualizar', 'criar', 'editar', 'excluir'],
  'Apoiadores - Aprovar Cadastros': ['visualizar', 'editar'],
  'Apoiadores - Exportar Base': ['visualizar'],
  'Equipe': ['visualizar', 'criar', 'editar', 'excluir'],
  'Perfis de Acesso': ['visualizar', 'criar', 'editar', 'excluir'],
  'Feed de Notícias': ['visualizar', 'criar', 'excluir'],
  'Materiais': ['visualizar', 'criar'],
  'Mensagens': ['visualizar', 'criar'],
  'Dashboard': ['visualizar']
};

export default function PerfisAcesso() {
  const [perfis, setPerfis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState(null); // null = list/create mode
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formBaseRole, setFormBaseRole] = useState('multiplicador');
  const [formPerms, setFormPerms] = useState([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/perfis');
      setPerfis(data || []);
    } catch {
      toast.error('Erro ao carregar perfis de acesso.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const targetFuncs = [
    'Apoiadores',
    'Apoiadores - Aprovar Cadastros',
    'Apoiadores - Exportar Base',
    'Equipe',
    'Perfis de Acesso',
    'Feed de Notícias',
    'Materiais',
    'Mensagens',
    'Dashboard'
  ];

  const handleNewProfile = () => {
    setEditingId(null);
    setFormName('');
    setFormDesc('');
    setFormBaseRole('multiplicador');
    
    // Inicializa permissões com todas falsas para todas as funcionalidades
    const defaultPerms = targetFuncs.map(func => ({
      funcionalidade: func,
      visualizar: false,
      criar: false,
      editar: false,
      excluir: false
    }));
    setFormPerms(defaultPerms);
    setShowForm(true);
  };

  const handleEditProfile = async (id) => {
    try {
      const { data } = await api.get(`/perfis/${id}`);
      setEditingId(id);
      setFormName(data.nome);
      setFormDesc(data.descricao || '');
      setFormBaseRole(data.base_role);

      // Merge existing permissions with the new default list
      const mergedPerms = targetFuncs.map(func => {
        const existing = (data.permissoes || []).find(p => p.funcionalidade === func);
        return existing || { funcionalidade: func, visualizar: false, criar: false, editar: false, excluir: false };
      });

      setFormPerms(mergedPerms);
      setShowForm(true);
    } catch {
      toast.error('Erro ao carregar detalhes do perfil.');
    }
  };

  const handleDeleteProfile = async (id, nome) => {
    if (!window.confirm(`Deseja realmente excluir o perfil "${nome}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    try {
      await api.delete(`/perfis/${id}`);
      toast.success(`Perfil "${nome}" excluído com sucesso!`);
      loadData();
      if (editingId === id) setShowForm(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao excluir perfil.');
    }
  };

  const handleCheckboxChange = (funcName, action, value) => {
    setFormPerms((prev) =>
      prev.map((p) =>
        p.funcionalidade === funcName ? { ...p, [action]: value } : p
      )
    );
  };

  // Funções de seleção rápida
  const handleQuickSelect = (action, value) => {
    setFormPerms((prev) =>
      prev.map((p) => ({
        ...p,
        [action]: FUNC_ACTIONS[p.funcionalidade]?.includes(action) ? value : false,
      }))
    );
  };

  const handleSelectAll = (value) => {
    setFormPerms((prev) =>
      prev.map((p) => ({
        ...p,
        visualizar: FUNC_ACTIONS[p.funcionalidade]?.includes('visualizar') ? value : false,
        criar: FUNC_ACTIONS[p.funcionalidade]?.includes('criar') ? value : false,
        editar: FUNC_ACTIONS[p.funcionalidade]?.includes('editar') ? value : false,
        excluir: FUNC_ACTIONS[p.funcionalidade]?.includes('excluir') ? value : false,
      }))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('O nome do perfil é obrigatório.');
      return;
    }

    setSaving(true);
    const payload = {
      nome: formName.trim(),
      descricao: formDesc.trim(),
      base_role: formBaseRole,
      permissoes: formPerms,
    };

    try {
      if (editingId) {
        await api.put(`/perfis/${editingId}`, payload);
        toast.success('Perfil atualizado com sucesso!');
      } else {
        await api.post('/perfis', payload);
        toast.success('Perfil criado com sucesso!');
      }
      setShowForm(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar perfil.');
    } finally {
      setSaving(false);
    }
  };

  // Perfis nativos protegidos de alteração de nome/role base
  const isProtectedProfile = [
    'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
    'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2',
    'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3',
  ].includes(editingId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--texto)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={22} color="var(--primary)" />
            Perfis de Acesso e Permissões
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--texto-medio)', margin: '4px 0 0' }}>
            Gerencie os níveis de acesso e controle o que cada usuário pode visualizar ou fazer.
          </p>
        </div>
        {!showForm && (
          <button onClick={handleNewProfile} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
            <Plus size={16} /> Novo Perfil
          </button>
        )}
      </div>

      {showForm ? (
        /* FORMULÁRIO DE CADASTRO/EDIÇÃO DE PERFIL */
        <form onSubmit={handleSubmit} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', backgroundColor: '#fff', border: '1px solid var(--borda)', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--borda)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--texto)', margin: 0 }}>
              {editingId ? `Editar Perfil: ${formName}` : 'Criar Novo Perfil de Acesso'}
            </h3>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--texto-claro)' }}>
              <X size={20} />
            </button>
          </div>

          {/* Dados Gerais */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label htmlFor="form-profile-name" className="form-label" style={{ fontWeight: 700 }}>Nome do Perfil *</label>
              <input
                id="form-profile-name"
                type="text"
                placeholder="Ex: Supervisor Geral"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                disabled={isProtectedProfile}
                className="form-input"
                required
              />
              {isProtectedProfile && (
                <small style={{ color: '#d97706', fontSize: '0.65rem', display: 'block', marginTop: '2px', fontWeight: 600 }}>
                  ⚠️ Perfis nativos não podem ter o nome alterado.
                </small>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label htmlFor="form-profile-role" className="form-label" style={{ fontWeight: 700 }}>Função Base (Layout / Dashboard) *</label>
              <select
                id="form-profile-role"
                value={formBaseRole}
                onChange={(e) => setFormBaseRole(e.target.value)}
                disabled={isProtectedProfile}
                className="form-input"
                style={{ backgroundColor: '#fff' }}
              >
                <option value="admin">Administrador (Visualiza painéis e relatórios completos)</option>
                <option value="coordenador">Coordenador (Visualiza painéis de coordenação regional)</option>
                <option value="multiplicador">Voluntário/Líder de Base (Painel focado em metas e rede própria)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label htmlFor="form-profile-desc" className="form-label" style={{ fontWeight: 700 }}>Descrição / Finalidade</label>
            <input
              id="form-profile-desc"
              type="text"
              placeholder="Ex: Responsável por gerenciar os voluntários regionais e disparar avisos..."
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="form-input"
            />
          </div>

          {/* Grade de Permissões */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--primary)', margin: 0 }}>
                Grade de Acessos por Funcionalidade
              </h4>
              
              {/* Botões Rápidos */}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => handleSelectAll(true)} className="btn-secondary" style={{ fontSize: '0.7rem', padding: '4px 8px', minHeight: '26px' }}>
                  Marcar Todas
                </button>
                <button type="button" onClick={() => handleSelectAll(false)} className="btn-secondary" style={{ fontSize: '0.7rem', padding: '4px 8px', minHeight: '26px' }}>
                  Limpar Todas
                </button>
              </div>
            </div>

            {/* Tabela de Checkboxes */}
            <div style={{ overflowX: 'auto', border: '1px solid var(--borda)', borderRadius: '12px', backgroundColor: '#fafbfc' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid var(--borda)', backgroundColor: '#f1f5f9' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--texto)' }}>Funcionalidade</th>
                    <th style={{ padding: '12px 8px', fontWeight: 800, color: 'var(--texto)', textAlign: 'center' }}>
                      <span style={{ display: 'block', fontSize: '0.8rem' }}>Visualizar</span>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginTop: '4px' }}>
                        <button type="button" title="Marcar coluna" onClick={() => handleQuickSelect('visualizar', true)} style={{ fontSize: '0.62rem', border: 'none', background: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 700 }}>[+]</button>
                        <button type="button" title="Limpar coluna" onClick={() => handleQuickSelect('visualizar', false)} style={{ fontSize: '0.62rem', border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}>[-]</button>
                      </div>
                    </th>
                    <th style={{ padding: '12px 8px', fontWeight: 800, color: 'var(--texto)', textAlign: 'center' }}>
                      <span style={{ display: 'block', fontSize: '0.8rem' }}>Criar</span>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginTop: '4px' }}>
                        <button type="button" title="Marcar coluna" onClick={() => handleQuickSelect('criar', true)} style={{ fontSize: '0.62rem', border: 'none', background: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 700 }}>[+]</button>
                        <button type="button" title="Limpar coluna" onClick={() => handleQuickSelect('criar', false)} style={{ fontSize: '0.62rem', border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}>[-]</button>
                      </div>
                    </th>
                    <th style={{ padding: '12px 8px', fontWeight: 800, color: 'var(--texto)', textAlign: 'center' }}>
                      <span style={{ display: 'block', fontSize: '0.8rem' }}>Editar</span>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginTop: '4px' }}>
                        <button type="button" title="Marcar coluna" onClick={() => handleQuickSelect('editar', true)} style={{ fontSize: '0.62rem', border: 'none', background: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 700 }}>[+]</button>
                        <button type="button" title="Limpar coluna" onClick={() => handleQuickSelect('editar', false)} style={{ fontSize: '0.62rem', border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}>[-]</button>
                      </div>
                    </th>
                    <th style={{ padding: '12px 8px', fontWeight: 800, color: 'var(--texto)', textAlign: 'center' }}>
                      <span style={{ display: 'block', fontSize: '0.8rem' }}>Excluir</span>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginTop: '4px' }}>
                        <button type="button" title="Marcar coluna" onClick={() => handleQuickSelect('excluir', true)} style={{ fontSize: '0.62rem', border: 'none', background: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 700 }}>[+]</button>
                        <button type="button" title="Limpar coluna" onClick={() => handleQuickSelect('excluir', false)} style={{ fontSize: '0.62rem', border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}>[-]</button>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {formPerms.map((perm) => (
                    <tr key={perm.funcionalidade} style={{ borderBottom: '1px solid var(--borda)', backgroundColor: '#fff' }}>
                      <td style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--texto)' }}>
                        {perm.funcionalidade}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        {FUNC_ACTIONS[perm.funcionalidade]?.includes('visualizar') ? (
                          <input
                            type="checkbox"
                            checked={perm.visualizar}
                            onChange={(e) => handleCheckboxChange(perm.funcionalidade, 'visualizar', e.target.checked)}
                            style={{ width: '17px', height: '17px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                          />
                        ) : (
                          <span style={{ color: '#cbd5e1', fontSize: '1.1rem' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        {FUNC_ACTIONS[perm.funcionalidade]?.includes('criar') ? (
                          <input
                            type="checkbox"
                            checked={perm.criar}
                            onChange={(e) => handleCheckboxChange(perm.funcionalidade, 'criar', e.target.checked)}
                            style={{ width: '17px', height: '17px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                          />
                        ) : (
                          <span style={{ color: '#cbd5e1', fontSize: '1.1rem' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        {FUNC_ACTIONS[perm.funcionalidade]?.includes('editar') ? (
                          <input
                            type="checkbox"
                            checked={perm.editar}
                            onChange={(e) => handleCheckboxChange(perm.funcionalidade, 'editar', e.target.checked)}
                            style={{ width: '17px', height: '17px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                          />
                        ) : (
                          <span style={{ color: '#cbd5e1', fontSize: '1.1rem' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        {FUNC_ACTIONS[perm.funcionalidade]?.includes('excluir') ? (
                          <input
                            type="checkbox"
                            checked={perm.excluir}
                            onChange={(e) => handleCheckboxChange(perm.funcionalidade, 'excluir', e.target.checked)}
                            style={{ width: '17px', height: '17px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                          />
                        ) : (
                          <span style={{ color: '#cbd5e1', fontSize: '1.1rem' }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--borda)', paddingTop: '1rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary" style={{ padding: '0.5rem 1.5rem', minHeight: '38px' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary" style={{ padding: '0.5rem 2rem', minHeight: '38px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {saving ? 'Salvando...' : 'Salvar Perfil'}
            </button>
          </div>
        </form>
      ) : (
        /* LISTAGEM DE PERFIS CADASTRADOS */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: '70px', borderRadius: '12px' }} />
              ))}
            </div>
          ) : perfis.length === 0 ? (
            <div className="card" style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--texto-claro)' }}>
              <ShieldAlert size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.25 }} />
              <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>Nenhum perfil de acesso cadastrado.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {perfis.map((p) => {
                const isNative = [
                  'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
                  'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2',
                  'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3',
                ].includes(p.id);

                return (
                  <div key={p.id} className="card" style={{ padding: '1.25rem', backgroundColor: '#fff', border: '1px solid var(--borda)', borderRadius: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.75rem', transition: 'box-shadow 0.2s' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <h4 style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--texto)', margin: 0 }}>
                          {p.nome}
                        </h4>
                        <span className={`badge ${p.base_role === 'admin' ? 'badge-blue' : p.base_role === 'coordenador' ? 'badge-yellow' : 'badge-green'}`} style={{ fontSize: '0.62rem', fontWeight: 700 }}>
                          {p.base_role === 'admin' ? 'Admin' : p.base_role === 'coordenador' ? 'Coordenador' : 'Multiplicador'}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--texto-medio)', marginTop: '6px', lineHeight: 1.4 }}>
                        {p.descricao || 'Sem descrição cadastrada.'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--borda)', paddingTop: '0.65rem', marginTop: '0.25rem' }}>
                      <button
                        onClick={() => handleEditProfile(p.id)}
                        className="btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '0.35rem 0.75rem', minHeight: '30px' }}
                      >
                        <Edit2 size={13} />
                        Editar
                      </button>
                      {!isNative && (
                        <button
                          onClick={() => handleDeleteProfile(p.id, p.nome)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem',
                            padding: '0.35rem 0.75rem', minHeight: '30px', border: 'none', borderRadius: '8px',
                            backgroundColor: 'rgba(220, 38, 38, 0.06)', color: '#dc2626', cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={13} />
                          Excluir
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
