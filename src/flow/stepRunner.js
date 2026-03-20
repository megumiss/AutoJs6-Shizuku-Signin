function runStep(name, fn) {
  return fn();
}

module.exports = {
  runStep: runStep
};

