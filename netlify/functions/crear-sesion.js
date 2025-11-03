const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');

let db; // Variable global para la instancia de Firestore

// ==============================
// 🔧 CONFIGURACIÓN DE FIREBASE ADMIN
// ==============================
if (admin.apps.length === 0) {
  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      console.error("❌ ERROR: La variable FIREBASE_SERVICE_ACCOUNT_KEY no está definida.");
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY ausente en las variables de entorno.");
    }

    const serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8')
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    db = admin.firestore();
    console.log("✅ Firebase Admin inicializado correctamente.");

  } catch (error) {
    console.error("❌ Error al inicializar Firebase Admin SDK:", error);
  }
} else {
  db = admin.firestore();
}

// ==============================
// 🌐 HANDLER PRINCIPAL
// ==============================
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*', // Puedes restringirlo a tu dominio si quieres más seguridad
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // 🔹 Manejo del preflight (CORS)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: 'OK' };
  }

  // 🔹 Solo aceptar POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido. Usa POST.' }) };
  }

  // 🔹 Verificar conexión a Firestore
  if (!db) {
    console.error("❌ No hay conexión a Firestore.");
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error interno: no se pudo conectar a la base de datos.' }) };
  }

  try {
    const { username, password } = JSON.parse(event.body || '{}');

    // ==============================
    // 🧾 VALIDACIONES
    // ==============================
    if (!username || !password) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Nombre de usuario y contraseña son requeridos.' }) };
    }

    if (username.includes(" ") || username.length < 4) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Nombre de usuario inválido. Debe tener al menos 4 caracteres y no contener espacios.' }) };
    }

    if (password.length < 6) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Contraseña muy corta. Debe tener al menos 6 caracteres.' }) };
    }

    // ==============================
    // 🔍 VERIFICAR SI YA EXISTE
    // ==============================
    const sesionRef = db.collection('sesiones').doc(username);
    const doc = await sesionRef.get();

    if (doc.exists) {
      return { statusCode: 409, headers, body: JSON.stringify({ error: `La sesión "${username}" ya existe.` }) };
    }

    // ==============================
    // 🔐 CREAR NUEVA SESIÓN
    // ==============================
    const hashedPassword = await bcrypt.hash(password, 10);

    await sesionRef.set({
      password: hashedPassword,
      creador: username,
      fechaCreacion: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Sesión "${username}" creada correctamente.`);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ message: `Sesión "${username}" creada con éxito.` })
    };

  } catch (error) {
    console.error("❌ Error en crear-sesion:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error interno del servidor al crear la sesión.' })
    };
  }
};
