// ==========================================
// ESTADO GLOBAL Y REFERENCIAS DOM
// ==========================================
let mp = null;
let currentPublicKey = '';
let transactionData = null; 
let cardNumberInstance, expirationDateInstance, securityCodeInstance;

// Main Views
const loginView = document.getElementById('login-view');
const adminView = document.getElementById('admin-view');
const clientView = document.getElementById('client-view');
const mainHeader = document.getElementById('main-header');
const userRoleBadge = document.getElementById('user-role-badge');

// Terminal Steps (Inside Client View)
const step1 = document.getElementById('step-1-container');
const step2 = document.getElementById('step-2-container');
const step3 = document.getElementById('step-3-container');
const step4 = document.getElementById('step-4-container');

// Forms & Buttons
const loginForm = document.getElementById('login-form');
const btnLogout = document.getElementById('btn-logout');
const adminForm = document.getElementById('admin-form');

const detailsForm = document.getElementById('details-form');
const checkoutForm = document.getElementById('checkout-form');
const btnPay = document.getElementById('btn-pay');

// Navigation
function switchMainView(viewId) {
  [loginView, adminView, clientView].forEach(v => v.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
  
  if (viewId === 'login-view') {
    mainHeader.style.display = 'none';
  } else {
    mainHeader.style.display = 'block';
  }
}

function switchTerminalStep(stepId) {
  [step1, step2, step3, step4].forEach(s => s.classList.remove('active'));
  document.getElementById(stepId).classList.add('active');
}

// ==========================================
// LÓGICA DE LOGIN Y SESIÓN
// ==========================================
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = document.getElementById('username').value;
  const pass = document.getElementById('password').value;

  if (user === 'admin' && pass === 'admin') {
    userRoleBadge.textContent = 'SUPER ADMIN';
    userRoleBadge.style.backgroundColor = '#ef4444'; // Red
    switchMainView('admin-view');
  } else if (user === 'cliente' && pass === '1234') {
    userRoleBadge.textContent = 'CLIENTE';
    userRoleBadge.style.backgroundColor = '#10b981'; // Green
    
    // Cargar clave pública antes de entrar a la terminal
    await initTerminal();
  } else {
    alert('Credenciales incorrectas. (Pista: cliente/1234 o admin/admin)');
  }
});

btnLogout.addEventListener('click', (e) => {
  e.preventDefault();
  loginForm.reset();
  switchMainView('login-view');
});

// ==========================================
// LÓGICA DE ADMIN
// ==========================================
adminForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const publicKey = document.getElementById('admin-public-key').value;
  const accessToken = document.getElementById('admin-access-token').value;
  
  const btn = document.getElementById('btn-save-keys');
  btn.textContent = 'Guardando...';

  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicKey, accessToken })
    });
    if (res.ok) {
      alert('¡Credenciales actualizadas correctamente!');
      adminForm.reset();
    } else {
      alert('Error al guardar credenciales.');
    }
  } catch (error) {
    alert('Error de conexión.');
  } finally {
    btn.textContent = 'Guardar Cambios';
  }
});


// ==========================================
// LÓGICA DE TERMINAL (CLIENTE)
// ==========================================

async function initTerminal() {
  switchMainView('client-view');
  switchTerminalStep('step-1-container');
  
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    
    if (data.publicKey) {
      currentPublicKey = data.publicKey;
      mp = new MercadoPago(currentPublicKey, { locale: 'es-MX' });
    } else {
      alert('Error: No se encontró la Public Key. El Admin debe configurarla.');
    }
  } catch (error) {
    console.error('Error loading config', error);
  }
}

// Del 1 al 2 (Detalles -> Checkout)
detailsForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!mp) {
    alert('El sistema no está inicializado. Faltan credenciales.');
    return;
  }
  
  transactionData = {
    amount: document.getElementById('amount').value,
    description: document.getElementById('description').value,
  };

  document.getElementById('display-desc').textContent = transactionData.description;
  document.getElementById('display-amount').textContent = `$${parseFloat(transactionData.amount).toFixed(2)}`;

  switchTerminalStep('step-2-container');
  if (!cardNumberInstance) initSecureFields();
});

