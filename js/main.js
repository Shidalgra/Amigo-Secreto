// ===============================================
// === CONFIGURACIÓN Y CONEXIÓN A FIRESTORE ===
// ===============================================

// 1. PEGA AQUÍ TUS CREDENCIALES DE FIREBASE (Paso 2 del tutorial)
const firebaseConfig = {
    apiKey: "AIzaSyDT_V6z6xSGoQiV7iJXfVsP53ecvR4qoos", // REEMPLAZA ESTO CON TUS CREDENCIALES REALES
    authDomain: "amigo-secreto-c4d79.firebaseapp.com",
    projectId: "amigo-secreto-c4d79",
    storageBucket: "amigo-secreto-c4d79.firebasestorage.app",
    messagingSenderId: "435632543005",
    appId: "1:435632543005:web:168b6a2814c14c36da7df4"
};

const ASSIGNMENTS_COLLECTION = "christmas_assignments"; 
let db = null; // Variable para la instancia de Firestore

/**
 * Inicializa la base de datos de Firebase.
 * Se llama automáticamente al cargar este script.
 */
function initializeDatabase() {
    try {
        if (typeof firebase === 'undefined') {
             console.error("Firebase SDK no cargado. Revisa index.html.");
             if (typeof showNotification === 'function') {
                 showNotification(`❌ Error: Firebase SDK no cargado. Revisa el archivo index.html.`, 'error');
             }
             return false;
        }
        // Inicializa la aplicación (CORREGIDO: Usar firebaseConfig)
        firebase.initializeApp(firebaseConfig);
        // Obtiene la referencia a Firestore
        db = firebase.firestore();
        console.log("🔥 Base de datos de Firebase inicializada correctamente.");
        return true;
    } catch (error) {
        console.error("Error al inicializar Firebase:", error);
        if (typeof showNotification === 'function') {
             showNotification(`❌ Error al inicializar Firebase: ${error.message}`, 'error');
        }
        return false;
    }
}

/**
 * Guarda las asignaciones en Firestore.
 * @param {Array} assignmentsArray - El array de asignaciones.
 */
async function saveAssignmentsToFirestore(assignmentsArray) {
    if (!db) {
        // Asumiendo que showNotification está definida en main.js
        if (typeof showNotification === 'function') {
             showNotification('❌ Error: Base de datos no inicializada.', 'error');
        }
        return false;
    }

    try {
        const sessionId = 'session_' + Date.now();
        const sessionData = {
            sessionId: sessionId,
            assignments: assignmentsArray,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            expiresAt: new Date(Date.now() + (1000 * 60 * 60 * 24 * 30)) // Expira en 30 días
        };

        await db.collection(ASSIGNMENTS_COLLECTION).doc(sessionId).set(sessionData);

        // Guardar el ID de la última sesión en localStorage para búsquedas rápidas
        window.localStorage.setItem('amigoSecretoLastSessionId', sessionId);

        console.log('✅ Asignaciones guardadas en Firestore con ID de sesión:', sessionId);
        return true;
    } catch (error) {
        console.error('❌ Error al guardar en el servidor:', error);
        if (typeof showNotification === 'function') {
             showNotification(`❌ Error al guardar en el servidor: ${error.message}`, 'error');
        }
        return false;
    }
}

/**
 * Recupera las asignaciones de Firestore usando el ID de la última sesión.
 */
async function getAssignmentsFromFirestore() {
    if (!db) return [];
    
    const lastSessionId = window.localStorage.getItem('amigoSecretoLastSessionId');
    if (!lastSessionId) {
        console.log('No hay ID de última sesión guardada.');
        return [];
    }
    
    try {
        const doc = await db.collection(ASSIGNMENTS_COLLECTION).doc(lastSessionId).get();
        if (doc.exists) {
            console.log('✅ Asignaciones recuperadas de Firestore.');
            return doc.data().assignments || [];
        }
    } catch (error) {
        console.error('Error al recuperar de Firestore:', error);
    }
    
    return [];
}


/**
 * Valida el acceso de un participante en Firestore.
 */
