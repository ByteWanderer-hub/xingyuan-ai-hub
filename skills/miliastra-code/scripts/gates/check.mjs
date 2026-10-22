#!/usr/bin/env node
// ── 技能自带快照（miliastra-code/scripts/gates/）────────────────
// 源：Desktop\yuanshen\tools\check.mjs（**工程工作区是唯一真身**，本文件只是快照）
// 差异：仅本溯源头 + import 路径改写（`../packages/dsh-miliastra/lib/lualint.mjs` → `./lualint.mjs`）；**判据未改一字**
// 刷新：`node scripts/gates/… ` 见同目录 README.md「刷新方法」
// ────────────────────────────────────────────────────────────
/**
 * check.mjs —— ★ 工作区门禁的**单一入口**（2026-10-04 · B 方案「阶段 6」第 1 件）
 *
 * 它是什么：**薄封装**。一条命令把门按顺序跑完，再打一张「门 ｜ 命令 ｜ exit ｜ 结论」的表。
 *   ① tools/check-lua-scope.mjs    —— 作用域 / 控件名契约（漏 local、读到未绑定、引用没 add 过的控件名）
 *   ② tools/check-lua-style.mjs    —— 风格（BOM/CRLF/TAB/缩进/OnUpdate 少 pcall/裸 pcall/assert/长文件…）
 *   ③ tools/lua-iron-check.mjs     —— R1–R11 铁律状态板（内部复用 ①② 的判据，口径一致）
 *   ④ tools/check-ui-contract.mjs  —— 界面契约（画在哪=点哪算 / 8 的倍数 / 字号档 / 矩形高）★ **只服务《侦探1》**
 *
 * ★★ 为什么**不删**旧命令（这是本文件存在的前提，不是"过渡期的妥协"）：
 *   · 旧命令是**唯一真身**：判据全在它们里面，本入口**一行判据都不重写**
 *     （只 spawn + 汇总 + 原样转发 exit code）⇒ 出问题时要能"绕过封装直接跑那一道门"来定位，
 *     封装层永远不该是排查链上的一环。
 *   · 旧命令能给**本入口给不出的细节与动作**：逐条行号（scope 的 `✗ L行`）、逐文件计数（style 不加 --summary）、
 *     以及 `--fix` / `--fix-blocks` / `--update-baseline` / `--selftest` / `--json` 这些**只在旧命令里**的开关。
 *     本入口是"日常一把跑"，不是替代品（照根 AGENTS.md §6：旧命令仍可单独用）。
 *   · 删掉 = 抹掉"某条门当初是怎么被调用的"这段证据，而收益只有"目录里少几个文件"。
 *
 * 用法：
 *   node tools/check.mjs                       # 默认地图《侦探1》，门禁一把跑完（含 ui-contract）
 *   node tools/check.mjs --map 双相             # 换图（★ 加新地图不用改代码）；别的图自动**跳过** ui-contract
 *   node tools/check.mjs --map 侦探杀            # 认别名（侦探杀→侦探1）；认不出**报错并列候选**
 *   node tools/check.mjs --summary             # 只打汇总表（失败的门仍**完整回放**）；style 一律以 --summary 跑
 *   node tools/check.mjs --only iron           # 只跑一道门（scope|style|iron|ui）
 *   node tools/check.mjs --help                # 全部参数 + 我实际调了哪几条命令
 * 退出码：任一**必跑门**非 0 ⇒ 1；被跳过的门（别的图的 ui-contract）**不算失败**；本入口自己的用法错误 ⇒ 2。
 * ★ 路径不写死：由 tools/_paths.mjs 按地图名解析（全仓唯一根解析点）。
 *   子脚本一律以**工作区根为 cwd** 跑 —— check-lua-style 的基线路径是按 cwd 解析的。
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ROOT, parseMap } from './_paths.mjs';

const ONLY_VALUES = ['scope', 'style', 'iron', 'ui'];
const UI_MAP = '侦探1';                 // check-ui-contract.mjs 只服务这张图（判据是它那六份脚本的常量）

const HELP = `check.mjs —— 工作区门禁的单一入口（薄封装：只 spawn + 汇总，不重写任何判据）

用法：
  node tools/check.mjs [--map <地图>] [--summary] [--only <scope|style|iron|ui>] [--help]

参数：
  --map <地图>   要查哪张图。默认 侦探1（与 tools/_paths.mjs 的 DEFAULT_MAP 一致）。
                 认别名（侦探杀→侦探1 · 双向/冰火/冰镜火烛→双相 · 法师/像素画→夏日祭法师…）；
                 **认不出就报错并列全部候选**，绝不猜（规则全在 tools/_paths.mjs，本文件不另写一套）。
  --summary      压缩本入口的回执：只打汇总表，不逐门回放通过门的完整输出。
                 ⚠️ **失败的门永远完整回放**（失败的细节不许被汇总吃掉）。
                 ⚠️ 与 style 无关：不管给不给，②一律以 \`--summary\` 跑（见下方"基线未启用"）。
  --only <门>    只跑一道门：scope | style | iron | ui（给别的值 ⇒ 报错列出合法值并 exit 2）。
  -h, --help     打这段帮助并 exit 0。
  （没有位置参数：地图请用 --map；其余参数一律会被拒绝，不静默忽略 —— 手滑打错旗标不该"看起来跑过了"。）

我实际调的四条命令（子脚本一律以**工作区根为 cwd** 跑）：
  ① node tools/check-lua-scope.mjs    --map <地图>
  ② node tools/check-lua-style.mjs    --map <地图> --summary
  ③ node tools/lua-iron-check.mjs     --map <地图>
  ④ node tools/check-ui-contract.mjs  --map <地图>          ← 只在《${UI_MAP}》跑；别的图打印一行 skip，**不算失败**

口径（本入口只报数字 / 原样转发 exit code，判定留给你）：
  · ①②③ 的 error 级命中 ⇒ 各自 exit 1（按根 AGENTS.md §6：红了不许 deploy）；只有 warn ⇒ exit 0。
  · ②**基线未启用**：本入口一律用 \`--summary\` 跑 ②，**不拿 \`--baseline\` 卡门**（对没基线的图它会 exit 2，
    那是"没法跑"不是"跑红了"），**也不拿别图的基线充数**。要卡基线（本图有基线时）走旧命令：
      node tools/check-lua-style.mjs --baseline --map <地图>
  · ④ 只服务《${UI_MAP}》：别的图**跳过**并在表里标 skip，不算失败。
  · 退出码：任一必跑门非 0 ⇒ 1；用法错误（地图认不出 / --only 给错 / 位置参数）⇒ 2。

为什么旧命令全都留着（不要删）：
  · 判据在旧命令里，本入口一行都没重写 ⇒ 出问题时可以直接跑那一道门定位，绕过封装。
  · 逐条行号 / 逐文件计数 / --fix / --fix-blocks / --update-baseline / --selftest / --json 只在旧命令里。
  · 旧命令**签名不变**，仍可单独跑；本入口只是"一把跑完"。
`;

function die(msg, code = 2) {
  console.error('❌ ' + msg);
  process.exit(code);
}

// ── 参数（地图解析交给 _paths.mjs；本文件只认 --summary / --only / --help）──
const raw = process.argv.slice(2);
if (raw.includes('--help') || raw.includes('-h')) {
  console.log(HELP);
  process.exit(0);
}
let only = null;
{
  const eq = raw.find((a) => a.startsWith('--only='));
  const i = raw.indexOf('--only');
  if (eq !== undefined) only = eq.slice('--only='.length);
  else if (i >= 0) {
    if (raw[i + 1] === undefined) die(`--only 后面要给一门：${ONLY_VALUES.join(' | ')}`);
    only = raw[i + 1];
  }
  if (only !== null && !ONLY_VALUES.includes(only)) {
    die(`--only 只认 ${ONLY_VALUES.join(' | ')}，收到「${only}」（要全跑就省掉 --only）`);
  }
}
const summary = raw.includes('--summary');

let ctx;
try {
  ctx = parseMap(raw);        // ← 地图名 / 别名 / 报错风格全部复用 _paths.mjs（本文件不另写路径解析）
} catch (e) {
  die(e.message);
}
const map = ctx.map;

// 位置参数 / 不认识的旗标：拒绝而不是静默忽略（手滑打错旗标不该"看起来跑过了"）
const rest = ctx.args.filter((a) => a !== '--summary' && a !== '--only' && a !== `--only=${only}` && a !== only);
if (rest.length) {
  die(`不认识的参数：${rest.join(' ')}\n  本入口只认 --map <地图> / --summary / --only <scope|style|iron|ui> / --help` +
    `\n  （地图用 --map 给：位置参数 ${rest[0]} 会被忽略成"默认图 ${map}"，那是**假话**，所以这里直接拒绝）`);
}

const uiSkipped = map !== UI_MAP;

/** 跑一道门：**只转发**，判据一行都不碰。返回 exit code + 完整输出。 */
function runGate(id, title, file, args) {
  const cmd = `node ${file} ${args.join(' ')}`.trim();
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [join(ROOT, file), ...args], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  return {
    id, title, cmd, out, ms: Date.now() - t0,
    code: r.error ? null : r.status,
    spawnError: r.error ? String(r.error.message) : null,
  };
}

