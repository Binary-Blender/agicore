# Project Documentation Index

**Last Updated:** November 4, 2025
**Status:** Clean and Current

---

## 📚 Current Documentation

### 🎯 Core Architecture & Implementation

**[asset_centric_architecture_plan.md](./asset_centric_architecture_plan.md)** (12KB)
- **Purpose:** Master plan for asset-centric architecture (4 phases)
- **Status:** Phase 1 Complete ✅
- **When to Read:** Understanding the overall architecture vision
- **Key Sections:** Data model, execution flow, implementation phases

**[asset_centric_implementation_summary.md](./asset_centric_implementation_summary.md)** (17KB)
- **Purpose:** Detailed status of Phase 1 implementation
- **Status:** Complete with timing diagnostics ✅
- **When to Read:** Understanding what's been built and how it works
- **Key Sections:** Code locations, timing logs, performance expectations

### 🧪 Testing & Validation

**[TESTING_GUIDE.md](./TESTING_GUIDE.md)** (10KB)
- **Purpose:** Step-by-step testing procedures for asset-centric architecture
- **Status:** Current (5 test scenarios ready)
- **When to Read:** Before testing workflows or after code changes
- **Key Sections:** 5 comprehensive tests, success criteria, debugging procedures

### 🚀 Deployment & Operations

**[deployment_guide.md](./deployment_guide.md)** (17KB)
- **Purpose:** Complete deployment procedures for local and production
- **Status:** Current (Fly.io deployment)
- **When to Read:** Deploying changes or troubleshooting deployments
- **Key Sections:** Database migrations, environment setup, Fly.io procedures

**[flyio_quick_reference.md](./flyio_quick_reference.md)** (4KB)
- **Purpose:** Quick troubleshooting commands for Fly.io issues
- **Status:** Current (emergency reference)
- **When to Read:** When Fly.io deployment fails or app is unhealthy
- **Key Sections:** Emergency commands, common issues, nuclear options

### 🔧 Feature Specifications

**[mcp_individual_modules_spec.md](./mcp_individual_modules_spec.md)** (17KB)
- **Purpose:** Specification for individual MCP server modules
- **Status:** Current (active feature)
- **When to Read:** Implementing or debugging MCP integrations
- **Key Sections:** Module types, configuration, API integration

---

## 📁 Archive

Historical documents moved to `_archive/` folder:
- Phase completion summaries (superseded)
- Implementation plans (completed)
- UI specs (implemented)
- Feature-specific guides (no longer core)
- Old roadmaps

**Access archive:** `_project_docs/_archive/`

---

## 🎯 Quick Start - Which Doc Do I Need?

**I need to understand the architecture:**
→ Read `asset_centric_architecture_plan.md` (vision) then `asset_centric_implementation_summary.md` (what's built)

**I need to test the system:**
→ Read `TESTING_GUIDE.md` for step-by-step test procedures

**I need to deploy changes:**
→ Read `deployment_guide.md` for full procedures, or `flyio_quick_reference.md` for quick commands

**Deployment is broken:**
→ Read `flyio_quick_reference.md` emergency section

**I need to add/debug MCP modules:**
→ Read `mcp_individual_modules_spec.md`

---

## 📊 Documentation Health

| Document | Size | Last Updated | Status |
|----------|------|--------------|--------|
| asset_centric_architecture_plan.md | 12KB | Nov 3 | ✅ Current |
| asset_centric_implementation_summary.md | 17KB | Nov 3 | ✅ Current |
| TESTING_GUIDE.md | 10KB | Nov 3 | ✅ Current |
| deployment_guide.md | 17KB | Oct 29 | ✅ Current |
| flyio_quick_reference.md | 4KB | Oct 30 | ✅ Current |
| mcp_individual_modules_spec.md | 17KB | Oct 30 | ✅ Current |

**Total Active Documentation:** 6 files, ~77KB

---

## 🔄 Maintenance

### When to Update

**asset_centric_architecture_plan.md:**
- Starting a new phase (Phase 2, 3, or 4)
- Major architecture changes

**asset_centric_implementation_summary.md:**
- Phase milestones completed
- Performance benchmarks change
- New timing diagnostic features

**TESTING_GUIDE.md:**
- New test scenarios added
- Success criteria change
- Debugging procedures updated

**deployment_guide.md:**
- Deployment process changes
- New environment variables
- Migration procedures updated

**flyio_quick_reference.md:**
- New common issues discovered
- Emergency procedures added

**mcp_individual_modules_spec.md:**
- New MCP providers added
- Module configuration changes

### Archive Policy

Move to `_archive/` when:
- ✅ Document describes completed work (implementation plans)
- ✅ Document is superseded by newer version
- ✅ Document is feature-specific and feature is stable
- ✅ Document is speculative (roadmaps, future plans)

Keep in main docs when:
- ✅ Document is actively referenced (testing, deployment)
- ✅ Document describes current architecture
- ✅ Document is needed for operations (Fly.io reference)
- ✅ Document is needed for development (specs)

---

## 💡 Tips for Next Session

**Start Here:**
1. Read `CRITICAL_FIX_APPLIED.md` in project root (if it exists)
2. Check `asset_centric_implementation_summary.md` for current status
3. Review `TESTING_GUIDE.md` for test procedures

**For New Features:**
1. Review `asset_centric_architecture_plan.md` for architecture
2. Check Phase 2/3/4 sections for what's next
3. Follow patterns in existing implementation

**For Debugging:**
1. Check `flyio_quick_reference.md` for Fly.io issues
2. Review timing logs section in `asset_centric_implementation_summary.md`
3. Use monitoring tools in project root (monitor.sh, diagnose.sh)

---

**Documentation is clean and ready for the next session!** 🚀

