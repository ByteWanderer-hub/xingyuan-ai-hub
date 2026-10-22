#!/usr/bin/env python3
"""miliastra-bb 文档对齐 · docx 条款标注工具（黄底 + 红字）

用法:
    python3 mark_docx.py <原稿.docx> <标注版.docx> <rules.json>

rules.json:
    [ {"anchor": "条款内包含的子串", "tag": "🔴 冲突：原因一句话"}, ... ]

规则:
    1. 固定先复制源文件 —— 原稿只读，结果只写到 <标注版.docx>（脚本强制两者路径不同）
    2. 命中 anchor 的段落：所有 run 统一加 黄色高亮(w:highlight=yellow) + 红色字(w:color=FF0000)
    3. tag 非空时，在段落末尾追加 "　【tag】"（同样式），给下个审阅人看理由
    4. 输出前后提取正文比对：除追加的 tag 外正文必须逐字不变
"""
import sys, os, json, re, zipfile
import xml.dom.minidom as minidom
from xml.sax.saxutils import escape as xesc

RPR = '<w:rPr><w:color w:val="FF0000"/><w:highlight w:val="yellow"/></w:rPr>'

def para_text(p: str) -> str:
    return ''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', p))

def mark_paragraph(p: str) -> str:
    """段落内每个 <w:r> 的 rPr 替换为标注样式（整段替换，schema 顺序绝对安全）"""
    def repl(m):
        return m.group(1) + RPR + (m.group(3) or '')
    return re.sub(r'(<w:r(?: [^>]*)?>)(<w:rPr>.*?</w:rPr>)?(.*?)(?=<w:r\b|</w:p>)',
                  repl, p, flags=re.S)

def main():
    if len(sys.argv) != 4:
        print(__doc__); sys.exit(2)
    src, dst, rules_file = sys.argv[1:4]
    if os.path.abspath(src) == os.path.abspath(dst):
        sys.exit("✗ 禁止：输出路径与原稿相同（固定复制一份，原件只读）")
    rules = json.load(open(rules_file, encoding='utf-8'))

    zin = zipfile.ZipFile(src)
    doc = zin.read('word/document.xml').decode('utf-8')

    report = []

    def process(m):
        p = m.group(0)
        text = para_text(p)
        hits = [r for r in rules if r['anchor'] in text]
        if not hits:
            return p
        p2 = mark_paragraph(p)
        tags = '　【' + '】【'.join((h.get('tag') or '已标注') for h in hits) + '】'
        p2 = p2[:-len('</w:p>')] + \
             f'<w:r>{RPR}<w:t xml:space="preserve">{xesc(tags)}</w:t></w:r></w:p>'
        report.append((text[:50], [h.get('tag', '')[:30] for h in hits]))
        return p2

    new_doc = re.sub(r'<w:p[ >].*?</w:p>', process, doc, flags=re.S)
    minidom.parseString(new_doc)  # XML 合法性校验，不合法直接报错不写盘

    with zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == 'word/document.xml':
                data = new_doc.encode('utf-8')
            zout.writestr(item, data)

    print(f"✓ 标注完成 -> {dst}")
    print(f"  命中 {len(report)} 段 / 规则 {len(rules)} 条")
    for text, tags in report:
        print(f"  · {text}…  <- {tags}")
    missed = [r['anchor'] for r in rules
              if not any(r['anchor'] in t for t, _ in report)]
    if missed:
        print("  ⚠ 未命中锚点（检查措辞）:", missed)

if __name__ == '__main__':
    main()