async function validateAccessInFirestore(participant, secret, accessCode) {
    if (!db) {
        console.error('❌ Base de datos no inicializada.');
        return null;
    }

    let foundAssignment = null;
    
    try {
        const lastSessionId = window.localStorage.getItem('amigoSecretoLastSessionId');

        // Intento 1: Búsqueda rápida por el ID de la última sesión
        if (lastSessionId) {
            console.log('Buscando en la última sesión de Firestore:', lastSessionId);
            const doc = await db.collection(ASSIGNMENTS_COLLECTION).doc(lastSessionId).get();

            if (doc.exists) {
                const sessionDoc = doc.data();
                foundAssignment = sessionDoc.assignments.find(a => 
                    a.giver.name === participant && 
                    a.secretId === secret && 
                    a.accessCode === accessCode
                );

                if (foundAssignment) {
                    console.log('✅ Validación exitosa en Firestore (última sesión).');
                    return foundAssignment;
                }
            }
        }

        // Intento 2: Query global (si el ID de la última sesión se perdió)
        console.log('Búsqueda fallida en la última sesión. Intentando query global...');
        
        // NOTA: Este query global requiere un índice compuesto en Firestore: 
        // collection: christmas_assignments, fields: assignments.giver.name (Array), assignments.secretId (Array), assignments.accessCode (Array)
        const snapshot = await db.collection(ASSIGNMENTS_COLLECTION)
            .where('assignments', 'array-contains', { 
                'giver.name': participant, 
                secretId: secret, 
                accessCode: accessCode 
            })
            .limit(1)
            .get();

        if (!snapshot.empty) {
            const sessionDoc = snapshot.docs[0].data();
            foundAssignment = sessionDoc.assignments.find(a => 
                a.giver.name === participant && 
                a.secretId === secret && 
                a.accessCode === accessCode
            );
            if (foundAssignment) {
                console.log('✅ Validación exitosa en Firestore (query global).');
                // Opcional: Actualizar lastSessionId si se encontró por query global
                window.localStorage.setItem('amigoSecretoLastSessionId', snapshot.docs[0].id);
                return foundAssignment;
            }
        }

    } catch (error) {
        console.error('Error al buscar en Firestore:', error);
        return null;
    }
    
    return null;
}

/**
 * Elimina todas las sesiones de asignaciones de Firestore (para el botón de reset)
 */
async function deleteAllAssignmentsFromFirestore() {
    console.log('🔥 Eliminando todas las asignaciones de Firestore...');
    if (!db) {
        console.error('❌ Base de datos no inicializada.');
        return false;
    }
    
    try {
        const batch = db.batch();
        const snapshot = await db.collection(ASSIGNMENTS_COLLECTION).limit(500).get(); // Límite de 500 por batch

        if (snapshot.size === 0) {
            console.log('No hay documentos de asignaciones para eliminar.');
        } else {
            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            console.log(`✅ ${snapshot.size} documentos de asignaciones eliminados.`);
        }
        
        // Limpiar el ID de la última sesión localmente
        window.localStorage.removeItem('amigoSecretoLastSessionId');
        
        return true;
    } catch (error) {
        console.error('❌ Error al eliminar asignaciones de Firestore:', error);
        if (typeof showNotification === 'function') {
            showNotification(`❌ Error al eliminar en el servidor: ${error.message}`, 'error');
        }
        return false;
    }
}


/**
 * Función para verificar el estado de conexión a Firebase
 */
window.isFirebaseActive = () => !!db;

// NOTA: La inicialización se moverá a main.js para asegurar que showNotification esté disponible.



// ===== VARIABLES GLOBALES =====
let participants = [];
let assignments = []; // Cambio: ahora guardamos asignaciones en lugar de pares

// ===== CÓDIGO ELIMINADO: SISTEMA DE PERSISTENCIA GLOBAL (GlobalAmigoSecretoSystem, funciones de localStorage) =====

// Detectar entorno de hosting (Se mantiene para información de debug)
const isNetlify = window.location.hostname.includes('.netlify.app') || window.location.hostname.includes('.netlify.com');
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

console.log('🌐 Entorno detectado:', {
    netlify: isNetlify,
    localhost: isLocalhost,
    hostname: window.location.hostname,
    origin: window.location.origin
});

