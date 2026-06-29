import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  Users, UserPlus, Globe, MapPin, Loader2, Download, Share2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { copyToClipboard } from '../utils/clipboard';

// ── Componente Interno: Card de Métricas ───────────────────────────────────
function KpiCard({ icon: Icon, label, value, subText, iconColor, iconBg }) {
  return (
    <div 
      className="card" 
      style={{ 
        padding: '1.25rem', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'flex-start',
        gap: '0.5rem',
        borderRadius: '16px',
        border: '1.5px solid var(--borda)',
        backgroundColor: 'var(--bg-card)',
        textAlign: 'left'
      }}
    >
      <div 
        style={{ 
          width: '36px', 
          height: '36px', 
          borderRadius: '50%', 
          backgroundColor: iconBg, 
          color: iconColor, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          marginBottom: '0.25rem'
        }}
      >
        <Icon size={18} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
        <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--texto)', lineHeight: 1.1 }}>
          {value}
        </span>
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--texto-medio)' }}>
          {label}
        </span>
      </div>
      {subText && (
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '2px' }}>
          {subText}
        </span>
      )}
    </div>
  );
}

// ── Componente Interno: Tooltip Customizado para o Gráfico ────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div 
      className="rounded-xl px-3 py-2 text-xs shadow-md"
      style={{ backgroundColor: '#fff', border: '1px solid var(--borda)' }}
    >
      <p className="font-semibold mb-1" style={{ color: 'var(--texto-medio)' }}>{label}</p>
      <p className="font-extrabold" style={{ color: 'var(--primary)' }}>{payload[0].value} apoiadores</p>
    </div>
  );
};

