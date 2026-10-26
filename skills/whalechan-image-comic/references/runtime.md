# 运行依赖与 Windows 兼容

本地维护版本：2026-10-26。保留原创作与确认流程；下列改动用于跨平台执行。

- Python 3.10+：Windows 使用 `python`，子进程使用当前解释器 `sys.executable`，不要依赖 Windows 商店的 `python3` 占位命令。
- ImageMagick 7：图片识别、校验、比例叠图、联系表和图库导出均需要 `magick`。从 [官方页面](https://imagemagick.org/download/) 下载便携版并解压到用户指定目录，确保该目录在当前进程 PATH 中。
- Node.js：图库 JavaScript 离线测试使用；不需要安装前端 npm 包。
- 核心脚本使用 Python 标准库；不需要为 Windows 安装 `fcntl`。漫画文件锁在 Windows 使用 `msvcrt`，Unix 使用 `fcntl`。
- 提示词、语言包、生成记录使用 UTF-8。Windows 控制台建议启用 `PYTHONUTF8=1`，使子进程输出和测试夹具也统一编码。

本机工具位于 `D:\tools\imagemagick\7.1.2-34`，已登记用户 PATH。已经打开的宿主可能仍保留旧 PATH，可在当前 PowerShell 会话显式设置：

```powershell
$env:Path = 'D:\tools\imagemagick\7.1.2-34;' + $env:Path
$env:PYTHONUTF8 = '1'
python -B scripts/manage-run.py --help
magick -version
```

以上工具目录是本机记录，其他机器以实际安装位置为准。需要临时文件也写入 D 盘时，先创建指定目录，再设置当前进程 TEMP 与 TMP。

Windows 兼容补丁包括：UTF-8 文件读写、当前 Python 解释器调用，以及漫画进程间互斥锁。依赖安装、离线测试与真实生图分别验证；测试不调用图像供应商，不读取真实聊天历史，不创建真实用户授权记录。图片 API、账户额度和实际生成效果仍由后续创作任务验证。

本机该 ImageMagick 构建的 HEIC/HEIF 为只读（`r--`），AVIF 可读写。技能主要产出 PNG，不要求 HEIC 编码器；读取 HEIC 的声明来自工具能力列表，HEIC 来源图完整转换本轮未用真实样本验证。
