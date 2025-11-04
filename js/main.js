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
let sesionID = localStorage.getItem(`${STORAGE_PREFIX}sesionID`) || "";

// ==========================
// FUNCIÓN: AGREGAR PARTICIPANTE
// ==========================
async function agregarParticipanteDesdeFormulario() {
  // Obtener los elementos del formulario
  const nombreInput = document.getElementById("nombreParticipante");
  const telefonoInput = document.getElementById("telefonoParticipante");
  const correoInput = document.getElementById("correoParticipante");

  // Obtener y limpiar los valores
  const nombre = nombreInput.value.trim();
  const telefono = telefonoInput.value.trim();
  const correo = correoInput.value.trim();

  // Validaciones
  if (!nombre) {
    Swal.fire("Campo requerido", "El nombre del participante es obligatorio.", "warning");
    return;
  }
  if (correo && !/^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/.test(correo)) {
    Swal.fire("Correo inválido", "El formato del correo electrónico no es válido.", "error");
    return;
  }

  const participanteData = { nombre, telefono, correo };

  try {
    await db.collection("sesiones").doc(sesionID).collection("participantes").add(participanteData);

    Swal.fire({
      icon: "success",
      title: "Participante agregado",
      timer: 1500,
      showConfirmButton: false,
    });

    // Limpiar los campos del formulario
    nombreInput.value = "";
    telefonoInput.value = "";
    correoInput.value = "";

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
  // Confirmación antes de realizar una acción importante
  const confirmacion = await Swal.fire({
    title: '¿Estás seguro?',
    text: "Se realizará el sorteo y se enviarán los correos a todos los participantes. Esta acción no se puede deshacer.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#28a745',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Sí, ¡realizar sorteo!',
    cancelButtonText: 'Cancelar'
  });

  if (!confirmacion.isConfirmed) {
    return;
  }

  // Mostrar un indicador de carga
  Swal.fire({
    title: 'Realizando sorteo...',
    text: 'Por favor, espera mientras se asignan los amigos secretos y se envían los correos.',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  try {
    const res = await fetch('/.netlify/functions/generar-sorteo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sesionId: sesionID })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error desconocido en el servidor.');

    Swal.fire({
      icon: "success",
      title: "¡Sorteo Realizado!",
      text: data.message || "Los correos han sido enviados a todos los participantes.",
    });

  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Error en el sorteo",
      text: error.message || "No se pudo completar el sorteo.",
    });
  }
}

// ==========================
// FUNCIÓN: ELIMINAR SESIÓN
// ==========================
async function handleDeleteSession() {
  if (!sesionID) {
    Swal.fire({ icon: "error", title: "Error", text: "No hay sesión activa." });
    return;
  }

  const confirm1 = await Swal.fire({
    icon: "warning",
    title: "¿Eliminar sesión?",
    text: `Esto eliminará la sesión "${sesionID}" y todos sus participantes.`,
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
    const participantesRef = db.collection("sesiones").doc(sesionID).collection("participantes");
    const snapshot = await participantesRef.get();

    const batch = db.batch();
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    await db.collection("sesiones").doc(sesionID).delete();

    localStorage.removeItem(`${STORAGE_PREFIX}tipoUsuario`);
    localStorage.removeItem(`${STORAGE_PREFIX}sesionID`);

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

// ==========================
// EVENTO: BOTÓN REGISTRAR SESIÓN
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  const btnRegistrar = document.getElementById("btnRegistrar");
  if (btnRegistrar) {
    btnRegistrar.addEventListener("click", async (e) => {
      e.preventDefault();

      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value.trim();
      const confirmPassword = document.getElementById("confirmPassword").value.trim();

      if (!username || !password || !confirmPassword) {
        Swal.fire("Campos incompletos", "Por favor llena todos los campos.", "warning");
        return;
      }

      if (password !== confirmPassword) {
        Swal.fire("Error", "Las contraseñas no coinciden.", "error");
        return;
      }

      try {
        const res = await fetch("/.netlify/functions/crear-sesion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Error al crear la sesión.");

        // Limpiar los campos del formulario inmediatamente después de una respuesta exitosa.
        document.getElementById("username").value = "";
        document.getElementById("password").value = "";
        document.getElementById("confirmPassword").value = "";

        Swal.fire({
          icon: "success",
          title: "Sesión creada correctamente",
          text: `La sesión "${data.username}" ha sido creada. \n Viajando a la página de Inicio de Sesión para que puedas ingresar.`,
          timer: 3000, // 3 segundos
          showConfirmButton: false,
          timerProgressBar: true,
        }).then(() => {
          // Este bloque se ejecuta después de que el temporizador de Swal termina.
          window.location.href = "index.html";
        });

      } catch (error) {
        // Es buena práctica registrar el error en la consola para depuración.
        console.error("Error:", error);
        Swal.fire({
          icon: "error",
          title: "Error al crear la sesión",
          text: error.message,
        });
      }
    });
  }
});

// ==========================
// EVENTO: BOTÓN INGRESAR SESIÓN
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  const btnIngresar = document.getElementById("btnIngresar");
  if (btnIngresar) {
    btnIngresar.addEventListener("click", async (e) => {
      e.preventDefault();

      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value.trim();

      if (!username || !password) {
        Swal.fire("Campos incompletos", "Por favor ingresa usuario y contraseña.", "warning");
        return;
      }

      try {
        const res = await fetch("/.netlify/functions/ingresar-sesion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Error al ingresar.");

        // Guardar sesión local
        localStorage.setItem("amigoSecreto_tipoUsuario", "participante");
        localStorage.setItem("amigoSecreto_sesionID", username);

        Swal.fire({
          icon: "success",
          title: `Sesión iniciada \n "${data.username}" `,
          text: "Bienvenido a tu grupo de Amigo Secreto 🎁. \n Viajando a la página principal para que puedas hacer tu lista.",
          timer: 2500,
          timerProgressBar: true,
          showConfirmButton: false,
        }).then(() => {
          // Redirigir a la página principal del grupo
          window.location.href = "pagina-principal.html";
        });

      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Error de acceso",
          text: error.message || "No se pudo ingresar a la sesión.",
        });
      }
    });
  }
});

