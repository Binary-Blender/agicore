#!/usr/bin/env python3
"""
Build script for: The Complete Codes — A Unified Philosophy for the Examined Life
Author: Christopher Bender
Publisher: Synmatic
Volume X of the Synmatic shelf. The practitioner's-guide-for-life companion to
the technical and contemplative volumes. Nine philosophical traditions, 267 codes,
one unified operating system for a human life.
"""

import os
import re
import zipfile
from ebooklib import epub

BOOK_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT = os.path.join(BOOK_DIR, "the_complete_codes.epub")

book = epub.EpubBook()
book.set_identifier("synmatic-complete-codes-001")
book.set_title("The Complete Codes: A Unified Philosophy for the Examined Life")
book.set_language("en")
book.add_author("Christopher Bender")

book.add_metadata("DC", "publisher", "Synmatic")
book.add_metadata("DC", "description",
    "Nine philosophical traditions. 267 codes. One unified operating system for a human life. "
    "From Stoicism to strategy, Zen to Nietzsche, Confucius to Jung — the traditions don't contradict. "
    "They complement. This is the synthesis. Volume X of the Synmatic shelf.")
book.add_metadata("DC", "subject", "Philosophy")
book.add_metadata("DC", "subject", "Self-Help")
book.add_metadata("DC", "subject", "Personal Development")
book.add_metadata("DC", "subject", "Stoicism")
book.add_metadata("DC", "subject", "Eastern Philosophy")
book.add_metadata("DC", "subject", "Western Philosophy")
book.add_metadata("DC", "rights", "Copyright © 2026 Christopher Bender. All rights reserved.")

style = epub.EpubItem(uid="style", file_name="style/default.css", media_type="text/css", content=b"""
body { font-family: Georgia, "Times New Roman", serif; margin: 5%; text-align: justify; line-height: 1.6; color: #1a1a1a; }
h1 { text-align: center; font-size: 1.8em; margin-top: 2em; margin-bottom: 1.5em; font-weight: normal; letter-spacing: 0.05em; }
p { text-indent: 1.5em; margin: 0; }
p.first, p.scene-break-after { text-indent: 0; }
p.scene-break { text-align: center; text-indent: 0; margin: 1.5em 0; font-size: 1.2em; letter-spacing: 0.3em; }
.title-page { text-align: center; margin-top: 25%; }
.title-page h1 { font-size: 2.5em; margin-bottom: 0.3em; }
.title-page h2 { font-size: 1.2em; font-weight: normal; font-style: italic; margin-bottom: 1em; }
.title-page h3 { font-size: 1em; font-weight: normal; }
.copyright { margin-top: 20%; text-align: center; font-size: 0.85em; line-height: 1.8; }
.part-page { text-align: center; margin-top: 35%; }
.part-page h1 { font-size: 2em; margin-bottom: 0.5em; letter-spacing: 0.1em; }
.part-page p { text-indent: 0; font-style: italic; font-size: 1.1em; }
.colophon { text-align: center; margin-top: 12%; }
.imprint-logo { max-width: 85%; margin: 2em auto; display: block; }
.imprint-tagline { font-size: 0.85em; letter-spacing: 0.25em; text-indent: 0; color: #555; margin-top: 0.5em; }
.imprint-note { text-indent: 0; font-size: 0.85em; color: #888; margin-top: 1.5em; line-height: 1.6; }
""")
book.add_item(style)

# Synmatic imprint logo (for back-of-book colophon)
logo_path = os.path.join(BOOK_DIR, "synmatic_logo.jpg")
if os.path.exists(logo_path):
    with open(logo_path, "rb") as f:
        logo_content = f.read()
    logo_item = epub.EpubItem(
        uid="synmatic_logo",
        file_name="images/synmatic_logo.jpg",
        media_type="image/jpeg",
        content=logo_content,
    )
    book.add_item(logo_item)

title_page = epub.EpubHtml(title="Title Page", file_name="title.xhtml", lang="en")
title_page.content = b"""
<div class="title-page">
    <h1>The Complete Codes</h1>
    <h2>A Unified Philosophy for the Examined Life</h2>
    <h3>Christopher Bender</h3>
    <h3>Synmatic</h3>
    <h3><em>Volume X of the Synmatic shelf</em></h3>
</div>
"""
title_page.add_item(style)
book.add_item(title_page)

