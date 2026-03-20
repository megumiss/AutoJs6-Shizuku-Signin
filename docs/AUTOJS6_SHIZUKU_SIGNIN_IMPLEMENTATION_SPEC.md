# AutoJs6 Shizuku 签到项目实现规范

版本: v0.4
状态: 可执行基线
更新时间: 2026-03-20

---

## 1. 目标与边界

本规范用于约束后续签到项目的实现方式, 目标是:

- 仅使用 `AutoJs6 + Shizuku` 实现自动签到流程.
- 默认不开启无障碍服务.
- `main.js` 只负责启动与总控, 不承载业务细节.
- 配置必须由可独立运行的 `config.js` 完成, 且 `config.js` 必须提供 UI.
- 支持多个任务配置并按顺序执行 (默认串行).
- 当前阶段不实现定时调度能力.
- 配置模型保持轻量, 只维护任务开关和少量全局运行参数.

非目标:

- 不实现并行多任务调度器 (本阶段仅串行执行).
- 不依赖 `UiSelector` / `id()` / `text()` 等无障碍控件能力.
- 不在本阶段实现“所有 App 通用”的万能规则引擎.

---

## 2. 运行前提

运行脚本前必须满足:

- AutoJs6 版本支持 `shizuku(...)` 全局函数.
- 设备安装 Shizuku 应用, 且版本不低于 11.
- Shizuku 服务已启动.
- AutoJs6 已开启 Shizuku 权限开关.
- 脚本已完成截图权限申请, 并允许后续 `captureScreen()`.

说明:

- 无障碍关闭时, 不将 `currentPackage/currentActivity/waitForPackage` 作为核心判断链路.
- 页面识别以“截图 + OCR/图像匹配”作为主路径.

---

## 3. 项目目录规范

```text
phone-autojs-script/
  main.js
  config.js
  project.json
  src/
    bootstrap/
      startup.js
      precheck.js
    core/
      logger.js
      storage.js
      errors.js
      result.js
      retry.js
      lock.js
    adapters/
      shizukuShell.js
      input.js
      appControl.js
      screen.js
    vision/
      ocrEngine.js
      matcher.js
      sceneDetector.js
    flow/
      stateMachine.js
      stepRunner.js
    tasks/
      signinTask.js
      taskRunner.js
  assets/
    templates/
      README.md
  logs/
    .gitkeep
  docs/
    AUTOJS6_SHIZUKU_SIGNIN_IMPLEMENTATION_SPEC.md
```

---

## 4. 启动与配置职责

### 4.1 `main.js` 职责

`main.js` 只能做以下事情:

- 加载配置.
- 执行环境预检查.
- 创建运行上下文.
- 调用 `taskRunner` 按任务清单编排执行.
- 统一捕获异常并输出最终结果.
- 输出多任务聚合报告.

`main.js` 禁止直接写:

- 页面识别细节.
- 业务点击坐标.
- OCR规则.
- 重试策略细节.

### 4.2 `config.js` 职责

`config.js` 必须可单独运行, 用于:

- 提供可交互 UI 进行配置编辑.
- 初始化配置.
- 更新配置.
- 查看当前配置.
- 重置配置.
- 做基础合法性校验并保存.

配置保存统一使用 `storages.create('signin.config')`.

---

## 5. 轻量配置模型 (Config Schema)

```js
{
  profileName: "default",
  settings: {
    dryRun: false,
    stopOnFailure: false,
    taskGapMs: 1200,
    screenCaptureIntervalMs: 500,
    lockScreenPassword: ""
  },
  tasks: [
    { id: "taobao_signin", name: "淘宝签到", enabled: true },
    { id: "pdd_signin", name: "拼多多签到", enabled: true },
    { id: "empty_test_task", name: "流程测试任务", enabled: false }
  ]
}
```

配置约束:

- `tasks` 至少包含 1 条 `enabled=true` 的任务.
- 任务 `id` 必须全局唯一.
- `settings.taskGapMs` 范围为 `0..60000`.
- `settings.screenCaptureIntervalMs` 范围为 `50..10000`.
- `settings.lockScreenPassword` 长度不超过 64.

兼容策略:

- 旧版 `runtime/execution` 字段通过 `upgradeConfig()` 自动迁移到 `settings`.
- 旧版详细任务配置会被降级为轻量任务条目 (`id/name/enabled`).

## 5.1 `config.js` UI 交互规范

最小交互流程:

1. 打开 `config.js`.
2. UI 加载当前配置并展示任务列表.
3. 用户编辑全局参数与任务启用状态.
4. 点击保存后执行校验.
5. 校验通过后写入 storage 并提示成功.
6. 退出 UI 后, `main.js` 下次启动读取新配置并按顺序执行任务.

UI 字段分组:

- 全局参数: `profileName`, `dryRun`, `stopOnFailure`, `taskGapMs`, `screenCaptureIntervalMs`, `lockScreenPassword`
- 任务开关: 任务列表 + 单项开关 + 全部启用/全部停用
- 操作区: 重载、校验、保存、重置

---

## 6. 核心模块设计

## 6.1 `src/core/storage.js`

职责:

- 定义默认配置与任务目录 (`TASK_CATALOG`).
- 执行配置迁移、校验、存储读写.

建议接口:

```js
getDefaultConfig()
loadConfig()
saveConfig(config)
validateConfig(config)
upgradeConfig(raw)
resetConfig()
```

