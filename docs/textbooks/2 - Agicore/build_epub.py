#!/usr/bin/env python3
"""
Build script for: Agicore: Theory, Architecture, and Practice
Author: Christopher Bender
Publisher: Synmatic
Companion volume to "Cognition Systems Engineering: Theory, Architecture, and Practice"
"""

import os
import re
import zipfile
from ebooklib import epub

BOOK_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(BOOK_DIR, "agicore_theory_architecture_practice.epub")

TITLE = "Agicore: Theory, Architecture, and Practice"
AUTHOR = "Christopher Bender"
PUBLISHER = "Synmatic"
LANGUAGE = "en"
IDENTIFIER = "agicore-textbook-001"

PARTS = [
    ("Part I: The Architectural Thesis", [1, 2, 3, 4]),
    ("Part II: The Compiler", [5, 6, 7, 8]),
    ("Part III: The Declaration Layers", [9, 10, 11, 12, 13, 14, 15]),
    ("Part IV: The Andon Loop", [16, 17, 18, 19, 20]),
    ("Part V: The Reference Implementations", [21, 22, 23, 24]),
    ("Part VI: The Future", [25, 26, 27]),
]

CHAPTER_TITLES = {
    1:  "The Inversion",
    2:  "Determinism at Runtime",
    3:  "The Four-Generation Lineage",
    4:  "The DSL as Constraint Boundary",
    5:  "From .agi to Tauri — The Compilation Pipeline",
    6:  "Grammar, Lexer, Parser",
    7:  "Code Generation Theory",
    8:  "The Two-Compiler Property",
    9:  "The Application Layer",
    10: "The Orchestration Layer",
    11: "The Expert System Layer",
    12: "The Cooperative Intelligence Layer",
    13: "The Semantic Infrastructure Layer",
    14: "The Adaptive Intelligence Layer",
    15: "The Ambient + Embedded Layer",
    16: "Continual Harness Inverted",
    17: "MUTATION_POLICY and the Tier Verifier",
    18: "Sandbox, NBVE, and Shadow Evaluation",
    19: "Approval Chains and the Cryptographic Audit Trail",
    20: "Andon Responders and Improvement Reasoners",
    21: "NovaSyn Chat — The Canary",
    22: "HOC — The Andon Loop in Production",
    23: "The Accelerando Suite — Enterprise at Compilation Scale",
    24: "Skill Docs — AI Co-authoring at Industrial Scale",
    25: "How Agicore Evolves",
    26: "Replacing Nine-Figure Software",
    27: "The Recursive Platform",
}

CSS = b"""
body {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 1em;
    line-height: 1.7;
    margin: 5%;
    color: #1a1a1a;
    text-align: justify;
}
h1 {
    font-size: 1.6em;
    margin-top: 1.5em;
    margin-bottom: 0.8em;
    font-weight: bold;
    text-align: left;
}
h2 {
    font-size: 1.25em;
    margin-top: 1.2em;
    margin-bottom: 0.4em;
    font-weight: bold;
}
h3 {
    font-size: 1.05em;
    margin-top: 1em;
    margin-bottom: 0.3em;
    font-style: italic;
}
p {
    margin: 0.5em 0;
    text-indent: 1.5em;
}
p.first { text-indent: 0; }
p.chapter-num {
    font-size: 0.85em;
    color: #888;
    text-indent: 0;
    margin-bottom: 0.2em;
    letter-spacing: 0.05em;
}
p.part-label {
    font-size: 0.9em;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #555;
    text-indent: 0;
    margin-bottom: 1em;
}
p.scene-break {
    text-align: center;
    text-indent: 0;
    margin: 1.5em 0;
}
pre {
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.78em;
    background: #f5f5f5;
    border-left: 3px solid #999;
    padding: 0.8em 1em;
    margin: 1em 0;
    white-space: pre-wrap;
    word-wrap: break-word;
}
code {
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.85em;
    background: #f0f0f0;
    padding: 0.1em 0.25em;
}
table {
    border-collapse: collapse;
    margin: 1em 0;
    font-size: 0.9em;
    width: 100%;
}
th, td {
    border: 1px solid #ccc;
    padding: 0.4em 0.6em;
    text-align: left;
    vertical-align: top;
}
th {
    background: #f0f0f0;
    font-weight: bold;
}
.title-page {
    text-align: center;
    margin-top: 15%;
}
.title-page h1 {
    font-size: 2em;
    margin-bottom: 0.4em;
}
.copyright {
    text-align: center;
    margin-top: 20%;
    font-size: 0.85em;
    line-height: 2;
}
"""


