import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Loader2, Plus, Trash2, FileText, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CentralCoordenador() {
  const [materiais, setMateriais] = useState([]);
  const [materialForm, setMaterialForm] = useState({ titulo: '', descricao: '', link_url: '', tipo: 'card' });
  const [materialLoading, setMaterialLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchMateriais = async () => {
    try {
      setLoading(true);
      const res = await api.get('/materiais');
      setMateriais(res.data || []);
    } catch (err) {
      toast.error('Erro ao carregar materiais.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMateriais();
  }, []);

  const handleCreateMaterial = async (e) => {
    e.preventDefault();
    if (!materialForm.titulo || !materialForm.link_url) {
      toast.error('Título e Link são obrigatórios.');
      return;
    }
    setMaterialLoading(true);
    try {
      const res = await api.post('/materiais', materialForm);
      toast.success('Material adicionado com sucesso!');
      setMateriais((prev) => [res.data, ...prev]);
      setMaterialForm({ titulo: '', descricao: '', link_url: '', tipo: 'card' });
    } catch (err) {
      toast.error('Erro ao adicionar material.');
    } finally {
      setMaterialLoading(false);
    }
  };

  const handleDeleteMaterial = async (id) => {
    if (!window.confirm('Excluir este material?')) return;
    try {
      await api.delete(`/materiais/${id}`);
      toast.success('Material removido.');
      setMateriais((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      toast.error('Erro ao excluir material.');
    }
  };

  return (
    <div style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>
      
      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--texto)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <FileText size={22} color="var(--primary)" />
        Materiais de Campanha
      </h2>

      <div>
        {/* Form */}
        <form onSubmit={handleCreateMaterial} style={formContainerStyle}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#0f172a', fontWeight: 700 }}>Adicionar Novo Material</h3>
          
          <div style={groupStyle}>
            <label style={labelStyle}>Título do Material *</label>
            <input
              type="text"
              placeholder="Ex: Santinho Digital do Senador"
              value={materialForm.titulo}
              onChange={(e) => setMaterialForm((prev) => ({ ...prev, titulo: e.target.value }))}
              style={inputStyle}
              required
            />
          </div>

          <div style={groupStyle}>
            <label style={labelStyle}>Tipo de Material</label>
            <select
              value={materialForm.tipo}
              onChange={(e) => setMaterialForm((prev) => ({ ...prev, tipo: e.target.value }))}
              style={selectStyle}
            >
              <option value="card">Imagem / Card</option>
              <option value="pdf">Documento PDF</option>
              <option value="video">Vídeo de Divulgação</option>
              <option value="link">Link Externo</option>
            </select>
          </div>

          <div style={groupStyle}>
            <label style={labelStyle}>URL do Link / Arquivo *</label>
            <input
              type="url"
              placeholder="https://drive.google.com/..."
              value={materialForm.link_url}
              onChange={(e) => setMaterialForm((prev) => ({ ...prev, link_url: e.target.value }))}
              style={inputStyle}
              required
            />
          </div>

          <div style={groupStyle}>
            <label style={labelStyle}>Descrição / Instruções de Compartilhamento (Opcional)</label>
            <input
              type="text"
              placeholder="Ex: Compartilhar nos grupos de bairros locais com texto explicativo"
              value={materialForm.descricao}
              onChange={(e) => setMaterialForm((prev) => ({ ...prev, descricao: e.target.value }))}
              style={inputStyle}
            />
          </div>

          <button type="submit" disabled={materialLoading} style={submitButtonStyle}>
            {materialLoading ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
            <span>Adicionar Material</span>
          </button>
        </form>

        {/* List */}
        <h4 style={{ margin: '2rem 0 1rem', fontSize: '1rem', color: '#0f172a', fontWeight: 700 }}>Materiais Disponíveis</h4>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Loader2 size={24} className="spin" color="var(--primary)" />
          </div>
        ) : materiais.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            Nenhum material adicionado ainda.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {materiais.map((item) => (
              <div key={item.id} style={itemCardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', display: 'block' }}>{item.titulo}</span>
                    <small style={{ color: '#0054A6', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.72rem', display: 'inline-block', backgroundColor: 'rgba(0,84,166,0.06)', padding: '0.1rem 0.4rem', borderRadius: '4px', marginTop: '0.2rem' }}>
                      {item.tipo}
                    </small>
                    {item.descricao && (
                      <p style={{ margin: '0.4rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>{item.descricao}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <a href={item.link_url} target="_blank" rel="noopener noreferrer" style={actionButtonStyle} title="Visualizar material">
                      <Eye size={16} />
                    </a>
                    <button onClick={() => handleDeleteMaterial(item.id)} style={deleteButtonStyle} title="Excluir material">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// ── Estilos da Central Coordenador ───────────────────────────────────────────
const formContainerStyle = {
  background: '#fff',
  borderRadius: '16px',
  border: '1px solid #e2e8f0',
  padding: '1.5rem',
  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
};

const groupStyle = {
  marginBottom: '1rem',
  textAlign: 'left',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 700,
  color: '#475569',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '0.3rem',
};

const inputStyle = {
  width: '100%',
  padding: '0.65rem 0.85rem',
  border: '1.5px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '0.9rem',
  color: '#0f172a',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};

const selectStyle = {
  width: '100%',
  padding: '0.65rem 0.85rem',
  border: '1.5px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '0.9rem',
  backgroundColor: '#fff',
  cursor: 'pointer',
  boxSizing: 'border-box',
};

const submitButtonStyle = {
  width: '100%',
  padding: '0.75rem',
  backgroundColor: '#ccf600',
  color: '#0a192f',
  border: 'none',
  borderRadius: '8px',
  fontSize: '0.9rem',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  boxShadow: '0 4px 12px rgba(204, 246, 0, 0.2)',
  transition: 'all 0.2s',
};

const itemCardStyle = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  padding: '1rem 1.25rem',
  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
};

const deleteButtonStyle = {
  background: 'none',
  border: 'none',
  color: '#ef4444',
  cursor: 'pointer',
  padding: '6px',
  borderRadius: '6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background-color 0.2s',
  '&:hover': {
    backgroundColor: '#fee2e2',
  },
};

const actionButtonStyle = {
  background: '#f1f5f9',
  border: 'none',
  color: '#475569',
  cursor: 'pointer',
  padding: '6px',
  borderRadius: '6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textDecoration: 'none',
  transition: 'background-color 0.2s',
};
