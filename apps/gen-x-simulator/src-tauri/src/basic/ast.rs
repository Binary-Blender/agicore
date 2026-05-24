//! AST types for the BASIC interpreter.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Statement {
    Print(Vec<PrintItem>),
    Input { prompt: Option<String>, vars: Vec<String> },
    Let { var: String, value: Expression },
    If { cond: Expression, then: Box<Statement> },
    GotoLine(u32),
    GosubLine(u32),
    Return,
    For { var: String, start: Expression, end: Expression, step: Option<Expression> },
    Next { var: Option<String> },
    Rem(String),
    End,
    Stop,
    // POKE addr, byte — writes a byte to "memory". Used in C64 screen RAM
    // demos. Memory is modeled as a sparse HashMap; the C64 screen RAM
    // window (1024..2024) is mirrored into a displayable screen buffer.
    Poke { addr: Expression, value: Expression },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PrintItem {
    Expression(Expression),
    /// `;` — no separator
    Semicolon,
    /// `,` — tab to next zone (every 10 columns)
    Comma,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Expression {
    Number(f64),
    Str(String),
    Var(String),     // numeric or string variable (A, A1, A$, AB$)
    Neg(Box<Expression>),
    Binary { op: BinOp, lhs: Box<Expression>, rhs: Box<Expression> },
    Call { name: String, args: Vec<Expression> },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum BinOp {
    Add, Sub, Mul, Div, Pow,
    Eq, Neq, Lt, Lte, Gt, Gte,
    And, Or,
}

impl BinOp {
    pub fn is_comparison(&self) -> bool {
        matches!(
            self,
            BinOp::Eq | BinOp::Neq | BinOp::Lt | BinOp::Lte | BinOp::Gt | BinOp::Gte
        )
    }
}
