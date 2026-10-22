#!/usr/bin/env node
// ── 技能自带快照（miliastra-code/scripts/gates/）────────────────
// 源：Desktop\yuanshen\tools\check-shuangxiang-audit.mjs（**工程工作区是唯一真身**，本文件只是快照）
// 差异：仅本溯源头 + import 路径改写（`../packages/dsh-miliastra/lib/lualint.mjs` → `./lualint.mjs`）；**判据未改一字**
// 刷新：`node scripts/gates/… ` 见同目录 README.md「刷新方法」
// ────────────────────────────────────────────────────────────
/**
 * check-shuangxiang-audit.mjs —— 《双相》关卡可达性**离线**审计（与 案子/双相/2.代码/main/06_audit.lua 同一套数学）
 *
 * 为什么存在：06_audit 只在游戏运行时打日志，改一次几何要绑模拟器跑一轮才知道超没超预算；
 * 本工具直接读 02_levels.lua 源码，秒级回每一间的横缝/上升/斜跳可达性 + 汇总行，
 * 语义与运行时 `全关卡审计汇总: N/M 全部通过` 一一对应（离线绿 ⇒ 运行时那行才会出现）。
 *
 * 用法： node tools/check-shuangxiang-audit.mjs [--map 双相]   # 0=全部通过 1=有警告 2=文件/解析问题
 *   ⚠️ **只服务《双相》**（读它的关卡片段 02_levels.lua 与 06_audit.lua）。
 *   ★ 路径不写死：片段与成品同在 `案子/双相/2.代码/`（2026-10-04 迁移后）。
 * 断言（v2, 2026-09-28）：
 *   A. 逐段横缝/上升/斜跳可行上限 —— 与 06_audit 同数学，预算常量**双边同步校验**（不同步即报错）
 *   B. 出生点：必须踩在**起始相位下实心**的非 iso 平台上，且精确站立（spawn.y+30 == 台顶）—— 防开局即坠
 *   C. 出口：必须存在非 iso 平台，其站立/跳跃带（顶面上方 130）覆盖出口底边，且水平间隔 ≤ 134（一跳宽）—— 防死关
 * 解析口径：房间 = name 起到下一个 name 止；plats 行以 `{ 数字` 开头；含 `nil, true` = iso（跳过审计）；
 *          K_MOVER 同行 `range = N` 按半行程放宽（与运行时 halfRange 一致）。
 */
import { readFileSync } from 'node:fs';
import { parseMap, paths } from './_paths.mjs';

let ctx;
try { ctx = parseMap(process.argv.slice(2), { fallback: '双相' }); } catch (e) { console.error('❌ ' + e.message); process.exit(2); }
if (ctx.map !== '双相') {
  console.error(`❌ check-shuangxiang-audit.mjs 是《双相》专属的关卡审计，不支持 --map ${ctx.map}。`);
  process.exit(2);
}
const P = paths(ctx.map, ctx.root);
const SRC = P.p('main', '02_levels.lua');
const AUDIT = P.p('main', '06_audit.lua');

// —— 与 06_audit.lua 保持一致的预算（改那边就要改这边，注释互指）——
const AUDIT_MAX_GAP = 125;
const AUDIT_MAX_RISE = 120;
const REACH_FINAL = 80;   // 尾档与 06_audit 同步（下方断言查）
function reachLimit(rise) {
  if (rise <= 20) return 126;
  if (rise <= 40) return 115;
  if (rise <= 60) return 108;
  if (rise <= 80) return 100;
  if (rise <= 100) return 90;
  return REACH_FINAL;
}
const PLAYER_W = 22, PLAYER_H = 30, JUMP_H = 130, JUMP_W = 134;   // FP7（01_head 同源）

let text;
try {
  text = readFileSync(SRC, 'utf8');
} catch (e) {
  console.error('❌ 读不到 ' + SRC + '：' + e.message);
  process.exit(2);
}

// —— 预算一致性自检：06_audit 里的件套必须与本文件一致（防止改了一边忘了另一边）——
const atext = readFileSync(AUDIT, 'utf8');
const g = atext.match(/AUDIT_MAX_GAP\s*=\s*(\d+)/);
const r = atext.match(/AUDIT_MAX_RISE\s*=\s*(\d+)/);
if (!g || Number(g[1]) !== AUDIT_MAX_GAP || !r || Number(r[1]) !== AUDIT_MAX_RISE) {
  console.error(`❌ 预算不同步：06_audit GAP=${g && g[1]} RISE=${r && r[1]} vs 本工具 ${AUDIT_MAX_GAP}/${AUDIT_MAX_RISE}`);
  process.exit(2);
}
const ours = [[20, 126], [40, 115], [60, 108], [80, 100], [100, 90]];
for (const [ru, li] of ours) {
  const m = atext.match(new RegExp(`if rise <= ${ru} then return (\\d+) end`));
  if (!m || Number(m[1]) !== li) {
    console.error(`❌ reachLimit 不同步：06_audit rise<=${ru} → ${m && m[1]} vs 本工具 ${li}`);
    process.exit(2);
  }
}
if (!new RegExp(`return ${REACH_FINAL}\\s*end`).test(atext)) {
  console.error(`❌ reachLimit 尾档不同步：06_audit 里找不到 "return ${REACH_FINAL}"`);
  process.exit(2);
}

