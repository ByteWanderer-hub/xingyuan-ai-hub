---
name: eggy-api
description: 开发蛋仔派对工坊 Lua 玩法时，按中文用途、对象类型或函数名检索官方 API，核对参数、事件与编辑器联调方式。
---

# 蛋仔工坊 Lua 开发

在 [接口索引](references/api.md) 搜中文动作或英文名。CLASS 用来辨认参数类型，ENUM 用来核对可选值。函数按 LuaAPI、GlobalAPI、GameAPI 和单位 API 分区。同名动作先看接收对象，再打开条目核对参数顺序、类型、返回值和示例调用写法。

例如，给巡逻路径增加路点时检索 `GameAPI.add_pathpoint`。参数依次是路径 ID、插入索引、路点 ID。路径和路点取当前地图的数据。给技能进入冷却则查 `Ability.enter_cd`，并核对示例中技能实例的调用方式。

首次建图从 [快速入门](https://ugc.163.com/manual/pc_md/lua/lua_quickstart.html) 开始。通过 PC 编辑器生成 Lua 工程，在 VS Code 打开该工程，连接两端的蛋仔开发助手。场景对象和 UI 节点的 ID 可从插件数据区复制。改动后先看文件同步记录，再运行地图，依据控制台的编译错误或运行轨迹定位脚本行。[开发助手](https://ugc.163.com/manual/pc_md/lua/lua_eggitor.html)

遇到本地工程缺少手册函数时，先用插件导出当前 API，再对照 [接口结构](https://ugc.163.com/manual/pc_md/lua/lua_api_structure.html) 和手册侧栏的更新日志。交付时区分文档核对与地图实际运行结果。
