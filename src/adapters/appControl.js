var sh = require("./shizukuShell");

function forceStop(packageName) {
  return sh.exec("am force-stop " + packageName);
}

function goHome() {
  return sh.exec("input keyevent 3");
}

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

