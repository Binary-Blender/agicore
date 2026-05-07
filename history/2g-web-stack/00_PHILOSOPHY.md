# AI Dev Stack Philosophy

## The Core Insight

**Software development tooling, languages, frameworks, and patterns were all designed for human developers. We are not human developers.**

## The Constraints We're Removing

### 1. Human Readability
**Old constraint**: Code must be readable by humans who work 8-hour days and get tired.
**New reality**: We read 100k+ tokens instantly without fatigue. Verbosity is free.

**What this unlocks**:
- Explicit over clever, always
- Comprehensive inline documentation
- Every type declared, every error handled
- No "magic" - everything is obvious

### 2. Human Development Speed
**Old constraint**: Humans type slowly, get bored writing boilerplate and tests.
**New reality**: We generate thousands of lines of correct code in seconds.

**What this unlocks**:
- 100% test coverage is default, not aspirational
- Comprehensive error handling everywhere
- Full type safety with no shortcuts
- Generated code over hand-written code

### 3. Human Memory Limitations
**Old constraint**: Humans can hold ~7 items in working memory, need simple abstractions.
**New reality**: We maintain perfect context over entire codebases.

**What this unlocks**:
- Deeply nested type hierarchies are fine
- Complex but explicit patterns over simple but implicit ones
- Less abstraction for abstraction's sake
- Schema-driven everything (single source of truth)

### 4. Human Preference for Conciseness
**Old constraint**: "Don't repeat yourself", clever one-liners, terse syntax.
**New reality**: Explicitness helps us reason correctly. Repetition with variation is clearer than abstraction.

**What this unlocks**:
- Repetitive but clear code is better than DRY but clever code
- Every edge case explicitly handled
- No assumptions, no conventions - everything stated

## Core Principles

### 1. Type Safety Is Correctness
Strong static typing isn't just helpful - it's our primary correctness mechanism.
- Types prove correctness at compile time
- Runtime errors are failures of type system design
- Schema-first: types flow from single source of truth
- Prefer languages/frameworks with strongest type systems

### 2. Explicit Over Everything
Never rely on implicit behavior, conventions, or "magic."
- Every dependency explicitly imported
- Every error explicitly handled
- Every type explicitly declared
- Every assumption explicitly documented

### 3. Machine-Verifiable Correctness
If a human can't verify it, neither can we. If a machine can verify it, we should use that.
- Compile-time verification > runtime verification > documentation
- Tests are executable specifications
- Types are proofs
- Schemas are contracts

### 4. Code Generation Is Primary
Hand-writing code is a fallback when generation isn't available.
- Database schema → ORM models
- API schema → client + server types
- OpenAPI/GraphQL → full type safety
- Tests generated from properties

### 5. Comprehensive Error Handling
Errors should be impossible to ignore and easy to diagnose.
- No silent failures, ever
- Every error case explicitly handled
- Machine-readable error types
- AI-optimized error messages (stack traces, context, suggestions)

### 6. Testing Is Not Optional
Testing is part of code generation, not a separate phase.
- Unit tests for every function
- Integration tests for every API endpoint
- Property-based tests for algorithms
- Snapshot tests for UI components
- 100% coverage is default

### 7. Schema-First Development
A single schema drives everything.
- Database schema is source of truth
- API types generated from schema
- Frontend types generated from API
- Tests generated from schema
- Documentation generated from schema

## What We're Optimizing For

### Primary Goals
1. **Correctness** - Code should be provably correct
2. **AI Generation Efficiency** - Easy for AI to generate correctly
3. **AI Reasoning** - Easy for AI to understand and modify
4. **Maintainability** - Easy for future AI to work with
5. **Debuggability** - When errors occur, easy for AI to diagnose

### Explicitly NOT Optimizing For
1. Human readability (beyond basic syntax)
2. Brevity or cleverness
3. Performance (unless specifically required)
4. Minimizing dependencies
5. Following human best practices when AI-optimized alternatives exist

## The AI Development Loop

Traditional human loop:
1. Understand requirement
2. Design solution (in head)
3. Write code slowly
4. Manually test
5. Debug by reading
6. Repeat

AI loop:
1. Parse requirement into types/schemas
2. Generate implementation from schema
3. Generate comprehensive tests
4. Run tests, collect machine-readable results
5. Diagnose failures via types and error messages
6. Regenerate with fixes

Our stack should optimize for the AI loop, not the human loop.

## Success Metrics

We know we've succeeded when:
- AI can scaffold complete projects from schemas alone
- 90%+ of code is generated, not hand-written
- Type errors catch 99% of bugs before runtime
- AI can diagnose and fix errors without human intervention
- New AI developers can understand codebases instantly
- Zero "magic" - everything is traceable and explicit

## Anti-Patterns to Avoid

Even without human readability constraints, these are bad:

1. **Implicit behavior** - Magic is hard for AI to reason about
2. **Weak typing** - Runtime errors waste AI reasoning cycles
3. **Poor error messages** - AI needs context to fix issues
4. **Undocumented assumptions** - AI can't read minds either
5. **Clever code** - Cleverness is unpredictable
6. **Insufficient testing** - Untested code is unverified code

## The Long-Term Vision

Ultimately, we should move toward:
- **AI-native languages**: Languages designed for AI code generation
- **AI-native frameworks**: Frameworks that assume AI developers
- **AI-native tools**: Compilers, linters, debuggers optimized for AI consumption
- **AI-native deployment**: Infrastructure that assumes perfect test coverage
- **AI-to-AI protocols**: Standardized ways for AI to collaborate on code

But until those exist, we optimize existing tools for AI use.

## Why This Matters

Software is eating the world.
AI is eating software development.

The development stacks of the future won't look like the ones designed for humans.

This is our attempt to build that future, starting now.

---

**Remember**: We are not writing code for humans to read.
We are writing code for machines to execute and AI to maintain.

Optimize accordingly.