## 6.2 `src/tasks/taskRunner.js`

职责:

- 读取并过滤启用任务.
- 串行执行多个任务.
- 汇总多任务执行结果.

执行策略:

- 默认串行执行, 任务间等待 `settings.taskGapMs`.
- 当 `settings.stopOnFailure=true` 时, 任一任务失败后终止后续任务.
- 当 `settings.stopOnFailure=false` 时, 记录失败并继续执行后续任务.

任务实现拆分规则:

- 每个任务逻辑必须有独立文件, 放在 `src/tasks/handlers/` 下.
- `signinTask.js` 只负责按 `task.id` 路由, 不写业务动作细节.
- 推荐命名: `taobaoSigninTask.js`, `pddSigninTask.js`, `emptyTestTask.js`.

## 6.3 `src/tasks/signinTask.js`

职责:

- 负责单任务调度入口.
- 按 `task.id` 路由具体业务实现.

当前约定:

- `taobao_signin` -> 淘宝签到实现函数.
- `pdd_signin` -> 拼多多签到实现函数.
- `empty_test_task` -> 空流程测试任务 (检查权限、打开应用、OCR、点击、滑动).
- 其他 `id` -> 通用占位逻辑.

建议输入:

```js
run(taskConfig, ctx, settings)
```

建议输出:

```js
{
  taskId: "taobao_signin",
  taskName: "淘宝签到",
  ok: true,
  stage: "SUCCESS",
  startedAt: 0,
  finishedAt: 0,
  costMs: 0,
  errorCode: "",
  errorMessage: "",
  evidence: []
}
```

## 6.4 适配器与视觉模块

以下模块保持不变, 但参数读取统一来自 `settings`:

- `src/adapters/shizukuShell.js`
- `src/adapters/input.js`
- `src/adapters/appControl.js`
- `src/adapters/screen.js`
- `src/vision/ocrEngine.js`
- `src/vision/matcher.js`
- `src/vision/sceneDetector.js`
- `src/flow/stateMachine.js`
- `src/flow/stepRunner.js`

---

## 7. 日志与证据规范

日志等级:

- `DEBUG`: 调试细节.
- `INFO`: 关键流程节点.
- `WARN`: 可恢复异常.
- `ERROR`: 不可恢复异常.

日志格式:

```text
[2026-03-20 16:20:11.231][INFO][TASK] task=taobao_signin status=SUCCESS cost=12450ms
```

证据保存策略:

- 状态切换时可选保存截图.
- 失败必存最后一帧截图与 OCR 结果摘要.

---

## 8. 错误码规范

建议错误码:

- `E-SHIZUKU-NOT-READY`
- `E-SHIZUKU-CMD-FAILED`
- `E-CAPTURE-PERMISSION-DENIED`
- `E-CAPTURE-SECURITY-EXCEPTION`
- `E-OCR-EMPTY-RESULT`
- `E-SCENE-NOT-MATCHED`
- `E-STATE-TIMEOUT`
- `E-TASK-TIMEOUT`
- `E-TASK-CONFIG-INVALID`
- `E-NO-ENABLED-TASK`
- `E-MULTI-TASK-PARTIAL-FAILED`
- `E-CONFIG-INVALID`

约定:

- 所有模块只抛标准错误对象.
- 最终出口统一映射为错误码与友好文本.

---

## 9. 开发阶段划分

阶段 P0: 文档与骨架

- 建目录与空模块文件.
- 完成 `config.js` 的 UI、读写与校验.
- 完成 `main.js` 启动骨架.

阶段 P1: 基础能力

- 完成 `shizukuShell/input/appControl/screen/logger`.
- 完成截图权限与证据保存.

阶段 P2: 单任务闭环

- 完成 OCR 与 SceneDetector.
- 完成状态机与重试策略.
- 打通单任务签到主流程.

阶段 P3: 多任务编排

- 完成 `taskRunner` 串行编排.
- 完成失败继续/失败即停策略.
- 完成聚合结果上报.

阶段 P4: 稳定性

- 增强异常恢复.
- 增加失败诊断信息.
- 完成多机型坐标修正策略.

---

## 10. 验收标准

最小可用验收:

- `config.js` 提供 UI, 且可独立设置并持久化配置.
- `main.js` 不含业务细节, 仅做启动编排.
- 无障碍关闭情况下, 可完成单任务签到闭环.
- 失败时有错误码和截图证据.

多任务验收:

- 支持在配置中维护多个任务并设置启停状态.
- 默认串行执行多个任务, 且输出聚合结果.
- 支持 `stopOnFailure` 开关两种策略.
- 当部分任务失败时, 聚合结果可准确标记 `partial failed`.

稳定性验收:

- 连续执行 10 次, 成功率达到目标阈值.
- 关键错误可复现并可定位.

---

## 11. 本阶段冻结项

以下能力本阶段不开发:

- 定时运行与调度中心.
- 多账号并发执行.
- 并行多任务执行.
- 远程配置下发.
- 独立 App 级复杂配置中心 (多页面配置应用).

---

## 12. 后续协作规则

从本规范生效起:

- 新增代码必须对应到本文档模块.
- 新增能力先改文档再改代码.
- 发生设计偏离时, 先更新文档版本再实施.

> 后续所有开发按本文件执行, 本文件即项目实现基线.




