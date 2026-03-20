"ui";

var storage = require("./src/core/storage");

var workingConfig = null;
var selectedTaskIndex = -1;

ui.layout(
  <vertical bg="#F3F5F7">
    <vertical bg="#FFFFFF" padding="16">
      <text text="自动签到配置中心" textSize="22sp" textStyle="bold" textColor="#111827" />
      <text text="简化配置：任务开关 + 全局参数" textSize="12sp" textColor="#6B7280" marginTop="2" />
      <text id="statusText" text="就绪" textSize="12sp" textColor="#2563EB" marginTop="6" />
    </vertical>

    <ScrollView>
      <vertical padding="12">
        <vertical bg="#FFFFFF" padding="12">
          <text text="全局参数" textStyle="bold" textSize="16sp" textColor="#111827" />
          <input id="profileNameInput" hint="配置名称" />
          <Switch id="dryRunSwitch" text="仅演练模式" />
          <Switch id="stopOnFailureSwitch" text="失败后停止后续任务" />

          <text text="任务间隔 ms" textSize="12sp" textColor="#6B7280" marginTop="6" />
          <input id="taskGapMsInput" inputType="number" hint="例如 1200" />

          <text text="截屏间隔 ms" textSize="12sp" textColor="#6B7280" marginTop="6" />
          <input id="screenCaptureIntervalMsInput" inputType="number" hint="例如 500" />

          <text text="锁屏密码（可为空）" textSize="12sp" textColor="#6B7280" marginTop="6" />
          <input id="lockScreenPasswordInput" password="true" hint="用于后续解锁逻辑" />
        </vertical>

        <vertical bg="#FFFFFF" padding="12" marginTop="10">
          <text text="任务开关" textStyle="bold" textSize="16sp" textColor="#111827" />
          <text text="点击列表项可选中任务，再用下方按钮控制启用状态" textSize="12sp" textColor="#6B7280" />

          <list id="taskList" h="220" marginTop="8">
            <horizontal padding="10">
              <text text="{{idx}}" w="34" textColor="#6B7280" />
              <text text="{{name}}" w="*" singleLine="true" ellipsize="end" textColor="#111827" />
              <text text="{{enabled}}" w="52" gravity="right" textColor="#0F766E" />
            </horizontal>
          </list>

          <horizontal marginTop="8">
            <button id="toggleSelectedBtn" text="切换选中任务" w="0" layout_weight="1" bg="#DBEAFE" textColor="#1E3A8A" />
            <button id="enableAllBtn" text="全部启用" w="0" layout_weight="1" bg="#DCFCE7" textColor="#166534" />
            <button id="disableAllBtn" text="全部停用" w="0" layout_weight="1" bg="#FEE2E2" textColor="#991B1B" />
          </horizontal>
        </vertical>

        <vertical bg="#FFFFFF" padding="12" marginTop="10" marginBottom="12">
          <horizontal>
            <button id="reloadBtn" text="重新加载" w="0" layout_weight="1" bg="#E5E7EB" textColor="#111827" />
            <button id="validateBtn" text="校验配置" w="0" layout_weight="1" bg="#E5E7EB" textColor="#111827" />
          </horizontal>
          <horizontal marginTop="6">
            <button id="saveBtn" text="保存配置" w="0" layout_weight="1" bg="#2563EB" textColor="#FFFFFF" />
            <button id="resetBtn" text="重置并保存" w="0" layout_weight="1" bg="#FEE2E2" textColor="#991B1B" />
          </horizontal>
        </vertical>
      </vertical>
    </ScrollView>
  </vertical>
);

function setStatus(message, isError) {
  ui.run(function () {
    ui.statusText.setText(message);
    ui.statusText.setTextColor(colors.parseColor(isError ? "#DC2626" : "#2563EB"));
  });
}

function parseNumber(raw, fieldName, min, max) {
  var v = Number(String(raw).trim());
  if (isNaN(v) || v < min || v > max) {
    throw new Error(fieldName + " 必须在范围 " + min + ".." + max);
  }
  return v;
}

function toTaskItem(task, index) {
  return {
    idx: String(index),
    id: task.id,
    name: task.name,
    enabled: task.enabled ? "启用" : "停用"
  };
}

function ensureSelectedTaskIndex() {
  if (!workingConfig.tasks.length) {
    selectedTaskIndex = -1;
    return;
  }
  if (selectedTaskIndex < 0 || selectedTaskIndex >= workingConfig.tasks.length) {
    selectedTaskIndex = 0;
  }
}

