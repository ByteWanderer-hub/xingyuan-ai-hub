---
name: qq-sticker-pack
description: 给 QQ 机器人做一套自定义表情包并上架到它的 QQ 收藏夹——用 Pillow 画 Q 版形象（300×300 透明 PNG），通过 SnowLuma/NapCat 的非标准 OneBot 动作 add_custom_face 上传、modify_custom_face 写备注，再用正确姿势把它发出去（CDN 下载转 base64，不能直接传 emoji_id）。当用户说"给机器人画表情包/做贴纸/加自定义表情"、"让 bot 自己发表情"、"把图收进 QQ 收藏表情"、"表情包上架到 QQ"，或调试"表情发不出去 / ENOENT emoji_id / unauthorized"时使用。不用于千星平台图片资产（走 miliastra-ui），不用于纯图片生成（走设计技能）。
---

# QQ 自定义表情包：从画到上架到发出去

一句话流程：**画 PNG → `add_custom_face` 上传（base64）→ `modify_custom_face` 写备注 → 用 image 段发出去验证**。

这套流程在 SnowLuma 2.2.0 + qq-bridge 0.2.1 上逐项实测通过（2026-10-25）。NapCat 系网关的 OneBot v11 动作名基本相同，但字段细节仍需现场核对。

## 何时用它

- 用户要给 QQ 机器人做表情包 / 贴纸 / 自定义表情，并希望 bot 之后能自己发；
- 已有的表情"发不出来"，报 `ENOENT ... stat '2712..._0_0'`、`unauthorized`、`requires a file/url source`；
- 想批量替换或补充一套表情（换画风、加情绪）。

## 前置条件

| 项 | 说明 |
|---|---|
| SnowLuma / NapCat 的 OneBot HTTP API | 默认 `http://127.0.0.1:3000` |
| `accessToken` | 在 qq-bridge 的 `config.json` 的 `snowluma.accessToken`；桥接启动时会从 `onebot_<UIN>.json` 自动自愈写回 |
| Python + Pillow | 画图用；`load_workspace_dependencies` 返回的 Python 自带 Pillow |
| 字体 | Windows 用 `C:\Windows\Fonts\msyhbd.ttc`（中文粗体） |

先确认网关活着，否则后面全是 401：

```bash
curl -s -H "Authorization: Bearer <token>" http://127.0.0.1:3000/get_version_info
# 期望 {"status":"ok",...,"app_name":"SnowLuma"}
```

## 第一步：画（`scripts/gen_stickers.py`）

```bash
python scripts/gen_stickers.py --out D:\qqbot\stickers
```

脚本给出 8 个基础表情（在的 / 无语 / 摸鱼 / 吃 / 哼哼 / 好耶 / 问号 / 咕噜）。要加新表情就复制一个 `elif kind == ...` 分支，并在 `CAPS` 里加名字。

画图要点（都是踩过的坑）：

- **画布 300×300、RGBA 透明**——QQ 表情是小图，尺寸大了会被压；
- **底部留 42px 给文字**：正文最低画到 y≈250，caption 放 y≈258、字号 28，否则中文字会被裁掉（第一次就裁了）；
- 中文文本**一定要用真实字体文件**，`ImageFont.load_default()` 出不来中文；
- 主体（鲸鱼/角色）统一上移 16px 再画，给文字腾位置；
- 透明背景配白色描边文字，深色模式聊天里也看得清。

## 第二步：上传（`add_custom_face`）

这是 **SnowLuma/NapCat 的非标准动作**，OneBot v11 规范里没有，别去翻官方 spec。

```bash
# 图片以 base64:// 传，不要传本地路径（网关会把它当 URL 下载）
curl -s -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -X POST http://127.0.0.1:3000/add_custom_face \
     --data-binary "@body.json"
# body.json: {"file":"base64://iVBORw0KGgo..."}
# 成功: {"status":"ok","retcode":0,"data":{"emoji_id":"<UIN>_0_0_0_<MD5>_0_0"}}
```

**Windows 上用文件体传 JSON**（`--data-binary @file`），用命令行内联 JSON 极易被 PowerShell 的引号规则弄坏成非法 JSON——本流程第一次就是这么失败的。

批量上传的完整脚本见 `scripts/upload_stickers.ps1`。

