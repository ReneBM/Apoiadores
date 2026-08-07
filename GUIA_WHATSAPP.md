# Ligar o WhatsApp no Time SV (Evolution API)

Guia para configurar o envio de mensagens pelo WhatsApp usando a **Evolution
API**. O aplicativo já está pronto — falta subir o Evolution, parear o número e
colar três dados na tela de Configurações.

**Tempo:** cerca de 30 minutos. Não há espera por aprovação de ninguém.

---

## Como funciona (e o que isso custa)

A Evolution controla um **WhatsApp comum**, pareado por QR Code — do mesmo jeito
que o WhatsApp Web. Por isso:

- ✅ **Texto livre.** Nada de modelo aprovado. Você escreve a mensagem na aba
  Mensagens e ela sai como está.
- ✅ **Sem custo por mensagem.** Você paga só o servidor onde o Evolution roda
  (algo entre R$ 25 e R$ 60 por mês numa VPS simples).
- ✅ **No ar hoje.** Sem verificação de CNPJ, sem fila de aprovação.
- ⚠️ **Risco de bloqueio.** Isso não é uma API autorizada pelo WhatsApp. Volume
  alto, mensagem repetida ou denúncia de usuário podem **banir o número** — e
  quando bana, não há recurso. É o preço da flexibilidade.

**Recomendação prática:** use um **chip novo, só para o sistema**. Se o número
cair, você troca o chip e reconecta sem perder nada. Nunca use o número pessoal
do senador ou o da coordenação.

O sistema já ajuda a reduzir o risco: os disparos saem espaçados, respeitam
descadastro e ficam registrados.

---

## Passo 1 — Contratar um servidor

O Evolution precisa rodar num servidor ligado 24h. Não dá para rodar dentro da
Vercel (onde o app está), porque ele precisa manter a conexão do WhatsApp aberta
o tempo todo.

Opções comuns no Brasil:

| Onde | Custo aproximado | Observação |
|---|---|---|
| **Hostinger VPS** | R$ 25–40/mês | tem instalador pronto de Evolution |
| **Contabo / Hetzner** | R$ 30–50/mês | mais barato, painel em inglês |
| **Serviço gerenciado** | R$ 50–100/mês | alguém instala e mantém para você |

Se preferir não mexer com servidor, procure por "Evolution API gerenciada" — há
empresas que entregam o endereço e a chave prontos. Nesse caso, pule direto para
o Passo 4 com os dados que eles te derem.

## Passo 2 — Instalar o Evolution

Na VPS, com Docker instalado, crie um arquivo `docker-compose.yml`:

```yaml
services:
  evolution:
    image: atendai/evolution-api:latest
    restart: always
    ports:
      - "8080:8080"
    environment:
      - AUTHENTICATION_API_KEY=TROQUE_POR_UMA_SENHA_LONGA
      - DEL_INSTANCE=false
    volumes:
      - evolution_instances:/evolution/instances

volumes:
  evolution_instances:
```

Troque `TROQUE_POR_UMA_SENHA_LONGA` por uma senha forte que você inventar — ela é
a **chave de API** que você vai colar no aplicativo. Guarde num lugar seguro.

Suba com:

```bash
docker compose up -d
```

> **Importante:** configure um domínio com HTTPS apontando para esse servidor
> (ex.: `https://evolution.seudominio.com.br`). Sem HTTPS a chave de API trafega
> aberta, e o app da Vercel pode recusar a conexão.

## Passo 3 — Parear o número

1. Abra `https://seu-endereco/manager` no navegador.
2. Informe a chave de API que você definiu.
3. Clique em **Criar instância**, dê o nome **`timesv`** e confirme.
4. Vai aparecer um **QR Code**. No celular do chip novo, abra o WhatsApp →
   **Aparelhos conectados** → **Conectar aparelho** → leia o QR.
5. Quando o estado mudar para **`open`**, está pareado.

> ⚠️ **Não desconecte esse WhatsApp do celular** e não use o mesmo número no
> WhatsApp Web em outro lugar — a sessão pode cair.

## Passo 4 — Ligar no aplicativo

