var errors = require("../../core/errors");
var input = require("../../adapters/input");
var screen = require("../../adapters/screen");
var ocrEngine = require("../../vision/ocrEngine");

/**
 * 创建统一结构的任务错误对象。
 * @param {*} code
 * @param {*} message
 * @param {*} details
 */
function createTaskError(code, message, details) {
  return errors.createError(code, message, details || null);
}

/**
 * 校验 shell 执行结果，失败时抛出任务错误。
 * @param {*} result
 * @param {*} code
 * @param {*} message
 */
function assertShellResult(result, code, message) {
  if (!result || !result.ok) {
    throw createTaskError(code, message, { shellResult: result || null });
  }
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
 * 标准化文本，去除空白后用于稳健匹配。
 * @param {*} text
 */
function normalizeText(text) {
  return String(text == null ? "" : text).replace(/\s+/g, "").trim();
}

/**
 * 将输入安全转换为数字，失败时返回 null。
 * @param {*} v
 */
function toNumber(v) {
  var n = Number(v);
  return isNaN(n) ? null : n;
}

/**
 * 从 OCR 节点对象提取可用文本字段。
 * @param {*} node
 */
function extractText(node) {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (typeof node.text === "string") return node.text;
  if (typeof node.label === "string") return node.label;
  if (typeof node.value === "string") return node.value;
  if (typeof node.words === "string") return node.words;
  return "";
}

/**
 * 将 OCR 原始结果统一拼接为可读文本。
 * @param {*} raw
 */
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

/**
 * 从矩形边界对象计算中心点坐标。
 * @param {*} rect
 */
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

/**
 * 将多种点位结构归一化为坐标数组。
 * @param {*} maybePoints
 */
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

/**
 * 根据多边形点位计算中心坐标。
 * @param {*} maybePoints
 */
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

/**
 * 从 OCR 节点中提取可点击中心点。
 * @param {*} node
 */
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

/**
 * 将 OCR detect 结果统一转换为数组结构。
 * @param {*} raw
 */
function toDetectList(raw) {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== "object") return [];
  if (Array.isArray(raw.results)) return raw.results;
  if (Array.isArray(raw.items)) return raw.items;
  if (typeof raw.text === "string") return [raw];
  return [];
}

/**
 * 在 detect 结果中查找目标文本并给出最佳命中项。
 * @param {*} raw
 * @param {*} targetText
 */
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

/**
 * 使用 recognize 结果兜底判断目标文本是否出现。
 * @param {*} img
 * @param {*} targetText
 */
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

/**
 * 轮询等待目标文本出现并点击其中心点。
 * @param {*} options
 */
function waitAndClickText(options) {
  var step = options || {};
  var timeoutMs = toNumber(step.timeoutMs);
  if (timeoutMs == null || timeoutMs < 1000) timeoutMs = 20000;

  var pollMs = toNumber(step.pollMs);
  if (pollMs == null || pollMs < 100) pollMs = 1000;

  var afterTapSleepMs = toNumber(step.afterTapSleepMs);
  if (afterTapSleepMs == null || afterTapSleepMs < 0) afterTapSleepMs = 800;

  var deadline = Date.now() + timeoutMs;
  var lastSeenNoPoint = null;

  // 轮询截图与 OCR 检测：命中后立即点击，直到超时才失败。
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
        // recognize 命中但无坐标时记录状态，便于超时报错排查。
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

/**
 * 基于当前截图尝试点击一次目标文字，不做循环等待。
 * @param {*} options
 */
function tryClickTextOnce(options) {
  var step = options || {};
  var img = step.img;
  if (!img) {
    throw createTaskError("E-TASK-INVALID-IMAGE", "tryClickTextOnce 缺少截图对象");
  }

  var matched = findTargetFromDetect(ocrEngine.detect(img), step.text);
  if (matched && matched.point) {
    var tapResult = input.tap(matched.point.x, matched.point.y);
    assertShellResult(tapResult, step.tapErrorCode || "E-TASK-TAP-TEXT", "点击“" + step.text + "”失败");
    return {
      clicked: true,
      point: matched.point,
      text: matched.text || step.text,
      seenButNoPoint: false
    };
  }

  if (matched && !matched.point) {
    return {
      clicked: false,
      point: null,
      text: matched.text || step.text,
      seenButNoPoint: true
    };
  }

  if (containsTargetByRecognize(img, step.text)) {
    return {
      clicked: false,
      point: null,
      text: step.text,
      seenButNoPoint: true
    };
  }

  return {
    clicked: false,
    point: null,
    text: "",
    seenButNoPoint: false
  };
}

/**
 * 在给定截图上尝试点击目标文字，命中返回点击结果，未命中返回 null。
 * @param {*} img
 * @param {*} text
 */
function appearThenClickOnImage(img, text) {
  var probe = tryClickTextOnce({
    img: img,
    text: text
  });
  return probe && probe.clicked ? probe : null;
}

/**
 * 获取设备分辨率，缺失时使用默认值。
 * @param {*} defaultWidth
 * @param {*} defaultHeight
 */
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
  appearThenClickOnImage: appearThenClickOnImage,
  tryClickTextOnce: tryClickTextOnce,
  waitAndClickText: waitAndClickText,
  sleepMs: sleepMs,
  getDeviceSize: getDeviceSize
};
