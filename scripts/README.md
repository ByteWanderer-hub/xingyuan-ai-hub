# 维护脚本

安装器与校验器要求 Python 3.10+，仅使用标准库。以下命令从仓库根目录运行；Windows 可将 `python3` 替换为 `py -3`。Node.js 仅用于已有 JavaScript 检查脚本，Git 用于记录来源版本；缺少 Node/Git 不妨碍纯文件检查，但对应环境不会记为通过。

## 安装与更新

```bash
python3 -B scripts/install_skills.py                 # 只预览，默认 10 项迁入技能
python3 -B scripts/install_skills.py --apply         # 写入本仓库 .agents/skills
python3 -B scripts/install_skills.py --scope user    # 预览 ~/.agents/skills
python3 -B scripts/install_skills.py --scope user --apply

# 指定目标工程；带空格的路径请加引号
python3 -B scripts/install_skills.py --target /path/to/project/.agents/skills --apply

# 按需选择，--all 与 --skill 互斥
python3 -B scripts/install_skills.py --skill miliastra-code --skill miliastra-ui
python3 -B scripts/install_skills.py --all
```

`--target` 覆盖 `--scope` 的默认路径。`--all` 包含仓库全部 14 项技能；默认的 10 项见 [技能索引](../skills/README.md)。所有写入都需要 `--apply`。源文件及来源版本信息均未变化时，重复安装不写入文件；仅来源版本信息变化时可更新安装清单。

安装器在目标中维护 `.xingyuan-ai-hub-install.json`，记录仓库、Git revision、技能源是否有未提交改动以及逐文件 SHA-256。每次更新先验证所有已管理技能：本地修改、删除、额外文件/目录、未管理同名目录、符号链接或损坏清单都会中止写入。无关技能目录保留；不提供强制覆盖选项。要保留本地修改，应先将修改合并回 `skills/` 真源，再由人处理旧副本冲突。

写入先暂存，遇到可捕获的替换错误或中断会尝试回滚，目标锁避免两个安装器同时更新。异常退出留下的锁或恢复目录需根据错误信息核查，不能直接当作成功；不承诺断电或强制终止时多个目录整体原子提交。

退出码：`0` 成功或预览完成，`2` 参数/安全校验拒绝，`1` I/O 错误，`130` 用户中断。若 Git 不可用或源码不是完整 checkout，清单中的版本字段可为 `null`，不能据此声称绑定了远程提交。

## 只读校验

```bash
python3 -B scripts/verify_skills.py
python3 -B scripts/verify_skills.py --json
python3 -B scripts/verify_skills.py --installed .agents/skills
python3 -B scripts/verify_skills.py --root /path/to/hub --installed /path/to/project/.agents/skills
```

校验器检查必需技能、`SKILL.md` 的名称/描述和重复名称、Markdown 本地目标、迁移关键素材，以及可选安装副本的清单和文件哈希。退出码 `0` 仅代表这些本地检查通过，`1` 表示发现错误，`2` 表示参数错误。

边界：元数据检查不是完整 YAML 解析；链接检查不覆盖代码块、行内代码、裸文本路径或标题锚点，也不验证网络链接。项目外依赖、Codex 实际发现、插件与编辑器、真机试玩保持 `not_verified`。离线自测需单独执行，不会由校验器冒称已运行。

### 迁移基线

`migration-baseline.json` 固定来源提交与目标迁移提交，包含原始 187 个文件的 Git Blob SHA、大小和模式。这是历史迁移证据，允许后续正常修改技能文本；校验器只对 `immutable_assets` 中的两项原始素材强制比较字节与 Git Blob SHA。

Git Blob SHA 按 `SHA1("blob " + 字节数 + NUL + 文件内容)` 计算，与普通文件 SHA-1 不同。不要为了让检查通过而改写原始素材的基线；需要更新资产时，应记录新来源和授权后明确更新迁移策略。

## 必要验证入口

```bash
python3 -B -m unittest discover -s scripts/tests -p 'test_*.py' -v
node skills/miliastra-code/scripts/gates/check-lua-scope.mjs --selftest
node skills/miliastra-code/scripts/gates/check-lua-style.mjs --selftest
node skills/miliastra-code/scripts/gates/lua-iron-check.mjs --selftest
node skills/miliastra-ui/scripts/gates/check-ui-rules.mjs --selftest
node skills/miliastra-code/scripts/search-assets.mjs 纹理
```

这些命令只覆盖安装/校验逻辑和已有离线检查器。实际结果、运行环境与未执行项统一记录在 [千星就绪检查](../handoffs/active/qianxing-readiness.md)。`scan-binary-api.mjs` 等旧工程快照仍含本机路径，工程专用门禁和 `dsh-miliastra` 相关能力需在目标工程配置后另验。
