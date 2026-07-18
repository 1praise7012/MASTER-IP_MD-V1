const { downloadContentFromMessage } = require('../lib/baileys')

async function extractBuffer(mediaMessage, mediaType) {
  const stream = await downloadContentFromMessage(mediaMessage, mediaType)
  let buffer = Buffer.alloc(0)
  for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk])
  return buffer
}

function getViewOnceMessage(message) {
  return (
    message?.viewOnceMessage?.message ||
    message?.viewOnceMessageV2?.message ||
    message?.viewOnceMessageV2Extension?.message ||
    message?.ephemeralMessage?.message?.viewOnceMessage?.message ||
    message?.ephemeralMessage?.message?.viewOnceMessageV2?.message ||
    message?.ephemeralMessage?.message?.viewOnceMessageV2Extension?.message ||
    null
  )
}

module.exports = async function vvCommand(ctx) {
  const { VranCe, m, isOwner, onlyOwn } = ctx
  if (!isOwner) return onlyOwn()
  if (!m.quoted) return m.reply('Reply to a view-once message.')

  const inner = getViewOnceMessage(m.quoted.message || m.quoted.msg || m.quoted)
  if (!inner) return m.reply('That is not a supported view-once message.')

  const type = Object.keys(inner)[0]
  const mediaType = type.replace('Message', '').toLowerCase()
  const buffer = await extractBuffer(inner[type], mediaType)

  await VranCe.sendMessage(m.chat, {
    [mediaType]: buffer,
    caption: 'View-once content unlocked'
  }, { quoted: m })
}
