export interface AnsiSpan {
  text: string;
  cls: string;
}

interface SgrState {
  bold: boolean;
  fg: string;  // tailwind text-* class or ''
  bg: string;  // tailwind bg-* class or ''
}

// Standard + bright 16-color fg mappings (30-37, 90-97)
const FG: Record<number, string> = {
  30: 'text-gray-700',   31: 'text-red-400',    32: 'text-green-400',  33: 'text-yellow-400',
  34: 'text-blue-400',   35: 'text-purple-400', 36: 'text-cyan-400',   37: 'text-gray-300',
  90: 'text-gray-500',   91: 'text-red-300',    92: 'text-green-300',  93: 'text-yellow-300',
  94: 'text-blue-300',   95: 'text-purple-300', 96: 'text-cyan-300',   97: 'text-white',
};

// Standard 8-color bg mappings (40-47)
const BG: Record<number, string> = {
  40: 'bg-gray-900',  41: 'bg-red-900',    42: 'bg-green-900', 43: 'bg-yellow-900',
  44: 'bg-blue-900',  45: 'bg-purple-900', 46: 'bg-cyan-900',  47: 'bg-gray-700',
};

function applyParams(state: SgrState, params: number[]): SgrState {
  let s = { ...state };
  let i = 0;
  while (i < params.length) {
    const p = params[i];
    if (p === 0) { s = { bold: false, fg: '', bg: '' }; }
    else if (p === 1) { s.bold = true; }
    else if (p === 22) { s.bold = false; }
    else if (p === 39) { s.fg = ''; }
    else if (p === 49) { s.bg = ''; }
    else if (FG[p]) { s.fg = FG[p]; }
    else if (BG[p]) { s.bg = BG[p]; }
    else if (p === 38 && params[i + 1] === 5) {
      // 256-color fg — map to closest basic color (simplified)
      i += 2; continue;
    } else if (p === 38 && params[i + 1] === 2) {
      i += 4; continue;
    }
    i++;
  }
  return s;
}

function stateToClass(s: SgrState): string {
  return [s.fg, s.bg, s.bold ? 'font-bold' : ''].filter(Boolean).join(' ');
}

// Matches ESC[ ... m  (SGR) or other ESC sequences to strip
const ESC_RE = /\x1b\[([0-9;]*)m|\x1b\[[^m]*m|\x1b[^[]/g;

export function parseAnsi(text: string): AnsiSpan[] {
  const spans: AnsiSpan[] = [];
  let state: SgrState = { bold: false, fg: '', bg: '' };
  let last = 0;

  let m: RegExpExecArray | null;
  ESC_RE.lastIndex = 0;

  while ((m = ESC_RE.exec(text)) !== null) {
    if (m.index > last) {
      spans.push({ text: text.slice(last, m.index), cls: stateToClass(state) });
    }
    // Only process SGR (ends with 'm')
    if (m[0].endsWith('m') && m[1] !== undefined) {
      const params = m[1] === '' ? [0] : m[1].split(';').map(Number);
      state = applyParams(state, params);
    }
    last = m.index + m[0].length;
  }

  if (last < text.length) {
    spans.push({ text: text.slice(last), cls: stateToClass(state) });
  }

  return spans.filter((s) => s.text.length > 0);
}
