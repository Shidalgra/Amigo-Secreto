// ===== VARIABLES GLOBALES =====
let participants = [];
let assignments = []; // Cambio: ahora guardamos asignaciones en lugar de pares

// Detectar entorno de hosting
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
document.addEventListener('DOMContentLoaded', function () {
    console.log('🎄 DOM cargado, inicializando aplicación...');

    // Limpiar asignaciones expiradas al cargar
    cleanExpiredAssignments();

    // Mostrar información del almacenamiento
    showStorageInfo();

    // Verificar SweetAlert2
    console.log('Verificando SweetAlert2:', typeof Swal !== 'undefined' ? '✅ Disponible' : '❌ No disponible');

    // Configuración global de SweetAlert2 para permitir scroll de fondo
    if (typeof Swal !== 'undefined') {
        // Configurar opciones por defecto
        Swal.getDefaults = () => ({
            allowOutsideClick: true,
            allowEscapeKey: true,
            heightAuto: false,
            scrollbarPadding: false,
            ...Swal.getDefaults()
        });

        // Método alternativo: Sobrescribir el método fire original
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

        // Listener para forzar scroll cuando se abre SweetAlert
        const observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                mutation.addedNodes.forEach(function (node) {
                    if (node.nodeType === 1 && node.classList && node.classList.contains('swal2-container')) {
                        // Forzar que el body mantenga el scroll
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

    // Verificar que los elementos existan
    if (!nameInput || !phoneInput || !countrySelect) {
        console.error('Error: Elementos del formulario no encontrados');
        alert('Error: Elementos del formulario no encontrados. Recarga la página.');
        return;
    }

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const countryCode = countrySelect.value;

    console.log('Datos del formulario:', { name, phone, countryCode });

    // Verificar que countrySelect tenga opciones
    if (!countrySelect.options || countrySelect.options.length === 0) {
        console.error('Error: countrySelect no tiene opciones');
        alert('Error: Selector de país no funciona correctamente');
        return;
    }

    // Extraer solo el emoji de la bandera (antes del primer espacio)
    const optionText = countrySelect.options[countrySelect.selectedIndex].text;
    const countryFlag = optionText.split(' ')[0]; // Esto extrae solo el emoji antes del primer espacio
    const countryParts = optionText.split(' ');
    const countryName = countryParts.length > 1 ? countryParts[1] : 'País'; // Nombre del país (opcional, para uso futuro)

    // Validaciones
    if (name === '') {
        showNotification('Por favor, ingresa un nombre válido', 'error');
        nameInput.focus();
        return;
    }

    if (phone === '') {
        showNotification('Por favor, ingresa un número de WhatsApp', 'error');
        phoneInput.focus();
        return;
    }

    if (name.length > 30) {
        showNotification('El nombre es muy largo (máximo 30 caracteres)', 'error');
        return;
    }

    const fullPhone = countryCode + phone;

    if (!isValidPhone(phone)) {
        showNotification('Formato de teléfono inválido. Solo números, ej: 3001234567', 'error');
        phoneInput.focus();
        return;
    }

    if (participants.some(p => p.name.toLowerCase() === name.toLowerCase())) {
        showNotification('Este participante ya está en la lista', 'error');
        return;
    }

    if (participants.some(p => p.phone === fullPhone)) {
        showNotification('Este número de teléfono ya está en la lista', 'error');
        return;
    }

    // Agregar participante
    participants.push({
        name: formatName(name),
        phone: fullPhone,
        flag: countryFlag,
        country: countryName || 'País'
    });

    nameInput.value = '';
    phoneInput.value = '';
    nameInput.focus();

    updateUI();
    showNotification(`¡${name} agregado exitosamente!`, 'success');
}

/**
 * Elimina un participante de la lista
 */
function removeParticipant(index) {
    const participant = participants[index];
    const participantName = participant.name;

    // Mostrar confirmación con SweetAlert2
    Swal.fire({
        icon: 'question',
        title: '❓ ¿Eliminar Participante?',
        text: `¿Estás seguro de que quieres eliminar a "${participantName}" de la lista?`,
        showCancelButton: true,
        confirmButtonText: '🗑️ Sí, Eliminar',
        cancelButtonText: '❌ Cancelar',
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        background: '#fff',
        iconColor: '#17a2b8',
        customClass: {
            popup: 'swal-christmas',
            title: 'swal-title',
            content: 'swal-content'
        }
    }).then((result) => {
        if (result.isConfirmed) {
            // Eliminar el participante
            participants.splice(index, 1);
            updateUI();

            // Mostrar confirmación de éxito
            Swal.fire({
                icon: 'success',
                title: '✅ ¡Participante Eliminado!',
                text: `${participantName} ha sido eliminado de la lista correctamente.`,
                confirmButtonText: '👍 ¡Perfecto!',
                confirmButtonColor: '#28a745',
                background: '#fff',
                iconColor: '#28a745',
                timer: 2000,
                timerProgressBar: true,
                customClass: {
                    popup: 'swal-christmas',
                    title: 'swal-title',
                    content: 'swal-content'
                }
            });
        }
    });
}

/**
 * Limpia toda la lista de participantes
 */
function clearParticipants() {
    console.log('clearParticipants llamada, participantes:', participants.length);

    // Verificar que SweetAlert2 esté disponible
    if (typeof Swal === 'undefined') {
        alert('Error: SweetAlert2 no está cargado');
        return;
    }

    // Si la lista está vacía, mostrar mensaje informativo
    if (participants.length === 0) {
        console.log('Lista ya vacía, mostrando SweetAlert');
        Swal.fire({
            title: '📝 Lista Vacía',
            text: '¡La lista ya está vacía! No hay participantes para eliminar.',
            icon: 'info',
            confirmButtonText: '👍 Entendido'
        });
        return;
    }

    // Si hay participantes, preguntar si quiere borrarlos
    console.log('Mostrando confirmación para limpiar lista');
    Swal.fire({
        title: '🗑️ ¿Limpiar Lista?',
        html: `
            <p>¿Qué quieres hacer con los ${participants.length} participantes?</p>
            <div style="margin: 1rem 0; padding: 1rem; background: rgba(255, 193, 7, 0.1); border-radius: 8px;">
                <strong>⚠️ IMPORTANTE:</strong><br>
                <small>Si mantienes las asignaciones, los enlaces únicos seguirán funcionando</small>
            </div>
        `,
        icon: 'question',
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: '🗑️ Limpiar Todo (Incluyendo Asignaciones)',
        denyButtonText: '📝 Solo Limpiar Lista (Mantener Asignaciones)',
        cancelButtonText: '❌ Cancelar',
        confirmButtonColor: '#dc3545',
        denyButtonColor: '#28a745',
        cancelButtonColor: '#6c757d'
    }).then((result) => {
        if (result.isConfirmed) {
            // Limpiar todo incluyendo asignaciones permanentes
            participants = [];
            assignments = [];

            // Limpiar TODO el localStorage relacionado
            try {
                // Limpiar asignaciones individuales
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const key = localStorage.key(i);
                    if (key && (key.startsWith('assignment_') || key.startsWith('secretSanta'))) {
                        localStorage.removeItem(key);
                    }
                }
                console.log('🗑️ TODAS las asignaciones eliminadas del localStorage');
            } catch (error) {
                console.error('Error al limpiar localStorage completo:', error);
            }

            updateUI();
            hideResults();

            Swal.fire({
                title: '✅ ¡Todo Limpiado!',
                text: 'Participantes y asignaciones eliminados. Los enlaces únicos ya no funcionarán.',
                icon: 'success',
                confirmButtonText: '👍 ¡Perfecto!',
                timer: 3000
            });

        } else if (result.isDenied) {
            // Solo limpiar la lista, mantener asignaciones
            participants = [];
            assignments = []; // Solo limpiar de memoria

            updateUI();
            hideResults();

            Swal.fire({
                title: '✅ ¡Lista Limpiada!',
                html: `
                    <p>Lista de participantes eliminada.</p>
                    <div style="margin: 1rem 0; padding: 1rem; background: rgba(40, 167, 69, 0.1); border-radius: 8px;">
                        <strong>✅ Las asignaciones se mantuvieron:</strong><br>
                        <small>Los enlaces únicos seguirán funcionando normalmente</small>
                    </div>
                `,
                icon: 'success',
                confirmButtonText: '👍 ¡Perfecto!',
                timer: 4000
            });
        }
    });
}

/**
 * Genera las asignaciones de amigo secreto
 */
function generatePairs() {
    console.log('generatePairs llamada, participantes:', participants.length);

    // Limpiar asignaciones previas antes de generar nuevas
    assignments = [];
    if (pairsList) {
        pairsList.innerHTML = '<div class="loading">🔄 Generando nuevas asignaciones...</div>';
    }

    // Limpiar cualquier caché de códigos previos
    if (typeof (Storage) !== "undefined" && localStorage) {
        localStorage.removeItem('lastGeneratedCodes');
        localStorage.removeItem('codeCache');
        localStorage.removeItem('accessCodes');
    }

    // Verificar que SweetAlert2 esté disponible
    if (typeof Swal === 'undefined') {
        alert('Error: SweetAlert2 no está cargado');
        return;
    }

    // Validar que haya participantes en la lista
    if (participants.length === 0) {
        console.log('Lista vacía, mostrando SweetAlert');
        Swal.fire({
            title: '¡Lista vacía!',
            text: 'Primero debes agregar personas a la lista para poder hacer el intercambio.',
            icon: 'warning',
            confirmButtonText: '¡Entendido!'
        });
        return;
    }

    // Validar que haya al menos 2 participantes
    if (participants.length === 1) {
        console.log('Solo 1 participante, mostrando SweetAlert');
        Swal.fire({
            title: '¡Faltan participantes!',
            text: 'Se necesitan mínimo 2 personas para poder hacer el intercambio de regalos.',
            icon: 'info',
            confirmButtonText: 'Agregar más personas'
        });
        return;
    }

    // Crear las asignaciones usando el algoritmo de amigo secreto
    assignments = generateSecretSantaAssignments(participants);

    // Generar códigos únicos de acceso para cada asignación
    const usedCodes = new Set(); // Para asegurar códigos únicos
    assignments = assignments.map(assignment => {
        let accessCode;
        let attempts = 0;
        const maxAttempts = 100;

        // Generar código único (no repetido)
        do {
            accessCode = generateAccessCode(assignment.giver.name + '_' + attempts);
            attempts++;
        } while (usedCodes.has(accessCode) && attempts < maxAttempts);

        usedCodes.add(accessCode);

        const secretId = generateSecretId(assignment.giver.name, assignment.receiver.name);
        const assignmentWithCodes = {
            ...assignment,
            accessCode: accessCode,
            secretId: secretId,
            timestamp: Date.now() // Agregar timestamp para identificar generación
        };
        assignmentWithCodes.uniqueLink = generateUniqueLink(assignmentWithCodes, accessCode);
        return assignmentWithCodes;
    });

    if (assignments.length === 0) {
        showNotification('Error al generar las asignaciones. Intenta de nuevo.', 'error');
        return;
    }

    // Guardar las asignaciones en localStorage para acceso posterior
    try {
        // Verificar que localStorage esté disponible (funciona en Netlify)
        if (typeof (Storage) !== "undefined" && localStorage) {
            // Crear un ID único para esta sesión de amigo secreto
            const sessionId = 'secretsanta_' + Date.now();
            const assignmentData = {
                sessionId: sessionId,
                timestamp: Date.now(),
                assignments: assignments,
                participants: participants,
                expiryDate: Date.now() + (365 * 24 * 60 * 60 * 1000) // 1 año de duración
            };

            // Guardar datos con clave única
            localStorage.setItem('secretSantaAssignments', JSON.stringify(assignmentData));
            localStorage.setItem('secretSantaCurrentSession', sessionId);

            // Guardar también cada asignación individual para acceso directo
            assignments.forEach(assignment => {
                const key = `assignment_${assignment.secretId}`;
                localStorage.setItem(key, JSON.stringify({
                    ...assignment,
                    sessionId: sessionId,
                    timestamp: Date.now(),
                    permanent: true
                }));
            });

            console.log('✅ Asignaciones guardadas PERMANENTEMENTE para Netlify');
            console.log('📅 Duración: 1 año desde hoy');
            console.log('🔑 Session ID:', sessionId);
        } else {
            console.warn('⚠️ localStorage no disponible, usando almacenamiento temporal');
            // Fallback: usar variable global temporal
            window.tempAssignments = assignments;
        }
    } catch (error) {
        console.error('❌ Error al guardar asignaciones:', error);
        // Fallback en caso de error
        window.tempAssignments = assignments;
    }

    displayResults();

    // Debug: Mostrar información de códigos generados en consola solamente
    console.log('🔑 Códigos de acceso generados:');
    assignments.forEach(assignment => {
        console.log(`${assignment.giver.name}: ${assignment.accessCode} (${assignment.secretId})`);
    });

    // Notificación simple sin SweetAlert
    showNotification(`¡${assignments.length} asignaciones generadas exitosamente!`, 'success');
}

/**
 * Genera asignaciones de amigo secreto garantizando que nadie se tenga a sí mismo
 * y que cada persona dé y reciba exactamente un regalo
 */
function generateSecretSantaAssignments(participantsList) {
    const maxAttempts = 100;
    let attempts = 0;

    while (attempts < maxAttempts) {
        try {
            // Crear una copia de la lista
            let givers = [...participantsList];
            let receivers = [...participantsList];
            let newAssignments = [];

            // Mezclar la lista de receptores
            shuffleArray(receivers);

            // Intentar crear asignaciones válidas
            for (let i = 0; i < givers.length; i++) {
                const giver = givers[i];

                // Buscar un receptor válido (que no sea el mismo)
                let validReceiverIndex = -1;
                for (let j = 0; j < receivers.length; j++) {
                    if (receivers[j].name !== giver.name) {
                        validReceiverIndex = j;
                        break;
                    }
                }

                // Si no encontramos un receptor válido, reintentar
                if (validReceiverIndex === -1) {
                    throw new Error('No se pudo encontrar una asignación válida');
                }

                // Hacer la asignación
                const receiver = receivers[validReceiverIndex];
                newAssignments.push({
                    giver: giver,
                    receiver: receiver,
                    giverNumber: i + 1
                });

                // Remover el receptor de la lista disponible
                receivers.splice(validReceiverIndex, 1);
            }

            // Si llegamos aquí, las asignaciones son válidas
            return newAssignments;

        } catch (error) {
            attempts++;
            if (attempts < maxAttempts) {
                continue; // Intentar de nuevo
            }
        }
    }

    // Si no pudimos generar asignaciones válidas después de muchos intentos
    console.error('No se pudieron generar asignaciones válidas después de', maxAttempts, 'intentos');
    return [];
}

/**
 * Mezcla un array aleatoriamente (algoritmo Fisher-Yates)
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * Actualiza la interfaz de usuario
 */
function updateUI() {
    updateParticipantsList();
    updateParticipantsCount();
    updateButtons();
}

/**
 * Actualiza la lista visual de participantes
 */
function updateParticipantsList() {
    if (participants.length === 0) {
        participantsList.innerHTML = '<li class="empty-state">No hay participantes aún. ¡Agrega algunos nombres!</li>';
        return;
    }

    participantsList.innerHTML = participants.map((participant, index) => `
        <li class="slide-in">
            <div>
                <strong>${participant.name}</strong>
                <div class="participant-phone">
                    <span class="country-flag">${participant.flag}</span>
                    ${participant.phone}
                </div>
            </div>
            <button class="remove-btn" onclick="removeParticipant(${index})" title="Eliminar participante">
                ✕
            </button>
        </li>
    `).join('');
}

/**
 * Actualiza el contador de participantes
 */
function updateParticipantsCount() {
    const count = participants.length;
    participantsCount.textContent = `${count} participante${count !== 1 ? 's' : ''}`;
}

/**
 * Actualiza el estado de los botones
 */
function updateButtons() {
    const hasParticipants = participants.length > 0;
    // Permitir que el botón generateBtn siempre esté habilitado para mostrar validaciones

    clearBtn.disabled = false; // Siempre habilitado para mostrar mensaje cuando está vacío
    generateBtn.disabled = false; // Siempre habilitado para mostrar validaciones
}

/**
 * Muestra los resultados de las asignaciones de amigo secreto
 */
function displayResults() {
    if (assignments.length === 0) return;

    // Mostrar mensaje de completación
    completionMessage.style.display = 'block';

    // Mostrar solo las asignaciones sin el header repetido
    pairsList.innerHTML = `
        ${assignments.map((assignment, index) => `
            <div class="participant-result fade-in" style="animation-delay: ${index * 0.1}s">
                <div class="participant-info">
                    <div class="participant-name">👤 ${assignment.giver.name}</div>
                    <div class="participant-phone">${assignment.giver.flag} ${assignment.giver.phone}</div>
                    <div class="assignment-action">
                        <div class="access-info">
                            <div class="access-code-box">
                                <label><strong>🔑 Código de Acceso:</strong></label>
                                <div class="code-display">${assignment.accessCode}</div>
                            </div>
                            <div class="link-box">
                                <label><strong>🔗 Enlace Único:</strong></label>
                                <input type="text" class="link-input" value="${assignment.uniqueLink}" readonly>
                                <button onclick="copyAccessInfo('${assignment.uniqueLink}', '${assignment.accessCode}', '${assignment.giver.name}')" 
                                        class="copy-btn">
                                    📋 Copiar Todo
                                </button>
                            </div>
                        </div>
                        <div class="action-buttons">
                            <button onclick="sendWhatsAppWithCode('${assignment.giver.phone}', '${assignment.uniqueLink}', '${assignment.accessCode}', '${assignment.giver.name}')" 
                                    class="whatsapp-btn">
                                📱 Enviar por WhatsApp
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('')}
    `;

    resultsSection.style.display = 'block';

    // Hacer scroll hacia el mensaje de completación primero
    completionMessage.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Oculta la sección de resultados
 */
function hideResults() {
    resultsSection.style.display = 'none';
    completionMessage.style.display = 'none';
}

/**
 * Genera un ID secreto único para cada asignación
 */
function generateSecretId(giverName, receiverName) {
    const timestamp = Date.now() + performance.now();
    const random1 = Math.random().toString(36).substring(2, 15);
    const random2 = Math.random().toString(36).substring(2, 15);
    const random3 = (Math.random() * timestamp).toString(36);

    // Crear hash más único
    const combined = random1 + giverName + timestamp + receiverName + random2 + random3;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }

    const hashStr = Math.abs(hash).toString(36);
    const extraRandom = Math.random().toString(36).substring(2, 8);

    let secretId = (hashStr + extraRandom).replace(/[^a-zA-Z0-9]/g, '');

    // Tomar 12 caracteres de una posición aleatoria
    if (secretId.length >= 12) {
        const startPos = Math.floor(Math.random() * (secretId.length - 12));
        secretId = secretId.substring(startPos, startPos + 12);
    } else {
        // Si es muy corto, agregar más aleatoriedad
        while (secretId.length < 12) {
            const extraRandom = Math.random().toString(36).substring(2, 8);
            secretId += extraRandom.replace(/[^a-zA-Z0-9]/g, '');
        }
        secretId = secretId.substring(0, 12);
    }

    return secretId.substring(0, 12);
}

/**
 * Genera un código único de acceso para cada participante
 */
function generateAccessCode(participantName) {
    // Crear múltiples fuentes de aleatoriedad con timestamp de microsegundos
    const timestamp = Date.now().toString() + performance.now().toString().replace('.', '');
    const randomPart1 = Math.random().toString(36).substring(2, 12);
    const randomPart2 = Math.random().toString(36).substring(2, 12);
    const randomPart3 = (Math.random() * 9999999).toString(36);
    const extraEntropy = (Math.random() * timestamp.length).toString(36);

    // Combinar de forma más aleatoria
    const combined = randomPart1 + timestamp + randomPart2 + participantName + randomPart3 + extraEntropy;

    // Usar hash más complejo
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convertir a 32-bit integer
    }

    // Convertir hash a string alfanumérico
    const hashStr = Math.abs(hash).toString(36).toUpperCase();

    // Agregar más aleatoriedad
    const moreRandom = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Combinar y crear código final
    let code = (hashStr + moreRandom).replace(/[^A-Z0-9]/g, '');

    // Asegurar que tenga exactamente 6 caracteres únicos
    if (code.length < 6) {
        // Agregar más caracteres aleatorios si es necesario
        while (code.length < 6) {
            const extra = Math.random().toString(36).substring(2, 3).toUpperCase();
            if (/[A-Z0-9]/.test(extra)) {
                code += extra;
            }
        }
    }

    // Tomar 6 caracteres de una posición aleatoria
    const startPos = Math.floor(Math.random() * Math.max(1, code.length - 6));
    code = code.substring(startPos, startPos + 6);

    // Si aún no tiene 6 caracteres, llenar con aleatorios
    while (code.length < 6) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    console.log(`🔑 Código generado para ${participantName}: ${code} (timestamp: ${timestamp})`);
    return code;
}

/**
 * Genera un enlace único para cada participante con su código de acceso
 */
function generateUniqueLink(assignment, accessCode) {
    // Detectar si estamos en Netlify, localhost o producción
    let baseUrl;

    if (window.location.hostname.includes('.netlify.app') || window.location.hostname.includes('.netlify.com')) {
        // URL de Netlify
        baseUrl = window.location.origin;
    } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // Desarrollo local
        baseUrl = window.location.origin + window.location.pathname;
    } else {
        // Otro hosting o dominio personalizado
        baseUrl = window.location.origin + window.location.pathname;
    }

    // Limpiar la URL base para asegurar que termine correctamente
    if (baseUrl.endsWith('/index.html')) {
        baseUrl = baseUrl.replace('/index.html', '');
    }
    if (!baseUrl.endsWith('/')) {
        baseUrl += '/';
    }

    const secretId = assignment.secretId || generateSecretId(assignment.giver.name, assignment.receiver.name);

    // Para Netlify, usamos la raíz del sitio
    return `${baseUrl}?participant=${encodeURIComponent(assignment.giver.name)}&secret=${secretId}&code=${accessCode}`;
}

/**
 * Revela la asignación individual cuando alguien hace clic en su enlace
 */
function revealAssignment(secretId) {
    // Buscar la asignación correspondiente al ID secreto
    const assignment = assignments.find(a => {
        const expectedId = generateSecretId(a.giver.name, a.receiver.name);
        return expectedId === secretId;
    });

    if (!assignment) {
        showNotification('Enlace inválido o expirado', 'error');
        return;
    }

    // Mostrar la asignación en una ventana modal
    const modal = document.createElement('div');
    modal.className = 'secret-modal';
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal()"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h2>🎁 ¡Tu Amigo Secreto! 🎄</h2>
            </div>
            <div class="modal-body">
                <p><strong>¡Hola ${assignment.giver.name}!</strong></p>
                <div class="secret-reveal">
                    <p>Tu amigo secreto es:</p>
                    <h3 class="receiver-name">🎯 ${assignment.receiver.name}</h3>
                </div>
                <div class="instructions">
                    <h4>🎅 Instrucciones:</h4>
                    <ul>
                        <li>🛍️ Compra un regalo para <strong>${assignment.receiver.name}</strong></li>
                        <li>🤫 Mantén el secreto hasta el día del intercambio</li>
                        <li>🎁 ¡Diviértete eligiendo el regalo perfecto!</li>
                    </ul>
                </div>
            </div>
            <div class="modal-footer">
                <button onclick="closeModal()" class="close-btn">
                    ✅ Entendido
                </button>
                <button onclick="copyToClipboard('${assignment.giver.name}', '${assignment.receiver.name}')" class="copy-btn">
                    📋 Copiar Información
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.style.display = 'flex';
}

/**
 * Cierra el modal de revelación
 */
function closeModal() {
    const modal = document.querySelector('.secret-modal');
    if (modal) {
        modal.remove();
    }
}

/**
 * Copia la información del amigo secreto al portapapeles
 */
function copyToClipboard(giverName, receiverName) {
    const message = `🎄 ¡Tu Amigo Secreto Navideño! 🎁

¡Hola ${giverName}!

🎯 Tu amigo secreto es: ${receiverName}

🎅 Instrucciones:
🛍️ Compra un regalo para ${receiverName}
🤫 Mantén el secreto hasta el día del intercambio
🎁 ¡Diviértete eligiendo el regalo perfecto!

¡Feliz Navidad! 🎄✨`;

    // Copiar al portapapeles
    if (navigator.clipboard && window.isSecureContext) {
        // Usar la API moderna de portapapeles
        navigator.clipboard.writeText(message).then(() => {
            showNotification('Información copiada al portapapeles', 'success');
        }).catch(() => {
            fallbackCopyTextToClipboard(message);
        });
    } else {
        // Fallback para navegadores más antiguos
        fallbackCopyTextToClipboard(message);
    }

    closeModal();
}

/**
 * Copia el enlace único y código de acceso al portapapeles
 */
function copyAccessInfo(uniqueLink, accessCode, participantName) {
    const message = `🎄 ¡Tu Acceso al Amigo Secreto Navideño! 🎁

¡Hola ${participantName}!

🔗 Tu enlace único: ${uniqueLink}

🔑 Tu código de acceso: ${accessCode}

📱 Instrucciones:
1. Haz clic en el enlace
2. Ingresa tu código de acceso
3. ¡Descubre quién es tu amigo secreto!

🎅 ¡Mantén tu código en secreto!
¡Feliz Navidad! 🎄✨`;

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(message).then(() => {
            showNotification(`¡Información de acceso copiada para ${participantName}!`, 'success');
        }).catch(() => {
            fallbackCopyTextToClipboard(message);
        });
    } else {
        fallbackCopyTextToClipboard(message);
    }
}

/**
 * Envía información de acceso por WhatsApp
 */
function sendWhatsAppWithCode(phone, uniqueLink, accessCode, participantName) {
    const message = `🎄 ¡Hola ${participantName}! 🎁

¡Es hora del Amigo Secreto Navideño!

🔗 Tu enlace único: ${uniqueLink}

🔑 Tu código secreto: ${accessCode}

📱 Instrucciones:
1️⃣ Haz clic en el enlace
2️⃣ Ingresa tu código cuando te lo pida
3️⃣ ¡Descubre quién es tu amigo secreto!

🤫 ¡Mantén tu código en secreto!
🎅 ¡Ho Ho Ho! 🎄✨`;

    const encodedMessage = encodeURIComponent(message);
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
    showNotification(`¡Abriendo WhatsApp para ${participantName}!`, 'success');
}

/**
 * Función fallback para copiar texto al portapapeles
 */
function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        document.execCommand('copy');
        showNotification('Información copiada al portapapeles', 'success');
    } catch (err) {
        showNotification('No se pudo copiar. Selecciona y copia manualmente', 'error');
    }

    document.body.removeChild(textArea);
}

/**
 * Genera archivos de texto individuales para cada participante
 */
function generateTextFiles() {
    if (assignments.length === 0) {
        showNotification('No hay asignaciones para generar archivos', 'error');
        return;
    }

    const container = document.getElementById('filesContainer');
    container.style.display = 'block';
    container.innerHTML = `
        <h3>📄 Archivos de Texto Generados</h3>
        <p>Haz clic en cada archivo para descargarlo y enviárselo a la persona correspondiente:</p>
        <div class="files-list">
            ${assignments.map((assignment, index) => `
                <div class="file-item fade-in" style="animation-delay: ${index * 0.1}s">
                    <div class="file-info">
                        <span class="file-icon">📄</span>
                        <span class="file-name">${assignment.giver.name}_AmigoSecreto.txt</span>
                    </div>
                    <button onclick="downloadTextFile('${assignment.giver.name}', '${assignment.receiver.name}')" 
                            class="download-btn">
                        ⬇️ Descargar
                    </button>
                </div>
            `).join('')}
        </div>
        <div style="margin-top: 2rem; padding: 1rem; background: rgba(255, 215, 0, 0.1); border-radius: var(--border-radius); border: 2px solid var(--christmas-gold);">
            <p><strong>📧 Instrucciones:</strong></p>
            <ul>
                <li>Descarga cada archivo haciendo clic en "Descargar"</li>
                <li>Envía cada archivo SOLO a la persona correspondiente</li>
                <li>Puedes enviarlo por WhatsApp, correo, o cualquier medio privado</li>
                <li>¡No abras los archivos para mantener el secreto!</li>
            </ul>
        </div>
    `;

    showNotification(`${assignments.length} archivos listos para descargar`, 'success');
}

/**
 * Descarga un archivo de texto individual
 */
function downloadTextFile(giverName, receiverName) {
    const content = `🎄 ¡Tu Amigo Secreto Navideño! 🎁

¡Hola ${giverName}!

🎯 Tu amigo secreto es: ${receiverName}

🎅 Instrucciones:
🛍️ Compra un regalo para ${receiverName}
🤫 Mantén el secreto hasta el día del intercambio
🎁 ¡Diviértete eligiendo el regalo perfecto!

¡Feliz Navidad! 🎄✨

---
Generado el: ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}`;

    // Crear y descargar el archivo
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${giverName}_AmigoSecreto.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showNotification(`Archivo descargado para ${giverName}`, 'success');
}

/**
 * Genera enlaces únicos para cada participante
 */
function generateUniqueLinks() {
    if (assignments.length === 0) {
        showNotification('No hay asignaciones para generar enlaces', 'error');
        return;
    }

    const container = document.getElementById('filesContainer');
    container.style.display = 'block';
    container.innerHTML = `
        <h3>🔗 Enlaces Únicos Generados</h3>
        <p>Copia cada enlace y envíaselo SOLO a la persona correspondiente:</p>
        <div class="files-list">
            ${assignments.map((assignment, index) => {
        // Codificar la información de forma segura
        const assignmentData = {
            giver: assignment.giver.name,
            receiver: assignment.receiver.name,
            phone: assignment.receiver.phone,
            country: assignment.receiver.country
        };

        // Codificar en base64 y luego URL encode para mayor seguridad
        const encodedData = encodeURIComponent(btoa(JSON.stringify(assignmentData)));

        // Generar URL usando la ubicación actual (funciona tanto local como en producción)
        const baseUrl = window.location.href.split('?')[0]; // Quita parámetros existentes
        const linkUrl = `${baseUrl}?data=${encodedData}`;

        return `
                <div class="file-item fade-in" style="animation-delay: ${index * 0.1}s">
                    <div class="file-info">
                        <span class="file-icon">🔗</span>
                        <span class="file-name">Enlace para ${assignment.giver.name}</span>
                    </div>
                    <button onclick="copyLinkToClipboard('${linkUrl}', '${assignment.giver.name}')" 
                            class="download-btn">
                        📋 Copiar Enlace
                    </button>
                </div>
            `;
    }).join('')}
        </div>
        <div style="margin-top: 2rem; padding: 1rem; background: rgba(52, 152, 219, 0.1); border-radius: var(--border-radius); border: 2px solid #3498db;">
            <p><strong>🔗 Instrucciones para Netlify:</strong></p>
            <ul>
                <li>✅ Copia cada enlace haciendo clic en "Copiar Enlace"</li>
                <li>✅ Envía cada enlace SOLO a la persona correspondiente por WhatsApp, email, etc.</li>
                <li>✅ Los enlaces funcionan perfectamente en Netlify</li>
                <li>✅ Cuando abran el enlace, verán automáticamente su asignación</li>
                <li>🔒 Los enlaces son únicos, seguros y funcionan desde cualquier dispositivo</li>
            </ul>
        </div>
    `;

    showNotification(`${assignments.length} enlaces únicos generados para Netlify`, 'success');
}

/**
 * Copia un enlace único al portapapeles
 */
function copyLinkToClipboard(linkUrl, giverName) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(linkUrl).then(() => {
            showNotification(`Enlace copiado para ${giverName}`, 'success');
        }).catch(() => {
            fallbackCopyTextToClipboard(linkUrl);
            showNotification(`Enlace copiado para ${giverName}`, 'success');
        });
    } else {
        fallbackCopyTextToClipboard(linkUrl);
        showNotification(`Enlace copiado para ${giverName}`, 'success');
    }
}

/**
 * Descarga los resultados como archivo de texto
 */
function downloadResults() {
    if (assignments.length === 0) {
        showNotification('No hay resultados para descargar', 'error');
        return;
    }

    const currentDate = new Date().toLocaleDateString('es-ES');
    let content = `🎄 AMIGO SECRETO NAVIDEÑO 🎁\n`;
    content += `Fecha: ${currentDate}\n`;
    content += `Total de participantes: ${participants.length}\n`;
    content += `Total de asignaciones: ${assignments.length}\n\n`;
    content += `===== ASIGNACIONES DE AMIGO SECRETO =====\n\n`;

    assignments.forEach((assignment) => {
        content += `${assignment.giverNumber}. ${assignment.giver.name} ➡️ le da regalo a ➡️ ${assignment.receiver.name}\n`;
    });

    content += `\n===== LISTA COMPLETA DE PARTICIPANTES =====\n\n`;
    participants.forEach((participant, index) => {
        content += `${index + 1}. ${participant.name} - ${participant.flag} ${participant.phone}\n`;
    });

    content += `\n===== INSTRUCCIONES =====\n\n`;
    content += `Cada participante debe darle un regalo a la persona asignada.\n`;
    content += `¡Mantén en secreto a quién le toca dar regalo!\n`;
    content += `\n¡Feliz Navidad y que disfruten el intercambio de regalos! 🎄`;

    // Crear y descargar el archivo
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `amigo-secreto-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showNotification('¡Resultados descargados exitosamente!', 'success');
}

/**
 * Genera un enlace de WhatsApp para una asignación específica
 */
function generateWhatsAppLink(assignment) {
    const message = `🎄 ¡Hola ${assignment.giver.name}! 🎁

¡Es hora del Amigo Secreto Navideño!

🎯 **Tu misión secreta es:**
Conseguir un regalo para alguien especial... 

🤫 ¡Revisa las asignaciones que se generaron!
🎅 ¡Que disfrutes esta Navidad!

¡Ho Ho Ho! 🎄✨`;

    const encodedMessage = encodeURIComponent(message);
    // Limpiar el número de teléfono (quitar todo excepto números y +)
    const cleanPhone = assignment.giver.phone.replace(/[^\d+]/g, '');

    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

/**
 * Envía todos los mensajes de WhatsApp
 */
function sendAllWhatsApp() {
    // Validar que haya participantes en la lista
    if (participants.length === 0) {
        Swal.fire({
            title: '¡Lista vacía!',
            text: 'Primero debes agregar personas a la lista para poder hacer el intercambio.',
            icon: 'warning',
            customClass: {
                popup: 'swal-christmas',
                confirmButton: 'swal-confirm-btn'
            },
            confirmButtonText: '¡Entendido!'
        });
        return;
    }

    // Validar que haya al menos 2 participantes
    if (participants.length === 1) {
        Swal.fire({
            title: '¡Faltan participantes!',
            text: 'Se necesitan mínimo 2 personas para poder hacer el intercambio de regalos.',
            icon: 'info',
            customClass: {
                popup: 'swal-christmas',
                confirmButton: 'swal-confirm-btn'
            },
            confirmButtonText: 'Agregar más personas'
        });
        return;
    }

    // Validar que se hayan generado las asignaciones
    if (assignments.length === 0) {
        showNotification('Primero debes generar las asignaciones', 'error');
        return;
    }

    let sentCount = 0;
    const totalMessages = assignments.length;

    assignments.forEach((assignment, index) => {
        setTimeout(() => {
            const link = generateWhatsAppLink(assignment);
            window.open(link, '_blank');
            sentCount++;

            if (sentCount === totalMessages) {
                showNotification(`¡${totalMessages} mensajes de WhatsApp enviados!`, 'success');
            }
        }, index * 1000); // Esperar 1 segundo entre cada mensaje
    });

    showNotification(`Enviando ${totalMessages} mensajes de WhatsApp...`, 'info');
}

/**
 * Muestra notificaciones al usuario
 */
function showNotification(message, type = 'info') {
    // Eliminar notificaciones existentes
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(n => n.remove());

    // Crear nueva notificación
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Estilos para la notificación
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 1000;
        max-width: 300px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        animation: slideInRight 0.3s ease-out;
    `;

    // Colores según el tipo
    switch (type) {
        case 'success':
            notification.style.background = 'linear-gradient(135deg, var(--christmas-green), var(--christmas-dark-green))';
            break;
        case 'error':
            notification.style.background = 'linear-gradient(135deg, var(--christmas-red), var(--christmas-dark-red))';
            break;
        case 'info':
            notification.style.background = 'linear-gradient(135deg, #3498db, #2980b9)';
            break;
        default:
            notification.style.background = 'linear-gradient(135deg, #95a5a6, #7f8c8d)';
    }

    // Agregar animación CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;

    if (!document.querySelector('#notification-styles')) {
        style.id = 'notification-styles';
        document.head.appendChild(style);
    }

    // Agregar al DOM
    document.body.appendChild(notification);

    // Auto-remover después de 3 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);

    // Permitir cerrar haciendo click
    notification.addEventListener('click', () => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    });
}

/**
 * Regenera completamente el sistema - Borra TODO y empezar de cero
 */
function regenerateSystem() {
    console.log('🔄 Función regenerateSystem() ejecutada');

    // Verificar que SweetAlert2 esté disponible
    if (typeof Swal === 'undefined') {
        alert('⚠️ Se requiere confirmar esta acción crítica');
        if (confirm('🚨 REGENERAR SISTEMA COMPLETO\n\n¿Estás SEGURO de que quieres:\n- Borrar TODOS los participantes\n- Eliminar TODAS las asignaciones\n- Limpiar TODOS los datos guardados\n- Empezar completamente de cero?\n\nEsta acción NO se puede deshacer.')) {
            executeCompleteReset();
        }
        return;
    }

    // Mostrar confirmación con SweetAlert2
    Swal.fire({
        title: '🚨 REGENERAR SISTEMA COMPLETO',
        html: `
            <div style="text-align: left; margin: 1rem 0;">
                <p><strong>⚠️ ATENCIÓN: Esta acción es IRREVERSIBLE</strong></p>
                <div style="background: rgba(220, 53, 69, 0.1); padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                    <p><strong>Se eliminará PERMANENTEMENTE:</strong></p>
                    <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
                        <li>❌ Todos los participantes de la lista</li>
                        <li>❌ Todas las asignaciones generadas</li>
                        <li>❌ Todos los enlaces únicos existentes</li>
                        <li>❌ Todos los códigos de acceso</li>
                        <li>❌ Datos guardados en el navegador</li>
                    </ul>
                </div>
                <div style="background: rgba(40, 167, 69, 0.1); padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                    <p><strong>✅ Después de regenerar:</strong></p>
                    <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
                        <li>✨ Sistema completamente limpio</li>
                        <li>🆕 Listo para nueva temporada</li>
                        <li>🔄 Todos los enlaces anteriores dejarán de funcionar</li>
                    </ul>
                </div>
                <p style="color: #dc3545; font-weight: bold; text-align: center; margin-top: 1rem;">
                    ¿Estás SEGURO de continuar?
                </p>
            </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '🗑️ SÍ, REGENERAR TODO',
        cancelButtonText: '❌ Cancelar',
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        reverseButtons: true,
        focusCancel: true
    }).then((result) => {
        if (result.isConfirmed) {
            // Doble confirmación para mayor seguridad
            Swal.fire({
                title: '🔐 CONFIRMACIÓN FINAL',
                text: 'Escribe "REGENERAR" para confirmar que entiendes que esta acción es irreversible:',
                input: 'text',
                inputPlaceholder: 'Escribe: REGENERAR',
                showCancelButton: true,
                confirmButtonText: '✅ Ejecutar Regeneración',
                cancelButtonText: '❌ Cancelar',
                confirmButtonColor: '#dc3545',
                cancelButtonColor: '#6c757d',
                inputValidator: (value) => {
                    if (!value || value.toUpperCase() !== 'REGENERAR') {
                        return 'Debes escribir exactamente "REGENERAR" para continuar';
                    }
                }
            }).then((confirmResult) => {
                if (confirmResult.isConfirmed) {
                    executeCompleteReset();
                }
            });
        }
    });
}

/**
 * Ejecuta el reseteo completo del sistema
 */
function executeCompleteReset() {
    console.log('🚨 Ejecutando regeneración completa del sistema...');

    try {
        // 1. Limpiar variables globales
        participants = [];
        assignments = [];

        // 2. Limpiar COMPLETAMENTE el localStorage
        if (typeof (Storage) !== "undefined" && localStorage) {
            // Limpiar TODAS las claves relacionadas con el sistema
            const keysToRemove = [];

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (
                    key.startsWith('assignment_') ||
                    key.startsWith('secretSanta') ||
                    key.includes('amigo') ||
                    key.includes('secreto') ||
                    key.includes('Code') ||
                    key.includes('Access')
                )) {
                    keysToRemove.push(key);
                }
            }

            // Eliminar todas las claves encontradas
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
            });

            // También limpiar cualquier caché de códigos adicional
            localStorage.removeItem('lastGeneratedCodes');
            localStorage.removeItem('codeCache');
            localStorage.removeItem('accessCodes');

            console.log(`🗑️ ${keysToRemove.length} entradas eliminadas del localStorage + caché de códigos`);
        }

        // 3. Limpiar variables temporales
        if (window.tempAssignments) {
            delete window.tempAssignments;
        }

        // 4. Resetear interfaz de usuario
        updateUI();
        hideResults();

        // 5. Limpiar inputs
        if (nameInput) nameInput.value = '';
        if (phoneInput) phoneInput.value = '';
        if (nameInput) nameInput.focus();

        // 6. Mostrar confirmación
        showNotification('✅ Sistema regenerado completamente. Todos los datos eliminados.', 'success');
        console.log('✅ Regeneración del sistema completada exitosamente');

    } catch (error) {
        console.error('❌ Error durante la regeneración:', error);
        alert('❌ Error en la regeneración. Recarga la página e intenta nuevamente.');
        window.location.reload();
    }
}

