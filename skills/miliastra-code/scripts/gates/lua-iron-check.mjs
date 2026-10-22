#!/usr/bin/env node
// ⚠️ 快照：本文件是 `tools\lua-iron-check.mjs` 的副本（2026-10-02 19:23，源 SHA-256 前16位 C21B4C7A706AD970）。
// 判据与源文件逐字一致，仅改了 lualint 的 import 路径；**口径以工作区版为准**，刷新见同目录 README.md。
// 技能版用法：给**显式文件/目录**（工作区版的 --map 依赖本机 案子/ 目录，技能里没有）。

/**
 * lua-iron-check.mjs —— R 级铁律「一条命令过查」（对齐 code-java 的「审查动作 = 一条命令」）
 *
 * 为什么需要：`SKILL.md` 的 R 铁律表给每条写了审查动作，但**一条条手敲容易漏、也慢**。
 * 本工具把 **R1–R11（+ L2-05 里机械可查的那半）一次跑完**，输出一张**状态板**：
 *   `R1 … OK` ／ `R2 … n 处（文件:行）` ／ `R7 … 半自动（给数字，人判）` ／ `R9 … 提示`
 * **它不重新实现任何判定**：复用
 *   · `check-lua-scope.mjs`  → 作用域（漏 local / 读到未绑定 / 控件名契约）
 *   · `check-lua-style.mjs`  → 风格（BOM/CRLF/TAB/缩进/OnUpdate 少 pcall/裸 pcall/assert/长文件）+ 基线
 * 只做**汇总 + 逐条映射**，判据口径与那两个工具完全一致（改一处不会两边漂）。
 *
 * 用法：
 *   node tools/lua-iron-check.mjs                          # 默认【侦探1】的活文件
 *   node tools/lua-iron-check.mjs --map 双相                # 换一张图（★ 加新地图不用改代码）
 *   node tools/lua-iron-check.mjs --project <2.代码 目录>    # 指定项目目录（扫其中所有 .lua，跳过 _snapshots）
 *   node tools/lua-iron-check.mjs <a.lua> <b.lua>            # 指定文件
 *   node tools/lua-iron-check.mjs --json                    # 机器可读（给别的工具/看板用）
 *   node tools/lua-iron-check.mjs --selftest                # 自检：干净样例必须全绿、脏样例每条 R 都要报
 * 退出码：有 **error 级**命中 → 1；只有 warn / 半自动 → 0。
 * ★ 路径不写死：成品在 `案子/<地图>/2.代码/`，由 tools/_paths.mjs 按地图名解析（2026-10-04 迁移后）。
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync, rmSync } from 'node:fs';
import { join, basename, resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyze as scopeAnalyze, checkControlNames } from './check-lua-scope.mjs';
import { analyze as styleAnalyze, compareBaseline, snapshotCounts, codeMask, readBaseline } from './check-lua-style.mjs';
import { DEFAULT_MAP, MAPS, ROOT, parseMap, paths } from './_paths.mjs';

// ⚠️ 这里**不做** argv 解析（本文件会被 selftest / 别的脚本 import）：默认目录惰性求值。
const defaultPaths = () => paths(DEFAULT_MAP);
/** 历史产物 / 探针 / 备份：**不进沙箱、按政策不整改** ⇒ `--project` 默认跳过（`--include-history` 才纳入） */
const HISTORY_RE = /(_备份|_snapshot|main\.engine|roles\.lua|_探针|\.bak$)/;
const BASELINE = join(process.cwd(), 'tools', 'lua-style-baseline.json');
const LONG_PRINT = 1000;          // 单条 print 行超此长度 ⇒ 可能撞 10000 字符上限（R7 的分片信号）

const lineOfIndex = (src, idx) => src.slice(0, idx).split('\n').length;

