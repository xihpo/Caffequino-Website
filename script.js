(function () {
  // --- Constants & State ---
  const PRICES = {
    'Espresso': 75, 'Cappuccino': 75, 'Caffè Latte': 75, 'Mocha': 75,
    'Hot Chocolate': 55, 'Iced Americano': 114, 'Cold Brew': 59,
    'Iced Caramel Macchiato': 114
  };

  let state = {
    drink: 'Caffè Latte',
    quantity: 1,
    qty: 1,
    sizeName: 'Small',
    sizeUp: 0,
    milk: 'Whole',
    milkUp: 0,
    sugar: '75% Regular',
    addOns: [],
    addOnsTotal: 0,
    orderType: 'Pickup',
    paymentMethod: 'Cash',
    customized: false
  };

  let lastSubmittedOrderId = null;

  // --- DOM Element Cache ---
  const getEl = (id) => document.getElementById(id);

  const orderElements = {
    total: getEl('order-total'),
    buttonTotal: getEl('button-total'),
    breakdown: getEl('breakdown'),
    bannerName: getEl('drink-banner-name'),
    bannerPrice: getEl('drink-banner-price'),
    bannerSub: getEl('drink-banner-sub'),
    qtyValue: getEl('qty-value'),
    cashlessDetails: getEl('cashless-details'),
    cashlessProvider: getEl('cashless-provider'),
    cashlessAmount: getEl('cashless-amount'),
    refNumberInput: getEl('ref-number'),
    orderForm: getEl('order-form'),
    receiptModal: getEl('receipt-modal'),
    receiptBody: getEl('receipt-body'),
    receiptTotal: getEl('receipt-total'),
    trackLiveBtn: getEl('track-live-btn'),
    addressField: getEl('address-field'),
    phone: getEl('phone'),
    instructions: getEl('instructions'),
    cashlessPanel: getEl('cashless-details')
  };

  const trackerElements = {
    count: getEl('tracker-count'),
    list: getEl('tracker-orders-list'),
    modal: getEl('tracker-modal'),
    close: getEl('tracker-close'),
    openBtn: getEl('open-tracker-link')
  };

  // --- Theme Logic ---
  const SUN_SVG = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;

  const MOON_SVG = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

  function renderThemeBtnContent(btn, isDark) {
    btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.setAttribute('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.innerHTML = `
      <span class="theme-toggle-icon">${isDark ? SUN_SVG : MOON_SVG}</span>
      <span class="theme-toggle-label">${isDark ? 'Light' : 'Dark'}</span>
    `;
  }

  function initTheme() {
    const savedTheme = localStorage.getItem('caffequino_theme');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-mode');
    }

    const isStaffPortal = document.getElementById('login-view') || document.getElementById('dashboard-view');

    document.querySelectorAll('nav').forEach(nav => {
      // Add "My Orders" link on customer pages
      if (!isStaffPortal && !nav.querySelector('a[href*="menu.html"] ~ a') && !nav.querySelector('.nav-orders-link')) {
        const myOrdersLink = document.createElement('a');
        myOrdersLink.href = '#';
        myOrdersLink.className = 'nav-orders-link';
        myOrdersLink.textContent = 'My Orders';
        myOrdersLink.onclick = (e) => {
          e.preventDefault();
          const trackerBtn = getEl('open-tracker-link');
          if (trackerBtn) trackerBtn.click();
        };
        nav.appendChild(myOrdersLink);
      }

      // Add theme toggle
      if (!nav.querySelector('.theme-toggle-btn')) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'theme-toggle-btn';
        const isDark = document.body.classList.contains('dark-mode');
        renderThemeBtnContent(btn, isDark);

        btn.addEventListener('click', () => {
          document.body.classList.toggle('dark-mode');
          const darkActive = document.body.classList.contains('dark-mode');
          localStorage.setItem('caffequino_theme', darkActive ? 'dark' : 'light');
          document.querySelectorAll('.theme-toggle-btn').forEach(b => renderThemeBtnContent(b, darkActive));
        });
        nav.appendChild(btn);
      }
    });
  }

  // --- Tracker Logic ---
  function updateTrackerBadge() {
    if (!trackerElements.count) return;
    let myIds = [];
    try { myIds = JSON.parse(localStorage.getItem('caffequino_my_orders') || '[]'); } catch (e) {}
    let orders = [];
    try { orders = JSON.parse(localStorage.getItem('caffequino_orders') || '[]'); } catch (e) {}
    const active = orders.filter(o => myIds.includes(o.id) && o.status !== 'Completed' && o.status !== 'Cancelled');

    if (active.length > 0) {
      trackerElements.count.textContent = active.length;
      trackerElements.count.hidden = false;
    } else {
      trackerElements.count.hidden = true;
    }
  }

  function renderTrackerOrders() {
    if (!trackerElements.list) return;
    let myIds = [];
    try { myIds = JSON.parse(localStorage.getItem('caffequino_my_orders') || '[]'); } catch (e) {}
    let orders = [];
    try { orders = JSON.parse(localStorage.getItem('caffequino_orders') || '[]'); } catch (e) {}

    const myOrders = orders.filter(o => myIds.includes(o.id) && o.status !== 'Completed');
    updateTrackerBadge();

    if (myOrders.length === 0) {
      trackerElements.list.innerHTML = `<div style="text-align: center; color: #7A5C48; padding: 25px;">No active orders found. Place an order on the menu to track it live!</div>`;
      return;
    }

    trackerElements.list.innerHTML = myOrders.slice().reverse().map(order => {
      const status = order.status || 'Pending';
      const canCancel = status === 'Pending';

      const pendingOrBrewingOrders = orders.filter(o => o.status === 'Pending' || o.status === 'Brewing');
      const orderIndex = pendingOrBrewingOrders.findIndex(o => o.id === order.id);

      let queueText = '';
      let ewtMinutes = 3;
      if (status === 'Ready') {
        queueText = 'Ready for pickup at counter!';
        ewtMinutes = 0;
      } else if (status === 'Brewing') {
        queueText = 'Brewing now — almost ready!';
        ewtMinutes = 2;
      } else if (orderIndex !== -1) {
        const aheadCount = orderIndex;
        ewtMinutes = (aheadCount + 1) * 3;
        queueText = aheadCount === 0 ? 'You are next in queue!' : `You are ${aheadCount} order${aheadCount > 1 ? 's' : ''} away from being brewed`;
      } else {
        queueText = 'In queue';
      }

      const stage1Active = status === 'Pending' || status === 'Brewing' || status === 'Ready';
      const stage2Active = status === 'Brewing' || status === 'Ready';
      const stage3Active = status === 'Ready';

      return `
        <div style="background: #FAF6F0; border: 1px solid #E6DDD0; border-radius: 14px; padding: 16px; margin-bottom: 14px; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 2px 8px rgba(44,26,18,0.06);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 700; color: #3D2516; font-family: 'Fraunces', serif; font-size: 1.1em;">Order #${order.orderNo || 101} — ${order.drink} (${order.quantity}x)</span>
            <span style="font-size: 0.8em; padding: 3px 10px; border-radius: 8px; font-weight: 700; background: ${status === 'Ready' ? '#C8E6C9; color: #0F5132;' : status === 'Brewing' ? '#CFF4FC; color: #055160;' : '#FFE5D0; color: #8F4800;'}">${status}</span>
          </div>
          <div style="font-size: 0.85em; color: #7A5C48;">
            ${order.sizeName || 'Regular'}, ${order.milk || 'Whole Milk'}, Sugar: ${order.sugar || 'Normal'}
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; background: #FFF; border: 1px solid #E6DDD0; border-radius: 10px; padding: 10px 14px; margin-top: 4px;">
            <div style="text-align: center; flex: 1; opacity: ${stage1Active ? '1' : '0.4'};">
              <div style="font-size: 1.2em;">\u{1F4CB}</div>
              <div style="font-size: 0.75em; font-weight: 700; color: #3D2516; margin-top: 2px;">Pending Queue</div>
            </div>
            <div style="flex: 0 0 24px; text-align: center; color: #B86B35; font-weight: bold;">➔</div>
            <div style="text-align: center; flex: 1; opacity: ${stage2Active ? '1' : '0.4'};">
              <div style="font-size: 1.2em;">\u{2615}</div>
              <div style="font-size: 0.75em; font-weight: 700; color: #3D2516; margin-top: 2px;">Brewing Now</div>
            </div>
            <div style="flex: 0 0 24px; text-align: center; color: #B86B35; font-weight: bold;">➔</div>
            <div style="text-align: center; flex: 1; opacity: ${stage3Active ? '1' : '0.4'};">
              <div style="font-size: 1.2em;">\u{2728}</div>
              <div style="font-size: 0.75em; font-weight: 700; color: #3D2516; margin-top: 2px;">Ready for Pickup</div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; background: #F5EFE6; padding: 8px 12px; border-radius: 8px; font-size: 0.85em;">
            <span style="color: #5C3A22; font-weight: 600;">\u{1F4CA} ${queueText}</span>
            <span style="color: #B86B35; font-weight: 700;">\u{23F1}\u{FE0F} Est. Wait: ~${ewtMinutes} min</span>
          </div>

          ${canCancel ? `<div style="display: flex; justify-content: flex-end; margin-top: 4px;"><button type="button" onclick="cancelCustomerOrder(${order.id})" style="background: #FFF1F0; color: #A94442; border: 1px solid #EBCCD1; border-radius: 6px; padding: 4px 10px; font-size: 0.75em; font-weight: 600; cursor: pointer;">Cancel Order</button></div>` : ''}
        </div>
      `;
    }).join('');
  }

  function cancelCustomerOrder(orderId) {
    if (!confirm('Are you sure you want to cancel this order?')) return false;
    let orders = [];
    try { orders = JSON.parse(localStorage.getItem('caffequino_orders') || '[]'); } catch (e) {}
    orders = orders.map(o => o.id === orderId ? { ...o, status: 'Cancelled' } : o);
    localStorage.setItem('caffequino_orders', JSON.stringify(orders));

    let myIds = [];
    try { myIds = JSON.parse(localStorage.getItem('caffequino_my_orders') || '[]'); } catch (e) {}
    myIds = myIds.filter(id => id !== orderId);
    localStorage.setItem('caffequino_my_orders', JSON.stringify(myIds));

    renderTrackerOrders();
    updateTrackerBadge();
    return true;
  }

  // --- Order Logic ---
  function recalc() {
    const base = PRICES[state.drink] || 0;
    const singleItemTotal = base + state.sizeUp + state.milkUp + state.addOnsTotal;
    const total = singleItemTotal * state.quantity;

    if (orderElements.qtyValue) orderElements.qtyValue.textContent = state.quantity;
    if (orderElements.total) orderElements.total.textContent = total;
    if (orderElements.buttonTotal) orderElements.buttonTotal.textContent = total;
    if (orderElements.cashlessAmount) orderElements.cashlessAmount.textContent = total;
    if (orderElements.bannerName) orderElements.bannerName.textContent = state.drink || '—';
    if (orderElements.bannerPrice) orderElements.bannerPrice.textContent = `PHP ${base}`;

    const extras = state.sizeUp + state.milkUp + state.addOnsTotal;
    if (orderElements.bannerSub) {
      if (extras > 0) {
        orderElements.bannerSub.textContent = `+PHP ${extras} extras`;
        orderElements.bannerSub.removeAttribute('hidden');
      } else {
        orderElements.bannerSub.setAttribute('hidden', '');
      }
    }

    const rows = [];
    if (state.drink) rows.push([`${state.drink} (x${state.quantity})`, `PHP ${base * state.quantity}`]);
    if (state.sizeName !== 'Small' && state.sizeUp > 0) rows.push([`Size: ${state.sizeName}`, `+PHP ${state.sizeUp * state.quantity}`]);
    if (['Almond', 'Oat'].includes(state.milk) && state.milkUp > 0) rows.push([`Milk: ${state.milk}`, `+PHP ${state.milkUp * state.quantity}`]);
    if (state.sugar) rows.push([`Sugar: ${state.sugar}`, 'Included']);

    document.querySelectorAll('.pill.addon.active').forEach(btn => {
      rows.push([`Add-on: ${btn.dataset.name}`, `+PHP ${parseInt(btn.dataset.val, 10) * state.quantity}`]);
    });

    if (orderElements.breakdown) {
      orderElements.breakdown.innerHTML = rows.map(([label, val]) =>
        `<div class="bd-row"><span>${label}</span><span>${val}</span></div>`).join('');
    }
  }

  function selectPill(cls, btn) {
    document.querySelectorAll(`.pill.${cls}`).forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-checked', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-checked', 'true');
    state.customized = true;
    updateStepBar();
  }

  function updateStepBar() {
    setStep(state.customized ? 2 : 1);
  }

  function setStep(stepNumber) {
    const steps = document.querySelectorAll('.step');
    const progressLine = document.querySelector('.step-bar-progress');

    steps.forEach(step => {
      const s = parseInt(step.dataset.step, 10);
      const numEl = step.querySelector('.step-num');
      step.classList.remove('active', 'done');
      step.removeAttribute('aria-current');

      if (s < stepNumber) {
        step.classList.add('done');
        if (numEl) numEl.textContent = '✓';
      } else if (s === stepNumber) {
        step.classList.add('active');
        step.setAttribute('aria-current', 'step');
        if (numEl) numEl.textContent = String(s);
      } else {
        if (numEl) numEl.textContent = String(s);
      }
    });

    if (progressLine) {
      if (stepNumber === 1) progressLine.style.width = '0%';
      else if (stepNumber === 2) progressLine.style.width = '50%';
      else if (stepNumber === 3) progressLine.style.width = '100%';
    }
  }

  function setOrderType(type) {
    state.orderType = type;
    document.querySelectorAll('.pill.order-type').forEach(b => {
      const active = b.dataset.name === type;
      b.classList.toggle('active', active);
      b.setAttribute('aria-checked', active);
    });
    if (orderElements.addressField) {
      const isDelivery = type === 'Delivery';
      orderElements.addressField.hidden = !isDelivery;
      const addrInput = orderElements.addressField.querySelector('input');
      if (addrInput) addrInput.required = isDelivery;
    }
  }

  function setPaymentMethod(method) {
    state.paymentMethod = method;
    document.querySelectorAll('.pill.payment').forEach(b => {
      const active = b.dataset.name === method;
      b.classList.toggle('active', active);
      b.setAttribute('aria-checked', active);
    });
    const isCashless = method === 'GCash' || method === 'Maya';
    if (orderElements.cashlessDetails) orderElements.cashlessDetails.hidden = !isCashless;
    if (orderElements.cashlessProvider) orderElements.cashlessProvider.textContent = `${method} Payment`;
    if (orderElements.refNumberInput) orderElements.refNumberInput.required = isCashless;
  }

  function setDrink(name) {
    state.drink = name;
    document.querySelectorAll('.menu-item').forEach(c => {
      const isSel = c.dataset.drink === name;
      c.classList.toggle('selected', isSel);
      c.setAttribute('aria-pressed', String(isSel));
    });
    updateMilkGroup();
    setStep(2);
    recalc();
  }

  function updateMilkGroup() {
    const milkGrid = document.querySelector('.milk-grid');
    if (!milkGrid) return;
    const milkGroup = milkGrid.closest('.pill-group');
    const hide = ['Espresso', 'Iced Americano', 'Cold Brew'].includes(state.drink);
    if (milkGroup) milkGroup.hidden = hide;
    if (hide && (state.milk !== 'Whole' || state.milkUp !== 0)) {
      state.milk = 'Whole';
      state.milkUp = 0;
      document.querySelectorAll('.pill.milk').forEach(b => {
        const active = b.dataset.name === 'Whole';
        b.classList.toggle('active', active);
        b.setAttribute('aria-checked', String(active));
      });
    }
  }

  function applySoldOutDrinks() {
    let soldOut = [];
    try { soldOut = JSON.parse(localStorage.getItem('caffequino_soldout') || '[]'); } catch (e) { soldOut = []; }
    document.querySelectorAll('.menu-item').forEach(item => {
      const isSold = soldOut.includes(item.dataset.drink);
      item.classList.toggle('sold-out', isSold);
      if (isSold && item.classList.contains('selected')) {
        const available = [...document.querySelectorAll('.menu-item')].find(i => !soldOut.includes(i.dataset.drink));
        if (available) setDrink(available.dataset.drink);
      }
    });
  }

  function resetCustomerFields() {
    ['name', 'address', 'phone', 'instructions', 'ref-number'].forEach(id => {
      const el = getEl(id);
      if (el) el.value = '';
    });

    state.drink = 'Caffè Latte';
    state.quantity = 1;
    state.qty = 1;
    state.sizeName = 'Small';
    state.sizeUp = 0;
    state.milk = 'Whole';
    state.milkUp = 0;
    state.sugar = '75% Regular';
    state.addOns = [];
    state.addOnsTotal = 0;
    state.orderType = 'Pickup';
    state.paymentMethod = 'Cash';
    state.customized = false;

    document.querySelectorAll('.menu-item').forEach(c => {
      const sel = c.dataset.drink === state.drink;
      c.classList.toggle('selected', sel);
      c.setAttribute('aria-pressed', String(sel));
    });
    document.querySelectorAll('.pill.size, .pill.milk, .pill.sugar').forEach(b => {
      const active = b.dataset.name === (b.classList.contains('size') ? state.sizeName : b.classList.contains('milk') ? state.milk : state.sugar);
      b.classList.toggle('active', active);
      b.setAttribute('aria-checked', String(active));
    });
    document.querySelectorAll('.pill.addon').forEach(b => {
      const active = state.addOns.includes(b.dataset.name);
      b.classList.remove('active');
      b.setAttribute('aria-checked', String(active));
    });
    document.querySelectorAll('.pill.order-type').forEach(b => {
      const active = b.dataset.name === state.orderType;
      b.classList.toggle('active', active);
      b.setAttribute('aria-checked', active);
    });
    document.querySelectorAll('.pill.payment').forEach(b => {
      const active = b.dataset.name === state.paymentMethod;
      b.classList.toggle('active', active);
      b.setAttribute('aria-checked', active);
    });

    if (orderElements.addressField) orderElements.addressField.hidden = true;
    if (orderElements.phone) orderElements.phone.required = false;
    setPaymentMethod('Cash');
    updateMilkGroup();
    setStep(1);
    updateStepBar();
    recalc();
  }

  function setupCopyBtn(btnId, textToCopy) {
    const btn = getEl(btnId);
    if (!btn) return;
    btn.addEventListener('click', () => {
      const handleSuccess = () => {
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        btn.style.background = '#2E7D32';
        btn.style.color = '#FFFDF9';
        setTimeout(() => {
          btn.textContent = orig;
          btn.style.background = '#E6DDD0';
          btn.style.color = '#2C1A12';
        }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(handleSuccess).catch(() => fallbackCopy(textToCopy, handleSuccess));
      } else {
        fallbackCopy(textToCopy, handleSuccess);
      }
    });
  }

  function fallbackCopy(text, cb) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    if (cb) cb();
  }

  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    const focusables = orderElements.receiptModal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      last.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === last) {
      first.focus();
      e.preventDefault();
    }
  }

  // --- Initialization ---
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();

    const isStaffPortal = document.getElementById('login-view') || document.getElementById('dashboard-view');

    // Initialize Tracker for customer pages (Floating Button & Modal)
    if (!isStaffPortal) {
      if (!getEl('open-tracker-link')) {
        const trackerBtn = document.createElement('button');
        trackerBtn.type = 'button';
        trackerBtn.id = 'open-tracker-link';
        trackerBtn.className = 'floating-tracker-btn';
        trackerBtn.setAttribute('aria-label', 'Track My Order');
        trackerBtn.innerHTML = `
          <span>\u{1F4E6} Track My Order</span>
          <span id="tracker-count" class="tracker-badge" hidden>0</span>
        `;
        document.body.appendChild(trackerBtn);
      }

      if (!getEl('tracker-modal')) {
        const trackerModalDiv = document.createElement('div');
        trackerModalDiv.className = 'modal-overlay';
        trackerModalDiv.id = 'tracker-modal';
        trackerModalDiv.hidden = true;
        trackerModalDiv.innerHTML = `
          <div class="modal" role="dialog" aria-modal="true" aria-labelledby="tracker-title" style="max-width: 560px;">
            <button type="button" class="modal-close" id="tracker-close" aria-label="Close tracker">×</button>
            <h3 id="tracker-title">Live Order Tracking Queue</h3>
            <p class="modal-sub">Real-time status, queue position, and estimated wait times for your coffee.</p>
            <div id="tracker-orders-list"></div>

            <div class="lookup-section" style="margin-top: 16px; border-top: 1px dashed #E6DDD0; padding-top: 16px;">
              <h4 class="lookup-title">Lost your order view? Look it up:</h4>
              <form id="lookup-form" class="lookup-form">
                <input type="number" id="lookup-orderno" placeholder="Order # (e.g. 101)" required>
                <input type="text" id="lookup-name" placeholder="Your Name" required>
                <button type="submit" class="lookup-submit-btn">Track</button>
              </form>
              <div id="lookup-error" class="lookup-error" hidden>Order not found. Check your order number and name.</div>
            </div>
          </div>
        `;
        document.body.appendChild(trackerModalDiv);
      }

      // Bind Tracker UI
      const openBtn = getEl('open-tracker-link');
      const modal = getEl('tracker-modal');
      const close = getEl('tracker-close');
      if (openBtn && modal) {
        openBtn.addEventListener('click', (e) => {
          e.preventDefault();
          renderTrackerOrders();
          modal.hidden = false;
        });
        if (close) close.addEventListener('click', () => { modal.hidden = true; });
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; });
      }

      updateTrackerBadge();
    }

    // Bind Order UI (only on menu page with order form)
    if (orderElements.orderForm) {
      setStep(1);
      setOrderType('Pickup');
      setPaymentMethod('Cash');
      applySoldOutDrinks();
      recalc();
    }

    // Menu Item Clicks
    document.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', () => {
        if (item.classList.contains('sold-out')) return;
        setDrink(item.dataset.drink);
      });
    });

    // Category Filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;
        document.querySelectorAll('.menu-item').forEach(item => {
          const match = filter === 'all' || item.dataset.category === filter;
          item.hidden = !match;
        });
      });
    });

    // Quantity Controls
    getEl('qty-minus')?.addEventListener('click', () => {
      if (state.quantity > 1) {
        state.quantity--;
        state.qty = state.quantity;
        state.customized = true;
        updateStepBar();
        recalc();
      }
    });

    getEl('qty-plus')?.addEventListener('click', () => {
      if (state.quantity < 20) {
        state.quantity++;
        state.qty = state.quantity;
        state.customized = true;
        updateStepBar();
        recalc();
      }
    });

    // Pill Selection (Size, Milk, Sugar, Add-ons, Order Type, Payment)
    document.querySelectorAll('.size').forEach(btn => {
      btn.addEventListener('click', () => {
        state.sizeName = btn.dataset.name;
        state.sizeUp = parseInt(btn.dataset.val, 10);
        selectPill('size', btn);
        recalc();
      });
    });

    document.querySelectorAll('.milk').forEach(btn => {
      btn.addEventListener('click', () => {
        state.milk = btn.dataset.name;
        state.milkUp = parseInt(btn.dataset.val, 10);
        selectPill('milk', btn);
        recalc();
      });
    });

    document.querySelectorAll('.sugar').forEach(btn => {
      btn.addEventListener('click', () => {
        state.sugar = btn.dataset.name;
        selectPill('sugar', btn);
        recalc();
      });
    });

    document.querySelectorAll('.pill.addon').forEach(btn => {
      btn.addEventListener('click', () => {
        const active = btn.classList.toggle('active');
        btn.setAttribute('aria-checked', active);
        state.addOns = active
          ? [...state.addOns, btn.dataset.name]
          : state.addOns.filter(n => n !== btn.dataset.name);
        state.addOnsTotal = [...document.querySelectorAll('.pill.addon.active')]
          .reduce((sum, b) => sum + parseInt(b.dataset.val, 10), 0);
        state.customized = true;
        updateStepBar();
        recalc();
      });
    });

    document.querySelectorAll('.pill.order-type').forEach(btn => {
      btn.addEventListener('click', () => {
        setOrderType(btn.dataset.name);
        state.customized = true;
        updateStepBar();
        recalc();
      });
    });

    document.querySelectorAll('.pill.payment').forEach(btn => {
      btn.addEventListener('click', () => {
        setPaymentMethod(btn.dataset.name);
        state.customized = true;
        updateStepBar();
        recalc();
      });
    });

    // Step Navigation
    document.querySelectorAll('.step').forEach(step => {
      step.addEventListener('click', () => {
        const s = parseInt(step.dataset.step, 10);
        setStep(s);
        let target = null;
        if (s === 1) target = document.querySelector('.menu-grid');
        else if (s === 2) target = document.querySelector('.pills');
        else if (s === 3) target = document.querySelector('#order-form');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    document.querySelectorAll('#order-form input, #order-form textarea').forEach(f => {
      f.addEventListener('focus', () => setStep(3));
      f.addEventListener('input', () => setStep(3));
    });

    // Order Form Submission
    orderElements.orderForm?.addEventListener('submit', ev => {
      ev.preventDefault();
      const phone = getEl('phone');
      const phoneVal = (phone.value || '').trim();
      if (!phoneVal) {
        phone.setCustomValidity('Please enter your contact number.');
        phone.reportValidity();
        return;
      }
      phone.setCustomValidity('');
      const data = new FormData(ev.target);
      const base = PRICES[state.drink] || 0;
      const total = (base + state.sizeUp + state.milkUp + state.addOnsTotal) * state.quantity;

      let nextNo = parseInt(localStorage.getItem('caffequino_next_orderno') || '101', 10);
      const paymentMethod = state.paymentMethod || 'Cash';
      const refNumber = paymentMethod !== 'Cash' ? (data.get('ref_number') || '').trim() : '';

      const newOrder = {
        id: Date.now(),
        orderNo: nextNo,
        createdAt: Date.now(),
        name: data.get('name') || 'Guest',
        total: total,
        quantity: state.qty,
        drink: state.drink,
        sizeName: state.sizeName,
        milk: state.milk,
        sugar: state.sugar,
        orderType: state.orderType,
        paymentMethod: paymentMethod,
        ref_number: refNumber,
        instructions: data.get('notes') || data.get('instructions') || '',
        status: 'Pending'
      };

      localStorage.setItem('caffequino_next_orderno', nextNo + 1);
      let existingOrders = [];
      try { existingOrders = JSON.parse(localStorage.getItem('caffequino_orders')) || []; } catch (e) {}
      existingOrders.push(newOrder);
      localStorage.setItem('caffequino_orders', JSON.stringify(existingOrders));

      let myOrders = [];
      try { myOrders = JSON.parse(localStorage.getItem('caffequino_my_orders') || '[]'); } catch (e) {}
      myOrders.push(newOrder.id);
      localStorage.setItem('caffequino_my_orders', JSON.stringify(myOrders));

      updateTrackerBadge();
      lastSubmittedOrderId = newOrder.id;

      // Fill Receipt
      const body = orderElements.receiptBody;
      if (body) {
        body.innerHTML = '';
        const rows = [
          ['Order Number', `#${newOrder.orderNo}`],
          ['Drink', `${state.drink} ×${state.quantity} (PHP ${base * state.quantity})`],
          ['Size', state.sizeName === 'Small' ? state.sizeName : `${state.sizeName} (+PHP ${state.sizeUp * state.quantity})`],
          ['Milk', ['Almond', 'Oat'].includes(state.milk) ? `${state.milk} (+PHP ${state.milkUp * state.quantity})` : state.milk],
          ['Sugar', state.sugar],
          ['Order Type', state.orderType],
          ['Payment', state.paymentMethod],
          ['Name', data.get('name')]
        ];
        if (state.orderType === 'Delivery') rows.push(['Address', data.get('address')]);
        rows.push(['Contact', data.get('phone')]);
        if (state.addOns.length > 0) rows.splice(4, 0, ['Add-ons', state.addOns.map(a => `${a} ×${state.quantity}`).join(', ')]);
        const instructions = (data.get('instructions') || '').trim();
        if (instructions) rows.push(['Instructions', instructions]);
        const ref = (data.get('ref_number') || '').trim();
        if (state.paymentMethod !== 'Cash' && ref) rows.push(['Ref / Trans. #', ref]);

        rows.forEach(([k, v]) => {
          const row = document.createElement('div');
          const dt = document.createElement('span'); dt.textContent = k;
          const dd = document.createElement('span'); dd.textContent = v;
          row.append(dt, dd);
          body.append(row);
        });
      }

      if (orderElements.receiptTotal) orderElements.receiptTotal.textContent = `PHP ${total}`;

      if (orderElements.trackLiveBtn) {
        orderElements.trackLiveBtn.onclick = () => {
          renderTrackerOrders();
          if (trackerElements.modal) trackerElements.modal.hidden = false;
        };
      }

      resetCustomerFields();
      openModal();
    });

    // Modal Control
    function openModal() {
      let lastFocused = document.activeElement;
      document.addEventListener('keydown', trapFocus);
      orderElements.receiptModal.hidden = false;
      requestAnimationFrame(() => orderElements.receiptModal.classList.add('open'));
      const closeBtn = getEl('modal-close');
      if (closeBtn) closeBtn.focus();
    }

    function closeModal() {
      document.removeEventListener('keydown', trapFocus);
      orderElements.receiptModal.classList.remove('open');
      setTimeout(() => {
        orderElements.receiptModal.hidden = true;
        // Re-focus original if possible
      }, 200);
    }

    orderElements.receiptModal?.addEventListener('click', e => { if (e.target === orderElements.receiptModal) closeModal(); });
    getEl('modal-close')?.addEventListener('click', closeModal);
    getEl('modal-done')?.addEventListener('click', closeModal);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !orderElements.receiptModal.hidden) closeModal(); });

    // Cancel Order in Modal
    getEl('cancel-receipt-btn')?.addEventListener('click', () => {
      if (!lastSubmittedOrderId) {
        closeModal();
        resetCustomerFields();
        return;
      }
      if (!confirm('Are you sure you want to cancel this order?')) return;

      let orders = [];
      try { orders = JSON.parse(localStorage.getItem('caffequino_orders') || '[]'); } catch (e) {}
      orders = orders.map(o => o.id === lastSubmittedOrderId ? { ...o, status: 'Cancelled' } : o);
      localStorage.setItem('caffequino_orders', JSON.stringify(orders));

      let myIds = [];
      try { myIds = JSON.parse(localStorage.getItem('caffequino_my_orders') || '[]'); } catch (e) {}
      myIds = myIds.filter(id => id !== lastSubmittedOrderId);
      localStorage.setItem('caffequino_my_orders', JSON.stringify(myIds));

      updateTrackerBadge();
      lastSubmittedOrderId = null;
      closeModal();
      resetCustomerFields();
    });

    // Lookup in Tracker
    const lookupForm = getEl('lookup-form');
    const lookupError = getEl('lookup-error');
    if (lookupForm) {
      lookupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const num = parseInt(getEl('lookup-orderno').value, 10);
        const nameVal = getEl('lookup-name').value.trim().toLowerCase();
        let orders = [];
        try { orders = JSON.parse(localStorage.getItem('caffequino_orders') || '[]'); } catch (err) {}
        const found = orders.find(o => (o.orderNo === num || (101 + orders.indexOf(o)) === num) && o.name.toLowerCase().includes(nameVal));

        if (found) {
          if (lookupError) lookupError.hidden = true;
          let myIds = [];
          try { myIds = JSON.parse(localStorage.getItem('caffequino_my_orders') || '[]'); } catch (err) {}
          if (!myIds.includes(found.id)) {
            myIds.push(found.id);
            localStorage.setItem('caffequino_my_orders', JSON.stringify(myIds));
          }
          getEl('lookup-orderno').value = '';
          getEl('lookup-name').value = '';
          renderTrackerOrders();
        } else {
          if (lookupError) lookupError.hidden = false;
        }
      });
    }

    // Storage Listener
    window.addEventListener('storage', (e) => {
      if (e.key === 'caffequino_orders') {
        updateTrackerBadge();
        if (trackerElements.modal && !trackerElements.modal.hidden) {
          renderTrackerOrders();
        }
      }
    });

    // Utility functions for external access
    window.cancelCustomerOrder = cancelCustomerOrder;
    window.updateTrackerBadge = updateTrackerBadge;
    window.renderTrackerOrders = renderTrackerOrders;

    // Setup Copy Buttons
    setupCopyBtn('copy-name-btn', 'Caffequino Café');
    setupCopyBtn('copy-number-btn', '09060488692');

    // Suggestion Form
    const suggestionForm = getEl('suggestion-form');
    const suggestionSuccess = getEl('suggestion-success');
    if (suggestionForm) {
      suggestionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = getEl('suggestion-name').value.trim() || 'Anonymous Guest';
        const text = getEl('suggestion-text').value.trim();
        if (!text) return;

        let suggestions = [];
        try { suggestions = JSON.parse(localStorage.getItem('caffequino_suggestions') || '[]'); } catch (err) {}
        suggestions.push({ id: Date.now(), name, text, createdAt: Date.now() });
        localStorage.setItem('caffequino_suggestions', JSON.stringify(suggestions));

        getEl('suggestion-text').value = '';
        getEl('suggestion-name').value = '';
        if (suggestionSuccess) {
          suggestionSuccess.hidden = false;
          setTimeout(() => { suggestionSuccess.hidden = true; }, 3500);
        }
      });
    }

    // Init
    if (orderElements.orderForm) {
      applySoldOutDrinks();
    }
  });

  // --- Helper Functions (outside DOMContentLoaded for availability) ---
  function setupCopyBtn(btnId, textToCopy) {
    const btn = getEl(btnId);
    if (!btn) return;
    btn.addEventListener('click', () => {
      const handleSuccess = () => {
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        btn.style.background = '#2E7D32';
        btn.style.color = '#FFFDF9';
        setTimeout(() => {
          btn.textContent = orig;
          btn.style.background = '#E6DDD0';
          btn.style.color = '#2C1A12';
        }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(handleSuccess).catch(() => fallbackCopy(textToCopy, handleSuccess));
      } else {
        fallbackCopy(textToCopy, handleSuccess);
      }
    });
  }

  function fallbackCopy(text, cb) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    if (cb) cb();
  }

  function resetCustomerFields() {
    ['name', 'address', 'phone', 'instructions', 'ref-number'].forEach(id => {
      const el = getEl(id);
      if (el) el.value = '';
    });

    state.drink = 'Caffè Latte';
    state.quantity = 1;
    state.qty = 1;
    state.sizeName = 'Small';
    state.sizeUp = 0;
    state.milk = 'Whole';
    state.milkUp = 0;
    state.sugar = '75% Regular';
    state.addOns = [];
    state.addOnsTotal = 0;
    state.orderType = 'Pickup';
    state.paymentMethod = 'Cash';
    state.customized = false;

    document.querySelectorAll('.menu-item').forEach(c => {
      const sel = c.dataset.drink === state.drink;
      c.classList.toggle('selected', sel);
      c.setAttribute('aria-pressed', String(sel));
    });
    document.querySelectorAll('.pill.size, .pill.milk, .pill.sugar').forEach(b => {
      const active = b.dataset.name === (b.classList.contains('size') ? state.sizeName : b.classList.contains('milk') ? state.milk : state.sugar);
      b.classList.toggle('active', active);
      b.setAttribute('aria-checked', String(active));
    });
    document.querySelectorAll('.pill.addon').forEach(b => {
      const active = state.addOns.includes(b.dataset.name);
      b.classList.remove('active');
      b.setAttribute('aria-checked', String(active));
    });
    document.querySelectorAll('.pill.order-type').forEach(b => {
      const active = b.dataset.name === state.orderType;
      b.classList.toggle('active', active);
      b.setAttribute('aria-checked', active);
    });
    document.querySelectorAll('.pill.payment').forEach(b => {
      const active = b.dataset.name === state.paymentMethod;
      b.classList.toggle('active', active);
      b.setAttribute('aria-checked', active);
    });

    if (orderElements.addressField) orderElements.addressField.hidden = true;
    if (orderElements.phone) orderElements.phone.required = false;
    setPaymentMethod('Cash');
    updateMilkGroup();
    setStep(1);
    updateStepBar();
    recalc();
  }
})();

