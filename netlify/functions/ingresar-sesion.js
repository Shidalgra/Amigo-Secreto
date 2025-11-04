// netlify/functions/ingresar-sesion.js
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!global.firebaseAdminApp) {
  global.firebaseAdminApp = initializeApp({
    credential: applicationDefault(),
  });
}
const db = getFirestore();

export async function handler(event, context) {
  try {
    const { username, password } = JSON.parse(event.body || "{}");

    if (!username || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Faltan datos" }),
      };
    }

    const sessionRef = db.collection("sesiones").doc(username);
    const doc = await sessionRef.get();

    if (!doc.exists) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "La sesión no existe" }),
      };
    }

    const data = doc.data();

    if (data.password !== password) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Contraseña incorrecta" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Acceso correcto" }),
    };
  } catch (error) {
    console.error("Error en ingresar-sesion:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error interno del servidor" }),
    };
  }
}
