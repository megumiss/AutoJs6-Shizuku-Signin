var STORAGE_NAME = "signin.config";
var CONFIG_KEY = "config";

var TASK_CATALOG = [
  { id: "taobao_signin", name: "淘宝签到", defaultEnabled: true },
  { id: "pdd_signin", name: "拼多多签到", defaultEnabled: true },
  { id: "empty_test_task", name: "流程测试任务", defaultEnabled: false }
];

/**
 * 判断值是否为普通对象。
 * @param {*} v
 */
function isPlainObject(v) {
  return Object.prototype.toString.call(v) === "[object Object]";
}

/**
 * 通过 JSON 序列化实现深拷贝。
 * @param {*} v
 */
function deepClone(v) {
  return JSON.parse(JSON.stringify(v));
}

/**
 * 返回默认全局设置。
 */
function getDefaultSettings() {
  return {
    dryRun: false,
    stopOnFailure: false,
    taskGapMs: 1200,
    screenCaptureIntervalMs: 1000,
    lockScreenPassword: ""
  };
}

/**
 * 读取任务目录中的默认启用状态。
 * @param {*} catalogItem
 */
function catalogDefaultEnabled(catalogItem) {
  return catalogItem && catalogItem.defaultEnabled === false ? false : true;
}

/**
 * 根据目录生成新增任务的默认模板。
 * @param {*} index
 */
function createTaskTemplate(index) {
  var base = TASK_CATALOG[(index - 1) % TASK_CATALOG.length] || TASK_CATALOG[0];
  return {
    id: base.id + "_" + (index || 1),
    name: base.name + " " + (index || 1),
    enabled: true
  };
}

/**
 * 构建默认配置对象。
 */
function getDefaultConfig() {
  return {
    profileName: "default",
    settings: getDefaultSettings(),
    tasks: TASK_CATALOG.map(function (t) {
      return {
        id: t.id,
        name: t.name,
        enabled: catalogDefaultEnabled(t)
      };
    })
  };
}

/**
 * 标准化单个任务配置字段。
 * @param {*} task
 * @param {*} fallback
 */
function normalizeTask(task, fallback) {
  var fb = fallback || { id: "task_unknown", name: "未命名任务", enabled: true };
  var src = isPlainObject(task) ? task : {};
  return {
    id: String(src.id || fb.id),
    name: String(src.name || fb.name),
    enabled: src.enabled === undefined ? !!fb.enabled : !!src.enabled
  };
}

/**
 * 标准化 settings 并补齐默认值。
 * @param {*} raw
 */
function normalizeSettings(raw) {
  var defaults = getDefaultSettings();
  var settings = isPlainObject(raw) ? raw : {};
  return {
    dryRun: settings.dryRun === undefined ? defaults.dryRun : !!settings.dryRun,
    stopOnFailure: settings.stopOnFailure === undefined ? defaults.stopOnFailure : !!settings.stopOnFailure,
    taskGapMs: settings.taskGapMs === undefined ? defaults.taskGapMs : Number(settings.taskGapMs),
    screenCaptureIntervalMs: settings.screenCaptureIntervalMs === undefined ? defaults.screenCaptureIntervalMs : Number(settings.screenCaptureIntervalMs),
    lockScreenPassword: settings.lockScreenPassword == null ? defaults.lockScreenPassword : String(settings.lockScreenPassword)
  };
}

/**
 * 兼容旧配置结构并升级为当前模型。
 * @param {*} raw
 */
function upgradeConfig(raw) {
  var defaults = getDefaultConfig();
  var src = isPlainObject(raw) ? raw : {};

  var oldRuntime = isPlainObject(src.runtime) ? src.runtime : {};
  var oldExecution = isPlainObject(src.execution) ? src.execution : {};
  var oldSettings = isPlainObject(src.settings) ? src.settings : {};

  var mergedSettings = normalizeSettings({
    dryRun: oldSettings.dryRun !== undefined ? oldSettings.dryRun : oldRuntime.dryRun,
    stopOnFailure: oldSettings.stopOnFailure !== undefined ? oldSettings.stopOnFailure : oldExecution.stopOnFailure,
    taskGapMs: oldSettings.taskGapMs !== undefined ? oldSettings.taskGapMs : oldExecution.taskGapMs,
    screenCaptureIntervalMs: oldSettings.screenCaptureIntervalMs !== undefined ? oldSettings.screenCaptureIntervalMs : oldRuntime.actionIntervalMs,
    lockScreenPassword: oldSettings.lockScreenPassword
  });

  var rawTasks = Array.isArray(src.tasks) ? src.tasks : [];
  var byId = {};
  rawTasks.forEach(function (t) {
    if (t && t.id) {
      byId[String(t.id)] = t;
    }
  });

  var tasks = [];
  TASK_CATALOG.forEach(function (c) {
    tasks.push(normalizeTask(byId[c.id], { id: c.id, name: c.name, enabled: catalogDefaultEnabled(c) }));
  });

  rawTasks.forEach(function (t) {
    if (!t || !t.id) return;
    var exists = tasks.some(function (x) { return x.id === String(t.id); });
    if (!exists) {
      tasks.push(normalizeTask(t, { id: String(t.id), name: "自定义任务", enabled: true }));
    }
  });

  return {
    profileName: String(src.profileName || defaults.profileName),
    settings: mergedSettings,
    tasks: tasks
  };
}

