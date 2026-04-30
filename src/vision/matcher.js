/**
 * 在 OCR 结果中匹配候选关键字是否出现。
 * @param {*} texts
 * @param {*} candidates
 */
function matchTextContains(texts, candidates) {
  if (!Array.isArray(texts) || !Array.isArray(candidates)) return false;
  return candidates.some(function (c) {
    return texts.some(function (t) {
      return String(t).indexOf(String(c)) >= 0;
    });
  });
}

module.exports = {
  matchTextContains: matchTextContains
};

