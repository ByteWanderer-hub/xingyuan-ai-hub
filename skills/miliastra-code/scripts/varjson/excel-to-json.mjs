#!/usr/bin/env node
/**
 * excel-to-json.mjs —— Excel / CSV → 千星「自定义变量 JSON」（可直接导入千星编辑器）
 *
 * ── 支持两种表 ────────────────────────────────────────────────
 *  ① 宽表（**你那张 Excel 的样子**）：两行表头 + 每两列一组
 *       行1:  字典名 | 铜币升级需求 | 字典名 | 银币升级需求
 *       行2:  整数   | 浮点数        | 整数   | 浮点数
 *       行3+: 1      | 30           | 1      | 30
 *       ⇒ 产出 **字典** 变量：{1: 30.00, 2: 45.00, 3: 58.00}
 *  ② 长表（结构体）：列 variable, key, param_type, value，一行一个字段
 *       ⇒ 产出 **结构体** 变量
 *
 * ── 为什么格式不会错 ──────────────────────────────────────────
 * 值节点**不自己拼**，直接调用插件 `lib/structvar/build.mjs` 的 `toParamNode()`
 * （= `miliastra_gen op=struct-json` 的底层实现）：
 *   · 字典 → { param_type:'Dict', value:{ type:'Dict', key_type, value_type, value:[{key,value}…] } }
 *   · 结构体 → { param_type:'Struct', value:{ structId, type:'Struct', value:[ParamNode…] } }
 * 中文类型名（整数/浮点数/字符串…）用插件自己的 TYPE_LABELS 反查，不另造一套。
 *
 * ── 用法 ─────────────────────────────────────────────────────
 *   node excel-to-json.mjs --in 表.csv --out-dir out
 *   node excel-to-json.mjs --in 表.csv --dry-run          # 只解析、只打印，不写盘
 *   node excel-to-json.mjs --in 表.csv --out-dir out --struct-id 1234567890   # 长表用
 *
 * ── 边界（重要）─────────────────────────────────────────────
 * **不写 .gil、不建变量**。插件对关卡存档是纯只读（`gilnodes.mjs` 第 2 行：
 * 「只读，一个字节都不写」），它自己的 nextStep 也写着「这一步必须人在编辑器里做」。
 * 本工具只产 JSON，导入那一下由你在千星编辑器里点。
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';

// ───────────────────────── 参数 ─────────────────────────

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const n = argv[i + 1];
      if (n === undefined || n.startsWith('--')) out[k] = true;
      else { out[k] = n; i++; }
    } else out._.push(a);
  }
  return out;
}
const argv = parseArgs(process.argv.slice(2));

// 帮助文本；`--in -` / 不给 --in 时从 stdin 读（Excel 直接复制的表格是 TSV）
function showHelp() {
  console.log(`excel-to-json.mjs —— Excel/CSV → 千星自定义变量 JSON

用法:
  node excel-to-json.mjs --in <表.csv> --out-dir <目录> [选项]

选项:
  --in <path>        输入 CSV（必需）
  --out-dir <dir>    输出目录（默认 ./out）
  --struct-id <id>   长表模式的结构体 ID（10 位数字）
  --name <名字>      强制指定变量名（宽表里已有，一般不用）
  --dry-run          只解析、只打印，不写任何文件
  --plugin-dir <d>   手动指定 dsh-miliastra 插件目录

宽表（两行表头，每两列一组）:
  字典名,铜币升级需求,字典名,银币升级需求
  整数,浮点数,整数,浮点数
  1,30,1,30
  …

长表（结构体）:
  variable,struct_id,key,param_type,value
  伙伴升级需求,1234567893,等级,Int32,3
`);
}
if (argv.help) { showHelp(); process.exit(0); }

const inputArg = argv.in || argv._[0] || '-';
const useStdin = String(inputArg) === '-';
const inPath = useStdin ? '(stdin)' : resolve(String(inputArg));
const outDir = resolve(String(argv['out-dir'] || 'out'));
const dryRun = argv['dry-run'] === true;
const defaultStructId = argv['struct-id'] ? String(argv['struct-id']) : null;

// ───────────────────── 借插件的构造器与类型表 ─────────────────────

function locatePlugin() {
  if (argv['plugin-dir']) return resolve(String(argv['plugin-dir']));
  const appdata = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming');
  const cands = [
    join(appdata, 'dsh-desktop', 'harness', 'profiles', 'web', 'node_modules', 'dsh-miliastra'),
    join(appdata, 'dsh-desktop', 'harness', 'profiles', 'default', 'node_modules', 'dsh-miliastra'),
    join(appdata, 'npm', 'node_modules', 'dsh-miliastra'),
  ];
  for (const c of cands) if (existsSync(c)) return c;
  throw new Error('找不到 dsh-miliastra 插件目录（用 --plugin-dir 指定）');
}

const pluginDir = locatePlugin();
const buildMod = await import(pathToFileURL(join(pluginDir, 'lib', 'structvar', 'build.mjs')).href);
const modelMod = await import(pathToFileURL(join(pluginDir, 'lib', 'structvar', 'model.mjs')).href);
const { toParamNode, structJson } = buildMod;
const { PARAM_TYPES, TYPE_LABELS } = modelMod;

/** 中文标签 / 英文名 → 千星 ParamType（整数→Int32、浮点数→Float…）。 */
const LABEL_TO_TYPE = Object.fromEntries(
  Object.entries(TYPE_LABELS).map(([t, label]) => [String(label).trim(), t]),
);
function toParamType(raw, where) {
  const s = String(raw == null ? '' : raw).trim();
  if (!s) return null;
  if (PARAM_TYPES.includes(s)) return s;                 // 已是英文名
  if (LABEL_TO_TYPE[s]) return LABEL_TO_TYPE[s];         // 中文标签
  throw new Error(`${where}: 认不出类型「${s}」—— 可用：${PARAM_TYPES.join(' / ')}，或中文标签 ${Object.values(TYPE_LABELS).join(' / ')}`);
}