// ===== ELEMENTOS DEL DOM =====
let nameInput, phoneInput, countrySelect, participantsList, participantsCount;
let addBtn, clearBtn, generateBtn, resultsSection, pairsList, completionMessage;

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', async function () {
    console.log('🎄 DOM cargado, inicializando aplicación...');

    // === INICIALIZACIÓN DE FIREBASE (Nueva lógica) ===
    // Aseguramos que la función esté disponible antes de llamarla
    if (typeof initializeDatabase === 'function') {
        initializeDatabase();
    } else {
        console.error('❌ initializeDatabase no está definida. Revisa si firebase.js está cargado.');
        showNotification('❌ Error de carga: No se pudo inicializar la base de datos.', 'error');
    }
    // === FIN INICIALIZACIÓN DE FIREBASE ===
    
    // Configuración global de SweetAlert2 (Se mantiene)
    if (typeof Swal !== 'undefined') {
        // Configurar opciones por defecto
        Swal.getDefaults = () => ({
            allowOutsideClick: true,
            allowEscapeKey: true,
            heightAuto: false,
            scrollbarPadding: false,
        });

        const originalFire = Swal.fire;
        Swal.fire = function (options) {
            if (typeof options === 'object') {
                options = {
                    allowOutsideClick: true,
                    allowEscapeKey: true,
                    heightAuto: false,
                    scrollbarPadding: false,
                    ...options
                };
            }
            return originalFire.call(this, options);
        };

        const observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                mutation.addedNodes.forEach(function (node) {
                    if (node.nodeType === 1 && node.classList && node.classList.contains('swal2-container')) {
                        document.body.style.overflow = 'auto';
                        document.documentElement.style.overflow = 'auto';
                        document.body.style.paddingRight = '0';
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Inicializar elementos DOM
    nameInput = document.getElementById('nameInput');
    phoneInput = document.getElementById('phoneInput');
    countrySelect = document.getElementById('countrySelect');
    participantsList = document.getElementById('participantsList');
    participantsCount = document.getElementById('participantsCount');
    addBtn = document.getElementById('addBtn');
    clearBtn = document.getElementById('clearBtn');
    generateBtn = document.getElementById('generateBtn');
    resultsSection = document.getElementById('resultsSection');
    pairsList = document.getElementById('pairsList');
    completionMessage = document.getElementById('completionMessage');

    // Verificar que todos los elementos existan
    if (!nameInput || !phoneInput || !countrySelect) {
        console.error('Error: No se pudieron encontrar los elementos del formulario');
        return;
    }

    // Cargar participantes y asignaciones desde Firestore (si existen y es el creador)
    if (typeof getAssignmentsFromFirestore === 'function') {
        assignments = await getAssignmentsFromFirestore();
        if (assignments.length > 0) {
            // Reconstruir lista de participantes a partir de las asignaciones
            participants = assignments.map(a => a.giver).filter((value, index, self) => 
                index === self.findIndex((t) => (
                    t.name === value.name
                ))
            );
            // Mostrar resultados al creador
            displayResults();
        }
    }
    
    updateUI();

    // Enter key para agregar participante
    nameInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            phoneInput.focus();
        }
    });

    phoneInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            addParticipant();
        }
    });

    // Focus automático en el input
    nameInput.focus();

    // Verificar si hay parámetros en la URL para mostrar asignación
    checkForAssignment();
});

// ===== FUNCIONES PRINCIPALES =====

/**
 * Agrega un nuevo participante a la lista
 */
function addParticipant() {
    console.log('🎄 Función addParticipant() ejecutada');

    if (!nameInput || !phoneInput || !countrySelect) {
        console.error('Error: Elementos del DOM no encontrados al agregar participante.'); 
        showNotification('Error de sistema: No se puede acceder al formulario. Recarga la página.', 'error'); 
        return;
    } 
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const countryCode = countrySelect.value;
    console.log('Datos del formulario:', { name, phone, countryCode });

    if (!isValidName(name)) {
        showNotification('❌ El nombre es inválido. Asegúrate de usar solo letras y que no esté vacío.', 'warning');
        return;
    }
    if (!isValidPhone(phone)) {
        showNotification('❌ El número de teléfono es inválido. Solo se permiten números (7-15 dígitos).', 'warning');
        return;
    }
    
    const isDuplicate = participants.some(p => p.name.toLowerCase() === name.toLowerCase());
    if (isDuplicate) {
        showNotification(`❌ Ya existe un participante llamado "${name}".`, 'warning');
        return;
    }

    const participant = { 
        name, 
        phone, 
        country: countryCode,
        flag: getFlagEmoji(countryCode)
    };
    
    participants.push(participant);
    
    // Limpiar campos y actualizar UI
    nameInput.value = '';
    phoneInput.value = '';
    nameInput.focus();
    updateUI();
}