const MENU_ITEMS = [
  'Espresso',
  'Cappuccino',
  'Caffè Latte',
  'Mocha',
  'Hot Chocolate',
  'Iced Americano',
  'Cold Brew',
  'Iced Caramel Macchiato'
];

let currentFilter = 'all';
let searchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
  // admin shell — only runs on admin.html
  const loginView = document.getElementById('login-view');
  if (!loginView) return;
  const dashboardView = document.getElementById('dashboard-view');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const logoutBtn = document.getElementById('logout-btn');

  // Check initial sessionStorage login state
  const isLoggedIn = sessionStorage.getItem('caffequino_logged_in') === 'true';
  if (isLoggedIn) {
    showDashboard();
  } else {
    showLogin();
  }

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (email === 'staff@caffequino.com' && password === 'coffee123') {
      sessionStorage.setItem('caffequino_logged_in', 'true');
      loginError.hidden = true;
      showDashboard();
    } else {
      loginError.hidden = false;
    }
  });

  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('caffequino_logged_in');
    window.location.reload();
  });

  function showLogin() {
    loginView.hidden = false;
    dashboardView.hidden = true;
  }

  function showDashboard() {
    loginView.hidden = true;
    dashboardView.hidden = false;
    initDashboard();
  }
});

function initDashboard() {
  renderMenuStatus();
  renderLiveOrders();
  renderSuggestions();

  // Search input listener
  const searchInput = document.getElementById('order-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderLiveOrders();
    });
  }

  // Filter tabs listeners
  document.querySelectorAll('.filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderLiveOrders();
    });
  });

  // Clear completed button with confirmation
  const clearBtn = document.getElementById('clear-completed-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      let orders = [];
      try {
        orders = JSON.parse(localStorage.getItem('caffequino_orders') || '[]');
      } catch (e) {
        orders = [];
      }
      const completedCount = orders.filter(o => o.status === 'Completed').length;
      if (completedCount === 0) {
        showToast('No completed orders to clear.');
        return;
      }
      if (confirm(`Clear all ${completedCount} completed order(s)?`)) {
        orders = orders.filter(o => o.status !== 'Completed');
        localStorage.setItem('caffequino_orders', JSON.stringify(orders));
        renderLiveOrders();
        showToast('Cleared completed orders.');
      }
    });
  }

  // Listen for storage changes from customer orders in real time
  window.addEventListener('storage', (e) => {
    if (e.key === 'caffequino_orders') {
      let orders = [];
      try { orders = JSON.parse(e.newValue || '[]'); } catch (err) {}
      checkNewOrders(orders);
      renderLiveOrders();
    }
    if (e.key === 'caffequino_suggestions') {
      renderSuggestions();
    }
  });

  // Periodic poll fallback for same-tab or missed storage events
  setInterval(() => {
    let orders = [];
    try { orders = JSON.parse(localStorage.getItem('caffequino_orders') || '[]'); } catch (err) {}
    checkNewOrders(orders);
  }, 5000);
}

