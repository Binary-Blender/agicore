#!/usr/bin/env python3
"""
Build script for: Anomaly — A Carry Novelette
Author: Christopher Bender
Publisher: AI WIN-WIN Institute

Standalone prequel novelette to Carry (Vol XI). Set sixteen months before
the Iona Tran call that opens the parent book. A Vector Heavy rocket goes
catastrophic on the pad. Cole Westerlund's competitor, Knox Vandermeer,
calls him the next morning with a sentence that crosses a line, and an
offer that does not. Close third, past tense, kinetic register —
the Carry voice carried verbatim into a single-arc 15K novelette.
"""

import os
import re
import zipfile
from ebooklib import epub

BOOK_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(BOOK_DIR, "anomaly.epub")

TITLE = "Anomaly"
SUBTITLE = "A Carry Novelette"
AUTHOR = "Christopher Bender"
PUBLISHER = "AI WIN-WIN Institute"
LANGUAGE = "en"
IDENTIFIER = "ai-win-win-anomaly-novelette-001"

CHAPTER_TITLES = {
    1: "The Anomaly",
    2: "The Post",
    3: "The Call",
    4: "The Wedge",
    5: "The Offer",
    6: "The Rebuild",
}

CSS = b"""
body { font-family: Georgia, 'Times New Roman', serif; font-size: 1em; line-height: 1.65; margin: 5%; color: #1a1a1a; text-align: left; }
h1 { font-size: 1.6em; margin-top: 1.5em; margin-bottom: 0.8em; font-weight: bold; text-align: left; }
p { margin: 0.6em 0; text-indent: 1.5em; }
p.first { text-indent: 0; }
p.scene-break { text-align: center; text-indent: 0; margin: 1.5em 0; font-size: 1.2em; letter-spacing: 0.3em; }
.title-page { text-align: center; margin-top: 15%; }
.title-page h1 { font-size: 2.8em; margin-bottom: 0.4em; letter-spacing: 0.05em; }
.title-page h2 { font-size: 1.1em; font-weight: normal; font-style: italic; margin-bottom: 1.5em; color: #555; }
.copyright { text-align: center; margin-top: 20%; font-size: 0.85em; line-height: 2; }
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
    book.add_metadata('DC', 'description',
        f"{SUBTITLE}. Standalone prequel novelette to Carry. A Vector Heavy "
        "rocket goes catastrophic on the pad at Cape Canaveral. Cole "
        "Westerlund's competitor, Knox Vandermeer, calls him the next "
        "morning with a sentence that crosses a line and an offer that "
        "does not. Close third, past tense, kinetic register — the "
        "Lewis/Stone/Carreyrou thriller register applied to one founder, "
        "one bad day, and one drive up the Hood Canal in the ugliest "
        "production vehicle ever sold in the United States.")
    for s in ('Business Fiction', 'Aerospace', 'Novella', 'Carry'):
        book.add_metadata('DC', 'subject', s)
    book.add_metadata('DC', 'rights', f'Copyright © 2026 {AUTHOR}. All rights reserved.')

    style = epub.EpubItem(uid='style', file_name='style/main.css', media_type='text/css', content=CSS)
    book.add_item(style)

    spine = ['nav']
    toc = []

    title_body = f'''<div class="title-page">
<h1>{TITLE}</h1>
<h2>{SUBTITLE}</h2>
<p><strong>{AUTHOR}</strong></p>
<p>{PUBLISHER}</p>
</div>'''
    title_page = make_item('title_page', 'title.xhtml', 'Title Page', title_body, style)
    book.add_item(title_page)
    spine.append(title_page)

    copyright_body = f'''<div class="copyright">
<p>ANOMALY</p>
<p><em>A Carry Novelette</em></p>
<p>&nbsp;</p>
<p>Copyright &#169; 2026 {AUTHOR}</p>
<p>All rights reserved.</p>
<p>&nbsp;</p>
<p>Published by AI WIN-WIN Institute</p>
<p>&nbsp;</p>
<p>This is a work of fiction. Carrick, Inc., Vector, Helios Motors, Vantage
Aerospace, and all characters and events in this book are products of the
author's imagination. Any resemblance to actual companies, persons, or
events is coincidental.</p>
<p>&nbsp;</p>
<p>Prequel novelette to <em>Carry</em> (AI WIN-WIN Institute, 2026).</p>
<p>&nbsp;</p>
<p>First Edition, 2026</p>
</div>'''
    copyright_page = make_item('copyright', 'copyright.xhtml', 'Copyright', copyright_body, style)
    book.add_item(copyright_page)
    spine.append(copyright_page)

    for n in sorted(CHAPTER_TITLES):
        p = os.path.join(BOOK_DIR, f'chapter_{n:02d}.md')
        if not os.path.exists(p):
            print(f"WARNING: chapter_{n:02d}.md missing")
            continue
        with open(p, encoding='utf-8') as f:
            md = f.read()
        ch = make_item(
            f'chapter_{n:02d}',
            f'chapter_{n:02d}.xhtml',
            f'Chapter {n}: {CHAPTER_TITLES[n]}',
            md_to_html(md),
            style,
        )
        book.add_item(ch)
        spine.append(ch)
        toc.append(epub.Link(f'chapter_{n:02d}.xhtml', f'Chapter {n}: {CHAPTER_TITLES[n]}', f'chapter_{n:02d}'))

    book.toc = toc
    book.spine = spine
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())
    epub.write_epub(OUTPUT_FILE, book, {})
    print(f"EPUB written: {OUTPUT_FILE}")
    with zipfile.ZipFile(OUTPUT_FILE) as z:
        print(f"Files in EPUB: {len(z.namelist())}")
        print("Basic validation passed.")
    total = sum(
        len(open(os.path.join(BOOK_DIR, f'chapter_{n:02d}.md'), encoding='utf-8').read().split())
        for n in CHAPTER_TITLES
        if os.path.exists(os.path.join(BOOK_DIR, f'chapter_{n:02d}.md'))
    )
    written = sum(1 for n in CHAPTER_TITLES if os.path.exists(os.path.join(BOOK_DIR, f'chapter_{n:02d}.md')))
    print(f"Total words: {total:,}")
    print(f"Chapters: {written} / {len(CHAPTER_TITLES)}")
    print(f"EPUB size: {os.path.getsize(OUTPUT_FILE)/1024:.1f} KB")


if __name__ == '__main__':
    main()
