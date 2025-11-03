// ==========================
// CONFIGURACIÓN FIREBASE
// ==========================
// La configuración de cursos fijos ya no es necesaria. Las sesiones se crearán dinámicamente.

const firebaseConfig = {
    apiKey: "AIzaSyB77bg-KvNbYcr5YndutHMaHRw0vcrCuZE",
    authDomain: "amigo-secreto-app-a95be.firebaseapp.com",
    projectId: "amigo-secreto-app-a95be",
    storageBucket: "amigo-secreto-app-a95be.firebasestorage.app",
    messagingSenderId: "50039635107",
    appId: "1:50039635107:web:a9580ade5d86973e541316"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ==========================
// VARIABLES GLOBALES
// ==========================
let mensajesCache = [];
let tipoUsuario = localStorage.getItem("tipoUsuario") || "participante"; // Cambiamos "invitado" a "participante"
// Ojo: Esta variable es clave para aislar los datos por curso.
let cursoID = localStorage.getItem("cursoID") || "";

// Orden explícito del alfabeto griego para la ordenación
const NOMBRES_GRIEGOS_ORDEN = [
    "Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta",
    "Iota", "Kappa", "Lambda", "Mu", "Nu", "Xi", "Omicron", "Pi"
];

/**
 * Calcula la distancia de Levenshtein entre dos cadenas.
 * Mide el número de ediciones (inserciones, eliminaciones o sustituciones) 
 * necesarias para cambiar una cadena por la otra.
 * @param {string} s1 La primera cadena.
 * @param {string} s2 La segunda cadena.
 * @returns {number} La distancia de edición entre las dos cadenas.
 */
function levenshteinDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
            if (i === 0) costs[j] = j;
            else if (j > 0) {
                let newValue = costs[j - 1];
                if (s1.charAt(i - 1) !== s2.charAt(j - 1)) newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                costs[j - 1] = lastValue;
                lastValue = newValue;
            }
        }
        if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}

/**
 * =================================================
 * NUEVAS FUNCIONES PARA GESTIONAR LISTA DE PARTICIPANTES
 * =================================================
 */

/**
 * Añade un nuevo participante a la colección _usuariosConectados de la sesión actual.
 * La cédula se autogenera para mantener la estructura, pero no es visible al usuario.
 */
