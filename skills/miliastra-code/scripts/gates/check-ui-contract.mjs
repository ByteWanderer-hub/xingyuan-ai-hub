// ⚠️ 快照：本文件是 `tools\check-ui-contract.mjs` 的副本（2026-10-02 19:23，源 SHA-256 前16位 D07DE757ECA416D8）。
// 判据与源文件逐字一致，仅改了 lualint 的 import 路径；**口径以工作区版为准**，刷新见同目录 README.md。
// 技能版用法：给**显式文件/目录**（工作区版的 --map 依赖本机 案子/ 目录，技能里没有）。

// 覆盖层「画在哪 = 点哪算」+ 规范硬口径（8 的倍数 / 字号三档）机械校验 —— 2026-09-26 UI 统一版
//   用法：node tools/check-ui-contract.mjs [--map 侦探1]        （全绿才允许 deploy）
//   为什么需要它：热区在 input.lua、画面在 view.lua，同一份数字写两处；改一处忘另一处 = "看得见点不着"。
//   ⚠️ **本门禁只服务《侦探1（侦探杀）》**（判据全是它那六份脚本的常量：格盘/三栏/详情纸片/按钮热区）：
//      给别的 --map 会**明确报错退出**，不会拿别的图的脚本去套侦探杀的矩形契约。
//   ★ 路径不写死：成品在 `案子/侦探1/2.代码/`，由 tools/_paths.mjs 按地图名解析（2026-10-04 迁移后）。
import { readFileSync } from 'node:fs';
import { parseMap, paths } from './_paths.mjs';

const { map, root } = parseMap(process.argv.slice(2));
if (map !== '侦探1') {
  console.error(`❌ check-ui-contract.mjs 是《侦探1（侦探杀）》专属的界面契约门禁，不支持 --map ${map}。`);
  console.error('   （格盘 / 1:2:1 三栏 / 详情纸片 / 按钮热区这些判据全是从侦探杀那六份脚本里读常量的。）');
  process.exit(2);
}
const P = paths(map, root);

const view = readFileSync(P.p('表现 view.lua'), 'utf8');
const input = readFileSync(P.p('交互 input.lua'), 'utf8');
const board = readFileSync(P.p('调查板 board.lua'), 'utf8');

let bad = 0;
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const fmt = (r) => '{' + r.join(',') + '}';
const okline = (ok, label, got, want) => {
  if (!ok) bad++;
  console.log((ok ? 'OK   ' : 'FAIL ') + label.padEnd(34) + fmt(got) + (want ? '  期望 ' + fmt(want) : ''));
};

// ── view 侧常量（阅读型按钮排）──
const num = (src, re, what) => {
  const m = src.match(re);
  if (!m) throw new Error('解析失败：' + what);
  return Number(m[1]);
};
const BTN_Y = num(view, /local BTN_Y, BTN_W, BTN_H = (\d+)/, 'BTN_Y');
const BTN_W = num(view, /local BTN_Y, BTN_W, BTN_H = \d+, (\d+)/, 'BTN_W');
const BTN_H = num(view, /local BTN_Y, BTN_W, BTN_H = \d+, \d+, (\d+)/, 'BTN_H');
const bxm = view.match(/local BTN_X = \{ (\d+), (\d+), (\d+) \}/);
if (!bxm) throw new Error('解析失败：BTN_X');
const BTN_X = [Number(bxm[1]), Number(bxm[2]), Number(bxm[3])];