/** 收集某类命中。source: 'style'|'scope'|'ctrl'；severity: 'error'|'warn' */
function hitsOf(perFile, kind, source, severity) {
  const out = [];
  for (const f of perFile) {
    const bucket = source === 'style' ? (severity === 'error' ? f.style.errors : f.style.warnings)
      : source === 'scope' ? (severity === 'error' ? f.scope.errors : f.scope.warnings)
        : (severity === 'error' ? f.ctrl.errors : f.ctrl.warnings);
    for (const it of bucket) if (it.kind === kind) out.push({ file: f.name, line: it.line, msg: it.msg || '' });
  }
  return out;
}

/** 在**代码位置**上找正则（注释/字符串里的不算）——保留给"只该出现在代码里"的检查用。 */
function codeHits(perFile, re) {
  const out = [];
  for (const f of perFile) {
    const isCode = codeMask(f.src);
    for (const m of f.src.matchAll(re)) {
      if (!isCode[m.index]) continue;
      out.push({ file: f.name, line: lineOfIndex(f.src, m.index), msg: m[0].slice(0, 40) });
    }
  }
  return out;
}

/**
 * R10 专用分类：**只有"把诊断串写进控件/画面通道"才算违规**。
 * `print / log / fail` 是**正确通道**（诊断就该走日志），不算。
 * @returns {{error:Array, suspect:Array}}
 */
