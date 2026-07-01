const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const qrImage = require('qr-image');
const fs = require('fs');
const path = require('path');

// Inicialización del cliente optimizada para Docker en Railway
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

// Evento para generar el código QR en archivo PNG limpio
client.on('qr', (qr) => {
    try {
        const qr_svg = qrImage.image(qr, { type: 'png' });
        const qrPath = path.join(__dirname, 'codigo-qr.png');
        qr_svg.pipe(fs.createWriteStream(qrPath));
        
        console.log('====================================================');
        console.log('¡NUEVO QR GENERADO EN ARCHIVO!');
        console.log('Busca el archivo "codigo-qr.png" en la pestaña Console');
        console.log('====================================================');
    } catch (err) {
        console.error('Error generando imagen QR:', err);
    }
});

// Confirmación de conexión exitosa
client.on('ready', () => {
    console.log('¡El bot está completamente listo y conectado a WhatsApp!');
});

// LÓGICA PRINCIPAL DE MENSAJES (message_create lee todo)
client.on('message_create', async (msg) => {
    try {
        // 1. OBTENER LA HORA EN HONDURAS
        const opcionesHora = { timeZone: 'America/Tegucigalpa', hour: '2-digit', hour12: false };
        const horaActual = parseInt(new Intl.DateTimeFormat('es-HN', opcionesHora).format(new Date()), 10);
        
        const horaApertura = 8;
        const horaCierre = 17;

        // 2. RESPUESTA FUERA DE HORARIO
        if (horaActual < horaApertura || horaActual >= horaCierre) {
            if (!msg.fromMe) {
                console.log(`Mensaje fuera de horario desde: ${msg.from}`);
                await msg.reply('¡Hola! Gracias por escribirnos. Nuestro horario de atención es de Lunes a Viernes de 8:00 AM a 5:00 PM. Dejamos tu mensaje guardado y te responderemos lo antes posible.');
                return;
            }
        }

        // 3. RESPUESTA DENTRO DE HORARIO
        // Si el mensaje contiene cualquier tipo de multimedia (foto, documento, etc.)
        if (msg.hasMedia) {
            console.log(`Archivo multimedia recibido desde: ${msg.from}`);
            await msg.reply('¡Gracias por enviar tu comprobante! Hemos recibido el archivo correctamente. En breve un asesor lo revisará para procesar tu solicitud.');
            return;
        }

        // Si es un mensaje de texto normal
        if (!msg.fromMe) {
            const texto = msg.body.toLowerCase().trim();

            if (texto === 'pago' || texto === 'recibo') {
                await msg.reply('¡Hola! Aquí tienes la información sobre los recibos de pago de los lotes. Por favor, envía la fotografía de tu comprobante por este medio para registrarlo en el sistema.');
            } else if (texto === 'hola' || texto === 'menu') {
                await msg.reply('¡Bienvenido! Escribe *pago* si deseas gestionar tus recibos o envía directamente una foto de tu comprobante de depósito.');
            }
        }

    } catch (error) {
        console.error('Error en el flujo de mensajes:', error);
    }
});

// Inicializar el bot
client.initialize();