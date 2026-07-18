require('./settings')

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers
} = require('./lib/baileys')

const chalk = require('chalk')
const fs = require('fs')
const os = require('os')
const path = require('path')
const pino = require('pino')
const readline = require('readline')
const moment = require('moment-timezone')

const { smsg, sleep } = require('./lib/myfunc')
const {
  backupSession,
  ensureDir,
  readJsonSafe,
  restoreSessionId,
  safeWriteJson
} = require('./lib/session')

const TZ = 'Africa/Harare'
const sessionPath = path.join(__dirname, sessionName)
const storeFilePath = path.join(sessionPath, 'store.json')
const dbFilePath = path.join(__dirname, 'database', 'database.json')
const MAX_CACHE_ITEMS = 300
const reconnectBaseMs = 5000

let reconnectAttempts = 0
let reconnectTimer = null
let starting = false
let sock = null
let authNotify = true
let lastOnlineNotice = 0

ensureDir(sessionPath)

function now() {
  return moment().tz(TZ).format('YYYY-MM-DD HH:mm:ss')
}

function runtime(seconds = process.uptime()) {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor(seconds % 86400 / 3600)
  const m = Math.floor(seconds % 3600 / 60)
  const s = Math.floor(seconds % 60)
  return `${d}d ${h}h ${m}m ${s}s`
}

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let index = 0
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index++
  }
  return `${value.toFixed(index ? 1 : 0)} ${units[index]}`
}

function banner(status = 'BOOTING') {
  const mem = process.memoryUsage()
  const lines = [
    '',
    '============================================================',
    ` MASTER-IP BOT | ${status}`,
    '============================================================',
    ` Owner      : ${global.ownername}`,
    ` Version    : ${global.version}`,
    ` Node.js    : ${process.version}`,
    ` Platform   : ${os.platform()} ${os.arch()}`,
    ` Runtime    : ${runtime()}`,
    ` RAM        : ${formatBytes(mem.rss)} RSS / ${formatBytes(os.totalmem())} total`,
    ` Session    : ${sessionPath}`,
    ` Time       : ${now()} ${TZ}`,
    '============================================================',
    ''
  ]
  console.log(chalk.cyan(lines.join('\n')))
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

function loadDatabase() {
  global.db = readJsonSafe(dbFilePath, { data: {} })
  global.db.data = {
    users: {},
    chats: {},
    others: {},
    settings: {},
    ...(global.db.data || {})
  }
  safeWriteJson(dbFilePath, global.db)
}

function saveDatabase() {
  try {
    safeWriteJson(dbFilePath, global.db)
  } catch (err) {
    console.error(chalk.red(`[DB] Failed to save database: ${err.message}`))
  }
}

function createLocalStore() {
  const store = {
    chats: {},
    contacts: {},
    messages: {},
    presences: {},
    bind(ev) {
      if (!ev || typeof ev.on !== 'function') return

      ev.on('contacts.update', update => {
        for (const contact of update || []) {
          if (!contact?.id) continue
          store.contacts[contact.id] = {
            ...(store.contacts[contact.id] || {}),
            ...contact
          }
        }
      })

      ev.on('chats.upsert', chats => {
        for (const chat of chats || []) {
          if (!chat?.id) continue
          store.chats[chat.id] = {
            ...(store.chats[chat.id] || {}),
            ...chat
          }
        }
      })

      ev.on('messages.upsert', ({ messages } = {}) => {
        for (const message of messages || []) {
          const jid = message?.key?.remoteJid
          const id = message?.key?.id
          if (!jid || !id) continue
          store.messages[jid] = store.messages[jid] || {}
          store.messages[jid][id] = message
        }
      })

      ev.on('presence.update', update => {
        const jid = update?.id
        if (!jid) return
        store.presences[jid] = {
          ...(store.presences[jid] || {}),
          ...update
        }
      })
    },
    readFromFile(filePath) {
      if (!fs.existsSync(filePath)) return
      const data = readJsonSafe(filePath, null)
      if (!data) return
      store.chats = data.chats || {}
      store.contacts = data.contacts || {}
      store.messages = data.messages || {}
      store.presences = data.presences || {}
    },
    writeToFile(filePath) {
      safeWriteJson(filePath, {
        chats: store.chats,
        contacts: store.contacts,
        messages: store.messages,
        presences: store.presences
      })
    }
  }

  return store
}

function scheduleReconnect(reason) {
  if (reconnectTimer) return
  reconnectAttempts++
  const delayMs = Math.min(60000, reconnectBaseMs * reconnectAttempts)
  console.log(chalk.yellow(`[CONNECTION] ${reason}. Reconnecting in ${Math.round(delayMs / 1000)}s...`))
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    startWhatsAppBot().catch(err => {
      console.error(chalk.red(`[BOOT] Restart failed: ${err.stack || err.message}`))
      scheduleReconnect('restart failed')
    })
  }, delayMs)
}

