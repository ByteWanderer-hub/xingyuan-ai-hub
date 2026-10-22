#!/usr/bin/env node
// ⚠️ 快照：本文件是 `tools\_paths.mjs` 的副本（2026-10-02 19:23，源 SHA-256 前16位 81EF05056CCAE3AC）。
// 判据与源文件逐字一致，仅改了 lualint 的 import 路径；**口径以工作区版为准**，刷新见同目录 README.md。
// 技能版用法：给**显式文件/目录**（工作区版的 --map 依赖本机 案子/ 目录，技能里没有）。

/**
 * _paths.mjs —— 工作区**路径的唯一解析点**（map-aware）
 *
 * 为什么要有这个文件（2026-10-04 B 方案，阶段3）：
 *   · 2026-10-02 之前：成品在 `code/<地图>/`，构建源片段在 `sources/<地图>/` —— **两个根**；
 *     30+ 个脚本各自 `path.join(ROOT, 'code', '侦探1', …)`，路径散落各处。
 *   · 2026-10-02 起：两者都搬进了 `案子/<地图>/2.代码/`（**成品与构建源同目录**，见根 AGENTS.md §1.5）
 *     ⇒ 所有写死旧路径的脚本**当场全部失效**（实测：build-main 报"缺片段"、三道门禁 exit 1/2）。
 *   · 本文件把"根在哪 / 地图怎么找"收敛到**一处**：脚本只写 `--map <地图名>`，
 *     路径一律由 `ROOT + 地图名` 推出来。**加新地图 = 不改代码**（见下方 MAPS 说明）。
 *
 * ★ 唯一真相：`<ROOT>/案子/<地图>/2.代码/` —— 成品（构建产物）与构建源片段都在这一层。
 * ★ `--map` 缺省值：门禁类脚本 = `侦探1`；某张图专属的构建器 = 它自己的图（见各脚本 file 头）。
 * ★ 别名（`侦探杀`→`侦探1`、`双向/冰火/冰镜火烛`→`双相`…）在这里统一归一，
 *   **不另建目录别名**（根 AGENTS.md §1.5 硬约定）。
 * ★ 本文件**只读**：不做任何写盘、不建目录 —— 路径解析失败一律**报错停下**，绝不猜（铁律 7/9）。
 */
import path from 'node:path';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** 工作区根 = 本文件所在目录的上一级。**这是全仓唯一的根解析点**（原先散落 30+ 处、且有一处硬编码绝对路径）。 */
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CASE_ROOT = path.join(ROOT, '案子');
export const DEFAULT_MAP = '侦探1';

/** 地图名 → 别名（根 AGENTS.md §1.5 的「别名/曾用名」抄下来，方便命令行直接用俗称）。 */
export const ALIASES = {
  侦探杀: '侦探1',
  双向: '双相', 冰火: '双相', 冰镜火烛: '双相',
  元素法师像素画PK: '夏日祭法师', 法师: '夏日祭法师', 像素画: '夏日祭法师',
};

/**
 * 地图登记表 —— **只有需要「活文件清单 / 历史产物口径」的脚本才查它**。
 *
 * 加新地图：① 在 `案子/` 下按 §1.5 建好 `<地图>/{1.策划案,2.代码,AGENTS.md}`；
 *           ② 想让门禁默认只扫"真正会部署的活文件" ⇒ 在这里加一行 `live: [...]`。
 *           **不加也能用**（门禁退化为「扫 2.代码 顶层所有 .lua、跳过历史产物」——如实打印它扫了什么）。
 */
export const MAPS = {
  侦探1: {
    // ★ 11 条 = 2026-10-02 实测沙箱 `…\Beyond_Local_Save_Level\1073741839\external_lua_file\*.lua` 的实况
    //   （原缺 `图鉴 codex.lua` / `开始场景 start.lua` / `弹窗 popup.lua` / `背景层 bg.lua` ⇒ 那 4 份不受门禁覆盖）
    live: ['主控 main.lua', '调查板 board.lua', '表现 view.lua', '交互 input.lua',
      '翻牌 reveal.lua', '效果引擎 fx.lua', 'HUD hud.lua',
      '图鉴 codex.lua', '开始场景 start.lua', '弹窗 popup.lua', '背景层 bg.lua'],
    // ★ 构建器：片段目录 `2.代码/main/`，产物 `2.代码/主控 main.lua`
    build: 'build-main.mjs',
  },
  双相: {
    live: ['双相.lua', '交互 input.lua', '表现 view.lua', '关卡 levels.lua',
      '机关 mechanics.lua', '选关 select.lua'],
    build: 'build-shuangxiang.mjs',
  },
  夏日祭法师: {
    live: ['夏日祭法师.lua'],
    build: 'build-mage-battle.mjs',
  },
  色彩调度: { live: ['色彩调度.lua'] },
  坦克大战: {
    // ★ 6 条 = 2026-10-02 实测沙箱 `…\Beyond_Local_Save_Level\1073741837\external_lua_file\*.lua` 的实况
    //   （原只登记 `main_tank.lua` 一条 ⇒ 另 5 份不受门禁覆盖）
    live: ['main_tank.lua', 'hud_panel.lua', 'pause_panel.lua',
      'settle_panel.lua', 'start_panel.lua', 'tank_sprites.lua'],
  },
  俄罗斯方块: {},
  洞穴崩塌: {},
};