async function handleAnadirParticipante(event) {
    event.preventDefault();
    const nombreInput = document.getElementById('nombreParticipante');
    const telefonoInput = document.getElementById('telefonoParticipante');
    const correoInput = document.getElementById('correoParticipante');

    const nombre = nombreInput.value.trim();
    const telefono = telefonoInput.value.trim();
    const correo = correoInput.value.trim();

    if (!nombre) {
        Swal.fire({ icon: 'warning', title: 'Nombre requerido', text: 'El nombre del participante no puede estar vacío.', confirmButtonColor: '#004080' });
        return;
    }

    if (!telefono && !correo) {
        Swal.fire({ icon: 'warning', title: 'Falta información de contacto', text: 'Debes proporcionar al menos un teléfono o un correo electrónico.', confirmButtonColor: '#004080' });
        return;
    }

    try {
        // VERIFICACIÓN DE DUPLICADOS (Case-insensitive)
        const snapshot = await db.collection('sesiones').doc(cursoID).collection('participantes').get();
        for (const doc of snapshot.docs) {
            const nombreExistente = doc.data().nombre;
            const distancia = levenshteinDistance(nombre, nombreExistente);

            if (distancia === 0) { // Coincidencia exacta
                Swal.fire({ icon: 'error', title: 'Participante Duplicado', text: `El nombre "${nombre}" ya existe en la lista.`, confirmButtonColor: '#d33' });
                return;
            }

            if (distancia > 0 && distancia <= 2) { // Coincidencia muy similar (posible error de dedo)
                const confirmacion = await Swal.fire({
                    icon: 'warning',
                    title: '¿Posible Duplicado?',
                    html: `El nombre que ingresaste, "<b>${nombre}</b>", es muy parecido a "<b>${nombreExistente}</b>" que ya está en la lista.<br><br>¿Estás seguro de que quieres añadirlo como un participante nuevo?`,
                    showCancelButton: true,
                    confirmButtonText: 'Sí, añadir de todos modos',
                    cancelButtonText: 'No, fue un error'
                });
                if (!confirmacion.isConfirmed) return;
            }
        }

        await db.collection('sesiones').doc(cursoID).collection('participantes').add({
            nombre: nombre,
            telefono: telefono || "", // Guarda vacío si no se provee
            correo: correo || "",   // Guarda vacío si no se provee
            tipoUsuario: "participante", // Todos los añadidos son participantes
            fechaAgregado: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Limpiar los campos del formulario
        nombreInput.value = "";
        telefonoInput.value = "";
        correoInput.value = "";
        nombreInput.focus(); // Poner el foco de nuevo en el nombre para añadir el siguiente.

    } catch (error) {
        console.error("Error al añadir participante:", error);
        Swal.fire({ icon: 'error', title: 'Error de Red', text: 'No se pudo añadir el participante. Inténtalo de nuevo.', confirmButtonColor: '#d33' });
    }
}

/**
 * Escucha los cambios en la lista de participantes y los renderiza en la página.
 */
function escucharParticipantes() {
    if (!cursoID) return;

    db.collection('sesiones').doc(cursoID).collection('participantes')
        .orderBy("fechaAgregado", "desc")
        .onSnapshot(snapshot => {
            const cuerpoTabla = document.getElementById('cuerpoTablaParticipantes');
            if (!cuerpoTabla) return;

            cuerpoTabla.innerHTML = ""; // Limpiar la tabla antes de volver a renderizar

            if (snapshot.empty) {
                cuerpoTabla.innerHTML = '<tr><td colspan="4">Aún no hay participantes en la lista.</td></tr>';
                return;
            }

            snapshot.forEach(doc => {
                const participante = doc.data();
                const id = doc.id;

                const tr = document.createElement('tr');

                tr.innerHTML = `
                    <td>${participante.nombre}</td>
                    <td>${participante.telefono || 'N/A'}</td>
                    <td>${participante.correo || 'N/A'}</td>
                    <td>
                        <button class="btn-borrar-participante" data-id="${id}" title="Eliminar a ${participante.nombre}">🗑️</button>
                    </td>
                `;

                tr.querySelector('.btn-borrar-participante').addEventListener('click', async () => {
                    const confirm = await Swal.fire({
                        title: `¿Eliminar a ${participante.nombre}?`,
                        text: "Esta acción no se puede deshacer.",
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#d33',
                        cancelButtonText: 'Cancelar',
                        confirmButtonText: 'Sí, eliminar'
                    });

                    if (confirm.isConfirmed) {
                        await db.collection('sesiones').doc(cursoID).collection('participantes').doc(id).delete();
                    }
                });

                cuerpoTabla.appendChild(tr);
            });
        });
}

// ==========================
// FUNCIONES DE USUARIOS Y BORRADO TOTAL DEL CURSO ACTUAL
// ==========================

/**
 * Función que elimina TODAS las colecciones asociadas ÚNICAMENTE al cursoID actual.
 */
async function borrarTodaLaBaseDeDatos() {
    // 1. Verificación de seguridad
    if (tipoUsuario !== "admin" || !cursoID) {
        Swal.fire({ icon: "error", title: "Acceso Denegado", text: "Solo administradores pueden hacer esto.", confirmButtonColor: "#d33" });
        return;
    }

    // 2. Confirmación
    const { value: confirmacion } = await Swal.fire({
        icon: 'warning',
        title: `¡PELIGRO! Borrar TODA la DB de **${cursoID}**`,
        html: `Esta acción eliminará **TODOS los datos** (lista de participantes, sorteo) para la sesión **${cursoID}** y es **irreversible**. La sesión y su contraseña se mantendrán. <br><br> Escribe la palabra **"BORRAR TODO"** para confirmar:`,
        input: 'text',
        showCancelButton: true,
        confirmButtonText: 'Confirmar Borrado Total',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#d33',
        inputValidator: (value) => {
            if (value !== 'BORRAR TODO') {
                return 'Debes escribir "BORRAR TODO" exactamente para proceder.';
            }
        }
    });

    if (confirmacion) {
        try {
            // Borra las sub-colecciones de datos, pero DEJA la sesión principal.
            const colecciones = ['participantes', 'sorteo'];

            for (const nombreColeccion of colecciones) {
                const snapshot = await db.collection('sesiones').doc(cursoID).collection(nombreColeccion).get();
                if (!snapshot.empty) {
                    const batch = db.batch();
                    snapshot.forEach(doc => batch.delete(doc.ref));
                    await batch.commit();
                    console.log(`Sub-colección ${nombreColeccion} eliminada.`);
                }
            }

            Swal.fire({
                icon: 'success',
                title: 'Borrado Exitoso',
                text: `Todos los datos (lista, sorteo) de la sesión ${cursoID} han sido eliminados. La página se recargará.`,
                confirmButtonColor: '#004080'
            }).then(() => window.location.reload());

        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error al borrar',
                text: 'Ocurrió un error al intentar borrar la base de datos.',
                confirmButtonColor: '#d33'
            });
            console.error("Error al borrar la DB:", error);
        }
    }
}

