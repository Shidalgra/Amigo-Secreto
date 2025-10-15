// ===== VARIABLES GLOBALES =====
let participants = [];
let assignments = []; // Cambio: ahora guardamos asignaciones en lugar de pares

// ===== ELEMENTOS DEL DOM =====
let nameInput, phoneInput, countrySelect, participantsList, participantsCount;
let addBtn, clearBtn, generateBtn, resultsSection, pairsList;

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', function() {
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
    
    // Verificar que todos los elementos existan
    if (!nameInput || !phoneInput || !countrySelect) {
        console.error('Error: No se pudieron encontrar los elementos del formulario');
        return;
    }
    
    updateUI();
    
    // Enter key para agregar participante
    nameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            phoneInput.focus();
        }
    });
    
    phoneInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addParticipant();
        }
    });
    
    // Focus automático en el input
    nameInput.focus();
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
    
    const countryFlag = countrySelect.options[countrySelect.selectedIndex].text.substring(0, 2); // Extrae la bandera
    
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
        flag: countryFlag
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
    const removedName = participants[index];
    participants.splice(index, 1);
    updateUI();
    showNotification(`${removedName} eliminado de la lista`, 'info');
}

/**
 * Limpia toda la lista de participantes
 */
function clearParticipants() {
    if (participants.length === 0) return;
    
    if (confirm('¿Estás seguro de que quieres eliminar todos los participantes?')) {
        participants = [];
        assignments = []; // Cambio: limpiar asignaciones
        updateUI();
        hideResults();
        showNotification('Lista limpiada correctamente', 'info');
    }
}

/**
 * Genera las asignaciones de amigo secreto
 */
function generatePairs() {
    if (participants.length < 2) {
        showNotification('Necesitas al menos 2 participantes para generar asignaciones', 'error');
        return;
    }
    
    // Crear las asignaciones usando el algoritmo de amigo secreto
    assignments = generateSecretSantaAssignments(participants);
    
    if (assignments.length === 0) {
        showNotification('Error al generar las asignaciones. Intenta de nuevo.', 'error');
        return;
    }
    
    displayResults();
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
    const canGenerate = participants.length >= 2; // Ya no necesitamos número par
    
    clearBtn.disabled = !hasParticipants;
    generateBtn.disabled = !canGenerate;
}

/**
 * Muestra los resultados de las asignaciones de amigo secreto
 */
function displayResults() {
    if (assignments.length === 0) return;
    
    pairsList.innerHTML = assignments.map((assignment, index) => `
        <div class="pair-card fade-in" style="animation-delay: ${index * 0.1}s">
            <div class="pair-number">Participante ${assignment.giverNumber}</div>
            <div class="pair-names">
                <strong>${assignment.giver.name}</strong>
                <span class="pair-connector">🎁➡️</span>
                <strong>${assignment.receiver.name}</strong>
            </div>
            <div class="assignment-text">le da regalo a</div>
            <a href="${generateWhatsAppLink(assignment)}" target="_blank" class="whatsapp-btn">
                📱 Enviar por WhatsApp
            </a>
        </div>
    `).join('');
    
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Oculta la sección de resultados
 */
function hideResults() {
    resultsSection.style.display = 'none';
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

// ===== FUNCIONES DE UTILIDAD =====

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
document.addEventListener('DOMContentLoaded', function() {
    addHolidayEffects();
    console.log('🎄 Amigo Secreto Navideño cargado correctamente! 🎁');
});

// Registrar estadísticas cuando se generen asignaciones
const originalGeneratePairs = generatePairs;
generatePairs = function() {
    originalGeneratePairs();
    if (assignments.length > 0) {
        logStatistics();
    }
};











