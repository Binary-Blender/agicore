#!/usr/bin/env python3
"""
Build script for: Semantic Systems Engineering: The Practitioner's Manual
Author: Christopher Bender
Publisher: Synmatic
Volume V of the Synmatic series — practice-side companion to SSE Vol I-B.
"""

import os
import re
import zipfile
from ebooklib import epub

BOOK_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(BOOK_DIR, "sse_practitioners_manual.epub")

TITLE = "Semantic Systems Engineering: The Practitioner's Manual"
AUTHOR = "Christopher Bender"
PUBLISHER = "Synmatic"
LANGUAGE = "en"
IDENTIFIER = "synmatic-sse-practitioners-manual-001"

PARTS = [
    ("Part I: The Daily Practice", [1, 2, 3, 4]),
    ("Part II: Trajectory Selection", [5, 6, 7, 8]),
    ("Part III: Practitioner Signaling", [9, 10, 11, 12]),
    ("Part IV: Semantic Momentum", [13, 14, 15, 16]),
    ("Part V: Harvest, Don't Force", [17, 18, 19, 20]),
    ("Part VI: Compounding and Production", [21, 22, 23, 24, 25, 26, 27]),
]

CHAPTER_TITLES = {
    1:  "The Master and the Spectator",
    2:  "Think — Morning Calibration",
    3:  "Attune — Real-Time Awareness",
    4:  "Observe — End-of-Day Audit",
    5:  "Steering, Not Policing",
    6:  "Progressive Constraint Steering",
    7:  "Context Window Hygiene",
    8:  "Multi-Model Orchestration",
    9:  "Implicit Practitioner Signaling",
    10: "The Power of Pet Peeves",
    11: "Worldview Transmission",
    12: "Why Roleplay Prompting Underperforms",
    13: "The Architecture as Salesman",
    14: "Recursive Justification",
    15: "Semantic Momentum Engineering",
    16: "The Meta-Joke Test",
    17: "Harvest, Don't Force",
    18: "Future-State Kaizen for AI",
    19: "The Meridian Case Study",
    20: "Cartography in Practice",
    21: "Build Up, Pare Down, Build Up",
    22: "Cumulative Cognitive Infrastructure",
    23: "The Era of Concurrent Building",
    24: "The Non-Blocking Variant Evaluation Engine",
    25: "Inline QC Contracts and the Shadow Line",
    26: "Tuning the Manufacturing System",
    27: "The Long Arc",
}

CSS = b"""
body { font-family: Georgia, 'Times New Roman', serif; font-size: 1em; line-height: 1.7; margin: 5%; color: #1a1a1a; text-align: justify; }
h1 { font-size: 1.6em; margin-top: 1.5em; margin-bottom: 0.8em; font-weight: bold; text-align: left; }
h2 { font-size: 1.25em; margin-top: 1.2em; margin-bottom: 0.4em; font-weight: bold; }
h3 { font-size: 1.05em; margin-top: 1em; margin-bottom: 0.3em; font-style: italic; }
p { margin: 0.5em 0; text-indent: 1.5em; }
p.first { text-indent: 0; }
p.chapter-num { font-size: 0.85em; color: #888; text-indent: 0; margin-bottom: 0.2em; letter-spacing: 0.05em; }
p.part-label { font-size: 0.9em; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; color: #555; text-indent: 0; margin-bottom: 1em; }
p.scene-break { text-align: center; text-indent: 0; margin: 1.5em 0; }
pre { font-family: 'Courier New', Courier, monospace; font-size: 0.78em; background: #f5f5f5; border-left: 3px solid #999; padding: 0.8em 1em; margin: 1em 0; white-space: pre-wrap; word-wrap: break-word; }
code { font-family: 'Courier New', Courier, monospace; font-size: 0.85em; background: #f0f0f0; padding: 0.1em 0.25em; }
.title-page { text-align: center; margin-top: 15%; }
.title-page h1 { font-size: 2em; margin-bottom: 0.4em; }
.copyright { text-align: center; margin-top: 20%; font-size: 0.85em; line-height: 2; }
.colophon { text-align: center; margin-top: 12%; }
.imprint-logo { max-width: 85%; margin: 2em auto; display: block; }
.imprint-tagline { font-size: 0.85em; letter-spacing: 0.25em; text-indent: 0; color: #555; margin-top: 0.5em; }
.imprint-note { text-indent: 0; font-size: 0.85em; color: #888; margin-top: 1.5em; line-height: 1.6; }
"""


def inline_format(text):
    text = re.sub(r'`([^`]+)`', lambda m: f'<code>{m.group(1).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")}</code>', text)
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'\*(.+?)\*', r'<em>\1</em>', text)
    return text


def md_to_html(md_text):
    lines = md_text.strip().split('\n')
    html_parts = []
    in_code_block = False
    code_lines = []
    first_para = True

    def flush_code():
        c = '\n'.join(code_lines).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        html_parts.append(f'<pre>{c}</pre>')
        code_lines.clear()

    for raw in lines:
        line = raw.rstrip()
        if line.startswith('```'):
            if not in_code_block:
                in_code_block = True
            else:
                in_code_block = False
                flush_code()
                first_para = True
            continue
        if in_code_block:
            code_lines.append(raw)
            continue
        if not line.strip():
            first_para = True
            continue
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
        if re.match(r'^---+\s*$', line):
            html_parts.append('<p class="scene-break">* * *</p>')
            first_para = True
            continue
        p = line.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        p = inline_format(p)
        cls = 'first' if first_para else ''
        html_parts.append(f'<p class="{cls}">{p}</p>' if cls else f'<p>{p}</p>')
        first_para = False
    if in_code_block and code_lines:
        flush_code()
    return '\n'.join(html_parts)


