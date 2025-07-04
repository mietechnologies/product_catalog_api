# MieTech Product Catalog API

A Node.js, Express, and MongoDB API for managing and cataloging 3D prints (at the moment only Table Top miniatures) with variant support, image uploads, and pricing metadata. The application is containerized with Docker for portability and ease of deployment.

## Features
- API Key generation and validation
- Miniature product management
  - Variants with unique product codes
  - Category-based indexing and size enums
  - Structured pricing (cost, wholesale, MSRP)
- Image upload support via `multer` (coming soon)
- Environment-based configuration
- Dockerized deployment

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

## Using the API

Use Thunder Client (VS Code), Postman, Insomnia, or curl to test endpoints.

You can access the API locally with the following:

```
http://localhost:3000/api/<endpoint>
```

>Its worth noting, you will need to use the port number you outlined in the `.env` file. 3000 is the default if a port isn't found or is an invalid input.

#### First Steps

Many of endpoints are protected by an API Key. So, the first thing you need to do is make a `POST` request to the endpoint: `http://localhost:3000/api/keys`. For the first time this endpoint is called, no input is required and it will create a Master API Key. However, any subsequent calls will require an `owner` field passed in the body of the request, this should be an email address. (Validation for the the owner field is not currently implemented, and this will probably evolve over time)

When making a call to the API, you will need to use your API Key. The API Key needs to be input in a header field with the key of `x-api-key`. If an endpoint is protected and an API Key isn't used, you will receive an error.

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