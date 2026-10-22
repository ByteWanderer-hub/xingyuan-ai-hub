#!/usr/bin/env node
// ⚠️ 快照：本文件是 `tools\snapshot-lua-project.mjs` 的副本（2026-10-02 19:23，源 SHA-256 前16位 F6D2A6C72B446ADF）。
// 判据与源文件逐字一致，仅改了 lualint 的 import 路径；**口径以工作区版为准**，刷新见同目录 README.md。
// 技能版用法：给**显式文件/目录**（工作区版的 --map 依赖本机 案子/ 目录，技能里没有）。

/**
 * snapshot-lua-project.mjs —— 整改前的**项目快照**（「规范扫描整改」工作流第 1 步：先备份）
 *
 * 为什么不能用普通 copy 代替：
 *   · 整改会**一次改多份文件**（活文件副本 + 构建源码片段 + 可能需要重新构建的产物），
 *     需要一份"改之前到底长什么样"的**时点快照**；
 *   · 快照要能**核对**（每个文件记 SHA-256）与**还原**（相对路径原样拷回）；
 *   · 目录带时间戳且**拒绝覆盖** —— 不能把上一次的快照冲掉（这是整改唯一的撤销点）。
 *
 * 用法：
 *   node tools/snapshot-lua-project.mjs                     # 默认快照【侦探1】的项目目录（案子/侦探1/2.代码）
 *   node tools/snapshot-lua-project.mjs --map 双相           # 换一张图（★ 加新地图不用改代码）
 *   node tools/snapshot-lua-project.mjs <目录或文件> ...      # 指定目录或文件（可混给）
 *   node tools/snapshot-lua-project.mjs --label 整改前        # 用途标签（写进清单，便于日后认）
 *   node tools/snapshot-lua-project.mjs --restore <快照目录>   # ★ 还原：把清单里的文件逐一拷回原位置
 *   node tools/snapshot-lua-project.mjs --restore <快照目录> --dry-run   # 只报"哪些文件会被还原"
 *   node tools/snapshot-lua-project.mjs --selftest           # 自检（临时目录里验拷贝/清单/防覆盖/还原）
 * 落点：每个项目一份 `<2.代码 目录>/_snapshots/<YYYYMMDD-HHMMSS>[-n]/`
 *   ├─ manifest.json   （createdAt / label / 每个文件的相对路径 · 字节 · SHA-256 · mtime）
 *   └─ project/<项目内相对路径>   （二进制拷贝；构建片段在 2.代码/main/ 之类的子目录里，天然含在内）
 *      · `_outside/<文件名>`     （不在项目目录里的文件 —— **回执里点名**，避免悄悄漏掉）
 * 退出码：0 成功；1 有文件读不到；2 用法错。
 * ★ 路径不写死：项目目录 = 从文件往上走到的那个 `2.代码/`（成品与构建源同目录，2026-10-04 迁移后）。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { join, dirname, resolve, relative, basename, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { DEFAULT_MAP, parseMap, paths } from './_paths.mjs';

const defaultPaths = () => paths(DEFAULT_MAP);

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const stamp = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

/** 项目目录 = 从文件往上走，**找到那个 `2.代码/`**（`案子/侦探1/2.代码/main/x.lua` → `案子/侦探1/2.代码`）。
 *  找不到就退化为文件所在目录（**如实退化，不猜**）。 */
export function projectDirOf(file) {
  let cur = dirname(resolve(file));
  while (true) {
    if (basename(cur) === '2.代码') return cur;
    const parent = dirname(cur);
    if (parent === cur) return dirname(resolve(file));   // 兜底：不在 2.代码/ 下就用文件所在目录
    cur = parent;
  }
}

/** 递归收集 .lua */
export function collectLua(p) {
  const abs = resolve(p);
  if (!existsSync(abs)) return [];
  if (!statSync(abs).isDirectory()) return extname(abs) === '.lua' ? [abs] : [];
  const out = [];
  for (const f of readdirSync(abs)) {
    const child = join(abs, f);
    if (statSync(child).isDirectory()) { if (f !== '_snapshots') out.push(...collectLua(child)); } else if (extname(f) === '.lua') out.push(child);
  }
  return out;
}

/**
 * 快照一批文件。**已存在的目录绝不覆盖**，撞名自动加 `-2/-3`。
 *
 * 分区规则（2026-10-04 起：成品与构建源**同在** `2.代码/`）：
 *   · 文件在项目目录内            → `project/<项目内相对路径>`（构建片段 `main/` 之类天然含在内）
 *   · 其它位置                    → `_outside/<文件名>`（并在回执里点名，避免悄悄漏掉）
 * @returns {{snapshotDirs:string[], groups:Array<{dir:string, files:Array<object>}>}}
 */
