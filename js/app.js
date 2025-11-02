// archivo: js/app.js

import { auth, db } from '../public/js/firebase-config.js';

// ----------------------------------------------------
// 1. Manejo de Autenticación y Cierre de Sesión
// ----------------------------------------------------

const logoutButton = document.getElementById('logout-button');
const participantsTbody = document.getElementById('participants-tbody');
const participantCountSpan = document.getElementById('participant-count');
const drawButton = document.getElementById('draw-button');
const clearListButton = document.getElementById('clear-list-button');
const addParticipantForm = document.getElementById('add-participant-form');
const addErrorMessage = document.getElementById('add-error-message');

let currentUserId = null;
let participantsRef = null;
let unsubscribeSnapshot = null; // Para la función de escuchar cambios en tiempo real

// Listener para verificar si el usuario está logueado
auth.onAuthStateChanged(user => {
    if (user && user.emailVerified) {
        currentUserId = user.uid;
        // Referencia a la subcolección de participantes del usuario actual
        participantsRef = db.collection('usuarios').doc(currentUserId).collection('participantes');
        
        // Iniciar la escucha en tiempo real de la lista
        startRealtimeListener();

    } else {
        // Si no está logueado o no verificado, redirigir al login
        window.location.href = 'index.html';
    }
});

// Cierre de Sesión
logoutButton.addEventListener('click', async () => {
    try {
        await auth.signOut();
        // Firebase Auth se encargará de redirigir a index.html
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
    }
});


// ----------------------------------------------------
// 2. CRUD: Cargar la lista en tiempo real (READ)
// ----------------------------------------------------

function startRealtimeListener() {
    // Si ya hay un listener activo, lo cancelamos antes de crear uno nuevo
    if (unsubscribeSnapshot) {
        unsubscribeSnapshot(); 
    }

    unsubscribeSnapshot = participantsRef.orderBy('createdAt', 'asc') // Ordenar por la fecha de creación
        .onSnapshot(snapshot => {
            const participants = [];
            snapshot.forEach(doc => {
                participants.push({ id: doc.id, ...doc.data() });
            });
            
            // Actualizar la interfaz
            renderParticipants(participants);
        }, error => {
            console.error("Error al escuchar cambios en Firestore:", error);
        });
}

function renderParticipants(participants) {
    participantsTbody.innerHTML = '';
    participantCountSpan.textContent = participants.length;

    participants.forEach(p => {
        const row = participantsTbody.insertRow();
        row.innerHTML = `
            <td>${p.name}</td>
            <td>${p.email || 'N/A'}</td>
            <td>${p.phone || 'N/A'}</td>
            <td>
                <button class="delete-button" data-id="${p.id}"><i class="fas fa-trash"></i> Borrar</button>
            </td>
        `;
    });

    // Habilitar/Deshabilitar el botón de Sorteo
    if (participants.length >= 2) {
        drawButton.removeAttribute('disabled');
    } else {
        drawButton.setAttribute('disabled', 'disabled');
    }
}


// ----------------------------------------------------
// 3. CRUD: Agregar Participante (CREATE)
// ----------------------------------------------------

addParticipantForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    addErrorMessage.textContent = '';

    const nameInput = document.getElementById('name-input');
    const emailInput = document.getElementById('email-input');
    const phoneInput = document.getElementById('phone-input');

    const newParticipant = {
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        phone: phoneInput.value.trim(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp() // Para ordenar
    };

    if (newParticipant.name === '') {
        addErrorMessage.textContent = 'El nombre del participante es obligatorio.';
        return;
    }

    // Opcional: Validación de email simple si existe
    if (newParticipant.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newParticipant.email)) {
        addErrorMessage.textContent = 'El formato del correo electrónico no es válido.';
        return;
    }

    try {
        // Agregar a la subcolección del usuario actual
        await participantsRef.add(newParticipant);
        
        // Limpiar el formulario
        addParticipantForm.reset();
        addErrorMessage.style.color = 'var(--secondary-color)';
        addErrorMessage.textContent = 'Participante agregado con éxito.';
        setTimeout(() => addErrorMessage.textContent = '', 3000); // Borrar mensaje
        
    } catch (error) {
        console.error("Error al agregar participante:", error);
        addErrorMessage.style.color = 'var(--primary-color)';
        addErrorMessage.textContent = 'Error al guardar. Intenta de nuevo.';
    }
});


// ----------------------------------------------------
// 4. CRUD: Eliminar Participante (DELETE)
// ----------------------------------------------------

// Usamos delegación de eventos en el tbody
participantsTbody.addEventListener('click', async (e) => {
    if (e.target.closest('.delete-button')) {
        const button = e.target.closest('.delete-button');
        const participantId = button.getAttribute('data-id');

        if (confirm('¿Estás seguro de que quieres eliminar a este participante?')) {
            try {
                // Eliminar el documento de la subcolección
                await participantsRef.doc(participantId).delete();
                // La función de listener (onSnapshot) actualizará la vista automáticamente
            } catch (error) {
                console.error("Error al eliminar participante:", error);
                alert("Error al eliminar el participante.");
            }
        }
    }
});


// ----------------------------------------------------
// 5. CRUD: Limpiar la Lista Completa
// ----------------------------------------------------

clearListButton.addEventListener('click', async () => {
    if (confirm('⚠️ ATENCIÓN: ¿Estás seguro de que quieres BORRAR TODOS los participantes de tu lista? Esta acción es irreversible.')) {
        try {
            // Obtenemos todos los documentos de la subcolección
            const snapshot = await participantsRef.get();
            const batch = db.batch(); // Usamos un batch para eliminar múltiples documentos de forma eficiente

            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });

            await batch.commit(); // Ejecutamos la eliminación masiva

            alert('✅ Lista de participantes limpiada con éxito.');
        } catch (error) {
            console.error("Error al limpiar la lista:", error);
            alert("Error al limpiar la lista completa.");
        }
    }
});

