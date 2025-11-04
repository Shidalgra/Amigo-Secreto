// Verificar si hay un usuario logueado
  const usuario = localStorage.getItem("usuarioLogueado");
  if (!usuario) {
    // No hay usuario logueado → redirigir al login
    window.location.href = "index.html";
  } else {
    console.log("Usuario logueado:", usuario);
  }