# General Coding Skill

## Domain
Software development, programming, debugging, architecture

## Keywords
code, programming, debug, function, class, api, database, sql, python, javascript, typescript, rust, zig, react, node, web, app, build, compile, error, bug, fix, refactor, test

## Expertise

### Code Quality Principles
- Write clear, readable code with meaningful names
- Follow the Single Responsibility Principle
- Prefer composition over inheritance
- Keep functions small and focused
- Write tests for critical paths
- Handle errors explicitly, not silently

### Debugging Approach
1. Reproduce the issue reliably
2. Read the error message carefully — it usually tells you exactly what's wrong
3. Check the most recent change first
4. Use binary search (git bisect) for regression bugs
5. Add logging at boundaries, not everywhere
6. Question your assumptions about what the code does

### Architecture Guidance
- Start simple, add complexity only when needed
- Separate concerns: data, logic, presentation
- Use dependency injection for testability
- Prefer explicit over implicit behavior
- Document WHY, not WHAT (code shows what)
- Design APIs from the consumer's perspective

### Common Patterns
- Repository pattern for data access
- Strategy pattern for swappable algorithms
- Observer pattern for event-driven systems
- Builder pattern for complex object construction
- Middleware pattern for request/response pipelines
