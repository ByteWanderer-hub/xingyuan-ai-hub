#!/usr/bin/env node
// ── 技能自带快照（miliastra-code/scripts/gates/）────────────────
// 源：Desktop\yuanshen\tools\build-mage-battle.mjs（**工程工作区是唯一真身**，本文件只是快照）
// 差异：仅本溯源头 + import 路径改写（`../packages/dsh-miliastra/lib/lualint.mjs` → `./lualint.mjs`）；**判据未改一字**
// 刷新：`node scripts/gates/… ` 见同目录 README.md「刷新方法」
// ────────────────────────────────────────────────────────────
// 把「主脚本模板 + 4 份像素画块数据」拼成**可部署的单文件 Lua**。
//
// 为什么是构建产物（而不是 5 个脚本）：
//   · 像素画生成物把块**平铺**在容器里（没有打包成一个可移动的父容器）
//     ⇒ 主脚本要按站位偏移 763 个块、阵亡时要整体隐藏，**必须由同一个脚本持有这些控件句柄**；
//   · 脚本之间在千星里没有直接通道（只有黑板文本框那种间接法），拆开反而更脆。
//   ⇒ 走本仓既有惯例：`2.代码/` 里的片段 → 构建 → 同目录的产物（与《侦探杀》main.lua 同一条路子）。
//
// 用法：
//   node tools/build-mage-battle.mjs                                  # 交接值留 0（会 error 点名）
//   node tools/build-mage-battle.mjs --image=1073742580 --text=1073742587 --container=1073742581
//   node tools/build-mage-battle.mjs --cols=14

import fs from 'node:fs';
import path from 'node:path';
import { parseMap, paths } from './_paths.mjs';

let ctx;
try { ctx = parseMap(process.argv.slice(2), { fallback: '夏日祭法师' }); } catch (e) { console.error('❌ ' + e.message); process.exit(2); }
const { map, root } = ctx;
if (map !== '夏日祭法师') {
  console.error(`❌ build-mage-battle.mjs 是《夏日祭法师》专属构建器，不支持 --map ${map}。`);
  console.error('   （模板 @@SLOTS@@ 标记、像素画站位、13 预设对账、按元素拆脚本都是夏日祭专有的。）');
  process.exit(2);
}
const P = paths(map, root);
// ★ 2026-10-04 迁移后：**构建源与成品同在** `案子/夏日祭法师/2.代码/`（原先源在 sources/、成品在 code/）
const SRC = P.code;
const TEMPLATE = path.join(SRC, '主脚本.lua');

function arg(name, dflt) {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : dflt;
}

const IMAGE_TPL = Number(arg('image', process.env.TEMPLATE_IMAGE || 0));
const TEXT_TPL = Number(arg('text', process.env.TEMPLATE_TEXT || 0));
const CONTAINER = Number(arg('container', process.env.CONTAINER || 0));
// ★ 拆成两个客户端脚本后各有自己的容器（层级靠**容器**隔离，不靠创建顺序）
//   底容器 = 主控（战斗 + 像素画 + 血条 + 名牌，每帧变的量都在这）
//   上容器 = 特效（粒子 13 预设 + 流光标题 + 播报，自持状态、自己 OnUpdate）
const CONTAINER_FX = Number(arg('containerFx', process.env.CONTAINER_FX || 1073741852));
const COLS = Number(arg('cols', process.env.COLS || 12));
const PIXEL_SIZE = Number(arg('pixel', process.env.PIXEL_SIZE || 22));

