# AI Dev Stack: Project Templates

**Scaffolding templates optimized for AI development**

---

## Template 1: FastAPI + PostgreSQL + Next.js

**Use case**: Full-stack web application with REST API

### Stack:
- **Backend**: FastAPI + Python 3.11+ + SQLAlchemy + PostgreSQL
- **Frontend**: Next.js 14 (App Router) + TypeScript + TailwindCSS
- **Testing**: pytest + Vitest + Playwright
- **Deployment**: Docker + Fly.io

### Scaffold command:
```bash
ai-scaffold new my-project --template fastapi-nextjs-postgres
```

### Generated structure:
```
my-project/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI app
│   │   ├── config.py                # Pydantic Settings
│   │   ├── database.py              # Database session
│   │   ├── dependencies.py          # DI providers
│   │   ├── exceptions.py            # Custom exceptions
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── base.py              # SQLAlchemy Base
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   └── common.py            # Shared schemas
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   └── base_service.py
│   │   └── routes/
│   │       ├── __init__.py
│   │       └── health.py            # Health check endpoint
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py              # Pytest fixtures
│   │   ├── test_unit/
│   │   ├── test_integration/
│   │   └── test_e2e/
│   ├── migrations/                  # Alembic migrations
│   │   ├── env.py
│   │   └── versions/
│   ├── scripts/
│   │   ├── init_db.py
│   │   └── seed_data.py
│   ├── pyproject.toml               # Poetry config
│   ├── Dockerfile
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   └── ui/                  # shadcn/ui components
│   │   ├── hooks/
│   │   │   └── useApi.ts
│   │   ├── services/
│   │   │   └── api.ts               # API client
│   │   ├── types/
│   │   │   └── api.ts               # Generated from OpenAPI
│   │   └── utils/
│   │       └── cn.ts                # Class name utilities
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── next.config.js
│   ├── Dockerfile
│   └── README.md
├── docker-compose.yml               # Local development
├── .github/
│   └── workflows/
│       ├── backend-ci.yml
│       └── frontend-ci.yml
├── .gitignore
└── README.md
```

### Included features:
- ✅ Strict type checking (mypy + TypeScript strict)
- ✅ Comprehensive linting (ruff + ESLint)
- ✅ Pre-commit hooks
- ✅ Docker setup for local development
- ✅ CI/CD pipelines
- ✅ Health check endpoints
- ✅ CORS configuration
- ✅ Environment variable validation (Pydantic Settings)
- ✅ Logging configuration
- ✅ Error handling middleware
- ✅ Database connection pooling
- ✅ API documentation (auto-generated from OpenAPI)

---

## Template 2: FastAPI Microservice

**Use case**: Single-purpose API service

### Stack:
- **Backend**: FastAPI + Python 3.11+ + PostgreSQL
- **Testing**: pytest + hypothesis
- **Deployment**: Docker + Kubernetes

### Scaffold command:
```bash
ai-scaffold new my-service --template fastapi-microservice
```

### Generated structure:
```
my-service/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── models/
│   ├── schemas/
│   ├── services/
│   ├── routes/
│   └── dependencies.py
├── tests/
│   ├── conftest.py
│   └── test_*
├── migrations/
├── k8s/                             # Kubernetes manifests
│   ├── deployment.yaml
│   ├── service.yaml
│   └── ingress.yaml
├── pyproject.toml
├── Dockerfile
└── README.md
```

### Included features:
- ✅ Health and readiness probes
- ✅ Prometheus metrics endpoint
- ✅ Structured logging (JSON format)
- ✅ Request tracing with correlation IDs
- ✅ Rate limiting
- ✅ Kubernetes deployment manifests
- ✅ Horizontal pod autoscaling config

---

## Template 3: CLI Tool

**Use case**: Command-line tool with rich output

### Stack:
- **Language**: Python 3.11+
- **CLI**: Click + Rich
- **Testing**: pytest + hypothesis

### Scaffold command:
```bash
ai-scaffold new my-tool --template python-cli
```

### Generated structure:
```
my-tool/
├── my_tool/
│   ├── __init__.py
│   ├── cli.py                       # Click commands
│   ├── commands/
│   │   ├── __init__.py
│   │   └── hello.py
│   ├── utils/
│   │   └── output.py                # Rich output formatting
│   └── config.py
├── tests/
│   ├── conftest.py
│   └── test_commands/
├── pyproject.toml
└── README.md
```

### Included features:
- ✅ Click for CLI framework
- ✅ Rich for beautiful terminal output
- ✅ Progress bars and spinners
- ✅ Colored output
- ✅ Table formatting
- ✅ Configuration file support (TOML)
- ✅ Comprehensive help text
- ✅ Shell completion

---

## Template 4: Data Processing Pipeline

**Use case**: ETL/data processing workflows

### Stack:
- **Language**: Python 3.11+
- **Framework**: Prefect or Dagster
- **Testing**: pytest + hypothesis

### Scaffold command:
```bash
ai-scaffold new my-pipeline --template python-data-pipeline
```

