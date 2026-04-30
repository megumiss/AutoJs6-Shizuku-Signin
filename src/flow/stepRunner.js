/**
 * 执行单个步骤函数，便于后续扩展统一步骤控制。
 * @param {*} name
 * @param {*} fn
 */
function runStep(name, fn) {
  return fn();
}

module.exports = {
  runStep: runStep
};