// ───────────────────────── CSV 读入（零依赖）─────────────────────────

/** 中文 Excel「另存为 CSV」默认写 GBK；先 UTF-8，见替换字符就回退。 */
function decodeCsv(buf) {
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return { text: buf.subarray(3).toString('utf8'), encoding: 'utf-8 (去 BOM)' };
  }
  const utf8 = buf.toString('utf8');
  if (!utf8.includes('\uFFFD')) return { text: utf8, encoding: 'utf-8' };
  try {
    const gbk = new TextDecoder('gbk', { fatal: false }).decode(buf);
    if (!gbk.includes('\uFFFD')) return { text: gbk, encoding: 'gbk（自动回退）' };
  } catch { /* ICU 无 gbk */ }
  return { text: utf8, encoding: 'utf-8（⚠️ 疑似乱码，建议改用「CSV UTF-8」另存）' };
}

function parseCsv(text, sep = ',') {
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === sep) { row.push(field); field = ''; }
    else if (c === '\r') { /* skip */ }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
}

// 输入：文件，或 stdin（`--in -` / 不给 --in）。Excel 直接复制出来的表格是 **TSV**（制表符分隔），
// 所以分隔符自动判定：首行里制表符比逗号多就用 \t。
// ⚠️ Windows 上 `readFileSync(0)` 对重定向的 stdin 常常读不到 ⇒ 必须走异步流。
async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks);
}
let buf;
if (useStdin) {
  buf = await readStdin();
  if (!buf.length) {
    console.error('✗ 没有从 stdin 读到任何数据。\n');
    showHelp();
    process.exit(1);
  }
} else {
  buf = readFileSync(inPath);
}
const { text, encoding } = decodeCsv(buf);
const firstLine = text.split(/\r?\n/, 1)[0] || '';
const sep = firstLine.split('\t').length > firstLine.split(',').length ? '\t' : ',';
const rows = parseCsv(text, sep);
if (rows.length < 3) { console.error(`✗ 至少需要 2 行表头 + 1 行数据，实际 ${rows.length} 行`); process.exit(2); }

