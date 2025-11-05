// ==============================
// CONFIGURACIÓN EMAILJS
// ==============================
(function () {
  emailjs.init("4YuI0Acrrnq98FLr5"); // Public Key de EmailJS
})();

// ==============================
// FUNCIÓN PARA ENVIAR CORREO
// ==============================
async function enviarCorreoAmigoSecreto(nombre, correoDestino, codigoUnico) {
  const templateParams = {
    to_name: nombre,
    to_email: correoDestino,
    codigo_unico: codigoUnico,
  };

  try {
    const response = await emailjs.send(
      "service_i2kt2cq", // Tu Service ID
      "template_59om0zt", // Tu Template ID
      templateParams
    );
    console.log("✅ Correo enviado correctamente a:", correoDestino, response.status);
  } catch (error) {
    console.error("❌ Error al enviar el correo a:", correoDestino, error);
  }
}

