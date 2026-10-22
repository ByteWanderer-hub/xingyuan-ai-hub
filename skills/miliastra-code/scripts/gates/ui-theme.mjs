// ── 技能自带快照（miliastra-code/scripts/gates/）────────────────
// 源：Desktop\yuanshen\tools\ui-theme.mjs（**工程工作区是唯一真身**，本文件只是快照）
// 差异：仅本溯源头 + import 路径改写（`../packages/dsh-miliastra/lib/lualint.mjs` → `./lualint.mjs`）；**判据未改一字**
// 刷新：`node scripts/gates/… ` 见同目录 README.md「刷新方法」
// ────────────────────────────────────────────────────────────
// 《侦探杀》UI 取值基座（FP1）：颜色/字号/描边抽成单点 `案子/侦探1/2.代码/theme.lua`
//   为什么：view/board 各写一份色表，改一次颜色要改两处、漏一处就花屏；改造期要频繁调色，必须单点。
//   子命令（split 每个目标只跑一次；build/check 每次改完都跑）：
//     split [tag]  从 案子/侦探1/2.代码/<活文件> 抽走所有 `local C_*` 行 → 同目录 <tag>_body.lua（第一处原位留 @@THEME@@ 标记）
//                  校验：① 色表散落时（board）比"去掉色表后的代码行"必须逐行一致；② 连续时要求拼回逐字节一致
//     build        每个目标**只注入它真正用到的 token**（含别名闭包）—— view 卡在 1000 行，不能把 board 的 token 灌进去
//     check        门禁：① 产物里的注入块必须与 theme.lua 对应行**逐字一致**（防手改产物）② body 里不许裸写色表/裸 Color.FromRGBA(n)
//   用法：node tools/ui-theme.mjs split | split board | build | check   [--map 侦探1]
//   ⚠️ **本脚本只服务《侦探杀》**（TARGETS 是它那三份产物的清单）：给别的 --map 会**明确报错退出**。
//   ★ 路径不写死：成品与构建源现在**同在** `案子/侦探1/2.代码/`，由 tools/_paths.mjs 解析。
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseMap, paths } from './_paths.mjs';

const { map, root, args } = parseMap(process.argv.slice(2));
if (map !== '侦探1') {
  console.error(`❌ ui-theme.mjs 是《侦探1（侦探杀）》专属的取值基座，不支持 --map ${map}。`);
  console.error('   （TARGETS 里那三份产物 view/board/hud 与 theme.lua 的取值单点是侦探杀专有的；别的图还没有这套。）');
  process.exit(2);
}

const P = paths(map, root);
const THEME = P.p('theme.lua');
const MARK = '-- @@THEME@@ 由 tools/ui-theme.mjs build 注入（勿手改这一行）';
// 注入进产物的固定说明行（theme.lua 自己的文档头**不进产物**：产物要省行数）
// ⚠️⚠️ **这一行的字面量不许改**（2026-10-04 B 方案实测踩到）：它会被**逐字注入产物**，
//   改一个字 ⇒ 产物的 SHA 就变了 ⇒ 与"迁移前逐字节一致"的验收冲突，而且等于**改了 .lua 的内容**
//   （硬约束：只搬位置、不改内容）。所以它至今仍写着旧路径 `sources/侦探1/theme.lua`。
//   ⇒ 要把它改成新路径，必须**当成一次产品改动**走：改 → ui-theme build → 三道门禁 → deploy → 重新存盘试玩。
//     （属于"改产物注释"级别的技术动作，作者拍板后再做。）
const NOTE = '-- ★ 取值单点：sources/侦探1/theme.lua（改色/改字号只改那里，再 node tools/ui-theme.mjs build）';
const BACKUP_DIR = P.p('_produce_backup');
const TARGETS = [
    { tag: 'view', live: P.p('表现 view.lua'), body: P.p('view_body.lua') },
    { tag: 'board', live: P.p('调查板 board.lua'), body: P.p('board_body.lua'), scattered: true },
    // ★ FP-C（2026-09-26）：新脚本 HUD 也走同一份取值单点（改色/改字号只改 theme.lua）
    { tag: 'hud', live: P.p('HUD hud.lua'), body: P.p('hud_body.lua') },
];

const read = (p) => readFileSync(p, 'utf8').split(/\r?\n/);
const write = (p, lines) => writeFileSync(p, lines.join('\n'), 'utf8');
const isTok = (ln) => /^local\s+C_[A-Z0-9_]+\s*=/.test(ln);
const tokName = (ln) => (ln.match(/^local\s+(C_[A-Z0-9_]+)\s*=/) || [])[1];
const fail = (msg) => {
    console.error('✗ ' + msg);
    process.exit(1);
};
const themeTokLines = () => read(THEME).filter(isTok);
const isTransparent = (ln) => /Color\.FromRGBA\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/.test(ln);

