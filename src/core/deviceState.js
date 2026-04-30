var errors = require("./errors");
var shizukuShell = require("../adapters/shizukuShell");
var input = require("../adapters/input");
var appControl = require("../adapters/appControl");

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
 * 校验 shell 调用结果，失败时抛出统一错误。
 * @param {*} result
 * @param {*} code
 * @param {*} message
 */
function assertShellOk(result, code, message) {
  if (!result || !result.ok) {
    throw errors.createError(code || "E-DEVICE-STATE-CMD-FAILED", message || "Device state command failed.", {
      shellResult: result || null
    });
  }
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
  assertShellOk(wakeResult, "E-DEVICE-WAKE-FAILED", "唤醒屏幕失败");
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
  assertShellOk(swipeResult, "E-DEVICE-UNLOCK-SWIPE-FAILED", "上滑解锁失败");
  sleepMs(350);

  if (password) {
    var textResult = input.text(escapeInputText(password));
    assertShellOk(textResult, "E-DEVICE-UNLOCK-PASSWORD-FAILED", "输入锁屏密码失败");
    sleepMs(150);

    var enterResult = input.keyevent(66);
    assertShellOk(enterResult, "E-DEVICE-UNLOCK-CONFIRM-FAILED", "确认锁屏密码失败");
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

/**
 * 所有任务完成后执行收尾动作：回到桌面并锁屏。
 * @param {*} logger
 */
function finalizeDeviceState(logger) {
  var homeResult = appControl.goHome();
  assertShellOk(homeResult, "E-POST-HOME-FAILED", "任务完成后返回桌面失败。");
  sleepMs(250);

  var lockResult = input.keyevent(26);
  assertShellOk(lockResult, "E-POST-LOCK-FAILED", "任务完成后锁屏失败。");

  if (logger && typeof logger.info === "function") {
    logger.info("MAIN", "Post actions done", { action: "home_and_lock" });
  }
}

module.exports = {
  unlockDevice: unlockDevice,
  finalizeDeviceState: finalizeDeviceState,
  isKeyguardShowing: isKeyguardShowing
};