let lastOrderCount = 0;
function checkNewOrders(orders) {
  if (lastOrderCount > 0 && orders.length > lastOrderCount) {
    playBeep();
    const latest = orders[orders.length - 1];
    showToast(`\u{1F514} New order #${latest.orderNo || 101} from ${latest.name || 'Customer'}!`);
  }
  lastOrderCount = orders.length;
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {}
}

function showToast(msg) {
  const banner = document.getElementById('toast-banner');
  if (banner) {
    banner.textContent = msg;
    banner.style.display = 'block';
    setTimeout(() => { banner.style.display = 'none'; }, 4000);
  }
}

function formatAge(createdAt) {
  if (!createdAt) return '';
  const mins = Math.floor((Date.now() - createdAt) / 60000);
  if (mins < 1) return 'Just now';
  if (mins === 1) return '1 min ago';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function renderLiveOrders() {
  let orders = [];
  try {
    orders = JSON.parse(localStorage.getItem('caffequino_orders') || '[]');
  } catch (e) {
    orders = [];
  }

  if (lastOrderCount === 0) lastOrderCount = orders.length;

  renderStats(orders);

  const container = document.getElementById('orders-container');
  const countBadge = document.getElementById('order-count-badge');

  // Update active count badge
  const activeCount = orders.filter(o => o.status !== 'Completed' && o.status !== 'Cancelled').length;
  if (countBadge) countBadge.textContent = activeCount;

  // Filter orders
  const filtered = orders.map((order, idx) => ({ ...order, originalIndex: idx })).filter(order => {
    const status = order.status || 'Pending';
    const matchesFilter = currentFilter === 'all' || status === currentFilter;
    const ordNum = order.orderNo || (101 + order.originalIndex);
    const matchesSearch = !searchQuery || order.name.toLowerCase().includes(searchQuery) || String(ordNum).includes(searchQuery);
    return matchesFilter && matchesSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: #7A5C48; padding: 30px; background: #FAF6F0; border-radius: 12px; border: 1px dashed #E6DDD0;">No matching orders found.</div>`;
    return;
  }

  container.innerHTML = filtered.map(order => {
    const idx = order.originalIndex;
    const status = order.status || 'Pending';
    const ordNum = order.orderNo || (101 + idx);
    const ageMins = order.createdAt ? (Date.now() - order.createdAt) / 60000 : 0;
    const isAging = (status === 'Pending' || status === 'Brewing') && ageMins > 10;

    let statusClass = 'status-pending';
    if (status === 'Brewing') statusClass = 'status-brewing';
    else if (status === 'Ready') statusClass = 'status-ready';
    else if (status === 'Completed' || status === 'Cancelled') statusClass = 'status-completed';

    if (isAging) statusClass += ' status-aging';

    return `
      <div class="order-card ${statusClass}" data-order-index="${idx}">
        <div style="flex: 1; min-width: 0;">
          <div class="order-card-header">
            <div>
              <span class="micro-label">Order #${ordNum} • PHP ${order.total} ${order.createdAt ? '• ' + formatAge(order.createdAt) : ''} ${isAging ? '\u{26A0}\u{FE0F}' : ''}</span>
              <h4 class="order-customer">${order.name} (${order.orderType})</h4>
            </div>
            <span class="status-badge">${status}</span>
          </div>
          <div class="order-items-list">
            <strong>${order.quantity}× ${order.drink}</strong> (${order.sizeName}, ${order.milk}, ${order.sugar})
            ${order.paymentMethod && order.paymentMethod !== 'Cash' ? `<br><small>Payment: ${order.paymentMethod} (Ref: ${order.ref || order.ref_number || 'N/A'})</small>` : ''}
            ${order.instructions ? `<br><small>Note: ${order.instructions}</small>` : ''}
          </div>
        </div>
        <div class="order-actions">
          <select class="status-select" onchange="updateOrderStatus(${idx}, this.value)" aria-label="Order status">
            ${['Pending', 'Brewing', 'Ready', 'Completed', 'Cancelled'].map(s => `<option value="${s}" ${s === status ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
          <button type="button" class="action-btn btn-done" onclick="completeOrder(${idx})">${status === 'Completed' ? 'Clear' : 'Done'}</button>
        </div>
      </div>
    `;
  }).join('');
}

// Single source of truth for the summary counters, so they survive empty/filtered views too.
function renderStats(orders) {
  const statPending = document.getElementById('stat-pending');
  const statBrewing = document.getElementById('stat-brewing');
  const statReady = document.getElementById('stat-ready');
  if (statPending) statPending.textContent = orders.filter(o => !o.status || o.status === 'Pending').length;
  if (statBrewing) statBrewing.textContent = orders.filter(o => o.status === 'Brewing').length;
  if (statReady) statReady.textContent = orders.filter(o => o.status === 'Ready').length;

  // Shift summary calculations
  const totalRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
  const totalCups = orders.reduce((sum, o) => sum + (parseInt(o.quantity) || 1), 0);

  const drinkCounts = {};
  orders.forEach(o => {
    if (o.drink) {
      drinkCounts[o.drink] = (drinkCounts[o.drink] || 0) + (parseInt(o.quantity) || 1);
    }
  });
  let topSeller = '—';
  let maxCount = 0;
  for (const [drink, count] of Object.entries(drinkCounts)) {
    if (count > maxCount) {
      maxCount = count;
      topSeller = drink;
    }
  }

  const shiftRevEl = document.getElementById('shift-revenue');
  const shiftCupsEl = document.getElementById('shift-cups');
  const shiftTopEl = document.getElementById('shift-topseller');
  if (shiftRevEl) shiftRevEl.textContent = `PHP ${totalRevenue.toLocaleString()}`;
  if (shiftCupsEl) shiftCupsEl.textContent = totalCups;
  if (shiftTopEl) shiftTopEl.textContent = topSeller;
}

window.renderLiveOrders = renderLiveOrders;

// customer menu.html reads status from the same key to show order progress

window.completeOrder = function(index) {
  let orders = [];
  try {
    orders = JSON.parse(localStorage.getItem('caffequino_orders') || '[]');
  } catch (e) {
    orders = [];
  }
  if (orders[index]) {
    // If already completed, remove it; otherwise mark as Completed
    if (orders[index].status === 'Completed') {
      orders.splice(index, 1);
    } else {
      orders[index].status = 'Completed';
    }
    localStorage.setItem('caffequino_orders', JSON.stringify(orders));
    renderLiveOrders();
  }
};

window.removeOrder = window.completeOrder;

window.updateOrderStatus = function(index, newStatus) {
  let orders = [];
  try {
    orders = JSON.parse(localStorage.getItem('caffequino_orders') || '[]');
  } catch (e) {
    orders = [];
  }

  if (orders[index]) {
    orders[index].status = newStatus;
    localStorage.setItem('caffequino_orders', JSON.stringify(orders));
    renderLiveOrders();
    // same-tab edits do not fire the `storage` event, so refresh any other tab ourselves
    renderStats(orders);
  }
};

// Storage events only fire in *other* tabs; keep this one in sync after a save.

// Render Menu Status and handle localStorage persistence
function renderMenuStatus() {
  const grid = document.getElementById('menu-status-grid');
  let soldOutList = [];
  try {
    soldOutList = JSON.parse(localStorage.getItem('caffequino_soldout') || '[]');
  } catch (e) {
    soldOutList = [];
  }

  grid.innerHTML = MENU_ITEMS.map(item => {
    const isSoldOut = soldOutList.includes(item);
    return `
      <div class="menu-status-row">
        <span style="font-weight: 600; font-size: 0.9em;">${item}</span>
        <button type="button" class="sold-out-toggle ${isSoldOut ? 'active' : ''}" onclick="toggleSoldOutItem('${item}')">
          ${isSoldOut ? 'Sold Out' : 'Available'}
        </button>
      </div>
    `;
  }).join('');
}

window.toggleSoldOutItem = function(itemName) {
  let soldOutList = [];
  try {
    soldOutList = JSON.parse(localStorage.getItem('caffequino_soldout') || '[]');
  } catch (e) {
    soldOutList = [];
  }

  if (soldOutList.includes(itemName)) {
    soldOutList = soldOutList.filter(i => i !== itemName);
  } else {
    soldOutList.push(itemName);
  }

  localStorage.setItem('caffequino_soldout', JSON.stringify(soldOutList));
  renderMenuStatus();
};

function renderSuggestions() {
  const container = document.getElementById('suggestions-container');
  const countBadge = document.getElementById('suggestion-count-badge');
  if (!container) return;

  let suggestions = [];
  try {
    suggestions = JSON.parse(localStorage.getItem('caffequino_suggestions') || '[]');
  } catch (e) {
    suggestions = [];
  }

  if (countBadge) countBadge.textContent = suggestions.length;

  if (suggestions.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: #7A5C48; padding: 20px; background: #FAF6F0; border-radius: 10px; border: 1px dashed #E6DDD0; font-size: 0.9em;">No suggestions yet.</div>`;
    return;
  }

  container.innerHTML = suggestions.slice().reverse().map((item, idx) => {
    const origIdx = suggestions.length - 1 - idx;
    const dateStr = item.createdAt ? formatAge(item.createdAt) : '';
    return `
      <div style="background: #FAF6F0; border: 1px solid #E6DDD0; border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong style="font-size: 0.9em; color: #3D2516;">${escapeHtml(item.name)}</strong>
          <span style="font-size: 0.75em; color: #7A5C48;">${dateStr}</span>
        </div>
        <p style="font-size: 0.85em; color: #2C1A12; margin: 0; line-height: 1.4; word-break: break-word;">${escapeHtml(item.text)}</p>
        <div style="display: flex; justify-content: flex-end; margin-top: 4px;">
          <button type="button" onclick="deleteSuggestion(${origIdx})" style="background: #FFF1F0; color: #A94442; border: 1px solid #EBCCD1; border-radius: 6px; padding: 2px 8px; font-size: 11px; font-weight: 600; cursor: pointer;">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.deleteSuggestion = function(index) {
  let suggestions = [];
  try {
    suggestions = JSON.parse(localStorage.getItem('caffequino_suggestions') || '[]');
  } catch (e) {
    suggestions = [];
  }
  if (suggestions[index]) {
    suggestions.splice(index, 1);
    localStorage.setItem('caffequino_suggestions', JSON.stringify(suggestions));
    renderSuggestions();
  }
};

