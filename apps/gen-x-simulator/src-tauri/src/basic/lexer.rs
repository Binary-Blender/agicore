//! Tokenizer for one line of BASIC source.

#[derive(Debug, Clone, PartialEq)]
pub enum Token {
    // Literals
    Number(f64),
    Str(String),
    Ident(String),       // variable or function name (possibly with trailing $)

    // Keywords
    Print, Input, Let, If, Then, Goto, Gosub, Return,
    For, To, Step, Next, End, Stop, Rem(String), Poke,
    And, Or,

    // Punctuation
    LParen, RParen, Comma, Semicolon, Colon,

    // Operators
    Plus, Minus, Star, Slash, Caret,
    Eq, NotEq, Lt, Lte, Gt, Gte,
}

pub fn tokenize(line: &str) -> Result<Vec<Token>, String> {
    let mut tokens = Vec::new();
    let chars: Vec<char> = line.chars().collect();
    let mut i = 0;

    while i < chars.len() {
        let c = chars[i];

        if c.is_whitespace() {
            i += 1;
            continue;
        }

        // String literal
        if c == '"' {
            let mut s = String::new();
            i += 1;
            while i < chars.len() && chars[i] != '"' {
                s.push(chars[i]);
                i += 1;
            }
            if i >= chars.len() {
                return Err("unterminated string".into());
            }
            i += 1; // consume closing "
            tokens.push(Token::Str(s));
            continue;
        }

        // Number literal (integer or decimal)
        if c.is_ascii_digit() || (c == '.' && peek_is_digit(&chars, i + 1)) {
            let mut num = String::new();
            while i < chars.len() && (chars[i].is_ascii_digit() || chars[i] == '.') {
                num.push(chars[i]);
                i += 1;
            }
            let n: f64 = num.parse().map_err(|_| format!("bad number `{}`", num))?;
            tokens.push(Token::Number(n));
            continue;
        }

        // Identifier or keyword
        if c.is_ascii_alphabetic() {
            let mut name = String::new();
            while i < chars.len() && (chars[i].is_ascii_alphanumeric() || chars[i] == '$') {
                name.push(chars[i].to_ascii_uppercase());
                i += 1;
            }

            // REM consumes the rest of the line as a comment
            if name == "REM" {
                let rest: String = chars[i..].iter().collect();
                tokens.push(Token::Rem(rest.trim().to_string()));
                i = chars.len();
                continue;
            }

            tokens.push(match name.as_str() {
                "PRINT" | "?"  => Token::Print,
                "INPUT"        => Token::Input,
                "LET"          => Token::Let,
                "IF"           => Token::If,
                "THEN"         => Token::Then,
                "GOTO"         => Token::Goto,
                "GOSUB"        => Token::Gosub,
                "RETURN"       => Token::Return,
                "FOR"          => Token::For,
                "TO"           => Token::To,
                "STEP"         => Token::Step,
                "NEXT"         => Token::Next,
                "END"          => Token::End,
                "STOP"         => Token::Stop,
                "POKE"         => Token::Poke,
                "AND"          => Token::And,
                "OR"           => Token::Or,
                _              => Token::Ident(name),
            });
            continue;
        }

        // ? is the C64 PRINT shorthand
        if c == '?' {
            tokens.push(Token::Print);
            i += 1;
            continue;
        }

        // Multi-character operators
        if c == '<' {
            if peek(&chars, i + 1) == Some('=') {
                tokens.push(Token::Lte);
                i += 2;
                continue;
            }
            if peek(&chars, i + 1) == Some('>') {
                tokens.push(Token::NotEq);
                i += 2;
                continue;
            }
            tokens.push(Token::Lt);
            i += 1;
            continue;
        }
        if c == '>' {
            if peek(&chars, i + 1) == Some('=') {
                tokens.push(Token::Gte);
                i += 2;
                continue;
            }
            tokens.push(Token::Gt);
            i += 1;
            continue;
        }

        // Single-character tokens
        let tok = match c {
            '(' => Token::LParen,
            ')' => Token::RParen,
            ',' => Token::Comma,
            ';' => Token::Semicolon,
            ':' => Token::Colon,
            '+' => Token::Plus,
            '-' => Token::Minus,
            '*' => Token::Star,
            '/' => Token::Slash,
            '^' => Token::Caret,
            '=' => Token::Eq,
            other => return Err(format!("unexpected character `{}`", other)),
        };
        tokens.push(tok);
        i += 1;
    }

    Ok(tokens)
}

fn peek(chars: &[char], i: usize) -> Option<char> {
    chars.get(i).copied()
}

fn peek_is_digit(chars: &[char], i: usize) -> bool {
    chars.get(i).map(|c| c.is_ascii_digit()).unwrap_or(false)
}