const gate = (id) => only === null || only === id;
const results = [];
console.log(`地图「${map}」｜目录 ${join(ROOT, '案子', map, '2.代码')}`);
console.log(`模式：${summary ? 'summary（只打汇总表；失败门仍完整回放）' : 'full（逐门完整输出 + 汇总表）'}` +
  `｜只跑：${only ?? '全部'}`);

const GATES = [
  { id: 'scope', title: '① 作用域 scope', file: join('tools', 'check-lua-scope.mjs'), args: ['--map', map] },
  { id: 'style', title: '② 风格 style', file: join('tools', 'check-lua-style.mjs'), args: ['--map', map, '--summary'] },
  { id: 'iron', title: '③ 铁律 iron', file: join('tools', 'lua-iron-check.mjs'), args: ['--map', map] },
  { id: 'ui', title: '④ 界面契约 ui-contract', file: join('tools', 'check-ui-contract.mjs'), args: ['--map', map] },
].filter((g) => gate(g.id));

for (const g of GATES) {
  if (g.id === 'ui' && uiSkipped) {
    console.log(`\n──── ${g.title} ────`);
    console.log(`skip ui-contract（专属 ${UI_MAP}）—— 地图「${map}」不跑这一道，**不算失败**`);
    results.push({ ...g, cmd: `node ${g.file} --map ${map}`, code: null, skipped: `专属 ${UI_MAP}`, out: '', ms: 0 });
    continue;
  }
  console.log(`\n──── ${g.title} ──── $ ${`node ${g.file} ${g.args.join(' ')}`}`);
  const r = runGate(g.id, g.title, g.file, g.args);
  if (summary && r.code === 0) {
    console.log(`  exit ${r.code}（${r.ms} ms）—— 通过；输出略（要看细则直接跑：${r.cmd}）`);
  } else {
    const body = r.out.trimEnd();
    console.log(body || '（无输出）');
    if (r.spawnError) console.log(`  ⚠️ 起不来：${r.spawnError}`);
    console.log(`  → exit ${r.code === null ? '（没跑起来）' : r.code}｜${r.ms} ms`);
  }
  results.push({ ...r, skipped: null });
}

