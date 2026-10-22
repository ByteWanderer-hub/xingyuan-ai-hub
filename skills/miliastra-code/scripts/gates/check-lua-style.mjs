#!/usr/bin/env node
// ⚠️ 快照：本文件是 `tools\check-lua-style.mjs` 的副本（2026-10-02 19:23，源 SHA-256 前16位 D9091A0FF655DF7C）。
// 判据与源文件逐字一致，仅改了 lualint 的 import 路径；**口径以工作区版为准**，刷新见同目录 README.md。
// 技能版用法：给**显式文件/目录**（工作区版的 --map 依赖本机 案子/ 目录，技能里没有）。

/**
 * check-lua-style.mjs —— 千星客户端脚本的**代码风格检查**（部署前的第四道门）
 *
 * 为什么需要：风格规范写在 `~/.dsh/skills/miliastra-code/references/lua-style.md` 里，
 * 但**写在文档里的规范靠自觉 = 迟早漏**（2026-09-25 一天内同一个"漏 local"栽三次，就是因为只有文档没有门）。
 * 本工具把规范里**可机械判定**的那部分做成门禁：
 *   · error 级 → 退出码 1（**不许 deploy**）
 *   · warn  级 → 只提示（退出码仍是 0）
 * **不可机械判定的规则明确列在最后**（见 NON_MECHANICAL）——不假装能判。
 *
 * 规则（与 `references/lua-style.md` 的章节号对应）：
 *   error：BOM(§1.5) / CRLF(§3) / TAB(§3) / OnUpdate 无 pcall(§1.2) / 吞错 pcall(§9)
 *   warn ：缩进非 4 倍数(§3) / 行宽>120(§3) / 分号(§3) / 单引号字符串(§7) / assert(§1.3)
 *          / 裸 pcall(§9) / 单行 if 里非 return|break(§3) / local function 首字母大写(§2)
 *          / 代码位置混全角字符(§1.5) / 缺文件头版本块(§10) / 文件 >1000 行(§5)
 *
 * 用法：
 *   node tools/check-lua-style.mjs --baseline             # ★ 日常门禁：error 必过 + 不许比基线变差
 *   node tools/check-lua-style.mjs --baseline --map 双相   # 换一张图（★ 加新地图不用改代码）
 *   node tools/check-lua-style.mjs --fix                  # 预览"机械可修"的（BOM/CRLF/TAB/分号）——**不写盘**
 *   node tools/check-lua-style.mjs --fix --write          # 真修（**写前自动快照**一份到 _snapshots/）
 *   node tools/check-lua-style.mjs --update-baseline       # 清完存量（或新项目）后把基线往好的方向更新
 *   node tools/check-lua-style.mjs                        # 默认扫【侦探1】的活文件，逐条列出
 *   node tools/check-lua-style.mjs --summary               # 只给逐文件计数 + 规则直方图
 *   node tools/check-lua-style.mjs <a.lua> <b.lua> ...     # 扫指定文件
 *   node tools/check-lua-style.mjs --map 双相              # 扫该图的活文件
 *   node tools/check-lua-style.mjs --selftest              # 自检（含基线比对纯函数的 5 例）
 * ⚠️ 基线文件 `tools/lua-style-baseline.json` **是按地图分开的**（`byMap[<地图名>]`）：
 *   扫别的图时**必须**用那张图自己的基线 —— 拿别的图的基线来卡 = 所有文件都被当"新文件"，
 *   回执会说假话。这张图还没有基线时**明确报错退出(2)**，不静默放行也不静默报红。
 *   （历史：文件里顶层那份 `files` 是 2026-09-29 为《夏日祭法师》建的旧格式基线，`map` 字段标了归属。）
 * 退出码：基线模式 = error/回归/新文件 → 1、这张图没基线 → 2；逐条模式 = 有 error → 1；只有 warn → 0；没找到文件 → 2。
 * ★ 路径不写死：成品在 `案子/<地图>/2.代码/`，由 tools/_paths.mjs 按地图名解析（2026-10-04 迁移后）。
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, renameSync, unlinkSync } from 'node:fs';
import { join, basename, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripCommentsAndStrings } from './lualint.mjs';
import { snapshotFiles } from './snapshot-lua-project.mjs';
import { DEFAULT_MAP, parseMap, paths } from './_paths.mjs';

// ⚠️ 这里**不做** argv 解析：本文件会被 tools/lua-iron-check.mjs import（复用 analyze/compareBaseline），
//   模块顶层碰 argv 会在"被 import 时"误判别人的命令行。默认目录一律惰性求值。
const defaultPaths = () => paths(DEFAULT_MAP);

const MAX_LINE = 120;      // §3 行宽软上限（这里当硬门用）
const INDENT = 4;          // §3 缩进
const BIG_FILE_LINES = 2000;   // §5 单文件建议上限（2026-09-26 创作者定：1000 → 2000）

/** 不可机械判定、只能靠人/AI 读规范的规则（如实列出，别假装查了） */
const NON_MECHANICAL = [
  '命名语义：布尔该叫 isXxx/hasXxx、不许否定名（§2）',
  '函数形状：参数 ≤6、可选参数放最后、少用布尔模式参数（§5）',
  '控制流意图：早校验早返回、else 不跟 return 后（§8，部分形状见 ONE_LINE_IF）',
  '日志内容：是否 [标签] 前缀 + 关键值 k=v、单条是否 ≤10000 字符（§1.6/§1.7）',
  '常量表纪律：数值是否集中在文件顶部、有没有裸写（§1.12）',
  '文件头质量：版本块的"日期/依据/改动"是否真的写清（§10）',
  '黑板纪律：跨脚本字段是否单向写、有无"扫描清理兄弟控件"（§1.8）',
  '失败去向：fail() 聚合块 vs 降级不阻断，是否明说（§9/§1.11）',
  '**全局变量漏 local** → 由 `tools/check-lua-scope.mjs` 负责，本工具不重复判',
];

