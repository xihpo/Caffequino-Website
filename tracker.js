document.addEventListener('DOMContentLoaded', () => {
  // Dynamically inject floating Track My Order button and Tracker Modal into document.body
  if (!document.getElementById('open-tracker-link')) {
    const trackerBtn = document.createElement('button');
    trackerBtn.type = 'button';
    trackerBtn.id = 'open-tracker-link';
    trackerBtn.className = 'floating-tracker-btn';
    trackerBtn.setAttribute('aria-label', 'Track My Order');
    trackerBtn.innerHTML = `
      <span>📦 Track My Order</span>
      <span id="tracker-count" class="tracker-badge" hidden>0</span>
    `;
    document.body.appendChild(trackerBtn);
  }

  if (!document.getElementById('tracker-modal')) {
    const trackerModalDiv = document.createElement('div');
    trackerModalDiv.className = 'modal-overlay';
    trackerModalDiv.id = 'tracker-modal';
    trackerModalDiv.hidden = true;
    trackerModalDiv.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="tracker-title" style="max-width: 520px;">
        <button type="button" class="modal-close" id="tracker-close" aria-label="Close tracker">×</button>
        <h3 id="tracker-title">Live Order Status</h3>
        <p class="modal-sub">Track the real-time status of your coffee orders.</p>
        <div id="tracker-orders-list">
          <!-- Order cards will be injected here -->
        </div>

        <!-- Order Lookup form for cleared storage recovery -->
        <div class="lookup-section">
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

  // Customer Live Order Tracker Logic
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
    if (trackerClose) {
      trackerClose.addEventListener('click', () => { trackerModal.hidden = true; });
    }
    trackerModal.addEventListener('click', (e) => {
      if (e.target === trackerModal) trackerModal.hidden = true;
    });
  }

  function updateTrackerBadge() {
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
  }

  function renderTrackerOrders() {
    if (!trackerOrdersList) return;
    let myIds = [];
    try { myIds = JSON.parse(localStorage.getItem('caffequino_my_orders') || '[]'); } catch (e) {}
    let orders = [];
    try { orders = JSON.parse(localStorage.getItem('caffequino_orders') || '[]'); } catch (e) {}

    const myOrders = orders.filter(o => myIds.includes(o.id));
    updateTrackerBadge();

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
        <div style="background: #FAF6F0; border: 1px solid #E6DDD0; border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px;">
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
            <span style="${stepClassReady}">3. Ready for Pickup</span>
          </div>
          ${canCancel ? `<div style="display: flex; justify-content: flex-end; margin-top: 4px;"><button type="button" onclick="cancelCustomerOrder(${order.id})" style="background: #FFF1F0; color: #A94442; border: 1px solid #EBCCD1; border-radius: 6px; padding: 4px 10px; font-size: 0.75em; font-weight: 600; cursor: pointer;">Cancel Order</button></div>` : ''}
        </div>
      `;
    }).join('');
  }

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

    renderTrackerOrders();
    updateTrackerBadge();
  };

  window.addEventListener('storage', (e) => {
    if (e.key === 'caffequino_orders') {
      updateTrackerBadge();
      if (trackerModal && !trackerModal.hidden) {
        renderTrackerOrders();
      }
    }
  });

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
        lookupError.hidden = true;
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
        lookupError.hidden = false;
      }
    });
  }

  updateTrackerBadge();
});
