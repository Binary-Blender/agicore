//! BASIC runtime — executes parsed programs with period-correct semantics.
//!
//! The runtime is suspendable: when it hits an INPUT statement and no
//! pre-queued input is available, it returns `RunResult::NeedsInput`
//! with a serialized `InterpreterState`. The renderer collects the
//! input and resumes by calling `Interpreter::resume_with_input`.
//!
//! This mirrors the period-correct experience: the program blocks at
//! INPUT and waits for the user.

use super::ast::{BinOp, Expression, PrintItem, Statement};
use super::lexer::tokenize;
use super::parser::Parser;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Value {
    Num(f64),
    Str(String),
}

impl Value {
    pub fn to_num(&self) -> Result<f64, RuntimeError> {
        match self {
            Value::Num(n) => Ok(*n),
            Value::Str(_) => Err(RuntimeError::TypeMismatch),
        }
    }
    pub fn to_str(&self) -> Result<String, RuntimeError> {
        match self {
            Value::Str(s) => Ok(s.clone()),
            Value::Num(_) => Err(RuntimeError::TypeMismatch),
        }
    }
    pub fn display(&self) -> String {
        match self {
            Value::Num(n) => format_basic_number(*n),
            Value::Str(s) => s.clone(),
        }
    }
}

/// C64 BASIC formats numbers with a leading space for non-negatives
/// and a trailing space — visible if you watch any 1984 program output.
fn format_basic_number(n: f64) -> String {
    if n == n.trunc() && n.abs() < 1e16 {
        if n >= 0.0 {
            format!(" {} ", n as i64)
        } else {
            format!("{} ", n as i64)
        }
    } else if n >= 0.0 {
        format!(" {} ", n)
    } else {
        format!("{} ", n)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RuntimeError {
    SyntaxError(String),
    UndefinedLine(u32),
    TypeMismatch,
    DivisionByZero,
    NextWithoutFor,
    ReturnWithoutGosub,
    OutOfRange,
    UndefinedVariable(String),
    UndefinedFunction(String),
    RedoFromStart,                 // INPUT got wrong type
}

impl RuntimeError {
    /// Period-correct BASIC error message — `?<MESSAGE> ERROR`
    pub fn period_message(&self) -> &'static str {
        match self {
            RuntimeError::SyntaxError(_)      => "SYNTAX ERROR",
            RuntimeError::UndefinedLine(_)    => "UNDEF'D STATEMENT ERROR",
            RuntimeError::TypeMismatch        => "TYPE MISMATCH ERROR",
            RuntimeError::DivisionByZero      => "DIVISION BY ZERO ERROR",
            RuntimeError::NextWithoutFor      => "NEXT WITHOUT FOR ERROR",
            RuntimeError::ReturnWithoutGosub  => "RETURN WITHOUT GOSUB ERROR",
            RuntimeError::OutOfRange          => "ILLEGAL QUANTITY ERROR",
            RuntimeError::UndefinedVariable(_)=> "UNDEF'D VARIABLE ERROR",
            RuntimeError::UndefinedFunction(_)=> "UNDEF'D FUNCTION ERROR",
            RuntimeError::RedoFromStart       => "REDO FROM START",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForFrame {
    pub var: String,
    pub end: f64,
    pub step: f64,
    pub return_line: u32,
    pub return_stmt_index: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GosubFrame {
    pub return_line: u32,
    pub return_stmt_index: usize,
}

/// Suspendable interpreter state. Persisted between turns when INPUT
/// requires interactive resumption.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct InterpreterState {
    pub vars_num: HashMap<String, f64>,
    pub vars_str: HashMap<String, String>,
    pub for_stack: Vec<ForFrame>,
    pub gosub_stack: Vec<GosubFrame>,
    pub memory: HashMap<u32, u8>,    // for POKE — sparse byte memory
    pub current_line: u32,
    pub current_stmt_index: usize,   // for : separated statements
    pub halted: bool,
    pub seed: u64,                   // RND() seed
}

impl InterpreterState {
    pub fn new() -> Self {
        Self {
            seed: 0x12345678,
            ..Default::default()
        }
    }
}

/// One frame of program output — either chars to the screen or a screen-clear.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OutputEvent {
    Text(String),
    Newline,
    ClearScreen,
    Poke { addr: u32, value: u8 },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunFrame {
    pub events: Vec<OutputEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RunResult {
    /// Program finished normally (END, fell off the end, or STOP).
    Halted { state: InterpreterState, frame: RunFrame },
    /// Program errored. The error message and the line that errored.
    Errored {
        state: InterpreterState,
        frame: RunFrame,
        line: u32,
        message: String,
    },
    /// Program is blocked on INPUT. The renderer must collect input and
    /// resume by calling resume_with_input.
    NeedsInput {
        state: InterpreterState,
        frame: RunFrame,
        prompt: String,
        var_name: String,
    },
}

pub struct Interpreter {
    program: BTreeMap<u32, Vec<Statement>>,
}

impl Interpreter {
    pub fn parse(source: &str) -> Result<Self, (u32, String)> {
        let mut program = BTreeMap::new();
        for raw in source.lines() {
            let line = raw.trim();
            if line.is_empty() {
                continue;
            }
            let (line_num, body) = match split_line_number(line) {
                Some(p) => p,
                None => return Err((0, format!("missing line number on `{}`", line))),
            };
            let tokens = tokenize(body).map_err(|e| (line_num, e))?;
            let stmts = Parser::new(tokens)
                .parse_line()
                .map_err(|e| (line_num, e))?;
            program.insert(line_num, stmts);
        }
        Ok(Self { program })
    }

    pub fn run(&self, mut state: InterpreterState) -> RunResult {
        let mut frame = RunFrame { events: Vec::new() };
        if state.current_line == 0 {
            // First run — set to first line
            if let Some(&first) = self.program.keys().next() {
                state.current_line = first;
                state.current_stmt_index = 0;
            } else {
                state.halted = true;
                return RunResult::Halted { state, frame };
            }
        }
        self.execute(&mut state, &mut frame, None)
    }

    pub fn resume_with_input(
        &self,
        mut state: InterpreterState,
        var_name: &str,
        input: &str,
    ) -> RunResult {
        let mut frame = RunFrame { events: Vec::new() };

        // Resolve the input into the requested variable type.
        if var_name.ends_with('$') {
            state.vars_str.insert(var_name.to_string(), input.to_string());
        } else {
            // Numeric INPUT — empty or non-numeric triggers REDO FROM START
            // in real C64 BASIC. We surface it as a runtime error so the
            // renderer can reprompt.
            let n: f64 = match input.trim().parse() {
                Ok(n) => n,
                Err(_) => {
                    let line = state.current_line;
                    return RunResult::Errored {
                        state,
                        frame,
                        line,
                        message: "REDO FROM START".into(),
                    };
                }
            };
            state.vars_num.insert(var_name.to_string(), n);
        }
        // Advance past the INPUT statement (it set current_stmt_index
        // to the INPUT itself before suspending).
        state.current_stmt_index += 1;
        self.execute(&mut state, &mut frame, None)
    }

    fn execute(
        &self,
        state: &mut InterpreterState,
        frame: &mut RunFrame,
        _bookmark: Option<()>,
    ) -> RunResult {
        let mut instruction_budget: u64 = 1_000_000; // cap runaway programs

        loop {
            if state.halted {
                return RunResult::Halted { state: state.clone(), frame: frame.clone() };
            }
            if instruction_budget == 0 {
                let line = state.current_line;
                return RunResult::Errored {
                    state: state.clone(),
                    frame: frame.clone(),
                    line,
                    message: "BREAK — instruction budget exceeded".into(),
                };
            }
            instruction_budget -= 1;

            let stmts = match self.program.get(&state.current_line) {
                Some(s) => s.clone(),
                None => {
                    state.halted = true;
                    return RunResult::Halted { state: state.clone(), frame: frame.clone() };
                }
            };

            if state.current_stmt_index >= stmts.len() {
                // Move to next line
                if let Some(next_line) = self.next_line(state.current_line) {
                    state.current_line = next_line;
                    state.current_stmt_index = 0;
                    continue;
                } else {
                    state.halted = true;
                    return RunResult::Halted { state: state.clone(), frame: frame.clone() };
                }
            }

            let stmt = &stmts[state.current_stmt_index];
            match self.execute_stmt(stmt, state, frame) {
                StepResult::Advance => {
                    state.current_stmt_index += 1;
                }
                StepResult::JumpedTo { line, stmt_index } => {
                    state.current_line = line;
                    state.current_stmt_index = stmt_index;
                }
                StepResult::Halt => {
                    state.halted = true;
                    return RunResult::Halted { state: state.clone(), frame: frame.clone() };
                }
                StepResult::NeedsInput { prompt, var_name } => {
                    // Leave current_stmt_index pointing at the INPUT so we
                    // know where to resume. resume_with_input bumps it.
                    return RunResult::NeedsInput {
                        state: state.clone(),
                        frame: frame.clone(),
                        prompt,
                        var_name,
                    };
                }
                StepResult::Error(e) => {
                    let line = state.current_line;
                    return RunResult::Errored {
                        state: state.clone(),
                        frame: frame.clone(),
                        line,
                        message: format!("?{} IN {}", e.period_message(), line),
                    };
                }
            }
        }
    }

    fn execute_stmt(
        &self,
        stmt: &Statement,
        state: &mut InterpreterState,
        frame: &mut RunFrame,
    ) -> StepResult {
        match stmt {
            Statement::Rem(_) | Statement::End | Statement::Stop => {
                if matches!(stmt, Statement::End | Statement::Stop) {
                    StepResult::Halt
                } else {
                    StepResult::Advance
                }
            }
            Statement::Print(items) => {
                let mut line_started = true;
                let mut trailing_separator = false;
                let mut buf = String::new();
                for it in items {
                    match it {
                        PrintItem::Expression(e) => {
                            match self.eval(e, state) {
                                Ok(v) => {
                                    if line_started && matches!(v, Value::Num(_)) {
                                        // C64 prefixes nothing additional;
                                        // format_basic_number handles spacing
                                    }
                                    let text = v.display();
                                    // Handle CHR$(147) — clear screen
                                    if text == "\u{0093}" {
                                        frame.events.push(OutputEvent::ClearScreen);
                                    } else if text == "\u{000D}" || text == "\n" {
                                        if !buf.is_empty() {
                                            frame.events.push(OutputEvent::Text(buf.clone()));
                                            buf.clear();
                                        }
                                        frame.events.push(OutputEvent::Newline);
                                    } else {
                                        buf.push_str(&text);
                                    }
                                    line_started = false;
                                    trailing_separator = false;
                                }
                                Err(e) => return StepResult::Error(e),
                            }
                        }
                        PrintItem::Semicolon => { trailing_separator = true; }
                        PrintItem::Comma => {
                            // Tab to next print zone (every 10 columns).
                            let zone = 10 - (buf.len() % 10);
                            buf.push_str(&" ".repeat(zone));
                            trailing_separator = true;
                        }
                    }
                }
                if !buf.is_empty() {
                    frame.events.push(OutputEvent::Text(buf));
                }
                if !trailing_separator {
                    frame.events.push(OutputEvent::Newline);
                }
                StepResult::Advance
            }
            Statement::Input { prompt, vars } => {
                // For v1 simplicity, INPUT only handles one variable at a time;
                // a multi-var INPUT becomes a sequence of NeedsInput frames.
                if let Some(var) = vars.first() {
                    let p = prompt.clone().unwrap_or_else(|| "? ".to_string());
                    return StepResult::NeedsInput {
                        prompt: p,
                        var_name: var.clone(),
                    };
                }
                StepResult::Advance
            }
            Statement::Let { var, value } => {
                match self.eval(value, state) {
                    Ok(v) => {
                        if var.ends_with('$') {
                            match v.to_str() {
                                Ok(s) => { state.vars_str.insert(var.clone(), s); }
                                Err(e) => return StepResult::Error(e),
                            }
                        } else {
                            match v.to_num() {
                                Ok(n) => { state.vars_num.insert(var.clone(), n); }
                                Err(e) => return StepResult::Error(e),
                            }
                        }
                        StepResult::Advance
                    }
                    Err(e) => StepResult::Error(e),
                }
            }
            Statement::If { cond, then } => {
                match self.eval(cond, state) {
                    Ok(v) => {
                        let truthy = match v {
                            Value::Num(n) => n != 0.0,
                            Value::Str(s) => !s.is_empty(),
                        };
                        if truthy {
                            self.execute_stmt(then, state, frame)
                        } else {
                            StepResult::Advance
                        }
                    }
                    Err(e) => StepResult::Error(e),
                }
            }
            Statement::GotoLine(n) => {
                if self.program.contains_key(n) {
                    StepResult::JumpedTo { line: *n, stmt_index: 0 }
                } else {
                    StepResult::Error(RuntimeError::UndefinedLine(*n))
                }
            }
            Statement::GosubLine(n) => {
                if !self.program.contains_key(n) {
                    return StepResult::Error(RuntimeError::UndefinedLine(*n));
                }
                state.gosub_stack.push(GosubFrame {
                    return_line: state.current_line,
                    return_stmt_index: state.current_stmt_index + 1,
                });
                StepResult::JumpedTo { line: *n, stmt_index: 0 }
            }
            Statement::Return => {
                match state.gosub_stack.pop() {
                    Some(f) => StepResult::JumpedTo {
                        line: f.return_line,
                        stmt_index: f.return_stmt_index,
                    },
                    None => StepResult::Error(RuntimeError::ReturnWithoutGosub),
                }
            }
            Statement::For { var, start, end, step } => {
                let start_v = match self.eval(start, state).and_then(|v| v.to_num()) {
                    Ok(n) => n,
                    Err(e) => return StepResult::Error(e),
                };
                let end_v = match self.eval(end, state).and_then(|v| v.to_num()) {
                    Ok(n) => n,
                    Err(e) => return StepResult::Error(e),
                };
                let step_v = match step {
                    Some(s) => match self.eval(s, state).and_then(|v| v.to_num()) {
                        Ok(n) => n,
                        Err(e) => return StepResult::Error(e),
                    },
                    None => 1.0,
                };
                state.vars_num.insert(var.clone(), start_v);
                state.for_stack.push(ForFrame {
                    var: var.clone(),
                    end: end_v,
                    step: step_v,
                    return_line: state.current_line,
                    return_stmt_index: state.current_stmt_index + 1,
                });
                StepResult::Advance
            }
            Statement::Next { var } => {
                let top = match state.for_stack.last().cloned() {
                    Some(f) => f,
                    None => return StepResult::Error(RuntimeError::NextWithoutFor),
                };
                if let Some(v) = var {
                    if v != &top.var {
                        return StepResult::Error(RuntimeError::NextWithoutFor);
                    }
                }
                let cur = *state.vars_num.get(&top.var).unwrap_or(&0.0);
                let next = cur + top.step;
                state.vars_num.insert(top.var.clone(), next);
                let done = if top.step >= 0.0 { next > top.end } else { next < top.end };
                if done {
                    state.for_stack.pop();
                    StepResult::Advance
                } else {
                    StepResult::JumpedTo {
                        line: top.return_line,
                        stmt_index: top.return_stmt_index,
                    }
                }
            }
            Statement::Poke { addr, value } => {
                let a = match self.eval(addr, state).and_then(|v| v.to_num()) {
                    Ok(n) => n as u32,
                    Err(e) => return StepResult::Error(e),
                };
                let v = match self.eval(value, state).and_then(|v| v.to_num()) {
                    Ok(n) => (n as i64).clamp(0, 255) as u8,
                    Err(e) => return StepResult::Error(e),
                };
                state.memory.insert(a, v);
                frame.events.push(OutputEvent::Poke { addr: a, value: v });
                StepResult::Advance
            }
        }
    }

    fn eval(&self, expr: &Expression, state: &mut InterpreterState) -> Result<Value, RuntimeError> {
        match expr {
            Expression::Number(n) => Ok(Value::Num(*n)),
            Expression::Str(s) => Ok(Value::Str(s.clone())),
            Expression::Var(name) => {
                if name.ends_with('$') {
                    Ok(Value::Str(state.vars_str.get(name).cloned().unwrap_or_default()))
                } else {
                    Ok(Value::Num(*state.vars_num.get(name).unwrap_or(&0.0)))
                }
            }
            Expression::Neg(e) => {
                let n = self.eval(e, state)?.to_num()?;
                Ok(Value::Num(-n))
            }
            Expression::Binary { op, lhs, rhs } => {
                let l = self.eval(lhs, state)?;
                let r = self.eval(rhs, state)?;
                self.apply_binop(*op, l, r)
            }
            Expression::Call { name, args } => self.call_builtin(name, args, state),
        }
    }

    fn apply_binop(&self, op: BinOp, l: Value, r: Value) -> Result<Value, RuntimeError> {
        // String concat: + on two strings
        if matches!(op, BinOp::Add) {
            if let (Value::Str(a), Value::Str(b)) = (&l, &r) {
                return Ok(Value::Str(format!("{}{}", a, b)));
            }
        }
        let ln = l.to_num()?;
        let rn = r.to_num()?;
        let result = match op {
            BinOp::Add => ln + rn,
            BinOp::Sub => ln - rn,
            BinOp::Mul => ln * rn,
            BinOp::Div => {
                if rn == 0.0 { return Err(RuntimeError::DivisionByZero); }
                ln / rn
            }
            BinOp::Pow => ln.powf(rn),
            BinOp::Eq  => if ln == rn { -1.0 } else { 0.0 },
            BinOp::Neq => if ln != rn { -1.0 } else { 0.0 },
            BinOp::Lt  => if ln <  rn { -1.0 } else { 0.0 },
            BinOp::Lte => if ln <= rn { -1.0 } else { 0.0 },
            BinOp::Gt  => if ln >  rn { -1.0 } else { 0.0 },
            BinOp::Gte => if ln >= rn { -1.0 } else { 0.0 },
            BinOp::And => if ln != 0.0 && rn != 0.0 { -1.0 } else { 0.0 },
            BinOp::Or  => if ln != 0.0 || rn != 0.0 { -1.0 } else { 0.0 },
        };
        Ok(Value::Num(result))
    }

    fn call_builtin(
        &self,
        name: &str,
        args: &[Expression],
        state: &mut InterpreterState,
    ) -> Result<Value, RuntimeError> {
        let vals: Result<Vec<Value>, _> = args.iter().map(|a| self.eval(a, state)).collect();
        let vals = vals?;
        match name {
            "ABS" => {
                let n = vals.first().ok_or(RuntimeError::OutOfRange)?.to_num()?;
                Ok(Value::Num(n.abs()))
            }
            "INT" => {
                let n = vals.first().ok_or(RuntimeError::OutOfRange)?.to_num()?;
                Ok(Value::Num(n.floor()))
            }
            "RND" => {
                // C64 RND: any positive arg -> next pseudorandom 0..1
                state.seed = state.seed.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
                let bits = (state.seed >> 33) as u32;
                Ok(Value::Num(bits as f64 / u32::MAX as f64))
            }
            "CHR$" => {
                let n = vals.first().ok_or(RuntimeError::OutOfRange)?.to_num()? as i64;
                let n = n.clamp(0, 255) as u8;
                // Special: 147 = CLEAR HOME — represented internally as \u{93}
                if n == 147 { return Ok(Value::Str("\u{0093}".to_string())); }
                if n == 13  { return Ok(Value::Str("\n".to_string())); }
                Ok(Value::Str((n as char).to_string()))
            }
            "STR$" => {
                let n = vals.first().ok_or(RuntimeError::OutOfRange)?.to_num()?;
                Ok(Value::Str(format_basic_number(n).trim_end().to_string()))
            }
            "LEN" => {
                let s = vals.first().ok_or(RuntimeError::OutOfRange)?.to_str()?;
                Ok(Value::Num(s.len() as f64))
            }
            "VAL" => {
                let s = vals.first().ok_or(RuntimeError::OutOfRange)?.to_str()?;
                let n: f64 = s.trim().parse().unwrap_or(0.0);
                Ok(Value::Num(n))
            }
            "ASC" => {
                let s = vals.first().ok_or(RuntimeError::OutOfRange)?.to_str()?;
                let c = s.chars().next().ok_or(RuntimeError::OutOfRange)?;
                Ok(Value::Num(c as u32 as f64))
            }
            other => Err(RuntimeError::UndefinedFunction(other.to_string())),
        }
    }

    fn next_line(&self, after: u32) -> Option<u32> {
        self.program.range(after + 1..).next().map(|(k, _)| *k)
    }
}

enum StepResult {
    Advance,
    JumpedTo { line: u32, stmt_index: usize },
    Halt,
    NeedsInput { prompt: String, var_name: String },
    Error(RuntimeError),
}

fn split_line_number(s: &str) -> Option<(u32, &str)> {
    let bytes = s.as_bytes();
    let mut end = 0;
    while end < bytes.len() && bytes[end].is_ascii_digit() {
        end += 1;
    }
    if end == 0 {
        return None;
    }
    let n: u32 = s[..end].parse().ok()?;
    let rest = s[end..].trim_start();
    Some((n, rest))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn run_to_end(src: &str) -> RunResult {
        let interp = Interpreter::parse(src).expect("parse");
        interp.run(InterpreterState::new())
    }

    fn capture_text(frame: &RunFrame) -> String {
        let mut out = String::new();
        for e in &frame.events {
            match e {
                OutputEvent::Text(s) => out.push_str(s),
                OutputEvent::Newline => out.push('\n'),
                _ => {}
            }
        }
        out
    }

    #[test]
    fn print_hello() {
        let r = run_to_end(r#"10 PRINT "HELLO""#);
        match r {
            RunResult::Halted { frame, .. } => assert_eq!(capture_text(&frame), "HELLO\n"),
            other => panic!("expected halt, got {:?}", other),
        }
    }

    #[test]
    fn for_loop_sum() {
        let r = run_to_end("10 S = 0\n20 FOR I = 1 TO 5\n30 S = S + I\n40 NEXT I\n50 PRINT S");
        match r {
            RunResult::Halted { frame, .. } => assert_eq!(capture_text(&frame).trim(), "15"),
            _ => panic!(),
        }
    }

    #[test]
    fn syntax_error_reports_line() {
        // PRNT instead of PRINT — parser will fail at line 10
        let parse = Interpreter::parse("10 PRNT \"X\"");
        assert!(parse.is_err());
    }

    #[test]
    fn multiplication_correct() {
        // Run the canonical MULTIPLICATION TABLE program for N=3
        let r = Interpreter::parse(
            "10 FOR I = 1 TO 3\n20 PRINT I; \"X\"; 3; \"=\"; I * 3\n30 NEXT I",
        )
        .unwrap()
        .run(InterpreterState::new());
        match r {
            RunResult::Halted { frame, .. } => {
                let text = capture_text(&frame);
                assert!(text.contains("9"));  // 3 * 3 = 9
            }
            _ => panic!(),
        }
    }

    #[test]
    fn multiplication_with_defect_shows_wrong_output() {
        // The defect: + instead of *. Should run without error but produce wrong values.
        let r = Interpreter::parse(
            "10 FOR I = 1 TO 3\n20 PRINT I; \"X\"; 3; \"=\"; I + 3\n30 NEXT I",
        )
        .unwrap()
        .run(InterpreterState::new());
        match r {
            RunResult::Halted { frame, .. } => {
                let text = capture_text(&frame);
                assert!(text.contains("6"));   // 3 + 3 = 6 (the wrong answer)
                assert!(!text.contains("9"));  // never produces the correct 3*3=9
            }
            _ => panic!(),
        }
    }
}
