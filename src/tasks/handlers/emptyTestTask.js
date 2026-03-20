var resultUtil = require("../../core/result");
var errors = require("../../core/errors");
var shizukuShell = require("../../adapters/shizukuShell");
var appControl = require("../../adapters/appControl");
var input = require("../../adapters/input");
var screen = require("../../adapters/screen");
var ocrEngine = require("../../vision/ocrEngine");

function createTaskError(code, message, details) {
  return errors.createError(code, message, details || null);
}

function assertShellResult(result, code, message) {
  if (!result || !result.ok) {
    throw createTaskError(code, message, { shellResult: result || null });
  }
}

function extractOcrPreview(ocrRaw) {
  if (ocrRaw == null) {
    return "";
  }
  if (typeof ocrRaw === "string") {
    return ocrRaw;
  }
  if (Array.isArray(ocrRaw)) {
    var line = ocrRaw.map(function (item) {
      if (item == null) return "";
      if (typeof item === "string") return item;
      if (typeof item.text === "string") return item.text;
      if (typeof item.label === "string") return item.label;
      return String(item);
    }).join(" ").trim();
    return line;
  }
  if (typeof ocrRaw.text === "string") {
    return ocrRaw.text;
  }
  return String(ocrRaw);
}

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

    var ready = shizukuShell.ensureReady();
    if (!ready.ok) {
      throw createTaskError("E-SHIZUKU-NOT-READY", "Shizuku 未就绪", ready);
    }
    screen.ensureCapturePermission();
    evidence.push("权限检查通过：shizuku + 截图权限");

    var packageName = String(taskConfig.testPackageName || taskConfig.packageName || "com.android.settings");
    var openResult = appControl.startApp({
      app: {
        packageName: packageName,
        launch: { mode: "package" }
      }
    });
    assertShellResult(openResult, "E-TEST-OPEN-APP", "测试任务打开应用失败");
    evidence.push("打开应用成功: " + packageName);

    if (typeof sleep === "function") {
      sleep(1200);
    }

    var img = null;
    var ocrPreview = "";
    try {
      img = screen.capture();
      var ocrRaw = ocrEngine.recognize(img);
      ocrPreview = extractOcrPreview(ocrRaw);
      if (!ocrPreview) {
        ocrPreview = "OCR结果为空";
      }
    } finally {
      if (img && typeof img.recycle === "function") {
        img.recycle();
      }
    }
    evidence.push("OCR识别完成: " + ocrPreview.substring(0, 80));

    var w = (typeof device !== "undefined" && device && device.width) ? device.width : 1080;
    var h = (typeof device !== "undefined" && device && device.height) ? device.height : 2400;

    var tapX = Math.round(w * 0.5);
    var tapY = Math.round(h * 0.5);
    var tapResult = input.tap(tapX, tapY);
    assertShellResult(tapResult, "E-TEST-TAP", "测试任务点击失败");
    evidence.push("点击完成: (" + tapX + "," + tapY + ")");

    if (typeof sleep === "function") {
      sleep(350);
    }

    var swipeResult = input.swipe(
      Math.round(w * 0.5),
      Math.round(h * 0.75),
      Math.round(w * 0.5),
      Math.round(h * 0.35),
      260
    );
    assertShellResult(swipeResult, "E-TEST-SWIPE", "测试任务滑动失败");
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