// ── input 侧热区 ──
function constRect(name) {
  const re = new RegExp('local\\s+' + name + '\\s*=\\s*\\{\\s*(\\d+),\\s*(\\d+),\\s*(\\d+),\\s*(\\d+)\\s*\\}');
  const m = input.match(re);
  if (!m) throw new Error('input 里找不到 local ' + name);
  return [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
}

// ① 标题页四个入口：view 是 makeBtn("ovB"..i, 600, 432+(i-1)*96, 400, 72) ⇒ 按公式展开
{
  const m = view.match(/makeBtn\("ovB" \.\. i, (\d+), (\d+) \+ \(i - 1\) \* (\d+), (\d+), (\d+)/);
  if (!m) throw new Error('view 里找不到标题页按钮的循环公式');
  const [, x0, y0, dy, w, h] = m.map(Number);
  const want = ['T_START', 'T_PICK', 'T_CODEX', 'T_HELP'];
  for (let i = 1; i <= 4; i++) {
    okline(eq([x0, y0 + (i - 1) * dy, w, h], constRect(want[i - 1])), '标题页按钮 ' + i + ' vs ' + want[i - 1],
      [x0, y0 + (i - 1) * dy, w, h], constRect(want[i - 1]));
  }
}

// ② 阅读型底部按钮排（选关的关闭 / 图鉴·教程的翻页与关闭）：view 用 BTN_X/BTN_Y/BTN_W/BTN_H
{
  const pair = [['pkB3', 'PK_CLOSE', 2], ['cxB1', 'CX_PREV', 0], ['cxB2', 'CX_NEXT', 1], ['cxB3', 'CX_CLOSE', 2]];
  for (const [vname, iname, slot] of pair) {
    if (!new RegExp('makeBtn\\("' + vname + '", BTN_X\\[').test(view)) {
      bad++;
      console.log('FAIL ' + vname + ' 没按 BTN_X 槽位建（校验脚本要跟着改）');
      continue;
    }
    okline(eq([BTN_X[slot], BTN_Y, BTN_W, BTN_H], constRect(iname)), vname + ' vs ' + iname,
      [BTN_X[slot], BTN_Y, BTN_W, BTN_H], constRect(iname));
  }
}

// ③ 设置菜单按钮：view 是 makeBtn("mxB"..i, 592, 360+(i-1)*88, 416, 64)（5 项：继续/选择关卡/角色图鉴/怎么玩/重开本关）
{
  const m = view.match(/makeBtn\("mxB" \.\. i, (\d+), (\d+) \+ \(i - 1\) \* (\d+), (\d+), (\d+)/);
  if (!m) throw new Error('view 里找不到菜单按钮的循环公式');
  const [, x0, y0, dy, w, h] = m.map(Number);
  const want = ['MX_GO', 'MX_PICK', 'MX_CX', 'MX_TUT', 'MX_NEW'];
  for (let i = 1; i <= want.length; i++) {
    okline(eq([x0, y0 + (i - 1) * dy, w, h], constRect(want[i - 1])), '菜单按钮 ' + i + ' vs ' + want[i - 1],
      [x0, y0 + (i - 1) * dy, w, h], constRect(want[i - 1]));
  }
}

// ④ 选关 12 行：两边都是公式 ⇒ 逐字比公式
{
  const vf = view.match(/add\("pkR" \.\. i, "txt", (\d+) \+ col \* (\d+), (\d+) \+ row \* (\d+), (\d+), (\d+)/);
  const inf = input.match(/local rc = \{ (\d+) \+ col \* (\d+), (\d+) \+ row \* (\d+), (\d+), (\d+) \}/);
  if (!vf || !inf) {
    bad++;
    console.log('FAIL 选关行的公式没解析到（view=' + Boolean(vf) + ' input=' + Boolean(inf) + '）');
  } else {
    const same = vf.slice(1, 7).join(',') === inf.slice(1, 7).join(',');
    okline(same, '选关 12 行（公式逐字）', inf.slice(1, 7).map(Number), vf.slice(1, 7).map(Number));
  }
}

// ⑤ board 的【设置】按钮
{
  const m = board.match(/add\("btnSet",\s*"img",\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)/);
  okline(Boolean(m) && eq([+m[1], +m[2], +m[3], +m[4]], constRect('BTN_SET')), 'board.btnSet vs BTN_SET',
    m ? [+m[1], +m[2], +m[3], +m[4]] : [0, 0, 0, 0], constRect('BTN_SET'));
}

// ⑥ 规范 UI2：覆盖层的坐标/尺寸必须是 8 的倍数（只查覆盖层相关行）
{
  const lines = view.split('\n');
  const off = [];
  lines.forEach((ln, i) => {
    if (!/^\s*(add|makeBtn|makePanel)\("/.test(ln)) return;
    if (!/"(ov|pk|cx|mx)/.test(ln)) return;
    // 行内可写 `.c.fontSize = 52`（省一行）—— 那是字号、不是坐标，先剔掉再扫数字
    const scan = ln.replace(/\.c\.fontSize\s*=\s*\d+/, '');
    for (const n of scan.match(/\b\d{2,4}\b/g) || []) {
      const v = Number(n);
      if (v >= 8 && v <= 1600 && v % 8 !== 0) off.push(`L${i + 1} 的值 ${v} 不是 8 的倍数`);
    }
  });
  if (off.length) {
    bad++;
    console.log('FAIL 覆盖层里有非 8 倍数（规范 UI2）：');
    off.slice(0, 8).forEach((s) => console.log('       ' + s));
  } else {
    console.log('OK   覆盖层坐标/尺寸全是 8 的倍数（UI2）');
  }
}

// ⑦ 规范 UI3：覆盖层字号只许 64（关卡标题条）/ 52（面板标题）/ 28（按钮·正文）/ 22（副信息）四档
//   （两种写法都要扫：setFont(...) 与行内 `.c.fontSize = n`）
{
  const setFonts = new Set();
  const re = /setFont\("(ov|pk|cx|mx)[A-Za-z0-9]*", (\d+)\)/g;
  let m;
  while ((m = re.exec(view)) !== null) setFonts.add(Number(m[2]));
  const re2 = /\.c\.fontSize\s*=\s*(\d+)/g;
  while ((m = re2.exec(view)) !== null) setFonts.add(Number(m[1]));
  const allowed = new Set([64, 52, 28, 22, 18]);   // ★ 18 = 2026-09-26 创作者要的「格内文案再小一点、放更多」
  const badFonts = [...setFonts].filter((v) => !allowed.has(v));
  okline(badFonts.length === 0, '覆盖层字号档位（UI3：64/52/28/22）', [...setFonts].sort((a, b) => b - a), [64, 52, 28, 22]);
}

// ⑧ 真机铁律（2026-09-26 实测）：文本框矩形高容不下字号行高 ⇒ **整条什么都不画**（不裁切/不缩小/不报错）
//   数据：52 号放在 64 高、64 号放在 80 高 = 整条空白；52 号放在 90 高、28 号放在 40/64 高 = 正常。
//   模拟器不模拟这个截断 ⇒ 这是唯一能离线拦住它的地方。动态名/公式矩形不判（列进 skipped）。
//   ★★ 2026-09-26 追加（FP-A 真机打脸）：上面的"28 号放在 40 高 = 正常"**是错的** ——
//     FP-A 把 HUD 三行压到 40 高（字号 28），真机截图里**这三行一个像素都没画**（图标在、文字空），
//     而同屏 h=48 的 msg / tip（同为 28 号）正常，h=40/字号 22 的 recWho 也正常。
//     ⇒ 单靠 1.4× 不够：再叠一条**绝对余量** `h ≥ 字号 + 16`（52 号 80 高、22 号 40 高、28 号 48 高都过；
//       28 号 40 高被拦下 = 正是这次漏掉的那条）。两条都要过。
{
  const LINE_H = 1.4;
  const SLACK = 16;
  const pairs = [];
  const skipped = [];
  const scan = (src, file) => {
    const lines = src.split('\n');
    const rect = new Map();
    const varToName = new Map();
    lines.forEach((ln, i) => {
      let m = ln.match(/add\("([A-Za-z0-9_]+)",\s*"txt",\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)/);
      if (m) rect.set(m[1], { h: Number(m[5]), line: i + 1 });
      else if (/add\("[A-Za-z0-9_]+",\s*"txt"/.test(ln) || /add\(".*"\s*\.\./.test(ln)) {
        if (/add\("[^"]*"\s*\.\./.test(ln)) skipped.push(file + ':' + (i + 1));
      }
      m = ln.match(/local\s+(\w+)\s*=\s*add\("([A-Za-z0-9_]+)"/);
      if (m) varToName.set(m[1], m[2]);
    });
    const size = new Map();
    lines.forEach((ln) => {
      let m = ln.match(/setFont\("([A-Za-z0-9_]+)",\s*(\d+)\)/);
      if (m) size.set(m[1], Number(m[2]));
      m = ln.match(/add\("([A-Za-z0-9_]+)",\s*"txt"[^)]*\)\.c\.fontSize\s*=\s*(\d+)/);
      if (m) size.set(m[1], Number(m[2]));
      m = ln.match(/(\w+)\.c\.fontSize\s*=\s*(\d+)/);
      if (m && varToName.has(m[1])) size.set(varToName.get(m[1]), Number(m[2]));
    });
    for (const [name, r] of rect) pairs.push({ file, line: r.line, name, h: r.h, size: size.get(name) || 24 });
  };
  scan(view, 'view');
  scan(board, 'board');
  // makeBtn 的文字固定 28 号、矩形 = 按钮矩形（见 makeBtn 实现）；顺手一起判
  for (const src of [view, board]) {
    const re = /makeBtn\("([A-Za-z0-9_]+)",\s*\d+,\s*\d+,\s*(\d+),\s*(\d+)/g;
    let m;
    while ((m = re.exec(src)) !== null) pairs.push({ file: 'makeBtn', line: 0, name: m[1], h: Number(m[3]), size: 28 });
  }
  const short = pairs.filter((p) => p.h < p.size * LINE_H || p.h < p.size + SLACK);
  const got = short.length
    ? short.slice(0, 6).map((p) => p.name + ' h=' + p.h + ' 号=' + p.size)
    : [pairs.length + ' 处合格'];
  okline(short.length === 0, '文本框矩形高 ≥ 字号×1.4 且 ≥ 字号+16（真机静默不画）', got, null);
  if (short.length) {
    console.log('       规则：矩形高度要 ≥ max(字号 × 1.4, 字号 + 16)；不够时该控件**一个像素都不画**，且只在真机暴露。');
    short.slice(0, 12).forEach((p) => console.log('       · ' + p.file + ':' + p.line + ' ' + p.name + ' 高=' + p.h + ' 字号=' + p.size));
  }
  if (skipped.length) console.log('       跳过（动态控件名/公式矩形，认不出）：' + skipped.join(' '));
}

// ═══ ⑨~⑫ FP-A（2026-09-26）1:2:1 栅格：把"三栏边界 + 格盘 + 左右栏热区"做成机械判据 ═══
//   为什么加这一段：FP-A 的验收①是"三栏 x 边界与宽度可核对"、②是"16 格盘不压左右栏"。
//   格盘那份数字**写在三个脚本里**（board 画 / input 判点击 / reveal 画高亮），左栏热区写在两个里，
//   靠人眼比必然漏 —— 这里逐字比。
const reveal = readFileSync(P.p('翻牌 reveal.lua'), 'utf8');
const hud = readFileSync(P.p('HUD hud.lua'), 'utf8');   // ★ FP-C：左右栏/顶部边角的画面搬到这份

// ⑨ 格盘四方一致：board / input / reveal 的 CELL,GAP,GX,GY
{
  const gridOf = (src, who) => {
    // ★ FP-E（工单 5）：格子改长方形 ⇒ 常量从 CELL 变成 CELL_W/CELL_H（横竖两轴）
    const a = src.match(/local\s+CELL_W,\s*CELL_H,\s*GAP\s*=\s*(\d+),\s*(\d+),\s*(\d+)/);
    const b = src.match(/local\s+GX,\s*GY\s*=\s*(\d+),\s*(\d+)/);
    if (!a || !b) throw new Error('解析失败：' + who + ' 的格盘常量（应为 CELL_W, CELL_H, GAP / GX, GY）');
    return [Number(a[1]), Number(a[2]), Number(a[3]), Number(b[1]), Number(b[2])];
  };
  const gb = gridOf(board, 'board');
  const gi = gridOf(input, 'input');
  const gr = gridOf(reveal, 'reveal');
  okline(eq(gb, gi), '格盘 board vs input（逐字五元组）', gi, gb);
  okline(eq(gb, gr), '格盘 board vs reveal（逐字五元组）', gr, gb);
}

// ⑩ 三栏边界与 1:2:1 比例（左栏宽 ×2 = 中栏宽 = 格盘宽；栏间 40；外边距 80）
//   ★ FP-C 起：左右两栏的画面从 `表现 view.lua` 搬到 `HUD hud.lua` ⇒ 这里的"画面侧"改读 HUD 那份
{
  const imgRect = (src, name) => {
    const m = src.match(new RegExp('add\\("' + name + '",\\s*"img",\\s*(\\d+),\\s*(\\d+),\\s*(\\d+),\\s*(\\d+)'));
    if (!m) throw new Error('HUD 里找不到 add("' + name + '", "img", …)');
    return [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  };
  // 左栏三纸片的第一张外框（宽度/位置即"栏"的定义）
  //   ★ 2026-09-27：时钟卡**已删**（创作者：「现有的时间不要了 ⇒ 变成圆圈与人数比例共排」）
  //     ⇒ 改用「便签」卡当左栏宽度的定义（它仍是整栏宽 336、x=80）
  const colF = imgRect(hud, 'noteF');
  const listBg = imgRect(hud, 'listBg');
  const pL = [colF[0], 200, colF[2], 488];
  const pR = listBg;
  const gi = (() => {
    const a = input.match(/local\s+CELL_W,\s*CELL_H,\s*GAP\s*=\s*(\d+),\s*(\d+),\s*(\d+)/);
    const b = input.match(/local\s+GX,\s*GY\s*=\s*(\d+),\s*(\d+)/);
    if (!a || !b) throw new Error('input 里找不到 CELL_W/CELL_H/GAP/GX/GY');
    return [Number(a[1]), Number(a[2]), Number(a[3]), Number(b[1]), Number(b[2])];
  })();
  const [cw, ch, cgap, cgx, cgy] = gi;
  const spanX = 4 * cw + 3 * cgap;
  const spanY = 4 * ch + 3 * cgap;
  const midL = cgx, midR = cgx + spanX;
  okline(pL[2] * 2 === spanX, '1:2:1：左栏宽 ×2 = 格盘宽（中栏）', [pL[2] * 2], [spanX]);
  okline(pR[2] === pL[2], '左右栏等宽', [pR[2]], [pL[2]]);
  okline(pL[0] + pL[2] + 40 === midL, '三栏：左栏右 + 栏间40 = 中栏左', [pL[0] + pL[2] + 40], [midL]);
  okline(midR + 40 === pR[0], '三栏：中栏右 + 栏间40 = 右栏左', [midR + 40], [pR[0]]);
  okline(pL[0] === 80, '外边距：左栏 x = 80', [pL[0]], [80]);
  const nums = [pL[0], pL[2], pR[0], pR[1], pR[2], pR[3], cw, ch, cgap, cgx, cgy, spanX, spanY];
  const off = nums.filter((n) => n % 8 !== 0);
  okline(off.length === 0, 'FP-A/FP-E 数字全是 8 的倍数', off.length ? off : ['全部 ' + nums.length + ' 个'], []);
  // ② 16 格盘不压左右栏 + 不出画布（FP-E：长方形，宽高分别算）
  const hit = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
  const plate = [midL, cgy, spanX, spanY];
  okline(!hit(plate, pL), '格盘不压左栏', plate, pL);
  okline(!hit(plate, pR), '格盘不压右栏', plate, pR);
  okline(midR <= 1600 && cgy + spanY <= 1000, '格盘在 1600×1000 画布内', [midL, cgy, midR, cgy + spanY], []);
  // ★ FP-E1：顶部整块删掉后，格盘上边应该顶到 y≤40（吃掉了原来 16..136 那条带）
  okline(cgy <= 40, 'FP-E1：格盘上边 ≤ 40（顶部那块确实让出来了）', [cgy], []);
  // ★★ 2026-09-26 真机事故：格子 14「只有上半能点」—— `cellAt` 的**竖直**越界写成了 `dy > GY + SPAN`，
  //   而 SPAN 是**横向**盘宽 672 ⇒ 竖直天花板被当成 32+672=704，格子 14（656..832）下半永远返回 0。
  //   长方形格之后两轴不再相等 ⇒ 门禁必须**分轴**判，并且要有一条"没误用"的反向判据。
  {
    const misused = /dy\s*>\s*GY\s*\+\s*SPAN\b/.test(input);
    okline(!misused, 'cellAt：竖直越界**没有**误用横向 SPAN', [misused ? '误用了' : '没误用'], ['没误用']);
    // ★ 2026-09-29：input 的几何改成「运行时向 board 要」（用 `grid.*` + `spanX()/spanY()`）⇒
    //   判据同时接受两种形状，但**都必须体现"竖直用竖直轴"**（这才是这条门禁的原意）：
    //     ① 旧形状：字面量 `ROWS * CELL_H + (ROWS - 1) * GAP`
    //     ② 新形状：调 `spanY()`，且它的定义必须是 `grid.rows * grid.ch + (grid.rows - 1) * grid.gap`
    const spanYDef = /function\s+spanY\(\)\s*return\s+grid\.rows\s*\*\s*grid\.ch\s*\+\s*\(grid\.rows\s*-\s*1\)\s*\*\s*grid\.gap/.test(input);
    const okY = input.includes('ROWS * CELL_H + (ROWS - 1) * GAP') || spanYDef;
    okline(okY, 'cellAt：竖直上限用的是**竖直轴**（字面量公式 或 符合定义的 spanY()）',
      [okY, spanYDef ? 'spanY 定义符合 ✓' : 'spanY 定义未匹配'], [true]);
    // 顺带把"竖直上限的数值"算出来给回执看：应等于 4×ch + 3×gap
    okline(cgy + spanY === cgy + 4 * ch + 3 * cgap, '竖直上限数值与常量一致', [cgy + spanY], [cgy + 4 * ch + 3 * cgap]);
  }
  // ★ FP-E3：格内两排 —— 上排 图标:编号 = 2:1 且正好一格宽；下排文案放得下
  {
    const ic = board.match(/local\s+CELL_ICON_W,\s*CELL_TOP_H\s*=\s*(\d+),\s*(\d+)/);
    if (!ic) {
      bad++;
      console.log('FAIL board 里找不到 CELL_ICON_W/CELL_TOP_H（格内两排判据失效）');
    } else {
      const iw = Number(ic[1]), ih = Number(ic[2]);
      okline(iw === 2 * 48 && iw + 48 === cw, 'FP-E3：上排 图标 : 编号 = 2 : 1 且合计 = 格宽', [iw, iw + 48], [96, cw]);
      okline(ih >= 28 + 16 && ih <= ch, 'FP-E3：上排高够 28 号字且不超格高', [ih, 28 + 16, ch], []);
      okline(ih + 40 + 68 <= ch, 'FP-E3：名字(40)+文案(68) 放得下（不越格底）', [ih + 40 + 68], [ch]);
      // ★★ 2026-09-26：格内三块用的是**公式坐标** ⇒ ④ 的字面量正则认不出它们。
      //   代价：上一版 `nm` 高 **32** 而字号 22（门槛 38）⇒ 真机上「地点/名字」一个像素都不画，
      //   而四道门禁**全绿**（创作者截图当场抓到）。⇒ 这里用常量把高度解出来，按同一算式补判。
      const cellTxtH = (nm) => {
        const m = board.match(new RegExp('add\\("' + nm + '" \\.\\. i, "txt", ([^)]*)\\)'));
        if (!m) {
          throw new Error('board 里找不到 add("' + nm + '" .. i, "txt", …)（格内高度判据失效）');
        }
        const args = m[1].split(',').map((s) => s.trim());
        const hRaw = args[3];
        if (/^\d+$/.test(hRaw)) {
          return Number(hRaw);
        }
        if (hRaw === 'CELL_TOP_H') {
          return ih;
        }
        throw new Error('格内 ' + nm + ' 的高度写法认不出：' + hRaw);
      };
      for (const [nm, fs] of [['no', 28], ['nm', 22], ['tx', 18]]) {
        const need = Math.max(fs * 1.4, fs + 16);
        const h = cellTxtH(nm);
        okline(h >= need, '格内 ' + nm + ' 高 ≥ ' + need + '（' + fs + ' 号：真机不画线）', [h], [need]);
      }
    }
  }
  // ★ FP-C/E5：详情纸片竖向**五块**不许互相压（标题→正文→关键词→判断→阵营）
  //   ★ 2026-09-27 契约变更（创作者要求）：「**返回名单放到块的顶上**」⇒ 它不再是最下一块，
  //     改成**标题行右侧**（与标题左右分列）。判据随之改为：五块照旧竖排；
  //     返回名单落在右栏内、与标题**同一行**、且位于**右半边**（x ≥ 1360）—— 免得"搬到顶上"被旧契约误杀。
  {
    const pick = (n) => {
      const m = hud.match(new RegExp('add\\("' + n + '",\\s*"img",\\s*(\\d+),\\s*(\\d+),\\s*(\\d+),\\s*(\\d+)'))
        || hud.match(new RegExp('add\\("' + n + '",\\s*"txt",\\s*(\\d+),\\s*(\\d+),\\s*(\\d+),\\s*(\\d+)'));
      if (!m) throw new Error('HUD 里找不到 ' + n);
      return [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
    };
    const rects = ['detTitle', 'detBody', 'kwBody', 'jd1Bg', 'campBg'].map(pick);
    let stackOk = true;
    for (let k = 1; k < rects.length; k++) {
      if (rects[k][1] < rects[k - 1][1] + rects[k - 1][3]) stackOk = false;
    }
    okline(stackOk, 'FP-E5：详情纸片五块竖向不重叠', rects.map((r) => r[1]), []);
    okline(rects[4][1] + rects[4][3] <= 688, '详情纸片最下一块不越 688', [rects[4][1] + rects[4][3]], []);
    const back = pick('backBg');
    const t = rects[0];
    okline(back[1] >= t[1] && back[1] + back[3] <= t[1] + t[3] && back[0] >= 1360
      && back[0] + back[2] <= 1504,
      'FP-E5：返回名单在「块的顶上」（标题行右半边）', [back[0], back[1]], []);
  }
  // ★ FP-C：左栏纸片必须竖着排完、且都在左栏里（互不重叠、不出栏）
  //   ★ 2026-09-27 改版：时钟卡换成**圆盘钟**（dialGlow/dialHand/dialNum，见下一条断言）；
  //     名声卡按创作者「**改小改精致**」有意收紧到 264 宽 ⇒ 这里不再要求"同宽"，只要求：
  //       ① 都从 x=80 起 ② 竖排不重叠、不越 688 ③ 便签卡仍是**整栏宽 336**（左栏的定义）
  const c2 = imgRect(hud, 'newsF'), c3 = imgRect(hud, 'noteF');
  const stacked = c2[1] + c2[3] <= c3[1] && c3[1] + c3[3] <= 688;
  okline(stacked, '左栏：名声卡与便签卡竖排不重叠且不越 688', [c2[1], c2[3], c3[1], c3[1] + c3[3]], []);
  okline(c2[0] === 80 && c3[0] === 80 && c3[2] === 336, '左栏：两卡同 x=80，便签仍是整栏宽 336', [c2[0], c3[0], c3[2]], [80, 80, 336]);
  // 圆盘钟（2026-09-27 新）：盘面必须落在左栏内 —— 右沿 ≤ 456（格盘左沿），否则会压到棋盘
  //   ⚠️ 盘面的环/刻度是**循环算出来的**（三角函数坐标），门禁读不到 ⇒ 锚在**字面量**控件 `dialCap` 上
  //      （它是 txt，不能走 imgRect ⇒ 自己抓一次）
  const capM = hud.match(/add\("dialCap",\s*"txt",\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)/);
  if (!capM) throw new Error('HUD 里找不到 add("dialCap", "txt", …)');
  const dg = [Number(capM[1]), Number(capM[2]), Number(capM[3]), Number(capM[4])];
  okline(dg[0] >= 80 && dg[0] + dg[2] <= 456, '圆盘钟在左栏内（用 dialCap 锚：右沿 ≤456 = 格盘左沿）', [dg[0], dg[0] + dg[2]], []);
}

// ⑪ 左右栏热区（input）↔ 画面（HUD hud.lua）：名单 12 行 / 详情纸片按钮
{
  const bgRect = (name) => {
    const m = hud.match(new RegExp('add\\("' + name + '",\\s*"img",\\s*(\\d+),\\s*(\\d+),\\s*(\\d+),\\s*(\\d+)'));
    if (!m) throw new Error('HUD 里找不到 add("' + name + '", "img", …)');
    return [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  };
  // 热区常量（input 侧）
  const rm = input.match(/local\s+ROW_X,\s*ROW_Y0,\s*ROW_W,\s*ROW_H,\s*ROW_N\s*=\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)/);
  if (!rm) throw new Error('input 里找不到 ROW_X/ROW_Y0/ROW_W/ROW_H/ROW_N');
  const [rowX, rowY0, rowW, rowH, rowN] = rm.slice(1).map(Number);
  // ① 名单：**两边都是公式 ⇒ 逐字比公式**（与「选关 12 行」同一套做法）
  //   HUD 画第 r 行的名字框 = add("row"..r, "txt", 1208, 200 + (r-1)*40, 192, 40)
  //   input 判第 r 行的热区   = { ROW_X, ROW_Y0 + (r-1)*ROW_H, ROW_W, ROW_H }
  const hf = hud.match(/add\("row" \.\. r, "txt", (\d+), (\d+) \+ \(r - 1\) \* (\d+), (\d+), (\d+)/);
  if (!hf) {
    bad++;
    console.log('FAIL HUD 名单行公式没解析到（写法变了就要同步改这条判据）');
  } else {
    const [, hx, hy0, hdy, hw] = hf.map(Number);
    okline(hy0 === rowY0 && hdy === rowH, '名单行公式 HUD vs input（逐字）', [hy0, hdy], [rowY0, rowH]);
    const hm = hud.match(/local ROW_MAX = (\d+)/);
    okline(Boolean(hm) && Number(hm[1]) === rowN, '名单行数 HUD vs input', hm ? [Number(hm[1])] : [null], [rowN]);
    // ② 热区必须盖住整行文字（x 从 1176 起、宽 320 ⇒ 覆盖 1208..1400 的名字框）
    okline(rowX <= hx && rowX + rowW >= hx + hw, '名单热区盖住整行', [rowX, rowW, hx, hw], []);
  }
  // ③ 详情纸片的按钮：HUD 的 jd*/campBg/backBg ↔ input 的 JD*/CAMP_BTN/BACK_BTN
  const pairs = [['jd1Bg', 'JD1'], ['jd2Bg', 'JD2'], ['jd3Bg', 'JD3'], ['campBg', 'CAMP_BTN'], ['backBg', 'BACK_BTN'],
    ['cxBg', 'CODEX_BTN']];
  for (const [vn, inn] of pairs) {
    const r = bgRect(vn);
    okline(eq(r, constRect(inn)), '详情纸片 ' + vn + ' vs ' + inn, r, constRect(inn));
  }
  // ④ 两态互不越界：名单 12 行 + 详情按钮都必须落在右栏 (1168..1504 / 200..688) 里
  const inside = (r, box) => r[0] >= box[0] && r[1] >= box[1] && r[0] + r[2] <= box[0] + box[2] && r[1] + r[3] <= box[1] + box[3];
  const col = [1168, 200, 336, 488];
  okline(inside([rowX, rowY0, rowW, 11 * rowH + rowH], col), '名单热区整块在右栏内', [rowX, rowY0, rowW, 11 * rowH + rowH], col);
  const inDet = ['JD1', 'JD2', 'JD3', 'CAMP_BTN', 'BACK_BTN'].map(constRect).every((r) => inside(r, col));
  okline(inDet, '详情纸片五个热区都在右栏内', [inDet], [true]);
}

// ⑫ board 的四个按钮 ↔ input 热区（结算页那两个原来没进这道门禁）
{
  const brect = (name) => {
    const m = board.match(new RegExp('add\\("' + name + '",\\s*"img",\\s*(\\d+),\\s*(\\d+),\\s*(\\d+),\\s*(\\d+)'));
    if (!m) throw new Error('board 里找不到 add("' + name + '", "img", …)');
    return [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  };
  for (const [bn, inn] of [['btnEnd', 'BTN_END'], ['btnNext', 'BTN_NEXT'], ['btnAgain', 'BTN_AGAIN']]) {
    okline(eq(brect(bn), constRect(inn)), 'board.' + bn + ' vs ' + inn, brect(bn), constRect(inn));
  }
}

console.log(bad === 0 ? '\n全部对齐 ✓（画在哪 = 点哪算 + 规范 UI2/UI3 + 真机矩形高 + FP-A 三栏栅格）' : '\n有 ' + bad + ' 处不合格 ✗');
process.exit(bad === 0 ? 0 : 1);
