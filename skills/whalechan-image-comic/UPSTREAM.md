# 上游来源与安装范围

- 来源：[DeepSeek Whale-chan](https://github.com/Neko3000/deepseek-whalechan/tree/ced7e609db91e8743e7919611eee31f1c093b7e9/skills/whalechan-image-comic)，Neko3000 and contributors。
- 上游提交：`ced7e609db91e8743e7919611eee31f1c093b7e9`；下载日期：2026-10-26（北京时间）。
- 教程入口：https://aigengtu.com/tutorial 。
- 初始导入保留全部上游文件；2026-10-26 增加下述 Windows 兼容补丁，不改变创作/确认/验收规则。
- 本地增加本说明、两份许可证及第三方说明；第三方说明仅将两条目录链接改为固定上游链接。
- 项目自有代码与测试使用 [MIT](LICENSE)；规范、技能模板与目录元数据使用 [CC BY-NC-SA 4.0](LICENSE-CC-BY-NC-SA-4.0)，非商业、署名、相同方式共享。参考图片不在上述概括授权内，逐项权利边界见 [第三方说明](THIRD-PARTY-NOTICES.md)。
- 本技能专用于鲸鱼娘；并非已验证的通用人设生成器。默认使用内置生图工具；可选外部 API 需要用户授权与自行配置凭据，不随安装调用。
- 安装不执行历史会话语言检测、不启动 Codex 子进程、不发送参考图、不调用付费接口。后续实际创作时按用户范围和当前工具能力执行；静态/离线验证不等于生图端到端验收。

## 本地 Windows 兼容修改（2026-10-26）

由星愿资料库维护：两包语言 JSON 显式 UTF-8；漫画提示词、计划和交付索引显式 UTF-8；漫画进程锁按平台使用 msvcrt/fcntl；漫画测试子进程改为 sys.executable；新增跨进程互斥和异常释放回归测试；HEIC 测试先检查样本编码能力，缺少编码器时显式跳过，保留生产解码流程。SKILL.md 增加 [运行依赖入口](references/runtime.md)。素材与角色规范保持上游内容，代码修改继续采用 MIT，文档改编继续采用 CC BY-NC-SA 4.0。

初始失败由本机缺少 ImageMagick、python3 占位命令及 Unix fcntl 导入导致；安装与修复的最新验证结果记录在资料库 handoffs/active/local-skill-sync.md。真实生图接口未调用。

当前 Windows 离线证据：character 46 项中 43 项通过、3 项漫画布局测试按原条件跳过；comic 全套 101 项中 100 项通过，唯一 HEIC 样本编码失败经能力门槛修正后单项复测为显式跳过。CLI 帮助、语法、素材/目录指纹通过；真实生图未执行。