/**
 * Limpia asignaciones expiradas del localStorage
 */
function cleanExpiredAssignments() {
    try {
        if (typeof (Storage) !== "undefined" && localStorage) {
            const now = Date.now();
            const oneYear = 365 * 24 * 60 * 60 * 1000;
            let cleaned = 0;

            // Revisar todas las claves del localStorage
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);

                if (key && key.startsWith('assignment_')) {
                    try {
                        const data = JSON.parse(localStorage.getItem(key));

                        // Si la asignación es más antigua de 1 año, eliminarla
                        if (data.timestamp && (now - data.timestamp) > oneYear) {
                            localStorage.removeItem(key);
                            cleaned++;
                        }
                    } catch (error) {
                        // Si hay error al parsear, eliminar la clave corrupta
                        localStorage.removeItem(key);
                        cleaned++;
                    }
                }
            }

            if (cleaned > 0) {
                console.log(`🗑️ ${cleaned} asignaciones expiradas limpiadas del localStorage`);
            }
        }
    } catch (error) {
        console.error('❌ Error al limpiar asignaciones expiradas:', error);
    }
}

/**
 * Muestra información sobre asignaciones guardadas
 */
function showStorageInfo() {
    try {
        if (typeof (Storage) !== "undefined" && localStorage) {
            let assignmentCount = 0;
            let totalSize = 0;
            let oldestDate = null;
            let newestDate = null;

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('assignment_')) {
                    assignmentCount++;
                    const data = localStorage.getItem(key);
                    totalSize += data.length;

                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.timestamp) {
                            const date = new Date(parsed.timestamp);
                            if (!oldestDate || date < oldestDate) oldestDate = date;
                            if (!newestDate || date > newestDate) newestDate = date;
                        }
                    } catch (e) {
                        // Ignorar errores de parsing
                    }
                }
            }

            console.log('📊 Información del almacenamiento:');
            console.log(`   Asignaciones guardadas: ${assignmentCount}`);
            console.log(`   Tamaño aproximado: ${(totalSize / 1024).toFixed(2)} KB`);
            if (oldestDate) console.log(`   Más antigua: ${oldestDate.toLocaleDateString()}`);
            if (newestDate) console.log(`   Más reciente: ${newestDate.toLocaleDateString()}`);

            return {
                count: assignmentCount,
                size: totalSize,
                oldest: oldestDate,
                newest: newestDate
            };
        }
    } catch (error) {
        console.error('❌ Error al obtener información del almacenamiento:', error);
    }
    return { count: 0, size: 0, oldest: null, newest: null };
}