function renderAll() {
  ui.profileNameInput.setText(String(workingConfig.profileName || ""));
  ui.dryRunSwitch.setChecked(!!workingConfig.settings.dryRun);
  ui.stopOnFailureSwitch.setChecked(!!workingConfig.settings.stopOnFailure);
  ui.taskGapMsInput.setText(String(workingConfig.settings.taskGapMs));
  ui.screenCaptureIntervalMsInput.setText(String(workingConfig.settings.screenCaptureIntervalMs));
  ui.lockScreenPasswordInput.setText(String(workingConfig.settings.lockScreenPassword || ""));

  ui.taskList.setDataSource(workingConfig.tasks.map(toTaskItem));
  ensureSelectedTaskIndex();
  if (selectedTaskIndex >= 0) {
    setStatus("当前选中任务: " + workingConfig.tasks[selectedTaskIndex].name, false);
  }
}

function applyGlobalFromUi() {
  workingConfig.profileName = String(ui.profileNameInput.text()).trim() || "default";
  workingConfig.settings.dryRun = !!ui.dryRunSwitch.isChecked();
  workingConfig.settings.stopOnFailure = !!ui.stopOnFailureSwitch.isChecked();
  workingConfig.settings.taskGapMs = parseNumber(ui.taskGapMsInput.text(), "任务间隔", 0, 60000);
  workingConfig.settings.screenCaptureIntervalMs = parseNumber(ui.screenCaptureIntervalMsInput.text(), "截屏间隔", 50, 10000);
  workingConfig.settings.lockScreenPassword = String(ui.lockScreenPasswordInput.text());
}

function validateAndSync() {
  try {
    applyGlobalFromUi();
  } catch (e) {
    setStatus(e.message, true);
    dialogs.alert("输入错误", e.message);
    return false;
  }

  var validated = storage.validateConfig(workingConfig);
  if (!validated.ok) {
    setStatus("配置校验失败", true);
    dialogs.alert("校验失败", validated.errors.join("\n"));
    return false;
  }
  workingConfig = validated.config;
  return true;
}

function loadFromStorage() {
  var loaded = storage.loadConfig();
  if (!loaded.ok) {
    workingConfig = storage.deepClone(loaded.config || storage.getDefaultConfig());
    selectedTaskIndex = workingConfig.tasks.length ? 0 : -1;
    renderAll();
    dialogs.alert("加载警告", loaded.errors.join("\n"));
    setStatus("配置已加载，但存在问题", true);
    return;
  }

  workingConfig = storage.deepClone(loaded.config);
  selectedTaskIndex = workingConfig.tasks.length ? 0 : -1;
  renderAll();
  setStatus("配置加载成功", false);
}

ui.taskList.on("item_click", function (item, index) {
  selectedTaskIndex = index;
  setStatus("已选中任务: " + workingConfig.tasks[index].name, false);
});

ui.toggleSelectedBtn.click(function () {
  ensureSelectedTaskIndex();
  if (selectedTaskIndex < 0) {
    setStatus("没有可切换的任务", true);
    return;
  }
  workingConfig.tasks[selectedTaskIndex].enabled = !workingConfig.tasks[selectedTaskIndex].enabled;
  renderAll();
});

ui.enableAllBtn.click(function () {
  workingConfig.tasks.forEach(function (t) { t.enabled = true; });
  renderAll();
  setStatus("已全部启用", false);
});

ui.disableAllBtn.click(function () {
  workingConfig.tasks.forEach(function (t) { t.enabled = false; });
  renderAll();
  setStatus("已全部停用，请至少开启一个后保存", true);
});

ui.reloadBtn.click(function () {
  loadFromStorage();
});

ui.validateBtn.click(function () {
  if (!validateAndSync()) return;
  renderAll();
  setStatus("配置校验通过", false);
  dialogs.alert("校验结果", "配置合法");
});

ui.saveBtn.click(function () {
  if (!validateAndSync()) return;
  var saved = storage.saveConfig(workingConfig);
  if (!saved.ok) {
    setStatus("保存失败", true);
    dialogs.alert("保存失败", saved.errors.join("\n"));
    return;
  }
  workingConfig = storage.deepClone(saved.config);
  renderAll();
  setStatus("保存成功", false);
  toast("配置已保存");
});

ui.resetBtn.click(function () {
  if (!dialogs.confirm("重置确认", "确认重置为默认配置并保存吗？")) {
    return;
  }
  var reset = storage.resetConfig();
  if (!reset.ok) {
    setStatus("重置失败", true);
    dialogs.alert("重置失败", reset.errors.join("\n"));
    return;
  }
  workingConfig = storage.deepClone(reset.config);
  selectedTaskIndex = workingConfig.tasks.length ? 0 : -1;
  renderAll();
  setStatus("重置并保存成功", false);
  toast("已恢复默认配置");
});

loadFromStorage();
