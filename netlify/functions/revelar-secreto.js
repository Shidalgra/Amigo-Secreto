// netlify/functions/revelar-secreto.js
const admin = require('firebase-admin');
const CryptoJS = require('crypto-js');

let db;

// ==========================
// Inicialización segura de Firebase Admin
// ==========================
try {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    throw new Error("No se encontró FIREBASE_SERVICE_ACCOUNT_KEY en variables de entorno");
  }

  // Decodificar Base64 y parsear JSON
  const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8')
  );

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("✅ Firebase inicializado correctamente.");
  }

  db = admin.firestore();
} catch (error) {
  console.error("❌ Error inicializando Firebase:", error);
}

// ==========================
// Handler principal
// ==========================
exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // Preflight CORS
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "OK" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Método no permitido" }) };
  }

  try {
    const { codigoConsulta } = JSON.parse(event.body || "{}");

    if (!codigoConsulta) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Falta codigoConsulta" }) };
    }

    // Separar la sesión del código (antes del guion)
    const [nombreSesion] = codigoConsulta.split('-');

    console.log("🔎 Buscando sesión:", nombreSesion, "con código:", codigoConsulta);

    // Buscar en la subcolección "sorteo" dentro de la sesión
    const snapshot = await db
      .collection('sesiones')
      .doc(nombreSesion)
      .collection('sorteo')
      .where('codigoConsulta', '==', codigoConsulta)
      .get();

    console.log("📄 Snapshot obtenido:", snapshot.size, "documentos");

    if (snapshot.empty) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Código no encontrado' }) };
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    const asignacionCifrada = data.asignacionCifrada;
    if (!asignacionCifrada) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Documento sin campo asignacionCifrada' }) };
    }

    if (!process.env.ENCRYPTION_SECRET_KEY) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Falta ENCRYPTION_SECRET_KEY' }) };
    }

    // Descifrado AES
    const bytes = CryptoJS.AES.decrypt(asignacionCifrada, process.env.ENCRYPTION_SECRET_KEY);
    const nombreAmigo = bytes.toString(CryptoJS.enc.Utf8);

    if (!nombreAmigo) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'No se pudo descifrar' }) };
    }

    console.log("🎉 Nombre del amigo revelado:", nombreAmigo);

    return { statusCode: 200, headers, body: JSON.stringify({ nombreAmigo }) };

  } catch (err) {
    console.error("❌ Error revelar-secreto:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error interno del servidor' }) };
  }
};