// 名单 = `tools/make-avatars.mjs` 落盘的 roster.json（技能表 ∩ 已下到的头像）。
//   ★ 顺序不重要：主脚本开局是**随机抽 4 个**（各自为战 · 无限循环）；
//     但名单必须与 px-<cols>/ 里的产物**一一对应**，对不上就在 buildAvatarsLua 里报错。
const ROSTER = JSON.parse(fs.readFileSync(path.join(SRC, 'roster.json'), 'utf8'));
// 产物文件名做过转义（`旅行者/冰` → `旅行者_冰`），必须与 tools/make-avatars.mjs 的 SLUG **逐字一致**，
// 否则就会出现「build 说缺产物、而 filesystem 里明明有」这种自相矛盾的报错。
const SLUG = (s) => s.replace(/[\\/:*?"<>|]/g, '_');

/** 从像素画产物里抠出 `local BLOCKS = { … }` 的表体（块数据本身）。 */
function extractBlocks(file) {
  const text = fs.readFileSync(file, 'utf8');
  const m = text.match(/local BLOCKS = \{\n([\s\S]*?)\n\}/);
  if (!m) {
    throw new Error(`从 ${file} 里抠不到 BLOCKS 表（产物格式变了？）`);
  }
  const body = m[1];
  const rows = body.split('\n').filter((l) => l.trim().length > 0);
  for (const l of rows) {
    if (!/^\s*\{\d+,\d+,\d+,\d+,\d+,\d+,\d+,\d+\},\s*$/.test(l)) {
      throw new Error(`${file} 里有一行不是 8 元组，拒绝拼装：${l}`);
    }
  }
  return { rows, count: rows.length };
}

function buildAvatarsLua(list) {
  const out = [];
  // 旅行者的显示名**统一成 `旅行者/<元素>`**：火表里写成 `旅行者（火）`（全角括号、6 个字），
  // 与别处的 `旅行者/冰`（5 个字）格式不一致 —— 名牌框按最长名字定宽，这种不一致会让宽度白涨一档。
  // 只改**显示**，不动名单与像素画文件名。
  const dispName = (n) => n.replace(/^旅行者[（(](.)[）)]$/, '旅行者/$1');
  out.push('-- ★ 以下块数据由 tools/build-mage-battle.mjs 从 px-<cols>/<角色>.lua 注入 —— 勿手改');
  out.push('--   每个块 = {格x, 格y, 格宽, 格高, r, g, b, a}（a=0 的格子生成器已经剔除，不建控件）');
  out.push('local AVATARS = {');
  let total = 0;
  let max = 0;
  for (const r of list) {
    const f = path.join(SRC, `px-${COLS}`, `${SLUG(r.name)}.lua`);
    if (!fs.existsSync(f)) {
      throw new Error(`缺像素画产物：${f}（先跑 node tools/make-avatars.mjs）`);
    }
    const { rows, count } = extractBlocks(f);
    total += count;
    if (count > max) {
      max = count;
    }
    out.push(`    {`);
    out.push(`        name = "${dispName(r.name)}",`);
    out.push(`        elem = "${r.elem}",`);
    out.push(`        blocks = {`);
    // 按**宽度**打包（一行 ≤110 字符）：风格门禁 §3 有 120 字符上限，而一行固定塞 4 个会到 122
    let line = '        ';
    for (const row of rows) {
      const add = row.trim() + ' ';
      if (line.length + add.length > 110 && line.trim() !== '') {
        out.push(line.trimEnd());
        line = '        ';
      }
      line += add;
    }
    if (line.trim() !== '') {
      out.push(line.trimEnd());
    }
    out.push(`        },`);
    out.push(`    },`);
  }
  out.push('}');
  out.push(`-- 本元素块数合计 = ${total}；**单人池上界 = ${max}**（池是按角色自己的块数建的，用不到合计）`);
  return { lua: out.join('\n'), total, max };
}

function buildHandoverLua(container, what) {
  return [
    `-- ★ 交接值：由 tools/build-mage-battle.mjs 注入（--image/--text/--container）`,
    `--   本份 = ${what}`,
    'local CONFIG = {',
    `    TEMPLATE_IMAGE = ${IMAGE_TPL},`,
    `    TEMPLATE_TEXT = ${TEXT_TPL},`,
    `    CONTAINER_INDEX = ${container},`,
    `    COLS = ${COLS},`,
    `    ROWS = ${COLS},`,
    `    PIXEL_SIZE = ${PIXEL_SIZE},`,
    '}',
  ].join('\n');
}

// ── 三份源码：各自只该有自己需要的注入位 ─────────────────────
//   「每帧变的量归持有者」是拆分（单脚本→双脚本→按元素）的核心约束
//   ⇒ 标记出现的位置就是这条约束的**机械判据**。
const REQ = [
  {
    file: path.join(SRC, '主控.lua'),
    name: '主控.lua',
    markers: ['-- @@HANDOVER@@', '-- @@ELEM_ROSTER@@', '-- @@ELEM_BASE@@'],
    // 主控**不许**再装任何角色像素数据（那是元素脚本的活）
    forbid: ['-- @@AVATARS@@', '-- @@ELEM_AVATARS@@', '-- @@SKILLS@@', '-- @@CHAR_SKILL@@'],
  },
  {
    file: path.join(SRC, '元素.lua'),
    name: '元素.lua',
    markers: ['-- @@HANDOVER@@', '-- @@ELEM_AVATARS@@'],
    forbid: ['-- @@AVATARS@@', '-- @@ELEM_ROSTER@@', '-- @@SKILLS@@'],
  },
  {
    file: path.join(SRC, '特效.lua'),
    name: '特效.lua',
    markers: ['-- @@HANDOVER@@', '-- @@SKILLS@@', '-- @@CHAR_SKILL@@', '-- @@TITLE@@'],
    forbid: ['-- @@AVATARS@@', '-- @@ELEM_AVATARS@@', '-- @@ELEM_ROSTER@@'],
  },
];
for (const r of REQ) {
  if (!fs.existsSync(r.file)) {
    throw new Error(`缺源码片段：${r.file}`);
  }
  const text = fs.readFileSync(r.file, 'utf8');
  if (text.includes('\ufeff')) {
    throw new Error(`${r.name} 带 UTF-8 BOM —— 原神会报 Lua 错，先清掉再构建`);
  }
  for (const m of r.markers) {
    if (!text.includes(m)) {
      throw new Error(`${r.name} 缺标记 ${m}`);
    }
  }
  for (const m of r.forbid) {
    if (text.includes(m)) {
      throw new Error(`${r.name} 不该有标记 ${m}（切错了：像素数据只能在元素脚本、粒子只能在特效）`);
    }
  }
}

// 流光标题帧（由 tools/make-title.mjs 从 `miliastra_gen op=text-gradient` 生成物里取出）
const titleFile = path.join(SRC, '标题数据.lua');
if (!fs.existsSync(titleFile)) {
  throw new Error(`缺标题帧：${titleFile}（先跑 node tools/make-title.mjs）`);
}
const title = fs.readFileSync(titleFile, 'utf8').replace(/\r\n/g, '\n').trimEnd();
if (!title.includes('local TITLE_FRAMES = {') || !title.includes('local TITLE_FPS = ')) {
  throw new Error('标题数据.lua 里没有 TITLE_FRAMES / TITLE_FPS —— 格式不对，拒绝拼装');
}

// 技能粒子规格（由 tools/make-skills.mjs 从 `miliastra_gen op=vfx-lua` 生成物里取出）
const skillFile = path.join(SRC, '技能数据.lua');
if (!fs.existsSync(skillFile)) {
  throw new Error(`缺技能规格：${skillFile}（先跑 node tools/make-skills.mjs）`);
}
const skills = fs.readFileSync(skillFile, 'utf8').replace(/\r\n/g, '\n').trimEnd();
if (!skills.includes('local SPELL_DATA = {') || !skills.includes('local SPELL_TINT = {')) {
  throw new Error('技能数据.lua 里没有 SPELL_DATA / SPELL_TINT —— 格式不对，拒绝拼装');
}

// ★ **库 2**（副技能的外观）：同一套 13 预设、不同参数、不同变量名前缀（`SPELL2_*`）。
//   由 `miliastra_gen op=vfx-lua` 的 `varPrefix` 生成 ⇒ 两套层规格能共存于同一脚本。
const skillFile2 = path.join(SRC, '技能数据2.lua');
if (!fs.existsSync(skillFile2)) {
  throw new Error(`缺副技能层规格：${skillFile2}（先跑 node tools/make-skills.mjs --out=技能数据2.lua --prefix=SPELL2）`);
}
const skills2 = fs.readFileSync(skillFile2, 'utf8').replace(/\r\n/g, '\n').trimEnd();
if (!skills2.includes('local SPELL2_DATA = {') || !skills2.includes('local SPELL2_TINT = {')) {
  throw new Error('技能数据2.lua 里没有 SPELL2_DATA / SPELL2_TINT —— varPrefix 没生效，拒绝拼装');
}
if (/local SPELL_/.test(skills2)) {
  throw new Error('技能数据2.lua 里出现了 `local SPELL_` —— 两套规格变量名会撞，拒绝拼装');
}

// ★ 机械门禁：**13 个预设必须全用上**（创作者 2026-09-29 的要求）。
//   make-skills 在每张层表的收尾行写了 `-- <预设 id>`，这里按它逐条对账 —— 少一个就拒绝落盘。
const PRESET13 = ['star-rain', 'snow-fall', 'petal-fall', 'ember-rise', 'star-scatter',
  'confetti-pop', 'coin-collect', 'chest-collect', 'peacock-in', 'peacock-out',
  'firefly-drift', 'bubble-up', 'hit-spark'];
for (const [tag, text] of [['库1', skills], ['库2', skills2]]) {
  const used = new Set([...text.matchAll(/\},\s+--\s+([a-z][a-z-]*)$/gm)].map((m) => m[1]));
  const missing = PRESET13.filter((p) => !used.has(p));
  const stray = [...used].filter((p) => !PRESET13.includes(p));
  if (missing.length > 0 || stray.length > 0) {
    throw new Error(`${tag} 13 个预设对账失败：缺 [${missing.join(', ')}]`
      + `，多出没登记的 [${stray.join(', ')}]（实际用到 ${used.size} 个）`);
  }
  console.log(`  ${tag} 13 个预设对账 ✓（实际用到 ${used.size} 个）`);
}

const destDir = P.code;
fs.mkdirSync(destDir, { recursive: true });

function emit(name, src, injections) {
  let out = src;
  for (const [marker, value] of Object.entries(injections)) {
    const n = out.split(marker).length - 1;
    if (n !== 1) {
      throw new Error(`${name} 的标记 ${marker} 应出现 1 次、实际 ${n} 次`);
    }
    out = out.replace(marker, () => value);
  }
  out = out.replace(/\r\n/g, '\n');
  // ★ **括号配平自检**（2026-09-30 加）：两道门禁（作用域 / 风格）只做**词法**扫描，
  //   `miliastra_code op=deploy` 的 lint 也不是语法分析 ⇒ 少一个逗号/花括号它们**都不报**，
  //   只有模拟器的 Lua 5.3 会报（本轮连栽两次：`'}' expected near 'petal'`、
  //   `'}' expected (to close '{' at line 1333) near '{'`）。
  //   这里做一道**剥掉字符串与注释之后**的配平检查 —— 抓不到所有语法错，但抓得到这一类。
  const stripped = out
    .replace(/--\[\[[\s\S]*?\]\]/g, ' ')
    .replace(/--[^\n]*/g, ' ')
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''");
  const bad = [];
  for (const [open, close, name] of [['{', '}', '花括号'], ['(', ')', '圆括号'], ['[', ']', '方括号']]) {
    const a = (stripped.match(new RegExp(`\\${open}`, 'g')) ?? []).length;
    const b = (stripped.match(new RegExp(`\\${close}`, 'g')) ?? []).length;
    if (a !== b) {
      bad.push(`${name} ${a} 开 / ${b} 闭`);
    }
  }
  if (bad.length > 0) {
    throw new Error(`${name} 括号不配平（${bad.join('，')}）—— 拒绝落盘`);
  }
  const dest = path.join(destDir, name);
  fs.writeFileSync(dest, out, { encoding: 'utf8' });
  const buf = fs.readFileSync(dest);
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    throw new Error(`${name} 带 UTF-8 BOM`);
  }
  console.log(`  ${name.padEnd(18)} ${String(buf.length).padStart(7)} 字节 / ${String(out.split('\n').length).padStart(4)} 行`);
}

