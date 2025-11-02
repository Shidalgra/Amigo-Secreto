// archivo: functions/send-email.js (Netlify Function)

const sgMail = require('@sendgrid/mail');

// Configuración de la API Key de SendGrid (tomada de las variables de entorno de Netlify)
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.handler = async (event, context) => {
    // Solo permitir solicitudes POST (seguridad básica)
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Método no permitido' };
    }

    try {
        // Parsear los datos del sorteo enviados desde el frontend
        const { pairings, organizerEmail, organizerName } = JSON.parse(event.body);

        // Array para almacenar los mensajes a enviar
        const msgList = [];

        // Iterar sobre cada emparejamiento (Dador -> Receptor)
        for (const [giver, receiver] of Object.entries(pairings)) {
            // El 'giver' es el que recibe este correo
            const subject = `🎅 ¡Ya se hizo el Sorteo Secreto Navideño!`;
            
            const content = `
                Hola ${giver.name},<br><br>
                
                ¡La Navidad ha llegado! Tu amigo(a) secreto(a) para este intercambio de regalos es:<br><br>
                
                <h2 style="color: #C0392B; text-align: center;">🎁 ${receiver.name} 🎁</h2>
                
                <p>Recuerda mantener el secreto y preparar un regalo especial.</p>
                <p>Si necesitas contactar al organizador, puedes hacerlo a este correo: ${organizerEmail}</p>
                
                <p>¡Felices Fiestas!</p>
            `;

            // Agregar el mensaje a la lista de envíos de SendGrid
            msgList.push({
                to: giver.email, // Correo del Dador
                from: organizerEmail, // Correo desde donde se envía (debe ser un remitente verificado en SendGrid)
                subject: subject,
                html: content,
            });
        }

        // 3. Enviar todos los correos en un solo batch
        await sgMail.send(msgList);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Correos enviados con éxito." })
        };

    } catch (error) {
        console.error("Error al procesar la función de Netlify o al enviar correos:", error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Fallo al enviar correos. Revisa tu API Key de SendGrid y el remitente.' })
        };
    }
};