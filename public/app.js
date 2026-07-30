// 1. Inicializar Mercado Pago
const mp = new MercadoPago('APP_USR-0c7bce9e-6892-4571-8584-32fa4fbfab6b', {
  locale: 'es-MX'
});

// Elementos del DOM
const step1Container = document.getElementById('step-1-container');
const detailsForm = document.getElementById('details-form');
const step2Container = document.getElementById('step-2-container');
const btnBack = document.getElementById('btn-back');
const checkoutForm = document.getElementById('checkout-form');
const successScreen = document.getElementById('success-screen');
const btnNewPayment = document.getElementById('btn-new-payment');
const btnPay = document.getElementById('btn-pay');

let transactionData = null; 
let paymentResponseData = null; 
let cardNumberInstance, expirationDateInstance, securityCodeInstance;

// Transición del Paso 1 al Paso 2
detailsForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  transactionData = {
    amount: document.getElementById('amount').value,
    description: document.getElementById('description').value,
  };

  step1Container.classList.add('hidden');
  step2Container.classList.remove('hidden');

  if (!cardNumberInstance) {
    initSecureFields();
  }
});

// Botón Volver
btnBack.addEventListener('click', () => {
  step2Container.classList.add('hidden');
  step1Container.classList.remove('hidden');
});

// 3. Configurar y Renderizar Secure Fields
function initSecureFields() {
  const customStyles = {
    color: '#ffffff',
    placeholderColor: '#94a3b8',
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

// 4. Crear Token de Tarjeta y Enviar al Backend
checkoutForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  btnPay.disabled = true;
  btnPay.textContent = 'Procesando...';

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
          first_name: transactionData.cardholderName,
          email: transactionData.payerEmail
        }
      };

      const response = await fetch('/api/process_payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const responseData = await response.json();

      if(responseData.status === 'approved') {
        paymentResponseData = responseData;
        showSuccessScreen();
      } else {
        const errorMsg = responseData.message || responseData.error || responseData.status_detail || 'Error desconocido';
        alert(`Pago rechazado o error: ${errorMsg}`);
        console.error('Detalles del error:', responseData);
      }
    }
  } catch (error) {
    console.error(error);
    alert('Ocurrió un error: ' + error.message);
  } finally {
    btnPay.disabled = false;
    btnPay.textContent = 'Pagar';
  }
});

// 5. Pantalla de Éxito
function showSuccessScreen() {
  step2Container.classList.add('hidden');
  successScreen.classList.remove('hidden');
}

// 6. (Omitido) - Sistema de ticket desactivado

// Reiniciar flujo
btnNewPayment.addEventListener('click', () => {
  document.getElementById('amount').value = '';
  document.getElementById('description').value = '';
  document.getElementById('cardholderName').value = '';
  document.getElementById('payerEmail').value = '';
  
  successScreen.classList.add('hidden');
  step1Container.classList.remove('hidden');
  
  transactionData = null;
  paymentResponseData = null;
});