export function snapshotFiles(files, { label = '', now = new Date() } = {}) {
  if (!files.length) return { snapshotDirs: [], groups: [] };
  const project = projectDirOf(files[0]);
  const base = stamp(now);
  let dir = join(project, '_snapshots', base);
  for (let n = 2; existsSync(dir); n += 1) dir = join(project, '_snapshots', `${base}-${n}`);
  const entries = [];
  const outside = [];
  for (const f of [...files].map((x) => resolve(x)).sort()) {
    const buf = readFileSync(f);
    let rel;
    if (resolve(f).startsWith(resolve(project) + '\\') || resolve(f).startsWith(resolve(project) + '/')) {
      rel = join('project', relative(project, f));
    } else {
      rel = join('_outside', basename(f));
      outside.push(f);
    }
    const dest = join(dir, rel);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(f, dest);                    // 二进制拷贝（不经过文本解码）
    if (!readFileSync(dest).equals(buf)) throw new Error(`快照校验失败（拷贝后字节不一致）：${rel}`);
    entries.push({ store: rel, origin: f, bytes: buf.length, sha256: sha256(buf), mtime: statSync(f).mtime.toISOString() });
  }
  const manifest = {
    createdAt: now.toISOString(), label, project: relative(process.cwd(), project) || project,
    fileCount: entries.length, outsideOfProject: outside, files: entries,
  };
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  return { snapshotDirs: [dir], groups: [{ dir, files: entries, outside }] };
}

/**
 * 还原一份快照。**还原动作本身也可回滚**：先给"当前状态"打一份快照（标签注明还原目标），再逐文件写回。
 * @returns {{restored:Array, skipped:Array, missing:Array, safetySnapshot:string|null, dryRun:boolean}}
 */
export function restoreSnapshot(snapshotDir, { dryRun = false, now = new Date() } = {}) {
  const manPath = join(snapshotDir, 'manifest.json');
  if (!existsSync(manPath)) throw new Error(`快照清单不存在：${manPath}`);
  const man = JSON.parse(readFileSync(manPath, 'utf8'));
  const changed = [];
  const same = [];
  const missing = [];
  for (const e of man.files) {
    if (!existsSync(e.origin)) { missing.push(e); continue; }
    const cur = sha256(readFileSync(e.origin));
    if (cur === e.sha256) same.push(e); else changed.push({ ...e, currentSha: cur });
  }
  if (dryRun) {
    return { restored: changed, skipped: same, missing, safetySnapshot: null, dryRun: true };
  }
  // ① 先给当前状态留退路（只快照"将被覆盖"的那些文件）
  let safety = null;
  if (changed.length) {
    const r = snapshotFiles(changed.map((e) => e.origin), { label: `还原前（回滚目标：${basename(snapshotDir)}）`, now });
    safety = r.snapshotDirs[0] || null;
  }
  // ② 逐文件写回 + 校验
  const restored = [];
  for (const e of changed) {
    const src = join(snapshotDir, e.store);
    if (!existsSync(src)) { missing.push(e); continue; }
    const buf = readFileSync(src);
    if (sha256(buf) !== e.sha256) throw new Error(`快照自身损坏（SHA 不符）：${e.store}`);
    writeFileSync(e.origin, buf);
    const back = sha256(readFileSync(e.origin));
    if (back !== e.sha256) throw new Error(`还原校验失败：${e.origin}`);
    restored.push(e);
  }
  return { restored, skipped: same, missing, safetySnapshot: safety, dryRun: false };
}

function filesFromArgs(args, P = defaultPaths()) {
  const explicit = args.filter((a) => !a.startsWith('--') && !a.includes('='));
  if (explicit.length) return explicit.flatMap(collectLua);
  return collectLua(P.code);
}