/** 历史产物 / 备份 / 探针 / 旧引擎文件：**不进沙箱、按政策不整改** ⇒ 门禁默认跳过。 */
export const HISTORY_RE = /(_备份|_snapshot|main\.engine|roles\.lua|_探针|\.bak$)/;

/** 归一化地图名（认别名）；**认不出来就抛错并列全部候选**，不猜。
 *  ⚠️ 供**程序内**用（`paths()` / 想自己处理错误时）。命令行入口请用 `parseMap` —— 它会把这条错
 *  转成"打印一句人话 + exit 2"，而不是抛一坨 stack trace（脚本名认错地图名是最常见的手滑）。 */
export function canonical(name) {
  const raw = String(name ?? '').trim();
  const hit = ALIASES[raw] ?? raw;
  // ⚠️ 技能版**唯一补丁**（可携带性；工作区版没有这一段）：本目录下没有 `案子/`（≠ 工程工作区）时，
  //    自动进入"显式文件模式"——不查地图目录是否存在，各门禁照常用**传进去的文件**判。
  //    （早先只认 `QXQY_GATE_EXPLICIT=1`，那要求必须经 `gate.mjs` 调用 ⇒ 单独跑 `--selftest` 会莫名 exit 1；现改为自动降级。）
  //    判据本身一字未改；`paths()` / 活文件清单仍走原逻辑（显式文件模式下根本不会被调用）。
  if (process.env.QXQY_GATE_EXPLICIT === '1') return hit;
  if (!existsSync(path.join(CASE_ROOT, hit ?? '')) && !existsSync(path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '')), '..', '..', '案子'))) return hit;
  if (hit && existsSync(path.join(CASE_ROOT, hit, '2.代码'))) return hit;
  const all = listMaps();
  const e = new Error(
    `认不出地图「${raw}」—— 工作区里带 2.代码/ 的地图只有：${all.join(' · ')}\n` +
    `  （别名也认：${Object.entries(ALIASES).map(([a, b]) => `${a}→${b}`).join(' · ')}）\n` +
    '  ⚠️ 不猜归属：确属新图就先按根 AGENTS.md §1.5 建好 案子/<地图>/{1.策划案,2.代码,AGENTS.md}，再回来跑（铁律 9）。');
  e.isMapNameError = true;
  throw e;
}

/** `canonical` 的**命令行**包装：认不出就打印那句人话并 **exit 2**（不抛 stack trace）。
 *  为什么要它：实测 `--map 不存在的图` 会打印 10 行 `_paths.mjs:73 ... ^` 栈 —— 对 AI 和对人都读不出结论。
 *  设计取舍：**把错误处理收在 `_paths.mjs` 里一处**，于是 30+ 个脚本（含没写 try/catch 的那些）
 *  全都自动拿到一致的干净报错，不必逐个改。 */
function canonicalOrExit(name) {
  try {
    return canonical(name);
  } catch (e) {
    console.error('❌ ' + e.message);
    process.exit(2);
  }
}

/** 扫 `案子/` 下真正有 `2.代码/` 的目录名（不假设只有七张 —— 新图加进去自动可用）。 */
export function listMaps() {
  if (!existsSync(CASE_ROOT)) return [];
  return readdirSync(CASE_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(path.join(CASE_ROOT, e.name, '2.代码')))
    .map((e) => e.name).sort();
}