/**
 * Muestra estadísticas detalladas del sistema
 */
function showSystemStats() {
    const stats = showStorageInfo();

    if (typeof Swal !== 'undefined') {
        const formatDate = (date) => date ? date.toLocaleDateString('es-ES') : 'N/A';

        Swal.fire({
            title: '📊 Estadísticas del Sistema',
            html: `
                <div style="text-align: left;">
                    <h4>📈 Estado Actual:</h4>
                    <ul>
                        <li><strong>Participantes en lista:</strong> ${participants.length}</li>
                        <li><strong>Asignaciones en memoria:</strong> ${assignments.length}</li>
                    </ul>
                    
                    <h4>💾 Almacenamiento Permanente:</h4>
                    <ul>
                        <li><strong>Asignaciones guardadas:</strong> ${stats.count}</li>
                        <li><strong>Espacio usado:</strong> ${(stats.size / 1024).toFixed(2)} KB</li>
                        <li><strong>Más antigua:</strong> ${formatDate(stats.oldest)}</li>
                        <li><strong>Más reciente:</strong> ${formatDate(stats.newest)}</li>
                    </ul>
                    
                    ${stats.count > 0 ?
                    '<div style="background: rgba(255, 193, 7, 0.1); padding: 1rem; border-radius: 8px; margin-top: 1rem;"><p><strong>⚠️ Hay asignaciones activas</strong><br>Los enlaces únicos están funcionando para participantes.</p></div>' :
                    '<div style="background: rgba(40, 167, 69, 0.1); padding: 1rem; border-radius: 8px; margin-top: 1rem;"><p><strong>✅ Sistema limpio</strong><br>No hay asignaciones permanentes guardadas.</p></div>'
                }
                </div>
            `,
            icon: 'info',
            confirmButtonText: '👍 Entendido',
            showDenyButton: stats.count > 0,
            denyButtonText: '🗑️ Regenerar Sistema',
            denyButtonColor: '#dc3545'
        }).then((result) => {
            if (result.isDenied) {
                regenerateSystem();
            }
        });
    } else {
        console.log('📊 Estadísticas del Sistema:');
        console.log(`Participantes: ${participants.length}, Asignaciones: ${assignments.length}`);
        console.log(`Almacenadas: ${stats.count}, Tamaño: ${(stats.size / 1024).toFixed(2)} KB`);
    }
}

