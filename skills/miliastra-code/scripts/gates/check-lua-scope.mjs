#!/usr/bin/env node
// ⚠️ 快照：本文件是 `tools\check-lua-scope.mjs` 的副本（2026-10-02 19:23，源 SHA-256 前16位 853E9F940198BD9D）。
// 判据与源文件逐字一致，仅改了 lualint 的 import 路径；**口径以工作区版为准**，刷新见同目录 README.md。
// 技能版用法：给**显式文件/目录**（工作区版的 --map 依赖本机 案子/ 目录，技能里没有）。

/**
 * check-lua-scope.mjs —— 千星客户端脚本的**作用域检查**（部署前的第三道门）
 *
 * 为什么需要（2026-09-25，一天内栽了三次，全是同一个类）：
 *   Lua 里读到"没绑定的名字"**不报错**，值是 nil：
 *     · `local C_PANEL` 写在 `build()` 里 → `animTick()` 读它 = 读**全局** = nil
 *       → `C_PANEL[1]` 报"attempt to index a nil value (global 'C_PANEL')"
 *     · `local curStage` 写在 `animTick()` **之后** → 闭包创建时还没绑定
 *       → animTick 里读的是全局 → 整段"抓捕呼吸高亮"**静默失效**（连报错都没有）
 *     · `rawState = ...` 没写 `local` → 写到了全局（能跑，但是泄漏）
 *   三种都是"看起来没问题"的代码，靠肉眼 review 反复漏。
 *
 * 本工具**按 Lua 的真实绑定规则**（词法顺序 + 块作用域）模拟一遍：
 *   ① 每个标识符读，必须在**此前**的某层作用域里有 `local` 声明，或是已知全局；
 *   ② 每个标识符写，若不在作用域里 → 全局写（生命周期钩子 OnInit/OnStart/... 放行，其余警告）。
 *   报出的行号直接指到**读到那一行**，并附"这个名字在第 N 行被声明过、但那时还没轮到/在别的函数里"。
 *
 * 这不是完整 Lua 解析器（不建 AST），但对"隐式全局"这一类足够精确；
 * 误报用 `--allow=` 精确豁免，**不要**为了让它变绿去加白名单。
 *
 * 用法：
 *   node tools/check-lua-scope.mjs                      # 默认扫【侦探1】的活文件（清单见 tools/_paths.mjs 的 MAPS）
 *   node tools/check-lua-scope.mjs --map 双相            # 换一张图（★ 加新地图不用改代码）
 *   node tools/check-lua-scope.mjs <a.lua> <b.lua> ...  # 扫指定文件（与 --map 可同时给）
 *   node tools/check-lua-scope.mjs --selftest           # 自检（验证器自身是否可信）
 * 退出码：有 error 级命中 → 1；只有 warn → 0。
 * ★ 路径不写死：成品在 `案子/<地图>/2.代码/`，由 tools/_paths.mjs 按地图名解析（2026-10-04 迁移后）。
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripCommentsAndStrings } from './lualint.mjs';
import { DEFAULT_MAP, parseMap, paths } from './_paths.mjs';

const KEYWORDS = new Set(['and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function',
  'goto', 'if', 'in', 'local', 'nil', 'not', 'or', 'repeat', 'return', 'then', 'true', 'until', 'while']);

// 平台/标准库提供的全局（只列我们脚本真的会用到的；**故意不列** tick/render/build 这类
// 本工程自己的 local 函数名 —— 列进去就等于把"忘写 local"的 bug 也一起放行了）
const GLOBALS = new Set(['game', 'script', 'Enum', 'Color', 'math', 'string', 'table', 'os',
  'pairs', 'ipairs', 'next', 'pcall', 'xpcall', 'tostring', 'tonumber', 'type', 'select',
  'print', 'error', 'assert', 'setmetatable', 'getmetatable', 'rawget', 'rawset', 'rawequal',
  'rawlen', '_G', '_VERSION', 'self', 'unpack', 'coroutine', 'utf8', 'debug', 'io',
  'require', 'load', 'collectgarbage', 'typeof']);

// 引擎会主动调用的入口：这些必须是**全局函数**，不算泄漏
const HOOKS = new Set(['OnInit', 'OnStart', 'OnUpdate', 'OnLateUpdate', 'OnFixedUpdate',
  'OnEnable', 'OnDisable', 'OnDestroy', 'run']);

// ⚠️ 这里**不做** argv 解析：本文件会被 tools/lua-iron-check.mjs import，
//   模块顶层碰 argv 会在"被 import 时"误判别人的命令行。默认目录一律惰性求值。
const defaultPaths = () => paths(DEFAULT_MAP);

const TOKEN_RE = /[A-Za-z_][A-Za-z0-9_]*|\d[\d.]*|\.\.\.|\.\.|==|~=|<=|>=|::|[^\sA-Za-z0-9_]/g;
const isIdent = (s) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(s);

/**
 * **跨脚本入口**：本文件里要被**别的脚本**用 `script:Invoke("名字", …)` 调到的全局函数。
 * `Invoke` 只找**文件顶层、不加 local**的函数 ⇒ 这类全局写是**故意的**，不是漏 `local`。
 * ⇒ 在文件里显式声明一行，门禁就认（**声明制**：不给通配、不猜前缀 —— 猜前缀等于放水）。
 *     -- @cross-script FX_Cast FX_Burst FX_Announce
 * 为什么需要：两条脚本互相调用的工程里，`FX_*` 必然报 GLOBAL_WRITE；
 * 不给出路的话，要么门禁长期红着被无视，要么有人把 `local` 加回去 ⇒ **Invoke 静默找不到**（更难查）。
 */
