import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Loader2, ChevronLeft } from 'lucide-react';

export default function MultiplicadoresForm({ editMode = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [coordenadores, setCoordenadores] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [loadingData, setLoadingData] = useState(editMode);
  const [apoiadorId, setApoiadorId] = useState(null);
  const [cidades, setCidades] = useState([]);

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

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      nome: '', email: '',
      senha: '',
      municipio: '', telefone: '',
      meta_apoiadores: 0,
      coordenador_id: '',
      perfil_id: '',
      cep: '',
      bairro: ''
    },
  });

  const cepValue = watch('cep');

  useEffect(() => {
    if (cepValue) {
      let val = cepValue.replace(/\D/g, '');
      if (val.length === 8) {
        fetch(`https://viacep.com.br/ws/${val}/json/`)
          .then(res => res.json())
          .then(data => {
            if (!data.erro) {
              if (data.localidade) setValue('municipio', data.localidade);
              if (data.bairro) setValue('bairro', data.bairro);
              toast.success('Endereço preenchido pelo CEP!');
            }
          })
          .catch(err => console.error('Erro ao buscar CEP', err));
      }
    }
  }, [cepValue, setValue]);

  const selectedPerfilId = watch('perfil_id');
  const selectedPerfil = perfis.find(p => p.id === selectedPerfilId);
  const selectedRole = selectedPerfil?.base_role || (selectedPerfilId === 'apoiador' ? 'apoiador' : 'multiplicador');

  // Carrega coordenadores e perfis para os selects
  useEffect(() => {
    api.get('/users/coordenadores')
      .then(({ data }) => setCoordenadores(data))
      .catch(() => {});

    api.get('/perfis')
      .then(({ data }) => setPerfis(data))
      .catch(() => {});
  }, []);

  // Modo edição: carrega dados do usuário
  useEffect(() => {
    if (!editMode || !id) return;
    api.get(`/users/${id}`)
      .then(({ data }) => {
        setApoiadorId(data.apoiador_id || null);
        reset({
          nome: data.nome ?? '',
          email: data.email ?? '',
          senha: '',                       // senha não é retornada
          municipio: data.municipio ?? '',
          telefone: data.telefone ?? '',
          meta_apoiadores: data.meta_apoiadores ?? 0,
          coordenador_id: data.coordenador_id ?? '',
          perfil_id: data.perfil_id ?? '',
        });
      })
      .catch(() => {
        toast.error('Integrante da equipe não encontrado.');
        navigate('/equipe');
      })
      .finally(() => setLoadingData(false));
  }, [editMode, id, navigate, reset]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    const submitData = { ...data };
    
    // Limpa dados de senha se vazio no modo de edição
    if (!submitData.senha) {
      delete submitData.senha;
    }
    
    const selectedPerfil = perfis.find(p => p.id === submitData.perfil_id);
    const baseRole = selectedPerfil?.base_role || (submitData.perfil_id === 'apoiador' ? 'apoiador' : 'multiplicador');

    if (submitData.perfil_id === 'apoiador') {
      submitData.perfil_id = null;
      submitData._demote = true;
      delete submitData.coordenador_id;
      delete submitData.meta_apoiadores;
    } else {
      if (baseRole !== 'multiplicador') {
        delete submitData.coordenador_id;
        delete submitData.meta_apoiadores;
      }
    }

    try {
      if (editMode) {
        await api.put(`/users/${id}`, submitData);
        toast.success('Integrante atualizado com sucesso!');
      } else {
        await api.post('/users', submitData);
        if (baseRole === 'multiplicador') {
          toast.success('Multiplicador criado! Senha temporária enviada para o e-mail.', { duration: 5000 });
        } else {
          toast.success('Integrante de equipe criado com sucesso!');
        }
      }
      navigate('/equipe');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="btn-secondary"
          style={{ minHeight: '40px', minWidth: '40px', width: '40px', height: '40px', padding: 0 }}
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--texto)' }}>
            {editMode ? 'Editar Integrante' : 'Novo Integrante da Equipe'}
          </h1>
          <p className="text-xs" style={{ color: 'var(--texto-medio)' }}>
            {editMode ? 'Atualize os dados da conta da equipe' : 'Crie um acesso para a equipe (voluntários ou assessoria)'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        {apoiadorId && (
          <div style={{
            background: 'rgba(5, 150, 105, 0.05)',
            border: '1.5px dashed rgba(5, 150, 105, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}>
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block', fontSize: '0.8rem', color: '#047857' }}>Este usuário também é um Apoiador!</strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--texto-medio)' }}>Ele preencheu a ficha completa de cadastro.</span>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/apoiadores/${apoiadorId}/editar`)}
              className="btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', whiteSpace: 'nowrap' }}
            >
              Ver Ficha
            </button>
          </div>
        )}

        {/* Nome */}
        <div>
          <label htmlFor="nome" className="form-label">Nome completo *</label>
          <input
            id="nome" type="text" autoCapitalize="words"
            className={`form-input ${errors.nome ? 'border-red-500' : ''}`}
            {...register('nome', { required: 'Nome é obrigatório.', minLength: { value: 3, message: 'Mínimo 3 caracteres.' } })}
          />
          {errors.nome && <p className="form-error">{errors.nome.message}</p>}
        </div>

        {/* E-mail */}
        <div>
          <label htmlFor="email" className="form-label">E-mail (login) *</label>
          <input
            id="email" type="email" inputMode="email" autoComplete="off"
            placeholder="nome@email.com"
            className={`form-input ${errors.email ? 'border-red-500' : ''}`}
            {...register('email', {
              required: 'E-mail é obrigatório.',
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'E-mail inválido.' },
            })}
          />
          {errors.email && <p className="form-error">{errors.email.message}</p>}
        </div>

        {/* Perfil de Acesso */}
        <div>
          <label htmlFor="perfil_id" className="form-label">Perfil de Acesso *</label>
          <select
            id="perfil_id"
            className="form-input"
            style={{ backgroundColor: '#fff' }}
            {...register('perfil_id', { required: 'Perfil de Acesso é obrigatório.' })}
          >
            <option value="">Selecione um perfil...</option>
            {perfis.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} ({p.base_role === 'admin' ? 'Administrador' : p.base_role === 'coordenador' ? 'Coordenador' : 'Multiplicador'})
              </option>
            ))}
            {editMode && (
              <option value="apoiador">Remover da Equipe (Rebaixar a Apoiador)</option>
            )}
          </select>
          {errors.perfil_id && <p className="form-error">{errors.perfil_id.message}</p>}
        </div>

        {/* Senha - Somente para coordenador ou admin */}
        {(selectedRole === 'coordenador' || selectedRole === 'admin') && (
          <div>
            <label htmlFor="senha" className="form-label">
              Senha de acesso {editMode ? '(deixe em branco para não alterar)' : '*'}
            </label>
            <input
              id="senha"
              type="password"
              placeholder={editMode ? 'Preencha apenas para alterar' : 'Senha temporária'}
              className={`form-input ${errors.senha ? 'border-red-500' : ''}`}
              {...register('senha', {
                required: !editMode ? 'Senha é obrigatória para este cargo.' : false,
                validate: {
                  minLen: (v) => !v || v.length >= 8 || 'Senha deve ter no mínimo 8 caracteres.',
                  hasUpper: (v) => !v || /[A-Z]/.test(v) || 'Senha deve conter ao menos uma letra maiúscula.',
                  hasNum: (v) => !v || /[0-9]/.test(v) || 'Senha deve conter ao menos um número.',
                }
              })}
            />
            {errors.senha && <p className="form-error">{errors.senha.message}</p>}
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.68rem', color: 'var(--texto-claro)' }}>
              A senha deve conter no mínimo 8 caracteres, uma letra maiúscula e um número.
            </p>
          </div>
        )}

        {/* Informação sobre senha automática — apenas no modo criação de multiplicador */}
        {!editMode && selectedRole === 'multiplicador' && (
          <div
            style={{
              background: 'rgba(0, 84, 166, 0.04)',
              border: '1.5px dashed var(--borda-forte)',
              borderRadius: '10px',
              padding: '12px 14px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
            }}
          >
            <span style={{ fontSize: '16px', flexShrink: 0 }}>📧</span>
            <p style={{ margin: 0, color: 'var(--texto-medio)', fontSize: '0.8rem', lineHeight: '1.5' }}>
              Uma <strong style={{ color: 'var(--primary)' }}>senha de primeiro acesso</strong> será gerada automaticamente
              e enviada para o e-mail cadastrado. O multiplicador deverá trocá-la
              no primeiro login.
            </p>
          </div>
        )}

        {/* Município + Telefone */}
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
            <label htmlFor="municipio" className="form-label">Município</label>
            <select
              id="municipio"
              className="form-input"
              {...register('municipio')}
            >
              <option value="">Selecione...</option>
              {cidades.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="telefone" className="form-label">Telefone</label>
            <input
              id="telefone" type="tel" inputMode="tel" placeholder="(84) 9..."
              className="form-input"
              {...register('telefone')}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div>
            <label htmlFor="bairro" className="form-label">Bairro</label>
            <input
              id="bairro" type="text" autoCapitalize="words" placeholder="Bairro"
              className="form-input"
              {...register('bairro')}
            />
          </div>
        </div>

        {selectedRole === 'multiplicador' && (
          <>
            {/* Meta de apoiadores */}
            <div>
              <label htmlFor="meta_apoiadores" className="form-label">Meta de apoiadores</label>
              <input
                id="meta_apoiadores" type="number" inputMode="numeric" min={0} placeholder="0"
                className="form-input"
                {...register('meta_apoiadores', { valueAsNumber: true, min: { value: 0, message: 'Valor inválido.' } })}
              />
            </div>

            {/* Coordenador responsável */}
            <div>
              <label htmlFor="coordenador_id" className="form-label">Coordenador regional</label>
              <select id="coordenador_id" className="form-input" {...register('coordenador_id')}>
                <option value="">— Sem coordenador —</option>
                {coordenadores.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <button
          id="btn-salvar-multiplicador"
          type="submit"
          disabled={submitting}
          className="btn-primary w-full mt-2"
        >
          {submitting ? (
            <><Loader2 size={16} className="animate-spin" /> Salvando...</>
          ) : (
            editMode ? 'Salvar Alterações' : 'Criar Conta Equipe'
          )}
        </button>
      </form>
    </div>
  );
}