/**
 * 校验数值是否在给定范围内。
 * @param {*} v
 * @param {*} min
 * @param {*} max
 */
function isNumberInRange(v, min, max) {
  return typeof v === "number" && !isNaN(v) && v >= min && v <= max;
}

/**
 * 校验配置合法性并返回标准结果。
 * @param {*} config
 */
function validateConfig(config) {
  var cfg = upgradeConfig(config);
  var errors = [];

  if (!cfg.profileName || !String(cfg.profileName).trim()) {
    errors.push("profileName 不能为空");
  }

  if (!isNumberInRange(cfg.settings.taskGapMs, 0, 60000)) {
    errors.push("settings.taskGapMs 必须在 0..60000");
  }
  if (!isNumberInRange(cfg.settings.screenCaptureIntervalMs, 50, 10000)) {
    errors.push("settings.screenCaptureIntervalMs 必须在 50..10000");
  }
  if (String(cfg.settings.lockScreenPassword).length > 64) {
    errors.push("settings.lockScreenPassword 过长");
  }

  if (!Array.isArray(cfg.tasks) || cfg.tasks.length === 0) {
    errors.push("任务列表不能为空");
  }

  var idMap = {};
  var enabledCount = 0;
  (cfg.tasks || []).forEach(function (task, i) {
    var prefix = "tasks[" + i + "]";
    if (!task.id || !String(task.id).trim()) {
      errors.push(prefix + ".id 不能为空");
    } else if (idMap[task.id]) {
      errors.push("任务 ID 重复: " + task.id);
    } else {
      idMap[task.id] = true;
    }

    if (!task.name || !String(task.name).trim()) {
      errors.push(prefix + ".name 不能为空");
    }

    if (task.enabled) enabledCount += 1;
  });

  if (enabledCount === 0) {
    errors.push("至少需要启用一个任务");
  }

  return {
    ok: errors.length === 0,
    errors: errors,
    config: cfg
  };
}

/**
 * 校验后保存配置到本地存储。
 * @param {*} config
 */
function saveConfig(config) {
  var check = validateConfig(config);
  if (!check.ok) {
    return { ok: false, errors: check.errors, config: check.config };
  }
  var sto = storages.create(STORAGE_NAME);
  sto.put(CONFIG_KEY, check.config);
  return { ok: true, errors: [], config: check.config };
}

/**
 * 从本地存储读取配置并自动修正。
 */
function loadConfig() {
  var sto = storages.create(STORAGE_NAME);
  var cfg = sto.get(CONFIG_KEY);
  if (!cfg) {
    var initCfg = getDefaultConfig();
    sto.put(CONFIG_KEY, initCfg);
    return { ok: true, errors: [], config: initCfg };
  }

  var check = validateConfig(cfg);
  if (check.ok) {
    sto.put(CONFIG_KEY, check.config);
  }
  return {
    ok: check.ok,
    errors: check.errors,
    config: check.config
  };
}

/**
 * 重置为默认配置并保存。
 */
function resetConfig() {
  return saveConfig(getDefaultConfig());
}

module.exports = {
  STORAGE_NAME: STORAGE_NAME,
  CONFIG_KEY: CONFIG_KEY,
  TASK_CATALOG: TASK_CATALOG,
  deepClone: deepClone,
  getDefaultConfig: getDefaultConfig,
  getDefaultSettings: getDefaultSettings,
  createTaskTemplate: createTaskTemplate,
  validateConfig: validateConfig,
  loadConfig: loadConfig,
  saveConfig: saveConfig,
  resetConfig: resetConfig,
  upgradeConfig: upgradeConfig
};
