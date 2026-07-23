import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  Search, Filter, Download, UserPlus,
  Phone, MapPin, ChevronRight, Loader2,
  X, CheckCircle, Clock, XCircle, Users
} from 'lucide-react';

// ── Badge de status ────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    ativo:    { cls: 'badge-green',  icon: CheckCircle, label: 'Ativo' },
    inativo:  { cls: 'badge-gray',   icon: XCircle,     label: 'Inativo' },
    pendente: { cls: 'badge-yellow', icon: Clock,       label: 'Pendente' },
  };
  const { cls, icon: Icon, label } = map[status] ?? map.pendente;
  return (
    <span className={`badge ${cls}`}>
      <Icon size={11} className="mr-1 shrink-0" />{label}
    </span>
  );
};

// ── Estilos da IDV ─────────────────────────────────────────────────────────
const S = {
  page:       { display: 'flex', flexDirection: 'column', gap: '1rem' },
  topBar:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' },
  counter:    { fontSize: '0.8rem', color: 'var(--texto-medio)', fontWeight: 500 },
  btnNovo:    { display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.35rem 0.75rem', borderRadius: '8px', transition: 'background 0.2s' },
  card:       { background: '#fff', border: '1px solid var(--borda)', borderRadius: '14px', boxShadow: 'var(--sombra-sm)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', transition: 'box-shadow 0.2s' },
  cardTop:    { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' },
  nome:       { fontWeight: 700, fontSize: '0.95rem', color: 'var(--texto)', margin: 0, lineHeight: 1.3 },
  metaRow:    { display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' },
  metaItem:   { display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: 'var(--texto-medio)' },
  divider:    { borderTop: '1px solid var(--borda)', paddingTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  empty:      { background: '#fff', border: '1px solid var(--borda)', borderRadius: '14px', padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--texto-claro)' },
};

// ── Card de apoiador ───────────────────────────────────────────────────────
function ApoiadorCard({ apoiador, onEdit }) {
  return (
    <div style={S.card}>
      <div style={S.cardTop}>
        <div style={{ minWidth: 0 }}>
          <p style={S.nome}>{apoiador.nome}</p>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
          {apoiador.acc_tipo && apoiador.acc_tipo !== 'Apoiador' && (
            <span className={`badge ${
              apoiador.acc_tipo === 'Admin'
                ? 'badge-blue'
                : apoiador.acc_tipo === 'Coordenador'
                  ? 'badge-yellow'
                  : apoiador.acc_tipo === 'Líder de Base'
                    ? 'badge-blue'
                    : 'badge-green'
            }`} style={{ textTransform: 'uppercase', fontSize: '0.62rem', fontWeight: 700 }}>
              {apoiador.acc_tipo === 'Coordenador' ? 'Coord' : apoiador.acc_tipo}
            </span>
          )}
          <StatusBadge status={apoiador.status} />
        </div>
      </div>

      <div style={S.metaRow}>
        <span style={S.metaItem}>
          <MapPin size={12} style={{ color: 'var(--primary)' }} />
          {apoiador.cidade}{apoiador.bairro ? ` · ${apoiador.bairro}` : ''}
        </span>
        {apoiador.telefone && (
          <span style={S.metaItem}>
            <Phone size={12} style={{ color: 'var(--texto-medio)' }} />
            {apoiador.telefone}
          </span>
        )}
        {apoiador.multiplicador_nome && (
          <span style={S.metaItem}>
            <Users size={12} style={{ color: 'var(--primary)' }} />
            {apoiador.multiplicador_nome}
          </span>
        )}
        {apoiador.origem && (
          <span style={{ ...S.metaItem, fontWeight: 600, background: 'rgba(0,84,166,0.08)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--primary)' }}>
            {apoiador.origem}
          </span>
        )}
      </div>

      <div style={S.divider}>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => onEdit(apoiador.id)}
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
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────
const CardSkeleton = () => (
  <div style={{ background: '#fff', border: '1px solid var(--borda)', borderRadius: '14px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
    <div className="skeleton" style={{ height: '16px', width: '60%', borderRadius: '6px' }} />
    <div className="skeleton" style={{ height: '12px', width: '45%', borderRadius: '6px' }} />
  </div>
);

// ── Página principal ───────────────────────────────────────────────────────
export default function ApoiadoresList() {
  const navigate    = useNavigate();
  const { canManageAll } = useAuth();

  const [items, setItems]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [showFilter, setShowFilter] = useState(false);
  const [exporting, setExporting]   = useState(false);

  const [filters, setFilters] = useState({
    busca: '', cidade: '', status: '', multiplicador_id: '',
  });
  const [applied, setApplied] = useState({ ...filters });

  const LIMIT = 15;

  const fetchData = useCallback(async (pg = 1, f = applied) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: LIMIT });
      if (f.busca)           params.append('busca', f.busca);
      if (f.cidade)          params.append('cidade', f.cidade);
      if (f.status)          params.append('status', f.status);
      if (f.multiplicador_id) params.append('multiplicador_id', f.multiplicador_id);

      const { data } = await api.get(`/apoiadores?${params}`);
      setItems(pg === 1 ? data.data : (prev) => [...prev, ...data.data]);
      setTotal(data.total);
      setPage(pg);
    } catch {
      toast.error('Erro ao carregar apoiadores.');
    } finally {
      setLoading(false);
    }
  }, [applied]);

  useEffect(() => { fetchData(1, applied); }, []);  // eslint-disable-line

  const applyFilters = () => {
    setApplied({ ...filters });
    setShowFilter(false);
    fetchData(1, filters);
  };

  const clearFilters = () => {
    const empty = { busca: '', cidade: '', status: '', multiplicador_id: '' };
    setFilters(empty);
    setApplied(empty);
    setShowFilter(false);
    fetchData(1, empty);
  };

  const hasActiveFilter = Object.values(applied).some(Boolean);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (applied.cidade) params.append('cidade', applied.cidade);
      if (applied.status) params.append('status', applied.status);
      const res = await api.get(`/export/apoiadores?${params}`, { responseType: 'blob' });
      const url  = URL.createObjectURL(res.data);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `apoiadores_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV exportado com sucesso!');
    } catch {
      toast.error('Erro ao exportar.');
    } finally {
      setExporting(false);
    }
  };

  const hasMore = items.length < total;

  return (
    <div style={S.page}>
      {/* Barra de ações */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
        {/* Busca */}
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={15} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--texto-claro)', pointerEvents: 'none' }} />
          <input
            id="input-busca"
            type="search"
            placeholder="Buscar por nome ou telefone..."
            value={filters.busca}
            onChange={(e) => setFilters((p) => ({ ...p, busca: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            className="form-input"
            style={{ paddingRight: '40px', paddingLeft: '14px', height: '44px', minHeight: '44px' }}
          />
        </div>

        {/* Filtros */}
        <button
          id="btn-filtros"
          onClick={() => setShowFilter((v) => !v)}
          className="relative flex items-center justify-center rounded-xl border transition-colors duration-150"
          style={{
            height: '44px',
            width: '44px',
            minHeight: '44px',
            backgroundColor: hasActiveFilter ? 'var(--primary)' : '#fff',
            borderColor: hasActiveFilter ? 'var(--primary)' : 'var(--borda)',
            color: hasActiveFilter ? '#fff' : 'var(--texto-medio)',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          <Filter size={16} />
          {hasActiveFilter && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
          )}
        </button>
 
        {/* Export */}
        {canManageAll && (
          <button
            id="btn-export"
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center justify-center rounded-xl border transition-colors duration-150 disabled:opacity-50"
            style={{
              height: '44px',
              width: '44px',
              minHeight: '44px',
              backgroundColor: '#fff',
              borderColor: 'var(--borda)',
              color: 'var(--texto-medio)',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          </button>
        )}
      </div>

      {/* Painel de filtros */}
      {showFilter && (
        <div className="card flex flex-col gap-3" style={{ borderColor: 'var(--primary)', boxShadow: 'var(--sombra-md)' }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--texto)' }}>Filtros</span>
            <button onClick={() => setShowFilter(false)} style={{ background: 'none', border: 'none', color: 'var(--texto-claro)', cursor: 'pointer', padding: '4px' }}>
              <X size={18} />
            </button>
          </div>

          <div>
            <label className="form-label" htmlFor="filter-cidade">Cidade</label>
            <input
              id="filter-cidade"
              type="text"
              placeholder="Ex: Natal"
              value={filters.cidade}
              onChange={(e) => setFilters((p) => ({ ...p, cidade: e.target.value }))}
              className="form-input"
              style={{ minHeight: '40px', height: '40px' }}
            />
          </div>

          <div>
            <label className="form-label" htmlFor="filter-status">Status</label>
            <select
              id="filter-status"
              value={filters.status}
              onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
              className="form-input"
              style={{ minHeight: '40px', height: '40px' }}
            >
              <option value="">Todos</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
              <option value="pendente">Pendente</option>
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={clearFilters} className="btn-secondary flex-1 text-xs" style={{ minHeight: '40px', height: '40px' }}>
              Limpar
            </button>
            <button onClick={applyFilters} className="btn-primary flex-1 text-xs" style={{ minHeight: '40px', height: '40px' }}>
              Aplicar
            </button>
          </div>
        </div>
      )}

      {/* Topo / Contador */}
      <div style={S.topBar}>
        <p style={S.counter}>
          {loading && items.length === 0 ? '—' : `${total} apoiador${total !== 1 ? 'es' : ''}`}
        </p>
        <button
          id="btn-novo-apoiador"
          onClick={() => navigate('/apoiadores/novo')}
          style={S.btnNovo}
        >
          <UserPlus size={14} /> Novo apoiador
        </button>
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {loading && items.length === 0
          ? [1, 2, 3, 4].map((i) => <CardSkeleton key={i} />)
          : items.length === 0
            ? (
              <div style={S.empty}>
                <Users size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.25, display: 'block' }} />
                <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--texto-medio)' }}>Nenhum apoiador cadastrado.</p>
                <button onClick={() => navigate('/apoiadores/novo')} className="btn-primary" style={{ margin: '1rem auto 0', width: 'fit-content', fontSize: '0.85rem' }}>
                  Cadastrar primeiro
                </button>
              </div>
            )
            : items.map((a) => (
              <ApoiadorCard
                key={a.id}
                apoiador={a}
                onEdit={(id) => navigate(`/apoiadores/${id}/editar`)}
              />
            ))}
      </div>

      {/* Carregar mais */}
      {hasMore && !loading && (
        <button
          id="btn-carregar-mais"
          onClick={() => fetchData(page + 1)}
          className="btn-secondary w-full"
          style={{ marginTop: '4px' }}
        >
          Carregar mais
        </button>
      )}
      {loading && items.length > 0 && (
        <div className="flex justify-center py-4">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--primary)' }} />
        </div>
      )}
    </div>
  );
}