// ----------------------------------------------------
// 6. Lógica del Emparejamiento Secreto (El Corazón del App)
// ----------------------------------------------------

// archivo: js/app.js (MODIFICADO - SECCIÓN 6)

// ... (todo el código anterior) ...

// 6. Lógica del Emparejamiento Secreto (El Corazón del App)
drawButton.addEventListener('click', async () => {
    // ... (el código de confirmación es el mismo) ...
    if (!confirm('¿Estás seguro de que quieres realizar el sorteo secreto? Una vez hecho, se recomienda no modificar la lista.')) {
        return;
    }

    // Deshabilitar botón mientras se procesa
    drawButton.textContent = 'Procesando sorteo y enviando correos...';
    drawButton.setAttribute('disabled', 'disabled');
    
    try {
        const snapshot = await participantsRef.orderBy('createdAt', 'asc').get();
        // **IMPORTANTE**: Ahora necesitamos el email de CADA participante para el envío.
        const participants = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, email: doc.data().email }));
        
        if (participants.length < 2) {
             // ... (manejo de error si menos de 2) ...
             drawButton.textContent = 'Realizar el Emparejamiento Secreto';
             drawButton.removeAttribute('disabled');
             alert("Necesitas al menos 2 participantes para realizar el sorteo.");
             return;
        }

        // 1. Generar la lista de receptores (copia aleatoria)
        let recipients = [...participants].sort(() => Math.random() - 0.5);
        
        const pairingsMap = {}; // Usaremos esta para almacenar Giver object -> Receiver object
        let success = false;
        let attempts = 0;
        
        // ... (bucle while de emparejamiento es el mismo) ...
        while (!success && attempts < 10) {
            recipients = [...participants].sort(() => Math.random() - 0.5); 
            success = true;
            
            for (let i = 0; i < participants.length; i++) {
                const giver = participants[i];
                const receiver = recipients[i];
                
                if (giver.id === receiver.id) {
                    success = false;
                    break;
                }
                // Almacenar el objeto completo del receptor (incluye email)
                pairingsMap[giver.id] = { 
                    giverName: giver.name,
                    giverEmail: giver.email,
                    receiverName: receiver.name
                }; 
            }
            attempts++;
        }
        
        if (!success) {
             // ... (manejo de error si no se encuentra emparejamiento) ...
             drawButton.textContent = 'Realizar el Emparejamiento Secreto';
             drawButton.removeAttribute('disabled');
            alert("No se pudo encontrar un emparejamiento válido después de varios intentos. Intenta de nuevo.");
            return;
        }
        
        // 2. Formatear datos para la Función de Netlify
        const pairingsForSendGrid = {};
        Object.values(pairingsMap).forEach(p => {
            // Formato final: { 'Giver Name': { email: 'giver@e.com', receiverName: 'Receiver Name' } }
            // Necesitamos enviar al Giver Name el email del Receiver Name
             pairingsForSendGrid[p.giverName] = {
                email: p.giverEmail,
                receiverName: p.receiverName
            };
        });

        // NOTA: Para obtener el email del organizador, asumimos que es el usuario logueado
        const organizerEmail = auth.currentUser.email;
        const organizerName = auth.currentUser.displayName || organizerEmail.split('@')[0]; // Nombre simple si no hay display name

        // 3. Llamada a la Netlify Function
        const response = await fetch('/.netlify/functions/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                // Enviamos los datos del emparejamiento y el email del organizador
                pairings: pairingsForSendGrid,
                organizerEmail: organizerEmail,
                organizerName: organizerName
            })
        });

        const result = await response.json();
        
        const drawResultContainer = document.getElementById('draw-result-container');
        
        if (response.ok) {
            // Éxito
            drawResultContainer.classList.remove('hidden');
            drawResultContainer.style.backgroundColor = '#d1e7dd';
            drawResultContainer.style.color = '#0f5132';
            drawResultContainer.innerHTML = `
                <h3>¡Sorteo Realizado y Correos Enviados! ✅</h3>
                <p>El emparejamiento secreto ha sido completado y los correos electrónicos han sido enviados a todos los participantes.</p>
                <p>Revisa la bandeja de entrada de tu remitente (${organizerEmail}) para asegurarte de que los correos salieron con éxito.</p>
            `;
            // Almacenar el sorteo en Firestore aquí si lo deseas
        } else {
            // Falla del servidor (ej: API key incorrecta)
            drawResultContainer.classList.remove('hidden');
            drawResultContainer.style.backgroundColor = '#f8d7da';
            drawResultContainer.style.color = '#842029';
            drawResultContainer.innerHTML = `
                <h3>Error al Enviar Correos ❌</h3>
                <p>Hubo un fallo en la función de envío: ${result.error || 'Error desconocido'}</p>
                <p><strong>IMPORTANTE:</strong> El sorteo se realizó, pero falló el envío. Usa el **Envío Manual** (opción B de la discusión anterior) si no puedes resolver el error de SendGrid/Netlify Functions.</p>
            `;
        }

    } catch (error) {
        // Falla de red o de código
        console.error("Error al realizar el sorteo o llamar a la función:", error);
        alert("Ocurrió un error inesperado al intentar el sorteo. Revisa la consola.");
    } finally {
        // Volver a habilitar el botón
        drawButton.textContent = 'Realizar el Emparejamiento Secreto';
        drawButton.removeAttribute('disabled');
    }
});