// ==========================
// LÓGICA PARA PAGINA-PRINCIPAL.HTML
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  // Solo ejecutar si estamos en pagina-principal.html
  if (window.location.pathname.endsWith("pagina-principal.html")) {
    
    // 1. Funcionalidad del Menú Hamburguesa
    const btnMenu = document.getElementById("btn-menu-hamburguesa");
    const menuDesplegable = document.getElementById("menu-desplegable");

    if (btnMenu && menuDesplegable) {
      btnMenu.addEventListener("click", () => {
        btnMenu.classList.toggle("active");
        menuDesplegable.classList.toggle("active");
      });
    }

    // 2. Mostrar nombre de la sesión activa
    const spanNombreSesion = document.getElementById("nombreSesionActiva");
    if (spanNombreSesion) {
      const sesionGuardada = localStorage.getItem("amigoSecreto_sesionID");
      spanNombreSesion.textContent = sesionGuardada || "No identificada";
    }

    // Asignar eventos a los botones del menú desplegable
    const btnGenerarMenu = document.getElementById("btnGenerarEmparejamientoMenu");
    const btnEliminarSesionMenu = document.getElementById("btnEliminarSesionMenu");

    if (btnGenerarMenu) {
      // La función generarSorteo ya existe.
      btnGenerarMenu.addEventListener("click", generarSorteo);
    }

    if (btnEliminarSesionMenu) {
      // La función handleDeleteSession ya existe.
      btnEliminarSesionMenu.addEventListener("click", handleDeleteSession);
    }

    // 3. Funcionalidad del formulario para añadir participantes
    const formAnadirParticipante = document.getElementById("formAnadirParticipante");
    if (formAnadirParticipante) {
      formAnadirParticipante.addEventListener("submit", (e) => {
        e.preventDefault(); // Evitar que la página se recargue
        // La función agregarParticipante() ya existe y usa SweetAlert para pedir los datos.
        // Ahora llamamos a la nueva función que usa el formulario.
        agregarParticipanteDesdeFormulario();
      });
    }

    // 4. Escuchar y renderizar la lista de participantes en tiempo real
    const contenedorParticipantes = document.getElementById("contenedorParticipantes");
    if (sesionID && contenedorParticipantes) {
      db.collection("sesiones").doc(sesionID).collection("participantes")
        .onSnapshot((snapshot) => {
          if (snapshot.empty) {
            contenedorParticipantes.innerHTML = `<p class="no-participantes">Aún no hay participantes en esta sesión. ¡Añade el primero!</p>`;
            // Ocultar botones de admin si no hay participantes
            document.querySelectorAll('.oculto-admin').forEach(btn => btn.style.display = 'none');
            return;
          }

          // =================================================================
          // LÓGICA PARA MOSTRAR/OCULTAR BOTONES DE ADMINISTRADOR
          // =================================================================
          const botonesAdmin = document.querySelectorAll('.oculto-admin');
          if (snapshot.size >= 2) {
            // Si hay 2 o más participantes, muestra los botones de admin
            botonesAdmin.forEach(btn => btn.style.display = 'block');
          } else {
            // Si hay menos de 2, los oculta
            botonesAdmin.forEach(btn => btn.style.display = 'none');
          }

          let cardsHTML = "";
          snapshot.forEach(doc => {
            const participante = doc.data();
            cardsHTML += `
              <div class="participante-card">
                <div class="card-header">
                  <strong class="card-nombre">${participante.nombre}</strong>
                  <button class="btn-borrar-participante" data-id="${doc.id}" title="Eliminar participante">
                    &times;
                  </button>
                </div>
                <div class="card-body">
                  ${participante.correo ? `<p class="card-info"><strong>Correo:</strong> ${participante.correo}</p>` : ''}
                  ${participante.telefono ? `<p class="card-info"><strong>Tel:</strong> ${participante.telefono}</p>` : ''}
                </div>
              </div>
            `;
          });
          contenedorParticipantes.innerHTML = cardsHTML;

          // Añadir event listeners a los nuevos botones de borrar
          document.querySelectorAll('.btn-borrar-participante').forEach(button => {
            button.addEventListener('click', async (e) => {
              const participanteId = e.target.dataset.id;
              try {
                await db.collection("sesiones").doc(sesionID).collection("participantes").doc(participanteId).delete();
                Swal.fire('Eliminado', 'El participante ha sido eliminado.', 'success');
              } catch (error) {
                Swal.fire('Error', 'No se pudo eliminar al participante.', 'error');
              }
            });
          });

        }, (error) => {
          console.error("Error al obtener participantes: ", error);
          contenedorParticipantes.innerHTML = `<p class="no-participantes" style="color: red;">Error al cargar la lista de participantes.</p>`;
        });
    }
  }
});