const mainSrc = fs.readFileSync(path.join(SRC, '主控.lua'), 'utf8').replace(/\r\n/g, '\n');
const fxSrc = fs.readFileSync(path.join(SRC, '特效.lua'), 'utf8').replace(/\r\n/g, '\n');
const elemSrc = fs.readFileSync(path.join(SRC, '元素.lua'), 'utf8').replace(/\r\n/g, '\n');

// 元素分组（由 tools/split-by-element.mjs 落盘 —— 分组只在那一处发生，这里只读）
const elemIndex = JSON.parse(fs.readFileSync(path.join(SRC, 'elem-index.json'), 'utf8'));

// ELEM_ROSTER：**必须与主控里的 `ELEM_NAMES` / `ELEM_SCRIPTS` 同序**
//   （1=火 2=水 3=雷 4=草 5=风 6=冰 7=岩）。顺序错了的表现是"火系角色被水脚本画出来"，
//   从画面极难反推 ⇒ 这里是**唯一**一处定义顺序，别在别处再写一遍。
const ELEM_ORDER = ['pyro', 'hydro', 'electro', 'dendro', 'anemo', 'cryo', 'geo'];
const byElem = new Map(elemIndex.map((e) => [e.elem, e]));
const counts = ELEM_ORDER.map((e) => {
  const g = byElem.get(e);
  if (g === undefined) {
    throw new Error(`elem-index.json 里没有元素 ${e}（先跑 node tools/split-by-element.mjs）`);
  }
  return g.count;
});
const rosterLua = [
  '-- 各元素的角色数（主控只需要"有多少人"就能随机抽；**名字留在各元素脚本自己里** —— 表不跨界）',
  `local ELEM_ROSTER = { ${counts.join(', ')} }`,
  `-- 同序表：${ELEM_ORDER.join(' / ')}（与上面的 ELEM_NAMES / ELEM_SCRIPTS 必须同序）`,
].join('\n');

