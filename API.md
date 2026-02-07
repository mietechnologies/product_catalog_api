# API Reference

Base URL: `http://localhost:<PORT>/api`

All endpoints (except API key creation and static image files) require the `x-api-key` header.

---

## API Keys

### Create API Key

```
POST /api/keys
```

**Authentication:** None required for the first call (creates the master key). Subsequent calls do not require the `x-api-key` header either, but do require a body.

**Body (first call):** None required.

**Body (subsequent calls):**
```json
{
    "owner": "user@example.com"
}
```

**Response (201):**
```json
{
    "message": "API Key created",
    "key": "a1b2c3d4..."
}
```

**Errors:**
| Status | Condition |
|--------|-----------|
| 400 | Missing `owner` field (after master key exists) |
| 409 | An API key for that `owner` already exists |

---

### Get API Key by Owner

```
GET /api/keys?owner=user@example.com
```

**Authentication:** None required.

**Query Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `owner` | Yes | The owner email to look up |

**Response (200):**
```json
{
    "message": "API Key for owner user@example.com",
    "key": "a1b2c3d4..."
}
```

**Errors:**
| Status | Condition |
|--------|-----------|
| 400 | Missing `owner` query parameter |
| 403 | Attempted to retrieve the master key |
| 404 | No API key found for that owner |

---

## Miniatures

All miniature endpoints require the `x-api-key` header.

### List All Miniatures

```
GET /api/miniatures?page=1&limit=20
```

Returns a paginated, flattened list of all variants sorted by product code.

**Query Parameters:**
| Parameter | Default | Description |
|-----------|---------|-------------|
| `page` | 1 | Page number |
| `limit` | 50 | Items per page |

**Response (200):**
```json
{
    "page": 1,
    "totalPages": 1,
    "totalItems": 4,
    "items": [
        {
            "productCode": "M-DR-0001",
            "name": "Silver Dragon, Wyrmling",
            "size": "Medium",
            "category": "Dragon",
            "thumbnail": null,
            "images": {},
            "cost": 1.78,
            "wholesale": 5.00,
            "msrp": 8.00
        }
    ]
}
```

---

### Get Miniature by Product Code

```
GET /api/miniatures/:productCode
```

**Example:** `GET /api/miniatures/M-DR-0001`

**Response (200):**
```json
{
    "productCode": "M-DR-0001",
    "name": "Silver Dragon, Wyrmling",
    "size": "Medium",
    "category": "Dragon",
    "thumbnail": null,
    "images": {
        "0": "http://localhost:3000/uploads/M-DR-0001-1738764000000.jpg"
    },
    "cost": 1.78,
    "wholesale": 5.00,
    "msrp": 8.00
}
```

**Errors:**
| Status | Condition |
|--------|-----------|
| 404 | No miniature found with that product code |

---

### Create Miniature

```
POST /api/miniatures
```

**Body:**
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
        }
    ]
}
```

Product codes are auto-generated in the format `M-{XX}-{NNNN}` where `XX` is the category abbreviation and `NNNN` is a zero-padded sequential number.

**Valid Categories:**
| Category | Code |
|----------|------|
| Aberration | AB |
| Beast | BE |
| Celestial | CE |
| Construct | CO |
| Dragon | DR |
| Elemental | EL |
| Fey | FE |
| Fiend | FI |
| Giant | GI |
| Humanoid | HU |
| Monstrosity | MO |
| Ooze | OZ |
| Plant | PL |
| Undead | UN |

**Valid Sizes:** Tiny, Small, Medium, Large, Huge, Gargantuan

**Response (201):** The created miniature document with all variants and generated product codes.

**Errors:**
| Status | Condition |
|--------|-----------|
| 400 | Invalid category, invalid size, or missing/empty variants array |

---

### Update Miniature Variant

```
PATCH /api/miniatures/:productCode
```

Updates fields on a specific variant. Supports partial updates for `name`, `size`, `fileName`, `thumbnail`, and nested `price` fields.

**Example:** `PATCH /api/miniatures/M-DR-0001`

**Body:**
```json
{
    "size": "Large",
    "price": {
        "msrp": 12.00
    }
}
```

**Response (200):**
```json
{
    "message": "Miniature updated successfully",
    "miniature": { ... }
}
```

**Errors:**
| Status | Condition |
|--------|-----------|
| 400 | Invalid size value |
| 404 | No miniature found with that product code |

---

### Upload Variant Images

```
POST /api/miniatures/:productCode/images
```

Upload one or more images for a variant. Accepts multipart form data.

**Content-Type:** `multipart/form-data`

**Form Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `images` | File(s) | One or more image files (max 10 per request) |

**Constraints:**
- Allowed formats: JPEG, JPG, PNG, GIF, WEBP
- Max file size: 10 MB per file
- Max files per request: 10

**Example:**
```bash
curl -X POST \
  -H "x-api-key: your-key" \
  -F "images=@photo1.jpg" \
  -F "images=@photo2.jpg" \
  http://localhost:3000/api/miniatures/M-DR-0001/images
```

**Response (201):**
```json
{
    "message": "2 image(s) uploaded successfully",
    "uploaded": [
        { "imageKey": "0", "imageUrl": "http://localhost:3000/uploads/M-DR-0001-1738764000000.jpg" },
        { "imageKey": "1", "imageUrl": "http://localhost:3000/uploads/M-DR-0001-1738764000001.png" }
    ],
    "images": {
        "0": "http://localhost:3000/uploads/M-DR-0001-1738764000000.jpg",
        "1": "http://localhost:3000/uploads/M-DR-0001-1738764000001.png"
    }
}
```

**Errors:**
| Status | Condition |
|--------|-----------|
| 400 | No files provided, or invalid file type |
| 404 | No miniature found with that product code |

---

### Delete Variant Image

```
DELETE /api/miniatures/:productCode/images/:imageKey
```

Deletes a single image by its key. Removes the file from disk and the entry from the variant's image map.

**Example:** `DELETE /api/miniatures/M-DR-0001/images/0`

**Response (200):**
```json
{
    "message": "Image deleted successfully",
    "deletedKey": "0",
    "images": {}
}
```

**Errors:**
| Status | Condition |
|--------|-----------|
| 404 | No miniature found with that product code, or no image with that key |

---

## Static Files

### View Uploaded Image

```
GET /uploads/:filename
```

Serves uploaded images directly. No authentication required.

**Example:** `http://localhost:3000/uploads/M-DR-0001-1738764000000.jpg`
