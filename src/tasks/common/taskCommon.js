var errors = require("../../core/errors");
var input = require("../../adapters/input");
var screen = require("../../adapters/screen");
var ocrEngine = require("../../vision/ocrEngine");

function createTaskError(code, message, details) {
  return errors.createError(code, message, details || null);
}

function assertShellResult(result, code, message) {
  if (!result || !result.ok) {
    throw createTaskError(code, message, { shellResult: result || null });
  }
}

function sleepMs(ms) {
  if (typeof sleep === "function" && ms > 0) {
    sleep(Math.round(ms));
  }
}

function normalizeText(text) {
  return String(text == null ? "" : text).replace(/\s+/g, "").trim();
}

function toNumber(v) {
  var n = Number(v);
  return isNaN(n) ? null : n;
}

function extractText(node) {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (typeof node.text === "string") return node.text;
  if (typeof node.label === "string") return node.label;
  if (typeof node.value === "string") return node.value;
  if (typeof node.words === "string") return node.words;
  return "";
}

function extractOcrText(raw) {
  if (raw == null) return "";
  if (typeof raw === "string") return raw;

  if (Array.isArray(raw)) {
    return raw.map(function (item) {
      var text = extractText(item);
      return text || String(item == null ? "" : item);
    }).join(" ").trim();
  }

  if (raw && typeof raw === "object") {
    var t = extractText(raw);
    if (t) return t;
  }

  return String(raw);
}

function centerFromRect(rect) {
  if (!rect) return null;

  if (typeof rect.centerX === "function" && typeof rect.centerY === "function") {
    var cx = toNumber(rect.centerX());
    var cy = toNumber(rect.centerY());
    if (cx != null && cy != null) {
      return { x: Math.round(cx), y: Math.round(cy) };
    }
  }

  var centerX = toNumber(rect.centerX);
  var centerY = toNumber(rect.centerY);
  if (centerX != null && centerY != null) {
    return { x: Math.round(centerX), y: Math.round(centerY) };
  }

  var left = toNumber(rect.left);
  var right = toNumber(rect.right);
  var top = toNumber(rect.top);
  var bottom = toNumber(rect.bottom);
  if (left != null && right != null && top != null && bottom != null) {
    return {
      x: Math.round((left + right) / 2),
      y: Math.round((top + bottom) / 2)
    };
  }

  var x = toNumber(rect.x);
  var y = toNumber(rect.y);
  var width = toNumber(rect.width);
  var height = toNumber(rect.height);
  if (x != null && y != null && width != null && height != null) {
    return {
      x: Math.round(x + width / 2),
      y: Math.round(y + height / 2)
    };
  }

  return null;
}

function toPointArray(maybePoints) {
  if (!Array.isArray(maybePoints)) return [];
  var pts = [];

  for (var i = 0; i < maybePoints.length; i += 1) {
    var p = maybePoints[i];
    if (Array.isArray(p) && p.length >= 2) {
      var px1 = toNumber(p[0]);
      var py1 = toNumber(p[1]);
      if (px1 != null && py1 != null) {
        pts.push({ x: px1, y: py1 });
      }
      continue;
    }

    if (p && typeof p === "object") {
      var px = toNumber(p.x);
      var py = toNumber(p.y);
      if (px != null && py != null) {
        pts.push({ x: px, y: py });
      }
    }
  }

  return pts;
}

function centerFromPoints(maybePoints) {
  var pts = toPointArray(maybePoints);
  if (!pts.length) return null;

  var sumX = 0;
  var sumY = 0;
  for (var i = 0; i < pts.length; i += 1) {
    sumX += pts[i].x;
    sumY += pts[i].y;
  }

  return {
    x: Math.round(sumX / pts.length),
    y: Math.round(sumY / pts.length)
  };
}

function extractCenter(node) {
  if (!node || typeof node !== "object") return null;

  var p = centerFromRect(node.bounds);
  if (p) return p;

  p = centerFromRect(node.rect);
  if (p) return p;

  p = centerFromRect(node.bound);
  if (p) return p;

  p = centerFromPoints(node.box);
  if (p) return p;

  p = centerFromPoints(node.points);
  if (p) return p;

  return null;
}