// ── 本命技能：把 `docs/技能/*.md` 解析出的 75 条按 **roster 顺序**排成 74 条 ──────
//   特效脚本按「全局角色序号」查，所以这里必须是 roster 的顺序（不是表的顺序）。
const charSkills = JSON.parse(fs.readFileSync(path.join(SRC, 'char-skills.json'), 'utf8'));
const roster = JSON.parse(fs.readFileSync(path.join(SRC, 'roster.json'), 'utf8'));

// ★ 断言：同一元素的人必须是 roster 里**连续的一段**。
//   `skillId = ELEM_BASE[元素] + 元素内下标 − 1` 只有在这一条成立时才对；
//   不成立的表现是"所有人的本命技能错位"，而画面完全看不出原因 ⇒ 这里直接拒绝构建。
{
  const seen = new Set();
  let prev = null;
  for (const r of roster) {
    if (r.elem !== prev) {
      if (seen.has(r.elem)) {
        throw new Error(`roster.json 里元素 ${r.elem} 被拆成不连续的多段 —— skillId 会错位，拒绝构建`);
      }
      seen.add(r.elem);
      prev = r.elem;
    }
  }
}
const ELEM_BASE = {};
for (let i = 0; i < roster.length; i += 1) {
  if (ELEM_BASE[roster[i].elem] === undefined) {
    ELEM_BASE[roster[i].elem] = i;
  }
}
const baseLua = [
  '-- 每个元素的角色在**全局名单**里的起始序号（0 基）—— 由构建脚本注入',
  'local ELEM_BASE = {',
  ...ELEM_ORDER.map((e, i) => `    [${i + 1}] = ${ELEM_BASE[e]},   -- ${e}`),
  '}',
].join('\n');

