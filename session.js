const { default: makeWASocket, useMultiFileAuthState, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');
const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function startSession() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ["Mac OS", "Chrome", "120.0.0.0"]
    });

    sock.ev.on('creds.update', saveCreds);

    if (!sock.authState.creds.registered) {
        const phoneNumber = await question('\x1b[33mEnter your WhatsApp Number (e.g., 923001234567): \x1b[0m');
        
        try {
            // Wait for socket to be ready (fix for 428 error)
            await sock.waitForConnectionUpdate((update) => !!update.qr);
            const code = await sock.requestPairingCode(phoneNumber.trim());
            console.log(`\x1b[32m[✓] YOUR PAIRING CODE: \x1b[1m${code}\x1b[0m`);
            console.log("\x1b[33mGo to WhatsApp > Linked Devices > Link with Phone Number > Enter Code\x1b[0m\n");
        } catch (err) {
            console.log('\x1b[31m[!] Error:', err.message, '\x1b[0m');
            process.exit(1);
        }
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection } = update;
        if (connection === 'open') {
            console.log('\x1b[32m[✓] CONNECTED SUCCESSFULLY! Generating Session ID...\x1b[0m');
            await delay(3000); 
            
            const creds = fs.readFileSync('auth_info/creds.json', 'utf-8');
            const sessionID = Buffer.from(creds).toString('base64');
            
            console.log('\n\x1b[36m=========================================\x1b[0m');
            console.log('\x1b[33mYour SESSION_ID is below (Copy this full text):\x1b[0m\n');
            console.log(`\x1b[32m${sessionID}\x1b[0m`);
            console.log('\n\x1b[36m=========================================\x1b[0m');
            console.log('\x1b[31mSave this SESSION_ID. You will need it for Hosting!\x1b[0m\n');
            process.exit(0);
        }
    });
}

startSession();
