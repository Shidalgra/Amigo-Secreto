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
// EVENTO: BOTÓN REGISTRAR SESIÓN
// ==========================
document.addEventListener("DOMContentLoaded", () => {
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
          text: `La sesión "${data.username}" ha sido creada. Viajando a la página de Inicio de Sesión...`,
          timer: 3000,
          showConfirmButton: false,
          timerProgressBar: true,
        }).then(() => {
          window.location.href = "index.html";
        });

      } catch (error) {
        console.error("Error:", error);
        Swal.fire({
          icon: "error",
          title: "Error al crear la sesión",
          text: error.message,
        });
      }
    });
  }
});

// ==========================
// EVENTO: BOTÓN INGRESAR SESIÓN
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  const btnIngresar = document.getElementById("btnIngresar");
  if (btnIngresar) {
    btnIngresar.addEventListener("click", async (e) => {
      e.preventDefault();

      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value.trim();

      if (!username || !password) {
        Swal.fire("Campos incompletos", "Por favor ingresa usuario y contraseña.", "warning");
        return;
      }

      try {
        const res = await fetch("/.netlify/functions/ingresar-sesion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al ingresar.");

        localStorage.setItem("amigoSecreto_tipoUsuario", "participante");
        localStorage.setItem("amigoSecreto_sesionID", username);

        Swal.fire({
          icon: "success",
          title: `Sesión iniciada: "${data.username}"`,
          text: "Bienvenido a tu grupo de Amigo Secreto 🎁. Viajando a la página principal...",
          timer: 2500,
          showConfirmButton: false,
          timerProgressBar: true,
        }).then(() => {
          window.location.href = "pagina-principal.html";
        });

      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Error de acceso",
          text: error.message || "No se pudo ingresar a la sesión.",
        });
      }
    });
  }
});
