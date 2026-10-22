#!/usr/bin/env node
// ── 技能自带快照（miliastra-code/scripts/gates/）────────────────
// 源：Desktop\yuanshen\tools\build-shuangxiang.mjs（**工程工作区是唯一真身**，本文件只是快照）
// 差异：仅本溯源头 + import 路径改写（`../packages/dsh-miliastra/lib/lualint.mjs` → `./lualint.mjs`）；**判据未改一字**
// 刷新：`node scripts/gates/… ` 见同目录 README.md「刷新方法」
// ────────────────────────────────────────────────────────────
/**
 * build-shuangxiang.mjs —— FP0 阶段2：多产物构建 + 黑板字段契约断言（《双相》的"构建器"）
 *
 * 对标 tools/build-main.mjs（侦探杀：字段契约断言，不合格不落盘）。
 *
 * 阶段1（2026-09-26）：13 片段 → 单产物，唯一使命=与现役 v9 逐字节等同（--expect-equal，现已完成使命）。
 * 阶段2（2026-09-28）：6 挂载多产物 ——
 *   main    <2.代码>/main/*     → <2.代码>/双相.lua          （玩法本体 + 黑板轮询）
 *   input   <2.代码>/input/*    → <2.代码>/交互 input.lua     （键盘 → 只写 t1_cmd）
 *   view    <2.代码>/view/*     → <2.代码>/表现 view.lua      （读 t1_state → 按名写 HUD）
 *   levels  <2.代码>/levels/*   → <2.代码>/关卡 levels.lua    （FP16/17 占位）
 *   mech    <2.代码>/mechanics/*→ <2.代码>/机关 mechanics.lua （FP3/9/10 占位）
 *   select  <2.代码>/select/*   → <2.代码>/选关 select.lua    （FP1 占位）
 *   ★ 2026-10-04 迁移后：**片段与成品同在** `案子/双相/2.代码/`（原先 Sources 在 sources/、成品在 code/）。
 *
 * 黑板字段契约（阶段2 新增；侦探杀 build-main 同款"写 ⊇ 读"）：
 *   C1 cmd  通道：input 写的 evt 集 ⊇ main 分发的 evt 集；seq/hold 两侧都在
 *   C2 state 通道：main 写的字段集 ⊇ view 读的字段集
 * 断言全部在写盘前执行 —— 任何一条不过，一个产物都不落盘。
 *
 * 用法：
 *   node tools/build-shuangxiang.mjs                  # 构建全部产物 + 契约断言（默认 --map 双相）
 *   node tools/build-shuangxiang.mjs --map 双相        # 显式给地图名（等价）
 *   node tools/build-shuangxiang.mjs --expect-equal   # （阶段1 遗留）main 产物必须 == 现役 v9
 * 产物：`案子/双相/2.代码/`（挂载名即文件名；现役 v9 文件保留为回滚锚，永不覆盖）
 * 退出码：0=构建成功且通过全部断言；1=断言失败（不落盘）；2=用法/文件问题
 * ⚠️ **本脚本只服务《双相》**：给别的 --map 会**明确报错退出**（片段布局与契约都是双相专有的）。
 * ★ 路径不写死：根与 `2.代码/` 一律由 tools/_paths.mjs 按地图名解析。
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { parseMap, paths } from './_paths.mjs';

let ctx;
try { ctx = parseMap(process.argv.slice(2), { fallback: '双相' }); } catch (e) { console.error('❌ ' + e.message); process.exit(2); }
const { map, root, args: restArgs } = ctx;
if (map !== '双相') {
  console.error(`❌ build-shuangxiang.mjs 是《双相》专属构建器，不支持 --map ${map}。`);
  console.error('   （六个产物的片段目录名、C1/C2 黑板契约、v9 回滚锚都是双相专有的。）');
  process.exit(2);
}
const P = paths(map, root);
// ★ 片段与成品**同目录**（2026-10-04 迁移后）：SRC_ROOT == OUT_ROOT == 案子/双相/2.代码
const SRC_ROOT = P.code;
const OUT_ROOT = P.code;
const LEGACY = P.p('双相_v9_冰火_机制地基+1-3关.lua');
const sha = (s) => createHash('sha256').update(s).digest('hex');

const EXPECT_EQUAL = restArgs.includes('--expect-equal');

// {源目录, 产物名, 最小字节}
const PRODUCTS = [
  { key: 'main',    dir: 'main',     out: '双相.lua',            min: 10000 },
  { key: 'input',   dir: 'input',    out: '交互 input.lua',       min: 800 },
  { key: 'view',    dir: 'view',     out: '表现 view.lua',        min: 800 },
  { key: 'levels',  dir: 'levels',   out: '关卡 levels.lua',      min: 100 },
  { key: 'mech',    dir: 'mechanics', out: '机关 mechanics.lua',  min: 100 },
  { key: 'select',  dir: 'select',   out: '选关 select.lua',      min: 100 },
];

const fail = (msg) => { console.error('❌ ' + msg); process.exit(1); };

// ---- 载入全部片段 ----
const built = [];
for (const p of PRODUCTS) {
  const srcDir = join(SRC_ROOT, p.dir);
  if (!existsSync(srcDir)) { console.error(`❌ 片段目录不存在：${srcDir}`); process.exit(2); }
  const files = readdirSync(srcDir).filter((f) => f.endsWith('.lua')).sort();
  if (files.length < 1) { console.error(`❌ ${p.key} 没有任何片段 —— 拒绝构建`); process.exit(2); }
  const text = files.map((f) => readFileSync(join(srcDir, f), 'utf8')).join('\n');
  built.push({ ...p, files, text });
}
const byKey = Object.fromEntries(built.map((b) => [b.key, b]));

// ---- 断言 1：每个产物无 BOM、够大、括号配平 ----
const stripLike = (s) => s.replace(/--\[\[[\s\S]*?\]\]/g, '').replace(/--[^\n]*/g, '').replace(/"(?:[^"\\]|\\.)*"/g, '""');
for (const b of built) {
  if (b.text[0] === '\uFEFF') fail(`断言失败(${b.key})：产物带 BOM`);
  if (Buffer.byteLength(b.text) < b.min) fail(`断言失败(${b.key})：仅 ${Buffer.byteLength(b.text)} 字节（下限 ${b.min}）`);
  const st = stripLike(b.text);
  for (const [o, c] of [['(', ')'], ['{', '}'], ['[', ']']]) {
    const no = (st.match(new RegExp('\\' + o, 'g')) || []).length;
    const nc = (st.match(new RegExp('\\' + c, 'g')) || []).length;
    if (no !== nc) fail(`断言失败(${b.key})：${o}${c} 不配平（${no} vs ${nc}）`);
  }
}