def make_item(uid, filename, title, body, style):
    item = epub.EpubHtml(uid=uid, file_name=filename, title=title, lang='en')
    item.content = body.encode('utf-8')
    item.add_item(style)
    return item


def main():
    book = epub.EpubBook()
    book.set_identifier(IDENTIFIER)
    book.set_title(TITLE)
    book.set_language(LANGUAGE)
    book.add_author(AUTHOR)
    book.add_metadata('DC', 'publisher', PUBLISHER)
    for s in ('Artificial Intelligence', 'Software Engineering', 'Computer Science', 'Practitioner Manual'):
        book.add_metadata('DC', 'subject', s)
    book.add_metadata('DC', 'rights', f'Copyright © 2026 {AUTHOR}. All rights reserved.')

    style = epub.EpubItem(uid='style', file_name='style/main.css', media_type='text/css', content=CSS)
    book.add_item(style)

    logo_path = os.path.join(BOOK_DIR, 'synmatic_logo.jpg')
    if os.path.exists(logo_path):
        with open(logo_path, 'rb') as f:
            logo_content = f.read()
        logo_item = epub.EpubItem(uid='synmatic_logo', file_name='images/synmatic_logo.jpg', media_type='image/jpeg', content=logo_content)
        book.add_item(logo_item)

    spine = ['nav']
    toc = []

    title_body = f'''<div class="title-page">
<h1>{TITLE}</h1>
<p><em>Daily Practice and Field Techniques</em></p>
<p><strong>{AUTHOR}</strong></p>
<p>{PUBLISHER}</p>
<p><em>Volume V of the Synmatic series — companion to Semantic Systems Engineering Vol I-B</em></p>
</div>'''
    title_page = make_item('title_page', 'title.xhtml', 'Title Page', title_body, style)
    book.add_item(title_page)
    spine.append(title_page)

    copyright_body = '''<div class="copyright">
<p>SEMANTIC SYSTEMS ENGINEERING: THE PRACTITIONER'S MANUAL</p>
<p><em>Daily Practice and Field Techniques</em></p>
<p>&nbsp;</p>
<p>Copyright &#169; 2026 Christopher Bender</p>
<p>All rights reserved.</p>
<p>&nbsp;</p>
<p>Published by Synmatic</p>
<p>&nbsp;</p>
<p>Volume V of the Synmatic series. Practice-side companion to
<em>Semantic Systems Engineering: Theory, Architecture, and Practice</em> (Vol I-B).</p>
<p>&nbsp;</p>
<p>First Edition, 2026</p>
</div>'''
    copyright_page = make_item('copyright', 'copyright.xhtml', 'Copyright', copyright_body, style)
    book.add_item(copyright_page)
    spine.append(copyright_page)

    for part_idx, (part_title, chapter_nums) in enumerate(PARTS, 1):
        ch_list = ''.join(f'<p>Chapter {n}: {CHAPTER_TITLES[n]}</p>' for n in chapter_nums)
        part_body = f'<p class="part-label">{part_title}</p>\n{ch_list}'
        part_item = make_item(f'part_{part_idx}', f'part_{part_idx}.xhtml', part_title, part_body, style)
        book.add_item(part_item)
        spine.append(part_item)
        part_toc = []
        for n in chapter_nums:
            p = os.path.join(BOOK_DIR, f'chapter_{n:02d}.md')
            if not os.path.exists(p):
                print(f"WARNING: chapter_{n:02d}.md missing")
                continue
            with open(p, encoding='utf-8') as f:
                md = f.read()
            ch = make_item(f'chapter_{n:02d}', f'chapter_{n:02d}.xhtml', f'Chapter {n}: {CHAPTER_TITLES[n]}', md_to_html(md), style)
            book.add_item(ch)
            spine.append(ch)
            part_toc.append(epub.Link(f'chapter_{n:02d}.xhtml', f'Chapter {n}: {CHAPTER_TITLES[n]}', f'chapter_{n:02d}'))
        toc.append((epub.Section(part_title), part_toc))

    colophon_body = '''<div class="colophon">
<img src="images/synmatic_logo.jpg" alt="Synmatic" class="imprint-logo"/>
<p class="imprint-tagline">NEURAL SYSTEMS &nbsp;|&nbsp; AI WORKFLOWS</p>
<p class="imprint-note">Published by Synmatic.</p>
<p class="imprint-note">A research-lab imprint dedicated to AI-native systems engineering.</p>
</div>'''
    colophon = make_item('colophon', 'colophon.xhtml', 'Colophon', colophon_body, style)
    book.add_item(colophon)
    spine.append(colophon)

    book.toc = toc
    book.spine = spine
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())
    epub.write_epub(OUTPUT_FILE, book, {})
    print(f"EPUB written: {OUTPUT_FILE}")
    with zipfile.ZipFile(OUTPUT_FILE) as z:
        print(f"Files in EPUB: {len(z.namelist())}")
        print("Basic validation passed.")
    total = sum(len(open(os.path.join(BOOK_DIR, f'chapter_{n:02d}.md'), encoding='utf-8').read().split())
                for _, chs in PARTS for n in chs if os.path.exists(os.path.join(BOOK_DIR, f'chapter_{n:02d}.md')))
    written = sum(1 for _, chs in PARTS for n in chs if os.path.exists(os.path.join(BOOK_DIR, f'chapter_{n:02d}.md')))
    print(f"Total words: {total:,}")
    print(f"Chapters: {written} / {sum(len(chs) for _, chs in PARTS)}")
    print(f"EPUB size: {os.path.getsize(OUTPUT_FILE)/1024:.1f} KB")


if __name__ == '__main__':
    main()
