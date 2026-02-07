# MieTech Product Catalog API

A Node.js, Express, and MongoDB API for managing and cataloging 3D prints (at the moment only Table Top miniatures) with variant support, image uploads, and pricing metadata. The application is containerized with Docker for portability and ease of deployment.

## Features
- API Key generation and validation
- Miniature product management
  - Variants with unique product codes (`M-{XX}-{NNNN}` format)
  - Category-based indexing (14 categories) and size enums (Tiny through Gargantuan)
  - Structured pricing (cost, wholesale, MSRP)
- Multi-image upload and deletion per variant via `multer`
- Static file serving for uploaded images (no auth required)
- Environment-based configuration
- Dockerized deployment (MongoDB + API via docker-compose)

## Prerequisites
- [Docker](https://www.docker.com/) and Docker Compose
- [Node.js](https://nodejs.org/) (v18+ recommended, only needed for local development outside Docker)

## Environment Configuration Setup

1. Copy the `example.env` as a `.env` file in the root directory:
```ini
MONGO_INITDB_ROOT_USERNAME=<root_username>
MONGO_INITDB_ROOT_PASSWORD=<root_password>
MONGO_INITDB_DATABASE=<directory>
MONGO_APP_USER=<app_username>
MOGNO_APP_PASSWORD=<app_password>
MONGO_URI=mongodb://<root_username>:<root_password>@mongodb:27017/<directory>
PORT=<port_number>
```

2. Replace all of the placeholders with your choice of input. Ensure that the placeholders in the `MONGO_URI` match what you've used before, or the API will have issues connecting to the database.

3. Build the Docker container.

## Running with Docker

#### Build and Run
```bash
docker compose up --build
```

This will:
- Spin up the MongoDB database and auto-create the non-root API user
- Launch the API service

#### Tear Down
```bash
docker compose down -v
```
>-v ensures volumes are reset (fresh DB/user/init)

**!WARNING!** Do not use `-v` on the production instance of the project, this will wipe out all the stored images and the local MongoDB if its being used.

#### Updating the Docker Image

1. Stop the current Docker images:
```bash
docker compose down
```

2. Pull down the code changes:
```bash
git pull
```

3. Restart the Docker image:
```bash
docker compose up -d
```
>The `-d` flag runs the container in detached mode.

## Local Development (without Docker)

```bash
npm install
npm run start:dev
```

Requires a running MongoDB instance and `MONGO_URI` set in your `.env` file pointing to it.

## Using the API

Use Hoppscotch, Thunder Client (VS Code), Postman, Insomnia, or curl to test endpoints.

You can access the API locally at:

```
http://localhost:3000/api/<endpoint>
```

> You will need to use the port number you set in the `.env` file. 3000 is the default if a port isn't set or is an invalid input.

For the full list of endpoints, request/response shapes, and error codes, see the **[API Reference](API.md)**.

#### First Steps

Most endpoints are protected by an API Key. The first thing you need to do is make a `POST` request to `http://localhost:3000/api/keys`. The first time this endpoint is called, no input is required and it will create a Master API Key. Subsequent calls require an `owner` field in the body (this should be an email address).

When making calls to protected endpoints, include your API Key in the `x-api-key` header. If the header is missing or the key is invalid/inactive, you will receive a `401` or `403` error.

#### Creating a Miniature with Variants

Example Miniature:
```json
{
    "baseName": "Silver Dragon",
    "category": "Dragon",
    "variants": [
        {
            "name": "Wyrmling",
            "size": "Medium",
            "fileName": "wyrmling_silver_dragon.stl",
            "price": {
                "cost": 1.78,
                "wholesale": 5.00,
                "msrp": 8.00
            }
        },
        {
            "name": "Young",
            "size": "Large",
            "fileName": "young_silver_dragon.stl",
            "price": {
                "cost": 2.05,
                "wholesale": 6.00,
                "msrp": 10.00
            }
        },
        {
            "name": "Adult",
            "size": "Huge",
            "fileName": "adult_silver_dragon.stl",
            "price": {
                "cost": 2.67,
                "wholesale": 8.00,
                "msrp": 13.00
            }
        },
        {
            "name": "Ancient",
            "size": "Gargantuan",
            "fileName": "ancient_silver_dragon.stl",
            "price": {
                "cost": 3.32,
                "wholesale": 14.00,
                "msrp": 20.00
            }
        },
    ]
}
```

#### Uploading Images to a Variant

Once a miniature is created, you can upload images to any of its variants using the product code:

```bash
curl -X POST \
  -H "x-api-key: your-key" \
  -F "images=@front_view.jpg" \
  -F "images=@side_view.jpg" \
  http://localhost:3000/api/miniatures/M-DR-0001/images
```

Uploaded images are accessible without authentication at `http://localhost:3000/uploads/<filename>`.