function registrarUsuario(nombre, cedula) { // Esta función ya no se usa activamente en el flujo principal, pero se mantiene por si se reutiliza.
    const cursoActual = cursoID;
    const tipoUsuarioActual = tipoUsuario;

    if (!nombre || !cedula || !cursoActual || !tipoUsuarioActual) {
        console.error("No se pudo registrar: Faltan datos críticos.", { nombre, cedula, cursoActual, tipoUsuarioActual });
        return;
    }

    const usuarioRef = db.collection(`${cursoActual}_usuariosConectados`).doc(cedula);

    usuarioRef.set({
        nombre,
        cedula,
        tipoUsuario: tipoUsuarioActual,
        cursoID: cursoActual,
        conectado: true,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true })
        .then(() => {
            console.log(`✅ Usuario ${nombre} (Cédula: ${cedula}) registrado/actualizado en curso: ${cursoActual}`);
        })
        .catch(error => {
            console.error("Error al registrar el usuario en Firebase:", error);
        });

    window.addEventListener("beforeunload", () => {
        usuarioRef.update({ conectado: false });
    });
}

// ==========================
// NUEVO SISTEMA DE LOGIN Y REGISTRO (BASADO EN SESIONES)
// ==========================

async function handleLogin() {
    const username = document.getElementById('username')?.value.trim();
    const password = document.getElementById('password')?.value;

    if (!username || !password) {
        Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Por favor, ingresa el nombre de usuario y la contraseña.', confirmButtonColor: '#004080' });
        return;
    }

    try {
        const sesionRef = db.collection('sesiones').doc(username);
        const doc = await sesionRef.get();

        if (!doc.exists) {
            Swal.fire({
                icon: 'error',
                title: 'Sesión no encontrada',
                html: `La sesión "<b>${username}</b>" no existe. <br><br> <a href="register.html">Crea una nueva sesión aquí</a>.`,
                confirmButtonColor: '#d33'
            });
            return;
        }

        const data = doc.data();
        if (data.password !== password) {
            Swal.fire({ icon: 'error', title: 'Contraseña incorrecta', text: 'La contraseña para esta sesión no es correcta.', confirmButtonColor: '#d33' });
            return;
        }

        // ¡Éxito! El usuario es el creador de la sesión, por lo tanto es "admin".
        localStorage.setItem("tipoUsuario", "admin");
        localStorage.setItem("cursoID", username); // El "curso" ahora es el nombre de usuario.
        // Para la página principal, necesitamos un nombre. Usaremos el username.
        localStorage.setItem("nombreEstudiante", username);
        // La cédula ya no es relevante, pero la guardamos para consistencia si alguna función la usa.
        localStorage.setItem("cedulaEstudiante", username);

        Swal.fire({
            icon: 'success',
            title: `¡Bienvenido, ${username}!`,
            text: `Ingresando a tu sesión de Amigo Secreto...`,
            confirmButtonColor: '#004080'
        }).then(() => window.location.href = "pagina-principal.html");

    } catch (error) {
        console.error("Error durante el login:", error);
        Swal.fire({ icon: 'error', title: 'Error de Red', text: 'No se pudo verificar la sesión. Inténtalo de nuevo.', confirmButtonColor: '#d33' });
    }
}