/**
 * Elimina un participante de la lista
 * @param {string} name - Nombre del participante a eliminar
 */
function removeParticipant(name) {
    participants = participants.filter(p => p.name !== name);
    assignments = []; // Si se elimina un participante, las asignaciones se invalidan
    // ELIMINADO: No necesitamos limpiar localStorage aquí
    hideResults();
    updateUI();
}

/**
 * Genera las asignaciones de amigo secreto
 */
async function generateAssignments() {
    console.log('🎁 Iniciando generación de asignaciones...');

    if (participants.length < 3) {
        showNotification('❌ Necesitas al menos 3 participantes para el Amigo Secreto.', 'warning');
        return;
    }

    // 1. Generar asignaciones secretas
    assignments = generateSecretSantaAssignments(participants);

    if (assignments.length === 0) {
        showNotification('Error al generar las asignaciones. Intenta de nuevo.', 'error');
        return;
    }
    
    // 2. Generar códigos únicos y enlaces
    const usedCodes = new Set();
    assignments = assignments.map(assignment => {
        const secretId = generateSecretId(assignment.giver.name, assignment.receiver.name);
        
        let accessCode;
        let attempts = 0;
        const maxAttempts = 100;
        do {
            accessCode = generateAccessCode(assignment.giver.name + '_' + attempts);
            attempts++;
        } while (usedCodes.has(accessCode) && attempts < maxAttempts);
        usedCodes.add(accessCode);
        
        // Crear el enlace único
        const uniqueLink = `${window.location.origin}/?participant=${encodeURIComponent(assignment.giver.name)}&secret=${secretId}&code=${accessCode}`;
        
        return {
            ...assignment,
            uniqueLink: uniqueLink,
            secretId: secretId,
            accessCode: accessCode,
            timestamp: Date.now()
        };
    });

    // ** PASO CLAVE: Guardar en Firestore **
    if (typeof saveAssignmentsToFirestore !== 'function' || !window.isFirebaseActive()) {
         showNotification('❌ Error: Firebase no está activo o la función de guardado no está cargada.', 'error');
         return;
    }
    const success = await saveAssignmentsToFirestore(assignments);

    if (!success) {
        // Si falla el guardado, abortar la operación.
        assignments = [];
        showNotification('❌ Error: Las asignaciones no pudieron guardarse en el servidor. Intenta de nuevo.', 'error');
        updateUI();
        hideResults();
        return;
    }

    // 3. Mostrar resultados
    updateUI();
    displayResults();
}

/**
 * Verifica si hay una asignación en los parámetros de la URL (ACTUALIZADA)
 */
async function checkForAssignment() {
    const urlParams = new URLSearchParams(window.location.search);
    const participant = urlParams.get('participant');
    const secret = urlParams.get('secret');
    const code = urlParams.get('code');
    
    // 1. Validar con Firestore
    if (participant && secret && code) {
        console.log('🔍 Parámetros de asignación encontrados en URL. Verificando en Firestore...');
        
        if (typeof validateAccessInFirestore !== 'function' || !window.isFirebaseActive()) {
            console.error('❌ validateAccessInFirestore no está definida o Firebase inactivo.');
            // Intentar cargar asignaciones si es el creador para tener un fallback (no implementado aquí, se asume carga por DOMContentLoaded)
            return; 
        }
        
        // Espeamos la validación asíncrona en Firestore
        const assignment = await validateAccessInFirestore(participant, secret, code);
        
        if (assignment) {
            // Validación exitosa, ocultamos la aplicación principal y mostramos el resultado.
            document.querySelector('.container').style.display = 'none';
            showPersonalAssignment(assignment);
            return;
        } else {
            console.warn('❌ Validación fallida en Firestore.');
            showError('Código de acceso o enlace inválido. Revisa que la URL sea correcta o que la sesión no haya expirado.');
            return;
        }
    }
    
    // ELIMINADO: Comprobación de data antigua codificada (Ya no es necesaria)
}

/**
 * Limpia la lista de participantes y asignaciones.
 */
