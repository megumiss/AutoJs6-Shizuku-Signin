var errors = require("../core/errors");

/**
 * 将 Shizuku 原始返回转换为统一结构。
 * @param {*} raw
 * @param {*} costMs
 */
function normalizeResult(raw, costMs) {
  var code = raw && typeof raw.code === "number" ? raw.code : -1;
  return {
    ok: code === 0,
    code: code,
    stdout: raw && raw.result ? String(raw.result) : "",
    stderr: raw && raw.error ? String(raw.error) : "",
    costMs: costMs
  };
}

/**
 * 检查全局 shizuku 函数是否可调用。
 */
function ensureReady() {
  return {
    ok: typeof shizuku === "function",
    reason: typeof shizuku === "function" ? "" : "Global shizuku(...) not found"
  };
}

/**
 * 执行单条 shell 命令并返回标准结果。
 * @param {*} cmd
 */
function exec(cmd) {
  if (typeof shizuku !== "function") {
    throw errors.createError("E-SHIZUKU-NOT-READY", "Global shizuku(...) is not available.");
  }
  var started = Date.now();
  var raw = shizuku(String(cmd));
  return normalizeResult(raw, Date.now() - started);
}

/**
 * 批量执行 shell 命令并返回标准结果。
 * @param {*} cmdList
 */
function execMany(cmdList) {
  if (typeof shizuku !== "function") {
    throw errors.createError("E-SHIZUKU-NOT-READY", "Global shizuku(...) is not available.");
  }
  var started = Date.now();
  var raw = shizuku(cmdList);
  return normalizeResult(raw, Date.now() - started);
}

module.exports = {
  ensureReady: ensureReady,
  exec: exec,
  execMany: execMany
};

