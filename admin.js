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
  const loginView = document.getElementById('login-view');
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
    showToast(`🔔 New order #${latest.orderNo || 101} from ${latest.name || 'Customer'}!`);
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
  const activeCount = orders.filter(o => o.status !== 'Completed').length;
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
    else if (status === 'Completed') statusClass = 'status-completed';

    if (isAging) statusClass += ' status-aging';

    return `
      <div class="order-card ${statusClass}" data-order-index="${idx}">
        <div style="flex: 1; min-width: 0;">
          <div class="order-card-header">
            <div>
              <span class="micro-label">Order #${ordNum} • PHP ${order.total} ${order.createdAt ? '• ' + formatAge(order.createdAt) : ''} ${isAging ? '⚠️' : ''}</span>
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
            ${['Pending', 'Brewing', 'Ready', 'Completed'].map(s => `<option value="${s}" ${s === status ? 'selected' : ''}>${s}</option>`).join('')}
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