export function crossScriptNames(src) {
  const out = new Set();
  for (const line of String(src ?? '').split('\n')) {
    const m = line.match(/^\s*--\s*@cross-script\s+(.+?)\s*$/);
    if (m === null) {
      continue;
    }
    for (const name of m[1].split(/[\s,]+/)) {
      if (isIdent(name)) {
        out.add(name);
      }
    }
  }
  return out;
}

/** 词法分析：注释/字符串先被替换成空格（复用插件那套已验证的剥离器，行号逐字符映射）。 */
function tokenize(code, lineOf) {
  const toks = [];
  for (const m of code.matchAll(TOKEN_RE)) {
    toks.push({ v: m[0], ch: m.index, line: lineOf[m.index] || 1 });
  }
  return toks;
}

/**
 * 按 Lua 的绑定规则走一遍。
 * @returns {{errors:Array, warnings:Array, stats:{lines:number, tokens:number, locals:number}}}
 */
export function analyze(text) {
  const src = String(text ?? '');
  const { code, lineOf } = stripCommentsAndStrings(src);
  const CROSS = crossScriptNames(src);
  const toks = tokenize(code, lineOf);

  const errors = [];
  const warnings = [];
  const allLocals = new Map();      // name -> [{line, where}]（只用于报错时给"它在哪声明过"）
  const scopes = [{ names: new Map(), kind: 'module' }];   // names: name -> {pos, line, where}
  const openers = [];               // 与 scopes[1..] 对齐的块开始位置
  let pendingDo = false;            // `for/while ... do` 的 do 不再新开一层
  let fnDepth = 0;
  const delim = [];                 // ( { [ 栈（判断"这里是不是表构造器里的 key"）

  const cur = () => scopes[scopes.length - 1];
  const declare = (name, pos, line, where) => {
    if (!name || KEYWORDS.has(name)) return;
    const sc = cur();
    if (!sc.names.has(name)) sc.names.set(name, { pos, line, where });
    if (!allLocals.has(name)) allLocals.set(name, []);
    allLocals.get(name).push({ line, where });
  };
  const lookup = (name, pos) => {
    for (let i = scopes.length - 1; i >= 0; i--) {
      const d = scopes[i].names.get(name);
      if (d && d.pos < pos) return d;
    }
    return null;
  };
  const pushScope = (kind, at) => { scopes.push({ names: new Map(), kind }); openers.push(at); };
  const popScope = (tokIdx, tok) => {
    if (scopes.length > 1) { scopes.pop(); openers.pop(); }
    else errors.push({ line: toks[tokIdx].line, kind: 'EXTRA_BLOCK', name: tok, msg: `多出来的 ${tok}（前面的块都已经关完了）` });
  };
  const inTableCtor = () => delim.length > 0 && delim[delim.length - 1] === '{';

  /** 从 k 开始是否是赋值目标列表 `a, b = ...`；是则返回目标下标 */
  const writeTargets = (k) => {
    const out = [];
    let j = k;
    while (j < toks.length && isIdent(toks[j].v) && !KEYWORDS.has(toks[j].v)) {
      out.push(j);
      if (toks[j + 1] && toks[j + 1].v === ',') { j += 2; continue; }
      break;
    }
    return (toks[j + 1] && toks[j + 1].v === '=') ? out : null;
  };

  for (let k = 0; k < toks.length; k++) {
    const t = toks[k];
    const v = t.v;

    if (v === '(' || v === '{' || v === '[') { delim.push(v); continue; }
    if (v === ')' || v === '}' || v === ']') { delim.pop(); continue; }

    if (KEYWORDS.has(v)) {
      if (v === 'local') {
        if (toks[k + 1] && toks[k + 1].v === 'function') {
          declare(toks[k + 2] && toks[k + 2].v, k, t.line, 'local function');
          continue;
        }
        let j = k + 1;
        while (j < toks.length && isIdent(toks[j].v) && !KEYWORDS.has(toks[j].v)) {
          declare(toks[j].v, k, t.line, 'local');
          if (toks[j + 1] && toks[j + 1].v === ',') { j += 2; continue; }
          break;
        }
        continue;
      }
      if (v === 'function') {
        // 函数名（`function f` / `function a.b` / `function a:b`）：只有裸名才算一次全局写
        const prev = toks[k - 1];
        const nameless = (prev && prev.v === 'local');
        if (!nameless) {
          const nm = toks[k + 1];
          const after = toks[k + 2];
          if (nm && isIdent(nm.v) && (!after || (after.v !== '.' && after.v !== ':'))) {
            if (!lookup(nm.v, k) && !HOOKS.has(nm.v) && !CROSS.has(nm.v)) {
              warnings.push({ line: t.line, kind: 'GLOBAL_WRITE', name: nm.v, msg: `全局写函数 ${nm.v}（不是 local，也不是生命周期钩子）` });
            }
          }
        }
        pushScope('function', k);
        fnDepth++;
        // 参数
        let j = k + 1;
        while (j < toks.length && toks[j].v !== '(') j++;
        if (toks[j] && toks[j].v === '(') {
          j++;
          while (j < toks.length && toks[j].v !== ')') {
            if (isIdent(toks[j].v)) declare(toks[j].v, k, t.line, '函数参数');
            j++;
          }
        }
        // ★ 名字与参数都已消费：跳到 `)`，否则函数名会被下一轮当成一次**读**（自检抓到过这个假阳性）
        k = j;
        continue;
      }
      if (v === 'if' || v === 'while' || v === 'repeat') { pushScope(v, k); continue; }
      if (v === 'for') {
        pushScope('for', k);
        let j = k + 1;
        while (j < toks.length) {
          if (toks[j].v === '=' || toks[j].v === 'in') break;
          if (isIdent(toks[j].v)) declare(toks[j].v, k, t.line, 'for 循环变量');
          j++;
        }
        continue;
      }
      if (v === 'do') {
        if (pendingDo) pendingDo = false; else pushScope('do', k);
        continue;
      }
      if (v === 'end' || v === 'until') {
        const wasFn = scopes.length > 1 && scopes[scopes.length - 1].kind === 'function';
        popScope(k, v);
        if (v === 'end' && wasFn) fnDepth--;
        continue;
      }
      continue;
    }

    if (!isIdent(v)) continue;   // 数字/运算符

    const prev = toks[k - 1];
    if (prev && (prev.v === '.' || prev.v === ':')) continue;   // 字段/方法名
    if (inTableCtor()) continue;                                 // 表构造器里的 key

    const wt = writeTargets(k);
    if (wt) {
      for (const idx of wt) {
        const nm = toks[idx].v;
        if (!lookup(nm, idx) && !GLOBALS.has(nm) && !HOOKS.has(nm) && !CROSS.has(nm)) {
          warnings.push({ line: toks[idx].line, kind: 'GLOBAL_WRITE', name: nm, msg: `写到了全局 ${nm}（缺 local？）` });
        }
      }
      k = wt[wt.length - 1];
      continue;
    }

    // 读
    if (GLOBALS.has(v) || KEYWORDS.has(v)) continue;
    if (lookup(v, k)) continue;
    const seen = allLocals.get(v);
    const hint = seen && seen.length
      ? `这个名字在第 ${seen.map((s) => s.line).join('/')} 行以「${seen[0].where}」声明过 —— 但此刻它还没绑定，读的是**全局 nil**`
      : '全文件都没有它的 local 声明';
    errors.push({ line: t.line, kind: 'UNDEF_READ', name: v, msg: `读 ${v}：${hint}` });
  }

  return {
    errors, warnings,
    stats: { lines: src.split(/\r?\n/).length, tokens: toks.length, locals: allLocals.size },
  };
}

