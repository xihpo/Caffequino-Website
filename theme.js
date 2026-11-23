(function () {
  const savedTheme = localStorage.getItem('caffequino_theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
  }

  // Inject theme toggle and "My Orders" into all nav elements
  document.querySelectorAll('nav').forEach(nav => {
    if (!nav.querySelector('a[href*="menu.html"] ~ a') && !nav.querySelector('a[onclick*="open-tracker-link"]')) {
      const myOrdersLink = document.createElement('a');
      myOrdersLink.href = '#';
      myOrdersLink.textContent = 'My Orders';
      myOrdersLink.onclick = (e) => {
        e.preventDefault();
        const trackerBtn = document.getElementById('open-tracker-link');
        if (trackerBtn) trackerBtn.click();
      };
      nav.appendChild(myOrdersLink);
    }

    if (nav.querySelector('.theme-toggle-btn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-toggle-btn';
    btn.setAttribute('aria-label', 'Toggle dark/light mode');
    const isDark = document.body.classList.contains('dark-mode');
    btn.innerHTML = isDark ? '☀️ Light' : '🌙 Dark';

    btn.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const darkActive = document.body.classList.contains('dark-mode');
      btn.innerHTML = darkActive ? '☀️ Light' : '🌙 Dark';
      localStorage.setItem('caffequino_theme', darkActive ? 'dark' : 'light');
    });

    nav.appendChild(btn);
  });

  // Inject Floating Tracker Button if not present
  if (!document.getElementById('open-tracker-link')) {
    const floatingBtn = document.createElement('button');
    floatingBtn.type = 'button';
    floatingBtn.id = 'open-tracker-link';
    floatingBtn.className = 'floating-tracker-btn';
    floatingBtn.setAttribute('aria-label', 'Track My Order');
    floatingBtn.innerHTML = `<span>📦 Track My Order</span><span id="tracker-count" class="tracker-badge" hidden>0</span>`;
    document.body.appendChild(floatingBtn);
  }

  // Inject Tracker & Suggestion Modal if not present
  if (!document.getElementById('tracker-modal')) {
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal-overlay';
    modalDiv.id = 'tracker-modal';
    modalDiv.hidden = true;
    modalDiv.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="tracker-title" style="max-width: 520px;">
        <button type="button" class="modal-close" id="tracker-close" aria-label="Close tracker">×</button>
        <h3 id="tracker-title">Live Order Status &amp; Suggestions</h3>
        <p class="modal-sub">Track real-time orders or drop a suggestion for our baristas!</p>
        <div id="tracker-orders-list"></div>

        <div class="lookup-section" style="margin-top: 16px; border-top: 1px dashed #E6DDD0; padding-top: 16px;">
          <h4 class="lookup-title">💡 Coffee &amp; Website Suggestion Box</h4>
          <form id="suggestion-form" class="lookup-form" style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
            <input type="text" id="suggestion-name" placeholder="Your Name (optional)" style="padding: 8px 12px; border: 1px solid #E6DDD0; border-radius: 8px; font-size: 0.9em; background: #FAF6F0; font-family: inherit;">
            <textarea id="suggestion-text" placeholder="Suggest a new flavor, syrup, brew method, or feature..." rows="2" required style="padding: 8px 12px; border: 1px solid #E6DDD0; border-radius: 8px; font-size: 0.9em; background: #FAF6F0; font-family: inherit; resize: vertical;"></textarea>
            <button type="submit" class="lookup-submit-btn" style="background: #B86B35; color: #FFF; border: none; border-radius: 8px; padding: 8px; font-weight: 600; cursor: pointer;">Send Suggestion</button>
          </form>
          <div id="suggestion-success" style="color: #2E7D32; font-size: 0.85em; font-weight: 600; margin-top: 6px; text-align: center;" hidden>Thank you! Your suggestion has been sent to our barista team.</div>
        </div>

        <div class="lookup-section" style="margin-top: 16px;">
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
    document.body.appendChild(modalDiv);
  }

  // Global Tracker and Suggestion Logic
  const trackerModal = document.getElementById('tracker-modal');
  const trackerClose = document.getElementById('tracker-close');
  const openTrackerLink = document.getElementById('open-tracker-link');
  const trackerCount = document.getElementById('tracker-count');
  const trackerOrdersList = document.getElementById('tracker-orders-list');

  if (openTrackerLink && trackerModal) {
    openTrackerLink.addEventListener('click', (e) => {
      e.preventDefault();
      renderTrackerOrders();
      trackerModal.hidden = false;
    });
    if (trackerClose) trackerClose.addEventListener('click', () => { trackerModal.hidden = true; });
    trackerModal.addEventListener('click', (e) => { if (e.target === trackerModal) trackerModal.hidden = true; });
  }

  window.updateTrackerBadge = function() {
    if (!trackerCount) return;
    let myIds = [];
    try { myIds = JSON.parse(localStorage.getItem('caffequino_my_orders') || '[]'); } catch (e) {}
    let orders = [];
    try { orders = JSON.parse(localStorage.getItem('caffequino_orders') || '[]'); } catch (e) {}
    const active = orders.filter(o => myIds.includes(o.id) && o.status !== 'Completed');
    if (active.length > 0) {
      trackerCount.textContent = active.length;
      trackerCount.hidden = false;
    } else {
      trackerCount.hidden = true;
    }
  };

  window.renderTrackerOrders = function() {
    if (!trackerOrdersList) return;
    let myIds = [];
    try { myIds = JSON.parse(localStorage.getItem('caffequino_my_orders') || '[]'); } catch (e) {}
    let orders = [];
    try { orders = JSON.parse(localStorage.getItem('caffequino_orders') || '[]'); } catch (e) {}

    const myOrders = orders.filter(o => myIds.includes(o.id));
    window.updateTrackerBadge();

    if (myOrders.length === 0) {
      trackerOrdersList.innerHTML = `<div style="text-align: center; color: #7A5C48; padding: 20px;">No active or past orders found. Place an order to track it here!</div>`;
      return;
    }

    trackerOrdersList.innerHTML = myOrders.slice().reverse().map(order => {
      const status = order.status || 'Pending';
      const canCancel = status === 'Pending';
      let stepClassPending = status === 'Pending' ? 'font-weight: 700; color: #B86B35;' : '';
      let stepClassBrewing = status === 'Brewing' ? 'font-weight: 700; color: #055160;' : '';
      let stepClassReady = status === 'Ready' || status === 'Completed' ? 'font-weight: 700; color: #2E7D32;' : '';

      return `
        <div style="background: #FAF6F0; border: 1px solid #E6DDD0; border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 700; color: #3D2516;">Order #${order.orderNo || 101} • ${order.drink} (${order.quantity}x)</span>
            <span class="status-badge" style="font-size: 0.75em; padding: 2px 8px; border-radius: 6px; background: ${status === 'Ready' ? '#C8E6C9; color: #0F5132;' : status === 'Brewing' ? '#CFF4FC; color: #055160;' : status === 'Completed' ? '#E2E3E5; color: #383D41;' : '#FFE5D0; color: #8F4800;'}">${status}</span>
          </div>
          <div style="font-size: 0.85em; color: #7A5C48;">
            ${order.sizeName}, ${order.milk}, Sugar: ${order.sugar}
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.8em; margin-top: 4px; border-top: 1px dashed #E6DDD0; padding-top: 8px;">
            <span style="${stepClassPending}">1. Pending</span>
            <span>➔</span>
            <span style="${stepClassBrewing}">2. Brewing</span>
            <span>➔</span>
            <span style="${stepClassReady}">3. Ready</span>
          </div>
          ${canCancel ? `<div style="display: flex; justify-content: flex-end; margin-top: 4px;"><button type="button" onclick="cancelCustomerOrder(${order.id})" style="background: #FFF1F0; color: #A94442; border: 1px solid #EBCCD1; border-radius: 6px; padding: 4px 10px; font-size: 0.75em; font-weight: 600; cursor: pointer;">Cancel Order</button></div>` : ''}
        </div>
      `;
    }).join('');
  };

  window.cancelCustomerOrder = function(orderId) {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    let orders = [];
    try { orders = JSON.parse(localStorage.getItem('caffequino_orders') || '[]'); } catch (e) {}
    orders = orders.filter(o => o.id !== orderId);
    localStorage.setItem('caffequino_orders', JSON.stringify(orders));

    let myIds = [];
    try { myIds = JSON.parse(localStorage.getItem('caffequino_my_orders') || '[]'); } catch (e) {}
    myIds = myIds.filter(id => id !== orderId);
    localStorage.setItem('caffequino_my_orders', JSON.stringify(myIds));

    if (typeof window.renderTrackerOrders === 'function') window.renderTrackerOrders();
    if (typeof window.updateTrackerBadge === 'function') window.updateTrackerBadge();
  };

  // Suggestion form submission
  const suggestionForm = document.getElementById('suggestion-form');
  const suggestionSuccess = document.getElementById('suggestion-success');
  if (suggestionForm) {
    suggestionForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('suggestion-name').value.trim() || 'Anonymous Guest';
      const text = document.getElementById('suggestion-text').value.trim();
      if (!text) return;

      let suggestions = [];
      try { suggestions = JSON.parse(localStorage.getItem('caffequino_suggestions') || '[]'); } catch (err) {}
      suggestions.push({
        id: Date.now(),
        name: name,
        text: text,
        createdAt: Date.now()
      });
      localStorage.setItem('caffequino_suggestions', JSON.stringify(suggestions));

      document.getElementById('suggestion-text').value = '';
      document.getElementById('suggestion-name').value = '';
      if (suggestionSuccess) {
        suggestionSuccess.hidden = false;
        setTimeout(() => { suggestionSuccess.hidden = true; }, 3500);
      }
    });
  }

  // Lookup form submission
  const lookupForm = document.getElementById('lookup-form');
  const lookupError = document.getElementById('lookup-error');
  if (lookupForm) {
    lookupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const num = parseInt(document.getElementById('lookup-orderno').value, 10);
      const nameVal = document.getElementById('lookup-name').value.trim().toLowerCase();

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
        document.getElementById('lookup-orderno').value = '';
        document.getElementById('lookup-name').value = '';
        renderTrackerOrders();
      } else {
        if (lookupError) lookupError.hidden = false;
      }
    });
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'caffequino_orders') {
      updateTrackerBadge();
      if (trackerModal && !trackerModal.hidden) {
        renderTrackerOrders();
      }
    }
  });

  updateTrackerBadge();
})();
