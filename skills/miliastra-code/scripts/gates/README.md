# miliastra-code 技能自带门禁（快照）

> **工程工作区 `Desktop\yuanshen\tools\` 是唯一真身**；本目录是它的**快照**，为的是"换电脑 / 手上没有工程工作区"时判据仍然可用。
> 判据**逐字来自源文件**，只改了三处（下表列全）。刷新方法见文末。

## 入口

```bash
node scripts/gates/gate.mjs <文件.lua…>              # 显式文件：跑 ① 作用域 ② 风格 ③ 铁律状态板
node scripts/gates/gate.mjs --dir <目录> [--only scope|style|iron|ui] [--summary]
node scripts/gates/check-lua-scope.mjs --selftest    # 各门自带正反例自检
```

## 20 个脚本：技能里能不能用

| 脚本 | 技能里 | 判什么 / 怎么用 |
|---|---|---|
| `gate.mjs` | ✅ 入口 | 薄封装三~四道门 + 汇总表（`--only` / `--summary`；ui 门在技能里会说明"回工作区跑"） |
| `check-lua-scope.mjs` | ✅ **给文件** | 作用域：漏 `local` / 声明晚于使用 / 控件名契约；`--selftest` ✓ |
| `check-lua-style.mjs` | ✅ **给文件** | 风格：BOM / CRLF / TAB / `OnUpdate` 少 pcall / 吞错 pcall / `assert` / `BIG_FILE`；`--selftest` ✓ |
| `lua-iron-check.mjs` | ✅ **给文件** | **R1–R11 状态板**（按铁律编号汇总）；`--selftest` ✓ |
| `snapshot-lua-project.mjs` | ✅ **给目录** | 改动前快照（带 SHA 清单、拒绝覆盖；`--restore` 回滚） |
| `scan-lua-globals.mjs` | ✅ **给目录** | **R2 专项**：找出"运行期给全局变量赋值"（真机上不生效，实测刷出 13 983 行日志） |
| `check-script-attach.mjs` | ✅ **给 .gil** | **从地图存档判「脚本有没有挂到控件上」**（读 `#50` 映射表 + `#5` 挂载引用）；解析失败会说 `PARSE_FAILED`＋"结论不可用" |
| `gil-clientui.mjs` | ✅ **给 .gil** | 读控件模板索引 / 名字 / 父子（**交接值现读**，不用创作者抄号） |
| `scan-gil-ids.mjs` | ✅ **给 .gil** | 扫存档里的 id 面（素材 / 模板） |
| `scan-binary-api.mjs` | ✅ **给路径** | 扫二进制里的客户端控件 API 名字（API 面盘点） |
| `check-ui-contract.mjs` | ⚙️ 工程专用 | **只服务《侦探1》**：格盘 / 1:2:1 三栏 / 详情纸片 / 按钮热区逐字比 + 8 的倍数 + 字号档 + `h ≥ 字号×1.4`；按地图名读那六份脚本 ⇒ 技能里读不到会**明确报错** |
| `check.mjs` | ⚙️ 工程专用 | 工作区单一入口（`--map <地图>` + 别名 + 基线口径）；技能里会因没有 `案子/` 而红 —— **那是设计，不是 bug** |
| `check-shuangxiang-audit.mjs` | ⚙️ 工程专用 | 《双相》关卡可达性**离线审计**（读 `02_levels.lua`，与 `06_audit.lua` 同一套数学） |
| `build-main.mjs` | ⚙️ 工程专用 | 《侦探杀》主控构建（**字段契约 + 关卡表断言，不合格拒绝落盘**） |
| `build-shuangxiang.mjs` / `build-mage-battle.mjs` | ⚙️ 工程专用 | 《双相》/《夏日祭法师》构建器（各自带断言） |
| `ui-theme.mjs` | ⚙️ 工程专用 | 表现层取值单点：`build` / `check`（注入块逐字一致 + body 不许裸写颜色） |
| `scan-docs.mjs` | ⚙️ 工程专用 | 读官方文档 JSON 建标题索引（一次性；要 `docs/`） |
| `_paths.mjs` | 🔧 依赖 | 路径解析（**技能版含可携带性补丁**，见下） |
| `lualint.mjs` | 🔧 依赖 | 注释 / 字符串剥离器（来自插件包 `lib/lualint.mjs`） |

## 与工作区版的差异：**只有三处**（判据零改动）

1. **`_paths.mjs`：自动进入"显式文件模式"** —— 本目录下没有 `案子/` 时，不再要求地图目录存在，各门照常用**传进去的文件 / 目录**判。
   （早先只认 `QXQY_GATE_EXPLICIT=1`，那要求必须经 `gate.mjs` 调用 ⇒ **单独跑 `--selftest` 会莫名 `exit 1`**；现改为自动降级。）
2. **`check-script-attach.mjs`：主模块判断改为按文件名** —— 原判据写死 `endsWith('tools/check-script-attach.mjs')`，搬到技能目录后**认不出自己是主模块 ⇒ 静默什么都不做**（最危险的形态）。
3. **import 路径改写** —— `../packages/dsh-miliastra/lib/lualint.mjs` → `./lualint.mjs`（技能里不带插件包）。

另：每个文件顶部有一段「技能自带快照」溯源头（插在 **shebang 之后** —— 插到 shebang 前面会 `SyntaxError`，这是踩过的坑）。

**对拍证据**（同一目录 43 个 `.lua`）：`lua-iron-check.mjs --project <2.代码>` 两边结论**逐字一致** —— `43 个文件 / error 级 2110 处 / warn 110 项`；整段输出只有 4 行不同，且全是路径 / 提示字符串。
**自检证据**：`check-lua-scope` / `check-lua-style` / `lua-iron-check` 的 `--selftest` 在技能里 **exit 0（不设任何环境变量）**。

## ⚠️ 别把绿当"通过"

- 本目录**只判静态形状**：运行时行为、真实观感、素材渲染、动效手感 → 只能真机 + `miliastra_shot` / `miliastra_sim`。
- `⚙️ 工程专用` 的那些在技能里跑不了 —— 它们要 `案子/<地图>/2.代码/`（**编辑器侧手工建的工程结构，AI 造不出来**）。
- 门红了**不许**回退改动 / 删功能 / 拿空壳顶：正确动作是「**修到过**」或「**如实标 `pending` 交付**」（口径见 `SKILL.md §8`「门被打回了，怎么动」）。

## 刷新方法（工作区改了判据之后）

```powershell
$w = "$env:USERPROFILE\Desktop\yuanshen\tools"; $d = "<技能>\miliastra-code\scripts\gates"
# 1) 现场比对源 SHA
Get-ChildItem $d -File -Filter *.mjs | ForEach-Object { "  $($_.Name)  $((Get-FileHash $_.FullName -Algorithm SHA256).Hash.Substring(0,16))" }
# 2) 确认三处补丁还在
Select-String -Path "$d\_paths.mjs" -Pattern 'QXQY_GATE_EXPLICIT|自动进入'
Select-String -Path "$d\check-script-attach.mjs" -Pattern 'isMain'
# 3) 重新快照：复制源文件 → 溯源头插在 shebang 之后 → 重打三处补丁 → 跑 --selftest 对拍
```