/** 结论列：只把各子脚本**自己的**语义翻成人话（不额外判对错）。 */
function verdict(r) {
  if (r.skipped) return `skip（${r.skipped}，不算失败）`;
  if (r.code === null) return '没跑起来（spawn 失败）';
  if (r.code === 0) {
    if (r.id === 'scope') return '无 error 级命中（只有 warn 也 exit 0）';
    if (r.id === 'style') return '无 error 级命中（warn 见直方图）';
    if (r.id === 'iron') return 'R 表无 error 级命中（半自动项要人判）';
    return '全部对齐（画在哪=点哪算 + 规范档位）';
  }
  if (r.code === 1) {
    if (r.id === 'ui') return '有矩形/档位不合格（见上）';
    return '有 error 级命中 ⇒ 按 AGENTS.md §6 不许 deploy';
  }
  if (r.code === 2) return '没法跑：没找到要检查的 .lua / 用法或基线前提不满足（见上）';
  return `异常退出码 ${r.code}（见上）`;
}

const rows = [['门', '命令', 'exit', '结论']];
for (const r of results) rows.push([r.title, r.cmd, r.skipped ? '—' : String(r.code), verdict(r)]);
const required = results.filter((r) => !r.skipped);
const failed = required.filter((r) => r.code !== 0);
const totalVerdict = failed.length
  ? `✗ ${failed.length}/${required.length} 道必跑门未通过（${failed.map((r) => `${r.id}=${r.code ?? 'spawn失败'}`).join(' · ')}）⇒ **不要 deploy**，先看上面的输出`
  : `✓ 全部必跑门通过（${required.length} 道${uiSkipped && results.some((r) => r.id === 'ui') ? `；跳过 1 道：ui-contract 专属 ${UI_MAP}` : ''}）`;
