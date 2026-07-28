/* ==============================================================
   CMS TIME SV — Runtime do site público
   1. Busca o conteúdo publicado em /api/cms/public/pagina/home e
      aplica os overrides nos elementos marcados com [data-cms].
   2. Aplica configurações globais (cores, analytics, CSS/JS custom).
   3. Registra o acesso (analytics próprio).
   4. Em modo edição (?cms-edit=1, dentro do iframe do painel),
      vira a ponte de edição visual via postMessage.
   O site funciona normalmente se a API estiver fora do ar: os
   textos do HTML são o conteúdo padrão.
   ============================================================== */
(function () {
  'use strict';

  var SLUG = document.body.getAttribute('data-cms-pagina') || 'home';
  var API = '/api/cms';
  var MODO_EDICAO = /[?&]cms-edit=1/.test(location.search) && window.parent !== window;

  window.__CMS = window.__CMS || {};

  /* ── Aplicação de overrides ─────────────────────────────────── */

  function formatarContador(el, valor) {
    var prefixo = el.getAttribute('data-prefixo') || '';
    var sufixo = el.getAttribute('data-sufixo') || '';
    var n = parseFloat(valor) || 0;
    el.textContent = prefixo + n.toLocaleString('pt-BR') + sufixo;
  }

  function aplicarPatch(el, patch) {
    if (!el || !patch) return;
    if (patch.text !== undefined) el.textContent = patch.text;
    if (patch.html !== undefined) el.innerHTML = patch.html;
    if (patch.src !== undefined && 'src' in el) el.src = patch.src;
    if (patch.href !== undefined && 'href' in el) el.href = patch.href;
    if (patch.hidden !== undefined) {
      if (MODO_EDICAO) {
        // No editor, o elemento "removido" fica esmaecido e clicável p/ poder restaurar
        el.classList.toggle('cms-oculto', !!patch.hidden);
        el.style.display = '';
      } else {
        el.style.display = patch.hidden ? 'none' : '';
      }
    }
    if (patch.styles) {
      for (var prop in patch.styles) el.style.setProperty(prop, patch.styles[prop]);
    }
    if (patch.attr) {
      for (var a in patch.attr) {
        el.setAttribute(a, patch.attr[a]);
        // Contadores: se o valor mudou, mostra o valor final formatado
        if (a === 'data-valor' && el.hasAttribute('data-contador')) {
          formatarContador(el, patch.attr[a]);
        }
      }
    }
  }

  function aplicarConteudo(content) {
    for (var chave in content) {
      if (chave === '_listas') continue; // metadado de listas, não é elemento
      var els = document.querySelectorAll('[data-cms="' + chave + '"]');
      for (var i = 0; i < els.length; i++) aplicarPatch(els[i], content[chave]);
    }
  }

  /* ── Listas de cards: clonar/podar conforme content._listas ─────
     Cada lista tem data-cms-lista="prefixo" no contêiner; os cards têm
     chaves "prefixoN.*". Adicionar card = clonar o último card-modelo
     com as chaves renumeradas; remover = patch {hidden} no card.    */

  function infoDeListas() {
    var out = {};
    var conts = document.querySelectorAll('[data-cms-lista]');
    for (var c = 0; c < conts.length; c++) {
      var prefixo = conts[c].getAttribute('data-cms-lista');
      var regex = new RegExp('^' + prefixo + '(\\d+)\\.');
      var max = 0;
      for (var i = 0; i < conts[c].children.length; i++) {
        var k = conts[c].children[i].getAttribute('data-cms');
        var m = k && k.match(regex);
        if (m && !conts[c].children[i].hasAttribute('data-cms-clonado')) {
          max = Math.max(max, parseInt(m[1], 10));
        }
      }
      out[prefixo] = max;
    }
    return out;
  }

  function aplicarListas(content) {
    var alvos = (content && content._listas) || {};
    var conts = document.querySelectorAll('[data-cms-lista]');
    for (var c = 0; c < conts.length; c++) {
      var cont = conts[c];
      var prefixo = cont.getAttribute('data-cms-lista');
      var regex = new RegExp('^' + prefixo + '(\\d+)\\.');
      var base = 0, atual = 0, modelo = null;

      for (var i = 0; i < cont.children.length; i++) {
        var filho = cont.children[i];
        var k = filho.getAttribute('data-cms');
        var m = k && k.match(regex);
        if (!m) continue;
        var idx = parseInt(m[1], 10);
        atual = Math.max(atual, idx);
        if (!filho.hasAttribute('data-cms-clonado')) {
          base = Math.max(base, idx);
          modelo = filho;
        }
      }

      var alvo = Math.max(base, parseInt(alvos[prefixo], 10) || 0);

      // Poda clones além do alvo (ex.: depois de desfazer uma adição)
      var clones = cont.querySelectorAll('[data-cms-clonado]');
      for (var p = 0; p < clones.length; p++) {
        var kc = clones[p].getAttribute('data-cms');
        var mc = kc && kc.match(regex);
        if (mc && parseInt(mc[1], 10) > alvo) { clones[p].remove(); atual = base; }
      }

      // Clona o modelo até alcançar o alvo
      for (var n = atual + 1; n <= alvo && modelo; n++) {
        var novo = modelo.cloneNode(true);
        novo.setAttribute('data-cms-clonado', '');
        novo.classList.add('visivel'); // a animação de entrada já rodou
        var els = [novo].concat(Array.prototype.slice.call(novo.querySelectorAll('[data-cms]')));
        for (var e = 0; e < els.length; e++) {
          var ke = els[e].getAttribute('data-cms');
          if (ke) els[e].setAttribute('data-cms', ke.replace(new RegExp('^' + prefixo + '\\d+\\.'), prefixo + n + '.'));
        }
        cont.appendChild(novo);
      }
    }
    if (window.lucide) window.lucide.createIcons();
  }

  /* ── Configurações globais ──────────────────────────────────── */

  function aplicarConfig(cfg) {
    if (!cfg) return;
    var geral = cfg.geral || {};
    var cores = cfg.cores || {};
    var analytics = cfg.analytics || {};
    var custom = cfg.custom || {};

    if (geral.whatsapp) {
      window.__CMS.whatsapp = String(geral.whatsapp).replace(/\D/g, '');
      var flutuante = document.getElementById('whats-flutuante');
      if (flutuante) {
        flutuante.href = 'https://wa.me/' + window.__CMS.whatsapp +
          '?text=' + encodeURIComponent('Olá! Quero entrar no TIME SV.');
      }
    }
    if (geral.nome) document.title = geral.nome;

    // Cores globais → variáveis CSS
    var mapa = {
      azulClaro: '--azul-claro', azulRoyal: '--azul-royal',
      azulProfundo: '--azul-profundo', ambar: '--ambar', laranja: '--laranja'
    };
    for (var c in mapa) {
      if (cores[c]) document.documentElement.style.setProperty(mapa[c], cores[c]);
    }

    // CSS e JS personalizados (somente fora do modo edição para JS)
    if (custom.css) {
      var st = document.createElement('style');
      st.textContent = custom.css;
      document.head.appendChild(st);
    }
    if (custom.js && !MODO_EDICAO) {
      try { new Function(custom.js)(); } catch (e) { /* JS custom com erro não derruba o site */ }
    }

    // Google Analytics 4
    if (analytics.gaId && !MODO_EDICAO) {
      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(analytics.gaId);
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', analytics.gaId);
    }
    // Meta Pixel
    if (analytics.pixelId && !MODO_EDICAO && !window.fbq) {
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
      document,'script','https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', analytics.pixelId);
      window.fbq('track', 'PageView');
    }
  }

  /* ── Analytics próprio ──────────────────────────────────────── */

  function registrarAcesso() {
    if (MODO_EDICAO || location.protocol === 'file:') return;
    try {
      var visitante = localStorage.getItem('cms_visitante');
      if (!visitante) {
        visitante = 'v-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
        localStorage.setItem('cms_visitante', visitante);
      }
      var dados = JSON.stringify({ pagina: SLUG, visitante: visitante });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(API + '/public/hit', new Blob([dados], { type: 'application/json' }));
      } else {
        fetch(API + '/public/hit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: dados });
      }
    } catch (e) { /* analytics nunca derruba o site */ }
  }

  /* ── Carga inicial ──────────────────────────────────────────── */

  function carregar() {
    if (location.protocol === 'file:') return; // abrindo o arquivo direto, sem API
    fetch(API + '/public/pagina/' + encodeURIComponent(SLUG))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (dados) {
        if (!dados) return;
        if (!MODO_EDICAO) {
          aplicarListas(dados.content || {});
          aplicarConteudo(dados.content || {});
        }
        aplicarConfig(dados.configuracoes);
        window.__CMS.publicado = dados.content || {};
      })
      .catch(function () { /* API fora do ar: site segue com o conteúdo padrão */ });
    registrarAcesso();
  }

  /* ══════════════════════════════════════════════════════════════
     MODO EDIÇÃO — ponte com o painel (postMessage)
     ══════════════════════════════════════════════════════════════ */

  function iniciarModoEdicao() {
    var estilo = document.createElement('style');
    estilo.textContent =
      '[data-cms]{cursor:pointer !important;}' +
      '.cms-hover{outline:2px dashed #F5A623 !important;outline-offset:2px;}' +
      '.cms-selecionado{outline:3px solid #F5A623 !important;outline-offset:2px;}' +
      '.cms-editando{outline:3px solid #2B5BD7 !important;background:rgba(43,91,215,.06);}' +
      '.cms-oculto{opacity:.3 !important;outline:2px dashed #D64545 !important;outline-offset:2px;}' +
      'html{scroll-behavior:auto !important;}';
    document.head.appendChild(estilo);

    var selecionado = null;

    function enviar(msg) { window.parent.postMessage(msg, '*'); }

    function infoDe(el) {
      return {
        chave: el.getAttribute('data-cms'),
        tag: el.tagName.toLowerCase(),
        texto: el.textContent.trim().slice(0, 500),
        html: el.innerHTML.trim().slice(0, 2000),
        src: el.tagName === 'IMG' ? el.getAttribute('src') : null,
        href: el.tagName === 'A' ? el.getAttribute('href') : null,
        contador: el.hasAttribute('data-contador') ? (el.getAttribute('data-valor') || '0') : null,
        youtube: el.getAttribute('data-youtube-id'),
        oculto: el.style.display === 'none'
      };
    }

    document.addEventListener('mouseover', function (e) {
      var el = e.target.closest('[data-cms]');
      if (el) el.classList.add('cms-hover');
    });
    document.addEventListener('mouseout', function (e) {
      var el = e.target.closest('[data-cms]');
      if (el) el.classList.remove('cms-hover');
    });

    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-cms]');
      // Bloqueia navegação e submits durante a edição
      if (e.target.closest('a, button:not(.filtro-btn)')) e.preventDefault();
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      if (selecionado) selecionado.classList.remove('cms-selecionado');
      selecionado = el;
      el.classList.add('cms-selecionado');
      enviar({ cms: 'selecionado', info: infoDe(el) });
    }, true);

    window.addEventListener('message', function (e) {
      var m = e.data || {};
      if (!m.cms) return;

      if (m.cms === 'aplicar') {
        var els = document.querySelectorAll('[data-cms="' + m.chave + '"]');
        for (var i = 0; i < els.length; i++) aplicarPatch(els[i], m.patch);
      }
      if (m.cms === 'aplicar-tudo') {
        aplicarListas(m.content || {});
        aplicarConteudo(m.content || {});
      }
      if (m.cms === 'editar-inline' && selecionado) {
        selecionado.classList.add('cms-editando');
        selecionado.setAttribute('contenteditable', 'true');
        selecionado.focus();
        var aoDigitar = function () {
          enviar({ cms: 'texto-alterado', chave: selecionado.getAttribute('data-cms'), texto: selecionado.textContent });
        };
        selecionado.addEventListener('input', aoDigitar);
        selecionado.addEventListener('blur', function fim() {
          selecionado.removeAttribute('contenteditable');
          selecionado.classList.remove('cms-editando');
          selecionado.removeEventListener('input', aoDigitar);
          selecionado.removeEventListener('blur', fim);
        });
      }
      if (m.cms === 'recarregar') location.reload();
    });

    // Avisa o painel que a página está pronta, com todas as chaves editáveis
    var chaves = [];
    var todos = document.querySelectorAll('[data-cms]');
    for (var i = 0; i < todos.length; i++) {
      var c = todos[i].getAttribute('data-cms');
      if (chaves.indexOf(c) === -1) chaves.push(c);
    }
    enviar({ cms: 'pronto', slug: SLUG, chaves: chaves, listas: infoDeListas() });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      carregar();
      if (MODO_EDICAO) iniciarModoEdicao();
    });
  } else {
    carregar();
    if (MODO_EDICAO) iniciarModoEdicao();
  }
})();