function clearParticipants() {
    Swal.fire({
        title: '⚠️ ¿Limpiar la lista?',
        html: `
            <p>Selecciona una opción de limpieza:</p>
            <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
                <button id="btn-full-reset" class="swal2-styled swal2-confirm" style="background-color: var(--christmas-red); color: white;">
                    🚨 Resetear Sistema Completo
                </button>
                <button id="btn-soft-reset" class="swal2-styled swal2-deny">
                    🧹 Solo Limpiar Lista
                </button>
            </div>
            <p style="margin-top: 15px; font-size: 0.9em; color: #777;">
                * **Resetear Sistema** elimina **todo** del servidor (participantes y asignaciones).
            </p>
        `,
        icon: 'warning',
        showConfirmButton: false,
        showDenyButton: false,
        showCancelButton: true,
        cancelButtonText: 'Cancelar'
    });

    document.getElementById('btn-full-reset').addEventListener('click', () => {
        Swal.close();
        Swal.fire({
            title: 'Confirmación de Reseteo',
            text: 'Estás a punto de ELIMINAR TODAS las asignaciones del servidor. Esto es irreversible. Escribe "REGENERAR" para confirmar.',
            input: 'text',
            inputAttributes: {
                autocapitalize: 'off'
            },
            showCancelButton: true,
            confirmButtonText: 'Sí, Eliminar Todo',
            cancelButtonText: 'No, Cancelar',
            confirmButtonColor: '#dc143c',
            showLoaderOnConfirm: true,
            preConfirm: (login) => {
                if (login.toUpperCase() !== 'REGENERAR') {
                    return 'Debes escribir exactamente "REGENERAR" para continuar';
                }
            }
        }).then((confirmResult) => {
            if (confirmResult.isConfirmed) {
                executeCompleteReset();
            }
        });
    });

    document.getElementById('btn-soft-reset').addEventListener('click', () => {
        Swal.close();
        // Solo limpiar la lista, mantener asignaciones
        participants = [];
        // assignments = []; // Se mantiene el historial de asignaciones previas si no se hace reset completo
        updateUI();
        hideResults();
        Swal.fire({ 
            title: '✅ ¡Lista Limpiada!', 
            html: ` <p>Lista de participantes eliminada. Las asignaciones guardadas en el servidor **aún funcionan**.</p> `, 
            icon: 'success', 
            confirmButtonText: '👍 ¡Perfecto!', 
            timer: 3000 
        });
    });
}

/**
 * Ejecuta el reseteo completo del sistema (ACTUALIZADO para usar Firestore)
 */
async function executeCompleteReset() {
    console.log('🚨 Ejecutando regeneración completa del sistema...');
    try {
        // 1. Limpiar variables locales
        participants = [];
        assignments = [];
        
        // 2. Limpiar en Firestore (Nueva acción)
        if (typeof deleteAllAssignmentsFromFirestore === 'function') {
            const deleted = await deleteAllAssignmentsFromFirestore();
            if (deleted) {
                 console.log('✅ Asignaciones eliminadas de Firestore.');
            }
        } else {
            console.warn('⚠️ deleteAllAssignmentsFromFirestore no está definida, no se eliminó en Firestore.');
            showNotification('❌ Error: No se pudo conectar con el servidor para eliminar asignaciones.', 'error');
            return;
        }

        // 3. Limpiar sistema global de enlaces (ELIMINADO)
        
        // 4. Actualizar UI
        updateUI();
        hideResults();
        
        Swal.fire({
            title: '✅ ¡Sistema Regenerado!',
            html: 'Participantes y asignaciones **eliminados del servidor**.<br>Puedes empezar de nuevo.',
            icon: 'success',
            confirmButtonText: '👍 ¡Perfecto!',
            timer: 4000
        });
        
    } catch (error) {
        console.error('❌ Error al ejecutar el reseteo completo:', error);
        showNotification(`❌ Error al resetear el sistema: ${error.message}`, 'error');
    }
}

