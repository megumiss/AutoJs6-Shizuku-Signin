/**
 * 按重试策略执行函数，直到成功或达到上限。
 * @param {*} fn
 * @param {*} options
 */
function runWithRetry(fn, options) {
  var opts = options || {};
  var maxRetry = opts.maxRetry == null ? 0 : opts.maxRetry;
  var intervalMs = opts.intervalMs == null ? 0 : opts.intervalMs;
  var lastError = null;

  for (var i = 0; i <= maxRetry; i += 1) {
    try {
      return fn(i);
    } catch (e) {
      lastError = e;
      if (i < maxRetry && intervalMs > 0 && typeof sleep === "function") {
        sleep(intervalMs);
      }
    }
  }
  throw lastError;
}

module.exports = {
  runWithRetry: runWithRetry
};

