// ── 技能自带快照（miliastra-code/scripts/gates/）────────────────
// 源：Desktop\yuanshen\tools\build-main.mjs（**工程工作区是唯一真身**，本文件只是快照）
// 差异：仅本溯源头 + import 路径改写（`../packages/dsh-miliastra/lib/lualint.mjs` → `./lualint.mjs`）；**判据未改一字**
// 刷新：`node scripts/gates/… ` 见同目录 README.md「刷新方法」
// ────────────────────────────────────────────────────────────
// 主控构建：拼接 案子/侦探1/2.代码/main/*.lua → 案子/侦探1/2.代码/主控 main.lua
// 为什么是"拼接"而不是 require：千星一个 .lua 就是**一个独立客户端脚本**，脚本之间不能 require
//   ⇒ 想分文件只能在**构建期**拼成一个；运行时仍是单个脚本。
// ★ 本脚本带两条防错线：
//   ① 拼接产物必须与"片段字节和"一致（缺文件/顺序错会立刻暴露）
//   ② **字段契约断言**：主控 writeState 写出的字段 ⊇ 其他脚本读取的字段（t.xxx / t["xxx"]）
//      —— 任一边增删字段而另一边没跟上 → **构建期就报错**，不用到真机上一格一格猜
// 用法：node tools/build-main.mjs [--map 侦探1]
//   ⚠️ **本脚本只服务《侦探杀》**（片段名 / 字段契约 / 关卡表断言都是它专有的）：
//      别的图有自己的构建器 —— 《双相》build-shuangxiang.mjs、《夏日祭法师》build-mage-battle.mjs。
//      给别的 --map 会**明确报错退出**，不会误把那张图的 main/ 拼成"主控"。
//   ★ 路径不写死：根与 `2.代码/` 一律由 tools/_paths.mjs 按地图名解析（2026-10-04 迁移后成品与构建源同目录）。
import fs from 'node:fs';
import path from 'node:path';
import { parseMap, paths } from './_paths.mjs';

const { map, root, args } = parseMap(process.argv.slice(2), { allowPositionalRoot: true });
if (map !== '侦探1') {
  console.error(`❌ build-main.mjs 是《侦探1（侦探杀）》专属构建器，不支持 --map ${map}。`);
  console.error('   别的图请用它们自己的构建器：');
  console.error('     《双相》        node tools/build-shuangxiang.mjs --map 双相');
  console.error('     《夏日祭法师》  node tools/build-mage-battle.mjs --map 夏日祭法师');
  process.exit(2);
}
if (args.length) { console.error('用法：node tools/build-main.mjs [--map 侦探1]（不认其它位置参数）'); process.exit(2); }

const P = paths(map, root);
const srcDir = P.p('main');                    // 片段目录
const outPath = P.p('主控 main.lua');           // 构建产物（**不许手改**）
const readerDir = P.code;                      // 读字段的其它脚本与产物**同目录**

// 拼接顺序（改这里 = 改运行时脚本的语句顺序，慎动）
const ORDER = ['01_head.lua', '02_roles.lua', '03_core.lua',
  '04_rules.lua', '05_commands.lua', '06_board.lua'];

let missing = [];
const texts = [];
for (const name of ORDER) {
  const p = path.join(srcDir, name);
  if (!fs.existsSync(p)) { missing.push(name); continue; }
  texts.push({ name, src: fs.readFileSync(p, 'utf8') });
}
if (missing.length) {
  console.error('❌ 缺片段：' + missing.join(' / '));
  console.error('   （片段目录：' + srcDir + '；要重新切分跑 tools/split-main.mjs）');
  process.exit(1);
}
const out = texts.map((t) => t.src).join('');

// ── 防错线 ①：产物 = 片段和（这里天然成立，留作"以后改成带分隔符"时的护栏）──
const sum = texts.reduce((a, t) => a + Buffer.byteLength(t.src, 'utf8'), 0);
const bytes = Buffer.byteLength(out, 'utf8');

