var sh = require("./shizukuShell");

/**
 * 执行点击坐标操作。
 * @param {*} x
 * @param {*} y
 */
function tap(x, y) {
  return sh.exec("input tap " + Math.round(x) + " " + Math.round(y));
}

/**
 * 执行滑动手势操作。
 * @param {*} x1
 * @param {*} y1
 * @param {*} x2
 * @param {*} y2
 * @param {*} duration
 */
function swipe(x1, y1, x2, y2, duration) {
  var d = duration == null ? 300 : Math.max(1, Math.round(duration));
  return sh.exec("input swipe " + Math.round(x1) + " " + Math.round(y1) + " " + Math.round(x2) + " " + Math.round(y2) + " " + d);
}

/**
 * 发送系统按键事件。
 * @param {*} code
 */
function keyevent(code) {
  return sh.exec("input keyevent " + code);
}

/**
 * 输入文本到当前焦点控件。
 * @param {*} value
 */
function text(value) {
  return sh.exec("input text " + String(value));
}

module.exports = {
  tap: tap,
  swipe: swipe,
  keyevent: keyevent,
  text: text
};

