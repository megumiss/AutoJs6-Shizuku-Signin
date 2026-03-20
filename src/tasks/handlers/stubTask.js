var resultUtil = require("../../core/result");

function runStub(taskConfig, ctx, settings, stage, message) {
  var startedAt = Date.now();
  var dryRun = !!(settings && settings.dryRun);

  ctx.logger.info("TASK", "Stub run", {
    taskId: taskConfig.id,
    taskName: taskConfig.name,
    dryRun: dryRun
  });

  if (typeof sleep === "function") {
    sleep(300);
  }

  return resultUtil.createTaskResult(taskConfig, {
    ok: true,
    stage: dryRun ? "DRY_RUN" : stage,
    startedAt: startedAt,
    finishedAt: Date.now(),
    costMs: Date.now() - startedAt,
    errorCode: "",
    errorMessage: dryRun ? "演练模式，未执行真实操作。" : message,
    evidence: []
  });
}

module.exports = {
  runStub: runStub
};
