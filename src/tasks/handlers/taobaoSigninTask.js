var resultUtil = require("../../core/result");
var appControl = require("../../adapters/appControl");
var taskCommon = require("../common/taskCommon");

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
      errorMessage: "演练模式：淘宝签到任务未执行真实动作。",
      evidence: ["dryRun=true"]
    });
  }

  try {
    ctx.logger.info("TASK", "Taobao sign-in task start", { taskId: taskConfig.id });
    evidence.push("前置检查通过：Shizuku + 截图权限");

    var packageName = "com.taobao.taobao";
    var launchComponent = "com.taobao.taobao/com.taobao.tao.welcome.Welcome";
    var openResult = appControl.startApp({
      app: {
        packageName: packageName,
        launch: { mode: "component", component: launchComponent }
      }
    });
    taskCommon.assertShellResult(openResult, "E-TAOBAO-OPEN-APP", "打开淘宝失败");
    evidence.push("打开应用成功: " + launchComponent);

    var pollMs = Number(taskConfig.pollMs || 600);
    if (isNaN(pollMs) || pollMs < 150) pollMs = 600;

    var steps = [
      {
        id: "MY_TAOBAO",
        text: "我的淘宝",
        waitErrorCode: "E-TAOBAO-WAIT-MY-TAOBAO",
        tapErrorCode: "E-TAOBAO-TAP-MY-TAOBAO",
        afterTapSleepMs: 1000,
        timeoutMs: Number(taskConfig.waitMyTaobaoMs || 20000)
      },
      {
        id: "TAOJINBI_DI",
        text: "淘金币抵",
        waitErrorCode: "E-TAOBAO-WAIT-TAOJINBI-DI",
        tapErrorCode: "E-TAOBAO-TAP-TAOJINBI-DI",
        afterTapSleepMs: 1200,
        timeoutMs: Number(taskConfig.waitTaojinbiMs || 20000)
      },
      {
        id: "SIGNIN_GET_GOLD",
        text: "签到领金币",
        waitErrorCode: "E-TAOBAO-WAIT-SIGNIN-GET-GOLD",
        tapErrorCode: "E-TAOBAO-TAP-SIGNIN-GET-GOLD",
        afterTapSleepMs: 1200,
        timeoutMs: Number(taskConfig.waitSigninBtnMs || 20000)
      }
    ];

    for (var i = 0; i < steps.length; i += 1) {
      var step = steps[i];
      if (isNaN(step.timeoutMs) || step.timeoutMs < 1000) {
        step.timeoutMs = 20000;
      }

      evidence.push("等待目标出现: " + step.text);
      taskCommon.waitAndClickText({
        ctx: ctx,
        taskId: taskConfig.id,
        stepId: step.id,
        text: step.text,
        timeoutMs: step.timeoutMs,
        pollMs: pollMs,
        afterTapSleepMs: step.afterTapSleepMs,
        tapErrorCode: step.tapErrorCode,
        waitErrorCode: step.waitErrorCode,
        evidence: evidence
      });
    }

    return resultUtil.createTaskResult(taskConfig, {
      ok: true,
      stage: "TAOBAO_SIGNIN_DONE",
      startedAt: startedAt,
      finishedAt: Date.now(),
      costMs: Date.now() - startedAt,
      errorCode: "",
      errorMessage: "",
      evidence: evidence
    });
  } catch (e) {
    var code = e && e.code ? e.code : "E-TAOBAO-SIGNIN-FAILED";
    var msg = e && e.message ? e.message : String(e);
    ctx.logger.error("TASK", "Taobao sign-in task failed", { taskId: taskConfig.id, code: code, message: msg });

    return resultUtil.createTaskResult(taskConfig, {
      ok: false,
      stage: "TAOBAO_SIGNIN_FAILED",
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
