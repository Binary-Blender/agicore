#!/usr/bin/env python3
"""Build EPUB 3.0 for The Cognitive Inflection by Christopher Bender."""

import os
import re
from ebooklib import epub

BOOK_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT = os.path.join(BOOK_DIR, "the_cognitive_inflection.epub")

# --- Metadata ---
book = epub.EpubBook()
book.set_identifier("ai-win-win-cognitive-inflection-2026")
book.set_title("The Cognitive Inflection")
book.set_language("en")
book.add_author("Christopher Bender")

book.add_metadata("OPF", "meta", "AI WIN-WIN Institute Graduate Business Library",
                  {"name": "calibre:series"})
book.add_metadata("OPF", "meta", "1", {"name": "calibre:series_index"})
book.add_metadata("DC", "publisher", "AI WIN-WIN Institute")
book.add_metadata("DC", "description",
    "A graduate-level business textbook on the cognition-systems inflection — the "
    "strategic disruption that will reshape enterprise software through one-person "
    "operators wielding AI-augmented capacity. In the lineage of Christensen, Grove, "
    "and McGrath. Required reading for MBA strategy and disruption seminars. "
    "Develops the diagnostic instrumentation, the substrate analysis, the strategic-"
    "inflection framing, and the constructive response: Transformative AI Operations, "
    "the perks-first and partners-not-resources organizational restructuring, and the "
    "ecosystem posture toward the disruptor population.")
book.add_metadata("DC", "subject", "Business Strategy")
book.add_metadata("DC", "subject", "Disruption")
book.add_metadata("DC", "subject", "Artificial Intelligence")
book.add_metadata("DC", "subject", "Enterprise Software")
book.add_metadata("DC", "subject", "Organizational Design")
book.add_metadata("DC", "subject", "Strategic Management")
book.add_metadata("DC", "subject", "MBA")
book.add_metadata("DC", "rights",
                  "Copyright © 2026 Christopher Bender. All rights reserved.")

# --- CSS ---
style = epub.EpubItem(
    uid="style",
    file_name="style/default.css",
    media_type="text/css",
    content=b"""
body {
    font-family: Georgia, "Times New Roman", serif;
    margin: 5%;
    text-align: justify;
    line-height: 1.6;
}
h1 {
    text-align: center;
    font-size: 1.8em;
    margin-top: 2em;
    margin-bottom: 1.5em;
    font-weight: normal;
    letter-spacing: 0.05em;
}
h2 {
    font-size: 1.3em;
    margin-top: 1.8em;
    margin-bottom: 0.8em;
    font-weight: bold;
}
h3 {
    font-size: 1.1em;
    margin-top: 1.4em;
    margin-bottom: 0.6em;
    font-weight: bold;
}
p {
    text-indent: 1.5em;
    margin: 0;
}
p.first, p.scene-break-after {
    text-indent: 0;
}
p.scene-break {
    text-align: center;
    text-indent: 0;
    margin: 1.5em 0;
    font-size: 1.2em;
    letter-spacing: 0.3em;
}
ul, ol {
    margin: 0.8em 0 0.8em 1.5em;
    padding: 0;
}
li {
    margin: 0.4em 0;
    text-indent: 0;
}
blockquote {
    margin: 1.2em 1.5em;
    padding: 0.5em 1em;
    border-left: 3px solid #666;
    font-style: italic;
}
blockquote p {
    text-indent: 0;
}
code {
    font-family: "Courier New", Courier, monospace;
    font-size: 0.9em;
    background: #f4f4f4;
    padding: 0.1em 0.3em;
}
pre.code-block {
    font-family: "Courier New", Courier, monospace;
    font-size: 0.85em;
    line-height: 1.4;
    background: #f4f4f4;
    padding: 1em;
    margin: 1em 0;
    white-space: pre-wrap;
    word-wrap: break-word;
    border-left: 3px solid #ccc;
}
pre.code-block code {
    background: none;
    padding: 0;
}
.title-page {
    text-align: center;
    margin-top: 25%;
}
.title-page h1 {
    font-size: 2.5em;
    margin-bottom: 0.5em;
}
.title-page h2 {
    font-size: 1.1em;
    font-weight: normal;
    font-style: italic;
    margin-bottom: 1.5em;
}
.title-page h3 {
    font-size: 1em;
    font-weight: normal;
}
.copyright {
    margin-top: 30%;
    text-align: center;
    font-size: 0.85em;
    line-height: 1.8;
}
.copyright p {
    text-indent: 0;
}
.part-title {
    text-align: center;
    margin-top: 35%;
}
.part-title h1 {
    font-size: 1.4em;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 0.5em;
}
.part-title h2 {
    font-size: 1.6em;
    font-style: italic;
    font-weight: normal;
}
"""
)
book.add_item(style)

