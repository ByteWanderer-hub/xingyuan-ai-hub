// ── 技能自带快照（miliastra-code/scripts/gates/）────────────────
// 源：Desktop\yuanshen\tools\scan-gil-ids.mjs（**工程工作区是唯一真身**，本文件只是快照）
// 差异：仅本溯源头 + import 路径改写（`../packages/dsh-miliastra/lib/lualint.mjs` → `./lualint.mjs`）；**判据未改一字**
// 刷新：`node scripts/gates/… ` 见同目录 README.md「刷新方法」
// ────────────────────────────────────────────────────────────
/**
 * 正确地把地图存档 .gil 里所有「高位对象 id」（1073741824+）扫出来。
 *
 * ⚠️ 以前的版本用固定字节模式 [x,80,80,80,04] 匹配，**只能命中 1073741824+k（k<128）**，
 *    一旦 id 里出现非零中间字节（如 1073741952 = 80 81 80 80 04）就会漏掉。这里改成真正的 varint 解码。
 *
 * 用法：node tools/scan-gil-ids.mjs [.gil 路径]
 */
import { readFileSync } from 'node:fs';

const file = process.argv[2] ?? 'C:/Users/Administrator/AppData/LocalLow/miHoYo/原神/BeyondLocal/201170108/Beyond_Local_Save_Level/1073741831/1073741831.gil';
const b = readFileSync(file);

const decode = (i) => {
  let v = 0, shift = 0, j = i;
  for (; j < b.length && j < i + 5; j++) {
    const byte = b[j];
    v += (byte & 0x7f) * 2 ** shift;
    shift += 7;
    if (!(byte & 0x80)) return { v, len: j - i + 1 };
  }
  return null;
};

const hits = [];
for (let i = 0; i < b.length; i++) {
  if (!(b[i] & 0x80)) continue;           // 高位 id 的首字节一定有续位
  const d = decode(i);
  if (d && d.v >= 1073741824 && d.v < 1073742200) hits.push({ i, id: d.v });
}

const byId = new Map();
for (const h of hits) byId.set(h.id, (byId.get(h.id) ?? 0) + 1);

console.log(`${file}\n${b.length} 字节，命中 ${hits.length} 处，去重 ${byId.size} 个 id\n`);
for (const [id, c] of [...byId].sort((a, z) => a[0] - z[0])) {
  const f = hits.find((h) => h.id === id);
  const seg = b.slice(Math.max(0, f.i - 80), f.i + 80).toString('utf8');
  const ctx = [...seg.matchAll(/[\u4e00-\u9fffA-Za-z0-9_\.\/ -]{2,}/g)].map((m) => m[0]).join(' | ');
  console.log(`  ${id}  x${String(c).padStart(2)}   ${ctx}`);
}

// 顺带报告「页面里出现的名字」，便于人工对号
const names = ['客户端控件容器', '容器节点', '图片', '文本框', '文本视窗', '客户端控件模板'];
console.log('\n关键字命中：');
for (const n of names) console.log(`  ${n.padEnd(10)} x${b.toString('utf8').split(n).length - 1}`);
