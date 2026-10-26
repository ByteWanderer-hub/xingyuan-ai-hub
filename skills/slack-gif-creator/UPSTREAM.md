# 来源与本地适配

来源：Anthropic 的 [slack-gif-creator](https://github.com/anthropics/skills/tree/dbd4588f9e1033efb41dad4bef2f7947c8993d44/skills/slack-gif-creator)。固定上游提交 `dbd4588f9e1033efb41dad4bef2f7947c8993d44`，2026-10-26 下载。保留 [Apache-2.0 许可证](LICENSE.txt)。

本地改动：扩展主入口描述以覆盖通用 GIF 表情包；增加运行说明与能力/透明/时长边界。不修改上游核心代码，不默认上传图片，不宣称包含图生视频模型。依赖安装在 D:/tools/gif-runtime；原始技能代码检索未发现网络请求、子进程或动态代码执行入口，未把静态核对称为全面安全审计。