const header = rows[0].map((h) => String(h).trim());
const lower = header.map((h) => h.toLowerCase());
const isLong = lower.includes('variable') && lower.includes('param_type');

// ───────────────────────── 模式一：长表 → 结构体 ─────────────────────────

if (isLong) {
  const idx = Object.fromEntries(lower.map((h, i) => [h, i]));
  const cell = (r, n) => (idx[n] === undefined ? '' : String(r[idx[n]] ?? '').trim());
  const groups = new Map();
  for (let n = 1; n < rows.length; n++) {
    const r = rows[n];
    const v = cell(r, 'variable');
    if (!v) continue;
    if (!groups.has(v)) groups.set(v, { sid: cell(r, 'struct_id') || defaultStructId, fields: [] });
    const g = groups.get(v);
    if (!g.sid && cell(r, 'struct_id')) g.sid = cell(r, 'struct_id');
    g.fields.push({ key: cell(r, 'key'), param_type: cell(r, 'param_type'), value: cell(r, 'value') });
  }
  const okList = [], badList = [];
  for (const [variable, g] of groups) {
    if (!g.sid) { badList.push({ variable, error: '没有 struct_id（CSV 没给，也没传 --struct-id）' }); continue; }
    const p = structJson({ structId: g.sid, structName: variable, fields: g.fields, allowLongText: false });
    if (p.ok) okList.push({ variable, p }); else badList.push({ variable, error: p.error });
  }
  report({ mode: '长表 → 结构体', okList, badList });
  writeOut(okList.map(({ variable, p }) => ({ variable, files: { definition: p.definition, value: p.value } })));
  finish(badList);

// ─────────────────── 模式二：宽表（两行表头）→ 字典 ───────────────────

} else {
  const nameRow = header;
  const typeRow = rows[1].map((h) => String(h).trim());
  const width = Math.max(nameRow.length, typeRow.length);

  // 每两列一组：第 1 列 = 键，第 2 列 = 值
  const groups = [];
  const problems = [];
  for (let c = 0; c + 1 < width; c += 2) {
    const keyLabel = nameRow[c];
    const varName = nameRow[c + 1];
    if (!String(varName || '').trim()) { continue; }
    const keyType = toParamType(typeRow[c], `第 ${c + 1} 列的类型`);
    const valType = toParamType(typeRow[c + 1], `第 ${c + 2} 列的类型`);
    groups.push({ c, varName: String(varName).trim(), keyLabel: String(keyLabel || '').trim(), keyType, valType, entries: [] });
  }
  if (!groups.length) {
    console.error(`✗ 宽表解析不出任何分组。第 1 行：${nameRow.join(' | ')}\n  第 2 行：${typeRow.join(' | ')}`);
    process.exit(2);
  }

  for (let n = 2; n < rows.length; n++) {
    const r = rows[n];
    for (const g of groups) {
      const k = String(r[g.c] ?? '').trim();
      const v = String(r[g.c + 1] ?? '').trim();
      if (k === '' && v === '') continue;
      if (k === '') { problems.push(`第 ${n + 1} 行：变量「${g.varName}」的键为空，已跳过`); continue; }
      g.entries.push({ key: k, value: v });
    }
  }

  const okList = [], badList = [];
  for (const g of groups) {
    if (!g.entries.length) { badList.push({ variable: g.varName, error: '没有任何数据行' }); continue; }
    if (!g.keyType || !g.valType) { badList.push({ variable: g.varName, error: '键/值类型没写全' }); continue; }
    try {
      const ctx = { coerced: [], structIds: [] };
      const node = toParamNode(
        { param_type: 'Dict', key_type: g.keyType, value_type: g.valType, value: g.entries },
        `dict[${g.varName}]`, ctx,
      );
      okList.push({ variable: g.varName, node, meta: g });
    } catch (e) {
      badList.push({ variable: g.varName, error: e.message });
    }
  }

  console.log(`\n输入   : ${inPath}`);
  console.log(`编码   : ${encoding}`);
  console.log(`插件   : ${pluginDir}`);
  console.log(`模式   : 宽表（两行表头）→ 字典`);
  console.log(`表头1  : ${nameRow.join(' | ')}`);
  console.log(`表头2  : ${typeRow.join(' | ')}`);
  console.log(`分组   : ${groups.map((g) => `${g.varName}(${g.keyType}→${g.valType}, ${g.entries.length} 项)`).join('　')}\n`);
  for (const o of okList) {
    console.log(`✓ ${o.variable}　${o.meta.keyType} → ${o.meta.valType}　${o.meta.entries.length} 项`);
    console.log(`    ${JSON.stringify(o.meta.entries)}\n`);
  }
  for (const b of badList) console.log(`✗ ${b.variable}　${b.error}`);
  if (problems.length) { console.log('\n数据告警：'); for (const p of problems) console.log(`  ! ${p}`); }

  if (dryRun) { console.log('\n--dry-run：未写任何文件。'); process.exit(badList.length ? 1 : 0); }
  if (!okList.length) { console.error('\n✗ 没有变量通过校验，未写文件。'); process.exit(1); }

  mkdirSync(outDir, { recursive: true });
  const written = [];
  for (const o of okList) {
    const safe = o.variable.replace(/[\\/:*?"<>|]/g, '_');
    // ★ 千星导出的真实格式 = **字典节点本身**，不要外层 `{param_type:'Dict', value:…}` 那层包装。
    //   证据：作者 2026-10-04 提供的真实导出（`千星导出.json`）与本工具生成的**内层逐字段一致**；
    //   两种带包装的形态他都试过，编辑器**都不认** ⇒ 去掉外层。
    const p = join(outDir, `${safe}.json`);
    writeFileSync(p, JSON.stringify(o.node.value, null, 3), 'utf8');
    written.push(p);
  }
  console.log(`\n已写出 ${written.length} 个文件到 ${outDir}：`);
  for (const w of written) console.log(`  ${w}`);
  console.log(`
下一步（必须人在千星编辑器里做）：
  「字典」变量的值 → 用 <变量名>.json
  格式已与「千星真实导出」对拍一致（见 README「格式对拍」）。
  本工具只产 JSON，**不写 .gil、不建变量**。
`);
  process.exit(badList.length ? 1 : 0);
}

// ───────────────────────── 共用尾部 ─────────────────────────

function report({ mode, okList, badList }) {
  console.log(`\n输入   : ${inPath}`);
  console.log(`编码   : ${encoding}`);
  console.log(`插件   : ${pluginDir}`);
  console.log(`模式   : ${mode}`);
  console.log(`变量   : ${okList.length + badList.length} 个（成功 ${okList.length} / 失败 ${badList.length}）\n`);
  for (const o of okList) console.log(`✓ ${o.variable}　structId=${o.p.structId}`);
  for (const b of badList) console.log(`✗ ${b.variable}　${b.error}`);
}

function writeOut(items) {
  if (dryRun) { console.log('\n--dry-run：未写任何文件。'); return; }
  if (!items.length) return;
  mkdirSync(outDir, { recursive: true });
  const written = [];
  for (const it of items) {
    const safe = it.variable.replace(/[\\/:*?"<>|]/g, '_');
    for (const [k, v] of Object.entries(it.files)) {
      const p = join(outDir, `${safe}.${k}.json`);
      writeFileSync(p, JSON.stringify(v, null, 2), 'utf8');
      written.push(p);
    }
  }
  console.log(`\n已写出 ${written.length} 个文件到 ${outDir}：`);
  for (const w of written) console.log(`  ${w}`);
}

function finish(badList) {
  if (dryRun) { console.log('\n--dry-run：未写任何文件。'); process.exit(badList.length ? 1 : 0); }
  console.log('\n下一步：在千星编辑器里导入（这一步必须人做 —— 本工具不写 .gil、不建变量）。');
  process.exit(badList.length ? 1 : 0);
}
