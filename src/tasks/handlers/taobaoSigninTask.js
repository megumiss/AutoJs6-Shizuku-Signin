var stubTask = require("./stubTask");

function run(taskConfig, ctx, settings) {
  return stubTask.runStub(
    taskConfig,
    ctx,
    settings,
    "TAOBAO_STUB_SUCCESS",
    "淘宝签到流程待实现。当前为骨架流程。"
  );
}

module.exports = {
  run: run
};
