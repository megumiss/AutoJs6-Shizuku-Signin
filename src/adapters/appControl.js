var sh = require("./shizukuShell");

/**
 * 强制停止指定应用进程。
 * @param {*} packageName
 */
function forceStop(packageName) {
  return sh.exec("am force-stop " + packageName);
}

/**
 * 发送 HOME 键回到桌面。
 */
function goHome() {
  return sh.exec("input keyevent 3");
}

/**
 * 按启动模式构造命令并拉起目标应用。
 * @param {*} task
 */
function startApp(task) {
  var app = task.app || {};
  var launch = app.launch || {};
  var mode = launch.mode || "package";

  if (mode === "component" && launch.component) {
    return sh.exec("am start -n " + launch.component);
  }
  if (mode === "deeplink" && launch.deeplink) {
    return sh.exec("am start -a android.intent.action.VIEW -d '" + launch.deeplink + "'");
  }
  return sh.exec("am start -p " + app.packageName);
}

module.exports = {
  startApp: startApp,
  forceStop: forceStop,
  goHome: goHome
};

