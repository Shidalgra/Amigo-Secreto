// netlify/functions/request-reset.js
const admin = require('firebase-admin');
const { v4: uuid } = require('uuid');

let db;
if (admin.apps.length === 0) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY missing');
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY missing');
  }
  const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8'));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  db = admin.firestore();
} else {
  db = admin.firestore();
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: 'OK' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  try {
    const { usuario } = JSON.parse(event.body || '{}');
    if (!usuario) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Se requiere usuario o correo' }) };

    // 1) Intentar encontrar documento de sesión por ID (username)
    const sesionRef = db.collection('sesiones').doc(usuario);
    const sesionDoc = await sesionRef.get();

    let sesionId = null;
    let correo = null;

    if (sesionDoc.exists) {
      sesionId = sesionDoc.id;
      correo = sesionDoc.data().correo || null;
    } else {
      // 2) Buscar por campo correo en coleccion sesiones (si el usuario introdujo correo)
      const q = await db.collection('sesiones').where('correo', '==', usuario).limit(1).get();
      if (!q.empty) {
        const d = q.docs[0];
        sesionId = d.id;
        correo = d.data().correo || null;
      }
    }

    if (!sesionId) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Sesión no encontrada' }) };
    }

    // Generar token (corto y legible)
    const token = uuid().replace(/-/g, '').substring(0, 12).toUpperCase();
    const expira = Date.now() + 30 * 60 * 1000; // 30 minutos

    await db.collection('reset-password').doc(token).set({
      sesionId,
      correo,
      expira,
      creadoEn: admin.firestore.FieldValue.serverTimestamp()
    });

    const resetLink = `${process.env.SITE_URL || 'https://eventoamigosecreto.netlify.app'}/reset-password.html?token=${token}`;


    // Devuelve token (el cliente lo usará para enviar EmailJS con el link)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, token, correo, sesionId, resetLink })
    };

  } catch (err) {
    console.error('request-reset error', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error interno' }) };
  }
};
