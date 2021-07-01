const puppeteer = require('puppeteer');
const fs = require('fs');

const { playlistLink, videoQuality } = require('./config');

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

function isDownloadingYet(path) {
  let dirCont = fs.readdirSync(path);
  let files = dirCont.filter(elm => {
    return elm.match(/.*\.(crdownload)/gi);
  });
  if (!files.length) {
    return false;
  }
  return true;
}

(loop = async link => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page._client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: './videos',
  });

  await page.goto(link ? link : playlistLink);

  await delay(2000);
  const nextButton = await page.$('.ytp-next-button');

  const videoLink = await await page.evaluate(() => location.href);

  await nextButton.evaluate(nextButton => {
    nextButton.click();
  });
  const newMusicLink = await page.evaluate(() => location.href);
  const videoID = newMusicLink.split('&')[0].split('=')[1];
  await page.goto(`https://www.y2mate.com/pt/youtube/${videoID}`);

  await page.waitForSelector(`a[data-fquality="${videoQuality}"]`);

  const selectQuality = await page.$(`a[data-fquality="${videoQuality}"]`);

  await selectQuality.evaluate(selectQuality => {
    selectQuality.click();
  });

  await page.waitForSelector('.btn-file');

  await delay(1500);
  const downloadButton = await page.$('.btn-file');

  await downloadButton.evaluate(downloadButton => {
    downloadButton.click();
  });
  let isDownloadingComplete = false;
  do {
    await delay(2000);
    if (!isDownloadingYet('./videos')) {
      isDownloadingComplete = true;
    }
  } while (!isDownloadingComplete);

  console.log(`👌 downloaded: ${videoLink}`);

  await browser.close();
  return loop(newMusicLink);
})();
