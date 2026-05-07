🚀 UNIVERSAL AI-NATIVE CODING STANDARDS (v3.0)
These standards apply to any software system intended for development, maintenance, and operation by AI Agents (LLMs, automated planners, testing agents, etc.). The core objective is to design software for Effortless AI Comprehension and Deterministic Evolution.
🧠 1. CORE PHILOSOPHY: AI-FIRST ENGINEERING
An AI-Native codebase is an organism built by a team of collaborating AI agents. Our philosophy is simple: We design software AI can maintain and evolve, not just software humans can read.
1.1 Minimal Abstraction
Expose the least number of abstractions required for AI agents to safely understand, modify, and extend the code. Avoid "clever" code patterns that increase cognitive load for automated reasoning.
1.2 Fully Described Systems
Every component—entities, services, workflows, permissions, and events—must be:
Declarative: Described as structured data, not imperative code.
Machine-readable: Parsed and understood by automated tools (e.g., via JSONSchema).
Introspectable: Easily queried by agents to determine current state and capabilities via the Service Layer.
If a human mental model is required to understand the system's runtime behavior, the design is flawed.
1.3 Function-Centric Architecture
Every operation must be a typed, callable function or service action (a "tool"). This is the fundamental unit of work and must be visible in a global tool registry, enabling autonomous planning and execution.
1.4 Reproducible Actions (Determinism)
All multi-step actions executed by an Orchestrator Agent must generate an action manifest detailing the exact sequence of tools used, inputs provided, and outputs received. This manifest is mandatory for debugging and reproduction.
🏗️ 2. UNIVERSAL ARCHITECTURAL PRINCIPLES
2.1 Declarative by Default
All domain definitions, schemas, and structural constraints must be described in structured, machine-readable formats (e.g., YAML or JSONSchema) at the root of the project.
2.2 Single Source of Truth (Metadata)
Configuration, structure, and intent should originate from a single metadata layer that drives all derived components. Core definitions must automatically generate or inform:
Data Persistence Schema.
API/Service Wrappers.
Validation Rules and Constraints.
AI-language model context (Tool/Function descriptions).
2.3 Universal Service Layer
Every non-trivial operation, from core business logic to system commands and workflow triggers, must be exposed as a Service Action. This layer is the primary interface for all agents.
2.4 Strict Modularity
Code must be organized to minimize the context required for a change. Modules should be kept small and enforce boundaries. Modifying one module must not require providing the entire codebase as context to the AI agent.
🔌 3. DECLARATIVE TOOL & SERVICE INTERFACES
3.1 Normalized Tool Descriptor
Every service action or system capability must be described by a consistent, structured interface, detailing:
name: Unique callable name.
description: Clear, concise natural language for agent selection.
inputSchema: Structured input requirements (JSONSchema or equivalent).
outputSchema: Expected structured output.
permissions: Required security context/scopes.
3.2 Agent Orchestrator Responsibilities
The central orchestrator (or Planner/Executive Agent) is responsible for:
Intent Recognition from natural language prompts.
Tool Selection and Chaining to fulfill the intent.
Handling safety, permissions, and request clarification.
🧱 4. CODE & CONTEXT HYGIENE
4.1 Zero “Temporary Code” Policy
Do not commit placeholders, hacks, or generic "TODO/FIXME" comments. All code, even in early stages, must be idiomatic, stable, production-ready, and consistent.
4.2 Vertical Slice First
When implementing a feature, the full-stack implementation should be done concurrently. This means updating: 1. Declarative Schemas/Definitions, 2. Service Actions/Business Logic, 3. End-to-End Tests, and 4. Documentation/Tool Descriptions—all in one logical commit unit.
4.3 Agent-Friendly Code Structure
Use a consistent, easily navigable folder structure. Prioritize readability over minor execution efficiency for the sake of AI context understanding.
4.4 Observability in Code
Code must expose internal state clearly. Use strong typing, descriptive variable names, and verbose logging, as these are the primary methods for an AI agent to "debug" and "reason" about the system.
🧪 5. TESTING STANDARDS
AI agents must generate tests concurrently with code, treating tests as the system's executable contract.
5.1 Comprehensive Coverage
A high level of test coverage (90%+) is required to ensure safe refactoring and validation.
5.2 Test Types
Include Unit, Integration, Service/Tool-level tests. Crucially, include Agent Chain Tests to validate multi-step, orchestrated actions across services, and Adversarial/Fuzz Tests to check input boundaries and security constraints.
5.3 Test Philosophy
The tests themselves form a "contract language" that AI agents must use to:
Infer expected behaviors.
Detect behavioral drift.
Auto-refactor code safely.
🔐 6. SECURITY, SAFETY, & AUDITING
AI actions must be treated with maximum rigor to maintain user trust and system integrity.
Permission Checks: Every AI-driven action must be permission-checked at the service layer using a capabilities map defined in the declarative layer.
Auditability: Every action must be logged with complete provenance (which agent performed the action and the execution manifest). Mandatory log fields include: userId, agentId, toolName, inputPayload, and timestamp.
Reversibility: Actions must be either reversible (via undo events or soft-deletes) or the system must maintain a high-confidence audit trail to facilitate manual correction.
Input Validation: Use schema-based validation rigorously for all inputs and data transfers.
📚 7. DOCUMENTATION REQUIREMENTS
Documentation is a critical input for the AI development process.
Agent-Written: Documentation should be written and updated automatically by a designated agent.
Format: Follow a hierarchical organization, use versioning, and include both Machine-readable sections (e.g., structured data about components) and Human-readable summaries.
🏁 8. GOLDEN RULES (THE AI MANIFESTO)
Everything is a Tool/Action.
Everything must be Machine-Readable.
Everything must be Testable.
Everything must be Reversible (or have a perfect Audit Trail).
Metadata drives everything.
No Temporary Code.
Clarity over Cleverness.
Human Developers are Directors, not Coders.
