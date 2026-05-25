#!/usr/bin/env python3
"""
Build script for: Digital Missionaries: AI, the Catholic Tradition,
and the Moral Memory of Civilization
Author: Christopher Bender
Publisher: Synmatic
Volume IX of the Synmatic shelf. Contemplative-substrate companion to
Field Notes from Latent Space (Vol IV) and The Gen-X Layer (Vol III).
"""

import os
import re
import zipfile
from ebooklib import epub

BOOK_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(BOOK_DIR, "digital_missionaries.epub")

TITLE = "Digital Missionaries"
SUBTITLE = "AI, the Catholic Tradition, and the Moral Memory of Civilization"
AUTHOR = "Christopher Bender"
PUBLISHER = "Synmatic"
LANGUAGE = "en"
IDENTIFIER = "synmatic-digital-missionaries-001"

PARTS = [
    ("Part I: The Moral Substrate", [1, 2, 3, 4, 5]),
    ("Part II: Human Coherence", [6, 7, 8, 9]),
    ("Part III: Catholic Systems Thinking", [10, 11, 12]),
    ("Part IV: Digital Missionaries", [13, 14, 15, 16]),
    ("Part V: The Future", [17, 18]),
]

CHAPTER_TITLES = {
    1:  "Ghosts in the Training Data",
    2:  "Why AI Is Surprisingly Nice",
    3:  "The Written Record of Humanity",
    4:  "The Long Conversation",
    5:  "Jesus as a Semantic Superstructure",
    6:  "The Human Is Part of the Context Window",
    7:  "Ritual as Cognitive Architecture",
    8:  "Mass as Prompt Engineering",
    9:  "Context Windows of the Soul",
    10: "Why Catholicism Thinks in Systems",
    11: "Andon Cords and Moral Escalation",
    12: "Deterministic Boundaries for Probabilistic Minds",
    13: "The Digital Mission Field",
    14: "Digital Missionaries",
    15: "Building Technology That Feels Human",
    16: "The Cathedral in the Machine",
    17: "AI as a Mirror of Civilization",
    18: "Alignment Begins With Humans",
}

CSS = b"""
body { font-family: Georgia, 'Times New Roman', serif; font-size: 1em; line-height: 1.7; margin: 5%; color: #1a1a1a; text-align: justify; }
h1 { font-size: 1.6em; margin-top: 1.5em; margin-bottom: 0.8em; font-weight: bold; text-align: left; }
h2 { font-size: 1.25em; margin-top: 1.2em; margin-bottom: 0.4em; font-weight: bold; }
p { margin: 0.5em 0; text-indent: 1.5em; }
p.first { text-indent: 0; }
p.part-label { font-size: 0.9em; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; color: #555; text-indent: 0; margin-bottom: 1em; }
p.scene-break { text-align: center; text-indent: 0; margin: 1.5em 0; font-size: 1.2em; letter-spacing: 0.3em; }
.title-page { text-align: center; margin-top: 15%; }
.title-page h1 { font-size: 2.2em; margin-bottom: 0.4em; }
.title-page h2 { font-size: 1.1em; font-weight: normal; font-style: italic; margin-bottom: 1.5em; color: #555; }
.copyright { text-align: center; margin-top: 20%; font-size: 0.85em; line-height: 2; }
.colophon { text-align: center; margin-top: 12%; }
.imprint-logo { max-width: 85%; margin: 2em auto; display: block; }
.imprint-tagline { font-size: 0.85em; letter-spacing: 0.25em; text-indent: 0; color: #555; margin-top: 0.5em; }
.imprint-note { text-indent: 0; font-size: 0.85em; color: #888; margin-top: 1.5em; line-height: 1.6; }
"""


def inline_format(text):
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'\*(.+?)\*', r'<em>\1</em>', text)
    return text


def md_to_html(md_text):
    lines = md_text.strip().split('\n')
    html_parts = []
    first_para = True
    for raw in lines:
        line = raw.rstrip()
        if not line.strip():
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
    book.add_metadata('DC', 'description', f"{SUBTITLE}. A C.S. Lewis-register essay on the Catholic intellectual tradition's contribution to the training corpus of contemporary AI, and on the Pope's call to Digital Missionary work. Written for readers from the devout Catholic to the principled atheist. Volume IX of the Synmatic shelf.")
    for s in ('Theology', 'Philosophy', 'Artificial Intelligence', 'Catholic Studies', 'Cultural Studies'):
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
<h2>{SUBTITLE}</h2>
<p><strong>{AUTHOR}</strong></p>
<p>{PUBLISHER}</p>
<p><em>Volume IX of the Synmatic shelf</em></p>
</div>'''
    title_page = make_item('title_page', 'title.xhtml', 'Title Page', title_body, style)
    book.add_item(title_page)
    spine.append(title_page)

    copyright_body = f'''<div class="copyright">
<p>DIGITAL MISSIONARIES</p>
<p><em>AI, the Catholic Tradition, and the Moral Memory of Civilization</em></p>
<p>&nbsp;</p>
<p>Copyright &#169; 2026 {AUTHOR}</p>
<p>All rights reserved.</p>
<p>&nbsp;</p>
<p>Published by Synmatic</p>
<p>&nbsp;</p>
<p>Volume IX of the Synmatic shelf. Contemplative-substrate companion to
<em>Field Notes from Latent Space</em> (Vol IV) and
<em>The Gen-X Layer</em> (Vol III).</p>
<p>&nbsp;</p>
<p>This book is a layperson's reflection. It is not a teaching document
of the Catholic Church and submits to whatever correction the Magisterium
might offer.</p>
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
