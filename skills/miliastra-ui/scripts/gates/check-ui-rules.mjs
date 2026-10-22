#!/usr/bin/env node
/**
 * check-ui-rules.mjs —— `miliastra-ui` 技能自带门禁（UI1–UI6 里"静态可判"的部分）
 *
 * 与工作区 `tools/check-ui-contract.mjs` 的区别（**别混用**）：
 *   · 那个是 **map 驱动、只服务《侦探1》**（读那六份脚本的常量：格盘 / 1:2:1 三栏 / 详情纸片 / 按钮热区），
 *     给别的图会明确报错 ⇒ 它是**工程专属门禁**，换机/换图都跑不了。
 *   · 本文件是 **文件驱动、任意 .lua 都能跑**，判据只来自 `miliastra-ui` 的 UI2/UI3/UI4/UI5/UI6 铁律
 *     ⇒ 这是**技能自带的、可携带的那一道**。
 *
 * 用法：
 *   node scripts/gates/check-ui-rules.mjs <脚本.lua> [<脚本2.lua> ...]
 *   node scripts/gates/check-ui-rules.mjs --dir <目录>          # 递归扫 .lua（跳过 _* / .* / 备份）
 *   node scripts/gates/check-ui-rules.mjs --selftest            # 正反例自检（证伪用）
 *   --summary 只打结论行；--strict 把 warn 也当失败
 *
 * 判定分档：error = 真机铁律（会静默不画 / 点不动）；warn = 口径偏离（可能是有意的，逐处问）
 * 退出码：0 全绿 ｜ 1 有 error（或 --strict 下含 warn）｜ 2 用法/IO 错
 *
 * ⚠️ 已知不判（**别当成"过了"**）：运行时行为、素材与模板索引、真实观感、动效手感 —— 那些只能真机/截图。
 * ⚠️ 判据只覆盖"能被正则可靠判定的形状"；**它不替代** UI 铁律本身与交付前截图回看。
 */
import fs from 'node:fs';
import path from 'node:path';

const FONT_SCALE = new Set([64, 52, 28, 22]);          // UI3 白名单（与工作区 check-ui-contract 一致）
const SEMANTIC_COLORS = new Set([                      // UI4 语义色表（SKILL.md §3.2）
    '245,240,234', '184,184,196', '255,210,77', '140,240,168', '255,122,110',
    '28,32,48', '58,66,92', '10,12,20,190', '8,10,18,180',
]);

const argv = process.argv.slice(2);
const selftest = argv.includes('--selftest');
const summary = argv.includes('--summary');
const strict = argv.includes('--strict');
const dirIdx = argv.indexOf('--dir');
const files = [];

function walk(d, out = []) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) { if (!/^[_.]/.test(e.name)) walk(p, out); continue; }
        if (e.name.endsWith('.lua') && !/备份|_bak/.test(e.name)) out.push(p);
    }
    return out;
}