1. Entre no **timesv.com.br** como administrador.
2. Abra o menu **☰ → Configurações → aba WhatsApp**.
3. Preencha:
   - **Endereço do servidor** → `https://evolution.seudominio.com.br`
     (com `https://`, sem barra no final);
   - **Chave de API** → a senha que você definiu no Passo 2;
   - **Nome da instância** → `timesv` (exatamente como criou, respeitando
     maiúsculas e minúsculas).
4. Marque **Ativar envio por WhatsApp**.
5. Clique em **Salvar WhatsApp**.
6. Em **Testar o envio**, coloque seu próprio celular com DDD e clique em
   **Testar agora**. Deve chegar uma mensagem em segundos.

## Passo 5 — Ajustar os textos

Vá em **☰ → Configurações → aba Mensagens**. Cada grupo agora traz o texto do
e-mail **e** o do WhatsApp:

| Mensagem | Variáveis disponíveis |
|---|---|
| **Recuperação de senha** | `{{nome}}`, `{{codigo}}` |
| **Primeiro acesso** | `{{nome}}`, `{{email}}`, `{{senha}}` |
| **Aviso da campanha** | `{{nome}}`, `{{mensagem}}` |

O sistema troca essas chaves pelos dados reais no momento do envio. Funciona a
formatação do WhatsApp: `*negrito*` e `_itálico_`. As quebras de linha chegam
como você escreveu.

O botão **restaurar padrão** aparece quando você mudou o texto, para voltar ao
original.

---

## O que passa a funcionar

| Situação | O que acontece |
|---|---|
| Pessoa clica em "Esqueceu a senha?" | Recebe o código por **e-mail e WhatsApp**. Basta um dos dois chegar. |
| Você aprova um cadastro | A pessoa recebe a senha temporária por e-mail e WhatsApp. |
| Você faz um disparo no Painel de Controle | Se marcar **"Enviar também por WhatsApp"**, vai para o celular de quem tem telefone cadastrado. |

---

## Cuidados para o número não cair

O bloqueio vem quase sempre de comportamento, não de volume puro:

- **Comece devagar.** Nos primeiros dias, poucos envios. Um número novo que
  dispara centenas de mensagens na primeira semana é o padrão clássico de spam.
- **Só para quem se cadastrou.** Nunca importe lista comprada ou de terceiros.
- **Deixe a saída fácil.** O texto padrão do aviso já traz "responda SAIR". Quando
  alguém pedir, marque o descadastro — pessoa irritada denuncia, e denúncia é o
  que derruba número.
- **Evite texto idêntico para milhares.** Usar `{{nome}}` já ajuda: cada mensagem
  sai diferente.
- **Prefira o e-mail para o volume grande.** O WhatsApp é melhor para o que é
  urgente e individual.

> **Atenção com a legislação eleitoral:** a lei veda a contratação de serviços de
> disparo em massa para propaganda eleitoral, e exige que o envio seja apenas
> para quem consentiu, sempre com opção de descadastro. O sistema respeita o
> descadastro e registra cada envio — mas confirme o uso com a assessoria
> jurídica antes de disparos grandes em período eleitoral.

---

## Se der errado

| Mensagem | O que fazer |
|---|---|
| `Invalid apikey` / chave recusada | A chave no app não é a mesma do `AUTHENTICATION_API_KEY` do servidor. |
| `Instance not found` | O nome da instância está diferente do que foi criado. Confira maiúsculas e minúsculas. |
| `a instância está desconectada` | A sessão caiu. Abra o `/manager` e leia o QR Code de novo. |
| `Tempo esgotado ao falar com o servidor` | O servidor está fora do ar ou o endereço está errado. Teste abrir o endereço no navegador. |
| Conecta mas não chega nada | Confira se o número de destino tem WhatsApp e se não bloqueou o número da campanha. |
| Número banido | Troque o chip, crie a instância de novo e leia o QR. Os dados do app não se perdem. |

---

## Voltar para a API oficial da Meta

Se em algum momento o risco de bloqueio pesar mais que a economia, o caminho
oficial continua viável — ele exige aprovação de modelos e cobra por conversa,
mas não bane número. O histórico dessa implementação está no commit `0c2169c`.