# --- Title page ---
title_page = epub.EpubHtml(title="Title Page", file_name="title.xhtml", lang="en")
title_page.content = """
<div class="title-page">
    <h1>The Cognitive Inflection</h1>
    <h2>How AI-Native Organizations Will Disrupt the Enterprise Software Economy &mdash; and What to Do About It</h2>
    <h3>Christopher Bender</h3>
    <p style="margin-top: 2em; font-size: 0.9em;">AI WIN-WIN Institute</p>
</div>
""".encode()
title_page.add_item(style)
book.add_item(title_page)

# --- Copyright page ---
copyright_page = epub.EpubHtml(title="Copyright", file_name="copyright.xhtml", lang="en")
copyright_page.content = """
<div class="copyright">
    <p>THE COGNITIVE INFLECTION</p>
    <p>How AI-Native Organizations Will Disrupt the Enterprise Software Economy</p>
    <p>&nbsp;</p>
    <p>Copyright &copy; 2026 Christopher Bender</p>
    <p>All rights reserved.</p>
    <p>&nbsp;</p>
    <p>Published by AI WIN-WIN Institute</p>
    <p>&nbsp;</p>
    <p>No part of this publication may be reproduced, distributed, or transmitted
    in any form or by any means without the prior written permission of the publisher,
    except in the case of brief quotations embodied in reviews and certain other
    noncommercial uses permitted by copyright law.</p>
    <p>&nbsp;</p>
    <p>First Edition</p>
</div>
""".encode()
copyright_page.add_item(style)
book.add_item(copyright_page)

# --- Part title pages ---
PARTS = [
    ("I", "Seeing the Inflection", (1, 5)),
    ("II", "The Disruption Mechanics", (6, 12)),
    ("III", "The Strategic Inflection", (13, 18)),
    ("IV", "The Transformation", (19, 24)),
    ("V", "Cases and Practice", (25, 27)),
]

part_pages = []
for num, title, _ in PARTS:
    pp = epub.EpubHtml(
        title=f"Part {num}: {title}",
        file_name=f"part_{num.lower()}.xhtml",
        lang="en"
    )
    pp.content = f"""
<div class="part-title">
    <h1>Part {num}</h1>
    <h2>{title}</h2>
</div>
""".encode()
    pp.add_item(style)
    book.add_item(pp)
    part_pages.append(pp)


