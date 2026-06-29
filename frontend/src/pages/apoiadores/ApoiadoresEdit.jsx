import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Loader2, ChevronLeft, Trash2 } from 'lucide-react';
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

export default function ApoiadoresEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canManageAll, isAdmin } = useAuth();

  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const [initialTipo, setInitialTipo] = useState('Apoiador');
  const [selectedTipo, setSelectedTipo] = useState('Apoiador');
  const [cidades, setCidades] = useState([]);
  const [multiplicadores, setMultiplicadores] = useState([]);

  useEffect(() => {
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/RN/municipios')
      .then(res => res.json())
      .then(data => {
        setCidades(data.map(c => c.nome).sort((a, b) => a.localeCompare(b)));
      })
      .catch(err => {
        console.error('Erro ao buscar cidades', err);
        setCidades(['Natal', 'Mossoró', 'Parnamirim', 'São Gonçalo do Amarante', 'Macaíba']);
      });
  }, []);

  useEffect(() => {
    if (canManageAll) {
      api.get('/users?role=multiplicador&ativo=true&limit=200')
        .then(({ data }) => setMultiplicadores(data.data ?? []))
        .catch(() => {});
    }
  }, [canManageAll]);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm();
  
  const cepValue = watch('cep');

  useEffect(() => {
    if (cepValue) {
      let val = cepValue.replace(/\D/g, '');
      if (val.length === 8) {
        fetch(`https://viacep.com.br/ws/${val}/json/`)
          .then(res => res.json())
          .then(data => {
            if (!data.erro) {
              if (data.localidade) setValue('cidade', data.localidade);
              if (data.bairro) setValue('bairro', data.bairro);
              toast.success('Endereço preenchido pelo CEP!');
            }
          })
          .catch(err => console.error('Erro ao buscar CEP', err));
      }
    }
  }, [cepValue, setValue]);

  useEffect(() => {
    api.get(`/apoiadores/${id}`)
      .then(({ data }) => {
        reset({
          nome: data.nome ?? '',
          email: data.email ?? '',
          telefone: data.telefone ?? '',
          cpf: data.cpf ?? '',
          sexo: data.sexo ?? '',
          cidade: data.cidade ?? '',
          bairro: data.bairro ?? '',
          acao_impacto: data.acao_impacto ?? '',
          como_se_considera: data.como_se_considera ?? '',
          como_ajudar: Array.isArray(data.como_ajudar) ? data.como_ajudar : [],
          pessoas_mobilizar: data.pessoas_mobilizar ?? '',
          grupo_organizacao: Array.isArray(data.grupo_organizacao) ? data.grupo_organizacao : [],
          temas_interesse: Array.isArray(data.temas_interesse) ? data.temas_interesse : [],
          redes_sociais: data.redes_sociais ?? { instagram: '', facebook: '', tiktok: '', youtube: '' },
          observacoes: data.observacoes ?? '',
          status: data.status ?? 'ativo',
          multiplicador_id: data.multiplicador_id ?? '',
        });

        const tipo = data.acc_tipo || 'Apoiador';
        setInitialTipo(tipo);
        setSelectedTipo(tipo);
      })
      .catch(() => {
        toast.error('Apoiador não encontrado.');
        navigate('/apoiadores');
      })
      .finally(() => setLoading(false));
  }, [id, navigate, reset]);

  const cpfValue = watch('cpf');
  const telefoneValue = watch('telefone');

  const formComoAjudar = watch('como_ajudar', []);
  const formGrupo = watch('grupo_organizacao', []);
  const formTemas = watch('temas_interesse', []);
  const formRedes = watch('redes_sociais', { instagram: '', facebook: '', tiktok: '', youtube: '' });

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

  const onSubmit = async (data) => {
    if (data.cpf && (data.cpf.length !== 14 || !validarCPF(data.cpf))) {
      toast.error('O CPF informado é inválido. Verifique os números.');
      return;
    }
    
    setSubmitting(true);
    try {
      if (selectedTipo !== 'Apoiador' && !data.email) {
        toast.error('O e-mail é obrigatório para conceder acesso ao sistema.');
        setSubmitting(false);
        return;
      }

      await api.put(`/apoiadores/${id}`, data);

      if (selectedTipo !== initialTipo) {
        await api.put(`/apoiadores/${id}/tipo`, { tipo: selectedTipo });
      }

      toast.success('Apoiador atualizado!');
      navigate('/apoiadores');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao atualizar.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDel) {
      setConfirmDel(true);
      setTimeout(() => setConfirmDel(false), 3500);
      return;
    }
    setDeleting(true);
    try {
      await api.delete(`/apoiadores/${id}`);
      toast.success('Apoiador excluído.');
      navigate('/apoiadores');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao excluir.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-32">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="btn-secondary"
            style={{ minHeight: '40px', minWidth: '40px', width: '40px', height: '40px', padding: 0 }}
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--texto)' }}>Editar Apoiador</h1>
            <p className="text-xs" style={{ color: 'var(--texto-medio)' }}>Atualize os dados e respostas</p>
          </div>
        </div>

        {canManageAll && (
          <button
            id="btn-excluir"
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 transition-all duration-150 rounded-xl"
            style={{
              minHeight: '40px', height: '40px', padding: '0 1rem', fontSize: '0.8rem', fontWeight: 700,
              backgroundColor: confirmDel ? '#dc2626' : 'rgba(220, 38, 38, 0.08)',
              border: confirmDel ? 'none' : '1.5px solid rgba(220, 38, 38, 0.25)',
              color: confirmDel ? '#fff' : '#dc2626',
              boxShadow: confirmDel ? '0 4px 14px rgba(220,38,38,0.22)' : 'none',
              cursor: 'pointer'
            }}
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {confirmDel ? 'Confirmar?' : 'Excluir'}
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        
        {/* Bloco 1: Dados Pessoais */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>1. Dados Pessoais</h3>
          
          <div>
            <label htmlFor="nome" className="form-label">Nome completo *</label>
            <input
              id="nome" type="text" autoCapitalize="words"
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
              <label htmlFor="telefone" className="form-label">Celular / WhatsApp *</label>
              <input 
                id="telefone" type="tel" placeholder="(84) 9 9999-9999" maxLength={15}
                className="form-input" 
                value={telefoneValue || ''}
                onChange={(e) => setValue('telefone', formatPhone(e.target.value), { shouldDirty: true })} 
              />
            </div>
            <div>
              <label htmlFor="email" className="form-label">E-mail</label>
              <input
                id="email" type="email" placeholder="nome@email.com"
                className="form-input"
                {...register('email')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label htmlFor="cep" className="form-label">CEP</label>
              <input
                id="cep" type="text" placeholder="00000-000" maxLength={9}
                className="form-input"
                {...register('cep')}
                onChange={(e) => {
                  let val = e.target.value.replace(/\D/g, '');
                  if (val.length > 5) val = val.replace(/^(\d{5})(\d)/, '$1-$2');
                  e.target.value = val;
                  setValue('cep', val);
                }}
              />
            </div>
            <div>
              <label htmlFor="cidade" className="form-label">Cidade *</label>
              <select
                id="cidade"
                className={`form-input ${errors.cidade ? 'border-red-500' : ''}`}
                {...register('cidade', { required: 'Cidade é obrigatória.' })}
              >
                <option value="">Selecione...</option>
                {cidades.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {errors.cidade && <p className="form-error">{errors.cidade.message}</p>}
            </div>
            <div>
              <label htmlFor="bairro" className="form-label">Bairro</label>
              <input id="bairro" type="text" autoCapitalize="words" className="form-input" {...register('bairro')} />
            </div>
          </div>
        </div>

        {/* Bloco 2: Engajamento */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>2. Pesquisa de Engajamento</h3>

          <div>
            <label className="form-label" style={{ textTransform: 'none', letterSpacing: 0 }}>Qual foi a principal ação de Styvenson que impactou você ou sua cidade?</label>
            <textarea className="form-input resize-none" rows={3} {...register('acao_impacto')} />
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

          {/* Multiplicador responsável */}
          {canManageAll && (
            <div>
              <label htmlFor="multiplicador_id" className="form-label" style={{ fontWeight: 600 }}>Multiplicador responsável</label>
              <select 
                id="multiplicador_id" 
                className="form-input" 
                {...register('multiplicador_id')} 
                style={{ backgroundColor: '#fff' }}
              >
                <option value="">— Sem multiplicador (Cadastro Direto) —</option>
                {multiplicadores.map((m) => (
                  <option key={m.id} value={m.multiplicador_id ?? ''}>
                    {m.nome} {m.municipio ? `· ${m.municipio}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Nível de Acesso */}
          {canManageAll && (
            <div style={{
              background: 'rgba(0, 84, 166, 0.03)',
              border: '1px solid var(--borda)',
              borderRadius: '12px',
              padding: '1.25rem',
              marginTop: '0.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)', margin: 0 }}>
                Permissões e Nível de Acesso
              </h3>
              
              <div>
                <label htmlFor="tipo_acesso" className="form-label" style={{ fontWeight: 600 }}>Tipo de Acesso / Função</label>
                <select
                  id="tipo_acesso"
                  value={selectedTipo}
                  onChange={(e) => setSelectedTipo(e.target.value)}
                  className="form-input"
                  style={{ backgroundColor: '#fff' }}
                >
                  <option value="Apoiador">Apoiador (Sem login)</option>
                  <option value="Mobilizador">Mobilizador (Acesso de Voluntário)</option>
                  <option value="Líder de Base">Líder de Base (Acesso de Voluntário)</option>
                  {canManageAll && <option value="Coordenador">Coordenador (Acesso de Assessoria)</option>}
                  {isAdmin && <option value="Admin">Admin (Acesso Total)</option>}
                </select>
              </div>

              {selectedTipo !== 'Apoiador' && (
                <div style={{
                  background: 'rgba(5, 150, 105, 0.05)',
                  border: '1.5px dashed rgba(5, 150, 105, 0.3)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '0.75rem',
                  color: '#047857',
                  lineHeight: '1.4'
                }}>
                  🔑 <strong>Acesso Habilitado:</strong> O apoiador poderá acessar o sistema usando seu e-mail e a senha temporária padrão <strong>SV@12345</strong>.
                </div>
              )}
            </div>
          )}
        </div>

        <button
          id="btn-atualizar"
          type="submit"
          disabled={submitting}
          className="btn-primary w-full mt-2"
        >
          {submitting ? (
            <><Loader2 size={16} className="animate-spin" /> Salvando...</>
          ) : (
            'Salvar Alterações'
          )}
        </button>
      </form>
    </div>
  );
}
