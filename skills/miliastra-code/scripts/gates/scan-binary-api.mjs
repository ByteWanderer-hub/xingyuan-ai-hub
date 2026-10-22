// ── 技能自带快照（miliastra-code/scripts/gates/）────────────────
// 源：Desktop\yuanshen\tools\scan-binary-api.mjs（**工程工作区是唯一真身**，本文件只是快照）
// 差异：仅本溯源头 + import 路径改写（`../packages/dsh-miliastra/lib/lualint.mjs` → `./lualint.mjs`）；**判据未改一字**
// 刷新：`node scripts/gates/… ` 见同目录 README.md「刷新方法」
// ────────────────────────────────────────────────────────────
import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const needles = [
  'InstantiateClientUIControl', 'DestroyClientUIControl', 'GetClientUIRoots', 'FindClientUIRoot',
  'ClientUIContainerControl', 'CreateClientUIControl', 'InstantiateClientUI', 'ClientUIControl',
  'GetClientUIControl', 'ClientPrefabIndex', 'ControlPrefabIndex',
];

const files = [
  'D:/Genshin Impact Game/BeyondAssets/BeyondAssistEditor/BeyondEditor.dll',
  'D:/Genshin Impact Game/BeyondAssets/BeyondAssistEditor/mhypbase.dll',
  'D:/Genshin Impact Game/mhypbase.dll',
  'D:/Genshin Impact Game/rtlbase.dll',
  'D:/Genshin Impact Game/BeyondAssets/BeyondAssistEditor/Resource/Json/Beyond/BeyondGlobal/18125831855067188558.mihoyobin',
];

const ascii = (s) => Buffer.from(s, 'latin1');
const utf16 = (s) => Buffer.from(s, 'utf16le');

for (const f of files) {
  let b;
  try { statSync(f); b = readFileSync(f); } catch { console.log(`(读不到) ${f}`); continue; }
  console.log(`\n===== ${f.split('/').pop()}  ${b.length} 字节 =====`);
  for (const n of needles) {
    const a = b.indexOf(ascii(n));
    const u = b.indexOf(utf16(n));
    if (a >= 0 || u >= 0) {
      console.log(`  ✔ ${n}   ascii@${a}  utf16@${u}`);
    }
  }
}

// 子目录里的 dll 也扫一遍（只看名字像 API 的）
const dir = 'D:/Genshin Impact Game/BeyondAssets/BeyondAssistEditor';
console.log('\n===== 目录里所有 >100KB 的 dll 里带 ClientUI 的 =====');
for (const f of readdirSync(dir)) {
  if (!f.endsWith('.dll')) continue;
  const p = join(dir, f);
  let b; try { b = readFileSync(p); } catch { continue; }
  if (b.length < 100_000) continue;
  const hitA = b.indexOf(ascii('ClientUIControl'));
  const hitU = b.indexOf(utf16('ClientUIControl'));
  const hitI = b.indexOf(utf16('InstantiateClientUIControl'));
  if (hitA >= 0 || hitU >= 0 || hitI >= 0) {
    console.log(`  ${f}  (${(b.length / 1e6).toFixed(1)}MB)  ascii@${hitA} utf16@${hitU} Inst@${hitI}`);
  }
}
