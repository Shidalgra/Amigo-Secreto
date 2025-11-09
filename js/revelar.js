// public/js/revelar.js
const params = new URLSearchParams(window.location.search);
const codigoConsulta = params.get('codigo');

const card = document.getElementById('amigo-card');
const nombreElemento = document.getElementById('nombre-amigo');
const contadorElemento = document.getElementById('contador');
const confettiContainer = document.getElementById('confetti');

function lanzarConfetti() {
  for (let i = 0; i < 100; i++) {
    const piece = document.createElement('div');
    piece.classList.add('confetti-piece');
    piece.style.left = Math.random() * window.innerWidth + 'px';
    piece.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
    piece.style.animationDuration = 3 + Math.random() * 2 + 's';
    confettiContainer.appendChild(piece);
    setTimeout(() => piece.remove(), 5000);
  }
}

async function revelarAmigo() {
  if (!codigoConsulta) {
    nombreElemento.textContent = "Código no válido 😢";
    return;
  }

  try {
    // Llamada a la función Netlify
    const res = await fetch('/.netlify/functions/revelar-secreto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigoConsulta })
    });

    const json = await res.json();

    if (!res.ok) {
      console.error('Respuesta no ok', json);
      nombreElemento.textContent = json.error || "Código no encontrado 😢";
      return;
    }

    const nombreAmigo = json.nombreAmigo;
    if (!nombreAmigo) {
      nombreElemento.textContent = "No se encontró nombre 😢";
      return;
    }

    // --- Animación ---
    card.classList.add('flipped');
    let contador = 5;
    contadorElemento.textContent = contador;

    const interval = setInterval(() => {
      contador--;
      contadorElemento.textContent = contador;
      if (contador === 1) lanzarConfetti();
      if (contador <= 0) {
        clearInterval(interval);
        contadorElemento.style.display = 'none';
        nombreElemento.textContent = nombreAmigo;
      }
    }, 1000);

  } catch (err) {
    console.error('Error conectando con la función:', err);
    nombreElemento.textContent = "Error al conectar 😢";
  }
}

revelarAmigo();


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

