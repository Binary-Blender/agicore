#!/usr/bin/env python3
"""
Build script for: Cognition Systems Engineering: Theory, Architecture, and Practice
Author: Christopher Bender
Publisher: AI WIN-WIN Institute
"""

import os
import re
import zipfile
from ebooklib import epub

BOOK_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(BOOK_DIR, "cognition_systems_engineering.epub")

TITLE = "Cognition Systems Engineering: Theory, Architecture, and Practice"
AUTHOR = "Christopher Bender"
PUBLISHER = "AI WIN-WIN Institute"
LANGUAGE = "en"
IDENTIFIER = "agicore-cse-textbook-001"

PARTS = [
    ("Part I: The Field — Establishing Cognition Systems Engineering", [1, 2, 3]),
    ("Part II: Cognition Theory", [4, 5, 6, 7]),
    ("Part III: Production Systems Theory", [8, 9, 10, 11, 12]),
    ("Part IV: Cognitive Pipeline Engineering", [13, 14, 15, 16]),
    ("Part V: The Agicore Implementation Framework", [17, 18, 19, 20, 21, 22, 23]),
    ("Part VI: The Practitioner and the Future", [24, 25, 26, 27]),
]

CHAPTER_TITLES = {
    1:  "The Emergence of a Discipline",
    2:  "Systems Engineering Foundations Applied to Cognition",
    3:  "The Cognitive Infrastructure Model",
    4:  "Probabilistic Cognitive Infrastructure",
    5:  "Cognition Allocation Theory",
    6:  "Semantic Contracts and Information Boundaries",
    7:  "The Cattle Dog Principle: Authority Hierarchies in Cognitive Systems",
    8:  "A Century of Production Systems",
    9:  "The Eight Principles of Cognitive Production",
    10: "Statistical Process Control for Cognitive Systems",
    11: "Hallucination Harvesting",
    12: "The Five Emergent Properties of Cognitive Production Systems",
    13: "Cognitive Pipeline Architecture",
    14: "The QC Mesh Architecture",
    15: "Knowledge Architecture and Semantic Memory",
    16: "The Requirements Mind: Specification as Engineering Practice",
    17: "The DSL as Constraint Boundary",
    18: "Channels, Packets, and Message Topology",
    19: "Triggers and Reactive Orchestration",
    20: "The Reasoner: Structured AI Inference",
    21: "Session, Module, and Cognitive State",
    22: "Authority, Trust, and Semantic Governance",
    23: "Semantic Memory: Cross-Session Intelligence",
    24: "The CSE Practitioner: Skills, Identity, and Career",
    25: "Ethics of Cognitive Systems Engineering",
    26: "The Fractal: CSE at Every Scale",
    27: "The Future of Industrialized Cognition",
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


def md_to_html(md_text: str) -> str:
    """Convert markdown chapter text to body HTML for EPUB."""
    lines = md_text.strip().split('\n')
    html_parts = []
    in_code_block = False
    code_lines = []
    first_para = True

    def flush_code():
        code_content = '\n'.join(code_lines)
        # Escape entities inside code blocks
        code_content = code_content.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        html_parts.append(f'<pre>{code_content}</pre>')
        code_lines.clear()

    for raw_line in lines:
        line = raw_line.rstrip()

        # Code fence handling
        if line.startswith('```'):
            if not in_code_block:
                in_code_block = True
                # code_lines starts fresh
            else:
                in_code_block = False
                flush_code()
                first_para = True  # after a code block, next para is "first"
            continue

        if in_code_block:
            code_lines.append(raw_line)
            continue

        # Empty line
        if not line.strip():
            first_para = True
            continue

        # Headings
        if line.startswith('### '):
            content = inline_format(line[4:])
            html_parts.append(f'<h3>{content}</h3>')
            first_para = True
            continue
        if line.startswith('## '):
            content = inline_format(line[3:])
            html_parts.append(f'<h2>{content}</h2>')
            first_para = True
            continue
        if line.startswith('# '):
            content = inline_format(line[2:])
            html_parts.append(f'<h1>{content}</h1>')
            first_para = True
            continue

        # Horizontal rule
        if re.match(r'^---+\s*$', line):
            html_parts.append('<p class="scene-break">* * *</p>')
            first_para = True
            continue

        # Regular paragraph line
        # Escape HTML entities first
        processed = line.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        processed = inline_format(processed)

        cls = 'first' if first_para else ''
        if cls:
            html_parts.append(f'<p class="{cls}">{processed}</p>')
        else:
            html_parts.append(f'<p>{processed}</p>')
        first_para = False

    # Close unclosed code block
    if in_code_block and code_lines:
        flush_code()

    return '\n'.join(html_parts)


def inline_format(text: str) -> str:
    """Apply bold, italic, inline code after HTML escaping."""
    # Inline code
    text = re.sub(r'`([^`]+)`', lambda m: f'<code>{m.group(1).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")}</code>', text)
    # Bold
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    # Italic
    text = re.sub(r'\*(.+?)\*', r'<em>\1</em>', text)
    return text


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
    book.add_metadata('DC', 'subject', 'Systems Engineering')
    book.add_metadata('DC', 'subject', 'Computer Science')
    book.add_metadata('DC', 'rights', f'Copyright © 2025 {AUTHOR}. All rights reserved.')

    # CSS
    style = epub.EpubItem(uid='style', file_name='style/main.css', media_type='text/css', content=CSS)
    book.add_item(style)

    spine = ['nav']
    toc = []

    # Title page
    title_body = f'''<div class="title-page">
<h1>{TITLE}</h1>
<p><strong>{AUTHOR}</strong></p>
<p>{PUBLISHER}</p>
</div>'''
    title_page = make_item('title_page', 'title.xhtml', 'Title Page', title_body, style)
    book.add_item(title_page)
    spine.append(title_page)

    # Copyright page
    copyright_body = '''<div class="copyright">
<p>COGNITION SYSTEMS ENGINEERING: THEORY, ARCHITECTURE, AND PRACTICE</p>
<p>&nbsp;</p>
<p>Copyright &#169; 2025 Christopher Bender</p>
<p>All rights reserved.</p>
<p>&nbsp;</p>
<p>Published by the AI WIN-WIN Institute</p>
<p>&nbsp;</p>
<p>Agicore is open-source software licensed under the MIT License.</p>
<p>&nbsp;</p>
<p>No part of this publication may be reproduced, distributed, or transmitted
in any form or by any means without the prior written permission of the publisher,
except in the case of brief quotations embodied in critical reviews and
certain other noncommercial uses permitted by copyright law.</p>
<p>&nbsp;</p>
<p>First Edition, 2025</p>
</div>'''
    copyright_page = make_item('copyright', 'copyright.xhtml', 'Copyright', copyright_body, style)
    book.add_item(copyright_page)
    spine.append(copyright_page)

    # Parts and chapters
    for part_idx, (part_title, chapter_nums) in enumerate(PARTS, 1):
        # Part intro page
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
            with open(ch_path, 'r', encoding='utf-8') as f:
                md = f.read()

            ch_title = CHAPTER_TITLES[ch_num]
            body = f'<p class="chapter-num">Chapter {ch_num}</p>\n<h1>{ch_title}</h1>\n' + md_to_html(md)

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

    # Validate
    with zipfile.ZipFile(OUTPUT_FILE, 'r') as z:
        names = z.namelist()
        print(f"Files in EPUB: {len(names)}")
        assert 'mimetype' in names, "Missing mimetype"
        assert any('content.opf' in n for n in names), "Missing content.opf"
        print("Basic validation passed.")

    # Word count
    total = sum(
        len(open(os.path.join(BOOK_DIR, f'chapter_{n:02d}.md'), encoding='utf-8').read().split())
        for _, chs in PARTS for n in chs
    )
    print(f"Total words: {total:,}")
    print(f"Chapters: {sum(len(chs) for _, chs in PARTS)}")
    epub_size = os.path.getsize(OUTPUT_FILE)
    print(f"EPUB size: {epub_size / 1024:.1f} KB")


if __name__ == '__main__':
    main()
