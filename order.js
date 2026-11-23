const PRICES = {
  'Espresso': 75, 'Cappuccino': 75, 'Caffè Latte': 75, 'Mocha': 75,
  'Hot Chocolate': 55, 'Iced Americano': 114, 'Cold Brew': 59,
  'Iced Caramel Macchiato': 114
};

// Pre-selected order: Caffè Latte, Small, Whole, 75% Regular, Qty 1
let state = { drink: 'Caffè Latte', quantity: 1, qty: 1, sizeName: 'Small', sizeUp: 0, milk: 'Whole', milkUp: 0, sugar: '75% Regular', addOns: [], addOnsTotal: 0, orderType: 'Pickup', paymentMethod: 'Cash', customized: false };
let lastSubmittedOrderId = null;

const totalEl = document.getElementById('order-total');
const buttonTotalEl = document.getElementById('button-total');
const stickyTotalEl = document.getElementById('sticky-total');
const breakdownEl = document.getElementById('breakdown');
const bannerName = document.getElementById('drink-banner-name');
const bannerPrice = document.getElementById('drink-banner-price');
const bannerSub = document.getElementById('drink-banner-sub');
const qtyValueEl = document.getElementById('qty-value');
const cashlessDetails = document.getElementById('cashless-details');
const cashlessProvider = document.getElementById('cashless-provider');
const cashlessAmount = document.getElementById('cashless-amount');
const refNumberInput = document.getElementById('ref-number');

