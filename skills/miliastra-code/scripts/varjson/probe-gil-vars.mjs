#!/usr/bin/env node
/**
 * probe-gil-vars.mjs —— **只读**探针：把 `.gil` 里「实体自定义变量」的默认值字段挖出来
 *
 * 目的：确认当前关卡那 25 个「…升级需求」变量的 `typeCode 27` 到底是什么形态
 *       （插件的 VAR_TYPES 表只到 25:结构体，27 落在表外 ⇒ 工具如实标"未知类型 27"）。
 *
 * 为什么能挖：`lib/gilnodes.mjs` 解析到了 `valField`（变量默认值字段），
 * 但只回了布尔 `hasDefault`（L314），**没回内容**。本脚本把那一层原样 dump 出来。
 *
 * 边界：**只读**。不写任何文件、不改 .gil、不碰游戏进程。
 *
 * 用法：
 *   node probe-gil-vars.mjs <关卡.gil> [--entity 关卡实体] [--deep <变量名子串>] [--depth 4]
 */

import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

// ── 定位插件（借它的 protobuf 原始字段解析器，不自己造轮子）──
function locate() {
  const appdata = process.env.APPDATA || join(process.env.USERPROFILE || '', 'AppData', 'Roaming');
  const cands = [
    process.env.MILI_PLUGIN,
    join(appdata, 'dsh-desktop', 'harness', 'profiles', 'web', 'node_modules', 'dsh-miliastra'),
    join(appdata, 'dsh-desktop', 'harness', 'profiles', 'default', 'node_modules', 'dsh-miliastra'),
  ].filter(Boolean);
  for (const c of cands) if (fs.existsSync(c)) return c;
  throw new Error('找不到 dsh-miliastra 插件目录（可设环境变量 MILI_PLUGIN）');
}

const argv = process.argv.slice(2);
const gilPath = argv.find((a) => !a.startsWith('--'));
if (!gilPath) {
  console.error('用法: node probe-gil-vars.mjs <关卡.gil> [--entity 关卡实体] [--deep 变量名] [--depth 4]');
  process.exit(1);
}
const opt = (name, dflt = null) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt;
};
const entityFilter = opt('entity');
const deepFilter = opt('deep');
const maxDepth = Number(opt('depth', 4));

const pluginDir = locate();
const wire = await import(pathToFileURL(join(pluginDir, 'lib', 'wire.mjs')).href);
const { findProtobufRoot } = wire;

// ── gilnodes.mjs 的同款小工具（那几个函数没导出，这里按同样口径复刻）──
const kids = (f, no) => (f && f.sub ? f.sub.filter((x) => x.no === no) : []);
const one = (f, no) => kids(f, no)[0] || null;
const numOf = (f, no) => { const g = one(f, no); return g && g.wt === 0 ? Number(g.value) : null; };
const uv = (bs) => {
  if (!bs || !bs.length) return null;
  const b = Buffer.isBuffer(bs) ? bs : Buffer.from(bs);
  const s = b.toString('utf8');
  if (s.includes('\uFFFD')) return null;
  const t = s.trim();
  return t && /^[\x20-\x7e\u3000-\u9fff\uff00-\uffef]+$/.test(t) ? t : null;
};
const txtOf = (f, no) => { const g = one(f, no); return g && g.wt === 2 ? uv(g.value) : null; };
const deepTxtOf = (f, depth) => {
  if (!f || f.wt !== 2) return null;
  const direct = uv(f.value);
  if (direct) return direct;
  if ((depth || 0) > 3) return null;
  for (const g of f.sub || []) { const t = deepTxtOf(g, depth + 1); if (t) return t; }
  return null;
};

// ── 字段树 dump ──
const hex = (b, n = 24) => Buffer.from(b).subarray(0, n).toString('hex') + (b.length > n ? `…(${b.length}B)` : '');

