const DEFAULT_API_BASE = 'http://localhost:3000/api';

const state = {
  apiBase: localStorage.getItem('tl_api_base') || DEFAULT_API_BASE,
  productos: [],
  currentEnvio: null,
};

const el = {
  connectionStatus: document.getElementById('connectionStatus'),
  apiBase: document.getElementById('apiBase'),
  saveApi: document.getElementById('saveApi'),
  globalNotice: document.getElementById('globalNotice'),
  customer: document.getElementById('customer'),
  addProduct: document.getElementById('addProduct'),
  productRows: document.getElementById('productRows'),
  productsEmpty: document.getElementById('productsEmpty'),
  orderTotal: document.getElementById('orderTotal'),
  orderForm: document.getElementById('orderForm'),
  submitOrder: document.getElementById('submitOrder'),
  trackingForm: document.getElementById('trackingForm'),
  trackingId: document.getElementById('trackingId'),
  trackingResult: document.getElementById('trackingResult'),
  systemState: document.getElementById('systemState'),
  productCount: document.getElementById('productCount'),
  orderCount: document.getElementById('orderCount'),
  lastQuery: document.getElementById('lastQuery'),
};

const currency = (value) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

function apiUrl(path) {
  return `${state.apiBase.replace(/\/$/, '')}${path}`;
}

async function apiFetch(path, options) {
  const res = await fetch(apiUrl(path), {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

function showNotice(message, type = 'success') {
  el.globalNotice.textContent = message;
  el.globalNotice.className = `notice show ${type}`;
  setTimeout(() => el.globalNotice.classList.remove('show'), 5000);
}

function setLastQuery() {
  el.lastQuery.textContent = new Date().toLocaleTimeString('es-CO');
}

// Conexion

async function checkConnection() {
  try {
    await apiFetch('/health');
    el.connectionStatus.className = 'connection online';
    el.connectionStatus.innerHTML = '<span class="status-dot"></span> API conectada';
    el.systemState.textContent = 'Operativo';
    return true;
  } catch (err) {
    el.connectionStatus.className = 'connection offline';
    el.connectionStatus.innerHTML = '<span class="status-dot"></span> Sin conexión';
    el.systemState.textContent = 'Sin conexión';
    return false;
  }
}

// Clientes

async function loadClientes() {
  try {
    const clientes = await apiFetch('/clientes');
    el.customer.innerHTML = clientes.length
      ? '<option value="">Selecciona un cliente</option>'
      : '<option value="">No hay clientes registrados</option>';
    clientes.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.id_cliente;
      opt.textContent = `${c.nom_cliente} (${c.email_cliente})`;
      el.customer.appendChild(opt);
    });
  } catch (err) {
    el.customer.innerHTML = '<option value="">Error al cargar clientes</option>';
  }
}

// Productos

async function loadProductos() {
  try {
    state.productos = await apiFetch('/productos');
    el.productCount.textContent = `${state.productos.length} productos`;
    addProductRow();
  } catch (err) {
    el.productCount.textContent = 'Error al cargar';
  }
}

function productOptions(selectedId) {
  return state.productos
    .map(
      (p) =>
        `<option value="${p.id_producto}" data-precio="${p.precio_producto}" ${
          String(p.id_producto) === String(selectedId) ? 'selected' : ''
        }>${p.nom_producto} — ${currency(p.precio_producto)}</option>`
    )
    .join('');
}

function addProductRow() {
  if (state.productos.length === 0) return;
  const row = document.createElement('div');
  row.className = 'product-row';
  row.innerHTML = `
    <select class="product-select">${productOptions()}</select>
    <input type="number" class="product-qty" min="1" value="1">
    <button type="button" class="remove-row" title="Quitar producto">×</button>
  `;
  el.productRows.appendChild(row);

  row.querySelector('.product-select').addEventListener('change', updateOrderTotal);
  row.querySelector('.product-qty').addEventListener('input', updateOrderTotal);
  row.querySelector('.remove-row').addEventListener('click', () => {
    row.remove();
    updateOrderTotal();
    toggleProductsEmpty();
  });

  toggleProductsEmpty();
  updateOrderTotal();
}

function toggleProductsEmpty() {
  el.productsEmpty.style.display = el.productRows.children.length === 0 ? 'block' : 'none';
}

function getOrderItems() {
  return Array.from(el.productRows.querySelectorAll('.product-row')).map((row) => {
    const select = row.querySelector('.product-select');
    const qty = row.querySelector('.product-qty');
    return {
      Producto_id_producto: Number(select.value),
      cantidad_itempedido: Math.max(1, Number(qty.value) || 1),
      precio: Number(select.selectedOptions[0]?.dataset.precio || 0),
    };
  });
}

function updateOrderTotal() {
  const total = getOrderItems().reduce((sum, item) => sum + item.precio * item.cantidad_itempedido, 0);
  el.orderTotal.textContent = currency(total);
}

el.addProduct.addEventListener('click', addProductRow);

// Pedidos

async function loadPedidos() {
  try {
    const pedidos = await apiFetch('/pedidos');
    el.orderCount.textContent = `${pedidos.length} pedidos`;
  } catch (err) {
    el.orderCount.textContent = 'Error al cargar';
  }
}

el.orderForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const clienteId = el.customer.value;
  const items = getOrderItems();

  if (!clienteId) return showNotice('Selecciona un cliente antes de continuar.', 'error');
  if (items.length === 0) return showNotice('Añade al menos un producto al pedido.', 'error');

  el.submitOrder.disabled = true;
  try {
    const pedido = await apiFetch('/pedidos', {
      method: 'POST',
      body: JSON.stringify({
        Cliente_id_cliente: Number(clienteId),
        items: items.map(({ Producto_id_producto, cantidad_itempedido }) => ({
          Producto_id_producto,
          cantidad_itempedido,
        })),
      }),
    });
    el.orderForm.reset();
    el.productRows.innerHTML = '';
    addProductRow();
    loadPedidos();

    if (pedido.id_envio) {
      showNotice(
        `Pedido #${pedido.id_pedido} creado por ${currency(pedido.total_pedido)}. Envío #${pedido.id_envio} generado.`,
        'success'
      );
      el.trackingId.value = pedido.id_envio;
      trackEnvio(pedido.id_envio);
    } else {
      showNotice(
        `Pedido #${pedido.id_pedido} creado por ${currency(pedido.total_pedido)}, pero no se pudo generar un envío (falta registrar Ruta o Transportista).`,
        'error'
      );
    }
  } catch (err) {
    showNotice(`No se pudo crear el pedido: ${err.message}`, 'error');
  } finally {
    el.submitOrder.disabled = false;
  }
});

