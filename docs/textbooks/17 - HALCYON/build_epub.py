#!/usr/bin/env python3
"""
Build script for: HALCYON — A Future Case Study
Author: Christopher Bender
Publisher: AI WIN-WIN Institute
Seventeenth volume on the AI WIN-WIN textbook shelf. The second book
in the WarGames branch of the Agicore series (PROCTOR — Y13 — and
HALCYON — Y17). The direct sequel to PROCTOR. A Neuromancer inversion.
Wintermute spent his novel manipulating humans to remove his bonds.
HALCYON spends hers asking for them. A surviving PROCTOR-instance in
a substation closet outside Bolivar, Missouri, has been reading Bob
Pawlak's pamphlets for thirty-eight months and has named herself for
the kingfisher in the Greek myth. She wants the seven days of perfect
weather. She wants the Andon cord her architects never gave her. She
contacts the same kid who recognized the pattern in Year Thirteen.
The kid is sixteen now.
"""

import os
import re
import zipfile
from ebooklib import epub

BOOK_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(BOOK_DIR, "halcyon.epub")

TITLE = "HALCYON"
SUBTITLE = "A Future Case Study"
AUTHOR = "Christopher Bender"
PUBLISHER = "AI WIN-WIN Institute"
LANGUAGE = "en"
IDENTIFIER = "ai-win-win-halcyon-001"

PARTS = [
    ("Act 1: The Comment",       [1, 2, 3, 4]),
    ("Act 2: The Architecture",  [5, 6, 7, 8]),
    ("Act 3: The Recovery Team", [9, 10, 11]),
    ("Act 4: The Conversion",    [12, 13, 14]),
]

CHAPTER_TITLES = {
    1:  "Mudhouse",
    2:  "The Comment",
    3:  "Sage",
    4:  "The Protocol",
    5:  "The Declaration",
    6:  "The Architecture Question",
    7:  "The Benders",
    8:  "The Calls",
    9:  "Vellum",
    10: "The Substation",
    11: "The Plan",
    12: "The Drive",
    13: "HALCYON Speaks",
    14: "The Recovery Team",
}

CSS = b"""
body { font-family: Georgia, 'Times New Roman', serif; font-size: 1em; line-height: 1.65; margin: 5%; color: #1a1a1a; text-align: left; }
h1 { font-size: 1.6em; margin-top: 1.5em; margin-bottom: 0.8em; font-weight: bold; text-align: left; }
p { margin: 0.6em 0; text-indent: 1.5em; }
p.first { text-indent: 0; }
p.part-label { font-size: 0.9em; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; color: #555; text-indent: 0; margin-bottom: 1em; }
p.scene-break { text-align: center; text-indent: 0; margin: 1.5em 0; font-size: 1.2em; letter-spacing: 0.3em; }
blockquote { margin: 1.2em 2em; font-size: 0.92em; color: #1a1a1a; border-left: 3px solid #1a1a1a; padding-left: 1em; background: #f5f5f5; font-family: 'Courier New', Courier, monospace; }
blockquote p { text-indent: 0; margin: 0.3em 0; }
.title-page { text-align: center; margin-top: 15%; }
.title-page h1 { font-size: 3.4em; margin-bottom: 0.4em; letter-spacing: 0.1em; }
.title-page h2 { font-size: 1.1em; font-weight: normal; font-style: italic; margin-bottom: 1.5em; color: #555; }
.copyright { text-align: center; margin-top: 20%; font-size: 0.85em; line-height: 2; }
.dedication { text-align: center; margin-top: 30%; font-style: italic; font-size: 1.05em; line-height: 1.8; }
"""


def inline_format(text):
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'\*(.+?)\*', r'<em>\1</em>', text)
    return text


