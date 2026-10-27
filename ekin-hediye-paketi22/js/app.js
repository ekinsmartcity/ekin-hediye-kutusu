/* Ekin · Hediye paketini oluştur — uygulama mantığı (bağımlılık yok) */
(function () {
  'use strict';

  var D = window.EKIN_DATA;
  var KEY = 'ekin-hediye-paketi:v2';
  var IMG_KEY = 'ekin-hediye-paketi:img:v2';
  var REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var GHOST = 120; // hayalet kart boyutu (px)

  /* ------------------------------------------------------------------ */
  /* yardımcılar                                                         */
  /* ------------------------------------------------------------------ */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var fmt2 = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var fmt4 = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  function tl(n) { return fmt2.format(n) + ' TL'; }
  function usd(n) { return fmt2.format(n) + ' USD'; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function anim(el, frames, opts) {
    if (!el || !el.animate) return { finished: Promise.resolve(), cancel: function () {} };
    if (REDUCE) opts = Object.assign({}, opts, { duration: 1, delay: 0 });
    var a = el.animate(frames, opts);
    if (!a.finished) a.finished = new Promise(function (res) { a.onfinish = res; });
    return a;
  }
  /** Düğümü yalnızca yeri yanlışsa taşır (taşımak CSS animasyonlarını yeniden başlatır). */
  function place(parent, el, i) { if (parent.children[i] !== el) parent.insertBefore(el, parent.children[i] || null); }
  function done(a) { return a.finished.catch(function () {}); }

  /** Türkçe sayı girişi: "49,6540" → 49.654 · "1.100" → 1100 · "3.78" → 3.78 */
  function parseNum(str) {
    if (str === null || str === undefined) return null;
    var s = String(str).replace(/\s|TL|USD|\$|₺/gi, '');
    if (!s) return null;
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    if (!/^\d*\.?\d+$|^\d+\.$/.test(s)) return null;
    var n = Number(s);
    return isFinite(n) && n >= 0 ? n : null;
  }

  /* katalog indeksi */
  var SKU = {};
  var ORDER = [];
  D.catalog.forEach(function (p) {
    p.v.forEach(function (v) {
      SKU[v.sku] = { product: p, variant: v, name: v.label ? p.name + ' · ' + v.label : p.name };
      ORDER.push(v.sku);
    });
  });

  /* ------------------------------------------------------------------ */
  /* durum + kalıcılık                                                   */
  /* ------------------------------------------------------------------ */
  function cleanCart(c) {
    return Array.isArray(c) ? c.filter(function (l) { return l && SKU[l.sku] && l.qty > 0; }).map(function (l) { return { sku: l.sku, qty: Math.floor(l.qty) }; }) : [];
  }
  function load() {
    var s = { cart: [], rateStr: D.rateDefaultStr, rateEdited: false, packStr: D.packDefault, prices: {}, sel: {}, images: {}, saved: [], activeId: null };
    try {
      var raw = localStorage.getItem(KEY) || localStorage.getItem('ekin-hediye-paketi:v1');
      if (raw) {
        var d = JSON.parse(raw);
        s.cart = cleanCart(d.cart);
        if (typeof d.rateStr === 'string') s.rateStr = d.rateStr;
        // eski kayıtlarda bu bayrak yok: kur sunumdaki değerden farklıysa elle değiştirilmiş say
        s.rateEdited = typeof d.rateEdited === 'boolean' ? d.rateEdited : (parseNum(s.rateStr) !== D.rateDefault);
        if (typeof d.packStr === 'string') s.packStr = d.packStr;
        if (d.prices && typeof d.prices === 'object') s.prices = d.prices;
        if (d.sel && typeof d.sel === 'object') s.sel = d.sel;
        if (Array.isArray(d.saved)) s.saved = d.saved.filter(function (b) { return b && b.id; }).map(function (b) { return { id: b.id, name: String(b.name || 'Kutu'), cart: cleanCart(b.cart), at: b.at || Date.now() }; });
        if (d.activeId && s.saved.some(function (b) { return b.id === d.activeId; })) s.activeId = d.activeId;
      }
    } catch (e) {}
    try {
      var im = localStorage.getItem(IMG_KEY) || localStorage.getItem('ekin-hediye-paketi:img:v1');
      if (im) s.images = JSON.parse(im) || {};
    } catch (e) {}
    return s;
  }
  var S = load();
  var saveTimer;
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem(KEY, JSON.stringify({ cart: S.cart, rateStr: S.rateStr, rateEdited: S.rateEdited, packStr: S.packStr, prices: S.prices, sel: S.sel, saved: S.saved, activeId: S.activeId })); } catch (e) {}
      try { localStorage.setItem(IMG_KEY, JSON.stringify(S.images)); } catch (e) {}
    }, 120);
  }

  /* ------------------------------------------------------------------ */
  /* fiyat hesapları                                                     */
  /* ------------------------------------------------------------------ */
  function rate() { var r = parseNum(S.rateStr); return r && r > 0 ? r : null; }
  function rateIsDefault() { var r = rate(); return r !== null && Math.abs(r - D.rateDefault) < 1e-9; }
  function priceOf(sku) {
    var v = SKU[sku].variant, e = S.prices[sku];
    if (e) return { value: parseNum(e.str), cur: e.cur || v.cur, str: e.str };
    return { value: v.price, cur: v.cur, str: v.price === null ? '' : fmt2.format(v.price) };
  }
  function unitTRY(sku) {
    var p = priceOf(sku);
    if (p.value === null) return null;
    if (p.cur === 'USD') { var r = rate(); return r ? p.value * r : null; }
    return p.value;
  }
  function imgOf(sku) { return S.images[sku] || SKU[sku].variant.img || null; }
  /** Kutuda (sepette) gösterilen görsel: kullanıcı görseli > boxImg > katalog görseli */
  function boxImgOf(sku) { return S.images[sku] || SKU[sku].variant.boxImg || SKU[sku].variant.img || null; }
  function packN() { return /^\d+$/.test(S.packStr) ? parseInt(S.packStr, 10) : null; }
  function totalsFor(cart) {
    var known = 0, missing = [];
    cart.forEach(function (l) {
      var u = unitTRY(l.sku);
      if (u === null) missing.push(l.sku); else known += u * l.qty;
    });
    var n = packN();
    return { known: known, missing: missing, packN: n, budget: n === null ? null : known * n, qty: cart.reduce(function (a, l) { return a + l.qty; }, 0) };
  }
  function selected(p) {
    var s = S.sel[p.id];
    return p.v.filter(function (v) { return v.sku === s; })[0] || p.v[0];
  }
  function sameCart(a, b) {
    if (a.length !== b.length) return false;
    var m = {};
    a.forEach(function (l) { m[l.sku] = l.qty; });
    return b.every(function (l) { return m[l.sku] === l.qty; });
  }
  function activeBox() { return S.saved.filter(function (b) { return b.id === S.activeId; })[0] || null; }
  function nextNumber() {
    var names = {};
    S.saved.forEach(function (b) { names[b.name] = 1; });
    var n = S.saved.length + 1;
    while (names[n + '. Kutu']) n++;
    return n;
  }

  /* ------------------------------------------------------------------ */
  /* bildirim                                                            */
  /* ------------------------------------------------------------------ */
  function announce(msg) { var l = $('#live'); l.textContent = ''; setTimeout(function () { l.textContent = msg; }, 30); }
  var toastT, undoFn = null;
  function toast(msg, undo) {
    var t = $('#toast');
    $('#toastText').textContent = msg;
    undoFn = undo || null;
    $('#toastUndo').hidden = !undo;
    t.hidden = false;
    t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.hidden = true; undoFn = null; }, undo ? 6000 : 2600);
  }

  /* ------------------------------------------------------------------ */
  /* katalog                                                             */
  /* ------------------------------------------------------------------ */
  var I_PLUS = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  var I_MINUS = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14"/></svg>';
  var I_X = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var I_IMG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="4" width="18" height="16"/><path d="M3 16l5-5 4 4 3-3 6 6"/></svg>';

  function qtyInBox(p) {
    var q = 0;
    S.cart.forEach(function (l) { if (SKU[l.sku].product.id === p.id) q += l.qty; });
    return q;
  }
  function cardHTML(p) {
    var v = selected(p), pr = priceOf(v.sku), img = imgOf(v.sku), r = rate(), q = qtyInBox(p);
    var price;
    if (pr.value === null) price = '<span class="pmiss">Fiyat giriniz</span>';
    else if (pr.cur === 'USD') price = '<span class="pmain mono">' + usd(pr.value) + '</span><span class="psub mono">' + (r ? '≈ ' + tl(pr.value * r) : 'Kur girilmedi') + '</span>';
    else price = '<span class="pmain mono">' + tl(pr.value) + '</span>';
    var label = p.v.length > 1 ? p.name + ' · ' + v.label : p.name;
    return '<article class="pc" data-pid="' + p.id + '">' +
      '<div class="pimg" data-drag="' + v.sku + '">' +
        (img ? '<img src="' + esc(img) + '" alt="' + esc(p.name) + '" draggable="false">'
             : '<label class="upl">' + I_IMG + 'Görsel ekle<input type="file" accept="image/*" data-upload="' + v.sku + '"></label>') +
        '<span class="inbox"' + (q ? '' : ' hidden') + '>Kutuda ×' + q + '</span>' +
      '</div>' +
      '<h3 class="pname">' + esc(p.name) + '</h3>' +
      (p.v.length > 1 ? '<div class="seg" role="group" aria-label="' + esc(p.segLabel || 'Seçenek') + '">' + p.v.map(function (x) {
        return '<button type="button" data-variant="' + p.id + '|' + x.sku + '" aria-pressed="' + (x.sku === v.sku) + '">' + esc(x.label) + '</button>';
      }).join('') + '</div>' : '') +
      '<div class="prow"><div class="pp">' + price + '</div>' +
      '<button type="button" class="add" data-add="' + v.sku + '" aria-label="' + esc(label) + ' kutuya ekle">' + I_PLUS + 'Ekle</button></div>' +
    '</article>';
  }
  function renderCatalog() {
    var q = $('#search').value.trim().toLocaleLowerCase('tr-TR');
    var list = D.catalog.filter(function (p) {
      if (!q) return true;
      if (p.name.toLocaleLowerCase('tr-TR').indexOf(q) >= 0) return true;
      return p.v.some(function (v) { return (v.label || '').toLocaleLowerCase('tr-TR').indexOf(q) >= 0; });
    });
    $('#grid').innerHTML = list.map(cardHTML).join('');
    $('#catCount').textContent = list.length + ' ürün';
    var nr = $('#noResults');
    nr.hidden = list.length > 0;
    nr.textContent = '“' + $('#search').value.trim() + '” ile eşleşen ürün yok.';
  }
  function updateBadges(popPid) {
    D.catalog.forEach(function (p) {
      var card = $('.pc[data-pid="' + p.id + '"]');
      if (!card) return;
      var b = $('.inbox', card), q = qtyInBox(p);
      b.hidden = !q;
      b.textContent = 'Kutuda ×' + q;
      if (popPid === p.id && q) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
    });
  }

  /* ------------------------------------------------------------------ */
  /* kutu: anahtarlı karo yerleşimi + FLIP                               */
  /* ------------------------------------------------------------------ */
  var tilesEl = $('#tiles');
  /* Kutu ağzının çokgeni (render'dan hesaplandı, kutu görselinin yüzdesi olarak) */
  var BOX_POLY = '13.77,35.81 82.23,35.81 86.17,80.68 9.83,80.68';
  /** Kutudaki ürün sayısına göre sütun/satır. Kutunun içi geniş ve alçak olduğu için önce yan yana dizilir. */
  function layoutFor(n) {
    var cols = n <= 3 ? Math.max(1, n) : n === 4 ? 2 : n <= 6 ? 3 : n <= 8 ? 4 : 5;   // 10'a kadar en fazla 2 sıra
    return { cols: cols, rows: Math.max(1, Math.ceil(n / cols)) };
  }
  /**
   * i. ürünün kutudaki yeri (ürün alanının yüzdesi). Arka sıradakiler kutunun arka tabanına,
   * ön sıradakiler ön duvarın hemen arkasına basar; öndekiler arkadakilerin önünde durur.
   */
  var BACK_FLOOR = 43.4, FRONT_FLOOR = 96;   // ürün alanı içinde arka ve ön taban çizgisi (%)
  function slot(i, n) {
    var L = layoutFor(n), r = Math.floor(i / L.cols), c = i % L.cols;
    var inRow = Math.min(L.cols, n - r * L.cols);
    var R = L.rows;
    var b0 = BACK_FLOOR + 14, b1 = FRONT_FLOOR - 2;                  // sıralar kutunun ortasına toplanır, boşluk kalmaz
    var bottom = R === 1 ? 92 : b0 + (b1 - b0) * (r / (R - 1));
    var depth = R === 1 ? 1 : .9 + .1 * (r / (R - 1));            // arkadakiler biraz küçük
    var hBase = R === 1 ? (n === 1 ? 74 : n === 2 ? 68 : 62) : R === 2 ? (L.cols >= 5 ? 46 : 52) : 38;
    var cellW = 100 / L.cols, wMax = n === 1 ? 52 : cellW * .96;
    var w = Math.min(wMax, cellW * .96) * depth, h = hBase * depth;
    var rowW = inRow * cellW, x0 = (100 - rowW) / 2;              // eksik son sırayı ortala
    var cx = x0 + cellW * (c + .5);
    return { left: cx - w / 2, width: w, top: bottom - h, height: h, z: r + 1 };
  }
  function slotStyle(i, n) {
    var p = slot(i, n);
    return 'left:' + p.left.toFixed(2) + '%;top:' + p.top.toFixed(2) + '%;width:' + p.width.toFixed(2) + '%;height:' + p.height.toFixed(2) + '%;z-index:' + p.z;
  }
  function tileInner(sku, qty) {
    var img = boxImgOf(sku);
    return (img ? '<img src="' + esc(img) + '" alt="' + esc(SKU[sku].name) + '" draggable="false">' : '<div class="ph">' + esc(SKU[sku].name) + '</div>') +
      '<span class="qb mono"' + (qty > 1 ? '' : ' hidden') + '>×' + qty + '</span>';
  }
  function tileMap() {
    var m = {};
    $$('.bt', tilesEl).forEach(function (el) { m[el.dataset.sku] = el; });
    return m;
  }
  /** Karoları sepete göre eşitler. hideSku verilirse o karo görünmez oluşturulur (inişi bekler). */
  function syncTiles(hideSku) {
    var m = tileMap(), keep = {};
    var n = S.cart.length;
    S.cart.forEach(function (l, i) {
      var el = m[l.sku];
      if (!el) {
        el = document.createElement('div');
        el.className = 'bt';
        el.dataset.sku = l.sku;
        el.title = SKU[l.sku].name;
        el.innerHTML = tileInner(l.sku, l.qty);
        if (hideSku === l.sku) el.classList.add('hide');
      } else {
        var img = $('img', el), want = boxImgOf(l.sku);
        if ((img && img.getAttribute('src') !== want) || (!img && want)) el.innerHTML = tileInner(l.sku, l.qty);
        var qb = $('.qb', el);
        qb.hidden = l.qty < 2;
        qb.textContent = '×' + l.qty;
      }
      el.style.cssText = slotStyle(i, n);
      keep[l.sku] = 1;
      place(tilesEl, el, i);
    });
    Object.keys(m).forEach(function (k) { if (!keep[k]) m[k].remove(); });
    $('#dropMsg').hidden = S.cart.length > 0;
  }
  /** fn() DOM'u değiştirir; mevcut karolar eski yerlerinden yenilerine yaylı geçer. */
  function flip(fn) {
    var before = {};
    $$('.bt', tilesEl).forEach(function (el) { before[el.dataset.sku] = el.getBoundingClientRect(); });
    fn();
    $$('.bt', tilesEl).forEach(function (el) {
      var a = before[el.dataset.sku];
      if (!a) return;
      var b = el.getBoundingClientRect();
      var dx = a.left - b.left, dy = a.top - b.top, s = a.height && b.height ? a.height / b.height : 1;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(s - 1) < .01) return;
      anim(el, [{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')' }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.34,1.4,.64,1)' });
    });
  }
  function thud() {
    anim($('#gbox'), [{ transform: 'scale(1.018)' }, { transform: 'scale(.985,.97)', offset: .35 }, { transform: 'scale(1.006)', offset: .7 }, { transform: 'none' }], { duration: 460, easing: 'ease-out' });
  }
  function tileImgRect(el) {
    var i = $('img', el) || $('.ph', el) || el;
    return i.getBoundingClientRect();
  }

  /* ------------------------------------------------------------------ */
  /* hayalet (sürüklenen / uçan ürün)                                    */
  /* ------------------------------------------------------------------ */
  function makeGhost(sku) {
    var g = document.createElement('div');
    g.className = 'ghost';
    var img = boxImgOf(sku);
    g.innerHTML = '<div class="gcard"></div>' + (img ? '<img src="' + esc(img) + '" alt="">' : '<span>' + esc(SKU[sku].name) + '</span>');
    $('#ghostLayer').appendChild(g);
    return g;
  }
  function T(x, y, rot, sc) { return 'translate(' + (x - GHOST / 2) + 'px,' + (y - GHOST / 2) + 'px) rotate(' + rot + 'deg) scale(' + sc + ')'; }
  function scaleFor(rect) { return Math.max(rect.width, rect.height) / (GHOST * .84); }

  /** Hayaleti (x,y,rot,sc) konumundan hedef karoya kavisli uçurur, sonra karoyu gösterir. */
  function flyToTile(g, from, sku, isNew) {
    var el = tileMap()[sku];
    if (!el) { g.remove(); return Promise.resolve(); }
    var r = tileImgRect(el);
    var to = { x: r.left + r.width / 2, y: r.top + r.height / 2, sc: scaleFor(r) };
    var midX = (from.x + to.x) / 2, midY = Math.min(from.y, to.y) - clamp(Math.hypot(to.x - from.x, to.y - from.y) * .22, 40, 140);
    g.classList.add('landing');
    var a = anim(g, [
      { transform: T(from.x, from.y, from.rot, from.sc) },
      { transform: T(midX, midY, from.rot * .3 - 6, Math.max(from.sc, to.sc) * 1.05), offset: .5 },
      { transform: T(to.x, to.y, 0, to.sc) }
    ], { duration: 560, easing: 'cubic-bezier(.45,.05,.25,1)', fill: 'forwards' });
    return done(a).then(function () {
      g.remove();
      el.classList.remove('hide');
      thud();
      if (isNew) anim(el, [{ transform: 'translateY(-10px) scale(.9)' }, { transform: 'translateY(2px) scale(1.05)', offset: .55 }, { transform: 'none' }], { duration: 420, easing: 'ease-out' });
      else {
        anim(el, [{ transform: 'scale(1)' }, { transform: 'scale(1.12)', offset: .4 }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' });
        var qb = $('.qb', el); if (qb) { qb.classList.remove('pop'); void qb.offsetWidth; qb.classList.add('pop'); }
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* sepet işlemleri                                                     */
  /* ------------------------------------------------------------------ */
  /** sku'yu kutuya ekler. from: {x,y,rot,sc,ghost} — hayaletin bulunduğu yer. */
  function addItem(sku, from) {
    var info = SKU[sku], pid = info.product.id;
    var g = from && from.ghost;
    var replaced = null;
    var exists = S.cart.some(function (l) { return l.sku === sku; });
    var isNew = !exists;

    flip(function () {
      if (info.product.exclusive) {
        S.cart.forEach(function (l, i) {
          if (l.sku !== sku && SKU[l.sku].product.id === pid) { replaced = l.sku; S.cart[i] = { sku: sku, qty: l.qty }; }
        });
      }
      if (!replaced) {
        if (exists) S.cart = S.cart.map(function (l) { return l.sku === sku ? { sku: sku, qty: l.qty + 1 } : l; });
        else S.cart = S.cart.concat([{ sku: sku, qty: 1 }]);
      } else {
        isNew = true;
        var old = tileMap()[replaced];
        if (old) old.remove();
      }
      syncTiles(isNew ? sku : null);
    });

    if (!g) {
      // "Ekle" düğmesi: kart görselinden kopyası uçar
      var src = from && from.rect;
      g = makeGhost(sku);
      var start = src ? { x: src.left + src.width / 2, y: src.top + src.height / 2, rot: 0, sc: scaleFor(src) * .8 } : null;
      if (!start) { var tr = $('#liner').getBoundingClientRect(); start = { x: tr.left + tr.width / 2, y: tr.top - 60, rot: 0, sc: .6 }; }
      from = start;
    }
    flyToTile(g, from, sku, isNew);

    refreshAfterCart(pid);
    announce(info.name + (isNew ? ' kutuya eklendi.' : ' adedi artırıldı.'));
    if (replaced) toast('Edenred seçeneği ' + info.variant.label + ' ile değiştirildi. Pakette tek Edenred seçeneği olabilir.');
  }
  function setQty(sku, qty) {
    S.cart = S.cart.map(function (l) { return l.sku === sku ? { sku: sku, qty: Math.max(1, qty) } : l; });
    syncTiles();
    var el = tileMap()[sku];
    if (el) anim(el, [{ transform: 'scale(1)' }, { transform: 'scale(1.08)', offset: .4 }, { transform: 'none' }], { duration: 360, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    refreshAfterCart(SKU[sku].product.id);
  }
  function removeItem(sku) {
    var el = tileMap()[sku];
    var before = S.cart.slice();
    var go = function () {
      flip(function () {
        S.cart = S.cart.filter(function (l) { return l.sku !== sku; });
        syncTiles();
      });
      refreshAfterCart();
      toast(SKU[sku].name + ' kutudan çıkarıldı.', function () { setCart(before, 'in'); });
    };
    if (el) {
      el.style.pointerEvents = 'none';
      done(anim(el, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(-26px) scale(.6) rotate(-6deg)', opacity: 0 }], { duration: 260, easing: 'ease-in', fill: 'forwards' })).then(go);
    } else go();
  }
  /** Sepeti toptan değiştirir (boşalt, kayıtlı kutuyu aç, geri al). mode: 'in' giriş animasyonu. */
  function setCart(cart, mode) {
    var old = $$('.bt', tilesEl);
    var outs = old.map(function (el, i) {
      return done(anim(el, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(-34px) scale(.7)', opacity: 0 }], { duration: 240, delay: i * 30, easing: 'ease-in', fill: 'forwards' }));
    });
    return Promise.all(outs).then(function () {
      tilesEl.innerHTML = '';
      S.cart = cleanCart(cart);
      syncTiles();
      refreshAfterCart();
      if (mode === 'in') {
        $$('.bt', tilesEl).forEach(function (el, i) {
          anim(el, [{ transform: 'translateY(-70px) scale(.8) rotate(' + (i % 2 ? 6 : -6) + 'deg)', opacity: 0 }, { transform: 'translateY(4px) scale(1.03)', opacity: 1, offset: .7 }, { transform: 'none', opacity: 1 }], { duration: 560, delay: 60 + i * 55, easing: 'ease-out', fill: 'backwards' });
        });
        if (S.cart.length) setTimeout(thud, 60 + S.cart.length * 55 + 300);
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* sürükle-bırak                                                       */
  /* ------------------------------------------------------------------ */
  var drag = null;
  function boxRect() { return $('#gbox').getBoundingClientRect(); }
  function isOver(x, y) {
    var r = boxRect(), m = 40;
    return x >= r.left - m && x <= r.right + m && y >= r.top - m && y <= r.bottom + m;
  }
  function startPress(e, pimg) {
    if (e.button !== undefined && e.button !== 0) return;
    if (e.target.closest('label')) return;
    var sku = pimg.dataset.drag;
    drag = { sku: sku, pimg: pimg, x0: e.clientX, y0: e.clientY, px: e.clientX, py: e.clientY, type: e.pointerType || 'mouse', active: false, timer: 0, id: e.pointerId };
    if (drag.type === 'touch') {
      pimg.classList.add('press');
      drag.timer = setTimeout(function () { if (drag && !drag.dead) beginDrag(); }, 220);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
  }
  function beginDrag() {
    var d = drag;
    d.active = true;
    d.pimg.classList.remove('press');
    var src = (d.pimg.querySelector('img') || d.pimg).getBoundingClientRect();
    d.g = makeGhost(d.sku);
    // hayalet kart görselinin tam yerinden başlar, sonra işaretçiye yaylanır
    d.x = src.left + src.width / 2; d.y = src.top + src.height / 2;
    d.vx = 0; d.vy = 0; d.rot = 0; d.sc = scaleFor(src) * .84; d.over = false;
    d.pimg.classList.add('lifting');
    document.body.classList.add('is-dragging');
    if (navigator.vibrate && d.type === 'touch') try { navigator.vibrate(8); } catch (e) {}
    d.raf = requestAnimationFrame(tick);
  }
  function tick() {
    var d = drag; if (!d || !d.active) return;
    var tx = d.px, ty = d.py;
    var over = isOver(d.px, d.py);
    if (over) { // kutuya yaklaşınca hafif mıknatıs
      var r = boxRect();
      tx += (r.left + r.width / 2 - tx) * .16; ty += (r.top + r.height / 2 - ty) * .16;
    }
    var k = REDUCE ? 1 : .24, damp = REDUCE ? 0 : .66;
    d.vx = (d.vx + (tx - d.x) * k) * damp; d.vy = (d.vy + (ty - d.y) * k) * damp;
    d.x += d.vx; d.y += d.vy;
    if (REDUCE) { d.x = tx; d.y = ty; }
    d.rot += (clamp(d.vx * 1.4, -18, 18) - d.rot) * .25;
    d.sc += ((over ? .86 : 1.06) - d.sc) * .2;
    d.g.style.transform = T(d.x, d.y, d.rot, d.sc);
    if (over !== d.over) {
      d.over = over;
      $('#gbox').classList.toggle('over', over);
      $('#dropText').textContent = over ? 'Bırak, kutuya yerleşsin' : 'Hediyeleri buraya sürükle';
    }
    d.raf = requestAnimationFrame(tick);
  }
  function onTouchMove(e) { if (drag && drag.active) e.preventDefault(); }
  function onMove(e) {
    var d = drag; if (!d) return;
    d.px = e.clientX; d.py = e.clientY;
    if (!d.active) {
      var dist = Math.hypot(e.clientX - d.x0, e.clientY - d.y0);
      if (d.type === 'touch') { if (dist > 10) { d.dead = true; endDrag(); } return; }
      if (dist < 4) return;
      beginDrag();
    }
    e.preventDefault();
  }
  function onUp(e) {
    var d = drag; if (!d) return;
    if (d.active) {
      cancelAnimationFrame(d.raf);
      var over = e.type === 'pointerup' && isOver(e.clientX, e.clientY);
      var from = { x: d.x, y: d.y, rot: d.rot, sc: d.sc, ghost: d.g };
      var pimg = d.pimg;
      if (over) {
        addItem(d.sku, from);
        pimg.classList.remove('lifting');
      } else {
        // kutunun dışında bırakıldı: yaylanarak karta geri döner
        var back = pimg.isConnected ? (pimg.querySelector('img') || pimg).getBoundingClientRect() : null;
        var g = d.g;
        if (back) {
          done(anim(g, [{ transform: T(d.x, d.y, d.rot, d.sc) }, { transform: T(back.left + back.width / 2, back.top + back.height / 2, 0, scaleFor(back) * .84) }], { duration: 420, easing: 'cubic-bezier(.34,1.3,.64,1)', fill: 'forwards' })).then(function () { g.remove(); pimg.classList.remove('lifting'); });
        } else { g.remove(); }
      }
    }
    endDrag();
  }
  function endDrag() {
    if (drag) { clearTimeout(drag.timer); if (drag.pimg) drag.pimg.classList.remove('press'); }
    drag = null;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    window.removeEventListener('touchmove', onTouchMove);
    document.body.classList.remove('is-dragging');
    $('#gbox').classList.remove('over');
    $('#dropText').textContent = 'Hediyeleri buraya sürükle';
  }

  /* ------------------------------------------------------------------ */
  /* satırlar                                                            */
  /* ------------------------------------------------------------------ */
  var linesEl = $('#lines');
  function rowShell(sku) {
    var row = document.createElement('div');
    row.className = 'ln enter';
    row.dataset.sku = sku;
    var nm = esc(SKU[sku].name);
    row.innerHTML =
      '<div class="lth"></div>' +
      '<div><div class="lname">' + nm + '</div><div class="lunit mono"></div>' +
        '<div class="lmiss" hidden><label class="sr" for="lp-' + sku + '">Birim fiyat</label>' +
        '<input id="lp-' + sku + '" inputmode="decimal" placeholder="Fiyat giriniz" data-price="' + sku + '" autocomplete="off">' +
        '<select aria-label="Para birimi" data-cur="' + sku + '"><option value="TRY">TL</option><option value="USD">USD</option></select></div>' +
      '</div>' +
      '<div class="qty"><button type="button" class="ibtn" data-dec="' + sku + '" aria-label="' + nm + ' adedini azalt">' + I_MINUS + '</button>' +
        '<span class="mono"></span>' +
        '<button type="button" class="ibtn" data-inc="' + sku + '" aria-label="' + nm + ' adedini artır">' + I_PLUS + '</button></div>' +
      '<div class="ltot mono"></div>' +
      '<button type="button" class="ibtn rm" data-rm="' + sku + '" aria-label="' + nm + ' ürününü kaldır">' + I_X + '</button>';
    return row;
  }
  function renderLines() {
    var m = {};
    $$('.ln', linesEl).forEach(function (r) { m[r.dataset.sku] = r; });
    var keep = {};
    S.cart.forEach(function (l, i) {
      var row = m[l.sku] || rowShell(l.sku);
      var pr = priceOf(l.sku), u = unitTRY(l.sku), img = boxImgOf(l.sku);
      var th = $('.lth', row);
      var want = img ? '<img src="' + esc(img) + '" alt="">' : '';
      if (th.dataset.img !== (img || '')) { th.innerHTML = want; th.dataset.img = img || ''; }
      var unit;
      if (pr.value === null) unit = 'Birim fiyat eksik';
      else if (pr.cur === 'USD') unit = usd(pr.value) + (u === null ? ' · kur yok' : ' · ' + tl(u));
      else unit = tl(pr.value);
      $('.lunit', row).textContent = unit;
      var showMiss = SKU[l.sku].variant.price === null || pr.value === null;
      var miss = $('.lmiss', row);
      miss.hidden = !showMiss;
      var inp = $('input', miss), sel = $('select', miss);
      if (document.activeElement !== inp) inp.value = (S.prices[l.sku] && S.prices[l.sku].str) || '';
      sel.value = pr.cur;
      var qs = $('.qty span', row);
      if (qs.textContent !== String(l.qty)) {
        if (qs.textContent) { qs.classList.remove('bump'); void qs.offsetWidth; qs.classList.add('bump'); }
        qs.textContent = l.qty;
      }
      $('[data-dec]', row).disabled = l.qty <= 1;
      $('.ltot', row).textContent = u === null ? '—' : tl(u * l.qty);
      keep[l.sku] = 1;
      place(linesEl, row, i);
    });
    Object.keys(m).forEach(function (k) { if (!keep[k]) m[k].remove(); });
  }

  /* ------------------------------------------------------------------ */
  /* özet + sayı geçişi                                                  */
  /* ------------------------------------------------------------------ */
  var shown = null, tw = null, twRaf = 0;
  function tweenTo(target) {
    if (!shown) { shown = { pp: target.pp, bud: target.bud }; paintNumbers(); return; }
    if (tw && tw.to.pp === target.pp && tw.to.bud === target.bud) return;
    var from = { pp: shown.pp, bud: shown.bud };
    tw = { from: from, to: target, t0: performance.now() };
    cancelAnimationFrame(twRaf);
    var step = function (now) {
      var k = REDUCE ? 1 : Math.min(1, (now - tw.t0) / 380), e = 1 - Math.pow(1 - k, 3);
      function lerp(a, b) { return a === null || b === null ? b : a + (b - a) * e; }
      shown = { pp: lerp(tw.from.pp, tw.to.pp), bud: lerp(tw.from.bud, tw.to.bud) };
      if (k >= 1) shown = { pp: tw.to.pp, bud: tw.to.bud };
      paintNumbers();
      if (k < 1) twRaf = requestAnimationFrame(step);
    };
    twRaf = requestAnimationFrame(step);
  }
  function paintNumbers() {
    var pp = tl(shown.pp || 0);
    $('#ppValue').textContent = pp;
    $('#mbarValue').textContent = pp;
    $('#budgetValue').textContent = shown.bud === null ? '—' : tl(shown.bud);
  }
  function updateSummary() {
    var t = totalsFor(S.cart), miss = t.missing.length > 0;
    $('#ppLabel').textContent = miss ? 'Bilinen ara toplam' : 'Paket başına toplam';
    $('#mbarLabel').textContent = $('#ppLabel').textContent;
    $('#budgetLabel').textContent = miss ? 'Bilinen toplam bütçe' : 'Toplam bütçe';
    $('#missWarn').hidden = !miss;
    $('#missText').textContent = 'Fiyatı eksik ürün: ' + t.missing.map(function (k) { return SKU[k].name; }).join(', ') + '. Fiyat girilene kadar tutar kesin paket toplamı değildir.';
    var def = rateIsDefault();
    $('#rateTag').textContent = def ? D.rateLabel : 'Düzenlenmiş kur';
    $('#resetRate').hidden = def;
    $('#rateBad').hidden = rate() !== null;
    tweenTo({ pp: t.known, bud: t.budget });

    var n = S.cart.length;
    $('#boxMeta').textContent = '· ' + (n ? n + ' ürün · ' + t.qty + ' adet' : 'boş') + (activeBox() ? ' · ' + activeBox().name : '');
    $('#clearBox').disabled = n === 0;
    $('#newBox').hidden = !S.activeId;
    $('#dropMsg').hidden = n > 0;
    renderSaveArea();
  }
  function refreshAfterCart(popPid) {
    renderLines();
    updateSummary();
    updateBadges(popPid);
    renderSavedList();
    persist();
  }
  function refreshPrices() {
    renderCatalog();
    syncTiles();
    renderLines();
    updateSummary();
    renderSavedList();
    if (!$('#view-compare').hidden) renderCompare();
    persist();
  }

  /* ------------------------------------------------------------------ */
  /* kaydetme                                                            */
  /* ------------------------------------------------------------------ */
  var I_SAVE = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/></svg>';
  var I_CHECK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>';
  function renderSaveArea() {
    var a = $('#saveArea'), act = activeBox(), n = nextNumber(), empty = S.cart.length === 0, html;
    if (act && sameCart(act.cart, S.cart) && !empty) {
      html = '<span class="saveState">' + I_CHECK + esc(act.name) + ' kaydedildi</span>' +
        '<button type="button" class="sbtn" data-save="new">' + n + '. kutu olarak kopyala</button>';
    } else if (act) {
      html = '<button type="button" class="pbtn" data-save="update"' + (empty ? ' disabled' : '') + '>' + I_SAVE + esc(act.name) + ' değişikliklerini kaydet</button>' +
        '<button type="button" class="sbtn" data-save="new"' + (empty ? ' disabled' : '') + '>' + n + '. kutu olarak kaydet</button>';
    } else {
      html = '<button type="button" class="pbtn" data-save="new"' + (empty ? ' disabled' : '') + '>' + I_SAVE + n + '. kutuyu kaydet</button>' +
        (empty ? '<span class="saveState">Kaydetmek için kutuya ürün ekle</span>' : '');
    }
    if (a.dataset.html !== html) { a.innerHTML = html; a.dataset.html = html; }
  }
  /** Kutunun küçük kopyası kaydedilen listeye uçar. */
  function flySnapshot(targetEl) {
    if (REDUCE || !targetEl) return;
    var liner = $('#gbox'), r = liner.getBoundingClientRect(), t = targetEl.getBoundingClientRect();
    var c = document.createElement('div');
    c.className = 'flyclone';
    c.style.left = r.left + 'px'; c.style.top = r.top + 'px'; c.style.width = r.width + 'px'; c.style.height = r.height + 'px';
    var inner = liner.cloneNode(true);
    inner.removeAttribute('id');
    $$('[id]', inner).forEach(function (x) { x.removeAttribute('id'); });
    inner.classList.remove('over');
    inner.style.height = '100%';
    c.appendChild(inner);
    document.body.appendChild(c);
    var s = Math.min(t.height * 1.6 / r.height, .3);
    var dx = t.left - r.left, dy = t.top - r.top;
    done(anim(c, [
      { transform: 'none', opacity: 1 },
      { transform: 'translate(' + dx * .45 + 'px,' + (dy * .45 - 60) + 'px) scale(.55) rotate(-3deg)', opacity: 1, offset: .45 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')', opacity: 0 }
    ], { duration: 720, easing: 'cubic-bezier(.45,.05,.25,1)', fill: 'forwards' })).then(function () { c.remove(); });
  }
  function popCount() {
    var c = $('#savedCount');
    c.textContent = S.saved.length;
    c.classList.toggle('zero', S.saved.length === 0);
    anim(c, [{ transform: 'scale(1)' }, { transform: 'scale(1.5)', offset: .35 }, { transform: 'none' }], { duration: 480, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  }
  function saveBox(mode) {
    if (!S.cart.length) return;
    var box;
    if (mode === 'update' && activeBox()) {
      box = activeBox();
      box.cart = S.cart.map(function (l) { return { sku: l.sku, qty: l.qty }; });
      box.at = Date.now();
      toast(box.name + ' güncellendi.');
    } else {
      box = { id: 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: nextNumber() + '. Kutu', cart: S.cart.map(function (l) { return { sku: l.sku, qty: l.qty }; }), at: Date.now() };
      S.saved = S.saved.concat([box]);
      toast(box.name + ' kaydedildi. Karşılaştır sekmesinde görebilirsin.');
    }
    S.activeId = box.id;
    renderSavedList(box.id);
    updateSummary();
    flySnapshot($('#savedList li[data-id="' + box.id + '"]') || $('#tab-compare'));
    popCount();
    persist();
  }
  function openBox(id) {
    var b = S.saved.filter(function (x) { return x.id === id; })[0];
    if (!b) return;
    var prev = { cart: S.cart.slice(), activeId: S.activeId };
    var unsaved = S.cart.length && !S.saved.some(function (x) { return sameCart(x.cart, S.cart); });
    S.activeId = id;
    showView('build');
    var side = $('.side');
    if (side.scrollTop > 0) side.scrollTo({ top: 0, behavior: REDUCE ? 'auto' : 'smooth' });
    if (window.innerWidth <= 900) $('#kutu').scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth' });
    setCart(b.cart, 'in').then(function () {
      renderSavedList();
      if (unsaved) toast(b.name + ' açıldı. Önceki kutu kaydedilmemişti.', function () { S.activeId = prev.activeId; setCart(prev.cart, 'in'); renderSavedList(); });
      else toast(b.name + ' açıldı.');
    });
  }
  function deleteBox(id) {
    var idx = -1;
    S.saved.forEach(function (b, i) { if (b.id === id) idx = i; });
    if (idx < 0) return;
    var b = S.saved[idx], wasActive = S.activeId === id;
    var card = $('.ccard[data-id="' + id + '"]'), li = $('#savedList li[data-id="' + id + '"]');
    var finish = function () {
      S.saved = S.saved.filter(function (x) { return x.id !== id; });
      if (wasActive) S.activeId = null;
      renderSavedList(); updateSummary(); popCount();
      if (!$('#view-compare').hidden) renderCompare();
      persist();
      toast(b.name + ' silindi.', function () {
        var arr = S.saved.slice(); arr.splice(Math.min(idx, arr.length), 0, b); S.saved = arr;
        if (wasActive) S.activeId = id;
        renderSavedList(); updateSummary(); popCount();
        if (!$('#view-compare').hidden) renderCompare();
        persist();
      });
    };
    var el = card || li;
    if (el) done(anim(el, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-12px) scale(.96)' }], { duration: 260, easing: 'ease-in', fill: 'forwards' })).then(finish);
    else finish();
  }
  function renameBox(id, name) {
    S.saved.forEach(function (b) { if (b.id === id) b.name = name.trim() || b.name; });
    persist();
  }
  function renderSavedList(enterId) {
    var wrap = $('#savedWrap'), ul = $('#savedList');
    wrap.hidden = S.saved.length === 0;
    $('#savedCount').textContent = S.saved.length;
    $('#savedCount').classList.toggle('zero', S.saved.length === 0);
    ul.innerHTML = S.saved.map(function (b) {
      var t = totalsFor(b.cart);
      var dirty = b.id === S.activeId && !sameCart(b.cart, S.cart);
      return '<li data-id="' + b.id + '" class="' + (b.id === S.activeId ? 'active' : '') + (b.id === enterId ? ' enter' : '') + '">' +
        '<div><div class="sname">' + esc(b.name) + (b.id === S.activeId ? '<span class="editing">' + (dirty ? 'Düzenleniyor · kaydedilmedi' : 'Açık') + '</span>' : '') + '</div>' +
        '<div class="smeta">' + b.cart.length + ' ürün · ' + t.qty + ' adet</div></div>' +
        '<div class="sval mono">' + tl(t.known) + (t.missing.length ? ' *' : '') + '</div>' +
        '<button type="button" class="tbtn" data-open="' + b.id + '"' + (b.id === S.activeId && !dirty ? ' disabled' : '') + '>Aç</button>' +
        '<button type="button" class="tbtn" data-del="' + b.id + '">Sil</button>' +
      '</li>';
    }).join('');
  }

  /* ------------------------------------------------------------------ */
  /* karşılaştırma                                                       */
  /* ------------------------------------------------------------------ */
  function miniBox(cart) {
    return '<div class="gbox mini" aria-hidden="true">' +
      '<img class="g-lid" src="assets/box/lid.webp" alt=""><img class="g-body" src="assets/box/body.webp" alt="">' +
      (cart.length ? '<div class="g-in"><div class="tiles">' + cart.map(function (l, i) {
        return '<div class="bt" style="' + slotStyle(i, cart.length) + '">' + tileInner(l.sku, l.qty) + '</div>';
      }).join('') + '</div></div>' : '<div class="g-open"><div class="drop">Boş kutu</div></div>') +
      '<img class="g-front" src="assets/box/front.webp" alt=""></div>';
  }
  function compareData() {
    var rows = S.saved.map(function (b) { return { b: b, t: totalsFor(b.cart) }; });
    var complete = rows.filter(function (r) { return !r.t.missing.length && r.b.cart.length; });
    var low = complete.length ? Math.min.apply(null, complete.map(function (r) { return r.t.known; })) : null;
    return { rows: rows, low: low, multi: complete.length > 1 };
  }
  function renderCompare() {
    var body = $('#compareBody'), n = packN(), r = rate();
    $('#cmpBasis').textContent = 'Hesap: 1 USD = ' + (r ? fmt4.format(r) : '—') + ' TL (' + (rateIsDefault() ? D.rateLabel : 'düzenlenmiş kur') + ') · ' + (n === null ? '—' : n.toLocaleString('tr-TR')) + ' paket · güncel birim fiyatlar';
    $('#copyCompare').disabled = S.saved.length === 0;
    if (!S.saved.length) {
      body.innerHTML = '<div class="cmpEmpty">' + miniBox([]).replace('class="gbox mini"', 'class="gbox mini" style="width:220px"') +
        '<div>Henüz kaydedilmiş kutu yok.<br>Kutu oluştur sekmesinde ürünleri ekleyip <b>“1. kutuyu kaydet”</b> ile başla.</div>' +
        '<button type="button" class="pbtn" data-goto="build">Kutu oluştur</button></div>';
      return;
    }
    var cd = compareData();
    var cards = cd.rows.map(function (r, i) {
      var isLow = cd.multi && r.t.known === cd.low && !r.t.missing.length;
      var diff = '';
      if (r.t.missing.length) diff = '<span class="difftag">Fiyatı eksik ürün var</span>';
      else if (isLow) diff = '<span class="lowtag">En düşük</span>';
      else if (cd.low !== null && cd.multi) diff = '<span class="difftag mono">+' + tl(r.t.known - cd.low) + '</span>';
      return '<article class="ccard' + (isLow ? ' low' : '') + '" data-id="' + r.b.id + '" style="animation-delay:' + (i * 70) + 'ms">' +
        '<div class="chead"><label class="sr" for="cn-' + r.b.id + '">Kutu adı</label><input class="cname" id="cn-' + r.b.id + '" value="' + esc(r.b.name) + '" data-rename="' + r.b.id + '" maxlength="40">' + diff + '</div>' +
        miniBox(r.b.cart) +
        '<div class="cmeta">' + r.b.cart.length + ' ürün · ' + r.t.qty + ' adet</div>' +
        '<div><div class="lbl">' + (r.t.missing.length ? 'Bilinen ara toplam' : 'Paket başına toplam') + '</div><div class="cval mono">' + tl(r.t.known) + '</div></div>' +
        '<div class="cbud"><span class="muted">' + (r.t.missing.length ? 'Bilinen toplam bütçe' : 'Toplam bütçe') + ': </span><span class="mono">' + (r.t.budget === null ? '—' : tl(r.t.budget)) + '</span></div>' +
        '<div class="cacts"><button type="button" class="sbtn" data-open="' + r.b.id + '">Kutuyu aç</button><button type="button" class="tbtn" data-del="' + r.b.id + '">Sil</button></div>' +
      '</article>';
    }).join('');

    // ürün × kutu tablosu
    var used = {};
    S.saved.forEach(function (b) { b.cart.forEach(function (l) { used[l.sku] = 1; }); });
    var skus = ORDER.filter(function (k) { return used[k]; });
    var head = '<tr><th>Ürün</th>' + cd.rows.map(function (r) { return '<th data-hid="' + r.b.id + '">' + esc(r.b.name) + '</th>'; }).join('') + '</tr>';
    var bodyRows = skus.map(function (k) {
      var u = unitTRY(k), img = boxImgOf(k);
      return '<tr><td><div class="pcell">' + (img ? '<img src="' + esc(img) + '" alt="">' : '') + '<span>' + esc(SKU[k].name) + '</span></div></td>' +
        cd.rows.map(function (r) {
          var l = r.b.cart.filter(function (x) { return x.sku === k; })[0];
          if (!l) return '<td class="no">—</td>';
          return '<td class="mono">' + (u === null ? 'fiyat eksik' : tl(u * l.qty)) + '<span class="q">× ' + l.qty + '</span></td>';
        }).join('') + '</tr>';
    }).join('');
    var foot =
      '<tr><td>Paket başına toplam</td>' + cd.rows.map(function (r) { var lo = cd.multi && !r.t.missing.length && r.t.known === cd.low; return '<td class="mono' + (lo ? ' lowc' : '') + '">' + tl(r.t.known) + (r.t.missing.length ? ' *' : '') + '</td>'; }).join('') + '</tr>' +
      '<tr><td>Toplam bütçe (' + (n === null ? '—' : n.toLocaleString('tr-TR')) + ' paket)</td>' + cd.rows.map(function (r) { return '<td class="mono">' + (r.t.budget === null ? '—' : tl(r.t.budget)) + (r.t.missing.length ? ' *' : '') + '</td>'; }).join('') + '</tr>' +
      (cd.multi ? '<tr><td>En düşüğe göre fark (bütçe)</td>' + cd.rows.map(function (r) { return '<td class="mono">' + (r.t.missing.length || n === null ? '—' : (r.t.known === cd.low ? 'En düşük' : '+' + tl((r.t.known - cd.low) * n))) + '</td>'; }).join('') + '</tr>' : '');
    var star = cd.rows.some(function (r) { return r.t.missing.length; }) ? '<p class="note">* Fiyatı eksik ürün içerir; tutar kesin değildir.</p>' : '';
    body.innerHTML = '<div class="cards">' + cards + '</div>' +
      '<div class="mwrap"><table class="matrix"><thead>' + head + '</thead><tbody>' + bodyRows + '</tbody><tfoot>' + foot + '</tfoot></table></div>' + star +
      '<p class="note">Toplam, girilen ürün bedelleri üzerinden hesaplanır.</p>';
  }

  /* ------------------------------------------------------------------ */
  /* kopyalama                                                           */
  /* ------------------------------------------------------------------ */
  function rateLine() {
    var r = rate();
    return 'Kur: 1 USD = ' + (r ? fmt4.format(r) : '—') + ' TL' + (rateIsDefault() ? ' (' + D.rateLabel + ')' : ' (düzenlenmiş kur)');
  }
  function lineText(l) {
    var p = priceOf(l.sku), u = unitTRY(l.sku), nm = SKU[l.sku].name;
    if (u === null) return '- ' + nm + ' × ' + l.qty + ' — fiyat eksik';
    if (p.cur === 'USD') return '- ' + nm + ' × ' + l.qty + ' — ' + usd(p.value) + ' (' + tl(u) + ') = ' + tl(u * l.qty);
    return '- ' + nm + ' × ' + l.qty + ' — ' + tl(u) + ' = ' + tl(u * l.qty);
  }
  function boxText(cart, title) {
    var t = totalsFor(cart), L = [title, ''];
    cart.forEach(function (l) { L.push(lineText(l)); });
    if (!cart.length) L.push('(Kutu boş)');
    L.push('');
    if (t.missing.length) {
      L.push('Bilinen ara toplam (paket başına): ' + tl(t.known));
      L.push('Fiyatı eksik ürün: ' + t.missing.map(function (k) { return SKU[k].name; }).join(', '));
    } else L.push('Paket başına toplam: ' + tl(t.known));
    L.push('Paket adedi: ' + (t.packN === null ? '—' : t.packN.toLocaleString('tr-TR')));
    L.push((t.missing.length ? 'Bilinen toplam bütçe: ' : 'Toplam bütçe: ') + (t.budget === null ? '—' : tl(t.budget)));
    return L.join('\n');
  }
  function summaryText() {
    var act = activeBox();
    return boxText(S.cart, 'EKİN HEDİYE PAKETİ' + (act ? ' — ' + act.name : '')) + '\n' + rateLine() + '\n\nToplam, girilen ürün bedelleri üzerinden hesaplanır.';
  }
  function compareText() {
    var cd = compareData();
    var out = ['EKİN HEDİYE PAKETİ — KUTU KARŞILAŞTIRMASI', rateLine(), ''];
    cd.rows.forEach(function (r) {
      var tag = cd.multi && !r.t.missing.length && r.t.known === cd.low ? ' [en düşük]' : '';
      out.push(boxText(r.b.cart, r.b.name.toLocaleUpperCase('tr-TR') + tag));
      out.push('');
    });
    out.push('Toplam, girilen ürün bedelleri üzerinden hesaplanır.');
    return out.join('\n');
  }
  function copy(text, btn, outEl) {
    var label = $('span', btn), orig = label.textContent;
    function ok() { label.textContent = 'Kopyalandı'; outEl.hidden = true; setTimeout(function () { label.textContent = orig; }, 1800); }
    function fail() { outEl.textContent = text; outEl.hidden = false; var s = window.getSelection(), rg = document.createRange(); rg.selectNodeContents(outEl); s.removeAllRanges(); s.addRange(rg); label.textContent = 'Metni seçip kopyala'; }
    function legacy() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.left = '-9999px';
      document.body.appendChild(ta); ta.select();
      var okk = false; try { okk = document.execCommand('copy'); } catch (e) {}
      ta.remove();
      if (okk) ok(); else fail();
    }
    try {
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, legacy);
      else legacy();
    } catch (e) { legacy(); }
  }

  /* ------------------------------------------------------------------ */
  /* görsel yükleme                                                      */
  /* ------------------------------------------------------------------ */
  function readImage(sku, input) {
    var f = input.files && input.files[0];
    input.value = '';
    if (!f || !/^image\//.test(f.type)) return;
    var url = URL.createObjectURL(f), img = new Image();
    img.onload = function () {
      var data = null;
      try {
        var k = Math.min(1, 640 / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        data = c.toDataURL('image/webp', .86);
        if (data.indexOf('data:image/webp') !== 0) data = c.toDataURL('image/png');
      } catch (e) { data = null; }
      URL.revokeObjectURL(url);
      if (!data) { toast('Görsel okunamadı.'); return; }
      S.images = Object.assign({}, S.images); S.images[sku] = data;
      refreshPrices();
      if (!$('#editor').hidden) renderEditor();
      toast('Görsel eklendi: ' + SKU[sku].name);
    };
    img.onerror = function () { URL.revokeObjectURL(url); toast('Görsel okunamadı.'); };
    img.src = url;
  }

  /* ------------------------------------------------------------------ */
  /* fiyat düzenleme paneli                                              */
  /* ------------------------------------------------------------------ */
  function setPrice(sku, patch) {
    var cur = priceOf(sku);
    var next = Object.assign({ str: cur.str, cur: cur.cur }, S.prices[sku] || {}, patch);
    S.prices = Object.assign({}, S.prices); S.prices[sku] = next;
  }
  function renderEditor() {
    $('#editor').innerHTML = ORDER.map(function (sku) {
      var pr = priceOf(sku), hasCustom = !!S.images[sku];
      return '<div class="edr"><label for="ep-' + sku + '">' + esc(SKU[sku].name) + '</label>' +
        '<input id="ep-' + sku + '" inputmode="decimal" placeholder="Fiyat giriniz" data-eprice="' + sku + '" value="' + esc(S.prices[sku] ? S.prices[sku].str : pr.str) + '" autocomplete="off">' +
        '<select aria-label="Para birimi" data-ecur="' + sku + '"><option value="TRY"' + (pr.cur === 'TRY' ? ' selected' : '') + '>TL</option><option value="USD"' + (pr.cur === 'USD' ? ' selected' : '') + '>USD</option></select>' +
        '<div class="tools"><label>' + (imgOf(sku) ? 'Görseli değiştir' : 'Görsel ekle') + '<input type="file" accept="image/*" data-upload="' + sku + '"></label>' +
        (hasCustom ? '<button type="button" class="tbtn" style="font-size:11.5px;padding:0" data-clearimg="' + sku + '">Yüklenen görseli kaldır</button>' : '') + '</div></div>';
    }).join('') + '<div class="acts"><button type="button" class="sbtn" id="resetPrices">Sunumdaki fiyatlara dön</button></div>';
  }

  /* ------------------------------------------------------------------ */
  /* görünüm sekmeleri                                                   */
  /* ------------------------------------------------------------------ */
  function showView(v) {
    var build = v === 'build';
    $('#tab-build').setAttribute('aria-selected', build);
    $('#tab-compare').setAttribute('aria-selected', !build);
    $('#view-build').hidden = !build;
    $('#view-compare').hidden = build;
    $('#searchWrap').style.visibility = build ? '' : 'hidden';
    $('#mbar').style.display = build ? '' : 'none';
    if (!build) renderCompare();
  }

  /* ------------------------------------------------------------------ */
  /* olaylar                                                             */
  /* ------------------------------------------------------------------ */
  var grid = $('#grid');
  grid.addEventListener('pointerdown', function (e) {
    var p = e.target.closest('[data-drag]');
    if (p && !drag) startPress(e, p);
  });
  grid.addEventListener('contextmenu', function (e) { if (e.target.closest('[data-drag]')) e.preventDefault(); });
  grid.addEventListener('click', function (e) {
    var a = e.target.closest('[data-add]');
    if (a) {
      var card = a.closest('.pc'), im = card && card.querySelector('.pimg img, .pimg');
      addItem(a.dataset.add, { rect: im ? im.getBoundingClientRect() : null });
      anim(a, [{ transform: 'scale(.9)' }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      return;
    }
    var v = e.target.closest('[data-variant]');
    if (v) {
      var parts = v.dataset.variant.split('|');
      S.sel = Object.assign({}, S.sel); S.sel[parts[0]] = parts[1];
      var old = $('.pc[data-pid="' + parts[0] + '"]');
      var tmp = document.createElement('div'); tmp.innerHTML = cardHTML(D.catalog.filter(function (p) { return p.id === parts[0]; })[0]);
      var fresh = tmp.firstChild;
      old.replaceWith(fresh);
      var fb = $('[data-variant="' + v.dataset.variant + '"]', fresh); if (fb) fb.focus();
      anim($('.pimg img', fresh), [{ opacity: 0, transform: 'scale(.92)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'ease-out' });
      persist();
    }
  });
  document.addEventListener('change', function (e) {
    var u = e.target.closest('[data-upload]');
    if (u) readImage(u.dataset.upload, u);
  });

  $('#search').addEventListener('input', renderCatalog);

  linesEl.addEventListener('click', function (e) {
    var b;
    if ((b = e.target.closest('[data-inc]'))) { var l = S.cart.filter(function (x) { return x.sku === b.dataset.inc; })[0]; if (l) setQty(l.sku, l.qty + 1); }
    else if ((b = e.target.closest('[data-dec]'))) { var l2 = S.cart.filter(function (x) { return x.sku === b.dataset.dec; })[0]; if (l2) setQty(l2.sku, l2.qty - 1); }
    else if ((b = e.target.closest('[data-rm]'))) removeItem(b.dataset.rm);
  });
  linesEl.addEventListener('input', function (e) {
    var i = e.target.closest('[data-price]');
    if (i) { setPrice(i.dataset.price, { str: i.value }); refreshPrices(); }
  });
  linesEl.addEventListener('change', function (e) {
    var s = e.target.closest('[data-cur]');
    if (s) { setPrice(s.dataset.cur, { cur: s.value }); refreshPrices(); }
  });

  $('#clearBox').addEventListener('click', function () {
    var before = S.cart.slice();
    setCart([]).then(function () { toast('Kutu boşaltıldı.', function () { setCart(before, 'in'); }); });
  });
  $('#newBox').addEventListener('click', function () {
    var before = { cart: S.cart.slice(), id: S.activeId };
    S.activeId = null;
    setCart([]).then(function () {
      renderSavedList();
      toast('Yeni kutu başlatıldı.', function () { S.activeId = before.id; setCart(before.cart, 'in'); renderSavedList(); });
    });
  });

  $('#rate').addEventListener('input', function (e) { S.rateStr = e.target.value; S.rateEdited = true; refreshPrices(); });
  $('#resetRate').addEventListener('click', function () { S.rateStr = D.rateDefaultStr; S.rateEdited = false; $('#rate').value = S.rateStr; refreshPrices(); });
  $('#pack').addEventListener('input', function (e) {
    var v = e.target.value.replace(/[^\d]/g, '');
    if (v !== e.target.value) e.target.value = v;
    S.packStr = v; updateSummary(); renderSavedList();
    if (!$('#view-compare').hidden) renderCompare();
    persist();
  });

  $('#saveArea').addEventListener('click', function (e) {
    var b = e.target.closest('[data-save]');
    if (b && !b.disabled) saveBox(b.dataset.save);
  });
  document.addEventListener('click', function (e) {
    var b;
    if ((b = e.target.closest('[data-open]'))) openBox(b.dataset.open);
    else if ((b = e.target.closest('[data-del]'))) deleteBox(b.dataset.del);
    else if ((b = e.target.closest('[data-goto]'))) showView(b.dataset.goto);
    else if ((b = e.target.closest('[data-clearimg]'))) { S.images = Object.assign({}, S.images); delete S.images[b.dataset.clearimg]; refreshPrices(); renderEditor(); }
  });
  $('#compareBody').addEventListener('input', function (e) {
    var i = e.target.closest('[data-rename]');
    if (i) {
      renameBox(i.dataset.rename, i.value);
      var th = $('th[data-hid="' + i.dataset.rename + '"]');
      if (th) th.textContent = i.value.trim() || th.textContent;
      renderSavedList(); updateSummary();
    }
  });

  $('#copyBtn').addEventListener('click', function () { copy(summaryText(), $('#copyBtn'), $('#copyOut')); });
  $('#copyCompare').addEventListener('click', function () { copy(compareText(), $('#copyCompare'), $('#copyOut2')); });

  $('#editToggle').addEventListener('click', function () {
    var ed = $('#editor'), open = ed.hidden;
    ed.hidden = !open;
    this.setAttribute('aria-expanded', open);
    if (open) { renderEditor(); anim(ed, [{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: 'ease-out' }); }
  });
  $('#editor').addEventListener('input', function (e) {
    var i = e.target.closest('[data-eprice]');
    if (i) { setPrice(i.dataset.eprice, { str: i.value }); refreshPrices(); }
  });
  $('#editor').addEventListener('change', function (e) {
    var s = e.target.closest('[data-ecur]');
    if (s) { setPrice(s.dataset.ecur, { cur: s.value }); refreshPrices(); }
  });
  $('#editor').addEventListener('click', function (e) {
    if (e.target.closest('#resetPrices')) { S.prices = {}; refreshPrices(); renderEditor(); toast('Sunumdaki fiyatlara dönüldü.'); }
  });

  $('#tab-build').addEventListener('click', function () { showView('build'); });
  $('#tab-compare').addEventListener('click', function () { showView('compare'); });
  $('.tabs').addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    var next = document.activeElement.id === 'tab-build' ? 'compare' : 'build';
    showView(next); $('#tab-' + next).focus();
  });
  $('#toastUndo').addEventListener('click', function () {
    var f = undoFn; undoFn = null; $('#toast').hidden = true;
    if (f) f();
  });

  /* ------------------------------------------------------------------ */
  /* başlat                                                              */
  /* ------------------------------------------------------------------ */
  $('#hlPoly').setAttribute('points', BOX_POLY);
  $('#rate').value = S.rateStr;
  $('#pack').value = S.packStr;
  renderCatalog();
  syncTiles();
  renderLines();
  $$('.ln', linesEl).forEach(function (r) { r.classList.remove('enter'); });
  updateSummary();
  renderSavedList();
  $('#savedCount').classList.toggle('zero', S.saved.length === 0);

  /* Günlük kur: data/kur.json her iş günü GitHub Actions ile TCMB'den (USD döviz satış) güncellenir.
     Dosya yoksa ya da okunamazsa (ör. sayfa doğrudan dosyadan açıldıysa) js/data.js'teki sunum kuru kalır. */
  if (window.fetch) {
    fetch('data/kur.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (k) {
      var v = k && parseNum(String(k.usdSelling).replace('.', ','));
      if (!v || !(v > 0) || !k.date) return;
      var dd = String(k.date).split('-');
      D.rateDefault = v;
      D.rateDefaultStr = fmt4.format(v).replace(/\./g, '');
      D.rateLabel = 'TCMB döviz satış · ' + (dd.length === 3 ? dd[2] + '.' + dd[1] + '.' + dd[0] : k.date);
      $('#resetRate').textContent = 'Günün kuruna dön';
      if (!S.rateEdited) { S.rateStr = D.rateDefaultStr; $('#rate').value = S.rateStr; }
      refreshPrices();
    }).catch(function () {});
  }

  // test ve hata ayıklama için salt-okunur erişim
  window.EkinHediye = { state: function () { return JSON.parse(JSON.stringify(S)); }, totals: function () { return totalsFor(S.cart); }, summaryText: summaryText, compareText: compareText, parseNum: parseNum };
})();
