// Inicializar Firebase
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const ENCRYPTION_SECRET_KEY = "TU_ENCRYPTION_SECRET_KEY";

// Obtener código del query string
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
    piece.style.backgroundColor = `hsl(${Math.random()*360}, 100%, 50%)`;
    piece.style.animationDuration = 3 + Math.random() * 2 + 's';
    confettiContainer.appendChild(piece);
    setTimeout(() => piece.remove(), 5000);
  }
}

if (!codigoConsulta) {
  nombreElemento.textContent = "Código no válido 😢";
} else {
  db.collectionGroup("sorteo")
    .where("codigoConsulta", "==", codigoConsulta)
    .get()
    .then(snapshot => {
      if (snapshot.empty) {
        nombreElemento.textContent = "Código no encontrado 😢";
      } else {
        snapshot.forEach(doc => {
          const data = doc.data();
          try {
            const bytes = CryptoJS.AES.decrypt(data.asignacionCifrada, ENCRYPTION_SECRET_KEY);
            const nombreAmigo = bytes.toString(CryptoJS.enc.Utf8);

            // Animación de temporizador
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

          } catch (e) {
            console.error(e);
            nombreElemento.textContent = "Error al descifrar 😢";
          }
        });
      }
    })
    .catch(err => {
      console.error(err);
      nombreElemento.textContent = "Error al consultar 😢";
    });
}
