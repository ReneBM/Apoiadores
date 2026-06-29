import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { Users, Target, TrendingUp, Award, MapPin } from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color = 'brand' }) {
  const colors = {
    brand:   { bg: 'rgba(0, 84, 166, 0.08)', text: 'var(--primary)' },
    emerald: { bg: 'rgba(5, 150, 105, 0.08)', text: '#059669' },
  };

  const currentColors = colors[color] || colors.brand;

  return (
    <div className="kpi-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid var(--borda)' }}>
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-2.5"
        style={{ backgroundColor: currentColors.bg, color: currentColors.text, width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon size={20} />
      </div>
      <p className="text-2xl font-extrabold leading-none" style={{ color: 'var(--texto)', margin: '0.2rem 0', fontSize: '1.5rem' }}>
        {value ?? '—'}
      </p>
      <p className="text-xs uppercase font-bold tracking-wider mt-1" style={{ color: 'var(--texto-medio)', fontSize: '0.75rem', margin: '0' }}>
        {label}
      </p>
      {sub && <p className="text-[11px] mt-1.5" style={{ color: 'var(--texto-claro)', fontSize: '0.7rem' }}>{sub}</p>}
    </div>
  );
}

export default function DashboardMultiplicador() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const statsRes = await api.get('/dashboard/multiplicador');
        setStats(statsRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-4" style={{ padding: '1rem' }}>
        <div className="skeleton h-24 rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map((i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const kpis = stats?.kpis;
  const totalApoiadores = kpis?.totalApoiadores || 0;
  const percentualMetaValido = Math.min(100, Math.max(0, kpis?.percentualMeta ?? 0));

  return (
    <div className="flex flex-col gap-4 pb-4" style={{ padding: '0 0.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Saudação */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--texto)' }}>
            Visão Geral
          </h2>
          {stats?.municipio && (
            <p style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--texto-medio)', margin: '0.2rem 0 0' }}>
              <MapPin size={12} color="var(--primary)" />
              {stats.municipio}
            </p>
          )}
        </div>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-2 gap-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <StatCard
          icon={Users}
          label="Apoiadores Ativos"
          value={totalApoiadores.toLocaleString('pt-BR')}
          color="brand"
        />
        <StatCard
          icon={TrendingUp}
          label="Novos Hoje"
          value={kpis?.novosHoje?.toLocaleString('pt-BR') || '0'}
          color="emerald"
        />
      </div>

      {/* Meta */}
      {kpis?.meta > 0 && (
        <div className="card" style={{ padding: '1.25rem', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid var(--borda)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Target size={16} color="var(--accent)" />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--texto-medio)' }}>Minha meta</span>
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: kpis.percentualMeta >= 100 ? '#059669' : 'var(--primary)' }}>
              {kpis.percentualMeta}%
            </span>
          </div>

          <div style={{ height: '8px', borderRadius: '4px', backgroundColor: 'var(--borda)', overflow: 'hidden' }}>
            <div
              style={{ 
                height: '100%', 
                width: `${percentualMetaValido}%`,
                backgroundColor: kpis.percentualMeta >= 100 ? '#059669' : 'var(--primary)',
                transition: 'width 0.5s',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--texto-claro)', fontWeight: 600 }}>
            <span>{totalApoiadores} cadastrados</span>
            <span>Meta: {kpis.meta}</span>
          </div>
        </div>
      )}

    </div>
  );
}
