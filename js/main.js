// js/main.js
// ==========================
// CONFIGURACIÓN FIREBASE
// ==========================
const firebaseConfig = {
    apiKey: "AIzaSyB77bg-KvNbYcr5YndutHMaHRw0vcrCuZE",
    authDomain: "amigo-secreto-app-a95be.firebaseapp.com",
    projectId: "amigo-secreto-app-a95be",
    storageBucket: "amigo-secreto-app-a95be.firebasestorage.app",
    messagingSenderId: "50039635107",
    appId: "1:50039635107:web:a9580ade5d86973e541316"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// ==========================
// CONFIGURACIÓN EMAILJS
// ==========================
(function() {
  if (typeof emailjs !== 'undefined' && emailjs.init) {
    try { emailjs.init("4YuI0Acrrnq98FLr5"); } 
    catch (e) { console.warn("EmailJS init fallo:", e); }
  }
})();

async function enviarCorreoAmigoSecreto(nombre, correo, codigo) {
  if (!correo) return false;
  const templateParams = { to_name: nombre, to_email: correo, codigo_unico: codigo };
  try {
    if (!emailjs || !emailjs.send) return false;
    const resp = await emailjs.send("service_i2kt2cq", "template_59om0zt", templateParams);
    console.log(`✅ Correo enviado a ${nombre} (${correo}) — status: ${resp.status}`);
    return true;
  } catch (err) { console.error("❌ Error al enviar correo a", correo, err); return false; }
}

// ==========================
// VARIABLES
// ==========================
const STORAGE_PREFIX = "amigoSecreto_";

// ==========================
// REGISTRAR SESIÓN
// ==========================
const btnRegistrar = document.getElementById("btnRegistrar");
if (btnRegistrar) {
  btnRegistrar.addEventListener("click", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();

    if (!username || !password || !confirmPassword) {
      Swal.fire("Campos incompletos", "Por favor llena todos los campos.", "warning");
      return;
    }
    if (password !== confirmPassword) {
      Swal.fire("Error", "Las contraseñas no coinciden.", "error");
      return;
    }

    try {
      const res = await fetch("/.netlify/functions/crear-sesion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear la sesión.");
      document.getElementById("username").value = "";
      document.getElementById("password").value = "";
      document.getElementById("confirmPassword").value = "";
      Swal.fire({
        icon: "success",
        title: "Sesión creada correctamente",
        text: `La sesión "${data.username}" ha sido creada.`,
        timer: 3000,
        showConfirmButton: false,
        timerProgressBar: true,
      }).then(() => { window.location.href = "index.html"; });
    } catch (error) {
      console.error("Error:", error);
      Swal.fire({ icon: "error", title: "Error al crear la sesión", text: error.message });
    }
  });
}

// ==========================
// INGRESAR SESIÓN
// ==========================
const btnIngresar = document.getElementById("btnIngresar");
if (btnIngresar) {
  btnIngresar.addEventListener("click", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    if (!username || !password) { Swal.fire("Campos incompletos", "Ingresa usuario y contraseña.", "warning"); return; }

    try {
      const res = await fetch("/.netlify/functions/ingresar-sesion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al ingresar.");
      localStorage.setItem(`${STORAGE_PREFIX}tipoUsuario`, "participante");
      localStorage.setItem(`${STORAGE_PREFIX}sesionID`, username);
      Swal.fire({
        icon: "success",
        title: `Sesión iniciada "${data.username}"`,
        text: "Bienvenido 🎁. Redirigiendo a la página principal.",
        timer: 2500,
        showConfirmButton: false,
        timerProgressBar: true,
      }).then(() => { window.location.href = "pagina-principal.html"; });
    } catch (error) {
      Swal.fire({ icon: "error", title: "Error de acceso", text: error.message || "No se pudo ingresar." });
    }
  });
}
