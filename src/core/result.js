/**
 * 构建统一结构的任务执行结果。
 * @param {*} task
 * @param {*} options
 */
function createTaskResult(task, options) {
  var opts = options || {};
  return {
    taskId: task.id,
    taskName: task.name,
    ok: !!opts.ok,
    stage: opts.stage || (opts.ok ? "SUCCESS" : "FAILED"),
    startedAt: opts.startedAt || Date.now(),
    finishedAt: opts.finishedAt || Date.now(),
    costMs: opts.costMs == null ? 0 : opts.costMs,
    errorCode: opts.errorCode || "",
    errorMessage: opts.errorMessage || "",
    evidence: opts.evidence || []
  };
}

/**
 * 构建被跳过任务的结果对象。
 * @param {*} task
 * @param {*} reason
 */
function createSkippedResult(task, reason) {
  return createTaskResult(task, {
    ok: false,
    stage: "SKIPPED",
    errorCode: "E-TASK-SKIPPED",
    errorMessage: reason || "Task skipped",
    startedAt: Date.now(),
    finishedAt: Date.now(),
    costMs: 0,
    evidence: []
  });
}

/**
 * 汇总所有任务结果并生成整体执行报告。
 * @param {*} results
 * @param {*} mode
 */
function createSummary(results, mode) {
  var total = results.length;
  var success = results.filter(function (r) { return r.ok; }).length;
  var failed = results.filter(function (r) { return !r.ok && r.stage !== "SKIPPED"; }).length;
  var skipped = results.filter(function (r) { return r.stage === "SKIPPED"; }).length;
  var startedAt = total ? results[0].startedAt : Date.now();
  var finishedAt = total ? results[total - 1].finishedAt : Date.now();
  return {
    ok: failed === 0,
    mode: mode || "serial",
    total: total,
    success: success,
    failed: failed,
    skipped: skipped,
    startedAt: startedAt,
    finishedAt: finishedAt,
    costMs: Math.max(0, finishedAt - startedAt),
    errorCode: failed > 0 && success > 0 ? "E-MULTI-TASK-PARTIAL-FAILED" : (failed > 0 ? "E-TASK-FAILED" : ""),
    results: results
  };
}

module.exports = {
  createTaskResult: createTaskResult,
  createSkippedResult: createSkippedResult,
  createSummary: createSummary
};

