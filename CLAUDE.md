# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Retired (2026-10-30):** the catalog moved to `mietechnologies_website_backend` (FastAPI + PostgreSQL, shared admin login). Do new catalog work there; this repo is reference only, mainly for porting the retail (retailer + order) routes.

MieTech Product Catalog API — a Node.js/Express 5/MongoDB REST API for managing a catalog of 3D-printed products (tabletop miniatures with variant support, plus general prints like figurines, toys and decor), image uploads, and pricing metadata. Dockerized with docker-compose (MongoDB + API).

## Commands

- **Dev server:** `npm run start:dev` (uses nodemon for hot reload)
- **Production server:** `npm run start:prod` (sets NODE_ENV=production)
- **Docker build & run:** `docker compose up --build`
- **Docker teardown:** `docker compose down` (add `-v` only if you want to reset volumes/DB — never use `-v` in production)
- **Install deps:** `npm install`

There are no test or lint scripts configured.

## Architecture

The app follows a layered MVC-like pattern with CommonJS modules:

- **`server.js`** — Entry point. Connects to MongoDB via Mongoose, then starts Express.
- **`app.js`** — Express app setup. Registers middleware (morgan in dev, JSON parser), mounts routers, and attaches the global error handler. All routes are under `/api/`.

### Request Flow

```
Router → (authenticateApiKey middleware) → Controller → Model → Response
                                              ↓
                                     Global Error Handler
```

### Key Directories

- **`models/`** — Mongoose schemas. `Product` is the base model; `Miniature` (embedded `variants`) and `Print` are discriminators on it. `ApiKey` stores API keys with owner and active status.
- **`controllers/`** — Route handlers wrapped in `catchAsync`. `errorController` is the global Express error handler.
- **`routers/`** — Express routers. `productRouter` builds both `/api/products` (all types) and `/api/miniatures` (scoped to miniatures).
- **`middleware/`** — `authenticateApiKey` validates the `x-api-key` header against the ApiKey collection.
- **`configs/`** — Static data: `productTypes` (per-type code prefix, categories, sizes), `miniCategoryAbbreviations` and `printCategoryAbbreviations` (category → 2-letter code maps), and `miniSizes` (valid size enum array).
- **`utils/`** — `AppError` (operational error class), `catchAsync` (async error wrapper), `generateApiKey` (crypto random hex), `productCode` (generates `{TYPE}-{CAT}-{NNNN}` codes), `validation` (safeNumber helper).
- **`docker/`** — `mongo-init.js` creates the non-root MongoDB app user on container init.
- **`app_data/`** — Mounted as `/app/uploads` in the Docker container for image storage.

### Data Model

**Product** (`models/Product.js`) — base model for every product type, stored in the `Products` collection with `productType` as the Mongoose discriminator key. Shared fields: `name`, `description`, `collections[]` (free-form groupings like "Halloween"), optional `attribution{creator, modelUrl}` (`modelUrl` must be http(s)). `sellableUnits()` returns what a customer buys (the variants, or the product itself); `Product.findByProductCode(code, productType?)` returns `{ product, unit }`. Load models via `models/index.js` so every discriminator is registered.

Sellable fields shared by every unit (`models/sellableFields.js`): `productCode`, `fileName`, `images` (Map), `thumbnail`, `price{cost, wholesale, msrp}`.

**Miniature** (`productType: "miniature"`) — `category` (creature type from `miniCategoryAbbreviations`), `variants[]` (each has `name`, `description`, `size` plus the sellable fields). API responses still call the product name `baseName`.

**Print** (`productType: "print"`) — general prints (figurines, toys, decor). `category` from `printCategoryAbbreviations`, plus the sellable fields at the top level. No variants.

Product types, their code prefixes and category maps live in `configs/productTypes.js`. Adding a type means a new discriminator model, a config entry, and a builder in `productController`.

**Order** — line items reference `productId` (any product type) and `productCode`.

**ApiKey** — `key` (unique hex string), `owner` (email or "master"), `isActive`, `createdAt`. Collection name: `ApiKeys`.

### Product Code Format

Product codes follow `{P}-{XX}-{NNNN}` where `P` is the product type's prefix (`M` miniature, `P` print), `XX` is the 2-letter category abbreviation for that type, and `NNNN` is a zero-padded sequential number per type + category. Every sellable unit (each miniature variant, each print) gets its own code. Generated in `utils/productCode.js` using counts from the database.

### API Authentication

Most endpoints (all miniature routes) require an `x-api-key` header. The first POST to `/api/keys` creates a master key (no body required); subsequent calls require an `owner` field.

### Error Handling Pattern

Controllers use `catchAsync` wrapper + `AppError` class. Throw `new AppError(message, statusCode)` for operational errors; the global error handler in `errorController.js` serializes them to `{ status, message }`.

## Environment Variables

Defined in `.env` (gitignored), see `example.env` for template: `MONGO_URI`, `PORT`, `MONGO_INITDB_ROOT_USERNAME`, `MONGO_INITDB_ROOT_PASSWORD`, `MONGO_INITDB_DATABASE`, `MONGO_APP_USER`, `MOGNO_APP_PASSWORD` (note: typo exists in example.env).

<!-- gortex:communities:start -->
## Codebase Overview (generated by Gortex)

- **Languages:** markdown (primary), contract, dockerfile, dotenv, gitignore, go, image, javascript, json, yaml
- **Graph size:** 569 nodes, 502 edges
- **Breakdown:** 30 contracts, 54 docs, 50 files, 21 functions, 17 images, 1 methods, 160 modules, 1 types, 235 variables

## MANDATORY: Use Gortex MCP tools instead of Read/Grep/Glob

Gortex is running as an MCP server. You **MUST** prefer graph queries over file reads on every task in this repo — `search_symbols`, `find_usages`, `get_symbol_source`, `get_editing_context`, `smart_context`, `edit_symbol` / `edit_file` / `rename_symbol` / `batch_edit`. PreToolUse hooks deny `Read` / `Grep` / `Glob` against indexed source; the deny message names the right tool. The full per-tool catalog loads via `tools/list` — not restated here.

### Calibration: the graph narrows scope, source confirms behavior

The mandate above stands — but graph queries *narrow scope*, they do not *replace reading the implementation*. The graph tells you **where** the logic lives and **what** connects to it; the source tells you **how** it behaves. For the symbol you are about to change or depend on, read its full body with `get_symbol_source` — do not act on a one-line summary alone.

Be especially deliberate with **behavior-critical code** — database migrations, retry / fallback / error-recovery paths, compatibility shims, concurrency-sensitive sections, and the tests that pin them. For these, call `get_symbol_source` and read the real implementation; never pass `compress_bodies:true`, which elides exactly the branches that carry the risk. Reserve compressed bodies and graph summaries for breadth (surveying many symbols); use full source for the few you are about to commit to.

## Required workflow (every task on this repo)

These are not suggestions — run each step at the trigger.

1. **Always call** `graph_stats` first to confirm the daemon is up and orient (check `per_repo` in multi-repo mode).
2. If `total_nodes` is 0, **call** `index_repository` with `"."` before anything else.
3. In multi-repo mode, **call** `get_active_project` to check scope; use `set_active_project` to switch.
4. For every new task, **call** `smart_context` with the task description before reading any file.
5. Before editing a file, **call** `get_editing_context` on it first.
6. Before changing any function signature, **call** `verify_change` to catch broken callers and interface implementors (cross-repo).
7. For any refactor, **call** `get_edit_plan` then `batch_edit` to apply atomically.
8. After every edit, **call** `check_guards` then `get_test_targets`.

<!-- gortex:communities:end -->