function classifyScreenDiag(perFile) {
  const error = [], suspect = [];
  for (const f of perFile) {
    const lines = f.src.split('\n');
    for (const m of f.src.matchAll(/FAULT@+|诊断串|状态>|DEBUG/g)) {
      const ln = lineOfIndex(f.src, m.index);
      const line = lines[ln - 1] || '';
      if (/^\s*--/.test(line)) continue;                                  // 注释里提到不算
      const isLogChannel = /\b(print|log|fail)\s*\(/.test(line) && !/\.text\s*=/.test(line);
      if (isLogChannel) continue;                                          // 日志通道：正确
      const target = /(\.text\s*=|:?SetText\s*\(|:?SetVisible|\bshow\s*\()/.test(line) ? error : suspect;
      target.push({ file: f.name, line: ln, msg: line.trim().slice(0, 60) });
    }
  }
  return { error, suspect };
}

/**
 * 跑一遍 R 级过查。
 * @returns {{project:string, files:Array, rows:Array, errorHits:number, warnHits:number, baseNote:string|null}}
 */
export function ironCheck(files, { projectDir = null, projectName = null, baselinePath = BASELINE } = {}) {
  const perFile = files.map((f) => {
    const src = readFileSync(f, 'utf8');
    return { path: f, name: basename(f), src, style: styleAnalyze(src), scope: scopeAnalyze(src), ctrl: checkControlNames(src) };
  });
  const rows = [];
  const add = (id, title, level, hits, note = '') => rows.push({ id, title, level, hits, note, ok: hits.length === 0 });

  // ---- R1–R11 映射 ----
  add('R1', 'OnUpdate 包 pcall → 聚合故障块', 'error', hitsOf(perFile, 'ONUPDATE_NO_PCALL', 'style', 'error'));
  add('R2', '不许漏 local（漏了就写全局）', 'warn', hitsOf(perFile, 'GLOBAL_WRITE', 'scope', 'warn'));
  add('R3', '声明早于使用（闭包别抓到 nil）', 'error',
    [...hitsOf(perFile, 'UNDEF_READ', 'scope', 'error'), ...hitsOf(perFile, 'EXTRA_BLOCK', 'scope', 'error')]);
  add('R4', 'pcall 失败必须有去向', 'error', hitsOf(perFile, 'SWALLOWED_PCALL', 'style', 'error'));
  const r4warn = hitsOf(perFile, 'BARE_PCALL', 'style', 'warn');
  if (r4warn.length) rows[rows.length - 1].hits.push(...r4warn);
  add('R5', '无 BOM / LF / 4 空格 / 禁 tab', 'error',
    [...hitsOf(perFile, 'BOM', 'style', 'error'), ...hitsOf(perFile, 'CRLF', 'style', 'error'), ...hitsOf(perFile, 'TAB', 'style', 'error'), ...hitsOf(perFile, 'INDENT', 'style', 'warn')]);
  add('R6', '不用 assert 引爆（校验走 fail()）', 'warn', hitsOf(perFile, 'ASSERT', 'style', 'warn'));
  add('R11', '文件规模有度（>1000 行要拆）', 'warn',
    [...hitsOf(perFile, 'BIG_FILE', 'style', 'warn')]);

  // ---- R7 半自动：日志 ----
  const prints = perFile.map((f) => {
    const isCode = codeMask(f.src);
    let n = 0, long = 0, tagged = 0;
    for (const m of f.src.matchAll(/print\s*\(/g)) {
      if (!isCode[m.index]) continue;
      n += 1;
      const eol = f.src.indexOf('\n', m.index);
      if ((eol < 0 ? f.src.length : eol) - m.index > LONG_PRINT) long += 1;
      if (/print\s*\(\s*"\[/.test(f.src.slice(m.index, m.index + 24))) tagged += 1;
    }
    return { file: f.name, n, long, tagged };
  });
  const printTotal = prints.reduce((a, p) => a + p.n, 0);
  const printLong = prints.reduce((a, p) => a + p.long, 0);
  const printTagged = prints.reduce((a, p) => a + p.tagged, 0);
  add('R7', '日志 `[标签]` + `k=v`；单条 ≤10000 字符', 'note', [],
    `半自动：print 共 ${printTotal} 条，其中带 \`[标签]\` ${printTagged} 条，超长(>${LONG_PRINT} 字符) ${printLong} 条`
    + (printLong ? ' ⇒ **有超长输出，必须分片**' : '') + '；“k=v 与内容”仍要人工过');

  // ---- R8 半自动：交接值 ----
  const bigInts = new Set();
  for (const f of perFile) {
    const isCode = codeMask(f.src);
    for (const m of f.src.matchAll(/\b1\d{9,}\b/g)) if (isCode[m.index]) bigInts.add(m[0]);
  }
  add('R8', '交接值来自创作者 / .gil，禁止编造', 'note', [],
    `半自动：源码里出现 ${bigInts.size} 个疑似交接值（模板索引 / 资产 ID）`
    + (bigInts.size ? ` → ${[...bigInts].slice(0, 6).join(', ')}${bigInts.size > 6 ? ' …' : ''}` : '')
    + '；**对不对**用 `miliastra_map op=clientui --summaryOnly` 核对（本工具不判对错）');

  // ---- R9 结构提示：是不是构建产物 ----
  //   ★ 2026-10-04：项目目录现在叫 `2.代码`（成品与构建源同目录）⇒ **不能拿目录名当地图名**
  //     （那样 R9 会说"没有 案子/2.代码/2.代码/main/"、基线也会去查叫「2.代码」的那一份）。
  //     地图名由调用方显式给（CLI 传 --map 解析出来的那个）；没给才退回目录名。
  const projName = projectName ?? (projectDir ? basename(projectDir) : basename(dirname(files[0] || '.')));
  // ★ 2026-10-02：构建器**按地图登记表取** —— `tools/_paths.mjs` 的 `MAPS[地图].build` 是唯一真相。
  //   原先这里写死 `tools/build-main.mjs`，于是《双相》被提示去跑侦探杀的构建器（那条会**拒绝退出** ✗），
  //   且《坦克大战》会被告知"无 tools/build-main.mjs"（**假话**：那个文件存在，只是不服务本图）。
  //   ⚠️ projName 可能不是地图名（自检时是临时目录）⇒ 取不到就如实说"未登记构建器"，**不猜**（铁律 7/9）。
  //   ⚠️ 本段**只决定 R9 那行提示文案**（level='note'、hits 恒空）⇒ 不参与 errorHits/warnHits，退出码不受影响。
  const buildName = MAPS[projName]?.build ?? null;
  const buildPath = buildName ? join(ROOT, 'tools', buildName) : null;
  const buildExists = !!buildPath && existsSync(buildPath);
  // ★ 2026-10-04：构建源现在与成品**同在** `案子/<地图>/2.代码/`，所以"源目录"就是项目目录本身。
  //   是否算构建产物，看的是**有没有片段目录**（侦探杀 / 双相：main/）与有没有对应构建器。
  let fragDir = null;
  try { fragDir = paths(projName).p('main'); } catch { fragDir = null; }
  const hasFrag = !!fragDir && existsSync(fragDir);
  const isBuilt = buildExists && hasFrag;
  const productFiles = perFile.filter((f) => /主控|main/i.test(f.name)).map((f) => f.name);
  const productNote = productFiles.length
    ? productFiles.join(', ')
    : `(文件名没命中 \`主控|main\`；本图产物清单见 \`tools/${buildName}\` 头部的映射表)`;
  let r9Note;
  if (isBuilt) {
    r9Note = `**是构建产物**：${productNote} 应改 \`案子/${projName}/2.代码/main/*\` → \`node tools/${buildName} --map ${projName}\` 重建`;
  } else if (buildExists) {
    r9Note = `未检测到构建产物（本图登记的构建器是 \`tools/${buildName}\`，但没找到 \`案子/${projName}/2.代码/main/\` 片段目录 —— 片段/产物的实际布局以该构建器为准）`;
  } else if (buildName) {
    r9Note = `⚠️ 登记了构建器 \`tools/${buildName}\`，但那个文件不存在（\`MAPS['${projName}'].build\` 与实况不符 —— 报给工作区维护者）`;
  } else {
    r9Note = `未登记构建器（\`tools/_paths.mjs\` 的 \`MAPS['${projName}'].build\` 没有值）⇒ 本图没有构建链，改哪份就是改哪份`;
  }
  add('R9', '构建产物不许直接改', 'note', [], r9Note);

  // ---- R10 画面里不许塞诊断（print/log/fail 是正确通道，不算）----
  const diag = classifyScreenDiag(perFile);
  add('R10', '画面里不许塞诊断/兜底显示', 'error', diag.error,
    diag.error.length ? '⚠️ 若该控件是**离屏黑板**仍属违规候选（创作者明令不许用"兜底串"暴露错误）；确实要留就改准注释：写明"离屏、仅编辑器侧可见"（防撒谎注释）' : '');

  // ---- L2-05 的机械可查部分（拆两行：error 才算命中，warn 只提示人工确认）----
  add('L2-05', '控件名契约：引用了没建的名字', 'error', hitsOf(perFile, 'UNDEF_CONTROL', 'ctrl', 'error'));
  add('L2-05w', '控件名是**动态前缀**（工具认不出，需人工确认循环里真建了）', 'warn', hitsOf(perFile, 'DYN_CONTROL_NAME', 'ctrl', 'warn'));

  // ---- 风格 warn 总览（**不属于铁律**，但常被误读成"全绿就干净"）----
  const styleWarns = perFile.reduce((a, f) => a + f.style.warnings.length, 0);
  add('STYLE', '风格 warn（非铁律，另见 lua-style.md）', 'note', [],
    `共 ${styleWarns} 处（分号 / 单行 if / 长行 / 引号…）—— 跑 \`node tools/check-lua-style.mjs\` 看明细；\`--baseline\` 管"新代码不许变差"`);

  // ---- 基线（可选）：**只比这张图自己的基线**（基线按地图分开，见 check-lua-style.readBaseline） ----
  let baseNote = null;
  let base = null;
  try { base = baselinePath ? readBaseline(projName).base : null; } catch { base = null; }
  if (base) {
    const mine = perFile.filter((f) => base.files && base.files[f.name]);
    if (mine.length) {
      const cmp = compareBaseline(snapshotCounts(mine.map((f) => ({ file: f.name, res: f.style }))), base);
      const bad = cmp.errors.length + cmp.regressions.length;
      baseNote = bad
        ? `基线：**变差 ${bad} 处**（${[...cmp.errors.map((e) => `${e.file} error`), ...cmp.regressions.map((r) => `${r.file} ${r.rule} ${r.from}→${r.to}`)].join('；')}）`
        : `基线：与 \`tools/lua-style-baseline.json\` 里「${projName}」这一份一致（error 0、无回归）`;
      if (cmp.regressions.length || cmp.errors.length) {
        add('BASE', '风格基线不许变差', 'error', [...cmp.errors.map((e) => ({ file: e.file, line: 0, msg: `error ${e.count}` })), ...cmp.regressions.map((r) => ({ file: r.file, line: 0, msg: `${r.rule} ${r.from}→${r.to}` }))]);
      }
    } else {
      baseNote = `基线：跳过（这 ${perFile.length} 个文件都不在「${projName}」的基线里）`;
    }
  } else {
    baseNote = `基线：跳过（\`tools/lua-style-baseline.json\` 里没有「${projName}」这一份；要建跑 --update-baseline --map ${projName}）`;
  }

  const errorHits = rows.filter((r) => r.level === 'error').reduce((a, r) => a + r.hits.length, 0);
  const warnHits = rows.filter((r) => r.level === 'warn').reduce((a, r) => a + r.hits.length, 0);
  return { project: projName, files: perFile.map((f) => f.name), rows, errorHits, warnHits, baseNote };
}

function collect(p) {
  const abs = resolve(p);
  if (!existsSync(abs)) return [];
  if (!statSync(abs).isDirectory()) return extname(abs) === '.lua' ? [abs] : [];
  const out = [];
  for (const f of readdirSync(abs)) {
    const child = join(abs, f);
    if (statSync(child).isDirectory()) { if (f !== '_snapshots') out.push(...collect(child)); }
    else if (extname(f) === '.lua') out.push(child);
  }
  return out.sort();
}

function render(res) {
  const L = [`R 级铁律过查 —— ${res.project}（${res.files.length} 个文件）`];
  for (const r of res.rows) {
    const mark = r.level === 'error' && r.hits.length ? '✗' : r.hits.length ? '!' : r.level === 'note' ? '·' : '✓';
    L.push(` ${mark} ${r.id.padEnd(6)} ${r.title}`);
    L.push(`        ${r.note || (r.hits.length
      ? `${r.hits.length} 处：` + r.hits.slice(0, 4).map((h) => `${h.file}:${h.line} ${h.msg}`.trim()).join(' | ') + (r.hits.length > 4 ? ` …(+${r.hits.length - 4})` : '')
      : 'OK')}`);
  }
  if (res.baseNote) L.push(`\n${res.baseNote}`);
  L.push('');
  L.push(res.errorHits
    ? `结论：**有 error 级命中 ${res.errorHits} 处** —— 修完再往下走（warn/半自动 ${res.warnHits + res.rows.filter((r) => r.level === 'note').length} 项）`
    : `结论：**R 级无 error 命中** ✓（warn ${res.warnHits} 处）—— 半自动项按上面的数字人工过，然后才进下一步`);
  return L.join('\n');
}

function selftest() {
  const clean = [
    '-- ==== demo v1.4 ====',
    'local function fail(m) print("[demo] " .. tostring(m)) end',
    'local function tick(dt) return dt end',
    'function OnUpdate(dt)',
    '    local ok, err = pcall(tick, dt)',
    '    if not ok then',
    '        fail(err)',
    '    end',
    'end',
    '',
  ].join('\n');
  const dirty = [
    '\uFEFF-- ==== bad v1.4 ====',              // R5 BOM（故意）
    'local function fail(m) print(m) end',
    'raw = 1',                                   // R2 漏 local（全局写）
    'function OnUpdate(dt)',                     // R1 无 pcall
    '    tick(dt)',                              // R3 读到未绑定的 tick
    'end',
    'local ok = pcall(function() end)',           // R4 吞错
    'assert(1 == 1)',                             // R6 assert
    'local function ui(c) c.text = "FAULT@1" end', // R10 画面塞诊断
    'local s = 1;',                               // R5 分号（风格 warn，用于确认复用生效）
    '',
  ].join('\n');
  const tmp = join(process.env.TEMP || '.', `iron-selftest-${Date.now()}`);
  mkdirSync(tmp, { recursive: true });
  const cPath = join(tmp, 'clean.lua');
  const dPath = join(tmp, 'dirty.lua');
  writeFileSync(cPath, clean, 'utf8');
  writeFileSync(dPath, dirty, 'utf8');
  let bad = 0;
  const check = (name, ok) => { if (!ok) bad += 1; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); };
  const rc = ironCheck([cPath], {});
  check('干净样例：error 命中 0', rc.errorHits === 0);
  check('干净样例：R1/R2/R3/R4/R5/R10 全绿', ['R1', 'R2', 'R3', 'R4', 'R5', 'R10'].every((id) => rc.rows.find((r) => r.id === id).ok));
  const rd = ironCheck([dPath], {});
  for (const id of ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R10']) {
    const row = rd.rows.find((r) => r.id === id);
    check(`脏样例：${id} 必须报（${row.hits.length} 处）`, row.hits.length > 0);
  }
  check('脏样例：error 命中 > 0', rd.errorHits > 0);
  check('半自动行存在（R7/R8/R9）', ['R7', 'R8', 'R9'].every((id) => rd.rows.find((r) => r.id === id).level === 'note'));
  rmSync(tmp, { recursive: true, force: true });
  console.log(bad === 0 ? '\n自检通过 ✓' : `\n自检失败 ${bad} 例 ✗`);
  return bad === 0 ? 0 : 1;
}

const isMain = !!process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (!isMain) {
  // 被 import 时不跑 CLI
} else if (process.argv.includes('--selftest')) {
  process.exit(selftest());
} else {
  let ctx;
  try { ctx = parseMap(process.argv.slice(2)); } catch (e) { console.error('❌ ' + e.message); process.exit(2); }
  const { map, root, args } = ctx;
  const P = paths(map, root);
  const pi = args.indexOf('--project');
  const explicit = args.filter((a) => !a.startsWith('--') && !(pi >= 0 && a === args[pi + 1]));
  let files = [];
  let projectDir = null;
  let skippedHistory = 0;
  if (pi >= 0 && args[pi + 1]) {
    projectDir = resolve(args[pi + 1]);
    const all = collect(projectDir);
    const hist = all.filter((f) => HISTORY_RE.test(basename(f)));
    skippedHistory = args.includes('--include-history') ? 0 : hist.length;
    files = args.includes('--include-history') ? all : all.filter((f) => !HISTORY_RE.test(basename(f)));
  } else if (explicit.length) files = explicit.flatMap(collect);
  else {
    const lv = P.live();
    files = lv.files;
    if (lv.source === 'scan') console.log(`（地图「${map}」没在 tools/_paths.mjs 的 MAPS 里登记活文件 ⇒ 退化为"扫 2.代码 顶层 .lua、跳过历史产物"：${files.length} 个）`);
  }
  if (!files.length) { console.error(`没有找到要过查的 .lua（地图「${map}」→ ${P.code}；用法见文件头）`); process.exit(2); }
  console.log(`地图「${map}」｜目录 ${P.code}｜过查 ${files.length} 个文件`);
  const res = ironCheck(files, { projectDir: projectDir ?? P.code, projectName: map });
  res.skippedHistory = skippedHistory;
  if (args.includes('--json')) console.log(JSON.stringify(res, null, 2));
  else {
    console.log(render(res));
    if (skippedHistory) console.log(`（已跳过 ${skippedHistory} 个历史产物/备份/探针 —— 它们不进沙箱、按政策不整改；要纳入加 --include-history）`);
  }
  process.exit(res.errorHits ? 1 : 0);
}