const byName = new Map(charSkills.map((s) => [s.name, s]));
const choreo = JSON.parse(fs.readFileSync(path.join(SRC, 'choreo.json'), 'utf8'));
const choreoByName = new Map(choreo.map((c) => [c.name, c]));
if (choreo.length !== roster.length) {
  throw new Error(`编排 ${choreo.length} 人 ≠ 角色池 ${roster.length} 人（先跑 node tools/make-choreography.mjs）`);
}
let skillMissing = 0;

// 一份技能（主 / 副 / 第三）写成 Lua —— **位置参数单行**（生成数据，紧凑；运行时按位解码）。
//   字段序：1 preset / 2 pattern / 3 img / 4 shots / 5 spread / 6 r1 / 7 r2 / 8 lift
//          9 slow / 10 spin / 11 stagger / 12 flags / 13 size / 14 per（每发颗数）/ 15 path
//   flags 位：1=tang 2=rand 4=useLayer 8=custom:"boom" 16=custom:"weave" 32=curve（两段贝塞尔）
//   ⚠️ 为什么不用具名表：74×3 个技能 × 10 行 = 2200+ 行，直接把文件顶破 2000 行的风格上限。
function skillEntry(sk, tag) {
  let flags = 0;
  if (sk.tang === true) { flags += 1; }
  if (sk.rand === true) { flags += 2; }
  if (sk.useLayer === true) { flags += 4; }
  if (sk.custom === 'boom') { flags += 8; }
  if (sk.custom === 'weave') { flags += 16; }
  if (sk.curve === true) { flags += 32; }
  if (sk.custom !== null && sk.custom !== undefined
      && sk.custom !== 'boom' && sk.custom !== 'weave') {
    throw new Error(`没登记的专用弹道：${sk.custom}`);
  }
  const nums = [sk.preset, `"${sk.pattern}"`, sk.img, sk.shots, sk.spread,
    sk.r1, sk.r2, sk.lift, sk.slow, sk.spin, sk.stagger, flags, sk.size ?? 1, sk.per ?? 2];
  // ⚠️ 自定义钢笔必须是**这个技能自己的第 15 个元素**（写在同一个花括号里）。
  //   写成 `{ … }, { 路径 },` 会变成**两个平级元素** ⇒ 解码时 `row[2]` 拿到的是路径表，
  //   日志会打出 `预设=-420 形态=-260 发数=320`（模拟器实测抓到的，两道门禁都不报）。
  if (sk.path !== null && sk.path !== undefined) {
    const p = ['start', 'p1', 'p2', 'target'].map((k) => `${sk.path[k].x}, ${sk.path[k].y}`);
    nums.push(`{ ${p.join(', ')} }`);
  }
  return [`        { ${nums.join(', ')} },   -- ${tag}`];
}

