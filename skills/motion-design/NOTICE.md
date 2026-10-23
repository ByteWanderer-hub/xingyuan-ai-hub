# 来源与改动记录（第三方参考技能）

本目录是第三方技能的**原样收录**，用于给千星 UI 动效提供平台无关的原则与数值参考。

| 项 | 值 |
| --- | --- |
| 上游仓库 | https://github.com/LottieFiles/motion-design-skill |
| 固定 commit | `f9a8a041b85185ee4881b3471d3415e939aac772`（`refs/heads/main`，拉取时 HEAD） |
| 拉取时间 | 2026-10-23 |
| 许可证 | MIT（见同目录 `LICENSE`，版权归 LottieFiles） |
| 收录范围 | `skills/motion-design/` 全量 17 个 md + 仓库 `LICENSE` + 上游 `README.md`（改名 `UPSTREAM-README.md`） |

## 本库做的改动（其余文件逐字未改）

1. `SKILL.md` 的 `description` 末尾追加一句限定：本库以参考技能收录，千星落地看 `miliastra-motion`。
2. `SKILL.md` 正文 `# Motion Design Skill` 之后加一段引用块，说明这是第三方参考、示例栈不代表本库能力、千星口径去哪里找。

## 使用边界

- 本技能**不**包含千星实现：没有 Lua、没有控件创建、没有 Tween/OnFrame 的工程口径。
- 数值可以照用（时长、缓动曲线、编排、过冲预算）；写法不能照抄（CSS/GSAP/Framer 在本平台不存在）。
- 千星落地统一走 `miliastra-motion`；脚本 API、门禁、部署走 `miliastra-code`；控件与素材走 `miliastra-ui`。
- 视觉与手感验收只能真机试玩，离线预览与模拟器不算通过。

## 更新方法

```bash
# 取上游 HEAD，核对后重新覆盖本目录（保留 NOTICE.md 并更新 commit 与拉取日期）
git ls-remote https://github.com/LottieFiles/motion-design-skill main
```

覆盖后必须复跑一遍：`python ../xingyuan-router/scripts/route.py "UI 动效"`，确认关键词入口仍然命中。
