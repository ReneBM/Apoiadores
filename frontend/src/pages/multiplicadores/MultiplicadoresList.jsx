import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import {
  UserPlus, Users, MapPin, Target,
  ChevronRight, Loader2, ToggleLeft, ToggleRight,
  Search, Filter, X
} from 'lucide-react';

const S = {
  page:       { display: 'flex', flexDirection: 'column', gap: '1rem' },
  topBar:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' },
  counter:    { fontSize: '0.8rem', color: 'var(--texto-medio)', fontWeight: 500 },
  btnNovo:    { display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.35rem 0.75rem', borderRadius: '8px', transition: 'background 0.2s' },
  card:       { background: '#fff', border: '1px solid var(--borda)', borderRadius: '14px', boxShadow: 'var(--sombra-sm)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', transition: 'box-shadow 0.2s' },
  cardTop:    { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' },
  nome:       { fontWeight: 700, fontSize: '0.95rem', color: 'var(--texto)', margin: 0, lineHeight: 1.3 },
  email:      { fontSize: '0.75rem', color: 'var(--texto-claro)', marginTop: '2px' },
  metaRow:    { display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' },
  metaItem:   { display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: 'var(--texto-medio)' },
  progressLbl:{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--texto-claro)', marginBottom: '4px' },
  progressBg: { height: '6px', background: '#e9edf3', borderRadius: '99px', overflow: 'hidden' },
  divider:    { borderTop: '1px solid var(--borda)', paddingTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  empty:      { background: '#fff', border: '1px solid var(--borda)', borderRadius: '14px', padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--texto-claro)' },
};

function MultiplicadorCard({ m, canManage, onToggle, onEdit }) {
  const isCoordenador = m.role === 'coordenador';
  const isAdmin = m.role === 'admin';

  const pct = !isCoordenador && !isAdmin && m.meta_apoiadores > 0
    ? Math.min(Math.round((parseInt(m.total_apoiadores) / m.meta_apoiadores) * 100), 100)
    : null;

  const progressColor = pct >= 100 ? '#059669' : pct >= 60 ? 'var(--primary)' : '#d97706';

  return (
    <div style={S.card}>
      <div style={S.cardTop}>
        <div style={{ minWidth: 0 }}>
          <p style={S.nome}>{m.nome}</p>
          <p style={S.email}>{m.email}</p>
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {m.tipo && m.tipo !== 'Apoiador' && (
            <span className={`badge ${
              m.tipo === 'Admin'
                ? 'badge-blue'
                : m.tipo === 'Coordenador'
                  ? 'badge-yellow'
                  : m.tipo === 'Líder de Base'
                    ? 'badge-blue'
                    : 'badge-green'
            }`} style={{ textTransform: 'uppercase', fontSize: '0.62rem', fontWeight: 700 }}>
              {m.tipo === 'Coordenador' ? 'Coord' : m.tipo}
            </span>
          )}
          <span className={`badge ${m.ativo ? 'badge-green' : 'badge-gray'}`}>
            {m.ativo ? 'Ativo' : 'Inativo'}
          </span>
        </div>
      </div>

      <div style={S.metaRow}>
        {m.municipio && (
          <span style={S.metaItem}>
            <MapPin size={12} color="var(--primary)" />
            {m.municipio}
          </span>
        )}
        {!isCoordenador && !isAdmin && (
          <>
            <span style={S.metaItem}>
              <Users size={12} color="#059669" />
              {parseInt(m.total_apoiadores ?? 0).toLocaleString('pt-BR')} apoiadores
            </span>
            {m.meta_apoiadores > 0 && (
              <span style={S.metaItem}>
                <Target size={12} color="#d97706" />
                Meta: {m.meta_apoiadores.toLocaleString('pt-BR')}
              </span>
            )}
          </>
        )}
      </div>

      {pct !== null && (
        <div>
          <div style={S.progressLbl}>
            <span>Progresso da meta</span>
            <span style={{ color: progressColor, fontWeight: 700 }}>{pct}%</span>
          </div>
          <div style={S.progressBg}>
            <div style={{ height: '100%', width: `${pct}%`, background: progressColor, borderRadius: '99px', transition: 'width 0.5s ease' }} />
          </div>
        </div>
      )}

      {canManage && m.role !== 'admin' && (
        <div style={S.divider}>
          <button
            onClick={() => onToggle(m.id, m.ativo)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              fontSize: '0.78rem', fontWeight: 600, minHeight: '34px',
              padding: '0.35rem 0.75rem', borderRadius: '8px', border: 'none',
              cursor: 'pointer', transition: 'all 0.2s',
              background: m.ativo ? 'rgba(220,38,38,0.06)' : 'rgba(5,150,105,0.08)',
              color: m.ativo ? '#dc2626' : '#059669',
            }}
          >
            {m.ativo ? <><ToggleLeft size={14} />Desativar</> : <><ToggleRight size={14} />Ativar</>}
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => onEdit(m.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)',
              background: 'rgba(0,84,166,0.06)', border: 'none',
              borderRadius: '8px', padding: '0.35rem 0.75rem',
              minHeight: '34px', cursor: 'pointer', transition: 'background 0.2s',
            }}
          >
            Editar <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

const CardSkeleton = () => (
  <div style={{ background: '#fff', border: '1px solid var(--borda)', borderRadius: '14px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
    <div className="skeleton" style={{ height: '16px', width: '60%', borderRadius: '6px' }} />
    <div className="skeleton" style={{ height: '12px', width: '45%', borderRadius: '6px' }} />
    <div className="skeleton" style={{ height: '8px', width: '100%', borderRadius: '99px' }} />
  </div>
);

export default function MultiplicadoresList({ title = 'Integrantes da Equipe' }) {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal]     = useState(0);
  const [activeRole, setActiveRole] = useState('todos'); // 'Admin', 'Coordenador', 'Líder de Base', 'Mobilizador', 'todos'

  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({ busca: '', municipio: '', ativo: '' });
  const [applied, setApplied] = useState({ busca: '', municipio: '', ativo: '' });

  const fetchData = async (f = applied) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeRole !== 'todos') {
        params.append('tipo', activeRole);
      }
      if (f.busca) {
        params.append('busca', f.busca);
      }
      if (f.municipio) {
        params.append('municipio', f.municipio);
      }
      if (f.ativo) {
        params.append('ativo', f.ativo === 'ativo' ? 'true' : 'false');
      }
      params.append('limit', '100');

      const { data } = await api.get(`/users?${params}`);
      setItems(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error('Erro ao carregar equipe.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(applied);
  }, [activeRole, applied]);

  const applyFilters = () => {
    setApplied({ ...filters });
    setShowFilter(false);
  };

  const clearFilters = () => {
    const empty = { busca: '', municipio: '', ativo: '' };
    setFilters(empty);
    setApplied(empty);
    setShowFilter(false);
  };

  const hasActiveFilter = Object.values(applied).some(Boolean);

  const handleToggle = async (userId, ativo) => {
    try {
      await api.put(`/users/${userId}`, { ativo: !ativo });
      toast.success(ativo ? 'Usuário desativado.' : 'Usuário ativado.');
      fetchData();
    } catch {
      toast.error('Erro ao atualizar status.');
    }
  };

  return (
    <div style={S.page}>
      {/* Topo com abas de filtro */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <div style={S.topBar}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--texto)' }}>{title}</h2>
          {isAdmin && (
            <button
              id="btn-novo-multiplicador"
              onClick={() => navigate('/multiplicadores/novo')}
              style={S.btnNovo}
            >
              <UserPlus size={15} /> Novo Integrante
            </button>
          )}
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', gap: '0.4rem', borderBottom: '1px solid var(--borda)', paddingBottom: '0.65rem', overflowX: 'auto', whiteSpace: 'nowrap' }}>
          {[
            { id: 'Admin', label: 'Admin' },
            { id: 'Coordenador', label: 'Coordenadores' },
            { id: 'Líder de Base', label: 'Líderes de Base' },
            { id: 'Mobilizador', label: 'Mobilizadores' },
            { id: 'todos', label: 'Todos' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveRole(tab.id)}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '20px',
                fontSize: '0.78rem',
                fontWeight: activeRole === tab.id ? 800 : 600,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activeRole === tab.id ? 'var(--primary)' : 'rgba(0,30,80,0.04)',
                color: activeRole === tab.id ? '#fff' : 'var(--texto-medio)',
                transition: 'all 0.2s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Barra de pesquisa e filtro */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', marginTop: '0.25rem', marginBottom: '0.25rem' }}>
        {/* Busca */}
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={15} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--texto-claro)', pointerEvents: 'none' }} />
          <input
            id="input-busca-equipe"
            type="search"
            placeholder="Buscar por nome, email ou telefone..."
            value={filters.busca}
            onChange={(e) => setFilters((p) => ({ ...p, busca: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            className="form-input"
            style={{ paddingRight: '40px', paddingLeft: '14px', height: '44px', minHeight: '44px', width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        {/* Filtros */}
        <button
          id="btn-filtros-equipe"
          onClick={() => setShowFilter((v) => !v)}
          style={{
            height: '44px',
            width: '44px',
            minHeight: '44px',
            backgroundColor: hasActiveFilter ? 'var(--primary)' : '#fff',
            borderColor: hasActiveFilter ? 'var(--primary)' : 'var(--borda)',
            color: hasActiveFilter ? '#fff' : 'var(--texto-medio)',
            cursor: 'pointer',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '12px',
            border: '1.5px solid var(--borda)'
          }}
        >
          <Filter size={16} />
          {hasActiveFilter && (
            <span style={{ position: 'absolute', top: '2px', right: '2px', width: '8px', height: '8px', backgroundColor: '#10b981', borderRadius: '50%', border: '2px solid #fff' }} />
          )}
        </button>
      </div>

      {/* Painel de filtros */}
      {showFilter && (
        <div className="card" style={{ borderColor: 'var(--primary)', boxShadow: 'var(--sombra-md)', padding: '1rem', borderRadius: '14px', border: '1.5px solid var(--primary)', display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'left', backgroundColor: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--texto)' }}>Filtros de Equipe</span>
            <button onClick={() => setShowFilter(false)} style={{ background: 'none', border: 'none', color: 'var(--texto-claro)', cursor: 'pointer', padding: '4px' }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label className="form-label" htmlFor="filter-municipio" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--texto-medio)' }}>Município</label>
            <input
              id="filter-municipio"
              type="text"
              placeholder="Ex: Natal"
              value={filters.municipio}
              onChange={(e) => setFilters((p) => ({ ...p, municipio: e.target.value }))}
              className="form-input"
              style={{ minHeight: '40px', height: '40px', width: '100%', boxSizing: 'border-box', border: '1.5px solid var(--borda)', borderRadius: '8px', padding: '0.5rem 0.75rem', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label className="form-label" htmlFor="filter-ativo" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--texto-medio)' }}>Status</label>
            <select
              id="filter-ativo"
              value={filters.ativo}
              onChange={(e) => setFilters((p) => ({ ...p, ativo: e.target.value }))}
              className="form-input"
              style={{ minHeight: '40px', height: '40px', width: '100%', boxSizing: 'border-box', border: '1.5px solid var(--borda)', borderRadius: '8px', padding: '0.5rem 0.75rem', outline: 'none', backgroundColor: '#fff' }}
            >
              <option value="">Todos</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.5rem' }}>
            <button 
              onClick={clearFilters} 
              style={{ 
                flex: 1, 
                padding: '0.6rem', 
                borderRadius: '8px', 
                border: '1.5px solid var(--borda)', 
                backgroundColor: '#fff', 
                color: 'var(--texto-medio)', 
                fontWeight: 700, 
                fontSize: '0.78rem', 
                cursor: 'pointer' 
              }}
            >
              Limpar
            </button>
            <button 
              onClick={applyFilters} 
              style={{ 
                flex: 1, 
                padding: '0.6rem', 
                borderRadius: '8px', 
                border: 'none', 
                backgroundColor: 'var(--primary)', 
                color: '#fff', 
                fontWeight: 700, 
                fontSize: '0.78rem', 
                cursor: 'pointer' 
              }}
            >
              Aplicar
            </button>
          </div>
        </div>
      )}

      <p style={{ ...S.counter, marginTop: '-0.25rem' }}>
        {loading ? 'Carregando...' : `${total} registro${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`}
      </p>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {loading
          ? [1, 2, 3].map((i) => <CardSkeleton key={i} />)
          : items.length === 0
            ? (
              <div style={S.empty}>
                <Users size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.25, display: 'block' }} />
                <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--texto-medio)' }}>Nenhum integrante encontrado.</p>
                {isAdmin && (
                  <button onClick={() => navigate('/multiplicadores/novo')} className="btn-primary" style={{ margin: '1rem auto 0', width: 'fit-content', fontSize: '0.85rem' }}>
                    Cadastrar Novo
                  </button>
                )}
              </div>
            )
            : items.map((m) => (
              <MultiplicadorCard
                key={m.id}
                m={m}
                canManage={isAdmin}
                onToggle={handleToggle}
                onEdit={(uid) => navigate(`/multiplicadores/${uid}`)}
              />
            ))}
      </div>
    </div>
  );
}
