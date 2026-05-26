#!/usr/bin/env python3
"""
Build script for: Exploratory Cognition Density
Author: Christopher Bender
Publisher: AI WIN-WIN Institute
Business book in the Scott Adams (How to Fail at Almost Everything,
Loserthink, The Dilbert Principle) lineage. First-person, conversational,
30 short chapters, skill-stack framing throughout. The Stupid Company(TM)
vs The Wise Corporation as the central distinction. Twelfth book on the
AI WIN-WIN textbook shelf.
"""

import os
import re
import zipfile
from ebooklib import epub

BOOK_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(BOOK_DIR, "exploratory-cognition-density.epub")

TITLE = "Exploratory Cognition Density"
SUBTITLE = "How to Get Paid for the Thing Your Boss Calls Goofing Off"
AUTHOR = "Christopher Bender"
PUBLISHER = "AI WIN-WIN Institute"
LANGUAGE = "en"
IDENTIFIER = "ai-win-win-ecd-001"

PARTS = [
    ("Part I: The Stupid Company™", list(range(1, 11))),
    ("Part II: The Skill Stack", list(range(11, 21))),
    ("Part III: The Wise Corporation", list(range(21, 31))),
]

CHAPTER_TITLES = {
    1:  "How I Got Here",
    2:  "Meet Mendacium Corp",
    3:  "Greg Discovers AI",
    4:  "SOPHIE Arrives",
    5:  "The First Round",
    6:  "The Dashboard That Lied",
    7:  "The Slack Channel Got Quiet",
    8:  "Marv Was Right",
    9:  "Reagan Quits in Writing",
    10: "The Stupid Company™, Defined",
    11: "The Skill Stack, Explained for Adults",
    12: "Top Twenty-Five Percent Is Enough",
    13: "Skills That Stack Well in the AI Era",
    14: "How to Tell If You Are Being Replaced",
    15: "The Thing Your Boss Calls Goofing Off",
    16: "Exploratory Cognition Density, Defined",
    17: "Why Play Has Economic Value",
    18: "Haikus, Pop Choruses, and Dr. Seuss",
    19: "The Resume Item You Did Not Know You Had",
    20: "How to Quit on Tuesday",
    21: "The Job Interview Where Nobody Asks About Your Job",
    22: "Welcome to the Wise Corporation",
    23: "The Onboarding That Looks Like a Birthday Party",
    24: "What Sam Built in His Spare Time",
    25: "The Semantic Discovery Engine",
    26: "Hiring for Discovery Probability",
    27: "The Day the Two Companies Diverged",
    28: "How the Stupid Company™ Dies",
    29: "How the Wise Corporation Compounds",
    30: "We'll Let You Decide",
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
    book.add_metadata('DC', 'description', f"{SUBTITLE}. A tribute to Scott Adams and the Dilbert characters, applied to the AI labor market of 2026. The Stupid Company™ vs The Wise Corporation. Open-source, non-commercial, parody-law tradition. Twelfth book on the AI WIN-WIN textbook shelf.")
    for s in ('Business Humor', 'Career Strategy', 'Artificial Intelligence', 'Workplace Culture', 'Dilbert Tribute'):
        book.add_metadata('DC', 'subject', s)
    book.add_metadata('DC', 'rights', f'Copyright © 2026 {AUTHOR}. Open-source non-commercial release. All Dilbert character references used as parody and tribute under fair-use tradition.')

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
<p>EXPLORATORY COGNITION DENSITY</p>
<p><em>How to Get Paid for the Thing Your Boss Calls Goofing Off</em></p>
<p>&nbsp;</p>
<p>Copyright &#169; 2026 {AUTHOR}</p>
<p>Open-source non-commercial release.</p>
<p>&nbsp;</p>
<p>Published by AI WIN-WIN Institute</p>
<p>&nbsp;</p>
<p>This book is a tribute to Scott Adams and the <em>Dilbert</em> comic strip.
The Pointy-Haired Boss, Dilbert, Wally, Alice, Asok, Catbert, Dogbert, and
the Dilbert universe are the creations of Scott Adams. They appear here as
parody and homage under the fair-use tradition. The book is non-commercial.
No royalties are charged or collected. The use of the characters is the
tribute. The lessons in the book are the lessons Adams has been teaching
for thirty-five years, applied to the AI labor market of 2026.</p>
<p>&nbsp;</p>
<p>Mendacium Corp, Hyperion Studio, and the narrator Lee Hauschild are
products of the author's imagination. Any resemblance to actual companies,
persons, or events is coincidental, unless the actual company is the
unnamed company in the <em>Dilbert</em> strip, in which case the resemblance
is intentional and grateful.</p>
<p>&nbsp;</p>
<p>Twelfth volume on the AI WIN-WIN Institute textbook shelf.</p>
<p>&nbsp;</p>
<p>First Edition, 2026</p>
</div>'''
    copyright_page = make_item('copyright', 'copyright.xhtml', 'Copyright', copyright_body, style)
    book.add_item(copyright_page)
    spine.append(copyright_page)

    # Dedication
    dedication_path = os.path.join(BOOK_DIR, 'dedication.md')
    if os.path.exists(dedication_path):
        with open(dedication_path, encoding='utf-8') as f:
            ded_md = f.read()
        dedication_page = make_item('dedication', 'dedication.xhtml', 'Dedication', md_to_html(ded_md), style)
        book.add_item(dedication_page)
        spine.append(dedication_page)

    # Foreword
    foreword_path = os.path.join(BOOK_DIR, 'foreword.md')
    if os.path.exists(foreword_path):
        with open(foreword_path, encoding='utf-8') as f:
            fw_md = f.read()
        foreword_page = make_item('foreword', 'foreword.xhtml', 'Foreword', md_to_html(fw_md), style)
        book.add_item(foreword_page)
        spine.append(foreword_page)
        toc.append(epub.Link('foreword.xhtml', 'Foreword', 'foreword'))

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
