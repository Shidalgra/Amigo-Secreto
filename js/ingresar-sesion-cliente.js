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
      // ✅ Guardamos que el usuario inició sesión
      localStorage.setItem("usuarioLogueado", username);

      // Redirigimos a la página principal
      window.location.href = "pagina-principal.html";
    } else {
      // ❌ Mostrar error
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
