import { useState } from 'react';
import { X, Loader2, QrCode, Copy, Check, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { copyToClipboard } from '../utils/clipboard';
import ReferralCardModal from './ReferralCardModal';

const formatarCPF = (valor) => {
  const d = String(valor).replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

/**
 * Modal do card "Monte seu time" na landing page.
 * O apoiador informa o CPF; buscamos o nome e o identificador de indicação
 * para gerar o card com QR Code. Também permite copiar o link de cadastro.
 */
export default function MonteSeuTimeModal({ open, onClose }) {
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [resultado, setResultado] = useState(null); // { nome, link }

  const linkGenerico = `${window.location.origin}/cadastro`;

  const fechar = () => {
    setCpf(''); setErro(''); setResultado(null); setLoading(false);
    onClose();
  };

  const handleCopiarGenerico = async () => {
    const ok = await copyToClipboard(linkGenerico);
    if (ok) {
      setCopiado(true);
      toast.success('Link de cadastro copiado!');
      setTimeout(() => setCopiado(false), 2000);
    } else {
      toast.error('Não foi possível copiar. Tente selecionar o link manualmente.');
    }
  };

  const handleGerar = async (e) => {
    e.preventDefault();
    const limpo = cpf.replace(/\D/g, '');
    if (limpo.length !== 11) {
      setErro('Digite os 11 números do seu CPF.');
      return;
    }
    setLoading(true);
    setErro('');
    try {
      const res = await api.post('/apoiadores/meu-card', { cpf: limpo });
      const { nome, ref, atribuiIndicacao } = res.data;
      setResultado({
        nome,
        link: ref ? `${window.location.origin}/cadastro?ref=${ref}` : linkGenerico,
        atribuiIndicacao,
      });
    } catch (err) {
      setErro(err.response?.data?.error || 'Não foi possível consultar agora. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  // Card gerado: mostra o gerador com QR (mesmo componente do painel)
  if (resultado) {
    return (
      <>
        <ReferralCardModal
          open
          onClose={fechar}
          nome={resultado.nome}
          link={resultado.link}
        />
      </>
    );
  }

  return (
    <div
      onClick={fechar}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 10000, padding: '1rem', boxSizing: 'border-box',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#fff', borderRadius: '16px', width: '100%',
          maxWidth: 'min(420px, 95vw)', boxShadow: '0 15px 40px rgba(0,0,0,0.3)',
          display: 'flex', flexDirection: 'column', maxHeight: '92vh', overflow: 'auto',
          fontFamily: "'Inter', -apple-system, sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.9rem 1.1rem', borderBottom: '1px solid #f1f5f9' }}>
          <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>Monte seu time</span>
          <button onClick={fechar} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '1.1rem' }}>
          <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 1rem', lineHeight: 1.5, textAlign: 'left' }}>
            Já é apoiador? Informe seu CPF para gerar o <strong>seu card com QR Code</strong> e convidar amigos — cada cadastro pelo seu card conta para você.
          </p>

          <form onSubmit={handleGerar}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: 'left' }}>
              Seu CPF
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => { setCpf(formatarCPF(e.target.value)); setErro(''); }}
              disabled={loading}
              style={{
                width: '100%', minHeight: '48px', padding: '0.72rem 1rem',
                background: '#f8fafc', border: `1.5px solid ${erro ? '#fca5a5' : '#e2e8f0'}`,
                borderRadius: '10px', fontSize: '16px', color: '#1e293b',
                fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />

            {erro && (
              <div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.6rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, marginTop: '0.7rem', border: '1px solid #fca5a5', textAlign: 'left' }}>
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', minHeight: '48px', marginTop: '0.9rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '0.8rem', borderRadius: '10px', border: 'none',
                background: 'linear-gradient(135deg, #003b73, #0054A6)', color: '#fff',
                fontSize: '0.9rem', fontWeight: 700, cursor: loading ? 'default' : 'pointer',
                opacity: loading ? 0.7 : 1, boxShadow: '0 6px 16px rgba(0,84,166,0.25)',
              }}
            >
              {loading ? <><Loader2 size={16} className="spin" /> Consultando...</> : <><QrCode size={17} /> Gerar meu card</>}
            </button>
          </form>

          {/* Separador */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: '1.1rem 0 0.9rem' }}>
            <span style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>OU</span>
            <span style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          </div>

          <button
            onClick={handleCopiarGenerico}
            style={{
              width: '100%', minHeight: '48px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '7px', padding: '0.75rem',
              borderRadius: '10px', border: '1.5px solid #cbd5e1', backgroundColor: '#fff',
              color: '#0f172a', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
            }}
          >
            {copiado ? <Check size={16} color="#059669" /> : <Copy size={16} />}
            {copiado ? 'Link copiado!' : 'Copiar link de cadastro'}
          </button>

          <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '0.9rem 0 0', lineHeight: 1.5, display: 'flex', gap: '6px', alignItems: 'flex-start', textAlign: 'left' }}>
            <Shield size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>Seu CPF é usado apenas para localizar seu cadastro e não fica salvo neste navegador.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
