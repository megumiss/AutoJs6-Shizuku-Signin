var startup = require("./src/bootstrap/startup");
var taskRunner = require("./src/tasks/taskRunner");

/**
 * 将任务汇总对象格式化为单行摘要，便于控制台快速查看结果。
 * @param {*} summary
 */
function summaryLine(summary) {
  return [
    "mode=" + summary.mode,
    "total=" + summary.total,
    "success=" + summary.success,
    "failed=" + summary.failed,
    "skipped=" + summary.skipped,
    "costMs=" + summary.costMs
  ].join(" ");
}

/**
 * 提取汇总结果中的关键信息，避免打印过长日志。
 * @param {*} summary
 */
function compactSummary(summary) {
  return {
    ok: !!summary.ok,
    mode: summary.mode,
    total: summary.total,
    success: summary.success,
    failed: summary.failed,
    skipped: summary.skipped,
    costMs: summary.costMs,
    errorCode: summary.errorCode || "",
    tasks: (summary.results || []).map(function (r) {
      return {
        taskId: r.taskId,
        ok: !!r.ok,
        stage: r.stage,
        costMs: r.costMs,
        errorCode: r.errorCode || ""
      };
    })
  };
}

/**
 * 在运行环境支持时显示 Toast，避免非 UI 环境抛错。
 * @param {*} text
 */
function safeToast(text) {
  if (typeof toast === "function") {
    toast(text);
  }
}

/**
 * 执行主流程：初始化、运行任务、输出汇总并统一处理异常。
 */
function main() {
  var logger = null;
  try {
    var ctx = startup.init();
    logger = ctx.logger || null;

    var summary = taskRunner.runTasks(ctx.config, ctx);
    if (logger && typeof logger.info === "function") {
      logger.info("MAIN", "Run finished", compactSummary(summary));
    }

    console.log("[SUMMARY] " + summaryLine(summary));
    safeToast("Run done: " + summary.success + "/" + summary.total);
  } catch (e) {
    var code = e && e.code ? e.code : "E-UNHANDLED";
    var msg = e && e.message ? e.message : String(e);

    if (logger && typeof logger.error === "function") {
      logger.error("MAIN", "Run failed", { code: code, message: msg });
    }

    console.error("[" + code + "] " + msg);
    safeToast("Run failed: " + code);
    throw e;
  }
}

main();
