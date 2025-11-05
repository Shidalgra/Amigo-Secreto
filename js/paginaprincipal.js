// js/main.js
// ==========================
// CONFIGURACIÓN FIREBASE
// ==========================

const firebaseConfig = {
    apiKey: "AIzaSyB77bg-KvNbYcr5YndutHMaHRw0vcrCuZE",
    authDomain: "amigo-secreto-app-a95be.firebaseapp.com",
    projectId: "amigo-secreto-app-a95be",
    storageBucket: "amigo-secreto-app-a95be.firebasestorage.app",
    messagingSenderId: "50039635107",
    appId: "1:50039635107:web:a9580ade5d86973e541316"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// ==========================
// CONFIGURACIÓN EMAILJS
// ==========================
(function() {
  if (typeof emailjs !== 'undefined' && emailjs.init) {
    try {
      emailjs.init("4YuI0Acrrnq98FLr5");
    } catch (e) {
      console.warn("EmailJS init fallo:", e);
    }
  } else {
    console.warn("EmailJS SDK no encontrado. Asegúrate de incluir el script en el HTML.");
  }
});

async function enviarCorreoAmigoSecreto(nombre, correo, codigo) {
  if (!correo) return false;
  const templateParams = { to_name: nombre, to_email: correo, codigo_unico: codigo };
  try {
    if (!emailjs || !emailjs.send) return false;
    const resp = await emailjs.send("service_i2kt2cq", "template_59om0zt", templateParams);
    console.log(`✅ Correo enviado a ${nombre} (${correo}) — status: ${resp.status}`);
    return true;
  } catch (err) {
    console.error("❌ Error al enviar correo a", correo, err);
    return false;
  }
}

// ==========================
// VARIABLES
// ==========================
const STORAGE_PREFIX = "amigoSecreto_";
let tipoUsuario = localStorage.getItem(`${STORAGE_PREFIX}tipoUsuario`) || "participante";
let sesionID = localStorage.getItem(`${STORAGE_PREFIX}sesionID`) || "";

// ==========================
// AGREGAR PARTICIPANTE
// ==========================
async function agregarParticipanteDesdeFormulario() {
  const nombreInput = document.getElementById("nombreParticipante");
  const telefonoInput = document.getElementById("telefonoParticipante");
  const correoInput = document.getElementById("correoParticipante");

  const nombre = nombreInput.value.trim();
  const telefono = telefonoInput.value.trim();
  const correo = correoInput.value.trim();

  if (!nombre) { Swal.fire("Campo requerido", "El nombre del participante es obligatorio.", "warning"); return; }
  if (correo && !/^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/.test(correo)) { Swal.fire("Correo inválido", "Formato incorrecto.", "error"); return; }

  const participanteData = { nombre, telefono, correo };
  try {
    await db.collection("sesiones").doc(sesionID).collection("participantes").add(participanteData);
    Swal.fire({ icon: "success", title: "Participante agregado", timer: 1500, showConfirmButton: false });
    nombreInput.value = ""; telefonoInput.value = ""; correoInput.value = "";
  } catch (error) {
    Swal.fire({ icon: "error", title: "Error al guardar", text: error.message });
  }
}

// ==========================
// GENERAR SORTEO
// ==========================
async function generarSorteo() {
  const confirmacion = await Swal.fire({
    title: '¿Estás seguro?',
    text: "Se realizará el sorteo y se enviarán los correos.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#28a745',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Sí, ¡realizar sorteo!',
    cancelButtonText: 'Cancelar'
  });
  if (!confirmacion.isConfirmed) return;

  Swal.fire({ title: 'Realizando sorteo...', text: 'Por favor, espera...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

  try {
    const res = await fetch('/.netlify/functions/generar-sorte', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sesionId: sesionID }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error desconocido en el servidor.');

    if (data.resultados && data.resultados.length > 0) {
      let resultadosHtml = `<p>¡Sorteo finalizado!</p><table class="tabla-resultados-sorteo"><thead><tr><th>Participante</th><th>Código</th></tr></thead><tbody>`;
      for (const resItem of data.resultados) {
        resultadosHtml += `<tr><td>${resItem.participante}</td><td class="codigo-consulta">${resItem.codigo}</td></tr>`;
        if (resItem.correo && resItem.correo.trim() !== "") await enviarCorreoAmigoSecreto(resItem.participante, resItem.correo, resItem.codigo);
      }
      resultadosHtml += '</tbody></table>';
      Swal.fire({ title: '¡Sorteo Realizado!', html: resultadosHtml, icon: 'success', confirmButtonText: '¡Entendido!' });
    } else {
      Swal.fire({ icon: "success", title: "¡Sorteo Realizado!", text: data.message || "Proceso finalizado." });
    }
  } catch (error) {
    Swal.fire({ icon: "error", title: "Error en el sorteo", text: error.message || "No se pudo completar el sorteo." });
  }
}

// ==========================
// BORRAR LISTA
// ==========================
async function borrarListaParticipantes() {
  if (!sesionID) { Swal.fire("Error", "No sesión activa.", "error"); return; }
  const confirmacion = await Swal.fire({
    title: '¿Borrar lista?',
    text: "Se borrarán todos los participantes.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Sí, borrar lista!',
    cancelButtonText: 'Cancelar'
  });
  if (!confirmacion.isConfirmed) return;

  try {
    const participantesRef = db.collection("sesiones").doc(sesionID).collection("participantes");
    const snapshot = await participantesRef.get();
    if (snapshot.empty) { Swal.fire("Información", "La lista ya está vacía.", "info"); return; }
    const batch = db.batch(); snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    Swal.fire("¡Lista Borrada!", "Todos los participantes han sido eliminados.", "success");
  } catch (error) { Swal.fire("Error", `No se pudo borrar la lista: ${error.message}`, "error"); }
}

// ==========================
// ELIMINAR SESIÓN
// ==========================
async function handleDeleteSession() {
  if (!sesionID) { Swal.fire({ icon: "error", title: "Error", text: "No hay sesión activa." }); return; }
  const confirm1 = await Swal.fire({ icon: "warning", title: "Eliminar sesión?", text: `Esto eliminará la sesión "${sesionID}" y todos sus participantes.`, showCancelButton: true, confirmButtonText: "Sí, eliminar", cancelButtonText: "Cancelar" });
  if (!confirm1.isConfirmed) return;
  const confirm2 = await Swal.fire({ icon: "warning", title: "Confirmar eliminación total", html: "¿Absolutamente seguro?", showCancelButton: true, confirmButtonColor: "#d33", confirmButtonText: "Sí, eliminar todo", cancelButtonText: "Cancelar" });
  if (!confirm2.isConfirmed) return;

  try {
    const participantesRef = db.collection("sesiones").doc(sesionID).collection("participantes");
    const snapshot = await participantesRef.get();
    const batch = db.batch(); snapshot.forEach(doc => batch.delete(doc.ref)); await batch.commit();
    await db.collection("sesiones").doc(sesionID).delete();
    localStorage.removeItem(`${STORAGE_PREFIX}tipoUsuario`);
    localStorage.removeItem(`${STORAGE_PREFIX}sesionID`);
    Swal.fire({ icon: "success", title: "Sesión eliminada", timer: 2000, showConfirmButton: false });
  } catch (error) { Swal.fire({ icon: "error", title: "Error al eliminar", text: error.message }); }
}

// ==========================
// INICIALIZACIÓN PÁGINAS
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  if (window.location.pathname.endsWith("pagina-principal.html")) {
    iniciarPaginaPrincipal();
  }
});