function toDetectList(raw) {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== "object") return [];
  if (Array.isArray(raw.results)) return raw.results;
  if (Array.isArray(raw.items)) return raw.items;
  if (typeof raw.text === "string") return [raw];
  return [];
}

function findTargetFromDetect(raw, targetText) {
  var list = toDetectList(raw);
  var target = normalizeText(targetText);
  var best = null;

  for (var i = 0; i < list.length; i += 1) {
    var item = list[i];
    var text = extractText(item);
    if (!text) continue;

    var normalized = normalizeText(text);
    if (normalized.indexOf(target) < 0) continue;

    var point = extractCenter(item);
    var exact = normalized === target;
    var confidence = toNumber(item && item.confidence);
    var score = (exact ? 1000000 : 0) + (confidence == null ? 0 : confidence * 1000) - normalized.length;

    if (!best || score > best.score) {
      best = {
        text: text,
        point: point,
        score: score,
        confidence: confidence
      };
    }
  }

  return best;
}

function containsTargetByRecognize(img, targetText) {
  var raw = ocrEngine.recognize(img);
  var target = normalizeText(targetText);

  if (typeof raw === "string") {
    return normalizeText(raw).indexOf(target) >= 0;
  }
  if (Array.isArray(raw)) {
    for (var i = 0; i < raw.length; i += 1) {
      var t = extractText(raw[i]);
      if (normalizeText(t).indexOf(target) >= 0) {
        return true;
      }
    }
    return false;
  }
  if (raw && typeof raw === "object") {
    return normalizeText(extractText(raw)).indexOf(target) >= 0;
  }
  return false;
}

function waitAndClickText(options) {
  var step = options || {};
  var timeoutMs = toNumber(step.timeoutMs);
  if (timeoutMs == null || timeoutMs < 1000) timeoutMs = 20000;

  var pollMs = toNumber(step.pollMs);
  if (pollMs == null || pollMs < 100) pollMs = 500;

  var afterTapSleepMs = toNumber(step.afterTapSleepMs);
  if (afterTapSleepMs == null || afterTapSleepMs < 0) afterTapSleepMs = 800;

  var deadline = Date.now() + timeoutMs;
  var lastSeenNoPoint = null;

  while (Date.now() < deadline) {
    var img = null;
    try {
      img = screen.capture();
      var detectRaw = ocrEngine.detect(img);
      var matched = findTargetFromDetect(detectRaw, step.text);

      if (matched && matched.point) {
        var tapResult = input.tap(matched.point.x, matched.point.y);
        assertShellResult(tapResult, step.tapErrorCode || "E-TASK-TAP-TEXT", "点击“" + step.text + "”失败");

        if (Array.isArray(step.evidence)) {
          step.evidence.push("点击成功: " + step.text + " @(" + matched.point.x + "," + matched.point.y + ")");
        }

        if (step.ctx && step.ctx.logger && typeof step.ctx.logger.info === "function") {
          step.ctx.logger.info("TASK", "Text clicked", {
            taskId: step.taskId,
            step: step.stepId || "",
            text: step.text,
            x: matched.point.x,
            y: matched.point.y
          });
        }

        sleepMs(afterTapSleepMs);
        return;
      }

      if (matched && !matched.point) {
        lastSeenNoPoint = matched.text;
      } else if (containsTargetByRecognize(img, step.text)) {
        lastSeenNoPoint = step.text;
      }
    } finally {
      if (img && typeof img.recycle === "function") {
        img.recycle();
      }
    }

    sleepMs(pollMs);
  }

  throw createTaskError(step.waitErrorCode || "E-TASK-WAIT-TEXT-TIMEOUT", "等待并点击“" + step.text + "”超时", {
    timeoutMs: timeoutMs,
    seenButNoPoint: lastSeenNoPoint
  });
}

function getDeviceSize(defaultWidth, defaultHeight) {
  var width = (typeof device !== "undefined" && device && device.width) ? device.width : (defaultWidth || 1080);
  var height = (typeof device !== "undefined" && device && device.height) ? device.height : (defaultHeight || 2400);
  return {
    width: width,
    height: height
  };
}

module.exports = {
  createTaskError: createTaskError,
  assertShellResult: assertShellResult,
  extractOcrText: extractOcrText,
  waitAndClickText: waitAndClickText,
  sleepMs: sleepMs,
  getDeviceSize: getDeviceSize
};
