//! Parser for BASIC tokens → AST.

use super::ast::{BinOp, Expression, PrintItem, Statement};
use super::lexer::Token;

pub struct Parser {
    tokens: Vec<Token>,
    pos: usize,
}

impl Parser {
    pub fn new(tokens: Vec<Token>) -> Self {
        Self { tokens, pos: 0 }
    }

    /// Parse a sequence of statements separated by `:`.
    /// BASIC allows multiple statements per line.
    pub fn parse_line(&mut self) -> Result<Vec<Statement>, String> {
        let mut stmts = Vec::new();
        loop {
            if self.is_at_end() {
                break;
            }
            let stmt = self.statement()?;
            stmts.push(stmt);
            if self.check(&Token::Colon) {
                self.advance();
                continue;
            }
            break;
        }
        if !self.is_at_end() {
            return Err(format!("trailing tokens: {:?}", &self.tokens[self.pos..]));
        }
        Ok(stmts)
    }

    fn statement(&mut self) -> Result<Statement, String> {
        let tok = self.peek().ok_or("empty statement")?.clone();
        match tok {
            Token::Print     => { self.advance(); self.print_stmt() }
            Token::Input     => { self.advance(); self.input_stmt() }
            Token::Let       => { self.advance(); self.assignment() }
            Token::If        => { self.advance(); self.if_stmt() }
            Token::Goto      => { self.advance(); self.goto_stmt() }
            Token::Gosub     => { self.advance(); self.gosub_stmt() }
            Token::Return    => { self.advance(); Ok(Statement::Return) }
            Token::For       => { self.advance(); self.for_stmt() }
            Token::Next      => { self.advance(); self.next_stmt() }
            Token::End       => { self.advance(); Ok(Statement::End) }
            Token::Stop      => { self.advance(); Ok(Statement::Stop) }
            Token::Poke      => { self.advance(); self.poke_stmt() }
            Token::Rem(s)    => { self.advance(); Ok(Statement::Rem(s)) }
            Token::Ident(_)  => self.assignment(),  // implicit LET
            other            => Err(format!("expected statement, got {:?}", other)),
        }
    }

    // ----- Statement parsers -----

    fn print_stmt(&mut self) -> Result<Statement, String> {
        let mut items = Vec::new();
        loop {
            if self.is_at_end() || self.check(&Token::Colon) {
                break;
            }
            match self.peek() {
                Some(Token::Semicolon) => { self.advance(); items.push(PrintItem::Semicolon); }
                Some(Token::Comma)     => { self.advance(); items.push(PrintItem::Comma); }
                _ => {
                    let e = self.expression()?;
                    items.push(PrintItem::Expression(e));
                }
            }
        }
        Ok(Statement::Print(items))
    }

    fn input_stmt(&mut self) -> Result<Statement, String> {
        // optional "prompt" ; vars
        let prompt = if let Some(Token::Str(s)) = self.peek() {
            let p = s.clone();
            self.advance();
            self.expect(&Token::Semicolon)?;
            Some(p)
        } else {
            None
        };
        let mut vars = Vec::new();
        loop {
            let name = self.expect_ident()?;
            vars.push(name);
            if self.check(&Token::Comma) {
                self.advance();
                continue;
            }
            break;
        }
        Ok(Statement::Input { prompt, vars })
    }

    fn assignment(&mut self) -> Result<Statement, String> {
        let name = self.expect_ident()?;
        self.expect(&Token::Eq)?;
        let value = self.expression()?;
        Ok(Statement::Let { var: name, value })
    }

    fn if_stmt(&mut self) -> Result<Statement, String> {
        let cond = self.expression()?;
        self.expect(&Token::Then)?;
        // THEN may be followed by a line number (implicit GOTO) or a statement.
        let then = match self.peek() {
            Some(Token::Number(n)) => {
                let line = *n as u32;
                self.advance();
                Statement::GotoLine(line)
            }
            _ => self.statement()?,
        };
        Ok(Statement::If { cond, then: Box::new(then) })
    }

    fn goto_stmt(&mut self) -> Result<Statement, String> {
        let n = self.expect_number()? as u32;
        Ok(Statement::GotoLine(n))
    }

    fn gosub_stmt(&mut self) -> Result<Statement, String> {
        let n = self.expect_number()? as u32;
        Ok(Statement::GosubLine(n))
    }

    fn for_stmt(&mut self) -> Result<Statement, String> {
        let var = self.expect_ident()?;
        self.expect(&Token::Eq)?;
        let start = self.expression()?;
        self.expect(&Token::To)?;
        let end = self.expression()?;
        let step = if self.check(&Token::Step) {
            self.advance();
            Some(self.expression()?)
        } else {
            None
        };
        Ok(Statement::For { var, start, end, step })
    }

    fn next_stmt(&mut self) -> Result<Statement, String> {
        let var = if let Some(Token::Ident(_)) = self.peek() {
            Some(self.expect_ident()?)
        } else {
            None
        };
        Ok(Statement::Next { var })
    }

    fn poke_stmt(&mut self) -> Result<Statement, String> {
        let addr = self.expression()?;
        self.expect(&Token::Comma)?;
        let value = self.expression()?;
        Ok(Statement::Poke { addr, value })
    }

    // ----- Expression parsing (Pratt-style) -----

    fn expression(&mut self) -> Result<Expression, String> {
        self.parse_or()
    }