## 第三步：写备注（`modify_custom_face`）

bot 要靠备注挑表情，没备注它只能看到一堆哈希。

```bash
curl -s -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
     -X POST http://127.0.0.1:3000/modify_custom_face \
     --data-binary '{"emoji_id":"<id>","desc":"在的"}'
```

备注写在 QQ 侧，桥接同步后会变成表情库里的 `desc`（最多 20 字）。

## 第四步：让 bot 能发（关键坑）

**不能把 `emoji_id` 当图片 `file` 传。** 网关会把它当本地路径，报：

```
ENOENT: no such file or directory, stat 'D:\...\2712..._0_0'
```

正确姿势二选一：

1. **走桥接工具**（推荐，二代会话里）：`qq_list_stickers` 取列表 → `qq_send_sticker {key, token, stickerId}`。桥接内部会**下载 CDN 图 → base64 → 当 image 段发**，顺序还受 `sendChain` 保护；
2. **自己发**：拿列表里的 `url`（`https://p.qpic.cn/qq_expression/...`）下载 → base64 → 发 image 段：

```json
{"user_id":123,"message":[{"type":"image","data":{"file":"base64://..."}}]}
```

> 为什么不能直接让网关去下 URL：那个 CDN 链接带签名/防盗链，且桥接侧刻意走自己的 SSRF 校验下载（见 `bridge.js` 的 `sendStickerV2`）。

## 第五步：验收

1. **收藏数变了**：`fetch_custom_face_detail` 前后对比——**请求体必须是 `{}`**；传 `{"count":50}` 会返回空数组（实测直接变 0 条，不是没收藏成功）；
2. **桥接认识它**：`GET /api/stickers`（需 `x-console-token` 头），新条目应带 `desc`；
3. **真发一条**：发出去后从 QQ 侧回读历史，确认 `message_id` 有效——只看接口返回 `ok` 不够，要以历史记录为准。

## 踩坑速查表

| 现象 | 真因 | 处理 |
|---|---|---|
| `ENOENT ... stat '<emoji_id>'` | 把 `emoji_id` 当 `file` | 改成 base64 或走桥接 `qq_send_sticker` |
| `unauthorized` | 没带 `Authorization: Bearer <accessToken>` | token 从桥接 `config.json` 取；桥接会自愈写回 |
| 请求体必须是合法 JSON | PowerShell 内联 JSON 被吃引号 | 写临时文件 + `--data-binary @file` |
| 中文字被裁 / 不显示 | 用了默认字体，或 caption 超出画布 | 用 `msyhbd.ttc`；正文留 42px 底部空间 |
| 列表里没有新表情 | 桥接缓存未刷新 | `POST /api/stickers/sync`，或重启桥接 |
| `fetch_custom_face_detail` 传 `count` 返回 0 条 | 该动作不认 `{"count":N}` | 请求体发 `{}` |
| 重复上传同一张图，收藏数不变 | **QQ 按图片内容（md5）去重**，复用同一个 `emoji_id` | 验证计数要用不同图片；重复上传会覆盖该表情的备注 |
| PowerShell 5.1 跑脚本报 `Unexpected token '}'` / 中文乱码 | 脚本是 UTF-8 **无 BOM**，PS 5.1 按 ANSI 解析 | 脚本存成 **UTF-8 with BOM**；或直接用 `scripts/upload_stickers.py` |
| `fetch_custom_face_detail` 字段取不到 | 条目字段是 `id` / `resId` / `md5` / `url` / `desc`，**不是** `emoji_id` | 按 `id` 取 |

## 与其他技能的边界

- 千星奇域平台内的图片资产、控件素材 → `miliastra-ui`；
- 纯美术生成（要设计模型出图）→ `design` / `ui-ux-pro-max`；
- 本技能负责的是 **QQ 机器人这一侧的上架与发送链路**，画风本身它只给一套可跑的 Pillow 模板。

## 打包资源

- `scripts/gen_stickers.py` —— Pillow 生成器，产出 8 张透明 PNG，含「留给文字的空间」等布局约定；
- `scripts/upload_stickers.ps1` —— 读桥接 config 拿 token，批量 `add_custom_face` + `modify_custom_face`，并回读收藏数校验。
