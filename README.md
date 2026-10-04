# Antigravity Desktop 中文汉化

适用于 **Google Antigravity 桌面版 2.19.1（Windows）** 的非官方简体中文汉化工具。提供安装、启动、状态查看和恢复英文，使用本地词库翻译界面。

> **来源声明：词库主体来自 [Antigravity-Chinese-Localization](https://github.com/liominsb/Antigravity-Chinese-Localization)，采用 MIT 许可证，原版权人为 `aabbWei`。本项目保留完整原许可证，不宣称词库全部原创。**

本仓库由 `chenawa39-ctrl` 维护。它不是 Google 官方项目，与 Google 没有隶属关系。

## 来源与新增内容

使用的上游版本：[b541ec6654a068beb476fef07ed437786908fdb2](https://github.com/liominsb/Antigravity-Chinese-Localization/blob/b541ec6654a068beb476fef07ed437786908fdb2/localize.js)。上游仓库账号为 `liominsb`，许可证中的版权人为 `aabbWei`。

当前词库包含 **2,588 条**：1,985 条与上游翻译相同，21 条在上游基础上调整，582 条为本项目新增。这个数量不代表完整覆盖率。本项目另外实现了界面翻译引擎、原生菜单及对话框适配、按版本和文件校验值安装的补丁、备份和恢复逻辑。

完整说明见 [第三方来源声明](THIRD_PARTY_NOTICES.md)、[原 MIT 许可证](LICENSES/Antigravity-Chinese-Localization-MIT.txt) 和 [来源记录](UPSTREAM.json)。本项目新增代码采用 [MIT 许可证](LICENSE)。

## 汉化范围

- 主菜单、侧边栏、常用按钮、提示及多种文件操作文字。
- 通用、应用、外观、模型与用量、快捷键、计划任务等界面。
- 系统菜单、托盘菜单、右键菜单和标准对话框的文字适配。
- 聊天正文、代码、输入内容、文件路径、对话标题和用户自定义名称保留原文。

品牌、模型名称以及部分动态文字或外部页面可能仍显示英文；不保证所有页面和状态达到百分之百汉化。

## 支持条件

- Windows，Antigravity **桌面版 2.19.1**，安装在当前用户的 `%LOCALAPPDATA%\Programs\antigravity`。
- 原始 `resources/app.asar` 的 SHA-256 必须为 `341234faf45bd1776fd5418a3c288dedc5487ebfcf153f53d75de17cfe15c1de`。即使版本号相同，资源校验值不匹配也会停止安装。
- Python 3.13，包含标准库 Tkinter；工具无需额外 Python 依赖。
- 四个双击入口目前查找 `%LOCALAPPDATA%\Programs\Python\Python313\pythonw.exe`。Python 位于其他位置时，请使用下面的命令入口。

## 下载与安装

1. 在仓库页面点击 **Code → Download ZIP**，解压到一个固定位置，完整保留文件结构。
2. 完全退出 Antigravity，包括托盘中的后台程序。
3. 双击 `安装汉化.vbs`。若 Python 位于其他位置，在此文件夹打开终端并运行：

```powershell
python .\汉化管理.py install
```

4. 看到安装成功提示后，使用原来的 Antigravity 快捷方式启动即可；也可以双击 `启动中文版.vbs`。

安装会生成 `原始文件备份` 文件夹和 `安装记录.json`。请保留它们以及此工具文件夹，恢复时需要使用；安装后不要移动此文件夹，因为安装记录保存了备份的绝对路径。

## 恢复英文与状态查看

完全退出 Antigravity 后，双击 `恢复英文.vbs`，或运行：

```powershell
python .\汉化管理.py restore
```

双击 `查看安装状态.vbs`，或运行 `python .\汉化管理.py status` 查看状态。

若软件升级、原始备份损坏或软件文件被其他工具修改，安装或恢复会拒绝使用不匹配的文件。升级可能覆盖汉化，新版本需要另行适配。

## 验证与维护

本版本于 2026-10-04 在一台 Windows 电脑上的桌面版 2.19.1 实际验证了中文启动、恢复英文、恢复文件逐字节一致、再次安装和重复安装。用户内容保护和内部选项值保留通过运行时检查；原生菜单及对话框通过操作保持的单元检查，未逐项点击全部原生菜单。其他电脑与其他版本尚未验证。详情见 [验证记录](docs/VALIDATION.json)。

主要文件：`汉化管理.py` 为安装和恢复入口；`zh-CN.json` 为词库；`translator-template.js` 为界面引擎模板；`translator.js` 为嵌入词库后的运行文件；`zh-native.cjs` 为原生菜单和对话框适配。

修改词库或模板后，先生成运行文件再安装：

```powershell
python .\scripts\build_translator.py
```

仓库只提供汉化代码、词库与文档，不包含 Google 原始软件资源、本机安装记录、备份或个人截图。提交问题时，请描述软件版本和出现英文的界面；截图先遮住账号和私人对话内容。
