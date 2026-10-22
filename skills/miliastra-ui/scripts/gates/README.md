# miliastra-ui 技能自带门禁

> **本目录是技能自己的门禁**（不是工作区工具的快照）——为的是"**换个电脑 / 手上没有工程工作区**"时，UI 铁律仍然可执行。
> 判据只来自本技能的 **UI1–UI6 铁律**（正文 §1–§4）；**不读工程目录、不认地图名、不依赖 `案子/`**。

## 用法

```bash
node scripts/gates/check-ui-rules.mjs <脚本.lua> [<脚本2.lua> ...]   # 指定文件
node scripts/gates/check-ui-rules.mjs --dir <目录>                    # 递归扫 .lua（跳过 _* / .* / *备份*）
node scripts/gates/check-ui-rules.mjs --selftest                      # 正反例自检（证伪用）
#   --summary 只打结论行 ｜ --strict 把 warn 也当失败
```

退出码：**0** 全绿 ｜ **1** 有 error（或 `--strict` 下有 warn）｜ **2** 用法/IO 错。

## 判什么（静态可判的那部分）

| 代号 | 档 | 铁律 | 判据 |
|---|---|---|---|
| `FONT_SIZE_OFF_SCALE` | **error** | UI3 | 字号字面量不在白名单 `64 / 52 / 28 / 22` |
| `TEXT_H_TOO_SMALL` | **error** | UI3 | 文本框 `h < ceil(字号 × 1.4)`（**真机整条一个像素都不画**，模拟器不模拟） |
| `GRID_OFF_8` | warn | UI2 | `x/y/w/h` 字面量不是 8 的倍数 |
| `RAW_COLOR` | warn | UI4 | 颜色三元组不在语义色表（§3.2） |
| `SWEEP_WITHOUT_WHITELIST` | warn | UI5 | 遍历兄弟控件做隐藏/清理但没有白名单条件（会误伤别的脚本的热区） |
| `ROTATION_WRITE` | warn | UI6 | 写了 `rotationZ` / `SetRotation`（平台不生效） |
| `CURSOR_WITHOUT_SHOWCURSOR` | warn | UI6 | 有光标事件但全文没有 `showCursor`（硬前置） |
| **判不了（计数）** | — | UI2/UI3 | `add()` 的几何是**变量**（`x,y,w,h`）⇒ 静态判不出 —— **计入"判不了"，不算通过** |

回执三档：**error**（真机铁律）· **warn**（口径偏离，可能是有意的，逐处问）· **判不了**（没证据）。

## 不判什么（**别把绿当"UI 合格"**）

- 运行时行为、层级真实结果、点击是否真能点（要真机 + `miliastra_sim op=verify`）。
- 真实观感、素材渲染（大字问号 / `?` 占位）、动效手感 ⇒ 只能 `miliastra_shot` 截图 + `op=frames` 帧间像素差。
- 几何的**变量流**（`x` 从哪算出来、合计是否 = 1600）⇒ 静态判不了，靠 §2 的分配表人工加总，或工程专属门禁。

## 与工作区 `tools/check-ui-contract.mjs` 的分工（**别混用**）

| | 本门 `check-ui-rules.mjs` | 工作区 `check-ui-contract.mjs` |
|---|---|---|
| 驱动方式 | **文件驱动**（给 .lua 就判） | **map 驱动**（按地图名读那六份脚本） |
| 适用 | **任意**千星 UI 脚本 | **只服务《侦探1（侦探杀）》**（判据是它的格盘 / 1:2:1 三栏 / 详情纸片 / 按钮热区常量） |
| 换机 / 换图 | ✅ 能跑 | ❌ 跑不了（给别的图**明确报错退出**） |
| 判据来源 | UI2/UI3/UI4/UI5/UI6（本技能正文） | 侦探杀六份脚本的常量 + 本技能 UI2/UI3 |

两者**互补**：工程里两个都跑（本门当"通用前置"，工程门当"这张图的合同"）；脱离工程时只跑本门。