def inline_format(text: str) -> str:
    """Apply bold, italic, inline code after HTML escaping."""
    text = re.sub(r'`([^`]+)`', lambda m: f'<code>{m.group(1).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")}</code>', text)
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'\*(.+?)\*', r'<em>\1</em>', text)
    return text


def md_to_html(md_text: str) -> str:
    """Convert markdown chapter text to body HTML for EPUB. Handles code fences, tables, headings."""
    lines = md_text.strip().split('\n')
    html_parts = []
    in_code_block = False
    code_lines = []
    first_para = True

    # Table state
    in_table = False
    table_rows = []  # list of lists of cell strings; first row treated as header if followed by separator

    def flush_code():
        code_content = '\n'.join(code_lines)
        code_content = code_content.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        html_parts.append(f'<pre>{code_content}</pre>')
        code_lines.clear()

    def flush_table():
        nonlocal in_table
        if not table_rows:
            in_table = False
            return
        # Detect header separator row: a row of cells matching --- pattern
        header = None
        body_rows = table_rows
        if len(table_rows) >= 2 and all(re.match(r'^\s*:?-{2,}:?\s*$', c) for c in table_rows[1]):
            header = table_rows[0]
            body_rows = table_rows[2:]
        out = ['<table>']
        if header:
            out.append('<thead><tr>')
            for cell in header:
                out.append(f'<th>{inline_format(cell.strip())}</th>')
            out.append('</tr></thead>')
        out.append('<tbody>')
        for row in body_rows:
            out.append('<tr>')
            for cell in row:
                out.append(f'<td>{inline_format(cell.strip())}</td>')
            out.append('</tr>')
        out.append('</tbody></table>')
        html_parts.append('\n'.join(out))
        table_rows.clear()
        in_table = False

    for raw_line in lines:
        line = raw_line.rstrip()

        # Code fence
        if line.startswith('```'):
            if in_table:
                flush_table()
            if not in_code_block:
                in_code_block = True
            else:
                in_code_block = False
                flush_code()
                first_para = True
            continue

        if in_code_block:
            code_lines.append(raw_line)
            continue

        # Empty line
        if not line.strip():
            if in_table:
                flush_table()
            first_para = True
            continue

        # Table row detection: starts with | and has at least one more |
        if line.startswith('|') and line.count('|') >= 2:
            # Split cells: strip leading/trailing pipes, then split by |
            stripped = line.strip()
            if stripped.startswith('|'):
                stripped = stripped[1:]
            if stripped.endswith('|'):
                stripped = stripped[:-1]
            cells = stripped.split('|')
            table_rows.append(cells)
            in_table = True
            continue
        elif in_table:
            flush_table()

        # Headings
        if line.startswith('### '):
            html_parts.append(f'<h3>{inline_format(line[4:])}</h3>')
            first_para = True
            continue
        if line.startswith('## '):
            html_parts.append(f'<h2>{inline_format(line[3:])}</h2>')
            first_para = True
            continue
        if line.startswith('# '):
            html_parts.append(f'<h1>{inline_format(line[2:])}</h1>')
            first_para = True
            continue

        # Horizontal rule
        if re.match(r'^---+\s*$', line):
            html_parts.append('<p class="scene-break">* * *</p>')
            first_para = True
            continue

        # Regular paragraph
        processed = line.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        processed = inline_format(processed)
        cls = 'first' if first_para else ''
        if cls:
            html_parts.append(f'<p class="{cls}">{processed}</p>')
        else:
            html_parts.append(f'<p>{processed}</p>')
        first_para = False

    # Close any pending blocks
    if in_code_block and code_lines:
        flush_code()
    if in_table:
        flush_table()

    return '\n'.join(html_parts)


def make_item(uid, filename, title, body_html, style_item):
    item = epub.EpubHtml(uid=uid, file_name=filename, title=title, lang='en')
    item.content = body_html.encode('utf-8')
    item.add_item(style_item)
    return item


