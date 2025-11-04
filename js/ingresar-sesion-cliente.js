const btnIngresar = document.getElementById("btnIngresar");

btnIngresar.addEventListener("click", async () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch("/.netlify/functions/ingresar-sesion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (res.ok) {
      // Guardamos que el usuario inició sesión
      localStorage.setItem("usuarioLogueado", username);

      // Mostramos Swal de bienvenida genérico
      Swal.fire({
        icon: "success",
        title: `¡Hola, ${username}!`,
        text: "Has iniciado sesión correctamente. Serás redirigido a la página principal...",
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false
      });

      // Redirigir después de 2 segundos
      setTimeout(() => {
        window.location.href = "pagina-principal.html";
      }, 2000);

    } else {
      // Mostrar error
      Swal.fire({
        icon: "error",
        title: "Error al ingresar",
        text: data.error || "Ocurrió un problema",
      });
    }
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Error de conexión",
      text: "No se pudo conectar con el servidor",
    });
  }
});
