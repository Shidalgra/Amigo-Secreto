// archivo: js/firebase-config.js

// 1. Importar la configuración desde un archivo no rastreado por Git
import { firebaseConfig } from './firebase-env.js';

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