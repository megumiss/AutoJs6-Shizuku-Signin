var resultUtil = require("../../core/result");
var appControl = require("../../adapters/appControl");
var screen = require("../../adapters/screen");
var taskCommon = require("../common/taskCommon");

/**
 * 执行当前任务的主流程并返回标准任务结果。
 * @param {*} taskConfig
 * @param {*} ctx
 * @param {*} settings
 */
function run(taskConfig, ctx, settings) {
  var startedAt = Date.now();
  var dryRun = !!(settings && settings.dryRun);
  var evidence = [];

  if (dryRun) {
    return resultUtil.createTaskResult(taskConfig, {
      ok: true,
      stage: "DRY_RUN",
      startedAt: startedAt,
      finishedAt: Date.now(),
      costMs: Date.now() - startedAt,
      errorMessage: "演练模式：淘宝签到任务未执行真实动作。",
      evidence: ["dryRun=true"]
    });
  }

  try {
    var packageName = "com.taobao.taobao";
    var launchComponent = "com.taobao.taobao/com.taobao.tao.welcome.Welcome";
    var openResult = appControl.startApp({
      app: {
        packageName: packageName,
        launch: { mode: "component", component: launchComponent }
      }
    });
    if (!openResult || !openResult.ok) {
      throw new Error("打开淘宝失败");
    }
    evidence.push("打开应用成功: " + launchComponent);
    taskCommon.sleepMs(1200);

    while (1) {
      var img = screen.capture();
      try {
        var rSign = taskCommon.appearThenClickOnImage(img, "签到领金币");
        if (rSign) {
          evidence.push("点击成功: 签到领金币 @(" + rSign.point.x + "," + rSign.point.y + ")");
          return resultUtil.createTaskResult(taskConfig, {
            ok: true,
            stage: "TAOBAO_SIGNIN_DONE",
            startedAt: startedAt,
            finishedAt: Date.now(),
            costMs: Date.now() - startedAt,
            errorMessage: "",
            evidence: evidence
          });
        }

        var rGold = taskCommon.appearThenClickOnImage(img, "淘金币抵");
        if (rGold) {
          evidence.push("点击成功: 淘金币抵 @(" + rGold.point.x + "," + rGold.point.y + ")");
          continue;
        }

        var rMine = taskCommon.appearThenClickOnImage(img, "我的淘宝");
        if (rMine) {
          evidence.push("点击成功: 我的淘宝 @(" + rMine.point.x + "," + rMine.point.y + ")");
          continue;
        }
      } finally {
        if (img && typeof img.recycle === "function") {
          img.recycle();
        }
      }
    }
  } catch (e) {
    var msg = e && e.message ? e.message : String(e);
    ctx.logger.error("TASK", "Taobao sign-in task failed: " + msg);

    return resultUtil.createTaskResult(taskConfig, {
      ok: false,
      stage: "TAOBAO_SIGNIN_FAILED",
      startedAt: startedAt,
      finishedAt: Date.now(),
      costMs: Date.now() - startedAt,
      errorMessage: msg,
      evidence: evidence
    });
  }
}

module.exports = {
  run: run
};
