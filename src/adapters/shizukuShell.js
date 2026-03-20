var errors = require("../core/errors");

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

function ensureReady() {
  return {
    ok: typeof shizuku === "function",
    reason: typeof shizuku === "function" ? "" : "Global shizuku(...) not found"
  };
}

function exec(cmd) {
  if (typeof shizuku !== "function") {
    throw errors.createError("E-SHIZUKU-NOT-READY", "Global shizuku(...) is not available.");
  }
  var started = Date.now();
  var raw = shizuku(String(cmd));
  return normalizeResult(raw, Date.now() - started);
}

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