/**
 * Valida si un nombre es válido
 */
function isValidName(name) {
    return name &&
        name.trim().length > 0 &&
        name.trim().length <= 30 &&
        /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(name.trim());
}

/**
 * Valida si un número de teléfono es válido
 */
function isValidPhone(phone) {
    // Solo acepta números, sin códigos de país (esos ya vienen del selector)
    const phoneRegex = /^[0-9]{7,12}$/;
    const cleanPhone = phone.replace(/\D/g, '');
    return phoneRegex.test(cleanPhone);
}

/**
 * Formatea un número de teléfono (ya no es necesario porque usamos el selector)
 */
function formatPhone(phone) {
    return phone.replace(/\D/g, '');
}

/**
 * Formatea un nombre (primera letra en mayúscula)
 */
function formatName(name) {
    return name.trim()
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// ===== EASTER EGGS Y FUNCIONES ADICIONALES =====

/**
 * Añade efectos especiales durante las festividades
 */
function addHolidayEffects() {
    const today = new Date();
    const isChristmasTime = (today.getMonth() === 11 && today.getDate() >= 20) ||
        (today.getMonth() === 0 && today.getDate() <= 6);

    if (isChristmasTime) {
        document.body.classList.add('christmas-time');
        console.log('🎄 ¡Es temporada navideña! ¡Que disfrutes tu amigo secreto! 🎁');
    }
}

/**
 * Estadísticas de uso (solo para desarrolladores)
 */
function logStatistics() {
    console.log(`📊 Estadísticas del Amigo Secreto:
    👥 Participantes: ${participants.length}
    🎁 Asignaciones generadas: ${assignments.length}
    📱 Con WhatsApp integrado
    🎲 Última generación: ${new Date().toLocaleString('es-ES')}
    🎄 ¡Feliz Navidad!`);
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function () {
    addHolidayEffects();
    console.log('🎄 Amigo Secreto Navideño cargado correctamente! 🎁');
});

// Registrar estadísticas cuando se generen asignaciones
const originalGeneratePairs = generatePairs;
generatePairs = function () {
    originalGeneratePairs();
    if (assignments.length > 0) {
        logStatistics();
    }
};

// ===== FUNCIÓN PARA MANEJAR ENLACES ÚNICOS =====

/**
 * Verifica si hay parámetros en la URL para mostrar una asignación específica
 */
function checkForAssignment() {
    const urlParams = new URLSearchParams(window.location.search);
    const participant = urlParams.get('participant');
    const secret = urlParams.get('secret');
    const code = urlParams.get('code');

    // Detectar si es móvil y agregar logging
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    console.log('Dispositivo detectado:', isMobile ? 'MÓVIL' : 'DESKTOP');
    console.log('Parámetros URL:', { participant, secret, code });

    if (participant && secret && code) {
        // Ocultar el formulario principal
        document.querySelector('.container').style.display = 'none';

        // Mostrar modal para verificar código de acceso
        showAccessCodeModal(participant, secret, code);
    } else if (urlParams.get('data')) {
        // Mantener compatibilidad con enlaces antiguos
        const assignmentData = urlParams.get('data');
        try {
            const decoded = decodeURIComponent(assignmentData);
            const assignment = JSON.parse(atob(decoded));
            document.querySelector('.container').style.display = 'none';
            showPersonalAssignment(assignment);
        } catch (error) {
            console.error('Error al procesar el enlace:', error);
            showError('Enlace inválido o corrupto');
        }
    }
}

/**
 * Muestra el modal para verificar el código de acceso
 */
function showAccessCodeModal(participant, secret, expectedCode) {
    const modal = document.createElement('div');
    modal.className = 'access-modal';
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeAccessModal()"></div>
        <div class="modal-content access-modal-content">
            <div class="modal-header">
                <h2>🔐 Acceso Seguro al Amigo Secreto</h2>
            </div>
            <div class="modal-body">
                <p><strong>¡Hola ${participant || 'Usuario'}!</strong></p>
                <p>Para acceder a tu asignación de Amigo Secreto, ingresa tu código de acceso:</p>
                <div class="code-input-section">
                    <label for="accessCodeInput">🔑 Código de Acceso:</label>
                    <input type="text" id="accessCodeInput" placeholder="Ingresa tu código" maxlength="6" 
                           style="text-transform: uppercase; text-align: center; font-size: 1.2em; letter-spacing: 0.3em;">
                    <div class="code-hint">Tu código tiene 6 caracteres</div>
                </div>
            </div>
            <div class="modal-footer">
            <button id="verifyAccessBtn" class="verify-btn">
            ✅ Verificar Código
            </button>
            <button onclick="closeAccessModal()" class="close-btn">
                ❌ Cancelar
            </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.style.display = 'flex';

    // Agregar event listener seguro para el botón
    document.getElementById('verifyAccessBtn').addEventListener('click', function() {
        verifyAccessCode(participant, secret, expectedCode);
    });

    // Focus en el input del código
    setTimeout(() => {
        document.getElementById('accessCodeInput').focus();
    }, 100);

    // Permitir verificar con Enter
    document.getElementById('accessCodeInput').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            verifyAccessCode(participant, secret, expectedCode);
        }
    });
}

