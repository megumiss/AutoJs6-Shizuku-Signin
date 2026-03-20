var taobaoSigninTask = require("./handlers/taobaoSigninTask");
var pddSigninTask = require("./handlers/pddSigninTask");
var emptyTestTask = require("./handlers/emptyTestTask");
var unknownTask = require("./handlers/unknownTask");

var taskHandlerMap = {
  taobao_signin: taobaoSigninTask,
  pdd_signin: pddSigninTask,
  empty_test_task: emptyTestTask
};

function getHandler(taskId) {
  return taskHandlerMap[taskId] || unknownTask;
}

function run(taskConfig, ctx, settings) {
  var handler = getHandler(taskConfig.id);
  return handler.run(taskConfig, ctx, settings);
}

module.exports = {
  run: run,
  getHandler: getHandler,
  taskHandlerMap: taskHandlerMap
};
