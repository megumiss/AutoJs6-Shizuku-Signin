var stubTask = require("./stubTask");

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