function rememberMessage(cache, id) {
  if (!id) return false
  if (cache.has(id)) return true
  cache.add(id)
  if (cache.size > MAX_CACHE_ITEMS) cache.delete(cache.values().next().value)
  return false
}

function saveStore(store) {
  try {
    if (typeof store.writeToFile === 'function') {
      store.writeToFile(storeFilePath)
      return
    }
    safeWriteJson(storeFilePath, {
      chats: store.chats || [],
      contacts: store.contacts || {},
      messages: store.messages || {},
      presences: store.presences || {}
    })
  } catch (err) {
    console.error(chalk.red(`[STORE] Failed to save store: ${err.message}`))
  }
}

async function loginMenu(VranCe) {
  const registered = VranCe.authState?.creds?.registered ?? false
  if (registered) return

  console.log(chalk.cyan('\nLogin options:'))
  console.log(chalk.white('  1. Pair with phone number'))
  console.log(chalk.white('  2. Paste Session ID'))
  const choice = await ask(chalk.blue('Choose 1 or 2: '))

  if (choice === '2') {
    const pasted = await ask(chalk.blue('Paste Session ID: '))
    const restoredFile = restoreSessionId(sessionPath, pasted)
    console.log(chalk.green(`[SESSION] Restored session to ${restoredFile}. Restarting socket...`))
    scheduleReconnect('session restored')
    return
  }

  let phone = ''
  while (!phone) {
    phone = (await ask(chalk.blue('Enter phone number with country code (example 26378xxx): '))).replace(/[^0-9]/g, '')
    if (!phone) console.log(chalk.red('Phone number cannot be empty.'))
  }

  try {
    if (typeof VranCe.requestPairingCode !== 'function') {
      throw new Error('requestPairingCode is not available in this Baileys build.')
    }

    await sleep(1500)
    const code = await VranCe.requestPairingCode(phone)
    const pairingCode = Array.isArray(code) ? code.join('-') : code
    console.log(chalk.green(`Pairing code: ${pairingCode}`))
  } catch (err) {
    console.error(chalk.red(`[PAIRING] Failed to request pairing code: ${err.message}`))
    scheduleReconnect('pairing failed')
  }
}

async function sendOnlineNotice(VranCe) {
  if (Date.now() - lastOnlineNotice < 60000) return
  lastOnlineNotice = Date.now()

  try {
    const botJid = VranCe.decodeJid(VranCe.user.id)
    const message = [
      '+--------------------------+',
      '|  MASTER-IP BOT ONLINE    |',
      '+--------------------------+',
      `| Status   : ONLINE`,
      `| Engine   : Baileys MD`,
      `| Version  : ${global.version}`,
      `| Runtime  : ${runtime()}`,
      `| Time     : ${now()}`,
      '+--------------------------+',
      `| Owner    : ${global.ownername}`,
      `| Mode     : PUBLIC`,
      '+--------------------------+',
      '',
      '> Secure modules loaded',
      '> Session restored',
      '> ACCESS GRANTED'
    ].join('\n')

    await VranCe.sendMessage(botJid, { text: message })
  } catch (err) {
    console.log(chalk.yellow(`[NOTICE] Failed to send online notification: ${err.message}`))
  }
}

