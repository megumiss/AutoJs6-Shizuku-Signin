var taobaoSigninTask = require("./handlers/taobaoSigninTask");
var pddSigninTask = require("./handlers/pddSigninTask");
var emptyTestTask = require("./handlers/emptyTestTask");
var unknownTask = require("./handlers/unknownTask");

var taskHandlerMap = {
  taobao_signin: taobaoSigninTask,
  pdd_signin: pddSigninTask,
  empty_test_task: emptyTestTask
};

/**
 * 根据任务 ID 获取对应处理器，未知任务走兜底处理器。
 * @param {*} taskId
 */
function getHandler(taskId) {
  return taskHandlerMap[taskId] || unknownTask;
}

/**
 * 执行当前任务的主流程并返回标准任务结果。
 * @param {*} taskConfig
 * @param {*} ctx
 * @param {*} settings
 */
function run(taskConfig, ctx, settings) {
  var handler = getHandler(taskConfig.id);
  return handler.run(taskConfig, ctx, settings);
}

module.exports = {
  run: run,
  getHandler: getHandler,
  taskHandlerMap: taskHandlerMap
};
