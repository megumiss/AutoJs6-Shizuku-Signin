var errors = require("../core/errors");
var shizukuShell = require("../adapters/shizukuShell");
var screen = require("../adapters/screen");
var input = require("../adapters/input");

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

/**
 * 在支持 sleep 的环境中按毫秒等待。
 * @param {*} ms
 */
function sleepMs(ms) {
  if (typeof sleep === "function" && ms > 0) {
    sleep(Math.round(ms));
  }
}

/**
 * 获取设备分辨率，缺失时使用默认值。
 */
function getDeviceSize() {
  return {
    width: (typeof device !== "undefined" && device && device.width) ? device.width : 1080,
    height: (typeof device !== "undefined" && device && device.height) ? device.height : 2400
  };
}

/**
 * 通过系统状态判断当前是否处于锁屏界面。
 */
function isKeyguardShowing() {
  var result = shizukuShell.exec("dumpsys activity activities");
  if (!result || !result.ok) return null;

  var text = String(result.stdout || "");
  if (
    text.indexOf("mKeyguardShowing=true") >= 0 ||
    text.indexOf("KeyguardShowing=true") >= 0 ||
    text.indexOf("isKeyguardShowing=true") >= 0
  ) {
    return true;
  }
  if (
    text.indexOf("mKeyguardShowing=false") >= 0 ||
    text.indexOf("KeyguardShowing=false") >= 0 ||
    text.indexOf("isKeyguardShowing=false") >= 0
  ) {
    return false;
  }
  return null;
}

/**
 * 对输入文本做转义，兼容 input text 命令格式。
 * @param {*} v
 */
function escapeInputText(v) {
  return String(v == null ? "" : v).replace(/\s/g, "%s");
}

/**
 * 执行唤醒、上滑、输入密码等步骤完成解锁。
 * @param {*} lockScreenPassword
 */
function unlockDevice(lockScreenPassword) {
  var password = String(lockScreenPassword == null ? "" : lockScreenPassword);
  var before = isKeyguardShowing();
  if (before === false) {
    return { ok: true, state: "already_unlocked" };
  }

  var wakeResult = input.keyevent(224);
  if (!wakeResult || !wakeResult.ok) {
    throw errors.createError("E-DEVICE-WAKE-FAILED", "唤醒屏幕失败", { shellResult: wakeResult || null });
  }
  sleepMs(350);

  // Best effort: some ROMs support dismiss-keyguard, some ignore it.
  shizukuShell.exec("wm dismiss-keyguard");
  sleepMs(150);

  var size = getDeviceSize();
  var swipeResult = input.swipe(
    Math.round(size.width * 0.5),
    Math.round(size.height * 0.82),
    Math.round(size.width * 0.5),
    Math.round(size.height * 0.28),
    260
  );
  if (!swipeResult || !swipeResult.ok) {
    throw errors.createError("E-DEVICE-UNLOCK-SWIPE-FAILED", "上滑解锁失败", { shellResult: swipeResult || null });
  }
  sleepMs(350);

  if (password) {
    var textResult = input.text(escapeInputText(password));
    if (!textResult || !textResult.ok) {
      throw errors.createError("E-DEVICE-UNLOCK-PASSWORD-FAILED", "输入锁屏密码失败", { shellResult: textResult || null });
    }
    sleepMs(150);

    var enterResult = input.keyevent(66);
    if (!enterResult || !enterResult.ok) {
      throw errors.createError("E-DEVICE-UNLOCK-CONFIRM-FAILED", "确认锁屏密码失败", { shellResult: enterResult || null });
    }
    sleepMs(700);
  }

  var after = isKeyguardShowing();
  if (after === true) {
    throw errors.createError("E-DEVICE-UNLOCK-FAILED", "设备仍处于锁屏状态，请检查解锁方式或密码配置。", {
      hasPassword: !!password,
      before: before,
      after: after
    });
  }

  return {
    ok: true,
    state: before === true ? "unlocked" : "attempted"
  };
}

module.exports = {
  checkRuntime: checkRuntime,
  checkShizukuReady: checkShizukuReady,
  checkCapturePermission: checkCapturePermission,
  unlockDevice: unlockDevice,
  isKeyguardShowing: isKeyguardShowing
};
