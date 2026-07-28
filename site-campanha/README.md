# Site de campanha TIME SV + CMS

## O que é

- `index.html` — site público de campanha (arquivo único, HTML/CSS/JS puro).
- `cms-runtime.js` — aplica no site o conteúdo publicado pelo painel e injeta
  as configurações globais (cores, analytics, CSS/JS custom). Sem API, o site
  funciona normalmente com o conteúdo padrão do HTML.
- `admin/` — painel administrativo (CMS + editor visual). Login com as mesmas
  contas do TimeSV (backend Express + Postgres).

## URLs

| Ambiente | Site | Painel |
|---|---|---|
| Local (`npm start` no backend) | http://localhost:3001/campanha/ | http://localhost:3001/campanha/admin/ |
| Produção (Vercel) | https://SEU-DOMINIO/campanha/ | https://SEU-DOMINIO/campanha/admin/ |

## Papéis

| Role do TimeSV | Papel no CMS | Pode |
|---|---|---|
| `admin` | Super administrador | Tudo (configurações, exclusões) |
| `coordenador` | Editor | Editar, publicar, mídia |
| `multiplicador` | Visualizador | Somente leitura |

## Como funciona o conteúdo

Cada elemento editável do site tem um atributo `data-cms="chave"`. O painel
salva um mapa de sobrescritas (texto, imagem, link, valor de contador, estilos,
ocultar) por página, com versionamento em `cms_revisoes`:

- **Rascunho**: autosave a cada ~2s no editor. Não aparece no site.
- **Publicar**: grava revisão `publicada` — o site passa a exibir na hora.
- **Agendar**: em Páginas → Configurar → Agendar (o backend publica sozinho
  quando o horário chega).
- **Restaurar**: Histórico → Versões → Restaurar (vira novo rascunho).

## Banco e storage

- Tabelas `cms_*` são criadas automaticamente na primeira requisição
  (o SQL de referência está em `database/setup_cms.sql`).
- Upload de mídia vai para o Supabase Storage (bucket `feed`, pasta `cms/`).
  Requer `SUPABASE_URL` + `SUPABASE_SECRET_KEY` no ambiente (a integração
  Supabase/Vercel já injeta em produção).

## Observações

- O service worker do app TimeSV não intercepta `/campanha` (ajustado em
  `frontend/vite.config.js` → `navigateFallbackDenylist`). Quem já tinha o PWA
  aberto antes desse ajuste pode precisar de um refresh para atualizar o SW.
- Analytics simples do CMS (tabela `cms_acessos`) alimenta o dashboard;
  GA4/Meta Pixel são injetados pelo runtime se configurados no painel.
