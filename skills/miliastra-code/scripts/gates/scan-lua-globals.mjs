#!/usr/bin/env node
// ── 技能自带快照（miliastra-code/scripts/gates/）────────────────
// 源：Desktop\yuanshen\tools\scan-lua-globals.mjs（**工程工作区是唯一真身**，本文件只是快照）
// 差异：仅本溯源头 + import 路径改写（`../packages/dsh-miliastra/lib/lualint.mjs` → `./lualint.mjs`）；**判据未改一字**
// 刷新：`node scripts/gates/… ` 见同目录 README.md「刷新方法」
// ────────────────────────────────────────────────────────────
/**
 * scan-lua-globals.mjs —— 只读扫描：**找出「运行期给全局变量赋值」的地方**。
 *
 * 为什么要它（2026-09-30 真机实测换来的）：
 *   插件新增的帧率探针用「把全局 `onFrame` 置 nil」来停采样 —— **真机上不生效**，
 *   探针一路报到这一局结束（刷出 **13 983 行 / 2.8 MB** 日志）；而**同一份脚本在模拟器里是好的**
 *   ⇒ 两个运行时的全局语义不一致（假设：真机每帧重建脚本环境，写全局会被丢掉）。
 *   ⇒ 稳妥写法是 **local（upvalue）**；凡是"把全局当标志位 / 缓存 / 累加器"的地方都值得人过一眼。
 *
 * 判据（**启发式，只报候选、不下结论**）：
 *   · 顶层的 `local X` 声明、函数参数、`for` 变量 ⇒ 安全，不报；
 *   · 缩进的 `X = …`（语句级）且 X 在本文件任何地方都没有 local/参数声明 ⇒ **候选**；
 *   · 表构造器内部的 `X = …`（花括号深度 > 0）、行尾带 `,` 的 ⇒ 是**表字段**，不报；
 *   · 表格字段 / 索引赋值（`a.b = …` / `a[k] = …`）⇒ 不报。
 *
 * ⚠️ **已知漏报**（宁愿漏报也不误报）：写在行首（不缩进）的语句级赋值、以及
 *    「`if c then X = 1 end` 这种一行里夹着的赋值」都抓不到 —— 它是个**提示器**，不是证明。
 *
 * 用法：
 *   node tools/scan-lua-globals.mjs --map 夏日祭法师            # 扫该图的 2.代码/（★ 加新地图不用改代码）
 *   node tools/scan-lua-globals.mjs code\夏日祭法师（旧写法）    # 扫一个目录（递归找 .lua）
 *   node tools/scan-lua-globals.mjs "…\external_lua_file"   # 也可以直接扫沙箱活文件目录
 * 退出码：发现候选 ⇒ 1（方便挂进门禁）；0 ⇒ 干净；参数错 ⇒ 2。
 * ★ 路径不写死：不传目录时按 `--map`（默认 侦探1）从 `案子/<地图>/2.代码/` 解析。
 */

import fs from 'node:fs';
import path from 'node:path';
import { parseMap, paths } from './_paths.mjs';

let ctx;
try { ctx = parseMap(process.argv.slice(2)); } catch (e) { console.error('❌ ' + e.message); process.exit(2); }
const target = ctx.args.filter((a) => !a.startsWith('-'))[0] || paths(ctx.map, ctx.root).code;
if (!target || !fs.existsSync(target)) {
  console.error('用法：node tools/scan-lua-globals.mjs [<目录>] [--map 侦探1]');
  process.exit(2);
}
console.log(`地图「${ctx.map}」｜扫 ${target}`);

/** 收集目录下所有 .lua（递归；跳过备份 / 隐藏 / `_` 开头的产物）。 */
function collect(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (/^[_.[]/.test(e.name)) continue;
      out.push(...collect(p));
      continue;
    }
    if (!e.name.endsWith('.lua')) continue;
    if (/^_|备份|\.bak$/.test(e.name)) continue;
    out.push(p);
  }
  return out;
}

const files = collect(target).sort();
if (!files.length) {
  console.log('没找到 .lua（目录：' + target + '）');
  process.exit(0);
}

let total = 0;
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);

  // ① 本文件里"算作局部"的名字：local 声明 / 函数参数 / for 变量（粗粒度，宁可漏报）
  const locals = new Set();
  for (const m of text.matchAll(/\blocal\s+([^=\n]+?)(?:=|$)/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().replace(/^function\s+/, '').match(/^([A-Za-z_]\w*)/);
      if (name) locals.add(name[1]);
    }
  }
  for (const m of text.matchAll(/function\s*[A-Za-z_.:]*\s*\(([^)]*)\)/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().match(/^([A-Za-z_]\w*)/);
      if (name) locals.add(name[1]);
    }
  }
  for (const m of text.matchAll(/\bfor\s+([A-Za-z_][\w\s,]*)\s+in\b/g)) {
    for (const part of m[1].split(',')) locals.add(part.trim());
  }

  // ② 逐行找"语句级给非局部名字赋值"
  const hits = [];
  let brace = 0;
  lines.forEach((raw, i) => {
    const line = raw.replace(/--.*$/, '');
    const depthAtStart = brace;
    brace += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
    if (depthAtStart > 0) return;                    // 表构造器内部 = 字段
    if (line.trim().endsWith(',')) return;           // 表字段一般以逗号结尾
    const m = /^\s+([A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)*)\s*=\s*[^=]/.exec(line);
    if (!m) return;
    for (const name of m[1].split(',').map((s) => s.trim())) {
      if (locals.has(name)) continue;
      hits.push({ line: i + 1, name, text: raw.trim().slice(0, 96) });
    }
  });

  if (hits.length) {
    console.log('=== ' + path.relative(target, file) + '  （候选 ' + hits.length + ' 处）');
    for (const h of hits.slice(0, 30)) console.log('  ' + h.line + ': ' + h.name + ' = …   | ' + h.text);
    if (hits.length > 30) console.log('  … 还有 ' + (hits.length - 30) + ' 处');
    total += hits.length;
  }
}
console.log('\n合计候选：' + total + ' 处（启发式：只报"缩进里给非 local 名字赋值"；表字段不算；已知会漏报行首/单行 if 内的赋值）');
console.log(total ? '⚠️ 这些地方**未必是 bug** —— 请人过一眼：是不是"标志位 / 缓存 / 累加器"（那类在真机上会静默失效）。'
  : '✅ 没找到候选。');
process.exit(total ? 1 : 0);
