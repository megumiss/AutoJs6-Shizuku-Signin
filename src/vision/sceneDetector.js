var ocrEngine = require("./ocrEngine");
var matcher = require("./matcher");

/**
 * 根据场景名选择检测区域与候选文案，判断当前页面状态。
 * @param {*} sceneName
 * @param {*} screenshot
 * @param {*} task
 */
function detectScene(sceneName, screenshot, task) {
  var region = null;
  var candidates = [];
  if (sceneName === "HOME") {
    region = task.regions.homeMarker;
    candidates = task.markers.homeTexts;
  }
  if (sceneName === "SIGNIN") {
    region = task.regions.signinButton;
    candidates = task.markers.signinTexts;
  }
  if (sceneName === "DONE") {
    region = task.regions.successToast;
    candidates = task.markers.doneTexts;
  }
  var texts = ocrEngine.recognize(screenshot, region);
  var matched = matcher.matchTextContains(texts, candidates);
  return {
    matched: matched,
    score: matched ? 1 : 0,
    evidence: {
      scene: sceneName,
      texts: texts
    }
  };
}

module.exports = {
  detectScene: detectScene
};

