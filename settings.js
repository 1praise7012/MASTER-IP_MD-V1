const fs = require('fs')
const pack = require('./package.json')
global.pairing = false // false = pairing code | true = scan QR
global.PaiCode = "MASTERIP"
global.sessionName = "session" // Nama file session

global.botname = "𝐌𝐀𝐒𝐓𝐄𝐑-𝐈𝐏_𝐌𝐃" // Bot name
global.ownername = "𝐌𝐀𝐒𝐓𝐄𝐑-𝐈𝐏 & 𝐓𝐊𝐓_𝐓𝐄𝐂𝐇🇿🇼" // Owner name
global.owner = "263779540058" // Owner number
global.botNumber = "263xxx" //  Bot number
global.version = pack.version // Version

global.packname = "MASTER-IP◇Script" // Sticker packname 
global.author = "MASTER-IP" // Sticker author

global.wm = "MASTER-IP" // Watermark thumbnail
global.chjid = "120363418027651738" // Channel Id Gaush pakai @
global.gcjid = "120363418027651738" // Group Id Gaush pakai @
global.sch = "https://whatsapp.com/channel/0029Vb5vbMM0LKZJi9k4ED1a"
global.sgc = "https://chat.whatsapp.com/Io4z4RXyH6AAiBR0x7qL8K?mode=gi_t"
global.thumb = "https://files.catbox.moe/w1lfoq.jpg" // Thumbnail bot 

global.domain = "" // Domain harus diakhiri tanda [ / ]
global.apikey = "" // Plta
global.capikey = "" // Pltc
global.eggs = "15"
global.locc = "1"

let file = require.resolve(__filename)
fs.watchFile(file, () => {
  fs.unwatchFile(file)
  console.log(`Update ${__filename}`)
  delete require.cache[file]
  require(file)

})
