// ── 技能自带快照（miliastra-code/scripts/gates/）────────────────
// 源：Desktop\yuanshen\tools\gil-clientui.mjs（**工程工作区是唯一真身**，本文件只是快照）
// 差异：仅本溯源头 + import 路径改写（`../packages/dsh-miliastra/lib/lualint.mjs` → `./lualint.mjs`）；**判据未改一字**
// 刷新：`node scripts/gates/… ` 见同目录 README.md「刷新方法」
// ────────────────────────────────────────────────────────────
// 从 .gil 里读出「客户端控件配置」：每条控件的 控件模板索引 / 名字 / 子节点 / 所属层级根
// **以及脚本区**（0.3.1 补）：脚本映射表 + 控件→脚本引用
//
// 用法：node tools/gil-clientui.mjs <xxx.gil> [--out 文件]
//
// 依赖已实测的结构（tools/gil-dump.mjs 解析出的真实字段路径）：
//   .gil = [20 字节包头] + [protobuf 主体] + [4 字节尾]
//   控件记录 = 一个 message，内含：
//     #501 varint           ← 控件模板索引（prefabIndex）
//     #503 bytes            ← 子节点索引列表（连续 varint）
//     #505 → #12 → #501 str ← 控件名字
//   层级根标记（字符串）：
//     "ClientUIRootHierarchyRoot"       主屏客户端控件容器画布
//     "ClientUIPrototypeHierarchyRoot"  客户端控件模板
//     "ExclusiveEleGroupHierarchyRoot"  其它
//
//   脚本区（2026-09-25 实测，关卡 1073741835 六脚本工程）：
//     #50 → #1 ×N { #1 varint 映射索引、#2 str 脚本名、#3 str 文件名、#5 bytes 源码全文 }
//     #6  → #1 → … → #5 { #1 varint 槽位号、#2 varint 脚本映射索引 }   ← **挂载引用**
//     判据：**只有 `#2` 落在 `#50` 的映射索引集合里**才算一条挂载引用；
//           「离这条 `#5` 最近的那层 `#1` 字符串」就是它挂在哪个控件/容器上。
//     ⚠️ 别用「映射索引在文件里出现几次」代替它 —— 分不清资源记录的自引用与控件的挂载引用。

import fs from 'node:fs'

const argv = process.argv.slice(2)
const file = argv[0]
if (!file) { console.error('用法：node tools/gil-clientui.mjs <xxx.gil> [--out 文件]'); process.exit(1) }
const outIdx = argv.indexOf('--out')
const outFile = outIdx >= 0 ? argv[outIdx + 1] : null

const buf = fs.readFileSync(file)

function readVarint (b, p, end) {
  let v = 0n, n = 0, x
  do { if (p + n >= end) return null; x = b[p + n]; v |= BigInt(x & 0x7f) << BigInt(7 * n); n++ } while (x & 0x80 && n < 10)
  return { v, n }
}

const W = new Set([0, 1, 2, 5])
function parse (b, start, end) {
  const fields = []
  let p = start
  while (p < end) {
    const key = readVarint(b, p, end); if (!key || key.v === 0n) return null
    p += key.n
    const fieldNo = Number(key.v >> 3n), wt = Number(key.v & 7n)
    if (fieldNo <= 0 || !W.has(wt)) return null
    let val
    if (wt === 0) { const r = readVarint(b, p, end); if (!r) return null; p += r.n; val = r.v }
    else if (wt === 1) { if (p + 8 > end) return null; val = b.slice(p, p + 8); p += 8 }
    else if (wt === 5) { if (p + 4 > end) return null; val = b.slice(p, p + 4); p += 4 }
    else {
      const r = readVarint(b, p, end); if (!r) return null
      const len = Number(r.v); p += r.n
      if (len < 0 || p + len > end) return null
      const sub = p + len - len
      const subFields = (len > 0 && len < 1 << 20) ? parse(b, sub, p + len) : null
      val = { bytes: b.slice(sub, p + len), sub: subFields }
      p += len
    }
    fields.push({ fieldNo, wt, val })
  }
  return p === end ? fields : null
}

