#!/usr/bin/env python3
"""Build EPUB 3.0 for The AI Multiplication Doctrine by Christopher Bender."""

import os
import re
from ebooklib import epub

BOOK_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT = os.path.join(BOOK_DIR, "the_ai_multiplication_doctrine.epub")

# --- Metadata ---
book = epub.EpubBook()
book.set_identifier("ai-win-win-institute-ai-multiplication-doctrine-2026")
book.set_title("The AI Multiplication Doctrine")
book.set_language("en")
book.add_author("Christopher Bender")

book.add_metadata("DC", "description",
    "Leadership Principles for 10x Organizations. "
    "The defining leadership question of the AI age is not 'How do we implement AI?' "
    "It is 'What do we do with our people when AI makes them ten times more productive?' "
    "Built on the TAO doctrine of Transform, Augment, Optimize — and grounded in "
    "a century of production thinking from the Toyota Production System — this book "
    "provides the strategic blueprint for leaders who choose multiplication over subtraction. "
    "Published by the AI WIN-WIN Institute.")
book.add_metadata("DC", "publisher", "AI WIN-WIN Institute")
book.add_metadata("DC", "subject", "Leadership")
book.add_metadata("DC", "subject", "Artificial Intelligence")
book.add_metadata("DC", "subject", "Business Strategy")
book.add_metadata("DC", "subject", "Management")
book.add_metadata("DC", "subject", "Organizational Change")
book.add_metadata("DC", "subject", "Business & Money")
book.add_metadata("DC", "rights", "Copyright \u00a9 2026 Christopher Bender. All rights reserved.")

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
    text-align: left;
    font-size: 1.3em;
    margin-top: 2em;
    margin-bottom: 1em;
    font-weight: bold;
    letter-spacing: 0.03em;
}
h3 {
    text-align: left;
    font-size: 1.1em;
    margin-top: 1.5em;
    margin-bottom: 0.8em;
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
blockquote {
    margin: 1.2em 2em;
    padding: 0.5em 1em;
    border-left: 3px solid #666;
    font-style: italic;
    text-indent: 0;
}
blockquote p {
    text-indent: 0;
    margin: 0.3em 0;
}
ul, ol {
    margin: 0.8em 0;
    padding-left: 2em;
}
li {
    margin: 0.3em 0;
    text-indent: 0;
}
.title-page {
    text-align: center;
    margin-top: 20%;
}
.title-page h1 {
    font-size: 2.5em;
    margin-bottom: 0.3em;
    letter-spacing: 0.06em;
}
.title-page h2 {
    font-size: 1.1em;
    font-weight: normal;
    font-style: italic;
    margin-bottom: 1.5em;
    text-align: center;
}
.title-page h3 {
    font-size: 1em;
    font-weight: normal;
    margin-bottom: 0.5em;
}
.title-page .publisher {
    font-size: 0.85em;
    font-style: italic;
    margin-top: 3em;
}
.copyright {
    margin-top: 30%;
    text-align: center;
    font-size: 0.85em;
    line-height: 1.8;
}
.dedication {
    margin-top: 25%;
    text-align: center;
    font-style: italic;
    font-size: 1.1em;
    line-height: 2;
}
.part-header {
    text-align: center;
    margin-top: 25%;
}
.part-header h2 {
    text-align: center;
    font-size: 1.5em;
    letter-spacing: 0.06em;
    margin-bottom: 1.5em;
}
.part-header p {
    text-indent: 0;
    font-style: italic;
    text-align: center;
    font-size: 0.95em;
    line-height: 1.8;
}
""",
)
book.add_item(style)

# --- Title page ---
title_page = epub.EpubHtml(title="Title Page", file_name="title.xhtml", lang="en")
title_page.content = """
<div class="title-page">
    <h1>The AI<br/>Multiplication<br/>Doctrine</h1>
    <h2>Leadership Principles for 10x Organizations</h2>
    <h3>Christopher Bender</h3>
    <p class="publisher">AI WIN-WIN Institute</p>
</div>
""".encode()
title_page.add_item(style)
book.add_item(title_page)

# --- Copyright page ---
copyright_page = epub.EpubHtml(title="Copyright", file_name="copyright.xhtml", lang="en")
copyright_page.content = """
<div class="copyright">
    <p>THE AI MULTIPLICATION DOCTRINE</p>
    <p>Leadership Principles for 10x Organizations</p>
    <p>&nbsp;</p>
    <p>Copyright &copy; 2026 Christopher Bender</p>
    <p>All rights reserved.</p>
    <p>&nbsp;</p>
    <p>Published by the AI WIN-WIN Institute</p>
    <p>&nbsp;</p>
    <p>No part of this publication may be reproduced, distributed, or transmitted
    in any form or by any means without the prior written permission of the publisher,
    except in the case of brief quotations embodied in critical reviews and
    certain other noncommercial uses permitted by copyright law.</p>
    <p>&nbsp;</p>
    <p>First Edition</p>
</div>
""".encode()
copyright_page.add_item(style)
book.add_item(copyright_page)

# --- Dedication page ---
dedication_page = epub.EpubHtml(title="Dedication", file_name="dedication.xhtml", lang="en")
dedication_page.content = """
<div class="dedication">
    <p>For every leader who looked at the headcount spreadsheet</p>
    <p>and chose the harder path.</p>
    <p>&nbsp;</p>
    <p>The people remember.</p>
    <p>They always remember.</p>
</div>
""".encode()
dedication_page.add_item(style)
book.add_item(dedication_page)


def escape_html(text):
    """Escape HTML entities."""
    text = text.replace("&", "&amp;")
    text = text.replace("<", "&lt;")
    text = text.replace(">", "&gt;")
    return text


def inline_format(text):
    """Apply inline markdown formatting (bold, italic, code)."""
    # Inline code (backticks) - must come before bold/italic
    text = re.sub(r'`([^`]+)`', r'<code>\1</code>', text)
    # Bold
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    # Italic
    text = re.sub(r'\*(.+?)\*', r'<em>\1</em>', text)
    return text


def md_to_html(md_text):
    """Convert chapter markdown to XHTML with support for blockquotes, lists, and formatting."""
    lines = md_text.strip().split("\n")
    html_parts = []
    title = ""
    first_para = True
    in_blockquote = False
    blockquote_lines = []
    in_list = False
    list_type = None
    list_items = []

    def flush_blockquote():
        nonlocal in_blockquote, blockquote_lines
        if in_blockquote and blockquote_lines:
            content = " ".join(blockquote_lines)
            content = escape_html(content)
            content = inline_format(content)
            html_parts.append(f"<blockquote><p>{content}</p></blockquote>")
            blockquote_lines = []
            in_blockquote = False

    def flush_list():
        nonlocal in_list, list_items, list_type
        if in_list and list_items:
            tag = "ol" if list_type == "ol" else "ul"
            items_html = "\n".join(f"<li>{inline_format(escape_html(item))}</li>" for item in list_items)
            html_parts.append(f"<{tag}>\n{items_html}\n</{tag}>")
            list_items = []
            in_list = False
            list_type = None

    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # Empty line
        if not stripped:
            flush_blockquote()
            flush_list()
            i += 1
            continue

        # Scene break
        if stripped == "---":
            flush_blockquote()
            flush_list()
            html_parts.append('<p class="scene-break">* * *</p>')
            first_para = True
            i += 1
            continue

        # Chapter title
        if stripped.startswith("# ") and not stripped.startswith("## "):
            flush_blockquote()
            flush_list()
            title = stripped[2:].strip()
            safe_title = escape_html(title)
            safe_title = inline_format(safe_title)
            html_parts.append(f"<h1>{safe_title}</h1>")
            first_para = True
            i += 1
            continue

        # H3 (check before H2)
        if stripped.startswith("### "):
            flush_blockquote()
            flush_list()
            subtitle = stripped[4:].strip()
            safe = inline_format(escape_html(subtitle))
            html_parts.append(f"<h3>{safe}</h3>")
            first_para = True
            i += 1
            continue

        # H2
        if stripped.startswith("## "):
            flush_blockquote()
            flush_list()
            subtitle = stripped[3:].strip()
            safe = inline_format(escape_html(subtitle))
            html_parts.append(f"<h2>{safe}</h2>")
            first_para = True
            i += 1
            continue

        # Blockquote
        if stripped.startswith("> "):
            flush_list()
            content = stripped[2:].strip()
            if in_blockquote:
                blockquote_lines.append(content)
            else:
                in_blockquote = True
                blockquote_lines = [content]
            i += 1
            continue

        # Unordered list
        if stripped.startswith("- "):
            flush_blockquote()
            content = stripped[2:].strip()
            if not in_list or list_type != "ul":
                flush_list()
                in_list = True
                list_type = "ul"
                list_items = []
            list_items.append(content)
            i += 1
            continue

        # Ordered list
        ol_match = re.match(r'^(\d+)\.\s+(.+)', stripped)
        if ol_match:
            flush_blockquote()
            content = ol_match.group(2).strip()
            if not in_list or list_type != "ol":
                flush_list()
                in_list = True
                list_type = "ol"
                list_items = []
            list_items.append(content)
            i += 1
            continue

        # Regular paragraph
        flush_blockquote()
        flush_list()

        processed = escape_html(stripped)
        processed = inline_format(processed)

        if first_para:
            html_parts.append(f'<p class="first">{processed}</p>')
            first_para = False
        else:
            html_parts.append(f"<p>{processed}</p>")

        i += 1

    # Flush any remaining state
    flush_blockquote()
    flush_list()

    return title, "\n".join(html_parts)


# --- Chapters ---
chapters = []
spine = ["nav", title_page, copyright_page, dedication_page]
toc = []

CHAPTER_COUNT = 18

total_words = 0

for i in range(1, CHAPTER_COUNT + 1):
    fname = f"chapter_{i:02d}.md"
    fpath = os.path.join(BOOK_DIR, fname)

    if not os.path.exists(fpath):
        print(f"Warning: {fname} not found, skipping")
        continue

    with open(fpath, "r", encoding="utf-8") as f:
        md = f.read()

    total_words += len(md.split())
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
print(f"Total word count: ~{total_words:,}")

# Quick validation
import zipfile
with zipfile.ZipFile(OUTPUT, "r") as z:
    names = z.namelist()
    print(f"Files in EPUB: {len(names)}")
    assert "mimetype" in names, "Missing mimetype!"
    assert any("content.opf" in n for n in names), "Missing content.opf!"
    print("Basic validation passed.")