copyright_page = epub.EpubHtml(title="Copyright", file_name="copyright.xhtml", lang="en")
copyright_page.content = b"""
<div class="copyright">
    <p>THE COMPLETE CODES</p>
    <p><em>A Unified Philosophy for the Examined Life</em></p>
    <p>&nbsp;</p>
    <p>Copyright &copy; 2026 Christopher Bender</p>
    <p>All rights reserved.</p>
    <p>&nbsp;</p>
    <p>Published by Synmatic</p>
    <p>&nbsp;</p>
    <p>Volume X of the Synmatic shelf. The practitioner's-guide-for-life
    companion to the technical and contemplative volumes of the series.</p>
    <p>&nbsp;</p>
    <p>No part of this book may be reproduced, distributed, or transmitted
    in any form or by any means without the prior written permission of the publisher,
    except for brief quotations in reviews and certain noncommercial uses
    permitted by copyright law.</p>
    <p>&nbsp;</p>
    <p>First Edition, 2026</p>
</div>
"""
copyright_page.add_item(style)
book.add_item(copyright_page)

PARTS = {
    1: ("Book One", "The Inner Game", "part_1.xhtml"),
    11: ("Book Two", "The Outer Game", "part_2.xhtml"),
    21: ("Book Three", "The Transcendent Game", "part_3.xhtml"),
}

part_pages = {}
for ch_num, (part_label, part_title, fname) in PARTS.items():
    pp = epub.EpubHtml(title=f"{part_label}: {part_title}", file_name=fname, lang="en")
    pp.content = f'<div class="part-page"><h1>{part_label}</h1><p>{part_title}</p></div>'.encode()
    pp.add_item(style)
    book.add_item(pp)
    part_pages[ch_num] = pp


def md_to_html(md_text):
    lines = md_text.strip().split("\n")
    html_parts, title, first_para = [], "", True
    for line in lines:
        line = line.rstrip()
        if line.startswith("# "):
            title = line[2:].strip()
            html_parts.append(f"<h1>{title}</h1>")
            first_para = True
            continue
        if line.strip() == "---":
            html_parts.append('<p class="scene-break">* * *</p>')
            first_para = True
            continue
        if not line.strip():
            continue
        p = line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        p = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', p)
        p = re.sub(r'\*(.+?)\*', r'<em>\1</em>', p)
        p = p.replace(" — ", " — ").replace("— ", "— ").replace(" —", " —")
        cls = "first" if first_para else ""
        html_parts.append(f'<p class="{cls}">{p}</p>' if cls else f"<p>{p}</p>")
        first_para = False
    return title, "\n".join(html_parts)


chapters, spine, toc = [], ["nav", title_page, copyright_page], []
for i in range(1, 32):
    if i in part_pages:
        spine.append(part_pages[i])
        toc.append(part_pages[i])
    fpath = os.path.join(BOOK_DIR, f"chapter_{i:02d}.md")
    if not os.path.exists(fpath):
        print(f"Warning: chapter_{i:02d}.md not found")
        continue
    with open(fpath, "r", encoding="utf-8") as f:
        md = f.read()
    title, body = md_to_html(md)
    ch = epub.EpubHtml(title=title or f"Chapter {i}", file_name=f"chapter_{i:02d}.xhtml", lang="en")
    ch.content = body.encode("utf-8")
    ch.add_item(style)
    book.add_item(ch)
    chapters.append(ch)
    spine.append(ch)
    toc.append(ch)

# Synmatic imprint colophon (inside back cover)
colophon = epub.EpubHtml(title="Colophon", file_name="colophon.xhtml", lang="en")
colophon.content = b"""
<div class="colophon">
    <img src="images/synmatic_logo.jpg" alt="Synmatic" class="imprint-logo"/>
    <p class="imprint-tagline">NEURAL SYSTEMS &nbsp;|&nbsp; AI WORKFLOWS</p>
    <p class="imprint-note">Published by Synmatic.</p>
    <p class="imprint-note">A research-lab imprint dedicated to AI-native systems engineering.</p>
</div>
"""
colophon.add_item(style)
book.add_item(colophon)
spine.append(colophon)

book.toc = toc
book.add_item(epub.EpubNcx())
book.add_item(epub.EpubNav())
book.spine = spine
epub.write_epub(OUTPUT, book, {})
print(f"EPUB created: {OUTPUT}\nChapters: {len(chapters)}")

with zipfile.ZipFile(OUTPUT, "r") as z:
    names = z.namelist()
    print(f"Files in EPUB: {len(names)}")
    assert "mimetype" in names
    assert any("content.opf" in n for n in names)
    print("Basic validation passed.")

total = 0
for i in range(1, 32):
    fpath = os.path.join(BOOK_DIR, f"chapter_{i:02d}.md")
    if os.path.exists(fpath):
        with open(fpath, "r", encoding="utf-8") as f:
            total += len(f.read().split())
print(f"Total words: {total:,}")
print(f"EPUB size: {os.path.getsize(OUTPUT) / 1024:.1f} KB")