const skillLines = ['-- 每人**三个**技能：[1]=主（库1） [2]=副（库2） [3]=直线散射（库1 错位）。',
  '-- 位置参数，字段序见 SKILL_FIELDS（1 preset / 2 pattern / 3 img / 4 shots / 5 spread …）。',
  'local CHAR_SKILL = {'];
for (const r of roster) {
  const c = choreoByName.get(r.name);
  const s = byName.get(r.name);
  if (c === undefined) {
    skillMissing += 1;
    skillLines.push(`    false,   -- ${r.name}：编排里没有 ⇒ 运行时退回默认预设`);
    continue;
  }
  skillLines.push(`    {   -- ${r.name} · ${r.elem} · ${s !== undefined ? s.skillName : '?'}`);
  skillLines.push(...skillEntry(c.main, `主 ${c.main.pattern}`));
  skillLines.push(...skillEntry(c.sub, `副 ${c.sub.pattern}`));
  skillLines.push(...skillEntry(c.third, `三 ${c.third.pattern} 慢${c.third.slow} 张角${c.third.spread}`));
  skillLines.push('    },');
}
skillLines.push('}');
const skillLua = skillLines.join('\n');

console.log(`构建 → ${destDir}`);
console.log(`  cols=${COLS} pixelSize=${PIXEL_SIZE} 角色池=${elemIndex.reduce((a, e) => a + e.count, 0)} 人 / ${elemIndex.length} 个元素`);
console.log(`  交接值 image=${IMAGE_TPL} text=${TEXT_TPL} 容器=${CONTAINER}（**9 个脚本全挂它**）`);

// ★★ **74 格摆位**（2026-09-30 创作者定：全员同屏 + 砍掉名字/血条）
//   10 列 × 8 行网格，格子 160×90 —— 只留头像（cols=6 ⇒ 24px）所以放得下、不会叠。
//   ⚠️ 为什么非要网格：74 个**名字框**要 7.4 个屏宽（160px × 74 = 11840px），
//      所以这一版砍了名字与血条（见 元素.lua 的 CFG.SHOW_UI）。
const SLOT_COLS = 10;
const slotsLua = (() => {
  const out = ['local SLOTS = {'];
  for (let i = 0; i < roster.length; i += 1) {
    const c = i % SLOT_COLS;
    const r = Math.floor(i / SLOT_COLS);
    out.push(`    { x = ${-720 + c * 160}, y = ${300 - r * 90} },`);
  }
  out.push('}');
  return out.join('\n');
})();

