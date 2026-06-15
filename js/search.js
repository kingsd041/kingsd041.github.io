/*!
 * 站内搜索 - 基于 lunr.js + CJK(中文)分词器
 * - 英文/数字：按词切分，前缀通配匹配（kube -> kubernetes）
 * - 中文：单字(unigram) + 二元组(bigram)，保证子串能命中
 * - 已移除 lunr.trimmer（会清空中文）与 stemmer（会破坏中文）
 */
(function () {
  if (typeof lunr === 'undefined') return;

  // 覆盖 lunr 默认分词器，支持中文
  lunr.tokenizer = function (obj) {
    if (obj == null || obj === undefined) return [];
    if (Array.isArray(obj)) {
      return obj.map(function (t) { return new lunr.Token(String(t).toLowerCase()); });
    }
    var str = String(obj).trim().toLowerCase();
    var tokens = [];

    // 1. 英文/数字：连续字母数字串作为一个 token
    var latin = str.match(/[a-z0-9]+/gi);
    if (latin) {
      for (var i = 0; i < latin.length; i++) tokens.push(latin[i]);
    }

    // 2. 中日韩：提取连续段，切成单字 + 二元组
    var cjkRe = /[一-鿿㐀-䶿]+/g;
    var m;
    while ((m = cjkRe.exec(str)) !== null) {
      var seg = m[0];
      for (var i = 0; i < seg.length; i++) {
        tokens.push(seg.charAt(i));                 // unigram：单字
      }
      for (var j = 0; j < seg.length - 1; j++) {
        tokens.push(seg.substring(j, j + 2));        // bigram：相邻两字
      }
    }

    return tokens.map(function (t) { return new lunr.Token(t); });
  };

  // 仅在搜索页执行
  var input = document.getElementById('search-input');
  var results = document.getElementById('search-results');
  var status = document.getElementById('search-status');
  if (!input || !results) return;

  var docs = [];          // url -> doc 的原文文档（lunr 只存 ref，这里反查详情）
  var docsByUrl = {};
  var idx = null;

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // 从正文里截取关键词附近的一段作为摘要
  function makeSnippet(content, terms) {
    if (!content) return '';
    var lower = content.toLowerCase();
    var pos = -1;
    for (var i = 0; i < terms.length; i++) {
      var p = lower.indexOf(terms[i]);
      if (p > -1) { pos = p; break; }
    }
    var start = pos > -1 ? Math.max(0, pos - 40) : 0;
    var snip = content.substr(start, 160);
    if (start > 0) snip = '…' + snip;
    if (start + 160 < content.length) snip = snip + '…';
    return snip;
  }

  function render(query) {
    var q = query.trim();
    results.innerHTML = '';

    if (!idx) {
      if (status) { status.textContent = '索引加载中…'; status.style.display = 'block'; }
      return;
    }

    if (!q) {
      if (status) { status.textContent = '输入关键词搜索 175+ 篇文章'; status.style.display = 'block'; }
      return;
    }

    var hits = [];
    try {
      // 用自定义分词器切分查询，绕过 lunr QueryParser 对 CJK 的处理；
      // TRAILING 通配实现前缀匹配（kube -> kubernetes，容 -> 容器），OPTIONAL 为 OR 语义更宽松
      var terms = lunr.tokenizer(q).map(function (t) { return t.toString(); });
      hits = idx.query(function (query) {
        terms.forEach(function (term) {
          query.term(term, {
            wildcard: lunr.Query.wildcard.TRAILING,
            presence: lunr.Query.presence.OPTIONAL
          });
        });
      });
    } catch (e) {
      hits = [];
    }

    if (!hits.length) {
      if (status) { status.innerHTML = '没有找到与 <strong>' + escapeHtml(q) + '</strong> 相关的文章'; status.style.display = 'block'; }
      return;
    }

    if (status) status.style.display = 'none';

    var terms = q.toLowerCase().split(/\s+/);
    var html = '';
    for (var i = 0; i < hits.length; i++) {
      var doc = docsByUrl[hits[i].ref];
      if (!doc) continue;

      var tagsHtml = '';
      if (doc.tags && doc.tags.length) {
        tagsHtml = doc.tags.map(function (t) {
          return '<span class="search-tag">' + escapeHtml(t) + '</span>';
        }).join('');
      }

      html +=
        '<article class="search-result">' +
          '<a class="search-result-title" href="' + doc.url + '">' + escapeHtml(doc.title) + '</a>' +
          (doc.subtitle ? '<div class="search-result-sub">' + escapeHtml(doc.subtitle) + '</div>' : '') +
          '<div class="search-result-snippet">' + escapeHtml(makeSnippet(doc.content, terms)) + '</div>' +
          '<div class="search-result-meta">' +
            '<span class="search-result-date">' + escapeHtml(doc.date) + '</span>' +
            '<span class="search-result-tags">' + tagsHtml + '</span>' +
          '</div>' +
        '</article>';
    }
    results.innerHTML = html;
  }

  // 防抖
  var timer = null;
  input.addEventListener('input', function () {
    clearTimeout(timer);
    var val = input.value;
    timer = setTimeout(function () { render(val); }, 180);
  });

  // 回车时把关键词写进 URL，方便分享/刷新保留
  input.addEventListener('keypress', function (e) {
    if (e.which === 13) {
      var v = input.value.trim();
      var url = v ? ('?q=' + encodeURIComponent(v)) : location.pathname;
      history.replaceState(null, '', url);
    }
  });

  // 拉取索引数据并构建 lunr 索引
  var base = document.querySelector('meta[name="search-base"]');
  var baseUrl = base ? base.content : '';
  fetch(baseUrl + '/search.json', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      docs = data;
      for (var i = 0; i < docs.length; i++) docsByUrl[docs[i].url] = docs[i];

      idx = lunr(function () {
        this.ref('url');
        this.field('title', { boost: 10 });
        this.field('subtitle', { boost: 5 });
        this.field('tags', { boost: 5 });
        this.field('content');
        // 关键：移除 trimmer（它只保留 ASCII，会清空中文 token）和 stemmer（避免中文被破坏）
        this.pipeline.remove(lunr.trimmer);
        this.pipeline.remove(lunr.stemmer);
        this.searchPipeline.remove(lunr.trimmer);
        this.searchPipeline.remove(lunr.stemmer);
        docs.forEach(function (d) { this.add(d); }, this);
      });

      // 首次加载：读取 URL 中的 ?q= 并自动搜索
      var params = new URLSearchParams(location.search);
      var q = params.get('q') || '';
      if (q) input.value = q;
      render(q);
    })
    .catch(function () {
      if (status) { status.textContent = '索引加载失败，请刷新重试'; status.style.display = 'block'; }
    });
})();