// —— 按 name 切房间区域，区域内解析头字段 + plats ——
const nameRe = /name\s*=\s*"([^"]+)"/g;
const marks = [];
let m;
while ((m = nameRe.exec(text)) !== null) marks.push({ name: m[1], at: m.index });
if (marks.length === 0) {
  console.error('❌ 一个房间都没解析到（02_levels 格式变了？）');
  process.exit(2);
}

function solidFor(kind, phase) {
  if (kind === 'ICE') return phase === 'FIRE';
  if (kind === 'LAVA') return phase === 'ICE';
  if (kind === 'ICEWALL' || kind === 'LAVAPIT') return phase === 'ICE';
  return true;   // PLAIN / MOVER 恒实
}

const rooms = [];
for (let i = 0; i < marks.length; i++) {
  const body = text.slice(marks[i].at, i + 1 < marks.length ? marks[i + 1].at : text.length);
  const sp = body.match(/startPhase\s*=\s*PHASE_(FIRE|ICE)/);
  const sn = body.match(/spawn\s*=\s*\{\s*(-?\d+)\s*,\s*(-?\d+)\s*\}/);
  const ex = body.match(/exit\s*=\s*\{\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*\}/);
  // 只取 plats = { … } 配对块内解析（zones 也是 `{ 数字` 行，混进来会污染段链 —— 踩过）
  const pb = body.match(/plats\s*=\s*\{/);
  let platBody = '';
  if (pb) {
    let depth = 1, j = pb.index + pb[0].length;
    while (j < body.length && depth > 0) {
      const ch = body[j];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      j++;
    }
    platBody = body.slice(pb.index + pb[0].length, j - 1);
  }
  const plats = [];
  for (const line of platBody.split('\n')) {
    const t = line.trim().replace(/--.*$/, '');
    if (!t.startsWith('{')) continue;
    const nums = t.match(/^\{\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*,/);
    if (!nums) continue;
    const iso = /nil\s*,\s*true/.test(t);
    const km = t.match(/K_(PLAIN|ICE|LAVA|ICEWALL|LAVAPIT|MOVER)/);
    let range = 0;
    if (km && km[1] === 'MOVER') {
      const rr = t.match(/range\s*=\s*(\d+)/);
      range = rr ? Number(rr[1]) / 2 : 0;
    }
    plats.push({ x: +nums[1], y: +nums[2], w: +nums[3], h: +nums[4], iso, range, kind: km ? km[1] : 'PLAIN' });
  }
  rooms.push({
    name: marks[i].name,
    phase: sp ? sp[1] : null,
    spawn: sn ? { x: +sn[1], y: +sn[2] } : null,
    exit: ex ? { x: +ex[1], y: +ex[2], w: +ex[3], h: +ex[4] } : null,
    plats,
  });
}

// —— 逐房间三类断言（抽成 checkRoom，供主流程与 --selftest 共用）——
function checkRoom(room) {
  const warns = [];

  // A. 逐段可达（与 06_audit 同数学）
  let prev = null;
  for (let i = 0; i < room.plats.length; i++) {
    const p = room.plats[i];
    if (p.iso) continue;
    if (prev !== null) {
      const a = room.plats[prev];
      const aR = a.x + a.w + a.range;
      const aX = a.x - a.range;
      const bL = p.x - p.range;
      const bR = p.x + p.w + p.range;
      let gap = 0;
      if (bL > aR) gap = bL - aR;
      else if (aX > bR) gap = aX - bR;
      const rise = (a.y - a.range) - (p.y + p.range);
      const tag = `段${prev + 1}->${i + 1}`;
      if (gap > AUDIT_MAX_GAP) warns.push(`${tag} 横缝${gap}>${AUDIT_MAX_GAP}`);
      if (rise > AUDIT_MAX_RISE) warns.push(`${tag} 上升${rise}>${AUDIT_MAX_RISE}`);
      if (gap > reachLimit(rise)) warns.push(`${tag} 斜跳不可达 gap=${gap} rise=${rise}（上限${reachLimit(rise)}）`);
    }
    prev = i;
  }

  // B. 出生点：实心 + 精确站立
  if (!room.spawn || !room.phase) {
    warns.push(`出生点解析失败 spawn=${!!room.spawn} phase=${!!room.phase}`);
  } else {
    const sx = room.spawn.x, sy = room.spawn.y;
    const ok = room.plats.some((p) => !p.iso && solidFor(p.kind, room.phase)
      && p.x <= sx && sx + PLAYER_W <= p.x + p.w
      && p.y === sy + PLAYER_H);
    if (!ok) warns.push(`出生点(${sx},${sy}) 未精确站在起始相位实心台上（需 横向覆盖且台顶==${sy + PLAYER_H}）`);
  }

  // C. 出口：存在路径台，站立/跳跃带覆盖出口底边且水平间隔 ≤ 一跳宽
  if (!room.exit) {
    warns.push('出口解析失败');
  } else {
    const e = room.exit;
    const eBottom = e.y + e.h;
    const ok = room.plats.some((p) => {
      if (p.iso) return false;
      if (eBottom < p.y - PLAYER_H - JUMP_H) return false;               // 出口底边高于跳跃带顶 → 够不着
      const gapX = Math.max(0, e.x - (p.x + p.w), p.x - (e.x + e.w));    // 出口矩形与台跨度的水平间隔
      return gapX <= JUMP_W;
    });
    if (!ok) warns.push(`出口(${e.x},${e.y},${e.w},${e.h}) 不在任何路径台的跳跃带内（带=台顶上方${JUMP_H}、水平≤${JUMP_W}）`);
  }

  return warns;
}

// —— --selftest：用合成坏房间证明 A/B/C 三类断言都会真报（防"摆设门"）——
if (process.argv.includes('--selftest')) {
  const P = (x, y, w, h, kind, iso) => ({ x, y, w, h, iso: !!iso, range: 0, kind: kind || 'PLAIN' });
  const cases = [
    { name: '自检·好房间', room: { name: 'good', phase: 'FIRE', spawn: { x: 10, y: 470 }, exit: { x: 300, y: 400, w: 80, h: 80 }, plats: [P(0, 500, 160, 40), P(240, 500, 160, 40)] }, expect: [] },
    { name: '自检·横缝过大(A)', room: { name: 'gap', phase: 'FIRE', spawn: { x: 10, y: 470 }, exit: { x: 500, y: 440, w: 80, h: 80 }, plats: [P(0, 500, 160, 40), P(560, 500, 160, 40)] }, expect: ['横缝'] },
    { name: '自检·出生悬空(B)', room: { name: 'air', phase: 'FIRE', spawn: { x: 10, y: 300 }, exit: { x: 300, y: 440, w: 80, h: 80 }, plats: [P(0, 500, 160, 40)] }, expect: ['出生点'] },
    { name: '自检·出生台相位虚化(B)', room: { name: 'phantom', phase: 'ICE', spawn: { x: 10, y: 470 }, exit: { x: 300, y: 440, w: 80, h: 80 }, plats: [P(0, 500, 160, 40, 'ICE'), P(240, 500, 160, 40)] }, expect: ['出生点'] },
    { name: '自检·出口够不着(C)', room: { name: 'exit', phase: 'FIRE', spawn: { x: 10, y: 470 }, exit: { x: 900, y: 40, w: 80, h: 80 }, plats: [P(0, 500, 160, 40), P(240, 500, 160, 40)] }, expect: ['跳跃带'] },
  ];
  let failed = 0;
  for (const c of cases) {
    const warns = checkRoom(c.room);
    let ok;
    if (c.expect.length === 0) ok = warns.length === 0;
    else ok = c.expect.every((e) => warns.some((w) => w.includes(e)));
    if (!ok) { failed++; console.log(`❌ ${c.name} 期望[${c.expect.join('/') || '无警告'}] 实际: ${warns.join(' | ') || '无'}`); }
    else console.log(`OK   ${c.name}`);
  }
  if (failed) { console.log(`selftest: ${cases.length - failed}/${cases.length} 过`); process.exit(1); }
  console.log(`selftest: ${cases.length}/${cases.length} 过（A/B/C 三类断言均被证明会报）`);
  process.exit(0);
}

let pass = 0;
let totalWarn = 0;
for (const room of rooms) {
  const warns = checkRoom(room);
  if (warns.length === 0) {
    pass++;
    console.log(`OK   ${room.name}（平台 ${room.plats.length}）`);
  } else {
    totalWarn += warns.length;
    console.log(`WARN ${room.name}（平台 ${room.plats.length}）`);
    for (const w of warns) console.log(`     - ${w}`);
  }
}

const total = rooms.length;
if (totalWarn === 0) {
  console.log(`全关卡审计汇总(离线): ${total}/${total} 全部通过（逐段可达 + 出生点 + 出口可达）`);
  process.exit(0);
}
console.log(`全关卡审计汇总(离线): ${pass}/${total} 通过（${totalWarn} 处警告）`);
process.exit(1);
