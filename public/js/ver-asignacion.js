// archivo: public/js/ver-asignacion.js

import { db } from './firebase-config.js';

const resultContainer = document.getElementById('assignment-result-container');

async function findAssignment() {
    // 1. Obtener el accessKey de la URL
    const params = new URLSearchParams(window.location.search);
    const accessKey = params.get('key');

    if (!accessKey) {
        displayError("No se proporcionó una clave de acceso. Asegúrate de usar el enlace correcto.");
        return;
    }

    try {
        // 2. Buscar la asignación en TODOS los sorteos
        // Esta consulta es más compleja porque no sabemos a qué sorteo pertenece la clave.
        const querySnapshot = await db.collectionGroup('asignaciones').where(firebase.firestore.FieldPath.documentId(), '==', accessKey).get();

        if (querySnapshot.empty) {
            displayError("La clave de acceso no es válida o la asignación ha sido eliminada.");
            return;
        }

        // Debería haber un solo resultado
        const assignmentDoc = querySnapshot.docs[0];
        const assignmentData = assignmentDoc.data();

        // 3. Mostrar el resultado
        resultContainer.innerHTML = `
            <p>Hola, <strong>${assignmentData.giverName}</strong>.</p>
            <p>Tu amigo(a) secreto(a) para este intercambio es:</p>
            <h2 class="secret-name">🎁 ${assignmentData.receiverName} 🎁</h2>
        `;

    } catch (error) {
        console.error("Error al buscar la asignación:", error);
        displayError("Ocurrió un error al buscar tu asignación. Inténtalo de nuevo más tarde.");
    }
}

function displayError(message) {
    resultContainer.innerHTML = `<p class="error-message">${message}</p>`;
}

findAssignment();