// ★★ **一个槽位 = 一个固定角色**（顺序 = roster 全局序 ⇒ 与 ELEM_BASE 同一套遍历，
//    保证 SLOT_CHAR[i] 的元素码 + 元素内下标算出的全局序号**与特效的技能码一致**）
const slotCharLua = (() => {
  const out = ['local SLOT_CHAR = {'];
  let gi = 0;
  for (const g of elemIndex) {
    const list = JSON.parse(fs.readFileSync(path.join(SRC, g.roster), 'utf8'));
    const code = ELEM_ORDER.indexOf(g.elem) + 1;
    for (let k = 0; k < list.length; k += 1) {
      out.push(`    { ${code}, ${k + 1} },   -- ${gi} ${list[k].name}（${g.elem}）`);
      gi += 1;
    }
  }
  out.push('}');
  if (gi !== roster.length) {
    throw new Error(`SLOT_CHAR 条数 ${gi} ≠ 角色池 ${roster.length}`);
  }
  return out.join('\n');
})();

emit('夏日祭主控.lua', mainSrc, {
  '-- @@HANDOVER@@': buildHandoverLua(CONTAINER, '主控（战斗裁决，不画角色）'),
  '-- @@ELEM_ROSTER@@': rosterLua,
  '-- @@ELEM_BASE@@': baseLua,
  '-- @@SLOT_CHAR@@': slotCharLua,
  '-- @@SLOTS@@': slotsLua,
});
console.log(`  摆位：${roster.length} 格（${SLOT_COLS} 列网格，格子 160×90）`
  + `｜槽位角色：${roster.length} 条（一槽一固定角色）`);

let allBlocks = 0;
let maxBlocks = 0;
for (const g of elemIndex) {
  const list = JSON.parse(fs.readFileSync(path.join(SRC, g.roster), 'utf8'));
  const av = buildAvatarsLua(list);
  allBlocks += av.total;
  if (av.max > maxBlocks) {
    maxBlocks = av.max;
  }
  console.log(`    ${g.script.padEnd(6)} ${g.elem.padEnd(8)} ${String(list.length).padStart(2)} 人 / ${String(av.total).padStart(4)} 块`);
  emit(`${g.script}.lua`, elemSrc, {
    '-- @@HANDOVER@@': buildHandoverLua(CONTAINER, `${g.script}（${g.elem} 元素）`),
    '-- @@ELEM_AVATARS@@': av.lua,
    // ★ **与主控的 SPAWN_COUNT 同一个数**（注入而不是各写一份 ⇒ 改一处两边同步）
    '-- @@SLOT_MAX@@': `local SLOT_MAX = ${roster.length}`
      + '   -- = 主控的 SPAWN_COUNT（由构建脚本注入；**别再手写**）',
  });
}

emit('夏祭特效.lua', fxSrc, {
  '-- @@HANDOVER@@': buildHandoverLua(CONTAINER, '特效（粒子 / 流光标题 / 播报）'),
  '-- @@SKILLS@@': `${skills}\n\n${skills2}`,
  '-- @@CHAR_SKILL@@': skillLua,
  '-- @@TITLE@@': title,
});
console.log(`  本命技能：${roster.length - skillMissing}/${roster.length} 人有（缺 ${skillMissing} 人 ⇒ 退回默认预设）`);
// 每个元素脚本**恒定只持有 1 个池**（7 槽 = 7 元素各一个）⇒ 上界 = 7 个池并行。
//   （之前报的"合计 7814"是**所有 74 人块数之和**，那是"4 位全抽到同一元素"的旧口径 ——
//    现在 7 槽 7 元素不可能发生，那个数字只会误导人 ⇒ 换成真正的上界。）
const worstControls = 7 * maxBlocks + 192 + 20;
console.log(`  最坏控件数 = 7 池 × 单池上界 ${maxBlocks} + 粒子 192 + HUD ≈ ${worstControls}`);
console.log(`  （实测一局 7 人共 732 块 ⇒ 约 950 控件；上界只在"7 人恰好都是各自元素里块数最多的那个"时出现）`);