function recalc() {
  const base = PRICES[state.drink] || 0;
  const singleItemTotal = base + state.sizeUp + state.milkUp + state.addOnsTotal;
  const total = singleItemTotal * state.quantity;

  qtyValueEl.textContent = state.quantity;
  totalEl.textContent = total;
  buttonTotalEl.textContent = total;
  if (stickyTotalEl) stickyTotalEl.textContent = total;
  if (cashlessAmount) cashlessAmount.textContent = total;
  bannerName.textContent = state.drink || '—';
  bannerPrice.textContent = `PHP ${base}`;
  const extras = state.sizeUp + state.milkUp + state.addOnsTotal;
  if (extras > 0) {
    bannerSub.textContent = `+PHP ${extras} extras`;
    bannerSub.removeAttribute('hidden');
  } else {
    bannerSub.setAttribute('hidden', '');
  }

  // itemized rows: label left, price right, matching the printed-ticket layout
  const rows = [];
  if (state.drink) rows.push([`${state.drink} (x${state.quantity})`, `PHP ${base * state.quantity}`]);
  if (state.sizeName !== 'Small' && state.sizeUp > 0) rows.push([`Size: ${state.sizeName}`, `+PHP ${state.sizeUp * state.quantity}`]);
  if (['Almond', 'Oat'].includes(state.milk) && state.milkUp > 0) rows.push([`Milk: ${state.milk}`, `+PHP ${state.milkUp * state.quantity}`]);
  if (state.sugar) rows.push([`Sugar: ${state.sugar}`, 'Included']);
  document.querySelectorAll('.pill.addon.active').forEach(btn => {
    rows.push([`Add-on: ${btn.dataset.name}`, `+PHP ${parseInt(btn.dataset.val, 10) * state.quantity}`]);
  });
  breakdownEl.innerHTML = rows.map(([label, val]) =>
    `<div class="bd-row"><span>${label}</span><span>${val}</span></div>`).join('');
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

// Start with Step 1 active by default on page load
setStep(1);

// Start with Pickup selected so the address field begins hidden and not required
setOrderType('Pickup');
setPaymentMethod('Cash');

// Click .step in .step-bar to smoothly scroll and highlight
document.querySelectorAll('.step').forEach(step => {
  step.addEventListener('click', () => {
    const s = parseInt(step.dataset.step, 10);
    setStep(s);
    let target = null;
    if (s === 1) target = document.querySelector('.menu-grid');
    else if (s === 2) target = document.querySelector('.pills');
    else if (s === 3) target = document.querySelector('#order-form');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

document.querySelectorAll('#order-form input, #order-form textarea').forEach(f => {
  f.addEventListener('focus', () => setStep(3));
  f.addEventListener('input', () => setStep(3));
});

document.getElementById('phone').addEventListener('input', e => {
  e.target.setCustomValidity('');
});

function setOrderType(type) {
  state.orderType = type;
  document.querySelectorAll('.pill.order-type').forEach(b => {
    const active = b.dataset.name === type;
    b.classList.toggle('active', active);
    b.setAttribute('aria-checked', active);
  });
  const addressField = document.getElementById('address-field');
  const isDelivery = type === 'Delivery';
  addressField.hidden = !isDelivery;
  addressField.querySelector('input').required = isDelivery;
}

function setPaymentMethod(method) {
  state.paymentMethod = method;
  document.querySelectorAll('.pill.payment').forEach(b => {
    const active = b.dataset.name === method;
    b.classList.toggle('active', active);
    b.setAttribute('aria-checked', active);
  });
  const isCashless = method === 'GCash' || method === 'Maya';
  cashlessDetails.hidden = !isCashless;
  cashlessProvider.textContent = `${method} Payment`;
  if (refNumberInput) refNumberInput.required = isCashless;
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

// Milk doesn't apply to black/coffee-only drinks; hide it and reset to Whole (+0)
function updateMilkGroup() {
  const milkGroup = document.querySelector('.milk-grid').closest('.pill-group');
  const hide = ['Espresso', 'Iced Americano', 'Cold Brew'].includes(state.drink);
  milkGroup.hidden = hide;
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

// Quantity controls
document.getElementById('qty-minus').addEventListener('click', () => {
  if (state.quantity > 1) {
    state.quantity--;
    state.qty = state.quantity;
    state.customized = true;
    updateStepBar();
    recalc();
  }
});

document.getElementById('qty-plus').addEventListener('click', () => {
  if (state.quantity < 20) {
    state.quantity++;
    state.qty = state.quantity;
    state.customized = true;
    updateStepBar();
    recalc();
  }
});
// Category filter tabs
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

document.querySelectorAll('.menu-item').forEach(item => {
  item.addEventListener('click', () => {
    if (item.classList.contains('sold-out')) return;
    setDrink(item.dataset.drink);
  });
});

function applySoldOutDrinks() {
  let soldOut = [];
  try {
    soldOut = JSON.parse(localStorage.getItem('caffequino_soldout') || '[]');
  } catch (e) {
    soldOut = [];
  }
  document.querySelectorAll('.menu-item').forEach(item => {
    const isSold = soldOut.includes(item.dataset.drink);
    item.classList.toggle('sold-out', isSold);
    if (isSold && item.classList.contains('selected')) {
      const available = [...document.querySelectorAll('.menu-item')].find(i => !soldOut.includes(i.dataset.drink));
      if (available) setDrink(available.dataset.drink);
    }
  });
}

applySoldOutDrinks();
window.addEventListener('storage', applySoldOutDrinks);

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

/* ---- Receipt modal ---- */
const modal = document.getElementById('receipt-modal');
const modalClose = document.getElementById('modal-close');
let lastFocused = null;

function trapFocus(e) {
  if (e.key !== 'Tab') return;
  const focusables = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
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

function openModal() {
  lastFocused = document.activeElement;
  document.addEventListener('keydown', trapFocus);
  modal.hidden = false;
  requestAnimationFrame(() => modal.classList.add('open'));
  modalClose.focus();
}

function closeModal() {
  document.removeEventListener('keydown', trapFocus);
  modal.classList.remove('open');
  setTimeout(() => {
    modal.hidden = true;
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }, 200);
}

modalClose.addEventListener('click', closeModal);
document.getElementById('modal-done').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !modal.hidden) closeModal();
});

document.getElementById('order-form').addEventListener('submit', ev => {
  ev.preventDefault();
  const phone = document.getElementById('phone');
  const digits = (phone.value || '').replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) {
    phone.setCustomValidity('Please enter a valid phone number (7–15 digits).');
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
    name: data.get('name'),
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
  let existingOrders = JSON.parse(localStorage.getItem('caffequino_orders')) || [];
  existingOrders.push(newOrder);
  localStorage.setItem('caffequino_orders', JSON.stringify(existingOrders));

  let myOrders = JSON.parse(localStorage.getItem('caffequino_my_orders') || '[]');
  myOrders.push(newOrder.id);
  localStorage.setItem('caffequino_my_orders', JSON.stringify(myOrders));

  if (typeof updateTrackerBadge === 'function') {
    updateTrackerBadge();
  }
  lastSubmittedOrderId = newOrder.id;

  const body = document.getElementById('receipt-body');
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
  if (data.get('email')) rows.push(['Email', data.get('email')]);
  if (state.addOns.length > 0) rows.splice(4, 0, ['Add-ons', state.addOns.map(a => `${a} ×${state.quantity}`).join(', ')]);
  const instructions = (data.get('instructions') || '').trim();
  if (instructions) rows.push(['Instructions', instructions]);
  const ref = (data.get('ref_number') || '').trim();
  if (state.paymentMethod !== 'Cash' && ref) {
    rows.push(['Ref / Trans. #', ref]);
  }
  rows.forEach(([k, v]) => {
    const row = document.createElement('div');
    const dt = document.createElement('span'); dt.textContent = k;
    const dd = document.createElement('span'); dd.textContent = v;
    row.append(dt, dd);
    body.append(row);
  });

  document.getElementById('receipt-total').textContent = `PHP ${total}`;

  resetCustomerFields();
  openModal();
});

function resetCustomerFields() {
  ['name', 'address', 'phone', 'email', 'instructions', 'ref-number'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  // Full reset to the default Caffè Latte order
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

  // Sync pill classes + aria-checked to the reset state
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
    b.setAttribute('aria-checked', String(active));
  });

  document.getElementById('address-field').hidden = true;
  document.getElementById('address').required = false;
  setPaymentMethod('Cash');
  updateMilkGroup();
  setStep(1);
  updateStepBar();
  recalc();
}

document.getElementById('sticky-order-btn').addEventListener('click', () => {
  const form = document.getElementById('order-form');
  form.scrollIntoView({ behavior: 'smooth' });
  const firstInput = form.querySelector('input');
  if (firstInput) firstInput.focus();
});

function setupCopyBtn(btnId, textToCopy) {
  const btn = document.getElementById(btnId);
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
      navigator.clipboard.writeText(textToCopy).then(handleSuccess).catch(() => {
        fallbackCopy(textToCopy, handleSuccess);
      });
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

setupCopyBtn('copy-name-btn', 'Caffequino Café');
setupCopyBtn('copy-number-btn', '09060488692');

const cancelReceiptBtn = document.getElementById('cancel-receipt-btn');
if (cancelReceiptBtn) {
  cancelReceiptBtn.addEventListener('click', () => {
    if (lastSubmittedOrderId) {
      if (typeof window.cancelCustomerOrder === 'function') {
        window.cancelCustomerOrder(lastSubmittedOrderId);
      }
      lastSubmittedOrderId = null;
    }
    closeModal();
    resetCustomerFields();
  });
}
