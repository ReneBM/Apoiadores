import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Loader2, ChevronLeft, ShieldCheck } from 'lucide-react';
import { validarCPF } from '../../utils/cpf';

const formatCPF = (value) => {
  if (!value) return '';
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

const formatPhone = (value) => {
  if (!value) return '';
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

export default function ApoiadoresForm() {
  const navigate = useNavigate();
  const { user, isAdmin, isCoordenador } = useAuth();

  const [multiplicadores, setMultiplicadores] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      nome: '', email: '', telefone: '', cpf: '', sexo: '',
      cidade: '', bairro: '', acao_impacto: '', como_se_considera: '',
      como_ajudar: [], pessoas_mobilizar: '', grupo_organizacao: [],
      temas_interesse: [],
      redes_sociais: { instagram: '', facebook: '', tiktok: '', youtube: '' },
      observacoes: '', status: 'ativo',
      multiplicador_id: user?.role === 'multiplicador' ? user?.multiplicadorId ?? '' : '',
      consentimento_lgpd: false,
    },
  });

  const consentimento = watch('consentimento_lgpd');
  const cpfValue = watch('cpf');
  const telefoneValue = watch('telefone');

  const formComoAjudar = watch('como_ajudar');
  const formGrupo = watch('grupo_organizacao');
  const formTemas = watch('temas_interesse');
  const formRedes = watch('redes_sociais');

  const handleArrayChange = (field, currentArray, val, checked) => {
    let arr = [...currentArray];
    if (checked) {
      if (!arr.includes(val)) arr.push(val);
    } else {
      arr = arr.filter(v => v !== val && !v.startsWith(val + ':'));
    }
    setValue(field, arr, { shouldDirty: true });
  };

  const handleNetworkChange = (network, val) => {
    setValue('redes_sociais', { ...formRedes, [network]: val }, { shouldDirty: true });
  };

  useEffect(() => {
    if (isAdmin || isCoordenador) {
      api.get('/users?role=multiplicador&ativo=true&limit=200')
        .then(({ data }) => setMultiplicadores(data.data ?? []))
        .catch(() => {});
    }
  }, [isAdmin, isCoordenador]);

  const onSubmit = async (data) => {
    if (!data.consentimento_lgpd) return;
    
    if (data.cpf && (data.cpf.length !== 14 || !validarCPF(data.cpf))) {
      toast.error('O CPF informado é inválido. Verifique os números.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/apoiadores', data);
      toast.success('Apoiador cadastrado com sucesso!');
      navigate('/apoiadores');
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao cadastrar apoiador.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const lgpdBorder = consentimento ? 'rgba(5, 150, 105, 0.4)' : errors.consentimento_lgpd ? '#dc2626' : 'var(--borda)';
  const lgpdBg = consentimento ? 'rgba(5, 150, 105, 0.04)' : errors.consentimento_lgpd ? 'rgba(220, 38, 38, 0.03)' : '#f8fafc';

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-secondary" style={{ minHeight: '40px', minWidth: '40px', width: '40px', height: '40px', padding: 0 }}>
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--texto)' }}>Novo Apoiador</h1>
          <p className="text-xs" style={{ color: 'var(--texto-medio)' }}>Preencha os dados abaixo</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        
        {/* Bloco 1: Dados Pessoais */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>1. Dados Pessoais</h3>
          
          <div>
            <label htmlFor="nome" className="form-label">Nome completo *</label>
            <input
              id="nome" type="text" autoCapitalize="words" placeholder="Nome do apoiador"
              className={`form-input ${errors.nome ? 'border-red-500' : ''}`}
              {...register('nome', { required: 'Nome é obrigatório.', minLength: { value: 3, message: 'Mínimo 3 caracteres.' } })}
            />
            {errors.nome && <p className="form-error">{errors.nome.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cpf" className="form-label">CPF</label>
              <input
                id="cpf" type="text" placeholder="000.000.000-00" maxLength={14}
                className="form-input"
                value={cpfValue || ''}
                onChange={(e) => setValue('cpf', formatCPF(e.target.value), { shouldDirty: true })}
              />
            </div>
            <div>
              <label htmlFor="sexo" className="form-label">Sexo</label>
              <select id="sexo" className="form-input" {...register('sexo')}>
                <option value="">Não informado</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Outro">Outro</option>
                <option value="Prefiro não informar">Prefiro não informar</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="telefone" className="form-label">Celular / WhatsApp</label>
              <input 
                id="telefone" type="tel" placeholder="(84) 9 9999-9999" maxLength={15}
                className="form-input" 
                value={telefoneValue || ''}
                onChange={(e) => setValue('telefone', formatPhone(e.target.value), { shouldDirty: true })} 
              />
            </div>
            <div>
              <label htmlFor="email" className="form-label">E-mail *</label>
              <input
                id="email" type="email" placeholder="nome@email.com"
                className={`form-input ${errors.email ? 'border-red-500' : ''}`}
                {...register('email', { 
                  required: 'E-mail é obrigatório.',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'E-mail inválido.' } 
                })}
              />
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cidade" className="form-label">Cidade *</label>
              <input
                id="cidade" type="text" autoCapitalize="words" placeholder="Natal"
                className={`form-input ${errors.cidade ? 'border-red-500' : ''}`}
                {...register('cidade', { required: 'Cidade é obrigatória.' })}
              />
              {errors.cidade && <p className="form-error">{errors.cidade.message}</p>}
            </div>
            <div>
              <label htmlFor="bairro" className="form-label">Bairro</label>
              <input id="bairro" type="text" autoCapitalize="words" placeholder="Centro" className="form-input" {...register('bairro')} />
            </div>
          </div>
        </div>

        {/* Bloco 2: Engajamento */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>2. Pesquisa de Engajamento</h3>

          <div>
            <label className="form-label" style={{ textTransform: 'none', letterSpacing: 0 }}>Qual foi a principal ação de Styvenson que impactou você ou sua cidade?</label>
            <textarea className="form-input resize-none" rows={2} {...register('acao_impacto')} />
          </div>

          <div>
            <label className="form-label" style={{ textTransform: 'none', letterSpacing: 0 }}>Como você se considera hoje?</label>
            <select className="form-input" {...register('como_se_considera')}>
              <option value="">Não respondeu</option>
              <option value="Simpatizante">Simpatizante</option>
              <option value="Apoiador">Apoiador</option>
              <option value="Defensor">Defensor</option>
              <option value="Multiplicador">Multiplicador</option>
              <option value="Voluntário ativo">Voluntário ativo</option>
            </select>
          </div>

          <div>
            <label className="form-label" style={{ textTransform: 'none', letterSpacing: 0 }}>Como você gostaria de ajudar?</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.5rem' }}>
              {['Compartilhando conteúdos', 'Participando de grupos', 'Mobilização de rua', 'Mobilização digital', 'Conseguindo mais apoiadores', 'Fiscalização eleitoral', 'Doações'].map(opt => (
                <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                  <input type="checkbox" checked={formComoAjudar.includes(opt)} onChange={(e) => handleArrayChange('como_ajudar', formComoAjudar, opt, e.target.checked)} />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="form-label" style={{ textTransform: 'none', letterSpacing: 0 }}>Quantas pessoas você acredita conseguir mobilizar?</label>
            <select className="form-input" {...register('pessoas_mobilizar')}>
              <option value="">Não respondeu</option>
              <option value="Apenas eu">Apenas eu</option>
              <option value="Até 10 pessoas">Até 10 pessoas</option>
              <option value="10 a 50">10 a 50</option>
              <option value="50 a 100">50 a 100</option>
              <option value="Mais de 100">Mais de 100</option>
            </select>
          </div>

          <div>
            <label className="form-label" style={{ textTransform: 'none', letterSpacing: 0 }}>Participa de algum grupo ou organização?</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.5rem' }}>
              {['Igreja', 'Associação', 'Sindicato', 'Grupo esportivo', 'Movimento social', 'Nenhum'].map(opt => (
                <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                  <input type="checkbox" checked={formGrupo.includes(opt)} onChange={(e) => handleArrayChange('grupo_organizacao', formGrupo, opt, e.target.checked)} />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="form-label" style={{ textTransform: 'none', letterSpacing: 0 }}>Quais temas mais te interessam?</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.5rem' }}>
              {['Saúde', 'Educação', 'Segurança', 'Infraestrutura', 'Combate à corrupção', 'Esporte', 'Agricultura', 'Assistência social', 'Empreendedorismo'].map(opt => (
                <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                  <input type="checkbox" checked={formTemas.includes(opt)} onChange={(e) => handleArrayChange('temas_interesse', formTemas, opt, e.target.checked)} />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Bloco 3: Redes Sociais */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>3. Redes Sociais</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Instagram</label>
              <input type="text" className="form-input" value={formRedes.instagram || ''} onChange={(e) => handleNetworkChange('instagram', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Facebook</label>
              <input type="text" className="form-input" value={formRedes.facebook || ''} onChange={(e) => handleNetworkChange('facebook', e.target.value)} />
            </div>
            <div>
              <label className="form-label">TikTok</label>
              <input type="text" className="form-input" value={formRedes.tiktok || ''} onChange={(e) => handleNetworkChange('tiktok', e.target.value)} />
            </div>
            <div>
              <label className="form-label">YouTube</label>
              <input type="text" className="form-input" value={formRedes.youtube || ''} onChange={(e) => handleNetworkChange('youtube', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Bloco 4: Sistema */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>4. Sistema</h3>
          <div>
            <label htmlFor="observacoes" className="form-label">Anotações Internas</label>
            <textarea id="observacoes" rows={2} className="form-input resize-none" {...register('observacoes')} />
          </div>

          <div>
            <label htmlFor="status" className="form-label">Status do Cadastro</label>
            <select id="status" className="form-input" {...register('status')}>
              <option value="ativo">Ativo</option>
              <option value="pendente">Pendente</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>

          {(isAdmin || isCoordenador) && (
            <div>
              <label htmlFor="multiplicador_id" className="form-label">Multiplicador responsável</label>
              <select id="multiplicador_id" className="form-input" {...register('multiplicador_id')}>
                <option value="">— Sem multiplicador —</option>
                {multiplicadores.map((m) => (
                  <option key={m.id} value={m.multiplicador_id ?? ''}>
                    {m.nome} {m.municipio ? `· ${m.municipio}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Consentimento LGPD — obrigatório */}
        <div className="rounded-xl border p-4 flex gap-3 cursor-pointer transition-colors duration-150" style={{ borderColor: lgpdBorder, backgroundColor: lgpdBg }}>
          <input
            id="consentimento_lgpd" type="checkbox" className="mt-0.5 w-5 h-5 rounded cursor-pointer shrink-0" style={{ accentColor: '#059669' }}
            {...register('consentimento_lgpd', { validate: (v) => v === true || 'O consentimento LGPD é obrigatório.' })}
          />
          <div>
            <label htmlFor="consentimento_lgpd" className="flex items-center gap-1.5 text-sm font-bold cursor-pointer" style={{ color: 'var(--texto)' }}>
              <ShieldCheck size={16} className="shrink-0" style={{ color: '#059669' }} />
              Consentimento LGPD *
            </label>
            <p className="text-xs mt-1 leading-relaxed font-medium" style={{ color: 'var(--texto-medio)' }}>
              O apoiador autoriza o armazenamento e uso dos seus dados pessoais para fins de comunicação política, conforme a Lei nº 13.709/2018 (LGPD).
            </p>
          </div>
        </div>
        {errors.consentimento_lgpd && <p className="form-error -mt-2">{errors.consentimento_lgpd.message}</p>}

        <button id="btn-salvar-apoiador" type="submit" disabled={submitting} className="btn-primary w-full mt-2">
          {submitting ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : 'Salvar Apoiador'}
        </button>
      </form>
    </div>
  );
}