// Back buttons
document.getElementById('btn-back-to-1').addEventListener('click', () => switchTerminalStep('step-1-container'));
document.getElementById('btn-back-to-1-from-4').addEventListener('click', () => {
  detailsForm.reset();
  checkoutForm.reset();
  switchTerminalStep('step-1-container');
});

// Secure Fields
function initSecureFields() {
  const customStyles = {
    color: '#f8fafc',
    placeholderColor: '#9ca3af',
    fontSize: '16px',
    fontFamily: 'Inter, sans-serif'
  };

  cardNumberInstance = mp.fields.create('cardNumber', {
    placeholder: '•••• •••• •••• ••••',
    style: customStyles
  }).mount('cardNumber');

  cardNumberInstance.on('binChange', async (data) => {
    const { bin } = data;
    try {
      if (bin) {
        const { results } = await mp.getPaymentMethods({ bin });
        if (!results || results.length === 0) return;
        window.paymentMethodId = results[0]?.id;
      }
    } catch (e) {
      console.error('Error getting payment method', e);
    }
  });

  expirationDateInstance = mp.fields.create('expirationDate', {
    placeholder: 'MM/AA',
    style: customStyles
  }).mount('expirationDate');

  securityCodeInstance = mp.fields.create('securityCode', {
    placeholder: 'CVC',
    style: customStyles
  }).mount('securityCode');
}

// Procesar Pago
checkoutForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  btnPay.disabled = true;
  btnPay.innerHTML = '<span class="lock-icon">🔒</span> Procesando...';
  
  transactionData.cardholderName = document.getElementById('cardholderName').value;
  transactionData.payerEmail = document.getElementById('payerEmail').value;

  try {
    const tokenResponse = await mp.fields.createCardToken({
      cardholderName: transactionData.cardholderName,
      identificationType: 'OTRO',
      identificationNumber: '12345678'
    });

    if (tokenResponse && tokenResponse.id) {
      
      if (!window.paymentMethodId && tokenResponse.first_six_digits) {
        const firstDigit = tokenResponse.first_six_digits.charAt(0);
        if (firstDigit === '4') window.paymentMethodId = 'visa';
        else if (firstDigit === '5') window.paymentMethodId = 'master';
        else if (firstDigit === '3') window.paymentMethodId = 'amex';
      }

      let payerObj = { email: transactionData.payerEmail };
      let deviceId = typeof window.mpDeviceId === 'string' ? window.mpDeviceId : null;

      const payload = {
        token: tokenResponse.id,
        transaction_amount: transactionData.amount,
        description: transactionData.description,
        payment_method_id: window.paymentMethodId || 'master', 
        device_id: deviceId,
        installments: 1,
        payer: payerObj
      };

      switchTerminalStep('step-3-container');

      const response = await fetch('/api/process_payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const responseData = await response.json();
      renderDetailsView(responseData, payload);
    }
  } catch (error) {
    console.error(error);
    alert('Error validando tarjeta: ' + error.message);
    switchTerminalStep('step-2-container');
  } finally {
    btnPay.disabled = false;
    btnPay.innerHTML = '<span class="lock-icon">🔒</span> Pagar Seguro';
  }
});

// Renderizar Vista Detalles
function renderDetailsView(data, payload) {
  switchTerminalStep('step-4-container');

  document.getElementById('detail-desc').textContent = payload.description;
  document.getElementById('detail-amount').textContent = `$${parseFloat(payload.transaction_amount).toFixed(2)}`;

  const badge = document.getElementById('detail-badge');
  const isApproved = data.status === 'approved';
  
  badge.className = `status-badge ${isApproved ? 'approved' : 'failed'}`;
  badge.textContent = isApproved ? 'Aprobado' : 'Rechazado';

  document.getElementById('val-reference').textContent = data.id ? `PAY-${data.id}` : 'No generado';
  document.getElementById('val-id').textContent = data.id || '-';
  document.getElementById('val-status').textContent = data.status || 'error';
  document.getElementById('val-detail').textContent = data.status_detail || data.message || 'unknown_error';
  document.getElementById('val-method').textContent = data.payment_method_id || payload.payment_method_id;
  
  const now = new Date();
  document.getElementById('val-date').textContent = now.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}
