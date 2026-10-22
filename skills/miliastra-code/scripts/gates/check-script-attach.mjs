// ── 技能自带快照（miliastra-code/scripts/gates/）────────────────
// 源：Desktop\yuanshen\tools\check-script-attach.mjs（**工程工作区是唯一真身**，本文件只是快照）
// 差异：仅本溯源头 + import 路径改写（`../packages/dsh-miliastra/lib/lualint.mjs` → `./lualint.mjs`）；**判据未改一字**
// 刷新：`node scripts/gates/… ` 见同目录 README.md「刷新方法」
// ────────────────────────────────────────────────────────────
/**
 * 从地图存档 .gil 里判断「客户端脚本有没有被挂到控件上」。
 *
 * 依据（2026-09-25 在关卡 1073741835 的六脚本工程上重新实测并修好）：
 *   · 脚本映射表 = 顶层 `#50` 的每条 `#1` 子消息：`#1` 映射索引 / `#2` 脚本名 / `#3` 文件名 / `#5` 源码全文
 *   · **挂载引用** = 任意层级里的 `#5 { #1 槽位号, #2 脚本映射索引 }`；`#2` 落在映射表里才算一条
 *     （「离它最近的那层 `#1` 字符串」就是挂在哪个控件/容器上）
 *   ⇒ 被 N 个控件引用 = N；0 = **没有任何控件引用它**（资源记录自己不算）
 *
 * ⚠️ **旧实现为什么不可信**（2026-09-25 同事实测）：它在字节流里找 `.lua` 再往**回数 20 个字节**猜
 *    `0x08` 当 id，于是 id 恒解不出来（输出 `id=null (varint ?)`），每条脚本都判「0 次命中」——
 *    看起来像「都没挂载」，其实**根本没解析出 id**。现在改成**真正的 protobuf 结构解析**；
 *    解析不出结构时**明说 PARSE_FAILED 并且不下结论**（宁可说不知道，也不给一个错结论）。
 *
 * 用法：node tools/check-script-attach.mjs [地图.gil ...]   （不传则自动找所有账号下的存档）
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/* ------------------------------------------------------------------ protobuf 解析 */

const WIRE = new Set([0, 1, 2, 5]);
const readVarint = (b, p, end) => {
  let v = 0n;
  let n = 0;
  let x = 0;
  do {
    if (p + n >= end || n >= 10) return null;
    x = b[p + n];
    v |= BigInt(x & 0x7f) << BigInt(7 * n);
    n += 1;
  } while (x & 0x80);
  return { v, n };
};

/** 解析 [start, end) 为字段序列；失败返回 null（严格：必须刚好消费完）。 */
function parse (b, start, end, depth = 0, maxDepth = 10) {
  const fields = [];
  let p = start;
  while (p < end) {
    const key = readVarint(b, p, end);
    if (!key || key.v === 0n) return null;
    p += key.n;
    const no = Number(key.v >> 3n);
    const wt = Number(key.v & 7n);
    if (no <= 0 || !WIRE.has(wt)) return null;
    let value;
    let sub = null;
    if (wt === 0) {
      const r = readVarint(b, p, end);
      if (!r) return null;
      p += r.n;
      value = r.v;
    } else if (wt === 1) {
      if (p + 8 > end) return null;
      value = b.subarray(p, p + 8);
      p += 8;
    } else if (wt === 5) {
      if (p + 4 > end) return null;
      value = b.subarray(p, p + 4);
      p += 4;
    } else {
      const r = readVarint(b, p, end);
      if (!r) return null;
      const len = Number(r.v);
      p += r.n;
      if (len < 0 || p + len > end) return null;
      value = b.subarray(p, p + len);
      if (len > 0 && depth < maxDepth && len <= 1 << 21) sub = parse(b, p, p + len, depth + 1, maxDepth);
      p += len;
    }
    fields.push({ no, wt, value, sub });
  }
  return p === end ? fields : null;
}

/** 找 protobuf 主体（.gil = 20 字节包头 + 主体 + 4 字节尾）。找不到返回 null。 */
function findRoot (buf) {
  const cands = [];
  if (buf.length > 24) {
    const len = ((buf[16] << 24) >>> 0) + (buf[17] << 16) + (buf[18] << 8) + buf[19];
    if (len > 0 && 20 + len <= buf.length) cands.push([20, 20 + len]);
  }
  cands.push([20, buf.length]);
  for (const [s, e] of cands) {
    const f = parse(buf, s, e, 0);
    if (f && f.length) return f;
  }
  return null;
}

const text = (bs) => { const s = Buffer.from(bs).toString('utf8'); return s.includes('\uFFFD') ? null : s; };
const kids = (fields, no, wt) => (fields || []).filter((x) => x.no === no && x.wt === wt);
const firstKid = (fields, no, wt) => kids(fields, no, wt)[0] || null;

/**
 * 解析一个 .gil → `{ok, mappings, refs}`；**解析不出来就 `ok:false`**（调用方不许再下结论）。
 */