// ── 防错线 ②：字段契约断言 ──
// 写方：06_board.lua 的 writeState（形如 `"stage="` 与 `.. ";lv="`）
// ⚠️ 首字段没有前导 `;`（`local txt = "stage=" .. G.phase`）—— 正则必须两种都认，
//    否则会把 stage 误报成"没写出"（本断言第一次跑就踩了这个盲区）。
const boardTxt = texts.find((t) => t.name === '06_board.lua').src;
const writes = new Set();
for (const m of boardTxt.matchAll(/["'];?([A-Za-z_][A-Za-z0-9_]*)="/g)) writes.add(m[1]);
// 读方：其它客户端脚本里的 `t.xxx` / `t["xxx"]`
//   ★ FP-C（2026-09-26）：新脚本 HUD hud.lua 也是 kb_state 的消费者（顶部/左栏/右栏全靠它）—— 不扫它这道契约就失效
const readers = ['调查板 board.lua', '表现 view.lua', '交互 input.lua', '翻牌 reveal.lua', '效果引擎 fx.lua', 'HUD hud.lua'];
const readsBy = {};
const union = new Set();
for (const rf of readers) {
  const p = path.join(readerDir, rf);
  if (!fs.existsSync(p)) continue;
  const src = fs.readFileSync(p, 'utf8');
  const set = new Set();
  for (const m of src.matchAll(/\bt\.([A-Za-z_][A-Za-z0-9_]*)/g)) set.add(m[1]);
  for (const m of src.matchAll(/\bt\[\s*"([A-Za-z_][A-Za-z0-9_]*)"\s*\]/g)) set.add(m[1]);
  readsBy[rf] = set;
  for (const k of set) union.add(k);
}

const holes = [...union].filter((k) => !writes.has(k)).sort();
const unused = [...writes].filter((k) => !union.has(k)).sort();

console.log(`✅ 生成 ${outPath}`);
console.log(`   片段 ${texts.length} 个 → ${bytes} 字节（片段和 ${sum} 字节）` + (sum === bytes ? ' ✅一致' : ' ❌不一致'));
console.log(`   BOM = ${out.charCodeAt(0) === 0xfeff ? '❌ 有（必须去掉）' : '✅ 无'}`);
console.log(`   契约：主控写出 ${writes.size} 个字段 → ${[...writes].sort().join(',')}`);

if (holes.length) {
  console.error('');
  console.error('❌ **字段契约断裂**：这些字段被脚本读取，但主控 writeState **没有写出**：');
  for (const k of holes) {
    const who = Object.keys(readsBy).filter((rf) => readsBy[rf].has(k));
    console.error(`   - ${k}  ← 读了它的：${who.join(' / ')}`);
  }
  console.error('   ⇒ 真机上表现为"某个格子/某段文字永远不更新"。先修契约再部署。');
  process.exit(1);
}
if (unused.length) {
  console.log(`   ⚠️ 主控写了但没人读：${unused.join(',')}（不阻断，可清理）`);
}
console.log('   ✅ 契约通过（每个被读取的字段都有对应写出）');

// ── 防错线 ③：**关卡表断言**（2026-09-25 加）──
// 关卡表是玩法数据的密集区：池子超 12（会挤掉地点格）、名字写错、重复、自证角色同场、
// 有角色永远上不了场 —— 这些在真机上全是"看起来像 bug 的玩法问题"，必须在构建期拦掉。
const core = texts.find((t) => t.name === '03_core.lua').src;
const ident = Number((core.match(/\bIDENT\s*=\s*(\d+)/) || [])[1] || 0);
const pools = [...core.matchAll(/pool\s*=\s*\{([^}]*)\}/g)]
  .map((m) => [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]));
const roleSrc = fs.readFileSync(path.join(srcDir, '02_roles.lua'), 'utf8');
const known = new Set([...roleSrc.matchAll(/name\s*=\s*"([^"]+)"/g)].map((m) => m[1]));
const campOf = new Map([...roleSrc.matchAll(/name\s*=\s*"([^"]+)"\s*,\s*race\s*=\s*"[^"]*"\s*,\s*camp\s*=\s*"([^"]+)"/g)]
  .map((m) => [m[1], m[2]]));
const lvErrors = [];
if (!ident) lvErrors.push('解析不到 CFG.IDENT');
if (pools.length < 10) lvErrors.push(`关卡数只有 ${pools.length}（目标 10~12）`);
const appeared = new Set();
pools.forEach((p, i) => {
  const no = i + 1;
  if (p.length > ident) lvErrors.push(`第 ${no} 关池子 ${p.length} 个 > CFG.IDENT ${ident}（会挤掉地点格）`);
  const seen = new Set();
  for (const nm of p) {
    if (!known.has(nm)) lvErrors.push(`第 ${no} 关池子里的「${nm}」在 02_roles.lua 里查不到（名字写错？）`);
    if (seen.has(nm)) lvErrors.push(`第 ${no} 关池子里「${nm}」重复`);
    seen.add(nm);
    appeared.add(nm);
  }
  if (p.includes('牧师') && p.includes('钟表匠')) lvErrors.push(`第 ${no} 关同时有牧师与钟表匠 —— 违反自证约束（运行时会把钟表匠去掉）`);
  if (/\bpool\s*=\s*\{\s*"(伪装组|声望组|全部)"/.test(core)) lvErrors.push(`第 ${no} 关还在用魔法池名字`);
});
const ghost = [...known].filter((n) => !appeared.has(n));
if (ghost.length) lvErrors.push(`这些角色**任何一关都上不了场**：${ghost.join(' / ')}`);
console.log(`   关卡表：${pools.length} 关 / 池子最大 ${Math.max(...pools.map((p) => p.length))} 个（上限 ${ident}）/ 上场角色 ${appeared.size} 个`);
if (lvErrors.length) {
  console.error('');
  console.error(`❌ **关卡表不合格**（改 ${path.relative(process.cwd(), path.join(srcDir, '03_core.lua'))} 的 LEVELS）：`);
  for (const e of lvErrors) console.error(`   - ${e}`);
  console.error('   ⇒ 不合格不落盘。');
  process.exit(1);
}
console.log(`   ✅ 关卡表通过（${pools.length} 关；26 个角色全部上场：${appeared.size}/${known.size}）`);

fs.writeFileSync(outPath, out, 'utf8');
