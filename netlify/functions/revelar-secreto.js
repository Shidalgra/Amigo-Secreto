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

// Clave de encriptación (misma que en generar-sorteo.js)
const ENCRYPTION_SECRET_KEY = "TU_ENCRYPTION_SECRET_KEY";

// Obtener código del query string
const params = new URLSearchParams(window.location.search);
const codigoConsulta = params.get('codigo');

const nombreElemento = document.getElementById('nombre-amigo');

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
            nombreElemento.textContent = nombreAmigo;
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
