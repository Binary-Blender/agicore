#!/usr/bin/env python3
"""
Build script for: The Chocolate Wars — A Future Case Study
Author: Christopher Bender
Publisher: AI WIN-WIN Institute
Sister volume to Forward. Jimmy Donaldson takes on Hershey's. The
chocolate is the means; the schools are the end. The empire is the
means; the life is the end. Both are versions of: the work is not
the point. Jimmy discovers Agicore mid-book and recognizes his own
Toyota-Production-System-coded operating philosophy formalized into
open-source infrastructure. Thirteenth book on the AI WIN-WIN
textbook shelf.
"""

import os
import re
import zipfile
from ebooklib import epub

BOOK_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(BOOK_DIR, "the-chocolate-wars.epub")

TITLE = "The Chocolate Wars"
SUBTITLE = "A Future Case Study"
AUTHOR = "Christopher Bender"
PUBLISHER = "AI WIN-WIN Institute"
LANGUAGE = "en"
IDENTIFIER = "ai-win-win-chocolate-wars-001"

PARTS = [
    ("Act 1: The Empire", [1, 2, 3, 4]),
    ("Act 2: The Wars Begin", [5, 6, 7, 8]),
    ("Act 3: The Unification", [9, 10, 11, 12]),
    ("Act 4: The Reframe", [13, 14]),
]

CHAPTER_TITLES = {
    1:  "Greenville",
    2:  "The Cease-and-Desist",
    3:  "KwaZulu-Natal",
    4:  "Hershey, Pennsylvania",
    5:  "Bentonville",
    6:  "The Walmart Aisle Video",
    7:  "The Andon Cord",
    8:  "The Issue",
    9:  "The Specification",
    10: "Beast Games",
    11: "The Trust Meeting",
    12: "The Test",
    13: "The Third Classroom",
    14: "Pancakes",
}

CSS = b"""
body { font-family: Georgia, 'Times New Roman', serif; font-size: 1em; line-height: 1.65; margin: 5%; color: #1a1a1a; text-align: left; }
h1 { font-size: 1.6em; margin-top: 1.5em; margin-bottom: 0.8em; font-weight: bold; text-align: left; }
p { margin: 0.6em 0; text-indent: 1.5em; }
p.first { text-indent: 0; }
p.part-label { font-size: 0.9em; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; color: #555; text-indent: 0; margin-bottom: 1em; }
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
    book.add_metadata('DC', 'description', f"{SUBTITLE}. A business novel about a fictional commerce giant (Argo, Inc.) facing the structural commoditization of retail in the AI era, and the founder who pivots the company from extractive retailer to additive platform. Phoenix Project / Moneyball / Liar's Poker register. Fourth book in the AI WIN-WIN business-fable quartet (Anchor / Multiplied / Untied / Carry).")
    for s in ('Business Fiction', 'Artificial Intelligence', 'Platform Economy', 'Strategic Pivot'):
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
<p>THE CHOCOLATE WARS</p>
<p><em>A Future Case Study</em></p>
<p>&nbsp;</p>
<p>Copyright &#169; 2026 {AUTHOR}</p>
<p>All rights reserved.</p>
<p>&nbsp;</p>
<p>Published by AI WIN-WIN Institute</p>
<p>&nbsp;</p>
<p>This is a work of fiction. Jimmy Donaldson, Lerato Booysen, Eleanor
Whitcomb, the Milton Hershey School Trust as depicted, and all characters
and events in this book are products of the author's imagination. The
Hershey Company, MrBeast LLC, Feastables, and the Milton Hershey School
Trust are real entities; their fictional depictions in this book are not
representations of their actual operations, statements, or strategic
positions. Any resemblance between fictional events and actual events is
coincidental except where the public record has made coincidence
unavoidable.</p>
<p>&nbsp;</p>
<p>Companion to <em>Carry</em> and <em>Forward</em>. Thirteenth volume on
the AI WIN-WIN Institute textbook shelf.</p>
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

    # Post-credits scene
    pc_path = os.path.join(BOOK_DIR, 'post_credits.md')
    if os.path.exists(pc_path):
        with open(pc_path, encoding='utf-8') as f:
            pc_md = f.read()
        pc_item = make_item('post_credits', 'post_credits.xhtml', 'Post-Credits Scene', md_to_html(pc_md), style)
        book.add_item(pc_item)
        spine.append(pc_item)
        toc.append(epub.Link('post_credits.xhtml', 'Post-Credits Scene', 'post_credits'))

    # Epilogue — future-history excerpt
    ep_path = os.path.join(BOOK_DIR, 'epilogue.md')
    if os.path.exists(ep_path):
        with open(ep_path, encoding='utf-8') as f:
            ep_md = f.read()
        ep_item = make_item('epilogue', 'epilogue.xhtml', 'Epilogue: From the Future', md_to_html(ep_md), style)
        book.add_item(ep_item)
        spine.append(ep_item)
        toc.append(epub.Link('epilogue.xhtml', 'Epilogue: From the Future', 'epilogue'))

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