def md_to_html(md_text):
    """Convert chapter markdown to XHTML paragraphs."""
    lines = md_text.strip().split("\n")
    html_parts = []
    title = ""
    first_para = True
    in_list = False
    list_type = None
    in_code_block = False
    code_block_lines = []

    for line in lines:
        line = line.rstrip()

        if line.strip().startswith("```"):
            if in_code_block:
                code_content = "\n".join(code_block_lines)
                code_content = code_content.replace("&", "&amp;")
                code_content = code_content.replace("<", "&lt;")
                code_content = code_content.replace(">", "&gt;")
                html_parts.append(f'<pre class="code-block"><code>{code_content}</code></pre>')
                code_block_lines = []
                in_code_block = False
                first_para = True
            else:
                in_code_block = True
            continue

        if in_code_block:
            code_block_lines.append(line)
            continue

        if in_list and not line.strip().startswith("- ") and not line.strip().startswith("* ") and not re.match(r'^\d+\.', line.strip()):
            if line.strip():
                html_parts.append(f"</{list_type}>")
                in_list = False
                list_type = None

        if line.startswith("# "):
            title = line[2:].strip()
            html_parts.append(f"<h1>{title}</h1>")
            first_para = True
            continue

        if line.startswith("## "):
            heading = line[3:].strip()
            html_parts.append(f"<h2>{heading}</h2>")
            first_para = True
            continue

        if line.startswith("### "):
            heading = line[4:].strip()
            html_parts.append(f"<h3>{heading}</h3>")
            first_para = True
            continue

        if line.strip() == "---":
            html_parts.append('<p class="scene-break">* * *</p>')
            first_para = True
            continue

        if not line.strip():
            continue

        if line.strip().startswith("- ") or line.strip().startswith("* "):
            if not in_list:
                html_parts.append("<ul>")
                in_list = True
                list_type = "ul"
            item_text = line.strip()[2:]
            item_text = process_inline(item_text)
            html_parts.append(f"<li>{item_text}</li>")
            first_para = True
            continue

        if re.match(r'^\d+\.', line.strip()):
            if not in_list:
                html_parts.append("<ol>")
                in_list = True
                list_type = "ol"
            item_text = re.sub(r'^\d+\.\s*', '', line.strip())
            item_text = process_inline(item_text)
            html_parts.append(f"<li>{item_text}</li>")
            first_para = True
            continue

        if line.startswith("> "):
            quote_text = process_inline(line[2:])
            html_parts.append(f"<blockquote><p>{quote_text}</p></blockquote>")
            first_para = True
            continue

        processed = process_inline(line)

        if first_para:
            html_parts.append(f'<p class="first">{processed}</p>')
            first_para = False
        else:
            html_parts.append(f"<p>{processed}</p>")

    if in_list:
        html_parts.append(f"</{list_type}>")

    return title, "\n".join(html_parts)


def process_inline(text):
    """Process inline markdown formatting."""
    text = re.sub(r'`([^`]+)`',
                  lambda m: '<code>' + m.group(1).replace('<', '&lt;').replace('>', '&gt;') + '</code>',
                  text)
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'\*(.+?)\*', r'<em>\1</em>', text)
    text = text.replace(" - ", " — ")
    return text


# --- Chapters ---
chapters = []
spine = ["nav", title_page, copyright_page]
toc = []

CHAPTER_COUNT = 27

current_part_idx = 0
for i in range(1, CHAPTER_COUNT + 1):
    if current_part_idx < len(PARTS):
        _, _, (start, end) = PARTS[current_part_idx]
        if i == start:
            spine.append(part_pages[current_part_idx])
            toc.append(part_pages[current_part_idx])
        if i > end:
            current_part_idx += 1
            if current_part_idx < len(PARTS):
                spine.append(part_pages[current_part_idx])
                toc.append(part_pages[current_part_idx])

    fname = f"chapter_{i:02d}.md"
    fpath = os.path.join(BOOK_DIR, fname)

    if not os.path.exists(fpath):
        print(f"Warning: {fname} not found, skipping")
        continue

    with open(fpath, "r", encoding="utf-8") as f:
        md = f.read()

    title, body_html = md_to_html(md)

    ch = epub.EpubHtml(
        title=title or f"Chapter {i}",
        file_name=f"chapter_{i:02d}.xhtml",
        lang="en",
    )
    ch.content = body_html.encode("utf-8")
    ch.add_item(style)

    book.add_item(ch)
    chapters.append(ch)
    spine.append(ch)
    toc.append(ch)

# --- Table of Contents ---
book.toc = toc

# --- Navigation ---
book.add_item(epub.EpubNcx())
book.add_item(epub.EpubNav())

# --- Spine ---
book.spine = spine

# --- Write ---
epub.write_epub(OUTPUT, book, {})
print(f"EPUB created: {OUTPUT}")
print(f"Chapters: {len(chapters)}")

# Quick validation
import zipfile
with zipfile.ZipFile(OUTPUT, "r") as z:
    names = z.namelist()
    print(f"Files in EPUB: {len(names)}")
    assert "mimetype" in names, "Missing mimetype!"
    assert any("content.opf" in n for n in names), "Missing content.opf!"
    print("Basic validation passed.")
