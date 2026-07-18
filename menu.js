const axios = require('axios')

function buildMenu({ user, mode, prefix, version, runtime, botname, ownername }) {
  return `
╭════════〔 ⚡ ${botname || 'MASTER-IP_MD'} ⚡ 〕════════╮
│        𝙉𝙀𝙓𝙐𝙎 • 𝘾𝙊𝙈𝙈𝘼𝙉𝘿 • 𝙋𝘼𝙉𝙀𝙇
╰══════════════════════════════════════╯

╭────────〔 👤 USER INFO 〕────────╮
│ 👤 User      : @${user}
│ ⚡ Mode      : ${mode}
│ 🛰 Prefix    : ${prefix}
│ 📦 Version   : ${version}
│ ⏱ Runtime   : ${runtime}
│ 💻 Engine    : Baileys MD
╰──────────────────────────────╯

┏━━━〔 ⚙ CORE 〕━━━━━━━━┓
┃ ⌬ ${prefix}menu
┃ ⌬ ${prefix}ai
┃ ⌬ ${prefix}gpt
┃ ⌬ ${prefix}sticker
┃ ⌬ ${prefix}runtime
┗━━━━━━━━━━━━━━━━━━━━━━┛
👑 Owner ➜ ${ownername || 'MASTER-IP'}

┏━━━〔 ⬇ DOWNLOAD 〕━━━┓
┃ ⌬ ${prefix}play
┃ ⌬ ${prefix}play2
┃ ⌬ ${prefix}song
┃ ⌬ ${prefix}video
┃ ⌬ ${prefix}ytmp3
┃ ⌬ ${prefix}ytmp4
┃ ⌬ ${prefix}tiktok
┗━━━━━━━━━━━━━━━━━━━━━━┛
👑 Owner ➜ ${ownername || 'MASTER-IP'}

┏━━━〔 🔍 SEARCH 〕━━━━━┓
┃ ⌬ ${prefix}yts
┃ ⌬ ${prefix}pinterest
┃ ⌬ ${prefix}npm
┃ ⌬ ${prefix}gimage
┗━━━━━━━━━━━━━━━━━━━━━━┛
👑 Owner ➜ ${ownername || 'MASTER-IP'}

┏━━━〔 👥 GROUP 〕━━━━━━┓
┃ ⌬ ${prefix}welcome
┃ ⌬ ${prefix}antilink
┃ ⌬ ${prefix}kick
┃ ⌬ ${prefix}tagall
┗━━━━━━━━━━━━━━━━━━━━━━┛
👑 Owner ➜ ${ownername || 'MASTER-IP'}

┏━━━〔 👑 OWNER 〕━━━━━━┓
┃ ⌬ ${prefix}public
┃ ⌬ ${prefix}self
┃ ⌬ ${prefix}restart
┃ ⌬ ${prefix}update
┃ ⌬ ${prefix}vv
┗━━━━━━━━━━━━━━━━━━━━━━┛
👑 Owner ➜ ${ownername || 'MASTER-IP'}

┏━━━〔 📡 CHANNEL 〕━━━━┓
┃ ⌬ ${prefix}cekidch
┗━━━━━━━━━━━━━━━━━━━━━━┛
👑 Owner ➜ ${ownername || 'MASTER-IP'}

╭────────〔 ⚙ SYSTEM STATUS 〕───────╮
│ ▣ Loading Modules      ✓
│ ▣ Database Connected   ✓
│ ▣ Session Verified     ✓
│ ▣ Plugins Loaded       ✓
│ ▣ Security Enabled     ✓
│ ▣ Root Access Granted  ✓
╰──────────────────────────────╯

\`\`\`text
[████████████████████] 100%

> boot()
> init.modules()
> verify.session()
> connect.whatsapp()
> load.plugins()
> system.ready()
\`\`\`
`
}

module.exports = async function menuCommand(ctx) {
  const { VranCe, m, setting, version, wm, prefix = '.' } = ctx
  const versionText = Array.isArray(version) ? `v${version.join('.')}` : `v${String(version || 'unknown')}`
  const menuImages = [
    'https://files.catbox.moe/8htopy.jpg',
    'https://files.catbox.moe/zpknjb.jpg',
    'https://files.catbox.moe/xt88an.jpg'
  ]
  const imageUrl = menuImages[Math.floor(Math.random() * menuImages.length)]
  const image = await axios.get(imageUrl, { responseType: 'arraybuffer' })
  const user = m.sender.replace(/[^0-9]/g, '')

  await VranCe.sendMessage(
    m.chat,
    {
      image: image.data,
      caption: buildMenu({
        user,
        mode: setting.public ? 'PUBLIC' : 'SELF',
        prefix,
        version: versionText,
        runtime: `${Math.floor(process.uptime() / 3600)}:${String(Math.floor(process.uptime() % 3600 / 60)).padStart(2, '0')}:${String(Math.floor(process.uptime() % 60)).padStart(2, '0')}`,
        botname: 'MASTER-IP_MD',
        ownername: global.ownername || 'MASTER-IP'
      }),
      contextInfo: {
        externalAdReply: {
          title: 'MASTER-IP Menu',
          body: 'Clean command panel',
          thumbnailUrl: imageUrl,
          thumbnail: image.data,
          mediaType: 1,
          mediaUrl: global.sch || imageUrl,
          sourceUrl: global.sch || imageUrl,
          renderLargerThumbnail: true,
          showAdAttribution: false
        },
        mentionedJid: [m.sender]
      }
    },
    { quoted: m }
  )
}
