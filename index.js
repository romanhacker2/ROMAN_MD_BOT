const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const express = require('express');

// Hosting platforms (Heroku/Koyeb) ko ek port chahiye hota hai
const app = express();
const port = process.env.PORT || 8000;
app.get('/', (req, res) => res.send('ROMAN MD BOT IS ACTIVE'));
app.listen(port, () => console.log(`Server running on port ${port}`));

const SESSION_ID = process.env.SESSION_ID;

if (!SESSION_ID) {
    console.log("❌ ERROR: SESSION_ID environment variable is missing!");
    process.exit(1);
}

const authDir = './auth_info';
if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir);
}
const credsPath = `${authDir}/creds.json`;

if (!fs.existsSync(credsPath)) {
    const credsData = Buffer.from(SESSION_ID, 'base64').toString('utf-8');
    fs.writeFileSync(credsPath, credsData);
    console.log("✅ Session ID loaded.");
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ["Mac OS", "Chrome", "120.0.0.0"]
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) { await delay(3000); startBot(); }
        } else if (connection === 'open') {
            console.log('\x1b[32m[✓] ROMAN MD BOT IS CONNECTED!\x1b[0m');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const command = text.toLowerCase().trim();

        if (command === '.ping') {
            await sock.sendMessage(from, { text: '🏓 Pong!' }, { quoted: msg });
        } else if (command === '.menu') {
            await sock.sendMessage(from, { text: '🔥 *ROMAN MD BOT*\n\n.ping - Check Status\n.owner - Contact Dev' }, { quoted: msg });
        } else if (command === '.owner') {
            await sock.sendMessage(from, { text: '👑 *Owner:* Roman Hacker\n📞 https://wa.me/923037224620' }, { quoted: msg });
        }
    });
}
startBot();