/**
 * 解析 `--map <地图名>` / `--map=<地图名>` / `--root <目录>`。
 * @param {string[]} argv
 * @param {{fallback?:string, allowPositionalRoot?:boolean}} [opts]
 *   `allowPositionalRoot`：把**第一个位置参数**当 `--root` 用（`build-main` / `split-main` 的旧写法）。
 *   ⚠️ 默认 **false** —— 多数脚本的位置参数是"要处理的文件/目录"，被当成 root 会静默走错地方
 *   （`snapshot-lua-project.mjs 案子/侦探1/2.代码` 就是这种：那是"要快照的路径"，不是根）。
 * @returns {{map:string, root:string, args:string[]}} `args` 里**已剔除** map/root 这两个旗标与它们的值
 *   —— ⚠️ 必须剔除：各脚本后面都用 `args.filter(a => !a.startsWith('--'))` 当"显式文件"，
 *   不剔除的话 `侦探1` 会被当成一个文件路径传下去。
 */
export function parseMap(argv, { fallback = DEFAULT_MAP, allowPositionalRoot = false } = {}) {
  let map = fallback;
  let root = ROOT;
  const args = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--map') {
      const v = argv[++i];
      if (v === undefined) throw usage('--map 后面要给地图名');
      map = v;
      continue;
    }
    if (a.startsWith('--map=')) { map = a.slice('--map='.length); continue; }
    if (a === '--root') {
      const v = argv[++i];
      if (v === undefined) throw usage('--root 后面要给目录');
      root = path.resolve(v);
      continue;
    }
    if (a.startsWith('--root=')) { root = path.resolve(a.slice('--root='.length)); continue; }
    // 兼容旧用法：`node tools/build-main.mjs <工作区根>`（原先那个位置参数）—— 只在显式开启时生效
    if (allowPositionalRoot && i === 0 && !a.startsWith('-') && existsSync(a) && statSync(a).isDirectory()) {
      root = path.resolve(a);
      console.log(`（位置参数当 --root 用：${root} —— 新写法是 --root <目录>）`);
      continue;
    }
    args.push(a);
  }
  return { map: canonicalOrExit(map), root, args };
}

function usage(msg) {
  const e = new Error(msg);
  e.isUsageError = true;
  return e;
}

/** 一张图的所有路径。**所有脚本都从这里拿路径**，不要自己拼 `案子/…`。 */
export function paths(mapArg, rootOverride) {
  const map = canonical(mapArg);
  const root = rootOverride ?? ROOT;
  const caseDir = path.join(root, '案子', map);
  const code = path.join(caseDir, '2.代码');
  return {
    map,
    root,
    caseDir,
    /** `2.代码/` —— 成品与构建源**同目录** */
    code,
    /** p('main') / p('主控 main.lua') —— 相对 2.代码 拼绝对路径 */
    p: (...rel) => path.join(code, ...rel),
    exists: (rel) => existsSync(path.join(code, rel)),
    /** 该图的活文件绝对路径（登记表有就用登记表；没有就扫顶层 .lua 并跳过历史产物） */
    live: () => liveFiles(map, code),
  };
}

/**
 * 活文件清单。返回 `{ files, source }`：
 *   `source='registry'` = 来自 MAPS 登记表（**只有这些才是"真会部署的"**）；
 *   `source='scan'`     = 没登记，退化为"扫顶层 .lua、跳过历史产物"（**调用方要如实打印这个来源**，
 *                          不许把"扫到的"说成"活文件清单"—— 回执说假话比不说更费时间）。
 */
export function liveFiles(map, code) {
  const reg = MAPS[map]?.live;
  if (reg && reg.length) {
    return { files: reg.map((f) => path.join(code, f)).filter((p) => existsSync(p)), source: 'registry' };
  }
  if (!existsSync(code)) return { files: [], source: 'registry' };
  const files = readdirSync(code, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.lua') && !HISTORY_RE.test(e.name))
    .map((e) => path.join(code, e.name)).sort();
  return { files, source: 'scan' };
}

/** 该图的活文件**文件名**清单（给只用名字比对的脚本用），附来源。 */
export function liveNames(map, code) {
  const { files, source } = liveFiles(map, code);
  return { names: files.map((f) => path.basename(f)), source };
}

/** 递归收集 `.lua`（跳过 `_snapshots/`）—— 与 check-lua-style / lua-iron-check 同一口径。 */
export function collectLua(p) {
  const abs = path.resolve(p);
  if (!existsSync(abs)) return [];
  if (!statSync(abs).isDirectory()) return abs.endsWith('.lua') ? [abs] : [];
  const out = [];
  for (const f of readdirSync(abs)) {
    const child = path.join(abs, f);
    if (statSync(child).isDirectory()) { if (f !== '_snapshots') out.push(...collectLua(child)); }
    else if (f.endsWith('.lua')) out.push(child);
  }
  return out.sort();
}
