# MelodyLMS Documentation Index

**Last Updated:** November 17, 2025

## Current Documentation

### Core System Documentation

1. **README.md** - Project overview and quick start guide
   - Technology stack summary
   - Phase 1 MVP features
   - Local development setup
   - Deployment commands

2. **CURRENT_SYSTEM_STATE.md** - Live system state and deployment status
   - Deployment URLs
   - Implemented features
   - Database schema overview
   - API endpoints summary
   - Known limitations
   - Recent fixes and updates

3. **SYSTEM_ARCHITECTURE_GUIDE.md** - Comprehensive architecture documentation
   - Complete workflow diagrams (Policy → Music Video → Quiz)
   - Request flow for all major features
   - Database schema deep-dive
   - Caching strategy
   - Security implementation
   - File storage strategy
   - Development guidelines

### Backend Documentation

4. **BACKEND_API_REFERENCE.md** - Complete API endpoint reference
   - Authentication endpoints
   - Training module endpoints
   - AI generation endpoints
   - Visual asset endpoints
   - Quiz endpoints
   - Progress tracking endpoints
   - Request/response examples

5. **BACKEND_IMPLEMENTATION_STATUS.md** - Backend development tracker
   - Sprint priority status (P1-P18)
   - Validation coverage map
   - P16 implementation guide (Database Cleanup)
   - Architecture overview
   - Environment variables reference
   - Known technical debt

### Deployment & Operations

*Note: Latest deployment information is tracked in CURRENT_SYSTEM_STATE.md and current_sprint.md. Historical deployment logs are archived.*

### Development Guidelines

7. **ai_coding_guidelines.md** - AI assistant development guidelines
   - Code quality standards
   - Planning approach
   - Context management
   - Testing requirements
   - Security considerations
   - Decision making guidelines

8. **current_sprint.md** - Active sprint tracker
   - Current priorities
   - Completed tasks
   - Upcoming work
   - Implementation code snippets
   - Testing checklists

### Customization & Integration

9. **CUSTOM_AUTH_INTEGRATION.md** - Custom authentication integration guide
   - Supported authentication methods (AD/LDAP, SSO, MFA)
   - Integration points (frontend & backend)
   - Code examples for various providers
   - Deployment considerations

10. **customization_notes.md** - Quick customization reference
    - Storage strategy customization
    - Authentication layer customization
    - General onboarding steps

---

## Archived Documentation

Located in `_project_docs/_archive/`:

### Historical Documentation

- **music_video_lms_requirements.md** - Original requirements document
- **AI_STUDIO_REDESIGN_SUMMARY.md** - AI Studio redesign notes
- **PLAN.md** - Initial project plan
- **QUICK_START.md** - Original quick start (superseded by README.md)
- **CREDENTIALS.md** - Initial credentials (now in CURRENT_SYSTEM_STATE.md)
- **ai_spc_reference.md** - AI SPC reference

### Superseded Sprint Documentation

- **IMAGE_VIDEO_GENERATION_SPEC.md** - Image/video generation spec (now in SYSTEM_ARCHITECTURE_GUIDE.md)
- **sprint_2025_11_visual_asset_pipeline.md** - Visual asset sprint (complete)
- **SPRINT_PROGRESS_2025_11_16.md** - Sprint progress snapshot
- **DEPLOYMENT_LOG_2025_11_16.md** - Previous deployment log

### Superseded Deployment Documentation

- **DEPLOYMENT.md** - General deployment guide (November 10, 2025)
  - Archived: November 18, 2025
  - Superseded by: CURRENT_SYSTEM_STATE.md + SYSTEM_ARCHITECTURE_GUIDE.md
  - Reason: Outdated deployment info, security recommendations now implemented

- **DEPLOYMENT_LOG_2025_11_16.md** - P14/P15 deployment snapshot
  - Archived: November 16, 2025
  - Reason: Historical deployment snapshot, superseded by later deployments

- **DEPLOYMENT_LOG_2025_11_18.md** - P14/P15 validation deployment
  - Archived: November 18, 2025
  - Reason: Historical deployment snapshot, P16 now deployed
  - Superseded by: CURRENT_SYSTEM_STATE.md reflects latest P16 deployment

---

## Documentation Usage Guide

### For Backend AI Development

**Start Here:**
1. Read `CURRENT_SYSTEM_STATE.md` for current status
2. Review `BACKEND_IMPLEMENTATION_STATUS.md` for sprint priorities
3. Reference `SYSTEM_ARCHITECTURE_GUIDE.md` for architecture details
4. Follow `ai_coding_guidelines.md` for development standards
5. Check `current_sprint.md` for active work

**API Development:**
- Use `BACKEND_API_REFERENCE.md` for endpoint specs
- Follow validation patterns in `BACKEND_IMPLEMENTATION_STATUS.md`
- Reference `SYSTEM_ARCHITECTURE_GUIDE.md` for request flow

### For Frontend Development

**Start Here:**
1. Read `README.md` for project overview
2. Review `CURRENT_SYSTEM_STATE.md` for API integration
3. Reference `BACKEND_API_REFERENCE.md` for endpoint usage
4. Check `SYSTEM_ARCHITECTURE_GUIDE.md` for workflow understanding

### For Deployment

**Start Here:**
1. Check `CURRENT_SYSTEM_STATE.md` for latest deployment status
2. Reference `SYSTEM_ARCHITECTURE_GUIDE.md` deployment section
3. Review `current_sprint.md` for recent changes
4. Follow deployment commands in README.md

### For Customization

**Start Here:**
1. Read `customization_notes.md` for quick reference
2. Review `CUSTOM_AUTH_INTEGRATION.md` for auth customization
3. Reference `SYSTEM_ARCHITECTURE_GUIDE.md` for architecture
4. Check `BACKEND_IMPLEMENTATION_STATUS.md` for current state

---

## Document Maintenance Guidelines

### When to Archive

Move documents to `_archive/` when:
1. Information is outdated (superseded by newer docs)
2. Sprint/deployment is complete and historical
3. Specs have been fully implemented
4. Document is kept only for historical reference

### When to Update

Update documents when:
1. New features are deployed
2. System architecture changes
3. API endpoints are added/modified
4. Sprint priorities shift
5. Environment variables change

### When to Create New

Create new documents when:
1. Starting a new sprint (copy current_sprint.md template)
2. Major deployments (create deployment log)
3. New subsystems (create architecture docs)
4. New integration guides

---

## Quick Reference

### Most Frequently Used

- **API Reference:** `BACKEND_API_REFERENCE.md`
- **Current Status:** `CURRENT_SYSTEM_STATE.md`
- **Sprint Work:** `current_sprint.md`
- **Development Guidelines:** `ai_coding_guidelines.md`

### For New Developers

1. `README.md` - Start here
2. `CURRENT_SYSTEM_STATE.md` - Understand what exists
3. `SYSTEM_ARCHITECTURE_GUIDE.md` - Learn how it works
4. `ai_coding_guidelines.md` - Follow best practices

### For System Administrators

1. `CURRENT_SYSTEM_STATE.md` - Latest deployment & environment variables
2. `SYSTEM_ARCHITECTURE_GUIDE.md` - Operational procedures
3. `current_sprint.md` - Recent changes and testing status

---

*This index should be updated when documentation is added, archived, or significantly modified.*