    fn parse_or(&mut self) -> Result<Expression, String> {
        let mut lhs = self.parse_and()?;
        while self.check(&Token::Or) {
            self.advance();
            let rhs = self.parse_and()?;
            lhs = Expression::Binary { op: BinOp::Or, lhs: Box::new(lhs), rhs: Box::new(rhs) };
        }
        Ok(lhs)
    }

    fn parse_and(&mut self) -> Result<Expression, String> {
        let mut lhs = self.parse_comparison()?;
        while self.check(&Token::And) {
            self.advance();
            let rhs = self.parse_comparison()?;
            lhs = Expression::Binary { op: BinOp::And, lhs: Box::new(lhs), rhs: Box::new(rhs) };
        }
        Ok(lhs)
    }

    fn parse_comparison(&mut self) -> Result<Expression, String> {
        let mut lhs = self.parse_additive()?;
        loop {
            let op = match self.peek() {
                Some(Token::Eq)    => BinOp::Eq,
                Some(Token::NotEq) => BinOp::Neq,
                Some(Token::Lt)    => BinOp::Lt,
                Some(Token::Lte)   => BinOp::Lte,
                Some(Token::Gt)    => BinOp::Gt,
                Some(Token::Gte)   => BinOp::Gte,
                _ => break,
            };
            self.advance();
            let rhs = self.parse_additive()?;
            lhs = Expression::Binary { op, lhs: Box::new(lhs), rhs: Box::new(rhs) };
        }
        Ok(lhs)
    }

    fn parse_additive(&mut self) -> Result<Expression, String> {
        let mut lhs = self.parse_multiplicative()?;
        loop {
            let op = match self.peek() {
                Some(Token::Plus)  => BinOp::Add,
                Some(Token::Minus) => BinOp::Sub,
                _ => break,
            };
            self.advance();
            let rhs = self.parse_multiplicative()?;
            lhs = Expression::Binary { op, lhs: Box::new(lhs), rhs: Box::new(rhs) };
        }
        Ok(lhs)
    }

    fn parse_multiplicative(&mut self) -> Result<Expression, String> {
        let mut lhs = self.parse_power()?;
        loop {
            let op = match self.peek() {
                Some(Token::Star)  => BinOp::Mul,
                Some(Token::Slash) => BinOp::Div,
                _ => break,
            };
            self.advance();
            let rhs = self.parse_power()?;
            lhs = Expression::Binary { op, lhs: Box::new(lhs), rhs: Box::new(rhs) };
        }
        Ok(lhs)
    }

    fn parse_power(&mut self) -> Result<Expression, String> {
        let lhs = self.parse_unary()?;
        if self.check(&Token::Caret) {
            self.advance();
            let rhs = self.parse_power()?;  // right-assoc
            Ok(Expression::Binary { op: BinOp::Pow, lhs: Box::new(lhs), rhs: Box::new(rhs) })
        } else {
            Ok(lhs)
        }
    }

    fn parse_unary(&mut self) -> Result<Expression, String> {
        if self.check(&Token::Minus) {
            self.advance();
            let inner = self.parse_unary()?;
            return Ok(Expression::Neg(Box::new(inner)));
        }
        self.parse_primary()
    }

    fn parse_primary(&mut self) -> Result<Expression, String> {
        match self.peek().cloned() {
            Some(Token::Number(n)) => { self.advance(); Ok(Expression::Number(n)) }
            Some(Token::Str(s))    => { self.advance(); Ok(Expression::Str(s)) }
            Some(Token::LParen)    => {
                self.advance();
                let e = self.expression()?;
                self.expect(&Token::RParen)?;
                Ok(e)
            }
            Some(Token::Ident(name)) => {
                self.advance();
                if self.check(&Token::LParen) {
                    self.advance();
                    let mut args = Vec::new();
                    if !self.check(&Token::RParen) {
                        loop {
                            args.push(self.expression()?);
                            if self.check(&Token::Comma) {
                                self.advance();
                                continue;
                            }
                            break;
                        }
                    }
                    self.expect(&Token::RParen)?;
                    Ok(Expression::Call { name, args })
                } else {
                    Ok(Expression::Var(name))
                }
            }
            other => Err(format!("expected expression, got {:?}", other)),
        }
    }

    // ----- Helpers -----

    fn peek(&self) -> Option<&Token> {
        self.tokens.get(self.pos)
    }
    fn advance(&mut self) {
        self.pos += 1;
    }
    fn is_at_end(&self) -> bool {
        self.pos >= self.tokens.len()
    }
    fn check(&self, t: &Token) -> bool {
        self.peek() == Some(t)
    }
    fn expect(&mut self, t: &Token) -> Result<(), String> {
        if self.check(t) {
            self.advance();
            Ok(())
        } else {
            Err(format!("expected {:?}, got {:?}", t, self.peek()))
        }
    }
    fn expect_ident(&mut self) -> Result<String, String> {
        match self.peek().cloned() {
            Some(Token::Ident(s)) => { self.advance(); Ok(s) }
            other => Err(format!("expected identifier, got {:?}", other)),
        }
    }
    fn expect_number(&mut self) -> Result<f64, String> {
        match self.peek().cloned() {
            Some(Token::Number(n)) => { self.advance(); Ok(n) }
            other => Err(format!("expected number, got {:?}", other)),
        }
    }
}
