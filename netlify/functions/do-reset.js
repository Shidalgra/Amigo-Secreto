// netlify/functions/do-reset.js
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');

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
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: 'OK' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  try {
    const { token, newPassword } = JSON.parse(event.body || '{}');
    if (!token || !newPassword) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Faltan datos' }) };

    const tokenDoc = await db.collection('reset-password').doc(token).get();
    if (!tokenDoc.exists) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Token inválido' }) };

    const data = tokenDoc.data();
    if (Date.now() > data.expira) {
      // borrar token expirado
      await db.collection('reset-password').doc(token).delete();
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Token expirado' }) };
    }

    const sesionId = data.sesionId;
    if (!sesionId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Token mal formado' }) };

    // Hashear la contraseña (bcrypt)
    const hashed = await bcrypt.hash(newPassword, 10);

    // Actualizar documento de sesión
    await db.collection('sesiones').doc(sesionId).update({
      password: hashed
    });

    // Eliminar token para que no se use otra vez
    await db.collection('reset-password').doc(token).delete();

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('do-reset error', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error interno' }) };
  }
};