/**
 * 第二道检查：**控件名契约**（分析器看不到字符串，所以单独用正则扫原文）。
 * 渲染代码里 `show("icoTme")` 这种名字打错，在"严格模式"下会直接 error → 整脚本冻结，
 * 而这正是 2026-09-25 那批 bug 的同一类后果（静默/冻结而不是响亮地报错）。
 * @returns {{errors:Array, definedCount:number, usedCount:number}}
 */
export function checkControlNames(src) {
  const text = String(src ?? '');
  const ADDS = /add\s*\(\s*"([^"]+)"/g;
  const USES = /(?:show|setText|setColor|setFont|place)\s*\(\s*"([^"]+)"|items\[\s*"([^"]+)"\s*\]/g;
  const STRS = /"([^"\n]{1,40})"/g;
  const defined = new Set();
  for (const m of text.matchAll(ADDS)) defined.add(m[1]);
  // ★ 2026-09-26：本工程有了 **UI 构造器**（`makePanel(pre,…)` / `makeBtn(name,…)`）——
  //   它们会**派生**控件名（makeBtn → `<name>` / `<name>Bg` / `<name>Tx`；makePanel → `<name>P` / `<name>PBg`），
  //   所以这里要把派生名一并算作"建过"；构造器第一个参数是 `"前缀" .. i` 这种动态写法时，
  //   记成**动态前缀**（走"自己确认"提示，而不是假报"没 add 过"）。
  const dynamicPrefixes = new Set();
  const MAKES = /(?:makePanel|makeBtn)\s*\(\s*"([^"]+)"(\s*\.\.)?/g;
  for (const m of text.matchAll(MAKES)) {
    if (m[2]) {
      dynamicPrefixes.add(m[1]);
      continue;
    }
    defined.add(m[1]);
    defined.add(m[1] + 'P');
    defined.add(m[1] + 'PBg');
    defined.add(m[1] + 'Bg');
    defined.add(m[1] + 'Tx');
  }
  // 所有字符串字面量：**动态前缀**（`add(d[1], …)` 里 `d[1] = "wash1"` 这种）只能靠它认出来
  const literals = new Set();
  for (const m of text.matchAll(STRS)) literals.add(m[1]);
  const isPrefixOfSomething = (n) => {
    for (const d of defined) if (d.length > n.length && d.startsWith(n)) return true;
    for (const l of literals) if (l.length > n.length && l.startsWith(n)) return true;
    return false;
  };
  const used = new Map();
  for (const m of text.matchAll(USES)) {
    const name = m[1] || m[2];
    if (!used.has(name)) used.set(name, text.slice(0, m.index).split('\n').length);
  }
  const errors = [];
  const warnings = [];
  for (const [name, line] of used) {
    if (defined.has(name)) continue;
    if (dynamicPrefixes.has(name) || isPrefixOfSomething(name)) {
      warnings.push({ line, kind: 'DYN_CONTROL_NAME', name, msg: `控件名 "${name}" 是**动态前缀**（如 "${name}" .. i / 表里取值）—— 本检查认不出，请自己确认循环里真的建了` });
    } else {
      errors.push({ line, kind: 'UNDEF_CONTROL', name, msg: `引用了没 add() 过的控件名 "${name}"（严格模式下会 error → 整脚本冻结）` });
    }
  }
  return { errors, warnings, definedCount: defined.size, usedCount: used.size };
}