rows.push(['总判定', `node tools/check.mjs --map ${map}${only ? ` --only ${only}` : ''}`, String(failed.length ? 1 : 0), totalVerdict]);

/** 显示宽度（CJK 算 2 列）—— 只为表格能对齐，不参与任何判定。 */
const dw = (s) => [...String(s)].reduce((n, c) =>
  n + (/[\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE6F\uFF00-\uFF60\uFFE0-\uFFE6]/.test(c) ? 2 : 1), 0);
const width = new Array(4).fill(0);
for (const r of rows) for (let i = 0; i < 4; i += 1) width[i] = Math.max(width[i], dw(r[i]));
const pad = (s, n) => s + ' '.repeat(Math.max(0, n - dw(s)));
const renderRow = (r) => r.map((c, i) => pad(c, width[i])).join(' ｜ ');
const rule = width.map((n) => '─'.repeat(n)).join('─┼─');

/** 本图的基线在不在（**只作信息**，本入口不启用基线 —— 见文件头）。 */
function baselineNote(m) {
  try {
    const j = JSON.parse(readFileSync(join(ROOT, 'tools', 'lua-style-baseline.json'), 'utf8'));
    if (j.byMap && j.byMap[m]) return `有（byMap["${m}"]）`;
    if (j.map === m && j.files) return `有（旧格式，map=${m}）`;
    const owner = j.map || (j.byMap ? Object.keys(j.byMap).join(' / ') : '') || '（没标归属）';
    return `无 —— 文件里现有的是：${owner}`;
  } catch (e) {
    return `读不出基线文件（${e.message}）`;
  }
}

console.log('\n' + '═'.repeat(64));
console.log('汇总表（门 ｜ 命令 ｜ exit ｜ 结论）');
console.log(renderRow(rows[0]));
console.log(rule);
for (const r of rows.slice(1)) console.log(renderRow(r));
console.log('═'.repeat(64));

console.log('\nℹ️ 口径（本入口不重写判据，逐门原样转发 exit code）：');
console.log(`  · ② style 一律以 \`--summary\` 跑 ⇒ **基线未启用**（本图基线：${baselineNote(map)}）。`);
console.log('    本入口不拿 `--baseline` 卡门（对没基线的图会 exit 2 = "没法跑"，不是"跑红了"），也不拿别图的基线充数。');
console.log(`    要卡基线（本图有基线时）： node tools/check-lua-style.mjs --baseline --map ${map}`);
console.log(`  · ④ ui-contract 只服务《${UI_MAP}》⇒ 别的图**跳过**，不算失败（判据是它那六份脚本的常量）。`);
console.log('  · ③ iron 是 R1–R11 状态板，内部复用 ①② 的判据（口径一致，改一处不会两边漂）。');
console.log('  · 旧命令全部保留、签名不变、仍可单独跑 —— 本入口只是"一把跑完"。要逐条行号/动作开关就走旧命令。');

console.log('\n' + totalVerdict);
process.exit(failed.length ? 1 : 0);
