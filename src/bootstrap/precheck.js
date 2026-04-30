var errors = require("../core/errors");
var shizukuShell = require("../adapters/shizukuShell");
var screen = require("../adapters/screen");

function checkRuntime() {
  if (typeof shizuku !== "function") {
    throw errors.createError("E-SHIZUKU-NOT-READY", "Global shizuku(...) is not available.");
  }
  if (typeof storages === "undefined") {
    throw errors.createError("E-RUNTIME-UNSUPPORTED", "Global storages is not available.");
  }
}

function checkShizukuReady() {
  var ready = shizukuShell.ensureReady();
  if (!ready.ok) {
    throw errors.createError("E-SHIZUKU-NOT-READY", "Shizuku is not ready.", ready);
  }
}

function checkCapturePermission() {
  screen.ensureCapturePermission();
}

module.exports = {
  checkRuntime: checkRuntime,
  checkShizukuReady: checkShizukuReady,
  checkCapturePermission: checkCapturePermission
};
