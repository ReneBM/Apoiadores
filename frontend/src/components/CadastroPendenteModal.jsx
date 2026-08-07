import { Clock, ShieldAlert, Info, CheckCircle2 } from 'lucide-react';

/**
 * Aviso mostrado quando alguém tenta entrar com um e-mail que tem cadastro,
 * mas ainda não tem acesso liberado.
 *
 * Sem isso a pessoa recebia "Credenciais inválidas" e concluía que o
 * aplicativo estava com defeito — quando na verdade só faltava a aprovação.
 */

const APARENCIA = {
  CADASTRO_PENDENTE: {
    Icone: Clock,
    cor: '#d97706',
    fundo: 'rgba(217,119,6,0.1)',
    titulo: 'Cadastro em análise',
    corpo: 'Seu cadastro foi recebido e está aguardando a aprovação da coordenação. Assim que for aprovado, você já entra com a senha que criou no cadastro.',
    passos: [
      'A coordenação confere os seus dados',
      'Aprovado o cadastro, o acesso é liberado',
      'Entre com este mesmo e-mail e a senha que você escolheu',
    ],
  },
  CADASTRO_INATIVO: {
    Icone: ShieldAlert,
    cor: '#dc2626',
    fundo: 'rgba(220,38,38,0.1)',
    titulo: 'Cadastro inativo',
    corpo: 'Seu cadastro está marcado como inativo, por isso o acesso não está liberado. Fale com a coordenação da campanha para reativar.',
  },
  CADASTRO_SEM_ACESSO: {
    Icone: Info,
    cor: '#0054A6',
    fundo: 'rgba(0,84,166,0.1)',
    titulo: 'Acesso ainda não liberado',
    corpo: 'Encontramos o seu cadastro, mas o acesso ao aplicativo ainda não foi liberado. Fale com a coordenação da campanha.',
  },
};

/** "há 3 dias" — ajuda a pessoa a saber se a espera está fora do normal. */
const tempoDeEspera = (desde) => {
  if (!desde) return '';
  const inicio = new Date(desde);
  if (Number.isNaN(inicio.getTime())) return '';

  const dias = Math.floor((Date.now() - inicio.getTime()) / 86400000);
  if (dias < 0) return '';
  if (dias === 0) return 'Cadastro enviado hoje.';
  if (dias === 1) return 'Cadastro enviado ontem.';
  return `Cadastro enviado há ${dias} dias.`;
};

export default function CadastroPendenteModal({ open, onClose, codigo, nome, desde }) {
  if (!open) return null;

  const info = APARENCIA[codigo] || APARENCIA.CADASTRO_SEM_ACESSO;
  const { Icone } = info;
  const espera = codigo === 'CADASTRO_PENDENTE' ? tempoDeEspera(desde) : '';

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-cadastro-pendente"
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
          maxWidth: 'min(400px, 95vw)', boxShadow: '0 15px 40px rgba(0,0,0,0.3)',
          display: 'flex', flexDirection: 'column', maxHeight: '92vh', overflow: 'auto',
          fontFamily: "'Inter', -apple-system, sans-serif", padding: '1.6rem 1.3rem 1.3rem',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '62px', height: '62px', borderRadius: '50%', backgroundColor: info.fundo,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
          }}
        >
          <Icone size={30} color={info.cor} />
        </div>

        <h2
          id="titulo-cadastro-pendente"
          style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem' }}
        >
          {info.titulo}
        </h2>

        <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6, margin: '0 0 0.35rem' }}>
          {nome ? <strong style={{ color: '#0f172a' }}>Olá, {nome}! </strong> : null}
          {info.corpo}
        </p>

        {espera && (
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0 0 0.2rem' }}>{espera}</p>
        )}

        {info.passos && (
          <div
            style={{
              backgroundColor: '#f8fafc', borderRadius: '12px', padding: '0.9rem 1rem',
              margin: '1rem 0 0.4rem', textAlign: 'left', display: 'flex',
              flexDirection: 'column', gap: '0.6rem',
            }}
          >
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              O que acontece agora
            </span>
            {info.passos.map((passo, i) => (
              <div key={passo} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.55rem' }}>
                <span
                  style={{
                    flexShrink: 0, width: '20px', height: '20px', borderRadius: '50%',
                    backgroundColor: i === 0 ? info.fundo : '#e2e8f0',
                    color: i === 0 ? info.cor : '#94a3b8',
                    fontSize: '0.7rem', fontWeight: 800, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', marginTop: '1px',
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.5 }}>{passo}</span>
              </div>
            ))}
          </div>
        )}

        <p style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.5, margin: '0.9rem 0 1.1rem' }}>
          {codigo === 'CADASTRO_PENDENTE'
            ? 'Não é preciso se cadastrar de novo — isso criaria um cadastro duplicado. Se esquecer a senha, use "Esqueceu a senha?" depois da aprovação.'
            : 'Guarde o e-mail que você usou no cadastro para agilizar o atendimento.'}
        </p>

        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%', padding: '0.85rem', borderRadius: '10px', border: 'none',
            backgroundColor: 'var(--primary, #0054A6)', color: '#fff', fontSize: '0.9rem',
            fontWeight: 700, cursor: 'pointer', minHeight: '48px', display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          <CheckCircle2 size={17} /> Entendi
        </button>
      </div>
    </div>
  );
}
