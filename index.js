const fs = require("fs/promises");
const { createWriteStream } = require("fs");
const path = require("path");
const ytdl = require("ytdl-core");
const ytpl = require("ytpl");
const bluebird = require("bluebird");
const sanitizeFileName = require("sanitize-filename");

const FILES_PATH = path.join(__dirname, "videos");
const VIDEOS_TO_DOWNLOAD_FILE = path.join(__dirname, "videos_to_download.txt");

async function createDownloadPath() {
  try {
    await fs.stat(FILES_PATH);
  } catch (error) {
    if (error.code === "ENOENT") {
      return fs.mkdir(FILES_PATH);
    }

    throw error;
  }
}

async function getUrlsToDownload() {
  try {
    const file = await fs.readFile(VIDEOS_TO_DOWNLOAD_FILE, {
      encoding: "utf8",
    });

    return file
      .toString()
      .split("\n")
      .filter((url) => !!url);
  } catch (error) {
    if (error.code === "ENOENT") {
      console.error(
        `Could not find ${VIDEOS_TO_DOWNLOAD_FILE.toString()} file.`
      );
      process.exit(1);
    }

    throw error;
  }
}

function isPlaylist(url) {
  return url.includes("&list=");
}

async function extractUrlsFromPlaylist(playlistUrl) {
  const playlistInfo = await ytpl(playlistUrl);
  return playlistInfo.items.map((item) => item.shortUrl);
}

async function downloadVideo(url) {
  const info = await ytdl.getInfo(url);
  const title = info.videoDetails.title;

  return new Promise((resolve, reject) => {
    const stream = ytdl.downloadFromInfo(info, {
      format: "18",
    });

    stream.pipe(
      createWriteStream(
        `${path.join(FILES_PATH, sanitizeFileName(title)).toString()}.mp4`
      )
    );

    stream.on("error", reject);
    stream.on("close", resolve);
  });
}

(async () => {
  await createDownloadPath();
  const urls = await getUrlsToDownload();
  const playlistUrls = urls.filter((url) => isPlaylist(url));
  const playlistVideoUrls = await bluebird.map(
    playlistUrls,
    (url) => extractUrlsFromPlaylist(url),
    {
      concurrency: 5,
    }
  );
  const videosURL = urls
    .filter((url) => !isPlaylist(url))
    .concat(playlistVideoUrls.flat());

  await bluebird.map(
    videosURL,
    (url) => {
      return downloadVideo(url);
    },
    {
      concurrency: 5,
    }
  );
})();