/**
 * Verifica el código de acceso ingresado
 */
function verifyAccessCode(participant, secret, expectedCode) {
    // Validar parámetros
    if (!participant || !secret || !expectedCode) {
        console.error('Parámetros inválidos:', { participant, secret, expectedCode });
        showNotification('❌ Error en los parámetros de acceso. Intenta nuevamente.', 'error');
        return;
    }

    const enteredCode = document.getElementById('accessCodeInput').value.trim().toUpperCase();

    if (!enteredCode) {
        showNotification('Por favor ingresa tu código de acceso', 'warning');
        return;
    }

    if (enteredCode === expectedCode.toUpperCase()) {
        // Código correcto, buscar la asignación real
        closeAccessModal();

        // Buscar en las asignaciones almacenadas localmente
        const assignment = findAssignmentBySecret(participant, secret);

        if (assignment) {
            showPersonalAssignment(assignment);
        } else {
            // Si no hay asignaciones locales, crear fallback normalizado
            const fallbackAssignment = normalizeAssignmentForMobile({
                giver: { name: participant },
                receiver: { name: '🎁 ¡Tu Amigo Secreto te está esperando!' },
                message: 'Las asignaciones han sido generadas correctamente. Contacta al organizador si tienes problemas para ver tu asignación.'
            });
            showPersonalAssignment(fallbackAssignment);
        }

    } else {
        showNotification('❌ Código incorrecto. Verifica e intenta de nuevo.', 'error');
        document.getElementById('accessCodeInput').value = '';
        document.getElementById('accessCodeInput').focus();
    }
}