/** 把「去掉注释与字符串后的代码」按行摊开：**返回 0-based 数组**（out[行号-1]）。
 *  跨行注释/字符串吃掉的行不会有条目 = 该行无需判。调用方一律用 0-based 行下标。 */
export function maskLines(code, lineOf) {
  const out = [];
  let i = 0;
  while (i < code.length) {
    const ln = lineOf[i];
    let s = '';
    while (i < code.length && lineOf[i] === ln) { s += code[i]; i += 1; }
    out[ln - 1] = (out[ln - 1] || '') + s;
  }
  return out;
}

/** 单文件分析。@returns {{errors:Array,warnings:Array,stats:object}} */
export function analyze(src) {
  const text = String(src ?? '');
  const errors = [];
  const warnings = [];
  const push = (arr, line, kind, msg) => arr.push({ line, kind, msg });
  const rawLines = text.split('\n');

  // ---- error 级：文件层（每文件只报一次，带首次行号）----
  if (text[0] === '\uFEFF') push(errors, 1, 'BOM', '文件带 UTF-8 BOM（原神会打印 Read text file with BOM header may cause Lua error）');
  const crlfAt = rawLines.findIndex((l) => l.endsWith('\r'));
  if (crlfAt >= 0) push(errors, crlfAt + 1, 'CRLF', '出现 CRLF 行尾（规范要求 LF）');
  const tabAt = rawLines.findIndex((l) => l.includes('\t'));
  if (tabAt >= 0) push(errors, tabAt + 1, 'TAB', '出现制表符（规范：缩进 4 空格、禁 tab）');

  // ---- 掩码：注释/字符串占位，避免误报；trace 用来抓字符串字面量 ----
  const trace = [];
  const { code, lineOf, problems } = stripCommentsAndStrings(text, trace);
  const masked = maskLines(code, lineOf);
  for (const p of problems || []) push(errors, p.line, 'LUA_STRUCT', p.message || '结构问题（注释/字符串未闭合）');

  // ---- error 级：OnUpdate 必须包 pcall（启发式：顶层函数体到下一个顶层 end/function 为止）----
  const isTopDef = (l) => /^(local\s+)?function\b/.test(l) || /^[A-Za-z_][A-Za-z0-9_.:]*\s*=\s*function\b/.test(l);
  const onLine = rawLines.findIndex((l) => /^function\s+OnUpdate\s*\(/.test(l));
  if (onLine >= 0) {
    let body = '';
    for (let i = onLine + 1; i < masked.length; i += 1) {
      const m = masked[i] ?? '';
      if (m.trim() === '' ) continue;
      if (/^end\s*$/.test(m)) break;                  // 顶层 end = 函数结束
      if (/^local\s+function\b/.test(m) || isTopDef(m)) break;   // 下一段代码开始
      body += m + '\n';
    }
    if (!/pcall\s*\(/.test(body)) {
      push(errors, onLine + 1, 'ONUPDATE_NO_PCALL', 'OnUpdate 体内没有 pcall —— tick 抛错会静默冻结整块界面（规范 §1.2）');
    }
  }

  // ---- error 级：pcall 吞错（`local ok = pcall(...)` 之后 ok 再没出现过）----
  for (let i = 0; i < masked.length; i += 1) {
    const m = masked[i] ?? '';
    const hit = /(?:^|[^\w.])local\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*pcall\s*\(/.exec(m);
    if (!hit) continue;
    const name = hit[1];
    const uses = (code.match(new RegExp(`\\b${name}\\b`, 'g')) || []).length;
    if (uses <= 1) push(errors, i + 1, 'SWALLOWED_PCALL', `\`${name}\` 只在这里出现一次 —— pcall 的失败没有去向（要么 fail()、要么 log，规范 §9）`);
  }

  // ---- warn 级：逐行 ----
  for (let i = 0; i < rawLines.length; i += 1) {
    const raw = rawLines[i];
    const m = masked[i];
    const line = i + 1;
    if (m === undefined) continue;                    // 整行在注释/长串里
    // 行宽按**代码**长度判（字符串与注释折叠）—— 长字符串是**数据**不是复杂度；
    // 这条来自 LuaRocks 的原意"行宽是复杂度的代理"，代理对象是代码而不是文案。
    if (m.length > MAX_LINE) {
      push(warnings, line, 'LONG_LINE', `代码长度 ${m.length} > ${MAX_LINE}（原文 ${raw.length} 字符）—— 拆成命名子表达式，规范 §3`);
    }
    if (/;\s*\S/.test(m) || /;\s*$/.test(m)) push(warnings, line, 'SEMICOLON', '出现分号（规范：一条语句一行、不用分号，§3）');
    if (/(?:^|[^\w.])assert\s*\(/.test(m)) push(warnings, line, 'ASSERT', '用了 assert —— 规范要求参数校验走显式检查 + fail()（assert 只留给"绝不该发生"的自检，§1.3）');
    if (/^\s*pcall\s*\(/.test(m)) push(warnings, line, 'BARE_PCALL', '语句级裸 pcall：返回值没被捕获，确认失败路径有 log（规范 §9）');
    if (/(?:^|[^\w.])local\s+function\s+[A-Z]/.test(m)) push(warnings, line, 'FUNC_UPPER', 'local function 首字母大写 —— 规范用 camelCase（§2）');
    if (/[\u3000-\u303f\uff00-\uffef]/.test(m)) push(warnings, line, 'FULLWIDTH', '代码位置出现全角字符（多半是中文标点混进代码，运行时会炸，§1.5）');
    const ind = /^(\s*)/.exec(raw)[1];
    if (ind.length > 0 && raw.trim() !== '' && ind.length % INDENT !== 0) {
      push(warnings, line, 'INDENT', `行首缩进 ${ind.length} 不是 ${INDENT} 的倍数（规范 §3）`);
    }
    const oneIf = /^\s*if\b.*\bthen\b(.+?)\bend\s*$/.exec(m);
    if (oneIf && !/^\s*(return|break)\b/.test(oneIf[1])) {
      push(warnings, line, 'ONE_LINE_IF', '单行 if 里不是 return/break —— 规范只允许这两种单行块（§3）');
    }
  }

  // ---- warn 级：字符串引号（用 trace，精确到字符串字面量）----
  for (const t of trace) {
    if (t.kind !== 'string' || typeof t.sample !== 'string') continue;
    if (t.sample.startsWith("'")) push(warnings, t.line, 'SINGLE_QUOTE', `单引号字符串 ${t.sample.slice(0, 24)}…（规范：优先双引号，§7）`);
  }

  // ---- warn 级：文件头版本块 / 文件大小 ----
  // 窗口取 25 行：本工程的文件头动辄十几行（契约/规则来源/纪律），版本块放在头部末尾才自然
  const head = rawLines.slice(0, 25).join('\n');
  if (!/v\d+\.\d+/.test(head) || !/={4,}/.test(head)) {
    push(warnings, 1, 'HDR', '前 25 行里没有"版本块"（`====` 横幅 + `vX.Y`）—— 规范 §10 要求文件头能对号排障');
  }
  if (rawLines.length > BIG_FILE_LINES) {
    push(warnings, 1, 'BIG_FILE', `${rawLines.length} 行 > ${BIG_FILE_LINES} —— 建议按 §5 拆分（本工程 main.lua 由 案子/<地图>/2.代码/main/ 的片段构建）`);
  }

  return { errors, warnings, stats: { lines: rawLines.length, strings: trace.filter((t) => t.kind.startsWith('string')).length } };
}

/**
 * 标出"哪些字符位于**代码**位置（不在注释/字符串里）" —— `--fix` 用它保证只动代码、绝不碰字符串里的分号。
 * 不依赖插件的剥离器（那个会把多行注释压成一个空格、位置对不上）。
 */
export function codeMask(src) {
  const n = src.length;
  const isCode = new Array(n).fill(true);
  const mark = (from, to) => { for (let k = from; k < to && k < n; k += 1) isCode[k] = false; };
  let i = 0;
  while (i < n) {
    const c = src[i];
    if (c === '-' && src[i + 1] === '-') {
      const lm = /^--\[(=*)\[/.exec(src.slice(i, i + 12));
      if (lm) {
        const closer = ']' + lm[1] + ']';
        const end = src.indexOf(closer, i + lm[0].length);
        const stop = end < 0 ? n : end + closer.length;
        mark(i, stop); i = stop; continue;
      }
      const nl = src.indexOf('\n', i);
      const stop = nl < 0 ? n : nl;
      mark(i, stop); i = stop; continue;
    }
    if (c === '[') {
      const lm = /^\[(=*)\[/.exec(src.slice(i, i + 12));
      if (lm) {
        const closer = ']' + lm[1] + ']';
        const end = src.indexOf(closer, i + lm[0].length);
        const stop = end < 0 ? n : end + closer.length;
        mark(i, stop); i = stop; continue;
      }
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === c) { j += 1; break; }
        if (src[j] === '\n') break;
        j += 1;
      }
      mark(i, Math.min(j, n)); i = Math.min(j, n); continue;
    }
    i += 1;
  }
  return isCode;
}

/**
 * 只做**证明安全**的机械修复（行为等价，纯空白/分隔符层面）：
 *   BOM 去掉 · CRLF→LF · TAB→4 空格 · 分号：行尾删除／行中拆成两行（同缩进）
 * **不修**需要判断的：单引号、assert、单行 if、长行、裸 pcall、HDR、命名、缩进续行。
 * @returns {{out:string, changes:Array<{kind:string,count:number}>}}
 */
export function applySafeFixes(src) {
  const changes = [];
  let out = String(src ?? '');
  if (out[0] === '\uFEFF') { out = out.slice(1); changes.push({ kind: 'BOM', count: 1 }); }
  const crlf = (out.match(/\r\n|\r/g) || []).length;
  if (crlf) { out = out.replace(/\r\n?/g, '\n'); changes.push({ kind: 'CRLF', count: crlf }); }
  const tabs = (out.match(/\t/g) || []).length;
  if (tabs) { out = out.replace(/\t/g, '    '); changes.push({ kind: 'TAB', count: tabs }); }
  const isCode = codeMask(out);
  let semi = 0;
  let buf = '';
  for (let i = 0; i < out.length; i += 1) {
    const ch = out[i];
    if (ch === ';' && isCode[i]) {
      semi += 1;
      let j = i + 1;
      while (j < out.length && (out[j] === ' ' || out[j] === '\t')) j += 1;
      const atEol = j >= out.length || out[j] === '\n';
      while (buf.endsWith(' ') || buf.endsWith('\t')) buf = buf.slice(0, -1);
      if (!atEol) {
        const lineStart = out.lastIndexOf('\n', i) + 1;
        const indent = /^[ \t]*/.exec(out.slice(lineStart, i))[0];
        buf += '\n' + indent;
        i = j - 1;          // 跳过紧随分号的那串空白（否则新行会多出一个空格）
      }
      continue;
    }
    buf += ch;
  }
  if (semi) { out = buf; changes.push({ kind: 'SEMICOLON', count: semi }); }
  return { out, changes };
}

/**
 * 单行 if 展开成块（规范 §3：单行块只许 `then return` / `then break`）。
 * **只在能证明等价时展开**：行内无注释、body 无嵌套块关键字、body 非 return/break。
 * body 里的 `;` 一并拆成多行（避免"展开完还是一条挤了多条语句"的怪形状）。
 * @returns {{out:string, expanded:number, skippedComment:number, skippedNested:number, skippedReturn:number}}
 */
export function expandOneLineIfs(src) {
  const text = String(src ?? '');
  const isCode = codeMask(text);
  const lines = text.split('\n');
  const out = [];
  const stat = { expanded: 0, skippedComment: 0, skippedNested: 0, skippedReturn: 0 };
  let off = 0;
  for (const raw of lines) {
    const lineStart = off;
    off += raw.length + 1;
    if (!/\bif\b/.test(raw)) { out.push(raw); continue; }
    const codeAt = (i) => isCode[lineStart + i] === true;
    const findWord = (word, from) => {
      const re = new RegExp(`\\b${word}\\b`, 'g');
      re.lastIndex = from;
      let m;
      while ((m = re.exec(raw))) { if (codeAt(m.index)) return m; }
      return null;
    };
    const ifm = findWord('if', 0);
    if (!ifm || raw.slice(0, ifm.index).trim() !== '') { out.push(raw); continue; }
    const thenm = findWord('then', ifm.index + 2);
    if (!thenm) { out.push(raw); continue; }
    const endm = findWord('end', thenm.index + 4);
    if (!endm || raw.slice(endm.index + 3).trim() !== '') { out.push(raw); continue; }
    if (raw.includes('--')) { stat.skippedComment += 1; out.push(raw); continue; }
    const body = raw.slice(thenm.index + 4, endm.index);
    if (body.trim() === '') { out.push(raw); continue; }
    // 守卫必须只看**代码位置**（否则 body 里字符串中的 end/then 会被当成嵌套块）
    const bodyCodeText = [...body].map((ch, k) => (codeAt(thenm.index + 4 + k) ? ch : ' ')).join('');
    if (/\b(if|then|end|function|do|repeat|until|else|elseif)\b/.test(bodyCodeText)) { stat.skippedNested += 1; out.push(raw); continue; }
    // body 的代码位置里的 `;` 也要拆行
    const stmts = [];
    let cur = '';
    for (let k = 0; k < body.length; k += 1) {
      const ch = body[k];
      if (ch === ';' && codeAt(thenm.index + 4 + k)) { stmts.push(cur); cur = ''; continue; }
      cur += ch;
    }
    stmts.push(cur);
    const parts = stmts.map((s) => s.trim()).filter((s) => s !== '');
    if (parts.length === 1 && /^(return(\s|$)|break\s*$)/.test(parts[0])) { stat.skippedReturn += 1; out.push(raw); continue; }
    const indent = /^[ \t]*/.exec(raw)[0];
    const cond = raw.slice(ifm.index + 2, thenm.index).trim();
    out.push(`${indent}if ${cond} then`);
    for (const s of parts) out.push(`${indent}    ${s}`);
    out.push(`${indent}end`);
    stat.expanded += 1;
  }
  return { out: out.join('\n'), ...stat };
}

/** 关键字计数（代码位置）—— 纯重排**不许改变**它；`--fix-blocks` 写盘前用它当硬校验 */
export function keywordCensus(src) {
  const text = String(src ?? '');
  const isCode = codeMask(text);
  const words = ['if', 'then', 'else', 'elseif', 'end', 'do', 'function', 'repeat', 'until'];
  const census = {};
  for (const w of words) census[w] = 0;
  for (const m of text.matchAll(/\b[A-Za-z_][A-Za-z0-9_]*\b/g)) {
    if (!isCode[m.index]) continue;
    const word = m[0];
    if (word in census) census[word] += 1;
  }
  return census;
}

function report(rel, res) {
  if (!res.errors.length && !res.warnings.length) {
    console.log(`OK   ${rel}  （${res.stats.lines} 行 / ${res.stats.strings} 个字符串 / error 0 warn 0）`);
    return 0;
  }
  console.log(`---- ${rel}`);
  for (const e of res.errors) console.log(`  ✗ L${e.line}  ${e.kind}  ${e.msg}`);
  for (const w of res.warnings) console.log(`  ! L${w.line}  ${w.kind}  ${w.msg}`);
  console.log(`     （error ${res.errors.length} / warn ${res.warnings.length}）`);
  return res.errors.length ? 1 : 0;
}

const BASELINE_PATH = join(process.cwd(), 'tools', 'lua-style-baseline.json');

/** 旧格式（顶层 `files`）那份基线属于哪张图 —— 2026-09-29 建的《夏日祭法师》基线，`map` 字段已写进文件。 */
export const LEGACY_BASELINE_MAP = '夏日祭法师';

/**
 * 取**这张图**的基线。返回 `{base, path, why}`：`base=null` 时 `why` 说清为什么
 * （**绝不**拿别的图的基线来充数 —— 那会把所有文件判成"新文件"，回执撒谎比不报更费时间）。
 */
export function readBaseline(map) {
  if (!existsSync(BASELINE_PATH)) return { base: null, path: BASELINE_PATH, why: '基线文件还不存在' };
  let raw;
  try { raw = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')); } catch (e) { return { base: null, path: BASELINE_PATH, why: '基线文件读不出来：' + e.message }; }
  if (raw.byMap && raw.byMap[map]) return { base: raw.byMap[map], path: `${BASELINE_PATH} → byMap["${map}"]`, why: '' };
  if (raw.map === map && raw.files) return { base: raw, path: `${BASELINE_PATH}（旧格式，map=${map}）`, why: '' };
  const owner = raw.map || (raw.byMap ? Object.keys(raw.byMap).join(' / ') : '（没标归属）');
  return { base: null, path: BASELINE_PATH, why: `基线文件里没有「${map}」这一份 —— 它现有的是：${owner}` };
}

/** 把某张图的计数**追加/更新**进基线文件（`byMap[地图]`）；旧格式那份一个字节都不动（只增不删）。
 *  ⚠️ 本函数**不写盘**（只把合并后的对象给你）—— 名字故意叫 merge，别误以为是 write。 */
export function mergeBaseline(map, snap) {
  let raw = {};
  if (existsSync(BASELINE_PATH)) {
    try { raw = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')); } catch { raw = {}; }
  }
  const out = { ...raw };
  out.byMap = { ...(raw.byMap || {}) };
  // 旧格式（顶层 map+files）第一次写入时**复制**一份进 byMap，让它也能被 byMap 读到；
  // 顶层那份**保留**（只增不删 —— 基线是"历史刻度"，删了就再也说不清当初是多少）。
  if (raw.map && raw.files && !out.byMap[raw.map]) {
    out.byMap[raw.map] = { generatedAt: raw.generatedAt, map: raw.map, files: raw.files, note: raw.note };
  }
  out.byMap[map] = { generatedAt: new Date().toISOString(), map, files: snap.files };
  return out;
}

/** 把一次扫描压成可比对的形状（**只记数字**，不记文件内容）：`{generatedAt, files:{名:{errors,warnings,byRule}}}` */
export function snapshotCounts(perFile) {
  const files = {};
  for (const { file, res } of perFile) {
    const byRule = {};
    for (const w of res.warnings) byRule[w.kind] = (byRule[w.kind] || 0) + 1;
    files[file] = { errors: res.errors.length, warnings: res.warnings.length, byRule };
  }
  return { generatedAt: new Date().toISOString(), files };
}

/**
 * 与基线比对 —— 这就是"**新代码不许让任何一条规则变差**"的执行体。
 * · error > 0            → 必拦（不管基线怎么写）
 * · 某规则比基线多        → 回归
 * · 基线里没有的文件      → 新文件，必须干净（warn 也算回归）
 * · 比基线少             → 只记 improved（信息，不算过；顺手清存量后跑 --update-baseline 更新）
 */
export function compareBaseline(cur, base) {
  const errors = [], regressions = [], improved = [], newFiles = [];
  const curFiles = (cur && cur.files) || {};
  const baseFiles = (base && base.files) || {};
  for (const [file, c] of Object.entries(curFiles)) {
    if (c.errors > 0) errors.push({ file, count: c.errors });
    const b = baseFiles[file];
    if (!b) {
      if (c.warnings > 0) newFiles.push({ file, warnings: c.warnings });
      continue;
    }
    for (const [rule, n] of Object.entries(c.byRule || {})) {
      const from = (b.byRule && b.byRule[rule]) || 0;
      if (n > from) regressions.push({ file, rule, from, to: n, delta: n - from });
    }
    for (const [rule, from] of Object.entries(b.byRule || {})) {
      const n = (c.byRule && c.byRule[rule]) || 0;
      if (n < from) improved.push({ file, rule, from, to: n });
    }
  }
  return { errors, regressions, improved, newFiles };
}

function collect(p) {
  const abs = resolve(p);
  if (!existsSync(abs)) return [];
  if (statSync(abs).isDirectory()) {
    const out = [];
    for (const f of readdirSync(abs)) {
      const child = join(abs, f);
      if (statSync(child).isDirectory()) { if (f !== '_snapshots') out.push(...collect(child)); }   // 递归：构建片段在 2.代码/main/ 之类的子目录里
      else if (extname(f) === '.lua') out.push(child);
    }
    return out.sort();
  }
  return extname(abs) === '.lua' ? [abs] : [];
}

function filesFromArgs(args, P = defaultPaths()) {
  const explicit = args.filter((a) => !a.startsWith('--'));
  if (explicit.length) return explicit.flatMap(collect);
  return P.live().files;
}

function selftest() {
  const clean = [
    '-- ==== demo v1.0 ====',
    'local A = 1',
    'local function tick()',
    '    return A',
    'end',
    'function OnUpdate(dt)',
    '    local ok = pcall(tick, dt)',
    '    if ok then return end',
    'end',
  ].join('\n');
  const cases = [
    ['干净样本（不该报）', clean, 0, 0],
    ['BOM + CRLF + TAB（三个 error）', '\uFEFFlocal a = 1\r\n\tlocal b = 2\r\n', 3, undefined],
    ['OnUpdate 没包 pcall', 'function OnUpdate(dt)\n    return 1\nend\n', 1, undefined],
    ['pcall 吞错（ok 再没出现）', 'local function f()\n    local ok = pcall(function() end)\n    return 1\nend\n', 1, undefined],
    ['风格噪音（单引号/分号/assert/单行if/全角）', '-- ==== demo v1.0 ====\nlocal s = \'x\'\nlocal n = 1;\nassert(s)\nlocal function Foo() return s end\nif s then Foo() end\nlocal t = "１"\n', 0, 3],
  ];
  let bad = 0;
  for (const [name, src, wantErr, wantWarnMin] of cases) {
    const r = analyze(src);
    const okErr = r.errors.length === wantErr;
    const okWarn = wantWarnMin === undefined || r.warnings.length >= wantWarnMin;
    const ok = okErr && okWarn;
    if (!ok) bad += 1;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  → error=${r.errors.length} warn=${r.warnings.length}` +
      (ok ? '' : `  期望 error=${wantErr}${wantWarnMin === undefined ? '' : ` warn>=${wantWarnMin}`}`));
  }
  // 基线比对是纯函数 —— 用构造数据验它（不碰真实基线文件）
  const mk = (byRule, errors = 0) => ({ files: { 'a.lua': { errors, warnings: Object.values(byRule).reduce((a, b) => a + b, 0), byRule } } });
  const base = mk({ SEMICOLON: 2 });
  const checks = [
    ['基线：与基线一致 → 无回归', compareBaseline(mk({ SEMICOLON: 2 }), base).regressions.length === 0],
    ['基线：某规则变多 → 算回归', compareBaseline(mk({ SEMICOLON: 3 }), base).regressions[0]?.delta === 1],
    ['基线：某规则变少 → 只算 improved', compareBaseline(mk({ SEMICOLON: 1 }), base).improved.length === 1],
    ['基线：新文件 → 必须干净', compareBaseline({ files: { 'new.lua': { errors: 0, warnings: 1, byRule: { ASSERT: 1 } } } }, base).newFiles.length === 1],
    ['基线：有 error → 必拦', compareBaseline(mk({ SEMICOLON: 2 }, 1), base).errors.length === 1],
  ];
  for (const [name, ok] of checks) {
    if (!ok) bad += 1;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  }
  // --fix 的安全子集（纯函数）
  const fx = [
    ['分号：行尾删掉', 'local a = 1;\n', 'local a = 1\n'],
    ['分号：行中拆两行（保缩进）', '    local a = 1; local b = 2\n', '    local a = 1\n    local b = 2\n'],
    ['分号：字符串里的绝不动', 'local s = "a;b"\n', 'local s = "a;b"\n'],
    ['分号：注释里的绝不动', '-- a;b\nlocal x = 1\n', '-- a;b\nlocal x = 1\n'],
    ['TAB → 4 空格', 'local\ta\n', 'local    a\n'],
    ['CRLF → LF', 'local a = 1\r\n', 'local a = 1\n'],
    ['BOM 去掉', '\uFEFFlocal a = 1\n', 'local a = 1\n'],
  ];
  for (const [name, src, want] of fx) {
    const got = applySafeFixes(src).out;
    const ok = got === want;
    if (!ok) bad += 1;
    console.log(`${ok ? 'PASS' : 'FAIL'}  fix：${name}${ok ? '' : `\n    期望 ${JSON.stringify(want)}\n    实际 ${JSON.stringify(got)}`}`);
  }
  const idem = 'local a = 1;\n    local b = 2;local c = 3\n';
  const once = applySafeFixes(idem).out;
  const twice = applySafeFixes(once).out;
  if (once !== twice) { bad += 1; console.log('FAIL  fix：幂等（第二次应无改动）'); } else console.log('PASS  fix：幂等（第二次应无改动）');
  // 单行 if 展开（--fix-blocks）
  const blk = [
    ['单行 if → 块', 'if a then b = 1 end\n', 'if a then\n    b = 1\nend\n'],
    ['带缩进 + 行内分号 → 多行', '    if a then b = 1; c = 2 end\n', '    if a then\n        b = 1\n        c = 2\n    end\n'],
    ['`then return` 保持不动（规范允许）', 'if a then return end\n', 'if a then return end\n'],
    ['行内含注释 → 不碰（交给人）', 'if a then b = 1 end -- 说明\n', 'if a then b = 1 end -- 说明\n'],
    ['嵌套单行 if → 不碰', 'if a then if b then c() end end\n', 'if a then if b then c() end end\n'],
    ['字符串里的 if/end 不算代码', 'local s = "if a then b end"\n', 'local s = "if a then b end"\n'],
    ['条件/语句里的字符串 end 不误判', 'if x then y = "end" end\n', 'if x then\n    y = "end"\nend\n'],
  ];
  for (const [name, src, want] of blk) {
    const got = expandOneLineIfs(src).out;
    const ok = got === want;
    if (!ok) bad += 1;
    console.log(`${ok ? 'PASS' : 'FAIL'}  blocks：${name}${ok ? '' : `\n    期望 ${JSON.stringify(want)}\n    实际 ${JSON.stringify(got)}`}`);
  }
  const censusOk = JSON.stringify(keywordCensus('if a then b = 1 end\n')) === JSON.stringify(keywordCensus('if a then\n    b = 1\nend\n'));
  if (!censusOk) bad += 1;
  console.log(`${censusOk ? 'PASS' : 'FAIL'}  blocks：展开前后关键字计数不变（写盘前的硬校验）`);
  const real = defaultPaths().p('主控 main.lua');
  if (existsSync(real)) {
    const r = analyze(readFileSync(real, 'utf8'));
    console.log(`\n对真实文件（主控 main.lua）：error=${r.errors.length} warn=${r.warnings.length}` +
      '（基线先看数字；要"钉住不许退化"就把这个数字写进本函数的断言）');
  }
  console.log(bad === 0 ? '\n自检通过 ✓' : `\n自检失败 ${bad} 例 ✗`);
  return bad === 0 ? 0 : 1;
}

const isMainModule = !!process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const argv = process.argv.slice(2);
if (!isMainModule) {
  // 被 import 时（例如复用 analyze() 做别的检查）**不要**跑 CLI
} else if (argv.includes('--selftest')) {
  process.exit(selftest());
} else {
  let ctx;
  try {
    ctx = parseMap(argv);
  } catch (e) {
    console.error('❌ ' + e.message);
    process.exit(2);
  }
  const { map, root, args } = ctx;
  const P = paths(map, root);
  const files = filesFromArgs(args, P);
  if (!files.length) { console.error(`没有找到要检查的 .lua（地图「${map}」→ ${P.code}；用法见文件头）`); process.exit(2); }
  console.log(`地图「${map}」｜目录 ${P.code}｜扫 ${files.length} 个文件`);
  const wantUpdate = args.includes('--update-baseline');
  const wantBaseline = args.includes('--baseline');
  const wantSummary = args.includes('--summary');
  const wantFix = args.includes('--fix');
  const perFile = [];
  for (const f of files) {
    let src;
    try { src = readFileSync(f, 'utf8'); } catch (e) { console.log(`SKIP ${basename(f)}（读不到：${e.message}）`); continue; }
    perFile.push({ file: basename(f), path: f, res: analyze(src) });
  }
  const footer = () => {
    console.log('\n本工具**不判**这些（要靠读规范 + 人/AI 复核）：');
    for (const s of NON_MECHANICAL) console.log(`  · ${s}`);
  };

  if (wantFix) {
    const write = argv.includes('--write');
    const planned = [];
    for (const { file, path: fp } of perFile) {
      const before = readFileSync(fp, 'utf8');
      const { out, changes } = applySafeFixes(before);
      if (changes.length) planned.push({ file, fp, changes, before, after: out });
    }
    if (!planned.length) {
      console.log('没有可机械修复的问题（BOM / CRLF / TAB / 分号）✓ —— 剩下的都要靠判断，见下方"不判"清单');
    } else {
      console.log(write ? '机械修复（写入中）：' : '预览（**未写入**；确认后加 --write 才落盘）：');
      for (const r of planned) {
        console.log(`  ${write ? '✎' : '·'} ${r.file}  ${r.changes.map((c) => `${c.kind}×${c.count}`).join('  ')}  （${r.before.length} → ${r.after.length} 字节）`);
      }
      const total = planned.reduce((s, r) => s + r.changes.reduce((a, c) => a + c.count, 0), 0);
      console.log(`\n合计 ${planned.length} 个文件 / ${total} 处机械改动（行为等价：只动空白与语句分隔符）`);
    }
    if (write && planned.length) {
      const snap = snapshotFiles(planned.map((r) => r.fp), { label: '风格整改前（--fix 自动快照）' });
      console.log(`\n已先备份：${snap.snapshotDirs.join(' ， ')}`);
      for (const r of planned) {
        const tmp = `${r.fp}.stylefix.tmp`;
        writeFileSync(tmp, r.after, 'utf8');
        try { renameSync(tmp, r.fp); } catch { writeFileSync(r.fp, r.after, 'utf8'); try { unlinkSync(tmp); } catch { /* 临时文件残留无害 */ } }
        const back = readFileSync(r.fp, 'utf8');
        console.log(`  ${back === r.after ? '✓' : '✗'} ${r.file}（${back.length} 字节）`);
      }
      console.log('\n接下来别跳步：');
      console.log('  1) node tools/check-lua-scope.mjs                     # 作用域没被改坏');
      console.log('  2) node tools/check-lua-style.mjs                     # 看还剩哪些（要判断的那批）');
      console.log('  3) 若动到 main.lua → 它是构建产物（片段在 案子/<地图>/2.代码/main/）：改片段后 node tools/build-main.mjs');
      console.log('  4) node tools/check-lua-style.mjs --update-baseline    # 把基线往好的方向推');
    }
    footer();
    process.exit(0);
  }

  if (argv.includes('--fix-blocks')) {
    const write = argv.includes('--write');
    const planned = [];
    let skipped = { comment: 0, nested: 0, ret: 0 };
    for (const { file, path: fp } of perFile) {
      const before = readFileSync(fp, 'utf8');
      const r = expandOneLineIfs(before);
      skipped.comment += r.skippedComment; skipped.nested += r.skippedNested; skipped.ret += r.skippedReturn;
      if (!r.expanded) continue;
      const cb = JSON.stringify(keywordCensus(before));
      const ca = JSON.stringify(keywordCensus(r.out));
      if (cb !== ca) { console.log(`  ✗ ${file}：展开前后关键字计数不一致 —— **拒绝改这个文件**（工具 bug，请报）`); continue; }
      planned.push({ file, fp, before, after: r.out, expanded: r.expanded });
    }
    if (!planned.length) console.log('没有可安全展开的单行 if ✓');
    else {
      console.log(write ? '单行 if 展开（写入中）：' : '预览（**未写入**；确认后加 --write）：');
      for (const r of planned) console.log(`  ${write ? '✎' : '·'} ${r.file}  展开 ${r.expanded} 处（${r.before.split('\n').length} → ${r.after.split('\n').length} 行）`);
      console.log(`\n合计展开 ${planned.reduce((s, r) => s + r.expanded, 0)} 处`);
    }
    if (skipped.comment || skipped.nested || skipped.ret) {
      console.log(`跳过（交给人看）：含注释 ${skipped.comment} / 嵌套块 ${skipped.nested} / \`then return\`(规范允许) ${skipped.ret}`);
    }
    if (write && planned.length) {
      const snap = snapshotFiles(planned.map((r) => r.fp), { label: '单行 if 展开前' });
      console.log(`\n已先备份：${snap.snapshotDirs.join(' ， ')}`);
      for (const r of planned) {
        const tmp = `${r.fp}.stylefix.tmp`;
        writeFileSync(tmp, r.after, 'utf8');
        try { renameSync(tmp, r.fp); } catch { writeFileSync(r.fp, r.after, 'utf8'); try { unlinkSync(tmp); } catch { /* 无害 */ } }
        console.log(`  ${readFileSync(r.fp, 'utf8') === r.after ? '✓' : '✗'} ${r.file}`);
      }
      console.log('\n下一步：node tools/check-lua-scope.mjs && node tools/check-lua-style.mjs');
    }
    footer();
    process.exit(0);
  }

  if (wantUpdate) {
    const snap = snapshotCounts(perFile);
    const merged = mergeBaseline(map, snap);
    writeFileSync(BASELINE_PATH, JSON.stringify(merged, null, 2) + '\n', 'utf8');
    const errs = Object.values(snap.files).reduce((a, f) => a + f.errors, 0);
    const warns = Object.values(snap.files).reduce((a, f) => a + f.warnings, 0);
    console.log(`已写入基线 ${BASELINE_PATH} → byMap["${map}"]`);
    console.log(`  ${Object.keys(snap.files).length} 个文件 / error ${errs} / warn ${warns}` +
      '（此后"新代码不许让任何一条规则超过这个数字"）');
    console.log(`  （别的图的基线原样保留：现有 ${Object.keys(merged.byMap).join(' / ')}）`);
    process.exit(errs ? 1 : 0);
  }

  if (wantBaseline) {
    const { base, path: basePath, why } = readBaseline(map);
    if (!base) {
      console.error(`地图「${map}」没有基线 —— ${why}`);
      console.error(`  先跑一次： node tools/check-lua-style.mjs --update-baseline --map ${map}`);
      console.error('  ⚠️ 本工具**不会**拿别的图的基线来充数（那会把所有文件判成"新文件"，回执就成假话了）。');
      process.exit(2);
    }
    const cmp = compareBaseline(snapshotCounts(perFile), base);
    console.log(`基线：${basePath}（${base.generatedAt || '无时间戳'}）`);
    for (const { file, res } of perFile) {
      console.log(`  ${res.errors.length ? '✗' : ' '} ${file.padEnd(24)} error ${res.errors.length} / warn ${res.warnings.length}`);
    }
    if (cmp.errors.length) {
      console.log('\n✗ error 级（必拦）：');
      for (const e of cmp.errors) console.log(`  ${e.file}：error ${e.count}`);
    }
    if (cmp.regressions.length) {
      console.log('\n✗ 比基线变差（新代码不许新增 warn）：');
      for (const r of cmp.regressions) console.log(`  ${r.file}  ${r.rule}  ${r.from} → ${r.to}（+${r.delta}）`);
    }
    if (cmp.newFiles.length) {
      console.log('\n✗ 新文件必须干净（基线里没有它）：');
      for (const n of cmp.newFiles) console.log(`  ${n.file}：${n.warnings} 条 warn`);
    }
    if (cmp.improved.length) {
      console.log(`\n! 比基线变好 ${cmp.improved.length} 处（信息，不算"过"）：`);
      for (const i of cmp.improved.slice(0, 8)) console.log(`  ${i.file}  ${i.rule}  ${i.from} → ${i.to}`);
    }
    const fail = cmp.errors.length || cmp.regressions.length || cmp.newFiles.length;
    console.log(fail ? '\n未通过基线门禁 ✗' : '\n通过基线门禁 ✓（error 0，且没有一条规则比基线差）');
    if (cmp.regressions.length || cmp.newFiles.length) {
      console.log('（若是"顺手清掉了一批存量"导致基线该往好的方向走：跑 --update-baseline）');
    }
    footer();
    process.exit(fail ? 1 : 0);
  }

  let bad = 0;
  if (wantSummary) {
    const hist = new Map();
    for (const { res } of perFile) {
      if (res.errors.length) bad += 1;
      for (const e of res.errors) hist.set(`✗ ${e.kind}`, (hist.get(`✗ ${e.kind}`) || 0) + 1);
      for (const w of res.warnings) hist.set(`! ${w.kind}`, (hist.get(`! ${w.kind}`) || 0) + 1);
    }
    console.log('逐文件：');
    for (const { file, res } of perFile) {
      console.log(`  ${res.errors.length ? '✗' : ' '} ${file.padEnd(24)} error ${res.errors.length} / warn ${res.warnings.length}（${res.stats.lines} 行）`);
    }
    console.log('\n规则直方图（全库合计）：');
    for (const [k, n] of [...hist.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${k}`);
    if (!hist.size) console.log('  （没有命中）');
  } else {
    for (const { file, res } of perFile) bad += report(file, res) ? 1 : 0;
  }
  console.log(bad ? `\n${bad} 个文件有 error 级问题 ✗（先修掉再 deploy）` : '\n没有 error 级问题 ✓');
  console.log('提示：日常门禁用 `--baseline`（error 必过 + 不许比基线变差）；清完存量用 `--update-baseline` 更新基线。');
  footer();
  process.exit(bad ? 1 : 0);
}