export function analyzeGil (buf) {
  const top = findRoot(buf);
  if (!top) return { ok: false, reason: '找不到 protobuf 主体（不是 .gil 的形态？）' };
  const f50 = firstKid(top, 50, 2);
  if (!f50 || !f50.sub) return { ok: false, reason: '存档里没有 `#50` 脚本映射区' };
  const mappings = kids(f50.sub, 1, 2).filter((r) => r.sub).map((r) => {
    const idF = firstKid(r.sub, 1, 0);
    const nameF = firstKid(r.sub, 2, 2);
    const fileF = firstKid(r.sub, 3, 2);
    const srcF = firstKid(r.sub, 5, 2);
    return {
      mappingId: idF ? Number(idF.value) : null,
      name: nameF ? text(nameF.value) : null,
      file: fileF ? text(fileF.value) : null,
      bytes: srcF ? srcF.value.length : 0,
    };
  });
  if (!mappings.length) return { ok: false, reason: '`#50` 里没有任何脚本映射记录（还没挂脚本 / 还没存盘）' };
  if (mappings.some((m) => m.mappingId === null)) return { ok: false, reason: '有脚本映射记录的 `#1`（映射索引）解析不出来' };

  const ids = new Set(mappings.map((m) => m.mappingId));
  const isNameish = (s) => !!s && s.trim().length > 0 && s.trim().length <= 60 && !/[\u0000-\u001f]/.test(s);
  const refs = [];
  const seen = new Set();
  const walk = (fields, depth) => {
    if (!fields || depth > 12) return;
    const own = firstKid(fields, 1, 2);
    const owner = own ? (isNameish(text(own.value)) ? text(own.value).trim() : null) : null;
    for (const f of kids(fields, 5, 2)) {
      if (!f.sub) continue;
      const a = firstKid(f.sub, 1, 0);
      const b = firstKid(f.sub, 2, 0);
      if (!a || !b) continue;
      const slot = Number(a.value);
      const mid = Number(b.value);
      if (!ids.has(mid)) continue;
      const key = slot + ':' + mid;
      if (seen.has(key)) continue;
      seen.add(key);
      refs.push({ slot, mappingId: mid, mountedOn: owner });
    }
    for (const f of fields) if (f.wt === 2 && f.sub) walk(f.sub, depth + 1);
  };
  walk(top, 0);
  return { ok: true, mappings, refs, hasHierarchy: !!firstKid(top, 6, 2), reason: null };
}

/* ------------------------------------------------------------------ CLI */

/** 自动找存档：所有账号目录下的 `<关卡ID>/<关卡ID>.gil`（账号/关卡都会变，**不写死**）。 */
function defaultGils () {
  const base = join(process.env.LOCALAPPDATA || '', '..', 'LocalLow', 'miHoYo');
  const out = [];
  for (const brand of ['原神', '原神 Beta']) {
    const root = join(base, brand, 'BeyondLocal');
    if (!existsSync(root)) continue;
    for (const acc of readdirSync(root)) {
      const saveDir = join(root, acc, 'Beyond_Local_Save_Level');
      if (!existsSync(saveDir)) continue;
      for (const lv of readdirSync(saveDir)) {
        const dd = join(saveDir, lv);
        if (!existsSync(dd) || !statSync(dd).isDirectory()) continue;
        for (const f of readdirSync(dd)) if (f.endsWith('.gil')) out.push(join(dd, f));
      }
    }
  }
  return out;
}

// ⚠️ 技能版补丁（可携带性，第 3 处）：原判据写死 `tools/check-script-attach.mjs` ⇒ 搬到技能目录后
//    认不出自己是主模块 ⇒ **静默什么都不做**（最危险的形态）。改为**按文件名判断**，与所在目录无关。
//    判据逻辑一字未改。
const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').toLowerCase().endsWith('check-script-attach.mjs');
if (isMain) {
  const files = process.argv.slice(2).length ? process.argv.slice(2) : defaultGils();
  if (!files.length) console.log('没找到任何 .gil —— 传路径进来：node check-script-attach.mjs <地图.gil>');
  for (const f of files) {
    let buf;
    try { buf = readFileSync(f); } catch (e) { console.log(`\n===== ${f} =====\n  读不到：${e.message}`); continue; }
    console.log(`\n===== ${f}  (${buf.length} 字节) =====`);
    const r = analyzeGil(buf);
    if (!r.ok) {
      // ★ 解析失败就**明说解析失败、不下结论**（旧实现会在这种情况下照样打印「没有任何控件引用」）
      console.log(`  PARSE_FAILED: ${r.reason} —— **结论不可用**，别看下面的机会主义猜测`);
      continue;
    }
    const refCount = new Map();
    for (const ref of r.refs) refCount.set(ref.mappingId, (refCount.get(ref.mappingId) || 0) + 1);
    for (const m of r.mappings) {
      const n = refCount.get(m.mappingId) || 0;
      console.log(`  脚本: 名字=${JSON.stringify(m.name)} 路径=${JSON.stringify(m.file)} mappingId=${m.mappingId} 源码=${m.bytes} 字节`);
      if (n > 0) {
        const owners = [...new Set(r.refs.filter((x) => x.mappingId === m.mappingId).map((x) => x.mountedOn || '(未命名节点)'))];
        console.log(`  被 ${n} 个控件引用 → ✅ 已挂载（挂在：${owners.join(' / ')}）`);
      } else {
        console.log('  被 0 个控件引用 → ❌ 只有资源记录自己（没有任何控件引用它）');
      }
    }
    if (!r.hasHierarchy) {
      console.log('  ⚠️ 这张存档里没有 `#6` 界面控件组层级 —— 「0 引用」只说明没有挂载引用记录，');
      console.log('     不能排除「这张存档的结构与我实测过的版本不同」（对照工具：tools/gil-clientui.mjs）');
    }
  }
}
