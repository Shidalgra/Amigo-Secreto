// consultar.js

document.getElementById('btnConsultar').addEventListener('click', () => {
  const codigoInput = document.getElementById('codigoConsulta');
  const codigo = codigoInput.value.trim();

  if (!codigo) {
    Swal.fire({
      icon: 'warning',
      title: 'Oops...',
      text: 'Ingresa tu código de consulta'
    });
    return;
  }

  // Redirigir a revelar-secreto.html con el código en query string
  window.location.href = `revelar-secreto.html?codigo=${codigo}`;
});

// ==========================
// Variables principales
// ==========================
const formContainer = document.getElementById('form-container');
const resultContainer = document.getElementById('results-container');
const toggleBtnForm = document.getElementById('toggle-form');
const toggleBtnResult = document.getElementById('toggle-result');
const formIMG = document.getElementById('form-image');
const resultsIMG = document.getElementById('results-image');
const formIframe = document.getElementById('formulario-deseos');
const resultIframe = document.getElementById('tabla-Resultados');

// ==========================
// Toggle Formulario
// ==========================
toggleBtnForm.addEventListener('click', () => {
  const formVisible = formIframe.style.display === 'block';

  // Si los resultados están abiertos, los cerramos antes
  if (resultIframe.style.display === 'block') {
    resultsIMG.style.display = 'none';
    resultIframe.style.display = 'none';
    toggleBtnResult.textContent = "📊 Ver lista de deseos enviados";
    toggleBtnResult.style.backgroundColor = "#00873E";
  }

  if (!formVisible) {
    formIMG.style.display = 'block';
    formIframe.style.display = 'block';
    toggleBtnForm.textContent = '❌ Cerrar lista de deseos';
    toggleBtnForm.style.backgroundColor = "#EA4630";
    formContainer.scrollIntoView({ behavior: 'smooth' });
  } else {
    formIMG.style.display = 'none';
    formIframe.style.display = 'none';
    toggleBtnForm.textContent = '🎁 Completa tu lista de deseos';
    toggleBtnForm.style.backgroundColor = "#00873E";
  }
});

// ==========================
// Toggle Resultados
// ==========================
toggleBtnResult.addEventListener('click', () => {
  const tablaVisible = resultIframe.style.display === 'block';

  // Si el formulario está abierto, lo cerramos primero
  if (formIframe.style.display === 'block') {
    formIMG.style.display = 'none';
    formIframe.style.display = 'none';
    toggleBtnForm.textContent = '🎁 Completa tu lista de deseos';
    toggleBtnForm.style.backgroundColor = "#00873E";
  }

  if (!tablaVisible) {
    resultsIMG.style.display = 'block';
    resultIframe.style.display = 'block';
    toggleBtnResult.textContent = "🔒 Ocultar lista de deseos";
    toggleBtnResult.style.backgroundColor = "#EA4630";
    resultContainer.scrollIntoView({ behavior: 'smooth' });

    // Desplazamiento automático hacia abajo del iframe de resultados
    setTimeout(() => {
      const iframe = resultIframe.querySelector("iframe");
      if (iframe) {
        iframe.onload = () => {
          iframe.contentWindow.scrollTo(0, iframe.contentDocument.body.scrollHeight);
        };
      }
    }, 1000);

  } else {
    resultsIMG.style.display = 'none';
    resultIframe.style.display = 'none';
    toggleBtnResult.textContent = "📊 Ver lista de deseos enviados";
    toggleBtnResult.style.backgroundColor = "#00873E";
  }
});