// ---- 断言 2（阶段2）：黑板字段契约 —— 写 ⊇ 读 ----
const contractNotes = [];
{
  const input = byKey.input.text, main = byKey.main.text, view = byKey.view.text;
  // C1：cmd 通道
  const inputEvts = new Set([...input.matchAll(/evt=([a-z_]+)/g)].map((m) => m[1]));
  const mainEvts = [...main.matchAll(/\be == "([a-z_]+)"/g)].map((m) => m[1]);
  if (mainEvts.length === 0) fail('契约C1：main 里没解析到任何 evt 分发（grep `e == "…"`）');
  for (const e of mainEvts) if (!inputEvts.has(e)) fail(`契约C1：main 分发 evt="${e}" 但 input 没写过它`);
  for (const k of ['seq=', 'hold=']) if (!input.includes('"' + k)) fail(`契约C1：input 没写 ${k}`);
  for (const k of ['f.seq', 'f.hold', 'f.evt']) if (!main.includes(k)) fail(`契约C1：main 没读 ${k}`);
  contractNotes.push(`C1 cmd: input写{${[...inputEvts].join(',')}} ⊇ main分发{${mainEvts.join(',')}} ✅ seq/hold ✅`);
  // C2：state 通道
  const mainWrite = new Set([...main.matchAll(/"([a-z_]+)=/g)].map((m) => m[1]));
  const viewRead = new Set([...view.matchAll(/\bf\.([a-z_]+)/g)].map((m) => m[1]));
  if (viewRead.size === 0) fail('契约C2：view 里没解析到任何字段读取（grep `f.…`）');
  for (const k of viewRead) if (!mainWrite.has(k)) fail(`契约C2：view 读 ${k} 但 main 没写它`);
  for (const k of ['status', 'hint', 'phase', 'fx']) if (!mainWrite.has(k)) fail(`契约C2：main 应写字段 ${k}= 缺失`);
  contractNotes.push(`C2 state: main写{${[...mainWrite].join(',')}} ⊇ view读{${[...viewRead].join(',')}} ✅`);
}

// ---- 断言 3（阶段1 遗留，可选）：main 产物 == 现役 v9 ----
let legacyNote = '（未要求等同：阶段2 起产物合法偏离 v9）';
if (EXPECT_EQUAL) {
  if (!existsSync(LEGACY)) { console.error(`❌ --expect-equal 但找不到现役文件：${LEGACY}`); process.exit(2); }
  const legacy = readFileSync(LEGACY, 'utf8');
  if (byKey.main.text !== legacy) {
    let at = 0;
    const o = byKey.main.text, l = legacy;
    while (at < Math.min(o.length, l.length) && o[at] === l[at]) at++;
    fail(`等同断言失败：首个差异在第 ${at} 字节`);
  }
  legacyNote = `✅ 与现役 v9 逐字节等同（SHA ${sha(legacy).slice(0, 12)}）`;
}

// ---- 全部断言通过 → 才写盘 + 回读校验 ----
for (const b of built) {
  const dest = join(OUT_ROOT, b.out);
  writeFileSync(dest, b.text, 'utf8');
  const back = readFileSync(dest, 'utf8');
  if (back !== b.text) fail(`写盘回读不一致：${b.out} —— 构建作废`);
}

console.log(`构建 ${built.length} 个产物 → ${OUT_ROOT}`);
for (const b of built) {
  console.log(`  ${b.out.padEnd(24)} ${b.files.length} 片段 / ${b.text.split('\n').length} 行 / ${Buffer.byteLength(b.text)} 字节 / SHA ${sha(b.text).slice(0, 12)}`);
}
console.log('  断言：无 BOM ✅ 括号配平 ✅ 写盘回读一致 ✅');
for (const n of contractNotes) console.log('  契约：' + n);
console.log('  等同：' + legacyNote);
process.exit(0);