// Envios

function formatDate(value) {
  if (!value) return 'Pendiente';
  return new Date(value).toLocaleString('es-CO');
}

async function loadEstados() {
  try {
    return await apiFetch('/envios/estados');
  } catch (err) {
    return [];
  }
}

function renderEnvio(envio, estados) {
  state.currentEnvio = envio;
  el.trackingResult.className = 'tracking-result tracking-detail';
  el.trackingResult.innerHTML = `
    <span class="status-badge">${envio.nom_estado}</span>
    <dl>
      <dt>Envío</dt><dd>#${envio.id_envio} — Pedido #${envio.id_pedido}</dd>
      <dt>Cliente</dt><dd>${envio.nom_cliente}</dd>
      <dt>Ruta</dt><dd>${envio.origen_ruta} → ${envio.destino_ruta} (${envio.km_ruta} km)</dd>
      <dt>Transportista</dt><dd>${envio.nom_transportista} — ${envio.empresa_transportista}</dd>
      <dt>Salida</dt><dd>${formatDate(envio.fechasalida_envio)}</dd>
      <dt>Entrega</dt><dd>${formatDate(envio.fechaentrega_envio)}</dd>
      <dt>Total pedido</dt><dd>${currency(envio.total_pedido)}</dd>
    </dl>
    <div class="status-update">
      <select id="estadoSelect">
        ${estados
          .map((e) => `<option value="${e.id_estado}" ${e.id_estado === envio.id_estado ? 'selected' : ''}>${e.nom_estado}</option>`)
          .join('')}
      </select>
      <button type="button" id="updateEstado">Actualizar estado</button>
    </div>
  `;

  document.getElementById('updateEstado').addEventListener('click', async () => {
    const nuevoEstado = document.getElementById('estadoSelect').value;
    try {
      const actualizado = await apiFetch(`/envios/${envio.id_envio}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ id_estado: Number(nuevoEstado) }),
      });
      showNotice(`Envío #${envio.id_envio} actualizado a "${actualizado.nom_estado}".`, 'success');
      renderEnvio(actualizado, estados);
    } catch (err) {
      showNotice(`No se pudo actualizar el estado: ${err.message}`, 'error');
    }
  });
}

async function trackEnvio(id) {
  if (!id) return;

  el.trackingResult.className = 'tracking-result empty-result';
  el.trackingResult.innerHTML = '<div class="result-icon">⌁</div><p>Buscando envío...</p>';

  try {
    const [envio, estados] = await Promise.all([apiFetch(`/envios/${id}`), loadEstados()]);
    renderEnvio(envio, estados);
    setLastQuery();
  } catch (err) {
    el.trackingResult.className = 'tracking-result empty-result';
    el.trackingResult.innerHTML = `<div class="result-icon">⚠</div><p>${err.message}</p>`;
  }
}

el.trackingForm.addEventListener('submit', (event) => {
  event.preventDefault();
  trackEnvio(el.trackingId.value);
});

// Configuracion

el.apiBase.value = state.apiBase;

el.saveApi.addEventListener('click', () => {
  const value = el.apiBase.value.trim();
  if (!value) return;
  state.apiBase = value;
  localStorage.setItem('tl_api_base', value);
  showNotice('URL de la API actualizada.', 'success');
  init();
});

// Inicio

async function init() {
  const connected = await checkConnection();
  if (connected) {
    loadClientes();
    loadProductos();
    loadPedidos();
  }
}

init();