const be32 = (o) => (buf[o] << 24 >>> 0) + (buf[o + 1] << 16) + (buf[o + 2] << 8) + buf[o + 3]
let root = null, start = 20, end = buf.length
if (buf.length > 24) {
  const len = be32(16)
  if (len > 0 && 20 + len <= buf.length) root = parse(buf, 20, 20 + len) && { s: 20, e: 20 + len }
}
if (root) { start = root.s; end = root.e } else { start = 0; end = buf.length }
const top = parse(buf, start, end)
if (!top) { console.error('解析失败'); process.exit(2) }

const text = (bs) => { const s = bs.toString('utf8'); return s.includes('\uFFFD') ? null : s }
const decodeIds = (bs) => {
  const ids = []
  let i = 0
  while (i < bs.length) {
    let v = 0n, n = 0, x
    do { if (i + n >= bs.length) return null; x = bs[i + n]; v |= BigInt(x & 0x7f) << BigInt(7 * n); n++ } while (x & 0x80 && n < 10)
    ids.push(Number(v)); i += n
  }
  return ids
}

const records = []
const HIER = ['ClientUIRootHierarchyRoot', 'ClientUIPrototypeHierarchyRoot', 'ExclusiveEleGroupHierarchyRoot']

function walk (fields, hier, depth) {
  // 本层若有层级根字符串，更新上下文
  for (const f of fields) {
    if (f.wt === 2 && f.val.sub === null) {
      const s = text(f.val.bytes)
      if (s && HIER.includes(s)) hier = s
    }
  }
  for (const f of fields) {
    if (f.wt !== 2) continue
    // 先看本 message 是不是一条控件记录
    const idF = f.val.sub && f.val.sub.find((x) => x.fieldNo === 501 && x.wt === 0)
    let name = null
    if (f.val.sub) {
      const m505 = f.val.sub.filter((x) => x.fieldNo === 505 && x.wt === 2 && x.val.sub)
      for (const m of m505) {
        const m12 = m.val.sub.filter((x) => x.fieldNo === 12 && x.wt === 2 && x.val.sub)
        for (const mm of m12) {
          const sF = mm.val.sub.find((x) => x.fieldNo === 501 && x.wt === 2)
          if (sF) { const s = text(sF.val.bytes); if (s && s.trim()) name = s.trim() }
        }
      }
    }
    if (idF && name) {
      const chF = f.val.sub.find((x) => x.fieldNo === 503 && x.wt === 2)
      const parF = f.val.sub.find((x) => x.fieldNo === 504 && x.wt === 0)
      records.push({ id: Number(idF.val), name, hier, parent: parF ? Number(parF.val) : null, children: chF ? decodeIds(chF.val.bytes) : null })
    }
    if (f.val.sub) walk(f.val.sub, hier, depth + 1)
  }
}

walk(top, '(top)', 0)

/* ---------------------------------------------------------------- 脚本区（0.3.1） */

/** 本层字段里有没有某个编号（wt 0 = varint / wt 2 = message）。 */
const kids = (fields, no, wt) => (fields || []).filter((x) => x.fieldNo === no && x.wt === wt)
const firstKid = (fields, no, wt) => kids(fields, no, wt)[0] || null

/** 读一条 `#50 → #1` 脚本映射记录（`#1` 映射索引 / `#2` 脚本名 / `#3` 文件名 / `#5` 源码）。 */
function scriptMappingOf (sub) {
  const idF = firstKid(sub, 1, 0)
  const srcF = firstKid(sub, 5, 2)
  return {
    mappingId: idF ? Number(idF.val) : null,
    name: (() => { const f = firstKid(sub, 2, 2); return f ? text(f.val.bytes) : null })(),
    file: (() => { const f = firstKid(sub, 3, 2); return f ? text(f.val.bytes) : null })(),
    bytes: srcF ? srcF.val.bytes.length : 0,
  }
}

const isNameish = (s) => !!s && s.trim().length > 0 && s.trim().length <= 60 && !/[\u0000-\u001f]/.test(s)