function selftest() {
  const dir = join(tmpdir(), `snapshot-selftest-${Date.now()}`);
  // 夹具**照真实布局搭**：案子/<地图>/2.代码/（成品与构建片段同目录）
  const proj = join(dir, '案子', '示例', '2.代码');
  mkdirSync(join(proj, 'main'), { recursive: true });
  const a = join(proj, '主控 main.lua');
  const b = join(proj, 'main', '01_head.lua');            // 构建片段：**在项目目录内**（2026-10-04 起如此）
  const c = join(dir, '别处', 'x.lua');                    // 项目目录之外 → _outside/
  mkdirSync(dirname(c), { recursive: true });
  writeFileSync(a, '-- a\nprint(1)\n', 'utf8');
  writeFileSync(b, '-- b\nprint(2)\n', 'utf8');
  writeFileSync(c, '-- c\nprint(3)\n', 'utf8');
  let bad = 0;
  const check = (name, ok) => { if (!ok) bad += 1; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); };
  const fixed = new Date('2026-09-25T13:00:00Z');
  const r = snapshotFiles([a, b, c], { label: '自检', now: fixed });
  check('一个项目 → 一个快照目录', r.groups.length === 1);
  const g = r.groups[0];
  check('项目目录 = 那个 2.代码/（新规则）', projectDirOf(a) === proj && projectDirOf(b) === proj);
  check('清单记了 3 个文件', g.files.length === 3);
  check('清单 SHA 与源文件一致', g.files.every((e) => e.sha256 === sha256(readFileSync(e.origin))));
  check('项目内子目录保留（project/ 前缀）', g.files.some((e) => e.store === join('project', 'main', '01_head.lua')));
  check('项目外的文件进 _outside/ 分区', g.files.some((e) => e.store === join('_outside', 'x.lua')));
  check('拷贝是二进制等价的', readFileSync(join(g.dir, 'project', '主控 main.lua')).equals(readFileSync(a)));
  check('manifest.json 落盘', existsSync(join(g.dir, 'manifest.json')));
  const r2 = snapshotFiles([a], { label: '自检2', now: fixed });
  check('同一秒再快照不覆盖（自动加后缀）', r2.groups[0].dir !== g.dir);
  // 非 .lua 不收集
  writeFileSync(join(proj, 'notes.txt'), 'x', 'utf8');
  check('只收集 .lua', collectLua(proj).length === 2);
  // ★ 2026-10-04：快照目录自己在 2.代码/_snapshots/ 里，必须**不会被再次收进来**（否则越滚越大）
  check('_snapshots 不被递归收进来', collectLua(proj).every((p) => !p.includes('_snapshots')));
  // 还原：改坏一个文件 → 还原 → 字节回到快照版本；还原前自动留退路
  writeFileSync(a, '-- a 被改坏了\nprint(99)\n', 'utf8');
  const dry = restoreSnapshot(g.dir, { dryRun: true });
  check('还原预览：认出被改动的文件', dry.restored.length === 1 && dry.skipped.length === 2);
  const rr = restoreSnapshot(g.dir, { now: new Date('2026-09-25T14:00:00Z') });
  check('还原：内容回到快照版本', readFileSync(a, 'utf8') === '-- a\nprint(1)\n');
  check('还原：留下了"还原前"退路快照', !!rr.safetySnapshot && existsSync(rr.safetySnapshot));
  check('还原：没动本来就一致的文件', rr.skipped.length === 2 && rr.restored.length === 1);
  console.log(bad === 0 ? '\n自检通过 ✓' : `\n自检失败 ${bad} 例 ✗`);
  return bad === 0 ? 0 : 1;
}

const isMainModule = !!process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  const argv = process.argv.slice(2);
  if (argv.includes('--selftest')) process.exit(selftest());
  const ri = argv.indexOf('--restore');
  if (ri >= 0) {
    const dir = argv[ri + 1];
    if (!dir || dir.startsWith('--')) { console.error('用法：--restore <快照目录> [--dry-run]'); process.exit(2); }
    const dry = argv.includes('--dry-run');
    const r = restoreSnapshot(resolve(dir), { dryRun: dry });
    console.log(`${dry ? '还原预览（未写入）' : '还原完成'}：${resolve(dir)}`);
    for (const e of r.restored) console.log(`  ${dry ? '将被还原' : '已还原'}  ${e.store}  →  ${e.origin}`);
    if (r.skipped.length) console.log(`  （${r.skipped.length} 个文件与快照已一致，跳过）`);
    if (r.missing.length) console.log(`  ⚠️ ${r.missing.length} 个文件缺失或快照里没有，未处理`);
    if (r.safetySnapshot) console.log(`\n还原前已给"当前状态"留退路快照：${r.safetySnapshot}`);
    process.exit(0);
  }
  const li = argv.indexOf('--label');
  const label = li >= 0 && argv[li + 1] && !argv[li + 1].startsWith('--') ? argv[li + 1] : '';
  // ⚠️ 这里**绝不能**把位置参数当 --root：本脚本的位置参数就是"要快照的路径"（与 build-main 相反）。
  let map = DEFAULT_MAP;
  let parsed;
  try { parsed = parseMap(argv, { fallback: DEFAULT_MAP }); map = parsed.map; } catch (e) { console.error('❌ ' + e.message); process.exit(2); }
  const P = paths(map, parsed.root);
  const files = filesFromArgs(parsed.args, P);
  if (!files.length) { console.error(`没有找到要快照的 .lua（地图「${map}」→ ${P.code}；用法见文件头）`); process.exit(2); }
  console.log(`地图「${map}」｜项目目录 ${P.code}｜快照 ${files.length} 个 .lua`);
  const r = snapshotFiles(files, { label });
  for (const g of r.groups) {
    const bytes = g.files.reduce((s, f) => s + f.bytes, 0);
    console.log(`快照完成：${g.dir}`);
    console.log(`  ${g.files.length} 个文件 / ${bytes} 字节${label ? ` / 标签「${label}」` : ''}`);
  }
  console.log('\n还原（逐文件二进制拷回）：');
  for (const g of r.groups) {
    console.log(`  Copy-Item "${g.dir}\\<相对路径>" "<项目目录>\\<相对路径>" -Force   # 清单见 ${g.dir}\\manifest.json`);
  }
  process.exit(0);
}
