var errors = require("../core/errors");

function checkRuntime() {
  if (typeof shizuku !== "function") {
    throw errors.createError("E-SHIZUKU-NOT-READY", "Global shizuku(...) is not available.");
  }
  if (typeof storages === "undefined") {
    throw errors.createError("E-RUNTIME-UNSUPPORTED", "Global storages is not available.");
  }
}

module.exports = {
  checkRuntime: checkRuntime
};