async function startWhatsAppBot() {
  if (starting) return sock
  starting = true

  try {
    loadDatabase()
    banner('STARTING')
    backupSession(sessionPath)

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
    const { version, isLatest } = await fetchLatestBaileysVersion()

    const store = createLocalStore()

    if (fs.existsSync(storeFilePath) && typeof store.readFromFile === 'function') {
      try {
        store.readFromFile(storeFilePath)
      } catch (err) {
        console.log(chalk.yellow(`[STORE] Could not restore store, starting fresh: ${err.message}`))
      }
    }

    sock = makeWASocket({
      logger: pino({ level: 'silent' }),
      auth: state,
      version,
      browser: Browsers.ubuntu('Firefox'),
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      generateHighQualityLinkPreview: false,
      syncFullHistory: false,
      markOnlineOnConnect: false,
      emitOwnEvents: false,
      shouldIgnoreJid: jid => jid === 'status@broadcast'
    })

    store.bind(sock.ev)
    require('./lib/handler')(sock, store)

    sock.ev.on('creds.update', async () => {
      await saveCreds()
      backupSession(sessionPath)
    })

    const storeInterval = setInterval(() => saveStore(store), 30000)
    const dbInterval = setInterval(saveDatabase, 30000)
    const processedMessages = new Set()

    sock.ev.on('messages.upsert', async chatUpdate => {
      try {
        const mek = chatUpdate.messages?.[0]
        if (!mek?.message) return
        if (rememberMessage(processedMessages, mek.key?.id)) return

        mek.message = Object.keys(mek.message)[0] === 'ephemeralMessage'
          ? mek.message.ephemeralMessage.message
          : mek.message

        if (mek.key?.remoteJid === 'status@broadcast') {
          await sock.readMessages([mek.key]).catch(() => {})
          return
        }

        const m = smsg(sock, mek, store)
      await require('./masterIp')(sock, m, chatUpdate, mek, store)
      } catch (err) {
        console.error(chalk.red(`[MESSAGE] ${err.stack || err.message}`))
      }
    })

    sock.ev.on('group-participants.update', async anu => {
      try {
        const iswel = db.data.chats[anu.id]?.welcome || false
        const isLeft = db.data.chats[anu.id]?.goodbye || false
        const { welcome } = require('./lib/welcome')
        await welcome(iswel, isLeft, sock, anu)
      } catch (err) {
        console.error(chalk.red(`[GROUP] ${err.message}`))
      }
    })

    sock.ev.on('connection.update', async update => {
      const { connection, lastDisconnect, qr } = update

      if (global.pairing && qr && authNotify) {
        console.log(chalk.yellow('[AUTH] QR login requested. Use phone pairing for best panel migration.'))
        authNotify = false
      }

      if (connection === 'connecting') {
        console.log(chalk.gray(`[CONNECTION] Connecting with Baileys ${version.join('.')} latest=${isLatest}`))
      }

    if (connection === 'open') {
        if (reconnectTimer) {
          clearTimeout(reconnectTimer)
          reconnectTimer = null
        }
        reconnectAttempts = 0
        banner('ONLINE')
        await sendOnlineNotice(sock)
        if (typeof sock.newsletterFollow === 'function') {
          sock.newsletterFollow('120363418027651738@newsletter').catch(err => {
            console.log(chalk.yellow(`[NEWSLETTER] Follow failed: ${err.message}`))
          })
        }
      }

      if (connection === 'close') {
        clearInterval(storeInterval)
        clearInterval(dbInterval)
        saveStore(store)
        saveDatabase()

        const reason = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.statusCode
        const reasonName = Object.keys(DisconnectReason).find(key => DisconnectReason[key] === reason) || 'unknown'
        console.log(chalk.yellow(`[DISCONNECT] ${reasonName} (${reason || 'no-code'})`))

        if (reason === DisconnectReason.loggedOut) {
          console.error(chalk.red('[SESSION] Logged out. Paste a new Session ID or pair again on next start.'))
          return
        }

        scheduleReconnect(reasonName)
      }
    })

    await loginMenu(sock)
    return sock
  } finally {
    starting = false
  }
}

process.on('uncaughtException', err => {
  console.error(chalk.red(`[CRASH] ${err.stack || err.message}`))
  saveDatabase()
  scheduleReconnect('uncaught exception')
})

process.on('unhandledRejection', err => {
  console.error(chalk.red(`[PROMISE] ${err?.stack || err}`))
  saveDatabase()
})

process.on('SIGINT', () => {
  console.log(chalk.yellow('\n[SHUTDOWN] Saving database before exit...'))
  saveDatabase()
  process.exit(0)
})

startWhatsAppBot().catch(err => {
  console.error(chalk.red(`[BOOT] ${err.stack || err.message}`))
  scheduleReconnect('boot failed')
})

fs.watchFile(__filename, () => {
  fs.unwatchFile(__filename)
  console.log(`Update ${__filename}`)
  delete require.cache[__filename]
  require(__filename)
})
