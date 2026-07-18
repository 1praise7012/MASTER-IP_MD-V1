const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')
const ytdl = require('ytdl-core')
const { cleanup, searchYouTube } = require('./youtube')

function createTempVideoFile(extension = 'mp4') {
  return path.join(
    os.tmpdir(),
    `masterip-video-${Date.now()}-${Math.random().toString(16).slice(2)}.${extension}`
  )
}

function downloadVideo(url) {
  return new Promise(async (resolve, reject) => {
    try {
      const info = await ytdl.getInfo(url)
      const format = ytdl.chooseFormat(info.formats, {
        quality: 'highestvideo',
        filter: 'audioandvideo'
      })

      const filePath = createTempVideoFile(format.container || 'mp4')
      const output = fs.createWriteStream(filePath)
      const stream = ytdl.downloadFromInfo(info, { format })

      stream.on('error', reject)
      output.on('error', reject)
      output.on('finish', () => resolve({
        filePath,
        title: info.videoDetails?.title || 'masterip-video',
        thumbnail: info.videoDetails?.thumbnails?.[0]?.url || '',
        url
      }))

      stream.pipe(output)
    } catch (err) {
      reject(err)
    }
  })
}

module.exports = async function videoCommand(ctx) {
  const { VranCe, m, text, prefix = '.' } = ctx
  if (!text) return m.reply(`Send a YouTube link or search term.\nExample: ${prefix}video never gonna give you up`)

  try {
    const source = text.startsWith('http') ? { url: text, title: 'Video', thumbnail: '' } : await searchYouTube(text)
    const video = await downloadVideo(source.url)

    await VranCe.sendMessage(
      m.chat,
      {
        video: { url: video.filePath },
        caption: `MASTER-IP Video\n${source.title || video.title}`,
        contextInfo: {
          externalAdReply: {
            title: source.title || video.title,
            body: 'Video download',
            thumbnailUrl: source.thumbnail || video.thumbnail || undefined,
            mediaType: 2,
            mediaUrl: source.url || video.url,
            sourceUrl: source.url || video.url,
            renderLargerThumbnail: true,
            showAdAttribution: false
          }
        }
      },
      { quoted: m }
    )

    await cleanup(video.filePath)
  } catch (err) {
    console.error(err)
    m.reply('Video download failed.')
  }
}