// ── Componente Principal ───────────────────────────────────────────────────
export default function DashboardAdmin() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const statsRes = await api.get('/dashboard/admin');
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar dados do painel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

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

  const kpis = stats?.kpis;
  const comicSemanal = stats?.serieSemanal ?? [];
  const topCidades = stats?.topCidades ?? [];
  const recentes = stats?.recentes ?? [];

  // Preenche dias faltantes na série semanal
  const serieCompleta = (() => {
    const map = Object.fromEntries(comicSemanal.map((d) => [d.dia, d.total]));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().split('T')[0];
      const isToday = i === 6;
      
      let diaFormatado = d.toLocaleDateString('pt-BR', { weekday: 'short' });
      diaFormatado = diaFormatado.replace('.', '');
      diaFormatado = diaFormatado.charAt(0).toUpperCase() + diaFormatado.slice(1);
      
      return {
        dia: isToday ? 'Hoje' : diaFormatado,
        total: parseInt(map[key] ?? 0),
      };
    });
  })();

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Bom dia';
    if (hr < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const getNovosHojeSubText = () => {
    const diffOntem = (kpis?.novosHoje || 0) - (kpis?.novosOntem || 0);
    if (diffOntem >= 0) {
      return `+${diffOntem} vs ontem`;
    }
    return `${diffOntem} vs ontem`;
  };

  const formatTimeElapsed = (dateString) => {
    const diffMs = new Date() - new Date(dateString);
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `há ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `há ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    return `há ${diffDays} dias`;
  };

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Linha de Boas-Vindas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', textAlign: 'left' }}>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--texto)', margin: 0 }}>
            {getGreeting()}, {user?.nome?.split(' ')[0] || 'Renê'}
          </h1>
          <p className="text-xs font-medium" style={{ color: 'var(--texto-medio)', margin: 0 }}>
            Resumo do mandato hoje
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
        </div>
      </div>

      {/* Grid de 4 Cards de KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
        <KpiCard
          icon={Users}
          label="Total de apoiadores"
          value={loading ? '...' : kpis?.totalApoiadores?.toLocaleString('pt-BR')}
          subText={loading ? '' : `+${kpis?.semanaNovos || 0} esta semana`}
          iconColor="var(--primary)"
          iconBg="rgba(0, 84, 166, 0.08)"
        />
        <KpiCard
          icon={UserPlus}
          label="Novos hoje"
          value={loading ? '...' : kpis?.novosHoje?.toLocaleString('pt-BR')}
          subText={loading ? '' : getNovosHojeSubText()}
          iconColor="#059669"
          iconBg="rgba(5, 150, 105, 0.08)"
        />
        <KpiCard
          icon={Globe}
          label="Multiplicadores"
          value={loading ? '...' : kpis?.totalMultiplicadores?.toLocaleString('pt-BR')}
          subText={loading ? '' : `+${kpis?.novosMultiplicadoresMes || 0} este mês`}
          iconColor="#7c3aed"
          iconBg="rgba(124, 58, 237, 0.08)"
        />
        <KpiCard
          icon={MapPin}
          label="Cidades cobertas"
          value={loading ? '...' : kpis?.totalCidades?.toLocaleString('pt-BR')}
          subText={loading ? '' : `+${kpis?.novasCidadesMes || 0} este mês`}
          iconColor="#d97706"
          iconBg="rgba(217, 119, 6, 0.08)"
        />
      </div>

      {/* Crescimento — últimos 7 dias */}
      <div className="card" style={{ padding: '1.25rem', borderRadius: '16px', border: '1.5px solid var(--borda)', backgroundColor: 'var(--bg-card)' }}>
        <h2 className="text-sm font-bold tracking-tight mb-4" style={{ color: 'var(--texto)', textAlign: 'left', margin: '0 0 1rem 0' }}>
          Crescimento — últimos 7 dias
        </h2>
        {loading ? (
          <div className="skeleton h-40 rounded-xl" style={{ height: '140px' }} />
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={serieCompleta} barCategoryGap="25%">
              <XAxis
                dataKey="dia"
                tick={{ fill: 'var(--texto-medio)', fontSize: 11, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 84, 166, 0.02)' }} />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {serieCompleta.map((_, i) => (
                  <Cell
                    key={i}
                    fill={i === serieCompleta.length - 1 ? 'var(--primary)' : 'rgba(0, 84, 166, 0.25)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Apoiadores por cidade */}
      <div className="card" style={{ padding: '1.25rem', borderRadius: '16px', border: '1.5px solid var(--borda)', backgroundColor: 'var(--bg-card)' }}>
        <h2 className="text-sm font-bold tracking-tight mb-4" style={{ color: 'var(--texto)', textAlign: 'left', margin: '0 0 1.25rem 0' }}>
          Apoiadores por cidade
        </h2>
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-8 rounded-lg" style={{ height: '24px' }} />)}
          </div>
        ) : topCidades.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--texto-claro)', margin: 0 }}>Sem dados ainda.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {topCidades.map((c) => {
              const max = parseInt(topCidades[0]?.total ?? 1);
              const pct = Math.round((parseInt(c.total) / max) * 100);
              return (
                <div key={c.cidade} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ width: '80px', fontSize: '0.82rem', fontWeight: 700, color: 'var(--texto)', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.cidade}
                  </span>
                  <div style={{ flex: 1, height: '7px', backgroundColor: 'var(--bg)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        backgroundColor: 'var(--primary)',
                        borderRadius: '99px',
                        transition: 'width 0.6s ease-out'
                      }}
                    />
                  </div>
                  <span style={{ width: '40px', fontSize: '0.82rem', fontWeight: 700, color: 'var(--texto)', textAlign: 'right' }}>
                    {parseInt(c.total).toLocaleString('pt-BR')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Últimos cadastros */}
      <div className="card" style={{ padding: '1.25rem', borderRadius: '16px', border: '1.5px solid var(--borda)', backgroundColor: 'var(--bg-card)' }}>
        <h2 className="text-sm font-bold tracking-tight mb-4" style={{ color: 'var(--texto)', textAlign: 'left', margin: '0 0 1.25rem 0' }}>
          Últimos cadastros
        </h2>
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-12 rounded-xl" style={{ height: '48px' }} />)}
          </div>
        ) : !recentes || recentes.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--texto-claro)', margin: 0 }}>Nenhum cadastro recente.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recentes.map((reg, i) => {
              const initials = reg.nome ? reg.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?';
              
              // Cores de avatar do mockup
              const avatarColors = [
                { bg: 'rgba(0, 84, 166, 0.1)', color: 'var(--primary)' }, // Azul
                { bg: 'rgba(5, 150, 105, 0.1)', color: '#059669' },       // Verde
                { bg: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed' },      // Roxo
                { bg: 'rgba(217, 119, 6, 0.1)', color: '#d97706' }        // Laranja
              ];
              const styleColor = avatarColors[i % avatarColors.length];

              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: styleColor.bg,
                    color: styleColor.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    flexShrink: 0
                  }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--texto)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {reg.nome}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--texto-claro)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {reg.cidade || 'Não informada'}
                    </p>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--texto-claro)', flexShrink: 0 }}>
                    {formatTimeElapsed(reg.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
