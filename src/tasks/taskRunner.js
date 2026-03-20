var signinTask = require("./signinTask");
var resultUtil = require("../core/result");
var errors = require("../core/errors");

function runSingleTask(task, ctx, settings) {
  return signinTask.run(task, ctx, settings);
}

function runTasks(config, ctx) {
  var settings = config.settings || {};
  var mode = "serial";
  var stopOnFailure = !!settings.stopOnFailure;
  var taskGapMs = settings.taskGapMs == null ? 0 : Number(settings.taskGapMs);

  var enabledTasks = (config.tasks || []).filter(function (t) { return !!t.enabled; });
  if (!enabledTasks.length) {
    throw errors.createError("E-NO-ENABLED-TASK", "No enabled task found.");
  }

  var results = [];

  for (var i = 0; i < enabledTasks.length; i += 1) {
    if (i > 0 && taskGapMs > 0 && typeof sleep === "function") {
      sleep(taskGapMs);
    }

    var task = enabledTasks[i];
    ctx.logger.info("TASK", "Task start", { index: i, taskId: task.id });

    try {
      var r = runSingleTask(task, ctx, settings);
      results.push(r);
      ctx.logger.info("TASK", "Task done", { taskId: task.id, ok: r.ok, stage: r.stage });

      if (!r.ok && stopOnFailure) {
        for (var j = i + 1; j < enabledTasks.length; j += 1) {
          results.push(resultUtil.createSkippedResult(enabledTasks[j], "Skipped due to stopOnFailure"));
        }
        break;
      }
    } catch (e) {
      var code = e && e.code ? e.code : "E-TASK-UNHANDLED";
      var msg = e && e.message ? e.message : String(e);
      var failed = resultUtil.createTaskResult(task, {
        ok: false,
        stage: "FAILED",
        startedAt: Date.now(),
        finishedAt: Date.now(),
        costMs: 0,
        errorCode: code,
        errorMessage: msg,
        evidence: []
      });
      results.push(failed);
      ctx.logger.error("TASK", "Task failed", { taskId: task.id, code: code, message: msg });

      if (stopOnFailure) {
        for (var k = i + 1; k < enabledTasks.length; k += 1) {
          results.push(resultUtil.createSkippedResult(enabledTasks[k], "Skipped due to stopOnFailure"));
        }
        break;
      }
    }
  }

  return resultUtil.createSummary(results, mode);
}

module.exports = {
  runTasks: runTasks
};