/**
 * Busca una asignación por participante y secreto
 */
function findAssignmentBySecret(participant, secret) {
    // 1. Buscar en las asignaciones actuales en memoria
    if (assignments && assignments.length > 0) {
        const found = assignments.find(assignment =>
            assignment.giver.name === participant && assignment.secretId === secret
        );
        if (found) return found;
    }

    // 2. Buscar asignación individual permanente (método más confiable)
    try {
        const assignmentKey = `assignment_${secret}`;
        const savedAssignment = localStorage.getItem(assignmentKey);

        if (savedAssignment) {
            console.log('Raw localStorage data:', savedAssignment);
            const assignment = JSON.parse(savedAssignment);
            console.log('Parsed assignment:', assignment);

            // Verificar que no haya expirado
            if (assignment.timestamp && assignment.timestamp > Date.now() - (365 * 24 * 60 * 60 * 1000)) {
                // Verificar que corresponda al participante correcto
                const assignmentGiverName = assignment.giver?.name || assignment.giver || '';
                console.log('Comparando participantes:', { participant, assignmentGiverName, assignment });
                
                if (assignmentGiverName === participant) {
                    console.log('✅ Asignación encontrada en almacenamiento permanente');
                    // Normalizar el objeto para móviles
                    return normalizeAssignmentForMobile(assignment);
                }
            } else {
                // Asignación expirada, limpiarla
                localStorage.removeItem(assignmentKey);
                console.log('🗑️ Asignación expirada eliminada');
            }
        }
    } catch (error) {
        console.error('❌ Error al buscar asignación individual:', error);
    }

    // 3. Buscar en localStorage general (compatibilidad con versión anterior)
    try {
        if (typeof (Storage) !== "undefined" && localStorage) {
            const savedData = localStorage.getItem('secretSantaAssignments');
            if (savedData) {
                const parsedData = JSON.parse(savedData);

                // Verificar si es el nuevo formato con sessionId
                if (parsedData.assignments && Array.isArray(parsedData.assignments)) {
                    const found = parsedData.assignments.find(assignment =>
                        assignment.giver.name === participant && assignment.secretId === secret
                    );
                    if (found) return found;
                } else if (Array.isArray(parsedData)) {
                    // Formato anterior (array directo)
                    const found = parsedData.find(assignment =>
                        assignment.giver.name === participant && assignment.secretId === secret
                    );
                    if (found) return found;
                }
            }
        }

        // 4. Fallback: buscar en variable temporal
        if (window.tempAssignments && window.tempAssignments.length > 0) {
            const found = window.tempAssignments.find(assignment =>
                assignment.giver.name === participant && assignment.secretId === secret
            );
            if (found) return found;
        }

    } catch (error) {
        console.error('❌ Error al recuperar asignaciones:', error);

        // Último fallback: buscar en variable temporal
        if (window.tempAssignments && window.tempAssignments.length > 0) {
            return window.tempAssignments.find(assignment =>
                assignment.giver.name === participant && assignment.secretId === secret
            );
        }
    }

    console.warn('⚠️ No se encontró asignación para:', participant, secret);
    return null;
}