function report(file, res, ctrl) {
  const rel = file;
  const lines = [...res.errors.map((e) => ({ ...e, sev: 'ERROR' })), ...res.warnings.map((w) => ({ ...w, sev: 'warn' })),
    ...ctrl.errors.map((e) => ({ ...e, sev: 'ERROR' })), ...ctrl.warnings.map((w) => ({ ...w, sev: 'warn' }))];
  if (!lines.length) {
    console.log(`OK   ${rel}  （${res.stats.lines} 行 / ${res.stats.tokens} token / ${res.stats.locals} 个 local / 控件名 ${ctrl.usedCount} 用 ${ctrl.definedCount} 建）`);
    return 0;
  }
  console.log(`---- ${rel}`);
  for (const it of lines) console.log(`  ${it.sev === 'ERROR' ? '✗' : '!'} L${it.line}  ${it.kind}  ${it.msg}`);
  return (res.errors.length + ctrl.errors.length) ? 1 : 0;
}

function filesFromArgs(args, P = defaultPaths()) {
  const explicit = args.filter((a) => !a.startsWith('--'));
  if (explicit.length) return explicit.map((p) => resolve(p));
  // 默认只扫**真正会部署的活文件**（目录里还有历史产物 main.engine.lua / roles.lua，
  // 它们不进沙箱，扫了只会刷屏）—— 清单在 tools/_paths.mjs 的 MAPS 里，**按地图名取**。
  return P.live().files;
}

