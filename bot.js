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
        // 1. OBTENER LA HORA ACTUAL EN HONDURAS
        // Usamos Intl para forzar el formato de 24 horas en la zona horaria configurada
        const opcionesHora = { timeZone: 'America/Tegucigalpa', hour: '2-digit', hour12: false };
        const horaActual = parseInt(new Intl.DateTimeFormat('es-HN', opcionesHora).format(new Date()), 10);
        
        // Definir límites de horario comercial (Ejemplo: 8 AM a 5 PM / 17 hrs)
        const horaApertura = 8;
        const horaCierre = 17;

        // 2. DETECTAR SI ESTÁ FUERA DE HORARIO
        if (horaActual < horaApertura || horaActual >= horaCierre) {
            // Si el mensaje es una foto de un cliente fuera de horario
            if (msg.hasMedia) {
                const media = await msg.downloadMedia();
                if (media.mimetype.startsWith('image/')) {
                    console.log(`Foto recibida FUERA DE HORARIO desde: ${msg.from}`);
                    await msg.reply('Gracias por enviar tu comprobante. En este momento estamos fuera de nuestro horario de atención, pero tu imagen quedó registrada y la revisaremos a primera hora en el siguiente día hábil.');
                    return; // Detiene la ejecución para que no mande más respuestas
                }
            }

            // Si es un texto cualquiera fuera de horario (y no fue enviado por el propio bot)
            if (!msg.fromMe) {
                console.log(`Texto recibido FUERA DE HORARIO desde: ${msg.from}`);
                await msg.reply('¡Hola! Gracias por escribirnos. Nuestro horario de atención es de Lunes a Viernes de 8:00 AM a 5:00 PM. Dejamos tu mensaje guardado y te responderemos lo antes posible.');
                return;
            }
        }

        // 3. RESPUESTAS EN HORARIO NORMAL (DENTRO DE HORARIO)
        if (msg.hasMedia) {
            const media = await msg.downloadMedia();
            
            // Si es una foto (Comprobante, recibo, etc.)
            if (media.mimetype.startsWith('image/')) {
                console.log(`Foto recibida en horario comercial desde: ${msg.from}`);
                await msg.reply('¡Gracias por enviar la foto! Hemos recibido tu imagen correctamente. En breve un asesor la revisará para procesar tu solicitud.');
            }
        } else {
            // Si es un mensaje de texto normal en horario de oficina
            const texto = msg.body.toLowerCase().trim();

            if (texto === 'pago' || texto === 'recibo') {
                console.log(`Consulta de pago recibida de: ${msg.from}`);
                await msg.reply('¡Hola! Aquí tienes la información sobre los recibos de pago de los lotes. Por favor, envía la fotografía de tu comprobante por este medio para registrarlo en el sistema.');
            }
            
            if (texto === 'hola' || texto === 'menu') {
                await msg.reply('¡Bienvenido! Escribe *pago* si deseas gestionar tus recibos o envía directamente una foto de tu comprobante de depósito.');
            }
        }

    } catch (error) {
        console.error('Error procesando el mensaje:', error);
    }
});

// Inicializar el bot
client.initialize();