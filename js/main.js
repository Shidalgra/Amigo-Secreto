// ==========================
// CONFIGURACIÓN FIREBASE
// ==========================
// La configuración de cursos fijos ya no es necesaria. Las sesiones se crearán dinámicamente.



// ==========================
// CONFIGURACIÓN DE FIREBASE
// ==========================
const firebaseConfig = {
    apiKey: "AIzaSyB77bg-KvNbYcr5YndutHMaHRw0vcrCuZE",
    authDomain: "amigo-secreto-app-a95be.firebaseapp.com",
    projectId: "amigo-secreto-app-a95be",
    storageBucket: "amigo-secreto-app-a95be.firebasestorage.app",
    messagingSenderId: "50039635107",
    appId: "1:50039635107:web:a9580ade5d86973e541316"
};

// Evitar inicialización duplicada
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// ==========================
// VARIABLES Y CONSTANTES
// ==========================
const STORAGE_PREFIX = "amigoSecreto_";
let tipoUsuario = localStorage.getItem(`${STORAGE_PREFIX}tipoUsuario`) || "participante";
let cursoID = localStorage.getItem(`${STORAGE_PREFIX}cursoID`) || "";

// ==========================
// FUNCIÓN: CREAR SESIÓN
// ==========================
async function crearSesion() {
  const { value: formValues } = await Swal.fire({
    title: "Crear nueva sesión",
    html: `
      <input id="username" class="swal2-input" placeholder="Nombre de la sesión">
      <input id="password" type="password" class="swal2-input" placeholder="Contraseña">
    `,
    confirmButtonText: "Crear",
    focusConfirm: false,
    preConfirm: () => {
      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value.trim();
      if (!username || !password) {
        Swal.showValidationMessage("Por favor, complete ambos campos");
        return false;
      }
      return { username, password };
    },
  });

  if (!formValues) return;

  try {
    const res = await fetch("/.netlify/functions/crear-sesion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formValues),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Error al crear la sesión");

    Swal.fire({
      icon: "success",
      title: "Sesión creada",
      text: data.message,
      timer: 2500,
      showConfirmButton: false,
    });

  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: error.message || "Error desconocido",
    });
  }
}

// ==========================
// FUNCIÓN: AGREGAR PARTICIPANTE
// ==========================
async function agregarParticipante() {
  const { value: formValues } = await Swal.fire({
    title: "Agregar participante",
    html: `
      <input id="nombre" class="swal2-input" placeholder="Nombre completo">
      <input id="correo" class="swal2-input" placeholder="Correo electrónico">
    `,
    confirmButtonText: "Guardar",
    focusConfirm: false,
    preConfirm: () => {
      const nombre = document.getElementById("nombre").value.trim();
      const correo = document.getElementById("correo").value.trim();

      if (!nombre || !correo) {
        Swal.showValidationMessage("Todos los campos son obligatorios");
        return false;
      }

      if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/.test(correo)) {
        Swal.showValidationMessage("Correo inválido");
        return false;
      }

      return { nombre, correo };
    },
  });

  if (!formValues) return;

  try {
    await db.collection("sesiones").doc(cursoID).collection("participantes").add(formValues);

    Swal.fire({
      icon: "success",
      title: "Participante agregado",
      timer: 1800,
      showConfirmButton: false,
    });
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Error al guardar",
      text: error.message,
    });
  }
}

// ==========================
// FUNCIÓN: GENERAR SORTEO
// ==========================
async function generarSorteo() {
  try {
    const participantesRef = db.collection("sesiones").doc(cursoID).collection("participantes");
    const snapshot = await participantesRef.get();
    const participantes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (participantes.length < 2) {
      Swal.fire({
        icon: "error",
        title: "No hay suficientes participantes",
        text: "Se necesitan al menos 2 participantes para sortear.",
      });
      return;
    }

    // Validar correos antes de sortear
    for (const p of participantes) {
      if (!p.correo || !/^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/.test(p.correo)) {
        Swal.fire({
          icon: "error",
          title: "Correo inválido",
          text: `El correo de ${p.nombre} no tiene un formato válido.`,
        });
        return;
      }
    }

    // Mezclar y asignar
    const asignaciones = [...participantes];
    asignaciones.sort(() => Math.random() - 0.5);

    const resultados = participantes.map((p, i) => ({
      de: p.nombre,
      para: asignaciones[(i + 1) % participantes.length].nombre,
      correo: p.correo,
    }));

    // Guardar en Firestore
    for (const r of resultados) {
      await participantesRef.doc(r.de).update({ amigoSecreto: r.para });
    }

    Swal.fire({
      icon: "success",
      title: "Sorteo generado",
      text: "Los resultados se enviarán automáticamente a los correos.",
      timer: 2500,
      showConfirmButton: false,
    });

  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Error en el sorteo",
      text: error.message,
    });
  }
}

// ==========================
// FUNCIÓN: ELIMINAR SESIÓN
// ==========================
async function handleDeleteSession() {
  if (!cursoID) {
    Swal.fire({ icon: "error", title: "Error", text: "No hay sesión activa." });
    return;
  }

  const confirm1 = await Swal.fire({
    icon: "warning",
    title: "¿Eliminar sesión?",
    text: `Esto eliminará la sesión "${cursoID}" y todos sus participantes.`,
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
  });

  if (!confirm1.isConfirmed) return;

  const confirm2 = await Swal.fire({
    icon: "warning",
    title: "Confirmar eliminación total",
    html: "¿Estás absolutamente seguro?<br>Esta acción no se puede deshacer.",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    confirmButtonText: "Sí, eliminar todo",
    cancelButtonText: "Cancelar",
  });

  if (!confirm2.isConfirmed) return;

  try {
    const participantesRef = db.collection("sesiones").doc(cursoID).collection("participantes");
    const snapshot = await participantesRef.get();

    const batch = db.batch();
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    await db.collection("sesiones").doc(cursoID).delete();

    localStorage.removeItem(`${STORAGE_PREFIX}tipoUsuario`);
    localStorage.removeItem(`${STORAGE_PREFIX}cursoID`);

    Swal.fire({
      icon: "success",
      title: "Sesión eliminada",
      timer: 2000,
      showConfirmButton: false,
    });
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Error al eliminar",
      text: error.message,
    });
  }
}
