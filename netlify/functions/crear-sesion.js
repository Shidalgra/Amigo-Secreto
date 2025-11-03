// netlify/functions/crear-sesion.js

const admin = require('firebase-admin');

// --- CONFIGURACIÓN DE FIREBASE ADMIN ---
// Solo inicializar si no hay apps existentes
if (admin.apps.length === 0) {
  try {
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8')
    );
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (e) {
    console.error('Error al inicializar Firebase Admin SDK:', e);
  }
}
const db = admin.firestore();

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido' }) };
  }

  try {
    const { username, password } = JSON.parse(event.body);

    // --- VALIDACIONES BÁSICAS ---
    if (!username || !password) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Nombre de usuario y contraseña son requeridos.' }) };
    }
    if (username.includes(" ") || username.length < 4) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Nombre de usuario inválido. Debe tener al menos 4 caracteres y no contener espacios.' }) };
    }
    if (password.length < 6) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Contraseña muy corta. Debe tener al menos 6 caracteres.' }) };
    }

    // --- LÓGICA DE REGISTRO ---
    const sesionRef = db.collection('sesiones').doc(username);
    const doc = await sesionRef.get();

    if (doc.exists) {
      return { statusCode: 409, body: JSON.stringify({ error: `La sesión "${username}" ya existe.` }) }; // 409 Conflict
    }

    // Crear la nueva sesión
    await sesionRef.set({
      password: password, // ADVERTENCIA: Guardando en texto plano.
      creador: username,
      fechaCreacion: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      statusCode: 201, // 201 Created
      body: JSON.stringify({ message: `Sesión "${username}" creada con éxito.` })
    };

  } catch (error) {
    console.error("Error en la función crear-sesion:", error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Error interno del servidor al crear la sesión.' }) };
  }
};