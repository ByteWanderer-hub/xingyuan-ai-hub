#!/usr/bin/env node
/**
 * gate.mjs —— 技能自带的门禁入口（**与本机地图表解耦**，薄封装，不重写任何判据）
 *
 * 与工程工作区 `tools/check.mjs` 的分工：
 *   · 工作区版认 `--map <地图>`（路径 / 风格基线 / 快照全按地图解析）——**项目耦合，口径唯一真身**。
 *   · 本入口只认**显式文件 / 目录** ⇒ 换电脑、手上没有 `案子/<地图>/2.代码/` 时照样能跑。
 *   · 两边结论不一致时，**以工作区版为准**；本入口的判据全部来自同目录快照（一行不重写，只 spawn + 汇总）。
 *
 * 跑什么（顺序固定，与 SKILL.md §8 一致）：
 *   ① check-lua-scope.mjs    —— 作用域 / 控件名契约（漏 `local`、读到未绑定、引用没 add 过的控件名）
 *   ② check-lua-style.mjs    —— 风格（BOM / CRLF / TAB / 缩进 / `OnUpdate` 少 pcall / 裸 pcall / assert / 长文件）
 *   ③ lua-iron-check.mjs     —— R1–R11 状态板（内部复用 ①②，口径一致）
 *   ④ check-ui-contract.mjs  —— 界面契约（**《侦探1》专属**：判据来自那六份脚本的常量）⇒ 默认 **skip**，要跑加 `--ui`
 *
 * 用法：
 *   node scripts/gates/gate.mjs <a.lua> [b.lua …]        # 指定文件
 *   node scripts/gates/gate.mjs --dir <目录>             # 扫该目录下所有 .lua（跳过 `_snapshots/`）
 *   node scripts/gates/gate.mjs --dir <目录> --only style # 只跑一道门（scope|style|iron|ui）
 *   node scripts/gates/gate.mjs --dir <目录> --summary    # 压缩回执（失败的门仍完整回放）
 *   node scripts/gates/gate.mjs --ui --dir <目录>         # 额外跑 UI 契约门（仅对《侦探1》有意义）
 *
 * 退出码：任一**必跑门**非 0 ⇒ 1（⛔ 红了不许 deploy）；用法错误 ⇒ 2；全绿 ⇒ 0。
 * ⚠️ 本入口**不卡风格基线**（基线绑地图，见 README.md）：要卡"新代码不许比基线变差"，
 *    去工程工作区跑 `node tools/check-lua-style.mjs --baseline --map <地图>`。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectLua, HISTORY_RE } from './_paths.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const GATES = [
    { id: 'scope', title: '① 作用域 scope', file: 'check-lua-scope.mjs', required: true },
    { id: 'style', title: '② 风格 style', file: 'check-lua-style.mjs', required: true },
    { id: 'iron', title: '③ 铁律 iron', file: 'lua-iron-check.mjs', required: true },
    { id: 'ui', title: '④ 界面契约 ui-contract', file: 'check-ui-contract.mjs', required: false },
];

function usage(msg) {
    console.error('❌ ' + msg);
    console.error('用法：node scripts/gates/gate.mjs <a.lua> [b.lua …] | --dir <目录> [--only <门>] [--summary] [--ui]');
    process.exit(2);
}

// ---- 解析参数（只认显式路径；**没有 --map** —— 那是工作区版的事）----
let dir = null;
let only = null;
let summary = false;
let wantUi = false;
let explicitUi = false;
const files = [];
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dir') { dir = argv[++i]; if (!dir) usage('--dir 后面要给目录'); continue; }
    if (a === '--only') { only = argv[++i]; if (!only) usage('--only 后面要给门名'); continue; }
    if (a === '--summary') { summary = true; continue; }
    if (a === '--ui') { wantUi = true; explicitUi = true; continue; }
    if (a === '--map' || a.startsWith('--map=')) usage('技能版没有本机地图表 ⇒ 不支持 --map；给显式文件或 --dir <目录>（或用工作区版 tools/check.mjs --map）');
    if (a === '-h' || a === '--help') { console.log('见本文件头部注释；工作区版：node tools/check.mjs --help'); process.exit(0); }
    if (a.startsWith('-')) usage('不认识的旗标：' + a + '（不静默忽略，手滑打错不该"看起来跑过了"）');
    files.push(a);
}

if (only && !GATES.some((g) => g.id === only)) usage('--only 只认：' + GATES.map((g) => g.id).join(' | '));
if (wantUi) only = only ?? 'ui';
if (only === 'ui') explicitUi = true;      // `--only ui` 也算"明确要跑" ⇒ 不静默跳过（跑不了就报错 exit 2）

// ---- 收集目标 ----
let targets = files.map((f) => resolve(f));
const skippedHistory = [];
if (dir) {
    const d = resolve(dir);
    if (!existsSync(d) || !statSync(d).isDirectory()) usage('--dir 不是目录：' + d);
    // 递归 .lua（跳过 `_snapshots/`）→ 再按**工作区同一政策**剔除历史产物 / 备份
    // （`_paths.mjs` 导出的 HISTORY_RE：`_备份` / `_snapshot` / `main.engine` / `roles.lua` / `_探针` / `.bak`）
    // —— 它们不进沙箱、按政策不整改 ⇒ 门禁默认不覆盖，但**跳过了谁要如实打印**（回执说假话比不说更费时间）。
    for (const f of collectLua(d)) {
        if (HISTORY_RE.test(basename(f))) skippedHistory.push(f);
        else targets.push(f);
    }
}
targets = [...new Set(targets)];
if (!targets.length) usage('没给目标：给文件或 --dir <目录>');
for (const t of targets) if (!existsSync(t)) usage('文件不存在：' + t);

// ---- 按顺序跑门 ----
const picked = only ? GATES.filter((g) => g.id === only) : GATES.filter((g) => g.required || wantUi);
console.log(`门禁（技能版快照）· 目标 ${targets.length} 个 .lua · 跑 ${picked.length} 道门`);
for (const t of targets) console.log('   · ' + t);
if (skippedHistory.length) {
    console.log(`   （按政策跳过 ${skippedHistory.length} 个历史产物/备份：${skippedHistory.map((f) => basename(f)).join(' · ')}）`);
}
console.log('');

const results = [];
for (const g of picked) {
    if (g.id === 'ui') {
        if (explicitUi) {
            // 明确要跑却不跑 = 不诚实 ⇒ 直接说清它为什么跑不了，并给工作区的正确命令
            console.error('❌ UI 契约门（check-ui-contract.mjs）是《侦探1》**专属**：判据来自那六份脚本的常量 + 工程目录，技能版没有它们。');
            console.error('   请在工程工作区跑： node tools/check.mjs --map 侦探1    （或 node tools/check-ui-contract.mjs --map 侦探1）');
            process.exit(2);
        }
        console.log('— ' + g.title + '：技能版**默认 skip**（判据来自《侦探1》那六份脚本的常量，非本目录）—— 它属于工程工作区，见 README.md');
        results.push({ ...g, code: null, skipped: true, ms: 0 });
        continue;
    }
    const args = g.id === 'style' ? [...targets, '--summary'] : targets;
    const t0 = Date.now();
    const r = spawnSync(process.execPath, [join(HERE, g.file), ...args], {
        cwd: process.cwd(), encoding: 'utf8', stdio: summary ? ['ignore', 'pipe', 'pipe'] : 'inherit',
        // ⚠️ 技能版：告诉 `_paths.mjs` 本次走"显式文件模式"（本机没有 `案子/<地图>/2.代码/` 也能跑）
        env: { ...process.env, QXQY_GATE_EXPLICIT: '1' },
    });
    const ms = Date.now() - t0;
    const code = r.status ?? 1;
    console.log('');
    console.log(`— ${g.title}：exit ${code}（${ms} ms）`);
    if (summary && code !== 0) {              // ⚠️ 失败的门永远完整回放，细节不许被汇总吃掉
        const out = (r.stdout || '') + (r.stderr || '');
        console.log(out.trim() ? out.trim() : '（无输出）');
    }
    results.push({ ...g, code, skipped: false, ms });
}

// ---- 汇总（只报数字与原样转发的 exit code，判定留给人）----
const failed = results.filter((r) => !r.skipped && r.code !== 0);
console.log('');
console.log('门禁 | 命令 | exit | 结论');
for (const r of results) {
    const verdict = r.skipped ? 'skip（非本目录）' : r.code === 0 ? '绿' : '红 ⇒ 不许 deploy';
    console.log(`  ${r.title} | ${r.file} | ${r.skipped ? '—' : r.code} | ${verdict}`);
}
console.log('');
if (failed.length) {
    console.log(`❌ ${failed.length} 道门非 0：${failed.map((f) => f.id).join(', ')} —— 修完再往下走（SKILL.md §8）`);
    console.log('   定位：直接跑那一道门（带行号）；清存量/改基线用工作区版 --fix / --update-baseline。');
    console.log('');
    console.log('⛔ 门红 ≠ "这改动不该做" —— 只许两种动作：① 修到过（必要时改门禁判据）② 如实标 pending 交付，让人在真机判。');
    console.log('⛔ 不许：回退/还原成旧实现 · 删掉或藏起作者要的功能（SetVisible(false)/注释掉也算） · 空壳/占位/假数据顶。');
    console.log('⛔ ok:null / "没测" / "判不了" ≠ 失败：要求照做、证据如实标（别把"没证据"做成"不实现"）。');
    console.log('   （SKILL.md §8「门被打回了，怎么动」· R14）');
    process.exit(1);
}
console.log('✅ 必跑门全绿。下一步：插件 `miliastra_code op=preflight` → 模拟器 `miliastra_sim op=bind`（SKILL.md §8 第 5–7 道）。');
console.log('   ⚠️ "绿"只表示这几道门没红；warn / 半自动项仍需人判，没跑真机的照旧如实标 pending（别把"没证据"写成"通过"）。');
process.exit(0);
