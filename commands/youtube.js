const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')
const ffmpegPath = require('ffmpeg-static')
const ytdl = require('ytdl-core')
const yts = require('yt-search')

function sanitizeFileName(name) {
  return String(name || 'media')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
}

async function searchYouTube(query) {
  const result = await yts(query)
  const video = result.videos?.[0]
  if (!video) throw new Error('No YouTube result found.')
  return video
}

function createTempFile(extension) {
  return path.join(
    os.tmpdir(),
    `masterip-${Date.now()}-${Math.random().toString(16).slice(2)}.${extension}`
  )
}

function downloadStream(url, options = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      const info = await ytdl.getInfo(url)
      const stream = ytdl.downloadFromInfo(info, {
        quality: options.quality || 'highestaudio',
        filter: options.filter || 'audioonly',
        highWaterMark: 1 << 25
      })
      resolve({ info, stream })
    } catch (err) {
      reject(err)
    }
  })
}

function convertToMp3(inputStream, outputPath) {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error('ffmpeg-static is not available.'))
      return
    }

    const ffmpeg = spawn(ffmpegPath, [
      '-y',
      '-i',
      'pipe:0',
      '-vn',
      '-codec:a',
      'libmp3lame',
      '-b:a',
      '192k',
      outputPath
    ])

    let errorOutput = ''
    ffmpeg.stderr.on('data', data => {
      errorOutput += data.toString()
    })

    ffmpeg.on('error', reject)
    ffmpeg.on('close', code => {
      if (code === 0) return resolve(outputPath)
      reject(new Error(errorOutput || `ffmpeg exited with code ${code}`))
    })

    inputStream.pipe(ffmpeg.stdin)
  })
}

async function downloadYouTubeMp3(url) {
  const { info, stream } = await downloadStream(url)
  const title = info.videoDetails?.title || 'masterip-audio'
  const filePath = createTempFile('mp3')
  await convertToMp3(stream, filePath)

  return {
    filePath,
    fileName: `${sanitizeFileName(title)}.mp3`,
    title,
    thumbnail: info.videoDetails?.thumbnails?.[0]?.url || '',
    url,
    mimetype: 'audio/mpeg'
  }
}

async function cleanup(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath)
  } catch {}
}

module.exports = {
  cleanup,
  downloadYouTubeMp3,
  searchYouTube,
  sanitizeFileName
}