function checkText(src) {
    const lines = src.split('\n');
    const hits = [];
    let unjudged = 0;                                     // 「判不了」计数：几何是变量 ⇒ 静态判不出，别算通过
    const push = (kind, level, line, rule, msg) => hits.push({ kind, level, line, rule, msg });

    for (let i = 0; i < lines.length; i++) {
        const L = lines[i];
        const n = i + 1;

        // ── UI3 字号只许 4 档 ─────────────────────────────────────────
        for (const m of L.matchAll(/fontSize\s*=\s*(\d+)|SetFontSize\s*\(\s*(\d+)|setFont\s*\(\s*(\d+)/g)) {
            const v = Number(m[1] ?? m[2] ?? m[3]);
            if (!FONT_SCALE.has(v)) push('FONT_SIZE_OFF_SCALE', 'error', n, 'UI3', `字号 ${v} 不在白名单 64/52/28/22（要新档须同时改表 + 改门禁）`);
        }

        // ── UI6 rotationZ 写不进去（平台不生效）────────────────────────
        if (/rotationZ\s*=|SetRotation\s*\(/.test(L)) push('ROTATION_WRITE', 'warn', n, 'UI6', 'rotationZ / SetRotation 平台不生效（素材角度只能请创作者在编辑器里转）');

        // ── UI4 颜色不取语义色表 ─────────────────────────────────────
        for (const m of L.matchAll(/Color(?:\.FromRGB)?\s*\(\s*(\d{2,3})\s*,\s*(\d{2,3})\s*,\s*(\d{2,3})\s*(?:,\s*(\d{1,3})\s*)?\)/g)) {
            const key = [m[1], m[2], m[3], m[4]].filter(Boolean).join(',');
            if (!SEMANTIC_COLORS.has(key) && !SEMANTIC_COLORS.has(key.split(',').slice(0, 3).join(','))) {
                push('RAW_COLOR', 'warn', n, 'UI4', `颜色 (${key}) 不在语义色表（§3.2）；要么回表，要么补进表并写明语义`);
            }
        }

        // ── UI5 遍历式清理必须白名单 ──────────────────────────────────
        if (/GetChildren\s*\(|for\s+.*in\s+pairs\s*\(\s*.*children/i.test(L)) {
            const win = lines.slice(Math.max(0, i - 1), i + 8).join('\n');
            if (/SetVisible\s*\(\s*false/.test(win) && !/name\s*==|name\s*~=|白名单|whitelist/i.test(win)) {
                push('SWEEP_WITHOUT_WHITELIST', 'warn', n, 'UI5', '遍历兄弟控件做隐藏/清理但没有白名单条件（会误伤别的脚本的热区 ⇒ 点击失效）');
            }
        }

        // ── UI2 / UI3 add(...) 的 x,y,w,h ────────────────────────────
        const add = L.match(/add\s*\(([^)]*)\)/);
        if (add) {
            const args = add[1];
            const isText = /["'](txt|text|label)["']/i.test(args);
            const nums = [...args.matchAll(/(?<![\w.])(\d+)(?![\w.])/g)].map((m) => Number(m[1]));
            // 形状：add(父, "txt", x, y, w, h, ...) ⇒ 取最后 4 个数里前两个为 x,y、后两个为 w,h
            let x, y, w, h;
            if (isText && nums.length >= 4) {
                const tail = nums.slice(-4);
                [x, y, w, h] = tail;
            } else if (!isText && nums.length >= 4) {
                const tail = nums.slice(-4);
                [x, y, w, h] = tail;
            }
            if (x !== undefined) {
                for (const [label, v] of [['x', x], ['y', y], ['w', w], ['h', h]]) {
                    if (v !== 0 && v % 8 !== 0) push('GRID_OFF_8', 'warn', n, 'UI2', `${label}=${v} 不是 8 的倍数（档位见 §2；算不平就改档位，别写接近的数）`);
                }
                if (isText) {
                    const win = lines.slice(i, i + 7).join('\n');
                    const fm = win.match(/fontSize\s*=\s*(\d+)|SetFontSize\s*\(\s*(\d+)|setFont\s*\(\s*(\d+)/);
                    if (fm) {
                        const fv = Number(fm[1] ?? fm[2] ?? fm[3]);
                        const need = Math.ceil(fv * 1.4);
                        if (h < need) push('TEXT_H_TOO_SMALL', 'error', n, 'UI3', `文本框 h=${h} < 字号 ${fv} × 1.4 = ${need} ⇒ **真机整条一个像素都不画**（模拟器不模拟）`);
                    }
                }
            } else {
                unjudged++;                                // add() 的几何不是字面量（x/y/w/h 是变量）⇒ 判不了
            }
        }
    }

    // ── UI6 有光标事件却没有 showCursor ─────────────────────────────
    if (/CursorEnter|CursorExit|CursorDown|CursorUp|CursorEvent/.test(src) && !/showCursor/.test(src)) {
        const ln = lines.findIndex((l) => /CursorEnter|CursorExit|CursorDown|CursorUp|CursorEvent/.test(l)) + 1;
        push('CURSOR_WITHOUT_SHOWCURSOR', 'warn', ln, 'UI6', '有光标事件但全文没有 showCursor（硬前置：祖先容器要置 true 才派发）');
    }
    return { hits, unjudged };
}

// ── 自检（证伪：坏样本必须报出来，好样本必须不报）────────────────────
if (selftest) {
    const bad = [
        'local t = add(c, "txt", 20, 37, 480, 64, "标题")',      // UI2 非 8 倍数 + UI3 高度不够
        't.c.fontSize = 52',
        't.c.imageColor = Color(120, 200, 255)',                  // UI4 表外色
        't.c.rotationZ = 15',                                     // UI6 无效属性
        'for _, ch in pairs(panel:GetChildren()) do ch:SetVisible(false) end',  // UI5 无白名单
        'btn.c:CursorEnter(function() end)',                      // UI6 无 showCursor
    ].join('\n');
    const good = [
        'local THEME = { font = { title = 52 }, color = { text = Color(245, 240, 234) } }',
        'local t = add(c, "txt", 32, 40, 480, 96, "标题")',        // 8 的倍数 + 96 >= 52*1.4=73
        't.c.fontSize = THEME.font.title',
        't.c.imageColor = THEME.color.text',
        'panel:GetChild("光标检测区域").showCursor = true',
    ].join('\n');
    const b = checkText(bad), g = checkText(good);
    const bRules = new Set(b.hits.map((h) => h.rule));
    const want = ['UI2', 'UI3', 'UI4', 'UI5', 'UI6'];
    const miss = want.filter((r) => !bRules.has(r));
    console.log(`自检坏样本：命中 ${b.hits.length} 处，规则覆盖 ${[...bRules].join('/')}，判不了 ${b.unjudged} 处`);
    console.log(`自检好样本：命中 ${g.hits.length} 处${g.hits.length ? '（' + g.hits.map((h) => h.rule + ':' + h.msg).join(' | ') + '）' : ''}`);
    if (miss.length || g.hits.length) { console.error(`❌ 自检未通过（缺规则：${miss.join('/') || '无'}；好样本误报 ${g.hits.length}）`); process.exit(1); }
    console.log('自检通过 ✓');
    process.exit(0);
}

if (dirIdx >= 0) {
    const d = argv[dirIdx + 1];
    if (!d || !fs.existsSync(d)) { console.error('❌ --dir 需要一个存在的目录'); process.exit(2); }
    files.push(...walk(d));
} else {
    files.push(...argv.filter((a) => !a.startsWith('--')));
}
if (!files.length) { console.error('用法：node check-ui-rules.mjs <脚本.lua...> | --dir <目录> | --selftest'); process.exit(2); }

let errors = 0, warns = 0, unjudgedAll = 0;
for (const f of files) {
    let src;
    try { src = fs.readFileSync(f, 'utf8'); } catch (e) { console.error(`❌ 读不到 ${f}：${e.message}`); process.exit(2); }
    const { hits, unjudged } = checkText(src);
    const e1 = hits.filter((h) => h.level === 'error').length;
    const w1 = hits.length - e1;
    errors += e1; warns += w1; unjudgedAll += unjudged;
    if (!summary) {
        if (!hits.length && !unjudged) { console.log(`✅ ${f}`); continue; }
        console.log(`\n${f}  —— error ${e1} / warn ${w1} / 判不了 ${unjudged}`);
        for (const h of hits) console.log(`  ${h.level === 'error' ? '⛔' : '⚠️ '} L${h.line} [${h.rule}] ${h.kind}：${h.msg}`);
    }
}
console.log(`\n合计：${files.length} 文件 ｜ error ${errors} ｜ warn ${warns} ｜ **判不了 ${unjudgedAll}**（几何是变量 ⇒ 静态判不出，不算通过）`);
if (errors || (strict && warns)) {
    console.log('⛔ 有 error ⇒ 先修到过再去 deploy（**别回退作者的改动、别拿空壳顶**：门禁是证据，不是否决权）。');
    process.exit(1);
}
console.log('✅ 本门全绿 —— 但绿只代表"字面量形状合格"：判不了的项 / 运行时 / 观感 / 素材仍要真机与截图（别把绿当"UI 合格"）。');