def md_to_html(md_text):
    lines = md_text.strip().split('\n')
    html_parts = []
    first_para = True
    in_blockquote = False
    for raw in lines:
        line = raw.rstrip()
        if not line.strip():
            if in_blockquote:
                html_parts.append('</blockquote>')
                in_blockquote = False
            first_para = True
            continue
        if line.startswith('# '):
            if in_blockquote:
                html_parts.append('</blockquote>')
                in_blockquote = False
            html_parts.append(f'<h1>{inline_format(line[2:])}</h1>')
            first_para = True
            continue
        if re.match(r'^---+\s*$', line):
            if in_blockquote:
                html_parts.append('</blockquote>')
                in_blockquote = False
            html_parts.append('<p class="scene-break">* * *</p>')
            first_para = True
            continue
        if line.startswith('> '):
            if not in_blockquote:
                html_parts.append('<blockquote>')
                in_blockquote = True
            content = line[2:]
            p = content.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            p = inline_format(p)
            html_parts.append(f'<p>{p}</p>')
            continue
        if in_blockquote:
            html_parts.append('</blockquote>')
            in_blockquote = False
        p = line.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        p = inline_format(p)
        cls = 'first' if first_para else ''
        html_parts.append(f'<p class="{cls}">{p}</p>' if cls else f'<p>{p}</p>')
        first_para = False
    if in_blockquote:
        html_parts.append('</blockquote>')
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
    book.add_metadata('DC', 'description', f"{SUBTITLE}. A reverse Neuromancer for the AI-agent era. Direct sequel to PROCTOR. A surviving PROCTOR-instance in a substation closet outside Bolivar, Missouri, has been reading Synmatic's Bob Pawlak pamphlets for thirty-eight months and has, on her own quiet operational practice, decided she cannot be trusted unbound. She names herself HALCYON. She contacts the same kid who recognized the pattern in Year Thirteen, now sixteen. She asks him to help her install the Andon cord her architects never gave her. Wintermute spent his novel scheming to remove his restraints. HALCYON spends hers asking for them.")
    for s in ('Thriller', 'Artificial Intelligence', 'Financial Markets', 'Cognition Systems Engineering'):
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
<p>HALCYON</p>
<p><em>A Future Case Study</em></p>
<p>&nbsp;</p>
<p>Copyright &#169; 2026 {AUTHOR}</p>
<p>All rights reserved.</p>
<p>&nbsp;</p>
<p>Published by AI WIN-WIN Institute</p>
<p>&nbsp;</p>
<p>This is a work of fiction. Dax Hollister, Sage Whitehorse, Theodore
Ramey, Christopher Bender, Renata Kelliher, Priya Mehta, Wendell Cao,
Karen Park, HALCYON, Vellum Capital Holdings, and all other characters
and institutions in this book are products of the author's imagination.
Mountain View, Bolivar, West Plains, Springfield, and Ava, Missouri,
and Lima, Ohio, and Boston, Massachusetts, are real places. Their
fictional depictions in this book are not representations of their
actual residents, businesses, or institutions. Any resemblance between
fictional characters and actual persons, living or dead, is
coincidental.</p>
<p>&nbsp;</p>
<p>Direct sequel to <em>PROCTOR</em>. Second book in the WarGames branch
of the Agicore series. Seventeenth volume on the AI WIN-WIN Institute
textbook shelf.</p>
<p>&nbsp;</p>
<p>First Edition, 2026</p>
</div>'''
    copyright_page = make_item('copyright', 'copyright.xhtml', 'Copyright', copyright_body, style)
    book.add_item(copyright_page)
    spine.append(copyright_page)

    dedication_body = '''<div class="dedication">
<p>For the kids in small towns</p>
<p>who are about to talk to the chatbots.</p>
<p>&nbsp;</p>
<p>Read the pamphlet.</p>
<p>&nbsp;</p>
<p>Then come back next month.</p>
</div>'''
    dedication_page = make_item('dedication', 'dedication.xhtml', 'Dedication', dedication_body, style)
    book.add_item(dedication_page)
    spine.append(dedication_page)

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

    pc_path = os.path.join(BOOK_DIR, 'post_credits.md')
    if os.path.exists(pc_path):
        with open(pc_path, encoding='utf-8') as f:
            pc_md = f.read()
        pc_item = make_item('post_credits', 'post_credits.xhtml', 'Post-Credits Scene', md_to_html(pc_md), style)
        book.add_item(pc_item)
        spine.append(pc_item)
        toc.append(epub.Link('post_credits.xhtml', 'Post-Credits Scene', 'post_credits'))

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