// 某 body 用到的 token（含别名闭包：C_INNER = C_LINE ⇒ 连 C_LINE 一起注入）
function tokensFor(bodyText, all) {
    const used = new Set(bodyText.match(/\bC_[A-Z0-9_]+\b/g) || []);
    for (let pass = 0; pass < 3; pass++) {
        for (const ln of all) {
            const n = tokName(ln);
            if (!n || !used.has(n)) continue;
            for (const m of ln.match(/\bC_[A-Z0-9_]+\b/g) || []) used.add(m);
        }
    }
    return all.filter((ln) => used.has(tokName(ln)));
}

function splitOne(t) {
    const src = read(t.live);
    const toks = src.filter(isTok);
    if (toks.length === 0) fail(t.live + ' 里找不到 `local C_*` 色表行（已经抽过了？）');
    const at = src.findIndex(isTok);
    const body = src.filter((ln) => !isTok(ln));
    body.splice(at, 0, MARK);
    const back = body.flatMap((ln) => (ln === MARK ? toks : [ln]));
    const same = back.join('\n') === src.join('\n');
    if (!same && !t.scattered) fail(t.live + ' 抽走再拼回与原文件不一致（拒绝写盘）');
    if (!same && t.scattered) {
        // 色表散落：只要求"去掉色表后的代码行"逐行一致（board 的 C_PANEL 注释块会另行整理）
        const a = src.filter((ln) => !isTok(ln)).join('\n');
        const b = body.filter((ln) => ln !== MARK).join('\n');
        if (a !== b) fail(t.live + ' 去掉色表后代码行不一致（拒绝写盘）');
        console.log('     （色表分 ' + (toks.length) + ' 行、位置分散 ⇒ 已归并到第一处，代码行逐行一致 ✓）');
    }
    write(t.body, body);
    console.log('OK   ' + t.body + '（抽走 ' + toks.length + ' 行色表）');
}

function buildOne(t) {
    const body = read(t.body);
    const theme = [NOTE, ...tokensFor(body.join('\n'), themeTokLines())];
    const at = body.findIndex((ln) => ln.trim().startsWith('-- @@THEME@@'));
    if (at < 0) fail(t.body + ' 里没有标记');
    const out = body.flatMap((ln, i) => (i === at ? theme : [ln]));
    // ⚠️ 2026-09-27 修：这里原本硬写 1000，而 `check-lua-style.mjs` 的 BIG_FILE_LINES 已放宽到 2000
    //   ⇒ 1057 行的产物会打出「BIG_FILE 会 warn」，其实根本不会 —— **回执说假话比不说更费时间**。
    //   现在与门禁同一个数（改门禁阈值时这里一起改），并且只说事实、不预言。
    const BIG_FILE_LINES = 2000;
    if (out.length > BIG_FILE_LINES) console.log('!    产物 ' + out.length + ' 行 > ' + BIG_FILE_LINES + '（BIG_FILE 门禁会 warn）');
    if (existsSync(t.live)) {
        mkdirSync(BACKUP_DIR, { recursive: true });
        copyFileSync(t.live, join(BACKUP_DIR, t.tag + '.lua.prev'));
    }
    write(t.live, out);
    console.log('OK   ' + t.live + '（注入 ' + (theme.length - 1) + ' 个 token + body ' + body.length + ' 行 → ' + out.length + ' 行）');
}

function checkOne(t) {
    const body = read(t.body);
    const theme = [NOTE, ...tokensFor(body.filter((l) => !l.trim().startsWith('-- @@THEME@@')).join('\n'), themeTokLines())];
    const prod = read(t.live).join('\n');
    if (!prod.includes(theme.join('\n'))) fail(t.live + ' 里的注入块与 ' + THEME + ' 不一致（有人手改产物？跑 build 覆盖）');
    const bad = body.filter((ln) => isTok(ln) || (/Color\.FromRGBA\(\s*\d/.test(ln) && !isTransparent(ln)));
    if (bad.length) fail(t.body + ' 里还有裸写取值 ' + bad.length + ' 处：' + bad.slice(0, 3).join(' | '));
    console.log('OK   ' + t.tag + '：注入块 ' + (theme.length - 1) + ' 个 token 与 theme.lua 逐字一致；body 无裸写取值');
}

const cmd = args[0];
const only = args[1];
const pick = () => (only ? TARGETS.filter((t) => t.tag === only) : TARGETS);
if (!only && cmd !== 'build' && cmd !== 'check' && cmd !== 'split') fail('用法：node tools/ui-theme.mjs split|build|check [tag] [--map 侦探1]');
if (only && pick().length === 0) fail('没有这个目标：' + only);
if (cmd === 'split') pick().forEach(splitOne);
else if (cmd === 'build') pick().forEach(buildOne);
else if (cmd === 'check') pick().forEach(checkOne);
else fail('用法：node tools/ui-theme.mjs split|build|check [tag] [--map 侦探1]');
console.log(cmd === 'check' ? '全部对齐 ✓' : '完成 ✓');
