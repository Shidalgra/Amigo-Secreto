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




