const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        // Toma automáticamente la ruta /usr/bin/chromium configurada en el Dockerfile
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

// Manejo del código QR
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Escanea este código QR con tu WhatsApp Business:');
});

client.on('ready', () => {
    console.log('¡El bot está listo y conectado!');
});

// Escuchar los mensajes entrantes
client.on('message', async (msg) => {
    const ahora = new Date();
    const diaSemana = ahora.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    const hora = ahora.getHours();
    const minutos = ahora.getMinutes();
    
    // Convertir la hora actual a minutos totales desde el inicio del día para evaluar fácil
    const tiempoActualEnMinutos = (hora * 60) + minutos;
    const ochoAM = 8 * 60;
    const docePM = 12 * 60;
    const cincoPM = 17 * 60;

    let fueraDeHorario = false;

    // 1. EVALUAR HORARIOS DE ATENCIÓN
    if (diaSemana >= 1 && diaSemana <= 5) { // Lunes a Viernes
        if (tiempoActualEnMinutos < ochoAM || tiempoActualEnMinutos > cincoPM) {
            fueraDeHorario = true;
        }
    } else if (diaSemana === 6) { // Sábado
        if (tiempoActualEnMinutos < ochoAM || tiempoActualEnMinutos > docePM) {
            fueraDeHorario = true;
        }
    } else { // Domingo
        fueraDeHorario = true;
    }

    // 2. EJECUTAR RESPUESTAS
    if (fueraDeHorario) {
        msg.reply("Hola. Nuestro horario de atención es de Lunes a Viernes de 8:00 AM a 5:00 PM y Sábados de 8:00 AM a 12:00 PM. Le responderemos pronto.");
        return;
    }

    // Si está dentro del horario, revisar si es un recibo/pago
    const texto = msg.body.toLowerCase();
    const palabrasPago = ["recibo", "pago", "transferencia", "comprobante", "captura", "factura"];
    const esPago = palabrasPago.some(palabra => texto.includes(palabra)) || msg.hasMedia;

    if (esPago) {
        msg.reply("¡Recibido! Tu pago será facturado por orden de llegada. Por favor espera un momento, ¡que tengas un feliz día!");
    }
});

client.initialize();