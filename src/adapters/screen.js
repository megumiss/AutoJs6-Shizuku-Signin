var errors = require("../core/errors");

/**
 * 申请并确认截图权限可用。
 */
function ensureCapturePermission() {
  var ok = images.requestScreenCapture();
  if (!ok) {
    throw errors.createError("E-CAPTURE-PERMISSION-DENIED", "requestScreenCapture() failed");
  }
  if (typeof sleep === "function") sleep(300);
  return true;
}

/**
 * 执行截图并在异常时转换为统一错误。
 */
function capture() {
  try {
    return images.captureScreen();
  } catch (e) {
    throw errors.createError("E-CAPTURE-SECURITY-EXCEPTION", "captureScreen() failed", { cause: String(e) });
  }
}

/**
 * 按相对区域裁剪截图。
 * @param {*} img
 * @param {*} region
 */
function clip(img, region) {
  var w = img.getWidth();
  var h = img.getHeight();
  var x = Math.round(region[0] * w);
  var y = Math.round(region[1] * h);
  var cw = Math.round(region[2] * w);
  var ch = Math.round(region[3] * h);
  return images.clip(img, x, y, cw, ch);
}

/**
 * 保存图片到指定路径。
 * @param {*} img
 * @param {*} path
 */
function save(img, path) {
  images.save(img, path);
  return path;
}

module.exports = {
  ensureCapturePermission: ensureCapturePermission,
  capture: capture,
  clip: clip,
  save: save
};

