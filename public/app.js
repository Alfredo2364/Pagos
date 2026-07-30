// 1. Inicializar Mercado Pago
const mp = new MercadoPago('APP_USR-118af7d5-fafa-4477-963a-b8e0b433ca84', {
  locale: 'es-MX'
});

// Vistas
const view1 = document.getElementById('step-1-container');
const view2 = document.getElementById('step-2-container');
const view3 = document.getElementById('step-3-container');
const view4 = document.getElementById('step-4-container');

// Botones de Navegación
const btnBackTo1 = document.getElementById('btn-back-to-1');
const btnBackTo1From3 = document.getElementById('btn-back-to-1-from-3');
const btnBackTo1From4 = document.getElementById('btn-back-to-1-from-4');
const btnViewDetails = document.getElementById('btn-view-details');

// Formularios
const detailsForm = document.getElementById('details-form');
const checkoutForm = document.getElementById('checkout-form');
const btnPay = document.getElementById('btn-pay');

let transactionData = null; 
let paymentResponseData = null; 
let cardNumberInstance, expirationDateInstance, securityCodeInstance;

// Funciones de navegación
function showView(view) {
  [view1, view2, view3, view4].forEach(v => v.classList.remove('active'));
  view.classList.add('active');
}

// Del 1 al 2
detailsForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  transactionData = {
    amount: document.getElementById('amount').value,
    description: document.getElementById('description').value,
  };

  // Actualizar UI del paso 2
  document.getElementById('display-desc').textContent = transactionData.description;
  document.getElementById('display-amount').textContent = `$${parseFloat(transactionData.amount).toFixed(2)}`;

  showView(view2);

  if (!cardNumberInstance) {
    initSecureFields();
  }
});

// Botones Volver
btnBackTo1.addEventListener('click', () => showView(view1));
btnBackTo1From3.addEventListener('click', () => showView(view1));
btnBackTo1From4.addEventListener('click', () => {
  detailsForm.reset();
  checkoutForm.reset();
  showView(view1);
});

btnViewDetails.addEventListener('click', () => {
  showView(view4);
});


// 3. Configurar Secure Fields
function initSecureFields() {
  const customStyles = {
    color: '#111827',
    placeholderColor: '#9ca3af',
    fontSize: '16px',
    fontFamily: 'Inter, sans-serif'
  };

  cardNumberInstance = mp.fields.create('cardNumber', {
    placeholder: '1234 1234 1234 1234',
    style: customStyles
  }).mount('cardNumber');

  cardNumberInstance.on('binChange', async (data) => {
    const { bin } = data;
    try {
      if (bin) {
        const { results } = await mp.getPaymentMethods({ bin });
        window.paymentMethodId = results[0].id;
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

// 4. Procesar el Pago
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
      
      // Fallback inteligente en caso de que Mercado Pago tire error 503 en Sandbox
      if (!window.paymentMethodId && tokenResponse.first_six_digits) {
        const firstDigit = tokenResponse.first_six_digits.charAt(0);
        if (firstDigit === '4') window.paymentMethodId = 'visa';
        else if (firstDigit === '5') window.paymentMethodId = 'master';
        else if (firstDigit === '3') window.paymentMethodId = 'amex';
      }

      let payerObj = {
        first_name: document.getElementById('buyerName').value || transactionData.cardholderName,
        email: document.getElementById('buyerEmail').value || transactionData.payerEmail
      };

      const lastName = document.getElementById('buyerLastName').value;
      if (lastName) payerObj.last_name = lastName;

      const phone = document.getElementById('buyerPhone').value;
      if (phone) payerObj.phone = { number: phone };

      const street = document.getElementById('buyerStreet').value;
      const streetNumber = document.getElementById('buyerNumber').value;
      const zipCode = document.getElementById('buyerZip').value;
      const neighborhood = document.getElementById('buyerSuburb').value;

      if (street || streetNumber || zipCode || neighborhood) {
        payerObj.address = {};
        if (street) payerObj.address.street_name = street;
        if (streetNumber) payerObj.address.street_number = streetNumber;
        if (zipCode) payerObj.address.zip_code = zipCode;
        if (neighborhood) payerObj.address.neighborhood = neighborhood;
      }

      // Asegurar que device_id sea un string
      let deviceId = null;
      if (typeof window.mpDeviceId === 'string') {
        deviceId = window.mpDeviceId;
      } else if (document.getElementById('mpDeviceId')) {
        deviceId = document.getElementById('mpDeviceId').value;
      }

      const payload = {
        token: tokenResponse.id,
        transaction_amount: transactionData.amount,
        description: transactionData.description,
        payment_method_id: window.paymentMethodId || 'master', 
        device_id: deviceId,
        installments: 1,
        payer: payerObj
      };

      // Muestra vista de procesando
      showView(view3);

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
    alert('Ocurrió un error local: ' + error.message);
    showView(view2);
  } finally {
    btnPay.disabled = false;
    btnPay.innerHTML = '<span class="lock-icon">🔒</span> Pagar';
  }
});


// 5. Renderizar Vista de Detalles
function renderDetailsView(data, payload) {
  // Update static texts
  document.getElementById('detail-desc').textContent = payload.description;
  document.getElementById('detail-amount').textContent = `$${parseFloat(payload.transaction_amount).toFixed(2)}`;

  const badge = document.getElementById('detail-badge');
  const isApproved = data.status === 'approved';
  
  if (isApproved) {
    badge.className = 'status-badge approved';
    badge.textContent = 'Approved';
  } else {
    badge.className = 'status-badge failed';
    badge.textContent = 'Failed';
  }

  // Populate table
  document.getElementById('val-reference').textContent = data.id ? `payment-${data.id}` : 'No generado';
  document.getElementById('val-id').textContent = data.id || '-';
  document.getElementById('val-status').textContent = data.status || 'error';
  document.getElementById('val-detail').textContent = data.status_detail || data.message || 'unknown_error';
  document.getElementById('val-method').textContent = data.payment_method_id || payload.payment_method_id;
  document.getElementById('val-type').textContent = data.payment_type_id || 'credit_card';

  // Activity date
  const now = new Date();
  document.getElementById('val-date').textContent = now.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}