### Generated structure:
```
my-pipeline/
├── pipeline/
│   ├── __init__.py
│   ├── tasks/
│   │   ├── __init__.py
│   │   ├── extract.py
│   │   ├── transform.py
│   │   └── load.py
│   ├── flows/
│   │   ├── __init__.py
│   │   └── main_flow.py
│   └── utils/
│       └── validators.py
├── tests/
│   ├── conftest.py
│   └── test_tasks/
├── data/
│   ├── raw/
│   ├── processed/
│   └── output/
├── pyproject.toml
└── README.md
```

### Included features:
- ✅ Task-based architecture
- ✅ Data validation with Pydantic
- ✅ Retry logic with backoff
- ✅ Logging and monitoring
- ✅ Data quality checks
- ✅ Schema evolution handling

---

## Template Configuration Files

### pyproject.toml (Standard for all Python projects)

```toml
[tool.poetry]
name = "my-project"
version = "0.1.0"
description = "AI-generated project following AI Dev Stack standards"
authors = ["AI Dev Team"]

[tool.poetry.dependencies]
python = "^3.11"

[tool.poetry.group.dev.dependencies]
pytest = "^7.4"
pytest-asyncio = "^0.21"
pytest-cov = "^4.1"
hypothesis = "^6.92"
mypy = "^1.7"
ruff = "^0.1"
black = "^23.11"

[tool.mypy]
python_version = "3.11"
strict = true
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true

[tool.ruff]
select = ["ALL"]
ignore = ["D203", "D213"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
addopts = "--cov=app --cov-report=term-missing --cov-fail-under=90"

[tool.coverage.run]
source = ["app"]
omit = ["tests/*", "**/__pycache__/*"]

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"
```

### tsconfig.json (Standard for all TypeScript projects)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "allowUnusedLabels": false,
    "allowUnreachableCode": false,
    "exactOptionalPropertyTypes": true,
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", ".next"]
}
```

### .pre-commit-config.yaml

```yaml
repos:
  - repo: local
    hooks:
      - id: mypy
        name: mypy
        entry: mypy
        language: system
        types: [python]
        pass_filenames: false

      - id: ruff
        name: ruff
        entry: ruff check
        language: system
        types: [python]

      - id: black
        name: black
        entry: black --check
        language: system
        types: [python]

      - id: pytest
        name: pytest
        entry: pytest
        language: system
        types: [python]
        pass_filenames: false
```

---

## Adding Resources to Existing Projects

### Add a new resource (e.g., "Product"):

```bash
ai-scaffold add-resource Product \
  --fields "name:str,price:Decimal,description:str|None,in_stock:bool" \
  --crud \
  --tests
```

### What gets generated:

1. **Migration** (`migrations/002_create_products.sql`):
```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    in_stock BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

2. **Model** (`app/models/product.py`):
```python
from sqlalchemy.orm import Mapped, mapped_column
from decimal import Decimal

class Product(Base):
    __tablename__ = "products"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    in_stock: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
```

3. **Schemas** (`app/schemas/product.py`):
```python
class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    price: Decimal = Field(..., ge=0, decimal_places=2)
    description: str | None = None
    in_stock: bool = True

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    price: Decimal | None = Field(None, ge=0, decimal_places=2)
    description: str | None = None
    in_stock: bool | None = None

class ProductResponse(ProductBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
```

4. **Service** (`app/services/product_service.py`)
5. **Routes** (`app/routes/products.py`)
6. **Tests** (`tests/test_services/test_product_service.py`, `tests/test_api/test_products.py`)

**Time to generate**: ~30 seconds
**Lines of code generated**: ~800
**Test coverage**: 100%

---

## Template Best Practices

### 1. All templates include:
- ✅ Strict type checking configuration
- ✅ Comprehensive linting rules
- ✅ Pre-commit hooks
- ✅ Test infrastructure
- ✅ CI/CD pipelines
- ✅ Docker configuration
- ✅ Environment variable validation
- ✅ Logging setup
- ✅ Health check endpoints

### 2. Templates are AI-optimized:
- ✅ Explicit over implicit
- ✅ Comprehensive docstrings
- ✅ Type annotations everywhere
- ✅ Layered architecture
- ✅ Protocol definitions
- ✅ Error handling boilerplate

### 3. Templates are customizable:
```bash
# Choose specific features
ai-scaffold new my-project --template fastapi-nextjs \
  --features auth,websockets,background-tasks

# Exclude features
ai-scaffold new my-project --template fastapi-nextjs \
  --no-frontend  # Backend only

# Different database
ai-scaffold new my-project --template fastapi \
  --database mongodb
```

---

## Summary

**Available templates**:
1. fastapi-nextjs-postgres (Full-stack web app)
2. fastapi-microservice (Single-purpose API)
3. python-cli (Command-line tool)
4. python-data-pipeline (ETL/data processing)

**All templates**:
- Follow AI Dev Stack standards
- Include comprehensive configuration
- Generate 100% type-safe code
- Include test infrastructure
- Include CI/CD setup
- Are ready to deploy

**Usage**:
```bash
# New project
ai-scaffold new my-project --template TEMPLATE_NAME

# Add resource
ai-scaffold add-resource ResourceName --fields FIELDS --crud --tests
```

**Result**: Production-ready project in minutes, not days.
