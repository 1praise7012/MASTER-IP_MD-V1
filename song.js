const { cleanup, downloadYouTubeMp3, searchYouTube } = require('./youtube')

module.exports = async function songCommand(ctx) {
  const { VranCe, m, text, botname, prefix = '.' } = ctx
  if (!text) return m.reply(`Send a song title.\nExample: ${prefix}song one call away`)

  let media = null
  try {
    const video = await searchYouTube(text)
    media = await downloadYouTubeMp3(video.url)
    media.title = video.title
    media.thumbnail = video.thumbnail

    await VranCe.sendMessage(
      m.chat,
      {
        audio: { url: media.filePath },
        mimetype: 'audio/mpeg',
        ptt: false,
        contextInfo: {
          externalAdReply: {
            title: video.title,
            body: `${botname || 'MASTER-IP'} Song`,
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
    m.reply('Song search failed.')
  } finally {
    if (media?.filePath) await cleanup(media.filePath)
  }
}
