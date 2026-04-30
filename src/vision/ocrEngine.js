/**
 * 设置 OCR 识别模式。
 * @param {*} mode
 */
function setMode(mode) {
  ocr.mode = mode;
}

/**
 * 执行 OCR 检测，返回包含位置等结构化结果。
 * @param {*} img
 * @param {*} region
 */
function detect(img, region) {
  if (region) {
    return ocr.detect(img, region);
  }
  return ocr.detect(img);
}

/**
 * 执行 OCR 文本识别，返回文本内容结果。
 * @param {*} img
 * @param {*} region
 */
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

