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

// ==========================
// Función para recuperar contraseña
// ==========================

async function recuperarPassword() {
  const { value: email } = await Swal.fire({
    title: "Recuperar contraseña",
    input: "email",
    inputLabel: "Ingresa tu correo electrónico registrado",
    inputPlaceholder: "correo@ejemplo.com",
    confirmButtonText: "Enviar enlace",
    showCancelButton: true,
    cancelButtonText: "Cancelar",
    inputValidator: (value) => {
      if (!value) {
        return "Por favor, ingresa tu correo";
      }
    },
  });

  if (!email) return; // Usuario canceló

  Swal.fire({
    title: "Enviando enlace...",
    text: "Por favor espera un momento",
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });

  try {
    // Llamar a la función serverless
    const res = await fetch("/.netlify/functions/request-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario: email }),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "No se pudo generar el enlace");

    //Construir el enlace para el correo
    const resetLink = `${window.location.origin}/reset-password.html?token=${data.token}`;

    // Enviar correo con EmailJS o Resend
    await emailjs.send(
  "service_i2kt2cq",     // ID de tu servicio en EmailJS
  "template_jq2mjhk",    // ID de tu plantilla (confirmado)
  {
    email: email,          // Debe coincidir con {{email}} en tu template
    resetLink: data.resetLink // Debe coincidir con {{resetLink}} en tu template
  },
  "4YuI0Acrrnq98FLr5"    // 🔑 Reemplaza con tu EmailJS Public Key
);

    Swal.fire({
      icon: "success",
      title: "¡Correo enviado!",
      text: "Revisa tu bandeja para restablecer tu contraseña.",
    });
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Error al enviar correo",
      text: error.message,
    });
  }
}

//Enlazar el enlace de pedi la contraseña para que se dispare el flujo de recuperacion
document.getElementById("btnOlvidoPass").addEventListener("click", (e) => {
  e.preventDefault();
  recuperarPassword();
});