const f50 = firstKid(top, 50, 2)
const mappings = []
if (f50 && f50.val.sub) {
  for (const rec of kids(f50.val.sub, 1, 2)) if (rec.val.sub) mappings.push(scriptMappingOf(rec.val.sub))
}
const mappingIds = new Set(mappings.map((m) => m.mappingId).filter((x) => x !== null))
const nameById = new Map(mappings.map((m) => [m.mappingId, m.name || m.file || '(无名)']))

/** 挂载引用：`#5 {#1 槽位, #2 映射索引}`，`mountedOn` = 最近一层 `#1` 字符串。 */
const refs = []
const seenRef = new Set()
function walkRefs (fields, depth) {
  if (!fields || depth > 12) return
  const own = firstKid(fields, 1, 2)
  const owner = own ? (isNameish(text(own.val.bytes)) ? text(own.val.bytes).trim() : null) : null
  for (const f of kids(fields, 5, 2)) {
    if (!f.val.sub) continue
    const a = firstKid(f.val.sub, 1, 0)
    const b = firstKid(f.val.sub, 2, 0)
    if (!a || !b) continue
    const slot = Number(a.val)
    const mid = Number(b.val)
    if (!mappingIds.has(mid)) continue
    const key = slot + ':' + mid
    if (seenRef.has(key)) continue
    seenRef.add(key)
    refs.push({ slot, mappingId: mid, mountedOn: owner })
  }
  for (const f of fields) if (f.wt === 2 && f.val.sub) walkRefs(f.val.sub, depth + 1)
}
walkRefs(top, 0)

const lines = []
lines.push(`# ${file}`)
lines.push(`# 大小 ${buf.length} 字节，protobuf 主体 [${start}, ${end})`)
lines.push(`# 共识别出客户端控件记录 ${records.length} 条`)
lines.push('')
let curHier = null
for (const r of records) {
  if (r.hier !== curHier) { curHier = r.hier; lines.push(`===== ${curHier} =====`) }
  lines.push(`  ${r.id}  ${r.name}${r.parent != null ? '   parent=' + r.parent : ''}${r.children && r.children.length ? '   子节点=[' + r.children.join(', ') + ']' : ''}`)
}
// 也在每一层级内重排一份便于人工比对
lines.push('')
lines.push('# 按层级归组')
const byHier = {}
for (const r of records) (byHier[r.hier] = byHier[r.hier] || []).push(r)
for (const h of Object.keys(byHier)) {
  lines.push(`## ${h}（${byHier[h].length} 条）`)
  for (const r of byHier[h]) lines.push(`   ${r.id}  ${r.name}`)
}

// ---- 脚本区（0.3.1 补：核「哪个控件挂了哪些脚本」以前只能绕道 scan-gil-ids.mjs） ----
lines.push('')
lines.push('===== 脚本映射表 =====')
if (!mappings.length) {
  lines.push('  （这张存档里没有脚本映射记录 —— 编辑器还没把脚本挂到这个关卡上，或还没存盘）')
} else {
  const mountedIds = new Set(refs.map((r) => r.mappingId))
  for (const m of mappings) {
    lines.push(`  mappingId=${m.mappingId}  name=${JSON.stringify(m.name)}  file=${JSON.stringify(m.file)}  源码 ${m.bytes} 字节`
      + `  ${mountedIds.has(m.mappingId) ? '★已挂载' : '（无挂载引用）'}`)
  }
}

lines.push('')
lines.push('===== 控件→脚本引用 =====')
if (!refs.length) {
  lines.push('  （没有任何控件/容器引用脚本映射 —— 脚本都还没挂上去）')
} else {
  for (const r of refs) {
    lines.push(`  controlId=${r.mountedOn || '(未命名节点)'}  slot=${r.slot}  scriptMappingId=${r.mappingId}  scriptName=${JSON.stringify(nameById.get(r.mappingId) || '?')}`)
  }
}

const out = lines.join('\n') + '\n'
if (outFile) { fs.writeFileSync(outFile, out, 'utf8'); console.error(`已写出 ${outFile}`) } else process.stdout.write(out)
