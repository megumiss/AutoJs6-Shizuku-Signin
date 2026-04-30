var errors = require("../core/errors");
var shizukuShell = require("../adapters/shizukuShell");
var screen = require("../adapters/screen");

/**
 * 检查运行时关键全局能力是否可用。
 */
function checkRuntime() {
  if (typeof shizuku !== "function") {
    throw errors.createError("E-SHIZUKU-NOT-READY", "Global shizuku(...) is not available.");
  }
  if (typeof storages === "undefined") {
    throw errors.createError("E-RUNTIME-UNSUPPORTED", "Global storages is not available.");
  }
}

/**
 * 检查 Shizuku 通道是否可用。
 */
function checkShizukuReady() {
  var ready = shizukuShell.ensureReady();
  if (!ready.ok) {
    throw errors.createError("E-SHIZUKU-NOT-READY", "Shizuku is not ready.", ready);
  }
}

/**
 * 检查并申请截图权限。
 */
function checkCapturePermission() {
  screen.ensureCapturePermission();
}

module.exports = {
  checkRuntime: checkRuntime,
  checkShizukuReady: checkShizukuReady,
  checkCapturePermission: checkCapturePermission
};
