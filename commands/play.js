const { cleanup, downloadYouTubeMp3, searchYouTube } = require('./youtube')

async function sendMp3(VranCe, m, media, botname) {
  try {
    await VranCe.sendMessage(
      m.chat,
      {
        audio: { url: media.filePath },
        mimetype: 'audio/mpeg',
        ptt: false,
        contextInfo: {
          externalAdReply: {
            title: media.title,
            body: `${botname || 'MASTER-IP'} Music`,
            thumbnailUrl: media.thumbnail || undefined,
            mediaType: 1,
            mediaUrl: media.url,
            sourceUrl: media.url,
            renderLargerThumbnail: true,
            showAdAttribution: false
          }
        }
      },
      { quoted: m }
    )
  } finally {
    await cleanup(media.filePath)
  }
}

module.exports = async function playCommand(ctx) {
  const { VranCe, m, text, botname, prefix = '.' } = ctx
  if (!text) return m.reply(`Send a song title.\nExample: ${prefix}play angel baby`)

  try {
    const video = await searchYouTube(text)
    const media = await downloadYouTubeMp3(video.url)
    media.title = video.title
    media.thumbnail = video.thumbnail
    await sendMp3(VranCe, m, media, botname)
  } catch (err) {
    console.error(err)
    m.reply('Music search failed.')
  }
}