async function handleRegister() {
  const username = document.getElementById('username')?.value.trim();
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const password = passwordInput?.value;
  const confirmPassword = confirmPasswordInput?.value;

  // --- Validaciones en el cliente (rápidas) ---
  if (!username || !password || !confirmPassword) {
    Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Debes elegir un nombre de usuario y una contraseña.', confirmButtonColor: '#004080' });
    return;
  }
  if (password !== confirmPassword) {
    Swal.fire({ icon: 'error', title: 'Las contraseñas no coinciden', text: 'Por favor, verifica que ambas contraseñas sean iguales.', confirmButtonColor: '#d33' });
    return;
  }
  if (username.includes(" ") || username.length < 4) {
    Swal.fire({ icon: 'warning', title: 'Nombre de usuario inválido', text: 'Debe tener al menos 4 caracteres y no contener espacios.', confirmButtonColor: '#004080' });
    return;
  }
  if (password.length < 6) {
    Swal.fire({ icon: 'warning', title: 'Contraseña muy corta', text: 'La contraseña debe tener al menos 6 caracteres.', confirmButtonColor: '#004080' });
    return;
  }

  Swal.fire({
    title: 'Creando sesión...',
    text: 'Por favor, espera.',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  try {
    // --- Llamada a la nueva Netlify Function ---
    const response = await fetch('/.netlify/functions/crear-sesion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const result = await response.json();

    if (!response.ok) {
      // Si la respuesta no es exitosa, lanzamos un error con el mensaje del servidor
      const error = new Error(result.error || 'Error desconocido del servidor.');
      error.statusCode = response.status;
      throw error;
    }

    // --- Éxito ---
    Swal.close();
    Swal.fire({
      icon: 'success',
      title: '¡Sesión Creada!',
      text: `Tu sesión "${username}" ha sido creada con éxito. Ahora puedes iniciar sesión.`,
      confirmButtonColor: '#004080'
    }).then(() => {
      window.location.href = "index.html"; // Redirigir a la página de login
    });

  } catch (error) {
    // --- Manejo de Errores ---
    Swal.close();
    console.error("Error durante el registro:", error);

    if (error.statusCode === 409) { // Conflicto: El usuario ya existe
      Swal.fire({
        icon: 'info',
        title: 'Nombre de usuario no disponible',
        html: `La sesión "<b>${username}</b>" ya existe. Por favor, elige otro nombre o <a href="index.html">inicia sesión</a>.`,
        confirmButtonColor: '#004080'
      });
    } else {
      // Otros errores (de red, validación del servidor, etc.)
      Swal.fire({
        icon: 'error',
        title: 'Error al Registrar',
        text: error.message || 'No se pudo crear la sesión. Inténtalo de nuevo.',
        confirmButtonColor: '#d33'
      });
    }
  }
}

async function handleConsultaAmigoSecreto() {
    const codigoInput = document.getElementById('codigoConsulta');
    const codigo = codigoInput.value.trim();

    if (!codigo) {
        Swal.fire({ icon: 'warning', title: 'Código Requerido', text: 'Por favor, ingresa tu código de consulta.', confirmButtonColor: '#004080' });
        return;
    }

    Swal.fire({
        title: 'Consultando...',
        text: 'Buscando tu amigo secreto.',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const response = await fetch('/.netlify/functions/revelar-secreto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codigoConsulta: codigo })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Error desconocido del servidor.');
        } else {
            const resultadoContainer = document.getElementById('resultado-container');
            const nombreAmigoSecretoEl = document.getElementById('nombreAmigoSecreto');
            nombreAmigoSecretoEl.textContent = result.amigoSecreto;
            resultadoContainer.style.display = 'block';
            Swal.close(); // Cierra el popup de "cargando"
        }
    } catch (error) {
        console.error("Error al consultar amigo secreto:", error);
        Swal.fire({ icon: 'error', title: 'Error de Red', text: 'No se pudo realizar la consulta. Inténtalo de nuevo.' });
    }
}

/**
 * Maneja la eliminación de la sesión actual.
 * Pide la contraseña para confirmar y borra el documento de la sesión en Firestore.
 */
async function handleDeleteSession() {
    if (tipoUsuario !== "admin" || !cursoID) {
        Swal.fire({ icon: "error", title: "Acción no permitida", text: "Solo el creador de la sesión puede eliminarla.", confirmButtonColor: "#d33" });
        return;
    }

    const { value: password } = await Swal.fire({
        title: `Eliminar la sesión "${cursoID}"`,
        html: `Esta acción es <b>permanente</b>. Se borrará la sesión, su contraseña y **TODOS los datos asociados** (lista de participantes, sorteo).<br><br>Para confirmar, ingresa la contraseña de la sesión:`,
        input: 'password',
        inputPlaceholder: 'Ingresa la contraseña de la sesión',
        inputAttributes: {
            autocapitalize: 'off',
            autocorrect: 'off'
        },
        showCancelButton: true,
        confirmButtonText: 'Eliminar Sesión',
        confirmButtonColor: '#d33',
        cancelButtonText: 'Cancelar'
    });

    if (password) {
        try {
            const sesionRef = db.collection('sesiones').doc(cursoID);
            const doc = await sesionRef.get();

            if (doc.exists && doc.data().password === password) {
                // La contraseña es correcta. Proceder con el BORRADO TOTAL.
                
                // Borrar las sub-colecciones de datos
                const coleccionesAsociadas = ['participantes', 'sorteo'];
                for (const nombreColeccion of coleccionesAsociadas) {
                    const snapshot = await db.collection('sesiones').doc(cursoID).collection(nombreColeccion).get();
                    if (!snapshot.empty) {
                        const batch = db.batch();
                        snapshot.forEach(doc => batch.delete(doc.ref));
                        await batch.commit();
                        console.log(`Sub-colección ${nombreColeccion} eliminada.`);
                    }
                }

                // 2. Borrar el documento principal de la sesión (el usuario y contraseña).
                await sesionRef.delete();
                console.log(`Documento de sesión ${cursoID} eliminado.`);

                Swal.fire({
                    icon: 'success',
                    title: 'Sesión Eliminada',
                    text: `La sesión "${cursoID}" ha sido eliminada. Serás redirigido.`
                }).then(() => {
                    // Salida inmediata sin preguntar.
                    localStorage.removeItem("nombreEstudiante");
                    localStorage.removeItem("tipoUsuario");
                    localStorage.removeItem("cedulaEstudiante");
                    localStorage.removeItem("cursoID");
                    window.location.href = "index.html";
                });
            } else {
                Swal.fire({ icon: 'error', title: 'Contraseña Incorrecta', text: 'La contraseña no coincide. La sesión no ha sido eliminada.' });
            }
        } catch (error) {
            console.error("Error al eliminar la sesión:", error);
            Swal.fire({ icon: 'error', title: 'Error de Red', text: 'No se pudo completar la eliminación.' });
        }
    }
}
// ===============================================
// GENERACIÓN Y MANEJO DE GRUPOS 
// (AHORA, EMPAREJAMIENTO DE AMIGO SECRETO)
// ===============================================

async function generarEmparejamientoAmigoSecreto() {
    if (tipoUsuario !== "admin" || !cursoID) {
        Swal.fire({ icon: "error", title: "Acceso denegado", text: "Solo el creador de la sesión puede generar el emparejamiento.", confirmButtonColor: "#004080" });
        return;
    }

    // 1. Obtener participantes
    const snapshotUsuarios = await db.collection('sesiones').doc(cursoID).collection('participantes').get();
    const participantes = snapshotUsuarios.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (participantes.length < 2) {
        Swal.fire({ icon: "error", title: "Participantes insuficientes", text: "Necesitas al menos 2 participantes para iniciar el sorteo." });
        return;
    }

    if (participantes.some(p => !p.correo)) {
        Swal.fire({ icon: "error", title: "Faltan correos", text: "Todos los participantes deben tener un correo electrónico para poder enviarles el resultado." });
        return;
    }

    // 2. Confirmación para iniciar el proceso
    const confirmacion = await Swal.fire({
        title: '¿Iniciar el sorteo?',
        html: `Se realizará el sorteo para <b>${participantes.length} participantes</b>. Se enviará un correo a cada uno con su código secreto.<br><br>Este proceso puede tardar unos segundos y es irreversible.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, ¡iniciar sorteo!',
        confirmButtonColor: '#28a745',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

    Swal.fire({
        title: 'Realizando sorteo...',
        html: 'Por favor, espera. Estamos barajando los nombres y enviando los correos.',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    // 3. Llamar a la Netlify Function
    try {
        const response = await fetch('/.netlify/functions/generar-sorteo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sesionId: cursoID })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Error desconocido en el servidor.');
        }

        Swal.fire({
            icon: 'success',
            icon: "success",
            title: "¡Sorteo Realizado!",
            text: "Se han enviado los correos a todos los participantes con su código secreto.",
            confirmButtonText: '¡Excelente!'
        });

    } catch (error) {
        console.error("Error al generar emparejamiento:", error);
        Swal.fire({ icon: "error", title: "Error en el Sorteo", text: `No se pudo completar el proceso. Error: ${error.message}`, confirmButtonColor: "#d33" });
    }
}

// Función que carga, ordena y muestra los grupos en el modal.
async function mostrarGrupos(gruposRecibidos = null) {
    let grupos = {};

    if (gruposRecibidos) {
        grupos = gruposRecibidos;
    } else {
        if (!cursoID) return;
        const snapshot = await db.collection(`${cursoID}_gruposAsignados`).get();
        if (snapshot.empty) {
            Swal.fire({ icon: "info", title: "Grupos aún no disponibles", text: `El administrador debe generar los grupos para el curso **${cursoID}** primero.`, confirmButtonColor: "#004080" });
            return;
        }

        try {
            const gruposArray = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Lógica de ordenación EXPLICITA (Griego + Numérico)
            gruposArray.sort((a, b) => {
                const nameA = a.nombreGrupo;
                const nameB = b.nombreGrupo;

                const indexA = NOMBRES_GRIEGOS_ORDEN.indexOf(nameA);
                const indexB = NOMBRES_GRIEGOS_ORDEN.indexOf(nameB);

                if (indexA !== -1 && indexB !== -1) {
                    return indexA - indexB;
                }
                if (indexA !== -1) {
                    return -1;
                }
                if (indexB !== -1) {
                    return 1;
                }

                const numA = parseInt(nameA.replace(/[^0-9]/g, ''));
                const numB = parseInt(nameB.replace(/[^0-9]/g, ''));

                if (!isNaN(numA) && !isNaN(numB) && nameA.startsWith('Grupo') && nameB.startsWith('Grupo')) {
                    return numA - numB;
                }

                return nameA.localeCompare(nameB);
            });

            gruposArray.forEach(data => {
                grupos[data.nombreGrupo] = { miembros: data.miembros, id: data.id };
            });

        } catch (error) {
            Swal.fire({ icon: "error", title: "Error de conexión", text: "No se pudieron cargar los grupos desde Firebase.", confirmButtonColor: "#d33" });
            console.error("Error al cargar grupos:", error);
            return;
        }
    }

    const listaModal = document.getElementById("listaGruposModal");
    listaModal.innerHTML = "";

    for (const [nombreGrupo, dataGrupo] of Object.entries(grupos)) {
        const { miembros, id: idGrupo } = dataGrupo;
        const div = document.createElement("div");
        div.classList.add("grupo-card");
        
        const miembrosHTML = miembros.map(m => {
            // Ya no se puede mover miembros en este nuevo modelo simplificado.
            const botonMover = '';
            const cedulaHTML = ''; // La cédula ya no es relevante

            return `<li>${m.nombre}${cedulaHTML} ${botonMover}</li>`;
        }).join("");

        div.innerHTML = `<h3>${nombreGrupo} (${miembros.length} personas)</h3><ul>${miembrosHTML}</ul>`;
        listaModal.appendChild(div);
    }

    document.getElementById("modalGrupos").style.display = "flex";
}

async function moverMiembro(evento, gruposActuales) {
    const { cedulaMiembro, nombreMiembro, idGrupoOrigen } = evento.target.dataset;

    // --- VALIDACIÓN CRÍTICA ---
    // Si solo hay un grupo (o menos), no se puede mover a nadie.
    if (Object.keys(gruposActuales).length <= 1) {
        const decision = await Swal.fire({
            icon: 'info',
            title: 'No hay a dónde mover',
            text: 'Solo existe un grupo. Debes generar más grupos para poder mover a los miembros.',
            showCancelButton: true,
            confirmButtonText: 'Generar nuevos grupos',
            cancelButtonText: 'Entendido',
            confirmButtonColor: '#004080'
        });

        if (decision.isConfirmed) {
            generarGruposAleatorios(); // Llama a la función para crear más grupos.
        }
        return; // Detiene la ejecución de la función de mover.
    }

    // Crear un mapa de opciones para el dropdown de Swal
    const opcionesGrupos = {};
    const nombreGrupoOrigen = Object.keys(gruposActuales).find(key => gruposActuales[key].id === idGrupoOrigen);

    Object.entries(gruposActuales).forEach(([nombre, data]) => {
        opcionesGrupos[data.id] = nombre;
    });

    // Deshabilitar el grupo de origen en las opciones
    const inputAttributes = { [idGrupoOrigen]: 'disabled' };

    const { value: idGrupoDestino } = await Swal.fire({
        title: `Mover a ${nombreMiembro}`,
        text: 'Selecciona el grupo de destino:',
        input: 'select',
        inputOptions: opcionesGrupos,
        inputPlaceholder: 'Seleccionar un grupo',
        inputAttributes,
        showCancelButton: true,
        confirmButtonText: 'Mover',
        cancelButtonText: 'Cancelar'
    });

    if (!idGrupoDestino) return;

    try {
        const dbBatch = db.batch();
        const refGrupoOrigen = db.collection(`${cursoID}_gruposAsignados`).doc(idGrupoOrigen);
        const refGrupoDestino = db.collection(`${cursoID}_gruposAsignados`).doc(idGrupoDestino);

        // 1. Quitar miembro del grupo origen
        const miembrosOrigen = gruposActuales[Object.keys(gruposActuales).find(k => gruposActuales[k].id === idGrupoOrigen)].miembros;
        const nuevosMiembrosOrigen = miembrosOrigen.filter(m => m.cedula !== cedulaMiembro);
        dbBatch.update(refGrupoOrigen, { miembros: nuevosMiembrosOrigen });

        // 2. Añadir miembro al grupo destino
        const miembroAMover = miembrosOrigen.find(m => m.cedula === cedulaMiembro);
        dbBatch.update(refGrupoDestino, {
            miembros: firebase.firestore.FieldValue.arrayUnion(miembroAMover)
        });

        await dbBatch.commit();

        Swal.fire({
            icon: 'success',
            title: '¡Movido!',
            text: `${nombreMiembro} ha sido movido de grupo.`,
            timer: 2000,
            showConfirmButton: false
        });

        mostrarGrupos(); // Recargar la vista de grupos
    } catch (error) {
        console.error("Error al mover miembro:", error);
        Swal.fire('Error', 'No se pudo mover al miembro.', 'error');
    }
}


// ==========================
// MODAL DE GRUPOS Y LISTENERS
// ==========================
function inicializarListenersUI() {
    const modalGrupos = document.getElementById("modalGrupos");
    const btnMenu = document.getElementById("btn-menu-hamburguesa");
    const menuDesplegable = document.getElementById("menu-desplegable");

    // --- Lógica del Menú Hamburguesa ---
    btnMenu?.addEventListener("click", () => {
        btnMenu.classList.toggle("active");
        menuDesplegable.classList.toggle("active");
    });

    // Cerrar menú si se hace clic fuera
    window.addEventListener("click", e => {
        if (!btnMenu?.contains(e.target) && !menuDesplegable?.contains(e.target)) {
            btnMenu?.classList.remove("active");
            menuDesplegable?.classList.remove("active");
        }
        // Cerrar modal de grupos si se hace clic fuera
        if (e.target === modalGrupos) modalGrupos.style.display = "none";
    });

    // --- Lógica del Modal de Grupos ---
    document.getElementById("btnVerGruposMenu")?.addEventListener("click", () => mostrarGrupos(null));
    document.querySelector(".close-modal")?.addEventListener("click", () => modalGrupos.style.display = "none");

}
// ==========================
// FUNCIONES AUXILIARES
// ==========================
function activarBotonSalir(forceExit = false) {
    const performExit = () => {
        Swal.fire({
            icon: "question",
            title: forceExit ? "Sesión Cerrada" : "¿Deseas salir?",
            text: `Se cerrará la sesión del curso **${cursoID}**.`,
            showCancelButton: true,
            confirmButtonText: "Sí, salir",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#d33"
        }).then((result) => {
            if (result.isConfirmed) {
                // Eliminar todos los datos de sesión, incluido el curso
                localStorage.removeItem("nombreEstudiante");
                localStorage.removeItem("tipoUsuario");
                localStorage.removeItem("cedulaEstudiante");
                localStorage.removeItem("cursoID");
                window.location.href = "index.html";
            }
        });
    };

    if (forceExit) {
        performExit();
    } else {
        document.getElementById("btnSalir")?.addEventListener("click", performExit);
    }
}


// ==========================
// INICIALIZACIÓN
// ==========================
document.addEventListener("DOMContentLoaded", () => {
    const nombre = localStorage.getItem("nombreEstudiante");
    const cedula = localStorage.getItem("cedulaEstudiante");
    const userType = localStorage.getItem("tipoUsuario");
    const curso = localStorage.getItem("cursoID");

    // --- Lógica en página-principal.html ---
    if (window.location.pathname.endsWith("pagina-principal.html")) {
        // Si falta cualquier dato, forzar el regreso al login
        if (!nombre || !userType || !cedula || !curso) {
            window.location.href = "index.html"; // Redirige a la nueva página de login
            return;
        }

        cursoID = curso;

        const nombreUsuario = document.getElementById("nombreUsuario");
        if (nombreUsuario) nombreUsuario.textContent = nombre;

        const tituloPrincipal = document.querySelector('.exam-title .title');
        if (tituloPrincipal) {
            tituloPrincipal.textContent = `Amigo Secreto (${curso})`;
        }

        escucharParticipantes(); // Reemplaza a mostrarMensajes()
        inicializarListenersUI(); // Inicializa el nuevo menú y modal
        activarBotonSalir(); // Activa el botón de salir del footer

        // Conectar el nuevo formulario para añadir participantes
        document.getElementById('formAnadirParticipante')?.addEventListener('submit', handleAnadirParticipante);

        // Se obtienen las referencias a los botones DENTRO del menú.
        const btnGenerarEmparejamientoMenu = document.getElementById("btnGenerarEmparejamientoMenu");
        const btnGenerarEmparejamientoPrincipal = document.getElementById("btnGenerarEmparejamiento");
        const btnBorrarListaMenu = document.getElementById("btnBorrarListaMenu");
        const btnBorrarDBMenu = document.getElementById("btnBorrarDBMenu");
        const btnEliminarSesionMenu = document.getElementById("btnEliminarSesionMenu");
        const btnSalirMenu = document.getElementById("btnSalirMenu");

        if (userType === "admin") {
            // Si es admin, se quita la clase que los oculta.
            btnGenerarEmparejamientoMenu?.classList.remove("oculto-admin");
            btnGenerarEmparejamientoPrincipal?.classList.remove("oculto-admin");
            btnBorrarListaMenu?.classList.remove("oculto-admin");
            btnBorrarDBMenu?.classList.remove("oculto-admin");
            btnEliminarSesionMenu?.classList.remove("oculto-admin");

            // Conectar los botones del menú a sus funciones
            // **CORRECCIÓN CLAVE**: Ambos botones de generar emparejamiento ahora llaman a la función correcta.
            btnGenerarEmparejamientoMenu?.addEventListener("click", generarEmparejamientoAmigoSecreto);
            btnGenerarEmparejamientoPrincipal?.addEventListener("click", generarEmparejamientoAmigoSecreto);
            btnBorrarListaMenu?.addEventListener("click", borrarListaParticipantes);
            btnBorrarDBMenu?.addEventListener("click", borrarTodaLaBaseDeDatos);
            btnEliminarSesionMenu?.addEventListener("click", handleDeleteSession);
        } else {
            // No es necesario hacer nada, los botones ya están ocultos por defecto.
        }
        // Conectar el botón de salir del menú directamente a la función de salir.
        btnSalirMenu?.addEventListener("click", () => activarBotonSalir(true));
    }
    // --- Lógica en la página de login ---
    else if (window.location.pathname.endsWith("index.html") || window.location.pathname === "/") {
        document.getElementById('btnIngresar')?.addEventListener('click', handleLogin);
        setupPasswordToggle();
    }
    // --- Lógica en la página de registro ---
    else if (window.location.pathname.endsWith("register.html")) {
        document.getElementById('btnRegistrar')?.addEventListener('click', handleRegister);
        setupPasswordToggle();
    }
    // --- Lógica en la página de consulta ---
    else if (window.location.pathname.endsWith("consultar.html")) {
        document.getElementById('btnConsultar')?.addEventListener('click', handleConsultaAmigoSecreto);
    }
});

/**
 * Configura el evento de clic para todos los íconos de "ojo" que
 * permiten mostrar u ocultar la contraseña en los campos de texto.
 */
function setupPasswordToggle() {
    document.querySelectorAll('.toggle-password').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const passwordInput = toggle.previousElementSibling;
            const eyeIcon = toggle.querySelector('.icon-eye');
            const eyeSlashIcon = toggle.querySelector('.icon-eye-slash');
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                eyeIcon.style.display = 'none';
                eyeSlashIcon.style.display = 'inline-block';
            } else {
                passwordInput.type = 'password';
                eyeIcon.style.display = 'inline-block';
                eyeSlashIcon.style.display = 'none';
            }
        });
    });
}

/**
 * Función reutilizable para borrar todos los mensajes del curso actual.
 * Ahora es independiente y puede ser llamada desde cualquier botón.
 */
async function borrarListaParticipantes() {
    if (tipoUsuario !== "admin" || !cursoID) return;

    const confirm = await Swal.fire({
        icon: "warning",
        title: "¿Borrar la lista de participantes?",
        text: `Esta acción eliminará a TODOS los participantes de la sesión **${cursoID}** y no se puede deshacer.`,
        showCancelButton: true,
        confirmButtonText: "Sí, borrar lista",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#d33"
    });

    if (confirm.isConfirmed) {
        try {
            const snapshot = await db.collection('sesiones').doc(cursoID).collection('participantes').get();
            const batch = db.batch();
            snapshot.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            Swal.fire({ icon: "success", title: "Lista de participantes eliminada", timer: 1500, showConfirmButton: false });
        } catch (error) {
            console.error("Error al borrar la lista de participantes:", error);
        }
    }
}