// ==========================
// verifica-usuario-inicio-sesion.js
// ==========================

// Nombre de la clave que usamos en localStorage para guardar al usuario logueado
const USUARIO_KEY = "usuarioLogueado";

// Función para verificar si hay usuario logueado
function verificarSesion() {
  const usuario = localStorage.getItem(USUARIO_KEY);

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

// ==========================
// Funcionalidad de Cerrar Sesión
// ==========================
function cerrarSesion() {
  localStorage.removeItem(USUARIO_KEY);
  window.location.href = "index.html";
}

// Botón en el footer
const btnSalirFooter = document.getElementById("btnSalir");
// Botón en el menú
const btnSalirMenu = document.getElementById("btnSalirMenu");

if (btnSalirFooter) btnSalirFooter.addEventListener("click", cerrarSesion);
if (btnSalirMenu) btnSalirMenu.addEventListener("click", cerrarSesion);
