// Seleccionamos ambos botones de salir
const btnSalirFooter = document.getElementById("btnSalir");
const btnSalirMenu = document.getElementById("btnSalirMenu");

// Función para cerrar sesión
function cerrarSesion() {
  // Borrar las claves de sesión guardadas por main.js
  localStorage.removeItem("amigoSecreto_sesionID");
  localStorage.removeItem("amigoSecreto_tipoUsuario");

  // Redirigir al login
  window.location.href = "index.html";
}

// Asociar la función a los botones si existen
if (btnSalirFooter) btnSalirFooter.addEventListener("click", cerrarSesion);
if (btnSalirMenu) btnSalirMenu.addEventListener("click", cerrarSesion);