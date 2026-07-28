# Ligar o WhatsApp no Time SV

Guia para configurar o envio de mensagens pelo WhatsApp usando a **API oficial da
Meta** (WhatsApp Cloud API). O aplicativo já está pronto — falta criar a conta na
Meta e colar dois dados na tela de Configurações.

**Tempo:** cerca de 40 minutos de trabalho + 1 a 3 dias de espera pela aprovação
dos modelos de mensagem.

---

## Antes de começar

Você vai precisar de:

- Um **número de celular novo, exclusivo para o sistema**. Não pode ser um número
  que já tenha WhatsApp ou WhatsApp Business instalado — ao conectar na API, o
  número deixa de funcionar no aplicativo comum. Um chip pré-pago serve.
- Uma conta no Facebook (pessoal mesmo) para criar o Meta Business.
- CNPJ da campanha em mãos — a Meta pede na verificação do negócio.

> **Por que não usar o número atual da coordenação?** Porque ele seria perdido
> para o uso normal. O ideal é um número só do sistema, que envia código de
> senha e avisos, e que as pessoas reconheçam como "o número oficial".

---

## Passo 1 — Criar a conta de negócios

1. Acesse **business.facebook.com** e faça login com sua conta do Facebook.
2. Clique em **Criar conta** e informe o nome da campanha, seu nome e um e-mail.
3. Em **Configurações do negócio → Central de Segurança**, inicie a
   **verificação do negócio** (envie o CNPJ e um comprovante de endereço).
   Ela pode levar alguns dias — pode seguir com os próximos passos enquanto isso.

## Passo 2 — Criar o aplicativo do WhatsApp

1. Acesse **developers.facebook.com/apps** → **Criar aplicativo**.
2. Escolha o tipo **Negócios** (ou "Outro" → "Negócios").
3. Dê um nome (ex.: `Time SV`) e vincule à conta de negócios do passo 1.
4. No painel do aplicativo, procure o card **WhatsApp** e clique em **Configurar**.

## Passo 3 — Conectar o número

1. Ainda no painel, vá em **WhatsApp → Configuração da API**.
2. Em "Do número de telefone", clique em **Adicionar número de telefone**.
3. Informe o número novo, escolha receber o código por **SMS** ou **ligação** e
   confirme.
4. Depois de verificado, anote o **ID do número de telefone** — é um número
   comprido, tipo `123456789012345`, logo abaixo do telefone.

> ⚠️ Esse ID **não é** o telefone. É o identificador interno que o sistema usa.

## Passo 4 — Gerar o token permanente

O token que aparece na tela de configuração **expira em 24 horas** — não use ele.
Gere um permanente:

1. Vá em **business.facebook.com → Configurações do negócio → Usuários → Usuários
   do sistema**.
2. Clique em **Adicionar**, dê o nome `Time SV API` e escolha a função
   **Administrador**.
3. Com o usuário criado, clique em **Adicionar ativos** → aba **Aplicativos** →
   selecione seu aplicativo → marque **Controle total**.
4. Clique em **Gerar novo token**:
   - Selecione o aplicativo;
   - Em validade, escolha **Nunca expira**;
   - Marque as permissões **whatsapp_business_messaging** e
     **whatsapp_business_management**.
5. **Copie o token na hora** — ele só aparece uma vez.

---

## Passo 5 — Cadastrar os modelos de mensagem

A Meta não deixa enviar texto livre para quem não falou com você nas últimas 24
horas. Todo envio automático precisa de um **modelo aprovado por ela**.

Vá em **business.facebook.com → Ferramentas do WhatsApp → Modelos de mensagem →
Criar modelo** e cadastre os três abaixo, **exatamente como está escrito**.

As chaves `{{1}}`, `{{2}}` e `{{3}}` são preenchidas pelo sistema na hora do
envio — não substitua por nada.

### Modelo 1 — Recuperação de senha

| Campo | Valor |
|---|---|
| **Nome** | `codigo_recuperacao` |
| **Categoria** | **Autenticação** |
| **Idioma** | Português (BR) |

Na categoria Autenticação a Meta monta o texto sozinha. Marque:

- ✅ Adicionar botão **"Copiar código"**
- ✅ Aviso de expiração: **15 minutos**

O resultado fica parecido com:

> `<código>` é seu código de verificação. Por segurança, não compartilhe este código.

### Modelo 2 — Primeiro acesso

| Campo | Valor |
|---|---|
| **Nome** | `acesso_criado` |
| **Categoria** | **Utilidade** |
| **Idioma** | Português (BR) |

**Corpo da mensagem:**