// ===== FUNCIONES AUXILIARES (SE MANTIENEN) =====
function generateSecretSantaAssignments(arr) {
    if (arr.length < 2) return [];

    const givers = [...arr];
    const receivers = shuffleArray([...arr]);
    const assignments = [];

    for (let i = 0; i < givers.length; i++) {
        let giver = givers[i];
        let receiver = receivers[i];

        // Evitar que una persona se regale a sí misma
        if (giver.name === receiver.name) {
            // Intenta intercambiar con el siguiente. Si es el último, intercambia con el primero.
            let nextIndex = (i + 1) % givers.length;
            receiver = receivers[nextIndex];
            receivers[nextIndex] = receivers[i]; // El original pasa a ser el receiver del siguiente/primero
        }
        
        assignments.push({ giver, receiver });
    }
    
    // Una verificación final de seguridad (aunque el algoritmo de intercambio lo maneja)
    if (assignments.some(a => a.giver.name === a.receiver.name)) {
        console.warn("⚠️ Fallo en la asignación: hubo un par consigo mismo después del intento de reparación. Reintentando...");
        // Esto puede ocurrir en casos raros, por seguridad, si falla se llama de nuevo.
        return generateSecretSantaAssignments(arr);
    }

    return assignments;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function isValidName(name) {
    // Permite letras, espacios y acentos
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/; 
    return name.length > 0 && nameRegex.test(name);
}

function isValidPhone(phone) {
    // Solo números, entre 7 y 15 dígitos
    const phoneRegex = /^\d{7,15}$/; 
    return phoneRegex.test(phone);
}

function getFlagEmoji(countryCode) {
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
}

function generateAccessCode(seed) {
    // Código de 6 dígitos basado en un hash simple del nombre + timestamp
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    let code = Math.abs(hash * Date.now()).toString().substring(0, 6);
    while (code.length < 6) {
        code += Math.floor(Math.random() * 10).toString();
    }
    return code;
}

function generateSecretId(giver, receiver) {
    // Un ID secreto simple
    const combined = giver.toLowerCase() + receiver.toLowerCase();
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
        hash = combined.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash).toString(36).substring(0, 8); // Base 36 (letras y números)
}


// ===== FUNCIONES DE UI Y UTILIDADES =====

/**
 * Muestra una notificación con SweetAlert2
 */
function showNotification(title, icon = 'info', timer = 3000) {
    if (typeof Swal === 'undefined') {
        console.warn(`[Notificación] ${icon.toUpperCase()}: ${title}`);
        return;
    }
    Swal.fire({
        title: title,
        icon: icon,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: timer,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer)
            toast.addEventListener('mouseleave', Swal.resumeTimer)
        }
    });
}

/**
 * Muestra un error grande en el centro de la pantalla.
 */
function showError(message) {
     if (typeof Swal === 'undefined') {
        alert(`ERROR: ${message}`);
        return;
    }
    Swal.fire({
        icon: 'error',
        title: '¡Ups! Algo salió mal',
        text: message,
        confirmButtonText: 'Entendido'
    });
}


/**
 * Muestra el resultado de la asignación de un participante en el modo URL.
 * @param {Object} assignment - El objeto de asignación validado.
 */
function showPersonalAssignment(assignment) {
    // Crear la estructura de la sección
    const personalSection = document.createElement('section');
    personalSection.id = 'personalAssignment';
    personalSection.className = 'container assignment-page';
    personalSection.innerHTML = `
        <h1 class="title">¡Felicitaciones, ${assignment.giver.name}! 🎁</h1>
        <p class="subtitle">Ya puedes descubrir a quién debes darle regalo.</p>
        <div class="result-box">
            <p class="result-label">Tu Amigo Secreto es:</p>
            <h2 class="receiver-name">${assignment.receiver.name}</h2>
            <p class="receiver-contact-info">
                <span class="flag">${assignment.receiver.flag}</span>
                <span class="phone-number">(${getCountryData(assignment.receiver.country).dial_code}) ${assignment.receiver.phone}</span>
            </p>
        </div>
        <p class="footer-note">¡Guarda bien esta información! No podrás verla de nuevo sin el enlace.</p>
    `;
    
    document.body.appendChild(personalSection);
    // Cambiar estilos para la vista de resultado personal si es necesario
    document.body.style.backgroundImage = 'none';
    document.body.style.backgroundColor = '#f8f9fa';
}