/**
 * Normaliza la asignación para dispositivos móviles
 * Convierte todos los valores a strings para evitar [object Object]
 */
function normalizeAssignmentForMobile(assignment) {
    try {
        return {
            giver: {
                name: String(assignment.giver?.name || assignment.giver || 'Participante'),
                phone: String(assignment.giver?.phone || assignment.giver?.telefono || ''),
                flag: String(assignment.giver?.flag || assignment.giver?.bandera || '🌎'),
                country: String(assignment.giver?.country || assignment.giver?.pais || 'País')
            },
            receiver: {
                name: String(assignment.receiver?.name || assignment.receiver || 'Asignación'),
                phone: String(assignment.receiver?.phone || assignment.receiver?.telefono || 'No disponible'),
                flag: String(assignment.receiver?.flag || assignment.receiver?.bandera || '🌎'),
                country: String(assignment.receiver?.country || assignment.receiver?.pais || 'País')
            },
            secretId: String(assignment.secretId || ''),
            accessCode: String(assignment.accessCode || ''),
            uniqueLink: String(assignment.uniqueLink || ''),
            timestamp: assignment.timestamp || Date.now()
        };
    } catch (error) {
        console.error('Error al normalizar asignación:', error);
        return {
            giver: { name: 'Participante', phone: '', flag: '🌎', country: 'País' },
            receiver: { name: 'Asignación', phone: 'No disponible', flag: '🌎', country: 'País' },
            secretId: '',
            accessCode: '',
            uniqueLink: '',
            timestamp: Date.now()
        };
    }
}

/**
 * Cierra el modal de verificación de código
 */
function closeAccessModal() {
    const modal = document.querySelector('.access-modal');
    if (modal) {
        document.body.removeChild(modal);
    }

    // Mostrar la aplicación principal de nuevo
    document.querySelector('.container').style.display = 'block';
}

/**
 * Muestra la asignación personal de un participante
 */
function showPersonalAssignment(assignment) {
    // Primero normalizar para móviles
    const normalizedAssignment = normalizeAssignmentForMobile(assignment);
    
    // Extraer los nombres correctamente de los objetos normalizados
    const giverName = normalizedAssignment.giver.name;
    const receiverName = normalizedAssignment.receiver.name;
    const receiverPhone = normalizedAssignment.receiver.phone;
    const receiverCountry = normalizedAssignment.receiver.country;

    console.log('Datos de asignación normalizados:', {
        original: assignment,
        normalized: normalizedAssignment,
        giverName,
        receiverName,
        receiverPhone,
        receiverCountry
    });

    const container = document.createElement('div');
    container.className = 'personal-assignment';
    container.innerHTML = `
        <div class="assignment-card">
            <div class="assignment-header">
                <h1>🎁 Tu Amigo Secreto 🎄</h1>
                <div class="snow-decoration">❄️ ❄️ ❄️</div>
            </div>
            
            <div class="assignment-content">
                <p class="greeting">¡Hola <strong>${giverName}</strong>!</p>
                
                <div class="reveal-section">
                    <p class="instruction">Tu amigo secreto es:</p>
                    <div class="recipient-name">🎯 ${receiverName}</div>
                    <div class="recipient-info">
                        📱 ${receiverPhone}
                        <br>
                        📍 ${receiverCountry}
                    </div>
                </div>
                
                <div class="message-section">
                    <p class="message">
                        🎄 ¡Prepara un regalo especial! 🎁
                        <br>
                        Recuerda mantener el secreto hasta el intercambio.
                    </p>
                </div>
                
                <div class="action-buttons">
                    <button onclick="window.print()" class="print-btn">
                        🖨️ Imprimir
                    </button>
                    <button onclick="window.close()" class="close-btn">
                        ✨ Cerrar
                    </button>
                </div>
            </div>
        </div>
        
        <div class="background-decoration">
            <div class="snowflake">❄️</div>
            <div class="snowflake">🎄</div>
            <div class="snowflake">🎁</div>
            <div class="snowflake">⭐</div>
            <div class="snowflake">❄️</div>
        </div>
    `;

    document.body.appendChild(container);
}

