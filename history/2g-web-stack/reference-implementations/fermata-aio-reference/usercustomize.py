"""
Project-wide Python startup customisations.

We disable pytest's automatic third-party plugin discovery to keep test
runs deterministic across different developer environments. Some global
plugins installed on the binary-blender workstations depend on pytest
internals which changed in recent versions, so auto-loading them causes
test discovery to fail before we even reach our own code.
"""
import os

os.environ.setdefault("PYTEST_DISABLE_PLUGIN_AUTOLOAD", "1")
