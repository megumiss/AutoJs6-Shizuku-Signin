var startup = require("./src/bootstrap/startup");
var taskRunner = require("./src/tasks/taskRunner");

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

function safeToast(text) {
  if (typeof toast === "function") {
    toast(text);
  }
}

function main() {
  var logger = null;
  try {
    var ctx = startup.init();
    logger = ctx.logger || null;

    var summary = taskRunner.runTasks(ctx.config, ctx);
    if (logger && typeof logger.info === "function") {
      logger.info("MAIN", "Run finished", summary);
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
