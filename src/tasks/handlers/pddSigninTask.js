var stubTask = require("./stubTask");

/**
 * 执行当前任务的主流程并返回标准任务结果。
 * @param {*} taskConfig
 * @param {*} ctx
 * @param {*} settings
 */
function run(taskConfig, ctx, settings) {
  return stubTask.runStub(
    taskConfig,
    ctx,
    settings,
    "PDD_STUB_SUCCESS",
    "拼多多签到流程待实现。当前为骨架流程。"
  );
}

module.exports = {
  run: run
};
