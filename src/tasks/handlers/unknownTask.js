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
    "GENERIC_STUB_SUCCESS",
    "自定义任务流程待实现。当前为骨架流程。"
  );
}

module.exports = {
  run: run
};