function displayResults() {
    // Muestra la sección de resultados (se mantiene el estilo)
    resultsSection.style.display = 'block';
    pairsList.innerHTML = '';
    completionMessage.style.display = 'block';

    // Generar la lista de enlaces para el creador
    assignments.forEach(assignment => {
        const li = document.createElement('li');
        li.className = 'assignment-item';
        
        // El enlace ya tiene todos los parámetros de acceso: participant, secret, code
        const uniqueLink = assignment.uniqueLink; 
        
        li.innerHTML = `
            <div class="giver-info">
                ${assignment.giver.flag} **${assignment.giver.name}**
            </div>
            <div class="link-actions">
                <a href="${uniqueLink}" target="_blank" class="btn-link" title="Ver asignación en una nueva pestaña">
                    🔗 Abrir Link
                </a>
                <button class="btn-copy" data-link="${uniqueLink}" title="Copiar enlace para compartir">
                    📋 Copiar
                </button>
            </div>
            <span class="debug-code" title="Código de acceso (para debug)">**ID:** ${assignment.accessCode}</span>
        `;
        pairsList.appendChild(li);
    });

    // Agregar listeners a los botones de copiar
    document.querySelectorAll('.btn-copy').forEach(button => {
        button.addEventListener('click', function() {
            const linkToCopy = this.getAttribute('data-link');
            navigator.clipboard.writeText(linkToCopy).then(() => {
                showNotification('✅ Enlace copiado al portapapeles.', 'success', 2000);
            }).catch(err => {
                console.error('Error al copiar el enlace: ', err);
                showError('No se pudo copiar automáticamente. Intenta seleccionarlo manualmente.');
            });
        });
    });

    // Muestra el mensaje de completado
    Swal.fire({
        title: '¡Asignaciones listas! 🎉',
        html: '<p>Los enlaces se han generado y guardado de forma segura en el servidor. Ahora puedes compartirlos individualmente.</p>',
        icon: 'success',
        confirmButtonText: 'Ver Enlaces'
    });
}

function hideResults() {
    resultsSection.style.display = 'none';
    completionMessage.style.display = 'none';
}

function updateUI() {
    // Actualiza la lista visible de participantes
    participantsList.innerHTML = '';
    participants.forEach(p => {
        const li = document.createElement('li');
        li.className = 'participant-item';
        li.innerHTML = `
            <span class="participant-name">
                ${p.flag} ${p.name}
            </span>
            <span class="participant-phone">
                (${getCountryData(p.country).dial_code}) ${p.phone}
            </span>
            <button class="remove-btn" onclick="removeParticipant('${p.name}')" title="Eliminar participante">
                ❌
            </button>
        `;
        participantsList.appendChild(li);
    });

    // Actualiza el contador
    participantsCount.textContent = `(${participants.length})`;

    // Habilita/deshabilita el botón de generar
    if (participants.length >= 3) {
        generateBtn.disabled = false;
        generateBtn.classList.remove('disabled');
    } else {
        generateBtn.disabled = true;
        generateBtn.classList.add('disabled');
    }
    
    // Si hay asignaciones generadas, muestra el botón de resultados (si no está visible)
    if (assignments.length > 0) {
        document.getElementById('showResultsBtn').style.display = 'inline-block';
    } else {
        document.getElementById('showResultsBtn').style.display = 'none';
    }
}


// Función de utilidad para data de países (Se mantiene)
function getCountryData(code) {
    const countries = [
        {"code": "CR", "name": "Costa Rica", "dial_code": "+506"},
        {"code": "MX", "name": "México", "dial_code": "+52"},
        {"code": "ES", "name": "España", "dial_code": "+34"},
        {"code": "CO", "name": "Colombia", "dial_code": "+57"},
        {"code": "AR", "name": "Argentina", "dial_code": "+54"},
        {"code": "CL", "name": "Chile", "dial_code": "+56"},
        {"code": "PE", "name": "Perú", "dial_code": "+51"},
        {"code": "EC", "name": "Ecuador", "dial_code": "+593"},
        {"code": "GT", "name": "Guatemala", "dial_code": "+502"},
        {"code": "PA", "name": "Panamá", "dial_code": "+507"},
        {"code": "HN", "name": "Honduras", "dial_code": "+504"},
        {"code": "SV", "name": "El Salvador", "dial_code": "+503"},
        {"code": "NI", "name": "Nicaragua", "dial_code": "+505"},
        {"code": "DO", "name": "República Dominicana", "dial_code": "+1"},
        {"code": "VE", "name": "Venezuela", "dial_code": "+58"},
        {"code": "US", "name": "Estados Unidos", "dial_code": "+1"}
    ];
    return countries.find(c => c.code === code) || countries.find(c => c.code === 'CR');
}

// Hacer que las funciones de UI estén disponibles globalmente
window.addParticipant = addParticipant;
window.removeParticipant = removeParticipant;
window.generateAssignments = generateAssignments;
window.clearParticipants = clearParticipants;
window.displayResults = displayResults;
window.showNotification = showNotification;
window.showError = showError;

// ELIMINADO: Funciones de debug/estadísticas globales (resetGlobalSystem, showGlobalSystemStats, etc.)
// ...