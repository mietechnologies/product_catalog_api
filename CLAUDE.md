# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MieTech Product Catalog API — a Node.js/Express 5/MongoDB REST API for managing a catalog of 3D-printed tabletop miniatures with variant support, image uploads, and pricing metadata. Dockerized with docker-compose (MongoDB + API).

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

- **`models/`** — Mongoose schemas. `Miniature` has embedded `variants` subdocuments. `ApiKey` stores API keys with owner and active status.
- **`controllers/`** — Route handlers wrapped in `catchAsync`. `errorController` is the global Express error handler.
- **`routers/`** — Express routers mounted at `/api/keys` and `/api/miniatures`.
- **`middleware/`** — `authenticateApiKey` validates the `x-api-key` header against the ApiKey collection.
- **`configs/`** — Static data: `miniCategoryAbbreviations` (category → 2-letter code map) and `miniSizes` (valid size enum array).
- **`utils/`** — `AppError` (operational error class), `catchAsync` (async error wrapper), `generateApiKey` (crypto random hex), `productCode` (generates `M-{CAT}-{NNNN}` codes), `validation` (safeNumber helper).
- **`docker/`** — `mongo-init.js` creates the non-root MongoDB app user on container init.
- **`app_data/`** — Mounted as `/app/uploads` in the Docker container for image storage.

### Data Model

**Miniature** — `baseName`, `category` (enum validated against `miniCategoryAbbreviations` keys), `variants[]` (embedded subdocs with `name`, `size`, `productCode`, `fileName`, `images[]`, `thumbnail`, `price{cost, wholesale, msrp}`). Collection name: `Miniatures`.

**ApiKey** — `key` (unique hex string), `owner` (email or "master"), `isActive`, `createdAt`. Collection name: `ApiKeys`.

### Product Code Format

Product codes follow `M-{XX}-{NNNN}` where `XX` is the 2-letter category abbreviation and `NNNN` is a zero-padded sequential number per category. Generated in `utils/productCode.js` using counts from the database.

### API Authentication

Most endpoints (all miniature routes) require an `x-api-key` header. The first POST to `/api/keys` creates a master key (no body required); subsequent calls require an `owner` field.

### Error Handling Pattern

Controllers use `catchAsync` wrapper + `AppError` class. Throw `new AppError(message, statusCode)` for operational errors; the global error handler in `errorController.js` serializes them to `{ status, message }`.

## Environment Variables

Defined in `.env` (gitignored), see `example.env` for template: `MONGO_URI`, `PORT`, `MONGO_INITDB_ROOT_USERNAME`, `MONGO_INITDB_ROOT_PASSWORD`, `MONGO_INITDB_DATABASE`, `MONGO_APP_USER`, `MOGNO_APP_PASSWORD` (note: typo exists in example.env).
