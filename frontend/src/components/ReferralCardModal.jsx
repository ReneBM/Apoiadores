import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X, Download, Share2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Modal que gera o Card de Indicação do multiplicador:
 * imagem 1080x1350 (canvas) com logo, nome, QR do link de indicação e link.
 * Tudo gerado no cliente — sem chamadas externas (CSP-safe).
 */
export default function ReferralCardModal({ open, onClose, nome, link }) {
  const canvasRef = useRef(null);
  const [gerando, setGerando] = useState(true);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelado = false;

    const desenhar = async () => {
      setGerando(true);
      try {
        const W = 1080;
        const H = 1350;
        const canvas = canvasRef.current || document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        canvasRef.current = canvas;
        const ctx = canvas.getContext('2d');

        const roundRect = (x, y, w, h, r) => {
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.arcTo(x + w, y, x + w, y + h, r);
          ctx.arcTo(x + w, y + h, x, y + h, r);
          ctx.arcTo(x, y + h, x, y, r);
          ctx.arcTo(x, y, x + w, y, r);
          ctx.closePath();
        };

        // Fundo branco
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);

        // Faixa decorativa no topo
        const topGrad = ctx.createLinearGradient(0, 0, W, 0);
        topGrad.addColorStop(0, '#002855');
        topGrad.addColorStop(1, '#0054A6');
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, 0, W, 18);

        // Logo (mesma origem — sem problema de CORS no canvas)
        const logo = new Image();
        await new Promise((resolve) => {
          logo.onload = resolve;
          logo.onerror = resolve; // sem logo, segue sem quebrar
          logo.src = '/logo_time_sv.png';
        });
        if (logo.naturalWidth > 0) {
          const lw = 640;
          const lh = lw * (logo.naturalHeight / logo.naturalWidth);
          ctx.drawImage(logo, (W - lw) / 2, 90, lw, lh);
        }

        // Nome do multiplicador
        const primeiroNome = (nome || 'Apoiador').trim();
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.font = '800 58px Inter, Arial, sans-serif';
        // Reduz a fonte se o nome for muito largo
        let fontSize = 58;
        while (ctx.measureText(primeiroNome).width > W - 160 && fontSize > 30) {
          fontSize -= 4;
          ctx.font = `800 ${fontSize}px Inter, Arial, sans-serif`;
        }
        ctx.fillText(primeiroNome, W / 2, 320);

        ctx.fillStyle = '#475569';
        ctx.font = '500 40px Inter, Arial, sans-serif';
        ctx.fillText('te convida para o nosso time!', W / 2, 385);

        // QR Code
        const qrDataUrl = await QRCode.toDataURL(link, {
          width: 560,
          margin: 1,
          color: { dark: '#002855', light: '#ffffff' },
          errorCorrectionLevel: 'M',
        });
        const qrImg = new Image();
        await new Promise((resolve) => {
          qrImg.onload = resolve;
          qrImg.src = qrDataUrl;
        });

        // Moldura do QR
        const qrSize = 560;
        const qrX = (W - qrSize) / 2;
        const qrY = 460;
        ctx.strokeStyle = '#dbe4ef';
        ctx.lineWidth = 4;
        roundRect(qrX - 26, qrY - 26, qrSize + 52, qrSize + 52, 36);
        ctx.stroke();
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

        // Instrução
        ctx.fillStyle = '#0f172a';
        ctx.font = '700 42px Inter, Arial, sans-serif';
        ctx.fillText('Aponte a câmera e cadastre-se', W / 2, qrY + qrSize + 110);

        // Rodapé com o link
        const footGrad = ctx.createLinearGradient(0, H - 150, W, H);
        footGrad.addColorStop(0, '#002855');
        footGrad.addColorStop(1, '#0054A6');
        ctx.fillStyle = footGrad;
        ctx.fillRect(0, H - 150, W, 150);

        ctx.fillStyle = '#ffffff';
        ctx.font = '600 34px Inter, Arial, sans-serif';
        const linkCurto = link.replace(/^https?:\/\//, '');
        let linkFont = 34;
        while (ctx.measureText(linkCurto).width > W - 120 && linkFont > 20) {
          linkFont -= 2;
          ctx.font = `600 ${linkFont}px Inter, Arial, sans-serif`;
        }
        ctx.fillText(linkCurto, W / 2, H - 62);

        if (!cancelado) setPreviewUrl(canvas.toDataURL('image/png'));
      } catch (err) {
        console.error(err);
        if (!cancelado) toast.error('Não foi possível gerar o card.');
      } finally {
        if (!cancelado) setGerando(false);
      }
    };

    desenhar();
    return () => { cancelado = true; };
  }, [open, nome, link]);

  const obterBlob = () => new Promise((resolve) => {
    canvasRef.current?.toBlob(resolve, 'image/png');
  });

  const handleBaixar = async () => {
    const blob = await obterBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meu-card-timesv.png';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Card baixado! Agora é só compartilhar.');
  };

  const handleCompartilhar = async () => {
    const blob = await obterBlob();
    if (!blob) return;
    const file = new File([blob], 'meu-card-timesv.png', { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          text: `Faça parte do nosso time! Cadastre-se: ${link}`,
        });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // usuário cancelou
      }
    }
    // Fallback: baixa a imagem e abre o WhatsApp com o link
    await handleBaixar();
    const msg = encodeURIComponent(`Faça parte do nosso time! Cadastre-se pelo meu link oficial: ${link}`);
    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
  };

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 10000, padding: '1rem', boxSizing: 'border-box'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#fff', borderRadius: '16px', width: '100%',
          maxWidth: 'min(420px, 95vw)', boxShadow: '0 15px 40px rgba(0,0,0,0.3)',
          display: 'flex', flexDirection: 'column', maxHeight: '92vh', overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.9rem 1.1rem', borderBottom: '1px solid #f1f5f9' }}>
          <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>Meu Card de Indicação</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        {/* Preview */}
        <div style={{ padding: '1rem', overflowY: 'auto', display: 'flex', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
          {gerando ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '3rem 0' }}>
              <Loader2 className="spin" size={30} color="#0054A6" />
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Gerando seu card...</span>
            </div>
          ) : (
            <img
              src={previewUrl}
              alt="Card de indicação"
              style={{ width: '100%', maxWidth: '320px', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
            />
          )}
        </div>

        {/* Ações */}
        <div style={{ display: 'flex', gap: '0.6rem', padding: '1rem 1.1rem', borderTop: '1px solid #f1f5f9' }}>
          <button
            onClick={handleBaixar}
            disabled={gerando}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '0.7rem', borderRadius: '8px', border: '1.5px solid #cbd5e1',
              backgroundColor: '#fff', color: '#0f172a', fontSize: '0.82rem', fontWeight: 700,
              cursor: 'pointer', minHeight: '44px', opacity: gerando ? 0.6 : 1
            }}
          >
            <Download size={16} />
            Baixar
          </button>
          <button
            onClick={handleCompartilhar}
            disabled={gerando}
            style={{
              flex: 1.3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '0.7rem', borderRadius: '8px', border: 'none',
              backgroundColor: '#25D366', color: '#fff', fontSize: '0.82rem', fontWeight: 700,
              cursor: 'pointer', minHeight: '44px', opacity: gerando ? 0.6 : 1,
              boxShadow: '0 4px 10px rgba(37, 211, 102, 0.15)'
            }}
          >
            <Share2 size={16} />
            Compartilhar
          </button>
        </div>
      </div>
    </div>
  );
}
