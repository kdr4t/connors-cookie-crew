/* Connor's Cookie Crew: tiny cart that lives in localStorage (no real payments). */
(function () {
  var KEY = 'ccc-cart-v1';
  var PRODUCTS = {
    'minion-munch': { name: 'Minion Munch!', img: 'images/minion-munch.jpg', pos: 'pos-min', url: 'minion-munch.html', price: { dozen: 12, half: 6 } },
    'choco-crater-crunch': { name: 'Choco Crater Crunch!', img: 'images/choco-crater-crunch.jpg', pos: 'pos-cho', url: 'choco-crater-crunch.html', price: { dozen: 10, half: 5 } }
  };
  var SIZE_LABEL = { dozen: 'Dozen (12)', half: 'Half dozen (6)' };
  var MAX = 20;

  function load() {
    try {
      var items = JSON.parse(localStorage.getItem(KEY)) || [];
      return items.filter(function (i) { return PRODUCTS[i.id] && PRODUCTS[i.id].price[i.size] && i.qty > 0; });
    } catch (e) { return []; }
  }
  function save(items) {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
    updateCount();
  }
  function clamp(n) { n = parseInt(n, 10); if (isNaN(n) || n < 1) n = 1; return Math.min(n, MAX); }
  function money(n) { return '$' + n.toFixed(n % 1 ? 2 : 0); }
  function count() { return load().reduce(function (s, i) { return s + i.qty; }, 0); }
  function total() { return load().reduce(function (s, i) { return s + i.qty * PRODUCTS[i.id].price[i.size]; }, 0); }

  function add(id, size, qty) {
    var items = load(), hit = null;
    items.forEach(function (i) { if (i.id === id && i.size === size) hit = i; });
    if (hit) hit.qty = Math.min(hit.qty + qty, MAX); else items.push({ id: id, size: size, qty: clamp(qty) });
    save(items);
  }
  function setQty(id, size, qty) {
    var items = load();
    items.forEach(function (i) { if (i.id === id && i.size === size) i.qty = clamp(qty); });
    save(items);
  }
  function remove(id, size) {
    save(load().filter(function (i) { return !(i.id === id && i.size === size); }));
  }

  function updateCount() {
    var n = count();
    document.querySelectorAll('[data-cart-count]').forEach(function (el) { el.textContent = n; });
  }
  function bump() {
    document.querySelectorAll('.dm-cart').forEach(function (el) {
      el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
    });
  }
  var toastTimer;
  function toast(html) {
    var t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.innerHTML = html;
    t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.remove(); }, 3200);
  }
  function added(id, size, qty) {
    add(id, size, qty);
    bump();
    toast('CHOMP! ' + qty + ' × ' + PRODUCTS[id].name + ' in your cart! <a href="cart.html">See cart →</a>');
  }

  // nav: hamburger
  function initNav() {
    var nav = document.querySelector('.dm-nav'), btn = document.querySelector('.dm-burger');
    if (!nav || !btn) return;
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // quick "Add to Cart" buttons (home + shop cards): add one dozen
  function initQuickAdd() {
    document.querySelectorAll('[data-quick-add]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        added(b.getAttribute('data-quick-add'), 'dozen', 1);
      });
    });
  }

  // product page picker
  function initProduct() {
    var form = document.querySelector('[data-product]');
    if (!form) return;
    var id = form.getAttribute('data-product'), p = PRODUCTS[id];
    var input = form.querySelector('.qty input'), out = form.querySelector('.pp-total');
    function size() { var r = form.querySelector('input[name=size]:checked'); return r ? r.value : 'dozen'; }
    function refresh() {
      input.value = clamp(input.value);
      out.textContent = 'That\'s ' + money(p.price[size()] * input.value) + ' of cookies!';
    }
    form.querySelector('[data-step="-1"]').addEventListener('click', function () { input.value = clamp(+input.value - 1); refresh(); });
    form.querySelector('[data-step="1"]').addEventListener('click', function () { input.value = clamp(+input.value + 1); refresh(); });
    input.addEventListener('change', refresh);
    form.querySelectorAll('input[name=size]').forEach(function (r) { r.addEventListener('change', refresh); });
    form.addEventListener('submit', function (e) { e.preventDefault(); refresh(); added(id, size(), +input.value); });
    refresh();
  }

  // cart page
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function renderCart() {
    var box = document.querySelector('[data-cart]');
    if (!box) return;
    var items = load();
    if (!items.length) {
      box.innerHTML = '<div class="dm-panel plain txt empty"><h3>Uh oh! Your cart is empty!</h3>' +
        '<p>No cookies in here yet. The Cookie Pup is SO sad.</p>' +
        '<a class="dm-btn" href="cookies.html">Fetch Cookies!</a></div>';
      return;
    }
    var rows = items.map(function (i) {
      var p = PRODUCTS[i.id], line = p.price[i.size] * i.qty;
      return '<div class="cart-row">' +
        '<a class="thumb" href="' + p.url + '"><img class="' + p.pos + '" src="' + p.img + '" alt="' + esc(p.name) + '"></a>' +
        '<div><h3><a href="' + p.url + '">' + esc(p.name) + '</a></h3><div class="meta">' + SIZE_LABEL[i.size] + ' · ' + money(p.price[i.size]) + ' each</div></div>' +
        '<div class="ctl"><div class="qty"><button type="button" aria-label="One less" data-act="dec" data-id="' + i.id + '" data-size="' + i.size + '">−</button>' +
        '<input type="number" min="1" max="' + MAX + '" value="' + i.qty + '" aria-label="How many" data-act="set" data-id="' + i.id + '" data-size="' + i.size + '">' +
        '<button type="button" aria-label="One more" data-act="inc" data-id="' + i.id + '" data-size="' + i.size + '">+</button></div>' +
        '<div class="line">' + money(line) + '</div>' +
        '<button type="button" class="rm" data-act="rm" data-id="' + i.id + '" data-size="' + i.size + '">remove</button></div></div>';
    }).join('');
    box.innerHTML = '<div class="dm-two"><div class="cart-list">' + rows + '</div>' +
      '<div class="dm-panel plain cart-sum tilt-r"><h3>Your Cookie Haul</h3>' +
      '<p>' + count() + ' box' + (count() === 1 ? '' : 'es') + ' of cookies</p>' +
      '<div class="tot">' + money(total()) + '</div>' +
      '<button type="button" class="dm-btn red" data-checkout>Checkout!</button>' +
      '<p class="note" style="margin-top:16px">No real money here yet. Pickup and delivery are worked out with Connor\'s dad.</p></div></div>';
  }
  function initCart() {
    var box = document.querySelector('[data-cart]');
    if (!box) return;
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act],[data-checkout]');
      if (!b) return;
      if (b.hasAttribute('data-checkout')) { openModal(); return; }
      var id = b.getAttribute('data-id'), size = b.getAttribute('data-size'), act = b.getAttribute('data-act');
      var cur = load().filter(function (i) { return i.id === id && i.size === size; })[0];
      if (!cur) return;
      if (act === 'inc') setQty(id, size, cur.qty + 1);
      if (act === 'dec') { if (cur.qty <= 1) remove(id, size); else setQty(id, size, cur.qty - 1); }
      if (act === 'rm') remove(id, size);
      renderCart();
    });
    box.addEventListener('change', function (e) {
      var t = e.target;
      if (t.getAttribute('data-act') === 'set') { setQty(t.getAttribute('data-id'), t.getAttribute('data-size'), t.value); renderCart(); }
    });
    renderCart();
  }

  function openModal() {
    var m = document.getElementById('checkout-modal');
    if (!m) return;
    m.hidden = false;
    m.querySelector('[data-close]').focus();
  }
  function initModal() {
    var m = document.getElementById('checkout-modal');
    if (!m) return;
    m.addEventListener('click', function (e) { if (e.target === m || e.target.closest('[data-close]')) m.hidden = true; });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') m.hidden = true; });
  }

  // keep the count right if another tab changes the cart
  window.addEventListener('storage', function (e) { if (e.key === KEY) { updateCount(); renderCart(); } });

  document.addEventListener('DOMContentLoaded', function () {
    initNav(); initQuickAdd(); initProduct(); initCart(); initModal(); updateCount();
  });
  window.CookieCart = { add: add, remove: remove, setQty: setQty, load: load, count: count, total: total };
})();
