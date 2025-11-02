// archivo: js/firebase-config.js

// 1. Configuración de Firebase (REEMPLAZA ESTOS VALORES)
const firebaseConfig = {
    apiKey: "AIzaSyDT_V6z6xSGoQiV7iJXfVsP53ecvR4qoos",
    authDomain: "amigo-secreto-c4d79.firebaseapp.com",
    projectId: "amigo-secreto-c4d79",
    storageBucket: "amigo-secreto-c4d79.firebasestorage.app",
    messagingSenderId: "435632543005",
    appId: "1:435632543005:web:168b6a2814c14c36da7df4"
};

// 2. Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// 3. Referencias a los servicios
const auth = firebase.auth();
const db = firebase.firestore();

// 4. Exportar referencias para usarlas en otros scripts
export { auth, db };

// Nota: Necesitarás agregar los SDK de Firebase en tu HTML (ver index.html)
// <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
// <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-auth.js"></script>
// <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js"></script>