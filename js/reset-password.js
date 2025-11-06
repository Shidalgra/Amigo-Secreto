// reset-password.js (frontend) - parte de cambio de password
const params = new URLSearchParams(window.location.search);
const token = params.get("token");

document.getElementById("btnReset").addEventListener("click", async () => {
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (!newPassword || !confirmPassword) {
    Swal.fire("Error", "Llena ambos campos", "error");
    return;
  }
  if (newPassword !== confirmPassword) {
    Swal.fire("Error", "Las contraseñas no coinciden", "error");
    return;
  }

  if (!token) {
    Swal.fire("Error", "Token faltante en URL", "error");
    return;
  }

  try {
    const res = await fetch('/.netlify/functions/do-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al cambiar la contraseña');

    Swal.fire("Éxito", "Contraseña actualizada correctamente", "success")
      .then(() => window.location.href = "index.html");
  } catch (err) {
    console.error(err);
    Swal.fire("Error", err.message || "No se pudo cambiar la contraseña", "error");
  }
});
