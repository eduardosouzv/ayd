const puppeteer = require('puppeteer');
const fs = require('fs');

const { playlistLink, videoQuality } = require('./config');

function _delay(time) {
  return new Promise(resolve => {
    setTimeout(resolve, time);
  });
}

function _isDownloadingYet(path) {
  let dirCont = fs.readdirSync(path);
  let files = dirCont.filter(elm => {
    return elm.match(/.*\.(crdownload)/gi);
  });
  if (!files.length) {
    return false;
  }
  return true;
}

function _isLastPostionOnPlaylist(playlist) {
  const actualPostion = parseInt(playlist.split('/')[0].trim());
  const playlistLength = parseInt(playlist.split('/')[1].trim());

  if (actualPostion === playlistLength) {
    return true;
  }
  return false;
}

(loop = async link => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page._client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: './videos',
  });

  await page.goto(link ? link : playlistLink);

  await _delay(2000);

  const nextButton = await page.$('.ytp-next-button');

  const actualLink = await page.evaluate(() => location.href);

  await page.waitForSelector(
    'yt-formatted-string[class="index-message style-scope ytd-playlist-panel-renderer"]',
  );
  let elementPlaylistPosition = await page.$(
    'yt-formatted-string[class="index-message style-scope ytd-playlist-panel-renderer"]',
  );
  let formattedPlaylistPosition = await elementPlaylistPosition.evaluate(
    el => el.textContent,
  );

  await nextButton.evaluate(nextButton => {
    nextButton.click();
  });
  const nextLink = await page.evaluate(() => location.href);
  const actualLinkId = actualLink.split('&')[0].split('=')[1];
  await page.goto(`https://www.y2mate.com/pt/youtube/${actualLinkId}`);

  await page.waitForSelector(`a[data-fquality="${videoQuality}"]`);

  const selectQuality = await page.$(`a[data-fquality="${videoQuality}"]`);

  await selectQuality.evaluate(selectQuality => {
    selectQuality.click();
  });

  await page.waitForSelector('.btn-file');

  await _delay(1500);
  const downloadButton = await page.$('.btn-file');

  await downloadButton.evaluate(downloadButton => {
    downloadButton.click();
  });
  let isDownloadingComplete = false;
  do {
    await _delay(2000);
    if (!_isDownloadingYet('./videos')) {
      isDownloadingComplete = true;
    }
  } while (!isDownloadingComplete);

  console.log(`[${formattedPlaylistPosition}] 👌 downloaded: ${actualLink}`);

  await browser.close();
  if (_isLastPostionOnPlaylist(formattedPlaylistPosition)) {
    console.log('👍 finished');
    return;
  }
  return loop(nextLink);
})();