```
Olá, {{1}}! Seu acesso ao Time SV foi criado.

Entre em timesv.com.br com:
E-mail: {{2}}
Senha temporária: {{3}}

No primeiro acesso você vai criar sua senha definitiva. Não compartilhe esta senha com ninguém.
```

Nos **exemplos** que a Meta pede, preencha: `Maria Silva`, `maria@email.com`,
`Abc12345`.

### Modelo 3 — Aviso da campanha

| Campo | Valor |
|---|---|
| **Nome** | `aviso_campanha` |
| **Categoria** | **Marketing** |
| **Idioma** | Português (BR) |

**Corpo da mensagem:**

```
Olá, {{1}}!

{{2}}

— Equipe Time SV
```

- ✅ Marque o **rodapé de descadastro** que a Meta oferece
  ("Pare de receber" / "Sair"). É obrigatório para categoria Marketing e é o que
  mantém o disparo dentro da regra.

Exemplos: `Maria Silva` e `Nossa reunião será no sábado, às 9h, no comitê central.`

> A aprovação costuma sair em algumas horas, mas pode levar até 2 dias. Se algum
> modelo for recusado, a Meta explica o motivo e você pode editar e reenviar.

---

## Passo 6 — Ligar no aplicativo

1. Entre no **timesv.com.br** como administrador.
2. Abra o menu **☰ → Configurações → aba WhatsApp**.
3. Preencha:
   - **Token de acesso** → o token permanente do Passo 4;
   - **ID do número de telefone** → o ID do Passo 3;
   - Marque **Ativar envio por WhatsApp**.
4. Confira se os nomes dos modelos batem com os que você cadastrou
   (`codigo_recuperacao`, `acesso_criado`, `aviso_campanha`).
5. Clique em **Salvar WhatsApp**.
6. Em **Testar o envio**, coloque seu próprio celular com DDD e clique em
   **Testar agora**. Deve chegar uma mensagem em segundos.

---

## O que passa a funcionar

| Situação | O que acontece |
|---|---|
| Pessoa clica em "Esqueceu a senha?" | Recebe o código por **e-mail e WhatsApp**. Basta um dos dois chegar. |
| Você aprova um cadastro | A pessoa recebe a senha temporária por e-mail e WhatsApp. |
| Você faz um disparo no Painel de Controle | Se marcar **"Enviar também por WhatsApp"**, vai para o celular de quem tem telefone cadastrado. |

---

## Custos

A Meta cobra por conversa iniciada, e o valor muda por categoria:

- **Autenticação e Utilidade** (código de senha, primeiro acesso): as primeiras
  1.000 conversas de serviço por mês são gratuitas; depois, centavos por envio.
- **Marketing** (disparo da campanha): cobrado desde a primeira, em torno de
  R$ 0,30 a R$ 0,60 por pessoa, dependendo do mês.

Ou seja: recuperação de senha e primeiro acesso saem praticamente de graça no
volume da campanha. O disparo em massa é o que pesa — vale planejar quantos
por mês.

---

## Regras que o sistema já respeita

- **Descadastro:** quem pedir para sair não recebe mais os disparos de campanha.
  Mensagens de serviço (código de senha, primeiro acesso) continuam, porque são
  resposta a uma ação da própria pessoa.
- **Limite por disparo:** cada disparo envia no máximo 200 mensagens de uma vez.
  Se o grupo for maior, o sistema avisa quantos ficaram de fora em vez de falhar
  em silêncio.
- **Registro:** todo envio fica gravado na tabela `whatsapp_envios`, com data,
  telefone, modelo e resultado — serve como comprovação se for questionado.

> **Atenção com a legislação eleitoral:** a lei veda a contratação de serviços de
> disparo em massa para propaganda eleitoral, e exige que o envio seja apenas
> para quem consentiu, sempre com opção de descadastro. O caminho oficial da Meta
> com opt-out ativo é o que mantém a campanha dentro da regra — mas confirme o
> uso com a assessoria jurídica antes de disparos grandes em período eleitoral.

---

## Se der errado

| Mensagem | O que fazer |
|---|---|
| `Template name does not exist` | O nome do modelo na tela não bate com o cadastrado na Meta, ou ele ainda não foi aprovado. |
| `Invalid OAuth access token` | O token expirou. Gere um permanente (Passo 4) — não use o de teste. |
| `(#131030) Recipient not in allowed list` | A conta ainda está em modo de teste. Adicione o número em WhatsApp → Configuração da API → "Para", ou conclua a verificação do negócio. |
| `Message template ... parameter count mismatch` | O corpo do modelo tem mais ou menos `{{n}}` do que o sistema envia. Confira os textos deste guia. |
| Não chega nada, sem erro | Confira se o número de destino tem WhatsApp ativo e se não bloqueou o número da campanha. |
