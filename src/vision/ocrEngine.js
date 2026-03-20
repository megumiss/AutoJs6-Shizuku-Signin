function setMode(mode) {
  ocr.mode = mode;
}

function detect(img, region) {
  if (region) {
    return ocr.detect(img, region);
  }
  return ocr.detect(img);
}

function recognize(img, region) {
  if (region) {
    return ocr.recognizeText(img, region);
  }
  return ocr.recognizeText(img);
}

module.exports = {
  setMode: setMode,
  detect: detect,
  recognize: recognize
};