function dump(f, depth = 0) {
  if (!f) return null;
  const o = { '#': f.no, wt: f.wt };
  if (f.wt === 0) o.v = Number(f.value);
  else if (f.wt === 2) {
    const b = Buffer.isBuffer(f.value) ? f.value : Buffer.from(f.value || []);
    const s = uv(b);
    if (s !== null && s !== '') o.text = s.length > 40 ? s.slice(0, 40) + '…' : s;
    else o.bytes = hex(b);
  } else if (f.wt === 5) {
    const b = Buffer.isBuffer(f.value) ? f.value : Buffer.from(f.value || []);
    o.f32 = b.length >= 4 ? b.readFloatLE(0) : null;
  } else o.raw = hex(f.value || []);
  if (f.sub && f.sub.length && depth < maxDepth) o.sub = f.sub.map((x) => dump(x, depth + 1));
  else if (f.sub && f.sub.length) o.subCount = f.sub.length;
  return o;
}

// ── 主流程 ──
const buf = fs.readFileSync(gilPath);
const root = findProtobufRoot(buf);
if (!root) { console.error('✗ 解析失败：找不到 protobuf 主体'); process.exit(2); }
const top = root.fields;

// top 本身是**字段数组**（wire.mjs 的 findProtobufRoot().fields），不是带 .sub 的对象
const regions = (top || []).filter((f) => f.no === 5);
console.log(`文件   : ${gilPath}（${buf.length} B）`);
console.log(`顶层#5 : ${regions.length} 个区`);
console.log('');

let entityCount = 0, varTotal = 0;
const typeHist = new Map();

for (const region of regions) {
  for (const e of kids(region, 1)) {
    // 实体名（与 gilnodes 同口径：#5[槽1].#11 深取）
    let name = null;
    for (const s5 of kids(e, 5)) {
      if (numOf(s5, 1) === 1) { const t = deepTxtOf(one(s5, 11), 0); if (t && !name) name = t; }
    }
    const vars = [];
    for (const s7 of kids(e, 7)) {
      const s11 = one(s7, 11);
      if (!s11) continue;
      for (const it of kids(s11, 1)) {
        const vname = txtOf(it, 2);
        if (!vname) continue;
        const typeCode = numOf(it, 3);
        const wrap = one(it, 4);
        const valueFieldNo = wrap ? (wrap.sub || []).filter((x) => x.no > 2).map((x) => x.no)[0] : null;
        const valField = wrap && valueFieldNo != null ? one(wrap, valueFieldNo) : null;
        vars.push({ vname, typeCode, wrap, valueFieldNo, valField });
      }
    }
    if (!vars.length) continue;
    entityCount++;
    if (entityFilter && !(name || '').includes(entityFilter)) continue;

    console.log(`━━ 实体「${name || '(无名)'}」　变量 ${vars.length} 个 ━━`);
    for (const v of vars) {
      varTotal++;
      typeHist.set(v.typeCode, (typeHist.get(v.typeCode) || 0) + 1);
      const vb = v.valField ? (Buffer.isBuffer(v.valField.value) ? v.valField.value : Buffer.from(v.valField.value || [])) : null;
      console.log(`  · ${v.vname}`);
      console.log(`      typeCode=${v.typeCode}　值字段=#${v.valueFieldNo}　wt=${v.valField?.wt}　字节=${vb ? vb.length : 0}`);
      if (deepFilter && v.vname.includes(deepFilter) && v.valField) {
        console.log('      dump = ' + JSON.stringify(dump(v.valField, 0), null, 2).split('\n').join('\n      '));
      } else if (vb) {
        console.log(`      预览 = ${hex(vb, 40)}`);
      }
    }
    console.log('');
  }
}

console.log('━━ 汇总 ━━');
console.log(`实体 ${entityCount} 个（有变量的），变量 ${varTotal} 个`);
console.log('typeCode 分布: ' + [...typeHist.entries()].map(([k, c]) => `${k}×${c}`).join(', '));
