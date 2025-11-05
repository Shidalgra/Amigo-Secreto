// ==============================
// CONFIGURACIÓN EMAILJS
// ==============================
(function () {
  emailjs.init("4YuI0Acrrnq98FLr5"); // Public Key de EmailJS
})();

// ==============================
// FUNCIÓN PARA ENVIAR CORREO
// ==============================
function enviarCorreoAmigoSecreto(nombre, correoDestino, codigoUnico) {
  const templateParams = {
    to_name: nombre,
    codigo_unico: codigoUnico,
  };

  emailjs
    .send("service_i2kt2cq", "template_59om0zt", templateParams)
    .then((response) => {
      console.log("✅ Correo enviado correctamente:", response.status, response.text);
    })
    .catch((error) => {
      console.error("❌ Error al enviar el correo:", error);
    });
}
