#!/usr/bin/env node
/**
 * search-assets.mjs —— 图片资产标注定向检索 / 目录生成（yuan-code）
 * 用法：
 *   node search-assets.mjs <关键词1> [关键词2] ...   子串检索（任一命中），打印前 20 条
 *   node search-assets.mjs --catalog                 生成 assets/asset-catalog.md 全量目录
 * 匹配逻辑：对整条记录 JSON 串做 includes 子串匹配（含嵌套字段）——粗暴但够用；
 * 需要字段级精确过滤时，用 --catalog 生成的目录文件翻/grep。
 * 文件路径相对于本脚本：../assets/Image_sample_by_id.json
 */
import fs from 'node:fs';

const file = new URL('../assets/Image_sample_by_id.json', import.meta.url);
const catalogOut = new URL('../assets/asset-catalog.md', import.meta.url);
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const args = process.argv.slice(2);

const pick = (r, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), r);
const cut = (v, n) => (typeof v === 'string' && v.length > n ? v.slice(0, n) + '…' : v);

const row = (r) => ({
    id: r.assetID ?? '?',
    cat: pick(r, 'overrides.category') ?? '-',
    sub: pick(r, 'overrides.subcategory') ?? '-',
    shape: pick(r, 'overrides.visual.shape') ?? '-',
    tint: pick(r, 'overrides.render.tintable') ?? '-',
    pa: pick(r, 'overrides.render.preserve_aspect') ?? '-',
    resize: cut(pick(r, 'overrides.assembly_guidance.resize_policy'), 44) ?? '-',
    desc: cut(pick(r, 'overrides.desc') ?? r.review_notes, 60) ?? '-',
});

if (args[0] === '--catalog') {
    const rows = data.map(row).sort((a, b) => (a.id < b.id ? -1 : 1));
    const byCat = new Map();
    for (const r of rows) {
        if (!byCat.has(r.cat)) byCat.set(r.cat, []);
        byCat.get(r.cat).push(r);
    }
    let md = '# 图片资产目录（自动生成，勿手改）\n\n'
        + `> 来源：\`assets/Image_sample_by_id.json\`（${data.length} 条），由 \`scripts/search-assets.mjs --catalog\` 生成。\n`
        + '> 标注文件更新后请重新生成本目录。\n\n';
    for (const [c, list] of [...byCat.entries()].sort((a, b) => b[1].length - a[1].length)) {
        md += `- **${c}**（${list.length}）\n`;
    }
    for (const [c, list] of [...byCat.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        md += `\n## ${c}（${list.length}）\n\n`
            + '| assetID | 子类 | 形状 | tintable | preserve_aspect | 拉伸策略 | 说明 |\n'
            + '|---|---|---|---|---|---|---|\n';
        for (const r of list) {
            md += `| ${r.id} | ${r.sub} | ${r.shape} | ${r.tint} | ${r.pa} | ${r.resize} | ${r.desc} |\n`;
        }
    }
    fs.writeFileSync(catalogOut, md, 'utf8');
    console.log(`目录已生成：assets/asset-catalog.md（${data.length} 条，${byCat.size} 个分类）`);
    console.log('分类分布：');
    for (const [c, list] of [...byCat.entries()].sort((a, b) => b[1].length - a[1].length)) {
        console.log(`  ${String(list.length).padStart(5)}  ${c}`);
    }
} else {
    const kws = args;
    const hit = [];
    for (const r of data) {
        const s = JSON.stringify(r);
        if (kws.length === 0 || kws.some((k) => s.includes(k))) hit.push(row(r));
    }
    hit.sort((a, b) => (a.id < b.id ? -1 : 1));
    console.log(`总记录 ${data.length} 条，关键词 [${kws.join(', ')}] 命中 ${hit.length} 条`);
    for (const r of hit.slice(0, 20)) {
        console.log(`--- ${r.id} [${r.cat}/${r.sub}] 形状=${r.shape} tintable=${r.tint} preserve_aspect=${r.pa}`);
        console.log(`    拉伸=${r.resize}`);
        console.log(`    ${r.desc}`);
    }
    if (hit.length > 20) console.log(`（其余 ${hit.length - 20} 条略——换更具体关键词，或用 --catalog 生成全量目录）`);
}
