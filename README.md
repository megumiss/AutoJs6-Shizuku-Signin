# AutoJs6 Shizuku Signin

基于 **AutoJs6 + Shizuku** 的多任务自动执行脚本。

## 功能简介

- 多任务串行执行（按配置中的任务顺序）
- 启动前自动预检：Runtime、Shizuku、截图权限
- 启动前自动解锁
- 任务执行后自动收尾：回到桌面并锁屏
- 当前内置任务：
  - `taobao_signin`（淘宝签到流程）

## 目录说明

- `main.js`：主入口，负责启动、执行任务、输出结果
- `config.js`：配置 UI 入口
- `src/core/`：核心能力（配置、日志、设备状态等）
- `src/tasks/`：任务路由与具体任务实现

## 使用说明

1. 在 AutoJs6 中打开并运行 `config.js`
2. 配置任务开关和全局参数（可设置锁屏密码）
3. 保存配置
4. 运行 `main.js` 执行任务

## 运行前要求

- AutoJs6 已安装并可运行脚本
- AutoJs6 已授予 Shizuku 权限
- Shizuku 已安装并启动服务
- 允许脚本申请截图权限

