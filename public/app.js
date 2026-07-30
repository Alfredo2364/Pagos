// 1. Inicializar Mercado Pago
const mp = new MercadoPago('TEST-dd2f8950-aba7-4846-9870-bd9814bcdf55', {
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
      const payload = {
        token: tokenResponse.id,
        transaction_amount: transactionData.amount,
        description: transactionData.description,
        payment_method_id: window.paymentMethodId || 'master', 
        device_id: window.mpDeviceId || null,
        installments: 1,
        payer: {
          first_name: document.getElementById('buyerName').value || transactionData.cardholderName,
          last_name: document.getElementById('buyerLastName').value || '',
          email: document.getElementById('buyerEmail').value || transactionData.payerEmail,
          phone: document.getElementById('buyerPhone').value ? { number: document.getElementById('buyerPhone').value } : undefined,
          address: {
            street_name: document.getElementById('buyerStreet').value || '',
            street_number: document.getElementById('buyerNumber').value || '',
            zip_code: document.getElementById('buyerZip').value || '',
            city: document.getElementById('buyerCity').value || '',
            state: document.getElementById('buyerState').value || '',
            neighborhood: document.getElementById('buyerSuburb').value || ''
          }
        }
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
