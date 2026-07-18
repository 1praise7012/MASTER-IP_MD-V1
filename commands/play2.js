const { cleanup, downloadYouTubeMp3, searchYouTube } = require('./youtube')

module.exports = async function play2Command(ctx) {
  const { VranCe, m, text, botname, prefix = '.' } = ctx
  if (!text) return m.reply(`Send an artist or song name.\nExample: ${prefix}play2 coldplay`)

  let media = null
  try {
    const video = await searchYouTube(text)
    media = await downloadYouTubeMp3(video.url)

    await VranCe.sendMessage(
      m.chat,
      {
        audio: { url: media.filePath },
        mimetype: 'audio/mpeg',
        ptt: false,
        contextInfo: {
          externalAdReply: {
            title: video.title,
            body: `${botname || 'MASTER-IP'} Play2`,
            thumbnailUrl: video.thumbnail || undefined,
            mediaType: 1,
            mediaUrl: video.url,
            sourceUrl: video.url,
            renderLargerThumbnail: true,
            showAdAttribution: false
          }
        }
      },
      { quoted: m }
    )
  } catch (err) {
    console.error(err)
    m.reply('Play2 failed.')
  } finally {
    if (media?.filePath) await cleanup(media.filePath)
  }
}