function selftest() {
  const cases = [
    ['块内 local 被另一个函数读（C_PANEL 型）', `
local function build()
  local C_PANEL = { 1, 2 }
  return C_PANEL
end
local function tick()
  return C_PANEL[1]
end
`, 1],
    ['local 声明在函数之后（curStage 型）', `
local function tick() return curStage == "arrest" end
local curStage = ""
`, 1],
    ['正常的模块级 local（不该报）', `
local C = { 1 }
local function tick() return C[1] end
local function other() return tick() end
function OnUpdate(dt) return other() end
`, 0],
    ['写到全局（该 warn，不该 error）', `
local function tick() raw = 1 end
`, 0, 1],
  ];
  let bad = 0;
  for (const [name, src, wantErr, wantWarn] of cases) {
    const r = analyze(src);
    const ok = r.errors.length === (wantErr ?? 0) && (wantWarn === undefined || r.warnings.length === wantWarn);
    if (!ok) bad++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  → error=${r.errors.length} warn=${r.warnings.length}` +
      (ok ? '' : `  期望 error=${wantErr ?? 0} warn=${wantWarn === undefined ? '-' : wantWarn}`));
  }
  const P = defaultPaths();
  const boardPath = P.p('调查板 board.lua');
  const real = existsSync(boardPath) ? analyze(readFileSync(boardPath, 'utf8')) : null;
  console.log(`\n自检对真实文件：board.lua error=${real ? real.errors.length : '（找不到，跳过）'} warn=${real ? real.warnings.length : '-'}` +
    `（2026-09-25 修完之后应该是 0；非 0 说明又退化了）`);
  console.log(bad === 0 ? '\n自检通过 ✓' : `\n自检失败 ${bad} 例 ✗`);
  return bad === 0 ? 0 : 1;
}

const isMainModule = !!process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const argv = process.argv.slice(2);
if (!isMainModule) {
  // 被 import 时（例如 tools/lua-iron-check.mjs 复用 analyze）**不要**跑 CLI
} else if (argv.includes('--selftest')) {
  process.exit(selftest());
} else {
  const { map, root, args } = parseMap(argv);
  const P = paths(map, root);
  const files = filesFromArgs(args, P);
  if (!files.length) { console.error(`没有找到要检查的 .lua（地图「${map}」→ ${P.code}；用法见文件头）`); process.exit(2); }
  console.log(`地图「${map}」｜目录 ${P.code}｜扫 ${files.length} 个文件`);
  let bad = 0;
  for (const f of files) {
    let src;
    try { src = readFileSync(f, 'utf8'); } catch (e) { console.log(`SKIP ${f}（读不到：${e.message}）`); continue; }
    bad += report(basename(f), analyze(src), checkControlNames(src)) ? 1 : 0;
  }
  console.log(bad ? `\n${bad} 个文件有 error 级问题 ✗` : '\n全部通过 ✓');
  process.exit(bad ? 1 : 0);
}