def main():
    book = epub.EpubBook()
    book.set_identifier(IDENTIFIER)
    book.set_title(TITLE)
    book.set_language(LANGUAGE)
    book.add_author(AUTHOR)
    book.add_metadata('DC', 'publisher', PUBLISHER)
    book.add_metadata('DC', 'subject', 'Artificial Intelligence')
    book.add_metadata('DC', 'subject', 'Software Engineering')
    book.add_metadata('DC', 'subject', 'Computer Science')
    book.add_metadata('DC', 'subject', 'Compiler Design')
    book.add_metadata('DC', 'subject', 'Systems Engineering')
    book.add_metadata('DC', 'rights', f'Copyright © 2026 {AUTHOR}. All rights reserved.')

    style = epub.EpubItem(uid='style', file_name='style/main.css', media_type='text/css', content=CSS)
    book.add_item(style)

    spine = ['nav']
    toc = []

    # Title page
    title_body = f'''<div class="title-page">
<h1>{TITLE}</h1>
<p><strong>{AUTHOR}</strong></p>
<p>{PUBLISHER}</p>
<p><em>A companion volume to Cognition Systems Engineering</em></p>
</div>'''
    title_page = make_item('title_page', 'title.xhtml', 'Title Page', title_body, style)
    book.add_item(title_page)
    spine.append(title_page)

    # Copyright page
    copyright_body = '''<div class="copyright">
<p>AGICORE: THEORY, ARCHITECTURE, AND PRACTICE</p>
<p>&nbsp;</p>
<p>Copyright &#169; 2026 Christopher Bender</p>
<p>All rights reserved.</p>
<p>&nbsp;</p>
<p>Published by the Synmatic</p>
<p>&nbsp;</p>
<p>Companion volume to <em>Cognition Systems Engineering: Theory, Architecture, and Practice</em>.</p>
<p>&nbsp;</p>
<p>Agicore is open-source software licensed under the MIT License.</p>
<p>&nbsp;</p>
<p>No part of this publication may be reproduced, distributed, or transmitted
in any form or by any means without the prior written permission of the publisher,
except in the case of brief quotations embodied in critical reviews and
certain other noncommercial uses permitted by copyright law.</p>
<p>&nbsp;</p>
<p>First Edition, 2026</p>
</div>'''
    copyright_page = make_item('copyright', 'copyright.xhtml', 'Copyright', copyright_body, style)
    book.add_item(copyright_page)
    spine.append(copyright_page)

    # Parts and chapters
    for part_idx, (part_title, chapter_nums) in enumerate(PARTS, 1):
        ch_list = ''.join(
            f'<p>Chapter {n}: {CHAPTER_TITLES[n]}</p>' for n in chapter_nums
        )
        part_body = f'<p class="part-label">{part_title}</p>\n{ch_list}'
        part_item = make_item(
            f'part_{part_idx}', f'part_{part_idx}.xhtml', part_title, part_body, style
        )
        book.add_item(part_item)
        spine.append(part_item)

        part_toc_entries = []
        for ch_num in chapter_nums:
            ch_path = os.path.join(BOOK_DIR, f'chapter_{ch_num:02d}.md')
            if not os.path.exists(ch_path):
                print(f"WARNING: {ch_path} not found, skipping")
                continue
            with open(ch_path, 'r', encoding='utf-8') as f:
                md = f.read()

            ch_title = CHAPTER_TITLES[ch_num]
            # The chapter file's own `# Chapter N: Title` will be rendered as h1 by md_to_html;
            # we skip prepending a chapter-num + h1 since the source file already provides the title.
            body = md_to_html(md)

            uid = f'chapter_{ch_num:02d}'
            filename = f'chapter_{ch_num:02d}.xhtml'
            ch_item = make_item(uid, filename, f'Chapter {ch_num}: {ch_title}', body, style)
            book.add_item(ch_item)
            spine.append(ch_item)
            part_toc_entries.append(epub.Link(filename, f'Chapter {ch_num}: {ch_title}', uid))

        toc.append((epub.Section(part_title), part_toc_entries))

    book.toc = toc
    book.spine = spine
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())

    epub.write_epub(OUTPUT_FILE, book, {})
    print(f"EPUB written: {OUTPUT_FILE}")

    with zipfile.ZipFile(OUTPUT_FILE, 'r') as z:
        names = z.namelist()
        print(f"Files in EPUB: {len(names)}")
        assert 'mimetype' in names, "Missing mimetype"
        assert any('content.opf' in n for n in names), "Missing content.opf"
        print("Basic validation passed.")

    total = 0
    written = 0
    for _, chs in PARTS:
        for n in chs:
            p = os.path.join(BOOK_DIR, f'chapter_{n:02d}.md')
            if os.path.exists(p):
                with open(p, encoding='utf-8') as f:
                    total += len(f.read().split())
                written += 1
    print(f"Total words: {total:,}")
    print(f"Chapters: {written} / {sum(len(chs) for _, chs in PARTS)}")
    epub_size = os.path.getsize(OUTPUT_FILE)
    print(f"EPUB size: {epub_size / 1024:.1f} KB")


if __name__ == '__main__':
    main()
