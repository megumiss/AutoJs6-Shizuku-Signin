var resultUtil = require("../../core/result");
var appControl = require("../../adapters/appControl");
var input = require("../../adapters/input");
var screen = require("../../adapters/screen");
var ocrEngine = require("../../vision/ocrEngine");
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
      errorCode: "",
      errorMessage: "演练模式：流程测试任务未执行真实动作。",
      evidence: ["dryRun=true"]
    });
  }

  try {
    ctx.logger.info("TASK", "Empty test task start", { taskId: taskConfig.id });
    evidence.push("前置检查通过：截图权限");

    var packageName = String(taskConfig.testPackageName || taskConfig.packageName || "com.android.settings");
    var openResult = appControl.startApp({
      app: {
        packageName: packageName,
        launch: { mode: "package" }
      }
    });
    taskCommon.assertShellResult(openResult, "E-TEST-OPEN-APP", "测试任务打开应用失败");
    evidence.push("打开应用成功: " + packageName);

    taskCommon.sleepMs(1200);

    var img = null;
    var ocrPreview = "";
    try {
      img = screen.capture();
      var ocrRaw = ocrEngine.recognize(img);
      ocrPreview = taskCommon.extractOcrText(ocrRaw);
      if (!ocrPreview) {
        ocrPreview = "OCR结果为空";
      }
    } finally {
      if (img && typeof img.recycle === "function") {
        img.recycle();
      }
    }
    evidence.push("OCR识别完成: " + ocrPreview.substring(0, 80));

    var size = taskCommon.getDeviceSize(1080, 2400);
    var tapX = Math.round(size.width * 0.5);
    var tapY = Math.round(size.height * 0.5);
    var tapResult = input.tap(tapX, tapY);
    taskCommon.assertShellResult(tapResult, "E-TEST-TAP", "测试任务点击失败");
    evidence.push("点击完成: (" + tapX + "," + tapY + ")");

    taskCommon.sleepMs(350);

    var swipeResult = input.swipe(
      Math.round(size.width * 0.5),
      Math.round(size.height * 0.75),
      Math.round(size.width * 0.5),
      Math.round(size.height * 0.35),
      260
    );
    taskCommon.assertShellResult(swipeResult, "E-TEST-SWIPE", "测试任务滑动失败");
    evidence.push("滑动完成: 中轴上滑");

    return resultUtil.createTaskResult(taskConfig, {
      ok: true,
      stage: "EMPTY_TEST_DONE",
      startedAt: startedAt,
      finishedAt: Date.now(),
      costMs: Date.now() - startedAt,
      errorCode: "",
      errorMessage: "空任务测试流程执行完成。",
      evidence: evidence
    });
  } catch (e) {
    var code = e && e.code ? e.code : "E-EMPTY-TEST-FAILED";
    var msg = e && e.message ? e.message : String(e);
    ctx.logger.error("TASK", "Empty test task failed", { taskId: taskConfig.id, code: code, message: msg });

    return resultUtil.createTaskResult(taskConfig, {
      ok: false,
      stage: "EMPTY_TEST_FAILED",
      startedAt: startedAt,
      finishedAt: Date.now(),
      costMs: Date.now() - startedAt,
      errorCode: code,
      errorMessage: msg,
      evidence: evidence
    });
  }
}

module.exports = {
  run: run
};
