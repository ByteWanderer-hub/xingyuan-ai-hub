# 上游来源与安装范围

- 来源：[DeepSeek Whale-chan](https://github.com/Neko3000/deepseek-whalechan/tree/ced7e609db91e8743e7919611eee31f1c093b7e9/skills/whalechan-image-comic)，Neko3000 and contributors。
- 上游提交：`ced7e609db91e8743e7919611eee31f1c093b7e9`；下载日期：2026-10-26（北京时间）。
- 教程入口：https://aigengtu.com/tutorial 。
- 保留该技能全部原始脚本、测试、参考规范与素材；未修改原始 SKILL.md 或生成工作流。
- 本地增加本说明、两份许可证及第三方说明；第三方说明仅将两条目录链接改为固定上游链接。
- 项目自有代码与测试使用 [MIT](LICENSE)；规范、技能模板与目录元数据使用 [CC BY-NC-SA 4.0](LICENSE-CC-BY-NC-SA-4.0)，非商业、署名、相同方式共享。参考图片不在上述概括授权内，逐项权利边界见 [第三方说明](THIRD-PARTY-NOTICES.md)。
- 本技能专用于鲸鱼娘；并非已验证的通用人设生成器。默认使用内置生图工具；可选外部 API 需要用户授权与自行配置凭据，不随安装调用。
- 安装不执行历史会话语言检测、不启动 Codex 子进程、不发送参考图、不调用付费接口。后续实际创作时按用户范围和当前工具能力执行；静态/离线验证不等于生图端到端验收。

## Windows 离线验证限制

2026-10-26：本机缺少 `magick`（ImageMagick），部分上游测试调用 `python3`（本机实际使用 `python`），漫画调度模块直接导入 Unix `fcntl`。因此原包已安装不等于完整流程可在原生 Windows 运行；需要支持环境或另行适配。上游测试 character：46 项，errors=38、skipped=3；comic：92 项，failures=3、errors=72、skipped=20。未为通过测试改动上游源码，也未调用生成服务。
