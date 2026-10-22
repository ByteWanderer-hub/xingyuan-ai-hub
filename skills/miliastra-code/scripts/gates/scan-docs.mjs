// ── 技能自带快照（miliastra-code/scripts/gates/）────────────────
// 源：Desktop\yuanshen\tools\scan-docs.mjs（**工程工作区是唯一真身**，本文件只是快照）
// 差异：仅本溯源头 + import 路径改写（`../packages/dsh-miliastra/lib/lualint.mjs` → `./lualint.mjs`）；**判据未改一字**
// 刷新：`node scripts/gates/… ` 见同目录 README.md「刷新方法」
// ────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs';
const tm = JSON.parse(readFileSync('docs/官方文档-7.1正式/_原始json/textMap.json', 'utf8'));
const cat = JSON.parse(readFileSync('docs/官方文档-7.1正式/_原始json/catalog.json', 'utf8'));
const title = {};
(function w(ns) { for (const n of ns) { title[n.real_id] = n.title; if (n.children?.length) w(n.children); } })(cat);

const keys = ['InstantiateClientUIControl', '控件模板索引', '动态创建', '模板索引', '已配置', '客户端控件模板', '控件模板'];
let all = '';
for (const [id, t] of Object.entries(tm)) all += `\n<<<${id}|${title[id] || '?'}>>>\n${t}`;

for (const k of keys) {
  console.log(`\n########## 「${k}」 ##########`);
  let n = 0;
  for (const [id, t] of Object.entries(tm)) {
    const i = t.indexOf(k);
    if (i < 0) continue;
    n += 1;
    if (n > 8) { console.log('  …(还有更多)'); break; }
    console.log(`  [${id}] ${title[id] || '?'}`);
    console.log(`     …${t.slice(Math.max(0, i - 200), i + 300).replace(/\n/g, ' ')}…`);
  }
  if (!n) console.log('  （全站无命中）');
}