/**
 * Función de test para probar el modal de asignación personal
 */
function testPersonalAssignment() {
    const testAssignment = {
        giver: {
            name: 'Juan Pérez',
            phone: '+506 8888-9999',
            country: 'Costa Rica'
        },
        receiver: {
            name: 'María García',
            phone: '+506 7777-8888',
            country: 'Costa Rica'
        },
        accessCode: 'ABC123',
        secretId: 'test123'
    };

    console.log('🧪 Probando modal con datos de test:', testAssignment);
    showPersonalAssignment(testAssignment);
}

/**
 * Función de prueba para verificar que los códigos cambian
 */
function testCodeGeneration() {
    if (!Swal) {
        alert('SweetAlert2 no disponible');
        return;
    }

    // Verificar que hay participantes
    if (participants.length === 0) {
        Swal.fire({
            title: '❌ No hay participantes',
            text: 'Primero agrega algunos participantes para probar la generación de códigos.',
            icon: 'warning',
            confirmButtonText: 'Entendido'
        });
        return;
    }

    // Guardar códigos actuales si existen
    const currentCodes = assignments.map(a => ({
        name: a.giver.name,
        code: a.accessCode,
        timestamp: a.timestamp || 'N/A'
    }));

    // Generar nuevos códigos
    console.log('🧪 TEST: Generando nuevos códigos...');
    const oldAssignments = [...assignments];

    // Forzar regeneración
    assignments = [];
    assignments = generateSecretSantaAssignments(participants);

    // Generar códigos únicos
    const usedCodes = new Set();
    assignments = assignments.map(assignment => {
        let accessCode;
        let attempts = 0;
        const maxAttempts = 100;

        do {
            accessCode = generateAccessCode(assignment.giver.name + '_' + attempts);
            attempts++;
        } while (usedCodes.has(accessCode) && attempts < maxAttempts);

        usedCodes.add(accessCode);

        return {
            ...assignment,
            accessCode: accessCode,
            secretId: generateSecretId(assignment.giver.name, assignment.receiver.name),
            timestamp: Date.now()
        };
    });

    // Comparar códigos
    const newCodes = assignments.map(a => ({
        name: a.giver.name,
        code: a.accessCode,
        timestamp: a.timestamp
    }));

    let changedCount = 0;
    let comparisonHTML = '<div style="font-family: monospace; font-size: 0.85em;">';

    newCodes.forEach((newCode, index) => {
        const oldCode = currentCodes[index];
        const hasChanged = !oldCode || oldCode.code !== newCode.code;
        if (hasChanged) changedCount++;

        comparisonHTML += `
            <div style="margin: 0.5rem 0; padding: 0.5rem; background: ${hasChanged ? 'rgba(40, 167, 69, 0.1)' : 'rgba(255, 193, 7, 0.1)'}; border-radius: 4px;">
                <strong>${newCode.name}:</strong><br>
                ${oldCode ? `Anterior: <span style="color: #dc3545;">${oldCode.code}</span><br>` : ''}
                Nuevo: <span style="color: #28a745;">${newCode.code}</span>
                ${hasChanged ? ' ✅' : ' ⚠️ (igual)'}
            </div>
        `;
    });

    comparisonHTML += '</div>';

    // Actualizar interfaz
    displayResults();

    // Mostrar resultados
    Swal.fire({
        title: '🧪 Test de Generación de Códigos',
        html: `
            <div style="text-align: left;">
                <p><strong>📊 Resultados del Test:</strong></p>
                <div style="margin: 1rem 0; padding: 1rem; background: rgba(23, 162, 184, 0.1); border-radius: 8px;">
                    <p><strong>Total de participantes:</strong> ${participants.length}</p>
                    <p><strong>Códigos que cambiaron:</strong> ${changedCount}/${newCodes.length}</p>
                    <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
                </div>
                <p><strong>🔍 Comparación detallada:</strong></p>
                ${comparisonHTML}
                <div style="margin-top: 1rem; padding: 1rem; background: rgba(40, 167, 69, 0.1); border-radius: 8px;">
                    <p><strong>✅ Conclusión:</strong> ${changedCount === newCodes.length ? 'Todos los códigos son nuevos' : `${changedCount} códigos cambiaron de ${newCodes.length} total`}</p>
                </div>
            </div>
        `,
        icon: changedCount === newCodes.length ? 'success' : 'warning',
        confirmButtonText: '📋 Cerrar Test',
        confirmButtonColor: '#17a2b8',
        width: '800px'
    });

    console.log('🧪 TEST COMPLETADO - Códigos generados:', newCodes);
}

/**
 * Función de test para verificar la aleatoriedad de códigos
 */
function testCodeRandomness() {
    console.log('🎲 Probando aleatoriedad de códigos de acceso:');
    const testName = 'Usuario Test';
    const codes = [];

    // Generar 10 códigos para el mismo usuario
    for (let i = 0; i < 10; i++) {
        const code = generateAccessCode(testName);
        codes.push(code);
        console.log(`Código ${i + 1}: ${code}`);
    }

    // Verificar si hay duplicados
    const uniqueCodes = new Set(codes);
    const hasDuplicates = uniqueCodes.size !== codes.length;

    console.log(`📊 Resultados:`);
    console.log(`- Códigos generados: ${codes.length}`);
    console.log(`- Códigos únicos: ${uniqueCodes.size}`);
    console.log(`- ¿Hay duplicados?: ${hasDuplicates ? '❌ SÍ' : '✅ NO'}`);

    if (hasDuplicates) {
        console.warn('⚠️ Se encontraron códigos duplicados!');
    } else {
        console.log('✅ Todos los códigos son únicos');
    }

    return !hasDuplicates;
}

/**
 * Función de test para verificar compatibilidad con Netlify
 */
function testNetlifyCompatibility() {
    console.log('🧪 Probando compatibilidad con Netlify...');

    const isNetlify = window.location.hostname.includes('.netlify.app') ||
        window.location.hostname.includes('.netlify.com');
    const isLocalhost = window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';

    const results = {
        environment: isNetlify ? 'Netlify' : isLocalhost ? 'Local' : 'Otro',
        hostname: window.location.hostname,
        origin: window.location.origin,
        localStorage: typeof (Storage) !== "undefined",
        baseUrl: '',
        sampleLink: ''
    };

    // Probar generación de enlace
    if (assignments.length > 0) {
        const sampleAssignment = assignments[0];
        results.sampleLink = generateUniqueLink(sampleAssignment, sampleAssignment.accessCode);
    } else {
        // Crear una asignación de prueba
        const testAssignment = {
            giver: { name: 'Usuario Test' },
            receiver: { name: 'Receptor Test' },
            secretId: 'test123'
        };
        results.sampleLink = generateUniqueLink(testAssignment, 'TEST01');
    }

    // Mostrar resultados en SweetAlert
    Swal.fire({
        icon: 'info',
        title: '🧪 Test de Compatibilidad Netlify',
        html: `
            <div style="text-align: left; margin: 1rem 0;">
                <p><strong>🌐 Entorno:</strong> ${results.environment}</p>
                <p><strong>🏠 Hostname:</strong> ${results.hostname}</p>
                <p><strong>🔗 Origin:</strong> ${results.origin}</p>
                <p><strong>💾 localStorage:</strong> ${results.localStorage ? '✅ Disponible' : '❌ No disponible'}</p>
                <p><strong>🔗 Enlace de ejemplo:</strong><br>
                   <textarea readonly style="width: 100%; height: 60px; font-size: 0.8rem; margin-top: 0.5rem;">${results.sampleLink}</textarea>
                </p>
            </div>
        `,
        confirmButtonText: '✅ Entendido',
        width: '600px'
    });

    console.log('📊 Resultados de compatibilidad:', results);
}











