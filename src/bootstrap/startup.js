var precheck = require("./precheck");
var storage = require("../core/storage");
var logger = require("../core/logger");
var errors = require("../core/errors");

/**
 * 执行启动初始化：预检、配置加载、解锁与权限准备。
 */
function init() {
  precheck.checkRuntime();
  precheck.checkShizukuReady();

  // 先读取配置，解锁阶段要使用用户配置的锁屏密码。
  var loaded = storage.loadConfig();
  if (!loaded.ok) {
    throw errors.createError("E-CONFIG-INVALID", "Config is invalid.", { errors: loaded.errors });
  }

  var settings = (loaded.config && loaded.config.settings) ? loaded.config.settings : {};
  // 启动阶段先完成解锁，避免后续任务在锁屏界面执行失败。
  var unlockInfo = precheck.unlockDevice(settings.lockScreenPassword);
  if (logger && typeof logger.info === "function") {
    logger.info("BOOT", "Device unlock check", unlockInfo);
  }

  // 解锁后再检查截图权限，确保授权弹窗在可操作状态下出现。
  precheck.checkCapturePermission();

  return {
    config: loaded.config,
    logger: logger,
    storage: storage
  };
}

module.exports = {
  init: init
};
