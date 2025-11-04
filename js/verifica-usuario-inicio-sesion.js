// ==========================
// verifica-usuario-inicio-sesion.js
// ==========================

// Nombre de la clave que usamos en localStorage para guardar al usuario logueado
const USUARIO_KEY = "amigoSecreto_sesionID"; // Ahora verifica la clave que main.js guarda

// Función para verificar si hay usuario logueado
function verificarSesion() {
  const usuario = localStorage.getItem(USUARIO_KEY); // Verifica si existe el ID de la sesión

  if (!usuario) {
    // No hay usuario logueado, redirigir a login
    Swal.fire({
      icon: "warning",
      title: "Acceso denegado",
      text: "Debes iniciar sesión para entrar a esta página",
      allowOutsideClick: false,
      allowEscapeKey: false,
    }).then(() => {
      window.location.href = "index.html";
    });
  }
}

// Ejecutar verificación al cargar la página
document.addEventListener("DOMContentLoaded", verificarSesion);
