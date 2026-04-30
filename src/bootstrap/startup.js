var precheck = require("./precheck");
var storage = require("../core/storage");
var logger = require("../core/logger");
var errors = require("../core/errors");

function init() {
  precheck.checkRuntime();
  precheck.checkShizukuReady();
  precheck.checkCapturePermission();

  var loaded = storage.loadConfig();
  if (!loaded.ok) {
    throw errors.createError("E-CONFIG-INVALID", "Config is invalid.", { errors: loaded.errors });
  }

  return {
    config: loaded.config,
    logger: logger,
    storage: storage
  };
}

module.exports = {
  init: init
};
