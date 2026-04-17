# API Documentation

MieTech Product Catalog RESTful API

Base URL: `http://localhost:<PORT>/api`

---

## Contents

### API Keys
- [1. Create API Key](#1-create-api-key) — `POST /api/keys`
- [2. Get API Key by Owner](#2-get-api-key-by-owner) — `GET /api/keys`
- [3. Validate API Key](#3-validate-api-key) — `POST /api/keys/validate`

### Authentication
- [4. Create Admin](#4-create-admin) — `POST /api/users/admin` *(API Key or Admin JWT)*
- [5. Retailer Signup](#5-retailer-signup) — `POST /api/users/retailer`
- [6. Login](#6-login) — `POST /api/users/login`

### Users
- [7. Get My Profile](#7-get-my-profile) — `GET /api/users/me`
- [8. Update My Profile](#8-update-my-profile) — `PATCH /api/users/me`
- [9. Update My Password](#9-update-my-password) — `PATCH /api/users/me/password`
- [10. Get Pending Retailers](#10-get-pending-retailers) — `GET /api/users/retailers/pending` *(API Key or Admin JWT)*
- [11. Get Approved Retailers](#11-get-approved-retailers) — `GET /api/users/retailers/approved` *(API Key or Admin JWT)*
- [12. Approve Retailer](#12-approve-retailer) — `PATCH /api/users/retailers/:id/approve` *(API Key or Admin JWT)*
- [13. Reject Retailer](#13-reject-retailer) — `PATCH /api/users/retailers/:id/reject` *(API Key or Admin JWT)*

### Miniatures
- [14. List All Miniatures](#14-list-all-miniatures) — `GET /api/miniatures`
- [15. Search Miniatures](#15-search-miniatures) — `GET /api/miniatures/search` *(API Key or Admin JWT)*
- [16. Get Miniature by Product Code](#16-get-miniature-by-product-code) — `GET /api/miniatures/:productCode` *(API Key or Admin JWT)*
- [17. Create Miniature](#17-create-miniature) — `POST /api/miniatures` *(API Key or Admin JWT)*
- [18. Update Miniature Variant](#18-update-miniature-variant) — `PATCH /api/miniatures/:productCode` *(API Key or Admin JWT)*
- [19. Add Variant to Miniature](#19-add-variant-to-miniature) — `POST /api/miniatures/:productCode/variants` *(API Key or Admin JWT)*
- [20. Upload Variant Images](#20-upload-variant-images) — `POST /api/miniatures/:productCode/images` *(API Key or Admin JWT)*
- [21. Delete Variant Image](#21-delete-variant-image) — `DELETE /api/miniatures/:productCode/images/:imageKey` *(API Key or Admin JWT)*

### Orders
- [22. Create Order](#22-create-order) — `POST /api/orders`
- [23. Get Unfulfilled Orders](#23-get-unfulfilled-orders) — `GET /api/orders/unfulfilled` *(API Key or Admin JWT)*
- [24. Get Order by ID](#24-get-order-by-id) — `GET /api/orders/:id` *(API Key or Admin JWT)*

---

## Authentication Overview

Most write endpoints and all admin-facing read endpoints require authentication via one of two mechanisms:

| Method | Header | Who Uses It |
|---|---|---|
| API Key | `x-api-key: <key>` | Server-to-server, internal tooling |
| Bearer JWT | `Authorization: Bearer <token>` | Logged-in users (admin, retailer, consumer) |

Endpoints marked *(API Key or Admin JWT)* accept either. Bearer JWT endpoints that are not marked this way accept any valid JWT (any account type).

---

## API Key Endpoints

### 1. Create API Key

**Method:** `POST`
**Route:** `/api/keys`
**Authentication:** None

**Use Case:**
On first call (no master key exists yet), creates the master API key with no body required. On all subsequent calls, creates a key for the specified owner email.

**Request Body (first call):** None required.

**Request Body (subsequent calls):**
```json
{
    "owner": "user@example.com"
}
```

**Required Fields (subsequent calls):**
- `owner` — Email address or identifier for the key owner.

**Success Response (201 Created):**
```json
{
    "message": "API Key created",
    "key": "a1b2c3d4e5f6..."
}
```

**Error Responses:**

- **400 Bad Request** — Missing `owner` field after master key exists.
  ```json
  {
      "status": "fail",
      "message": "An 'owner' field is required in the request body (e.g. an email address)."
  }
  ```

- **409 Conflict** — A key for that owner already exists.
  ```json
  {
      "status": "fail",
      "message": "API Key for owner user@example.com already exists."
  }
  ```

---

### 2. Get API Key by Owner

**Method:** `GET`
**Route:** `/api/keys`
**Authentication:** None

**Use Case:**
Retrieves the API key for a given owner. Cannot be used to retrieve the master key.

**Query Parameters:**
| Parameter | Required | Description |
|---|---|---|
| `owner` | Yes | The owner email to look up. |

**Success Response (200 OK):**
```json
{
    "message": "API Key for owner user@example.com",
    "key": "a1b2c3d4e5f6..."
}
```

**Error Responses:**

- **400 Bad Request** — Missing `owner` query parameter.
  ```json
  {
      "status": "fail",
      "message": "Owner info is required."
  }
  ```

- **403 Forbidden** — Attempted to retrieve the master key.
  ```json
  {
      "status": "fail",
      "message": "Cannot retrieve master key directly."
  }
  ```

- **404 Not Found** — No key found for that owner.
  ```json
  {
      "status": "fail",
      "message": "No API Key found for owner user@example.com."
  }
  ```

---

### 3. Validate API Key

**Method:** `POST`
**Route:** `/api/keys/validate`
**Authentication:** None

**Use Case:**
Checks whether a given API key is valid and active without performing any other action. Useful for client-side key verification before making authenticated requests.

**Headers:**
| Header | Required | Description |
|---|---|---|
| `x-api-key` | Yes | The API key to validate. |

**Success Response (200 OK):**
```json
{
    "valid": true,
    "message": "API key is valid."
}
```

**Error Responses:**

- **400 Bad Request** — No API key provided in header.
  ```json
  {
      "status": "fail",
      "message": "API key is required in the x-api-key header."
  }
  ```

- **403 Forbidden** — Key not found or inactive.
  ```json
  {
      "valid": false,
      "message": "Invalid API key."
  }
  ```

---

## Authentication Endpoints

### 4. Create Admin

**Method:** `POST`
**Route:** `/api/users/admin`
**Authentication:** API Key or Admin JWT

**Use Case:**
Creates a new admin user account. Returns a JWT token on success so the new admin can immediately begin making authenticated requests.

**Request Body:**
```json
{
    "email": "admin@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "password": "SecurePass1!"
}
```

**Required Fields:**
- `email` — Must be unique.
- `firstName`
- `lastName`
- `password` — Min 8 characters. Must contain at least one uppercase letter, one lowercase letter, and one number or special character.

**Success Response (201 Created):**
```json
{
    "status": "success",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "data": {
        "user": {
            "id": "507f1f77bcf86cd799439011",
            "email": "admin@example.com",
            "firstName": "Jane",
            "lastName": "Doe",
            "accountType": "admin",
            "accountStatus": "active",
            "createdAt": "2026-04-17T00:00:00.000Z"
        }
    }
}
```

**Error Responses:**

- **400 Bad Request** — Missing required fields.
  ```json
  {
      "status": "fail",
      "message": "Please provide email, firstName, lastName, and password."
  }
  ```

- **400 Bad Request** — Weak password.
  ```json
  {
      "status": "fail",
      "message": "Password must contain at least one uppercase letter, one lowercase letter, and one number or special character."
  }
  ```

- **409 Conflict** — Email already in use.
  ```json
  {
      "status": "fail",
      "message": "A user with this email already exists."
  }
  ```

---

### 5. Retailer Signup

**Method:** `POST`
**Route:** `/api/users/retailer`
**Authentication:** None (Public)

**Use Case:**
Registers a new retailer account. The account is created with `accountStatus: pending` and must be approved by an admin before the retailer can log in.

**Request Body:**
```json
{
    "email": "shop@example.com",
    "firstName": "John",
    "lastName": "Smith",
    "merchantName": "Smith's Game Shop",
    "password": "SecurePass1!"
}
```

**Required Fields:**
- `email` — Must be unique.
- `firstName`
- `lastName`
- `merchantName` — The retailer's business or store name.
- `password` — Min 8 characters. Must contain at least one uppercase letter, one lowercase letter, and one number or special character.

**Special Notes:**
- New retailer accounts are created with `accountStatus: pending`.
- The retailer cannot log in until an admin approves the account.

**Success Response (201 Created):**
```json
{
    "status": "success",
    "data": {
        "user": {
            "id": "507f1f77bcf86cd799439011",
            "email": "shop@example.com",
            "firstName": "John",
            "lastName": "Smith",
            "merchantName": "Smith's Game Shop",
            "accountType": "retailer",
            "accountStatus": "pending",
            "createdAt": "2026-04-17T00:00:00.000Z"
        }
    }
}
```

**Error Responses:**

- **400 Bad Request** — Missing required fields.
  ```json
  {
      "status": "fail",
      "message": "Please provide email, firstName, lastName, merchantName, and password."
  }
  ```

- **409 Conflict** — Email already in use.
  ```json
  {
      "status": "fail",
      "message": "A user with this email already exists."
  }
  ```

---

### 6. Login

**Method:** `POST`
**Route:** `/api/users/login`
**Authentication:** None (Public)

**Use Case:**
Authenticates an existing user and returns a JWT token for use in subsequent requests. Blocked for retailer accounts that are pending or rejected.

**Request Body:**
```json
{
    "email": "user@example.com",
    "password": "SecurePass1!"
}
```

**Required Fields:**
- `email`
- `password`

**Success Response (200 OK):**
```json
{
    "status": "success",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "data": {
        "user": {
            "id": "507f1f77bcf86cd799439011",
            "email": "user@example.com",
            "firstName": "John",
            "lastName": "Smith",
            "accountType": "retailer",
            "accountStatus": "active"
        }
    }
}
```

**Error Responses:**

- **400 Bad Request** — Missing credentials.
  ```json
  {
      "status": "fail",
      "message": "Please provide email and password."
  }
  ```

- **401 Unauthorized** — Invalid email or password.
  ```json
  {
      "status": "fail",
      "message": "Invalid email or password."
  }
  ```

- **403 Forbidden** — Retailer account is pending or rejected.
  ```json
  {
      "status": "fail",
      "message": "Your retailer account is pending approval."
  }
  ```

---

## User Endpoints

### 7. Get My Profile

**Method:** `GET`
**Route:** `/api/users/me`
**Authentication:** Bearer JWT (any account type)

**Use Case:**
Returns the profile of the currently authenticated user. Requires a Bearer token — API keys are not linked to user accounts.

**Success Response (200 OK):**
```json
{
    "status": "success",
    "data": {
        "user": {
            "id": "507f1f77bcf86cd799439011",
            "email": "user@example.com",
            "firstName": "John",
            "lastName": "Smith",
            "accountType": "retailer",
            "accountStatus": "active",
            "merchantName": "Smith's Game Shop",
            "createdAt": "2026-04-17T00:00:00.000Z"
        }
    }
}
```

**Error Responses:**

- **401 Unauthorized** — No Bearer token provided.
  ```json
  {
      "status": "fail",
      "message": "This endpoint requires a Bearer token. API keys are not linked to user accounts."
  }
  ```

---

### 8. Update My Profile

**Method:** `PATCH`
**Route:** `/api/users/me`
**Authentication:** Bearer JWT (any account type)

**Use Case:**
Updates profile fields for the currently authenticated user. Cannot be used to change password, account type, or account status.

**Request Body (all fields optional):**
```json
{
    "firstName": "Jonathan",
    "lastName": "Smith",
    "email": "new@example.com",
    "merchantName": "Smith's Miniature Emporium"
}
```

**Special Notes:**
- `password`, `accountType`, and `accountStatus` cannot be updated via this endpoint.
- If `email` is changed, it must not already be in use by another account.

**Success Response (200 OK):**
```json
{
    "status": "success",
    "data": {
        "user": {
            "id": "507f1f77bcf86cd799439011",
            "email": "new@example.com",
            "firstName": "Jonathan",
            "lastName": "Smith",
            "merchantName": "Smith's Miniature Emporium",
            "accountType": "retailer",
            "accountStatus": "active"
        }
    }
}
```

**Error Responses:**

- **400 Bad Request** — Attempted to update a restricted field.
  ```json
  {
      "status": "fail",
      "message": "This endpoint cannot be used to update password, accountType, or accountStatus."
  }
  ```

- **409 Conflict** — Email already in use.
  ```json
  {
      "status": "fail",
      "message": "A user with this email already exists."
  }
  ```

---

### 9. Update My Password

**Method:** `PATCH`
**Route:** `/api/users/me/password`
**Authentication:** Bearer JWT (any account type)

**Use Case:**
Changes the password for the currently authenticated user. Requires the current password for verification. Returns a new JWT token on success.

**Request Body:**
```json
{
    "currentPassword": "OldPass1!",
    "newPassword": "NewPass2@"
}
```

**Required Fields:**
- `currentPassword`
- `newPassword` — Must meet the same password requirements as signup.

**Success Response (200 OK):**
```json
{
    "status": "success",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "data": {
        "user": { ... }
    }
}
```

**Error Responses:**

- **400 Bad Request** — Missing fields.
  ```json
  {
      "status": "fail",
      "message": "Please provide currentPassword and newPassword."
  }
  ```

- **401 Unauthorized** — Current password is incorrect.
  ```json
  {
      "status": "fail",
      "message": "Current password is incorrect."
  }
  ```

---

### 10. Get Pending Retailers

**Method:** `GET`
**Route:** `/api/users/retailers/pending`
**Authentication:** API Key or Admin JWT

**Use Case:**
Returns all retailer accounts with `accountStatus: pending`. Used by admins to review and action new retailer applications.

**Success Response (200 OK):**
```json
{
    "status": "success",
    "results": 2,
    "data": {
        "retailers": [
            {
                "id": "507f1f77bcf86cd799439011",
                "email": "shop@example.com",
                "firstName": "John",
                "lastName": "Smith",
                "merchantName": "Smith's Game Shop",
                "accountType": "retailer",
                "accountStatus": "pending",
                "createdAt": "2026-04-17T00:00:00.000Z"
            }
        ]
    }
}
```

---

### 11. Get Approved Retailers

**Method:** `GET`
**Route:** `/api/users/retailers/approved`
**Authentication:** API Key or Admin JWT

**Use Case:**
Returns all retailer accounts with `accountStatus: active`.

**Success Response (200 OK):**
```json
{
    "status": "success",
    "results": 5,
    "data": {
        "retailers": [ ... ]
    }
}
```

---

### 12. Approve Retailer

**Method:** `PATCH`
**Route:** `/api/users/retailers/:id/approve`
**Authentication:** API Key or Admin JWT

**Use Case:**
Sets a pending retailer account to active, allowing the retailer to log in. Records the `approvedDate` timestamp.

**URL Parameters:**
| Parameter | Description |
|---|---|
| `id` | The MongoDB ObjectId of the retailer user. |

**Success Response (200 OK):**
```json
{
    "status": "success",
    "data": {
        "user": {
            "id": "507f1f77bcf86cd799439011",
            "accountStatus": "active",
            "approvedDate": "2026-04-17T00:00:00.000Z"
        }
    }
}
```

**Error Responses:**

- **400 Bad Request** — User is not a retailer, or account is already active.
  ```json
  {
      "status": "fail",
      "message": "This retailer account is already active."
  }
  ```

- **404 Not Found** — No user found with that ID.
  ```json
  {
      "status": "fail",
      "message": "No user found with that ID."
  }
  ```

---

### 13. Reject Retailer

**Method:** `PATCH`
**Route:** `/api/users/retailers/:id/reject`
**Authentication:** API Key or Admin JWT

**Use Case:**
Sets a pending retailer account to rejected. Only accounts with `accountStatus: pending` can be rejected.

**URL Parameters:**
| Parameter | Description |
|---|---|
| `id` | The MongoDB ObjectId of the retailer user. |

**Success Response (200 OK):**
```json
{
    "status": "success",
    "data": {
        "user": {
            "id": "507f1f77bcf86cd799439011",
            "accountStatus": "rejected"
        }
    }
}
```

**Error Responses:**

- **400 Bad Request** — User is not a retailer, or account is not in pending status.
  ```json
  {
      "status": "fail",
      "message": "Only pending retailer accounts can be rejected."
  }
  ```

- **404 Not Found** — No user found with that ID.
  ```json
  {
      "status": "fail",
      "message": "No user found with that ID."
  }
  ```

---

## Miniature Endpoints

Product codes follow the format `M-{XX}-{NNNN}` where `XX` is the two-letter category abbreviation and `NNNN` is a zero-padded sequential number per category.

**Valid Categories:**
| Category | Code |
|---|---|
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

**Valid Sizes:** `Tiny`, `Small`, `Medium`, `Large`, `Huge`, `Gargantuan`

---

### 14. List All Miniatures

**Method:** `GET`
**Route:** `/api/miniatures`
**Authentication:** None (Public) — pricing visibility varies by auth level.

**Use Case:**
Returns a paginated, flattened list of all variants sorted by product code. This is the primary catalog browsing endpoint. Authentication is optional but affects which price fields are included in the response.

**Pricing by Auth Level:**
| Auth | Price Fields Returned |
|---|---|
| Anonymous | `msrp` only |
| Retailer JWT | `msrp`, `wholesale` |
| API Key or Admin JWT | `msrp`, `wholesale`, `cost` |

**Query Parameters:**
| Parameter | Default | Description |
|---|---|---|
| `page` | `1` | Page number. |
| `limit` | `50` | Items per page. |
| `category` | — | Filter by category (e.g. `Dragon`). |
| `size` | — | Filter by size (e.g. `Huge`). |
| `minPrice` | — | Minimum MSRP filter. |
| `maxPrice` | — | Maximum MSRP filter. |
| `hasVariants` | — | If `true`, only returns miniatures with 2 or more variants. |

**Success Response (200 OK):**
```json
{
    "page": 1,
    "totalPages": 1,
    "totalItems": 3,
    "items": [
        {
            "productCode": "M-DR-0001",
            "baseName": "Ancient Red Dragon",
            "name": "Ancient Red Dragon, Full Wing",
            "description": "Wings spread wide, head reared back mid-roar.",
            "variantDescription": "Wings fully extended, standing atop a rocky crag base.",
            "size": "Gargantuan",
            "category": "Dragon",
            "images": {},
            "msrp": 45.00
        }
    ]
}
```

**Error Responses:**

- **400 Bad Request** — Invalid category or size value.
  ```json
  {
      "status": "fail",
      "message": "Invalid category: Goblinoid. Valid categories: Aberration, Beast, ..."
  }
  ```

---

### 15. Search Miniatures

**Method:** `GET`
**Route:** `/api/miniatures/search`
**Authentication:** API Key or Admin JWT

**Use Case:**
Full-text search across miniature names, base names, and descriptions. Results are ranked by relevance score. Weights: `baseName` (10), `variants.name` (8), `description` (5), `variants.description` (3).

**Query Parameters:**
| Parameter | Required | Default | Description |
|---|---|---|---|
| `q` | Yes | — | Search query string. |
| `page` | No | `1` | Page number. |
| `limit` | No | `50` | Items per page. |

**Success Response (200 OK):**
```json
{
    "page": 1,
    "totalPages": 1,
    "totalItems": 2,
    "items": [
        {
            "productCode": "M-DR-0001",
            "name": "Ancient Red Dragon, Full Wing",
            "size": "Gargantuan",
            "category": "Dragon",
            "thumbnail": null,
            "images": {},
            "cost": 8.50,
            "wholesale": 22.00,
            "msrp": 45.00
        }
    ]
}
```

**Error Responses:**

- **400 Bad Request** — Missing search query.
  ```json
  {
      "status": "fail",
      "message": "Search query parameter \"q\" is required"
  }
  ```

---

### 16. Get Miniature by Product Code

**Method:** `GET`
**Route:** `/api/miniatures/:productCode`
**Authentication:** API Key or Admin JWT

**Use Case:**
Returns full details for a single variant identified by its product code.

**URL Parameters:**
| Parameter | Description |
|---|---|
| `productCode` | The variant product code (e.g. `M-DR-0001`). |

**Success Response (200 OK):**
```json
{
    "productCode": "M-DR-0001",
    "name": "Ancient Red Dragon, Full Wing",
    "size": "Gargantuan",
    "category": "Dragon",
    "thumbnail": null,
    "images": {
        "0": "http://localhost:8001/uploads/M-DR-0001-1234567890.jpg"
    },
    "cost": 8.50,
    "wholesale": 22.00,
    "msrp": 45.00
}
```

**Error Responses:**

- **404 Not Found** — No miniature found with that product code.
  ```json
  {
      "status": "fail",
      "message": "No miniature found with product code: M-DR-9999"
  }
  ```

---

### 17. Create Miniature

**Method:** `POST`
**Route:** `/api/miniatures`
**Authentication:** API Key or Admin JWT

**Use Case:**
Creates a new miniature with one or more variants. Product codes are auto-generated sequentially per category and cannot be manually specified.

**Request Body:**
```json
{
    "baseName": "Silver Dragon",
    "description": "A noble dragon with shimmering silver scales.",
    "category": "Dragon",
    "variants": [
        {
            "name": "Wyrmling",
            "description": "Juvenile form, wings folded, curious expression.",
            "size": "Medium",
            "fileName": "silver_dragon_wyrmling.stl",
            "price": {
                "cost": 2.00,
                "wholesale": 5.00,
                "msrp": 10.00
            }
        }
    ]
}
```

**Required Fields:**
- `baseName`
- `category` — Must be a valid category from the table above.
- `variants` — Non-empty array. Each variant requires:
  - `name`
  - `size` — Must be a valid size.
  - `fileName` — STL filename reference.

**Optional Fields:**
- `description` — Top-level miniature description.
- `variants[].description`
- `variants[].price.cost`
- `variants[].price.wholesale`
- `variants[].price.msrp`

**Success Response (201 Created):** The full miniature document with all variants and auto-generated product codes.

**Error Responses:**

- **400 Bad Request** — Invalid category, invalid variant size, or empty variants array.
  ```json
  {
      "status": "fail",
      "message": "Invalid size 'Colossal' on variant 'Wyrmling'. Valid sizes: Tiny, Small, Medium, Large, Huge, Gargantuan"
  }
  ```

---

### 18. Update Miniature Variant

**Method:** `PATCH`
**Route:** `/api/miniatures/:productCode`
**Authentication:** API Key or Admin JWT

**Use Case:**
Updates one or more fields on a specific variant. Supports partial updates. The product code itself cannot be changed.

**URL Parameters:**
| Parameter | Description |
|---|---|
| `productCode` | The product code of the variant to update. |

**Request Body (all fields optional):**
```json
{
    "name": "Full Wing — Revised",
    "size": "Gargantuan",
    "fileName": "ancient_red_dragon_v2.stl",
    "thumbnail": "http://localhost:8001/uploads/thumb.jpg",
    "price": {
        "cost": 9.00,
        "wholesale": 23.00,
        "msrp": 47.00
    }
}
```

**Success Response (200 OK):**
```json
{
    "message": "Miniature updated successfully",
    "miniature": { ... }
}
```

**Error Responses:**

- **400 Bad Request** — Invalid size value.
  ```json
  {
      "status": "fail",
      "message": "Invalid size: Colossal"
  }
  ```

- **404 Not Found** — No miniature found with that product code.
  ```json
  {
      "status": "fail",
      "message": "No miniature found with product code: M-DR-9999"
  }
  ```

---

### 19. Add Variant to Miniature

**Method:** `POST`
**Route:** `/api/miniatures/:productCode/variants`
**Authentication:** API Key or Admin JWT

**Use Case:**
Adds a new variant to an existing miniature document. The new variant's product code is auto-generated based on the miniature's category.

**URL Parameters:**
| Parameter | Description |
|---|---|
| `productCode` | The product code of any existing variant on the target miniature. |

**Request Body:**
```json
{
    "name": "Ancient — Wingless",
    "description": "Grounded pose with wings furled tightly.",
    "size": "Large",
    "fileName": "ancient_red_dragon_wingless.stl",
    "price": {
        "cost": 6.00,
        "wholesale": 15.00,
        "msrp": 30.00
    }
}
```

**Required Fields:**
- `name`
- `size` — Must be a valid size.
- `fileName`

**Optional Fields:**
- `description`
- `price.cost`, `price.wholesale`, `price.msrp`

**Success Response (201 Created):**
```json
{
    "productCode": "M-DR-0003",
    "name": "Ancient Red Dragon, Ancient — Wingless",
    "size": "Large",
    "category": "Dragon",
    "thumbnail": null,
    "images": {},
    "cost": 6.00,
    "wholesale": 15.00,
    "msrp": 30.00
}
```

**Error Responses:**

- **400 Bad Request** — Missing required fields or invalid size.
  ```json
  {
      "status": "fail",
      "message": "Invalid or missing size. Valid sizes: Tiny, Small, Medium, Large, Huge, Gargantuan"
  }
  ```

- **404 Not Found** — No miniature found with that product code.
  ```json
  {
      "status": "fail",
      "message": "No miniature found with product code: M-DR-9999"
  }
  ```

---

### 20. Upload Variant Images

**Method:** `POST`
**Route:** `/api/miniatures/:productCode/images`
**Authentication:** API Key or Admin JWT
**Content-Type:** `multipart/form-data`

**Use Case:**
Uploads one or more images for a specific variant. Images are stored on disk and their URLs are added to the variant's image map with auto-incremented integer keys.

**URL Parameters:**
| Parameter | Description |
|---|---|
| `productCode` | The product code of the target variant. |

**Form Fields:**
| Field | Type | Description |
|---|---|---|
| `images` | File(s) | One or more image files. Max 10 per request. |

**Constraints:**
- Allowed formats: JPEG, JPG, PNG, GIF, WEBP
- Max file size: 10 MB per file
- Max files per request: 10

**Example (curl):**
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -F "images=@photo1.jpg" \
  -F "images=@photo2.jpg" \
  http://localhost:8001/api/miniatures/M-DR-0001/images
```

**Success Response (201 Created):**
```json
{
    "message": "2 image(s) uploaded successfully",
    "uploaded": [
        { "imageKey": "0", "imageUrl": "http://localhost:8001/uploads/M-DR-0001-1234567890.jpg" },
        { "imageKey": "1", "imageUrl": "http://localhost:8001/uploads/M-DR-0001-1234567891.png" }
    ],
    "images": {
        "0": "http://localhost:8001/uploads/M-DR-0001-1234567890.jpg",
        "1": "http://localhost:8001/uploads/M-DR-0001-1234567891.png"
    }
}
```

**Error Responses:**

- **400 Bad Request** — No files provided or invalid file type.
  ```json
  {
      "status": "fail",
      "message": "Only jpeg, jpg, png, gif, and webp files are allowed"
  }
  ```

- **404 Not Found** — No miniature found with that product code.
  ```json
  {
      "status": "fail",
      "message": "No miniature found with product code: M-DR-9999"
  }
  ```

---

### 21. Delete Variant Image

**Method:** `DELETE`
**Route:** `/api/miniatures/:productCode/images/:imageKey`
**Authentication:** API Key or Admin JWT

**Use Case:**
Deletes a single image from a variant by its image map key. Removes the file from disk and the entry from the variant's image map.

**URL Parameters:**
| Parameter | Description |
|---|---|
| `productCode` | The product code of the target variant. |
| `imageKey` | The integer key of the image to delete (e.g. `0`, `1`). |

**Success Response (200 OK):**
```json
{
    "message": "Image deleted successfully",
    "deletedKey": "0",
    "images": {}
}
```

**Error Responses:**

- **404 Not Found** — No miniature or image found with those identifiers.
  ```json
  {
      "status": "fail",
      "message": "No image found with key: 3"
  }
  ```

---

## Order Endpoints

### 22. Create Order

**Method:** `POST`
**Route:** `/api/orders`
**Authentication:** Bearer JWT (retailer or consumer only)

**Use Case:**
Places a new order for one or more miniature variants. Admin accounts cannot place orders. Unit costs are determined automatically by account type — retailers are charged wholesale price, consumers are charged MSRP.

**Request Body:**
```json
{
    "items": [
        { "productCode": "M-DR-0001", "quantity": 2 },
        { "productCode": "M-HU-0001", "quantity": 5 }
    ]
}
```

**Required Fields:**
- `items` — Non-empty array. Each item requires:
  - `productCode` — Must reference an existing variant.
  - `quantity` — Must be a positive integer.

**Special Notes:**
- Retailer accounts are billed at `wholesale` price per unit.
- Consumer accounts are billed at `msrp` price per unit.
- Admin accounts receive a 400 error.
- API keys cannot place orders — a Bearer JWT is required.

**Success Response (201 Created):**
```json
{
    "status": "success",
    "data": {
        "order": {
            "id": "507f1f77bcf86cd799439099",
            "userId": "507f1f77bcf86cd799439011",
            "name": "Smith's Game Shop",
            "accountType": "retailer",
            "items": [
                {
                    "miniatureId": "507f1f77bcf86cd799439022",
                    "productCode": "M-DR-0001",
                    "quantity": 2,
                    "unitCost": 22.00,
                    "totalCost": 44.00
                }
            ],
            "totalOrderCost": 44.00,
            "createdAt": "2026-04-17T00:00:00.000Z",
            "invoicePaidDate": null,
            "fulfillmentDate": null
        }
    }
}
```

**Error Responses:**

- **400 Bad Request** — Admin account attempted to order, or empty items array, or missing fields.
  ```json
  {
      "status": "fail",
      "message": "Admin accounts cannot place orders."
  }
  ```

- **401 Unauthorized** — No Bearer token provided.
  ```json
  {
      "status": "fail",
      "message": "This endpoint requires a Bearer token. API keys are not linked to user accounts."
  }
  ```

- **404 Not Found** — Invalid product code in items.
  ```json
  {
      "status": "fail",
      "message": "No miniature found with product code: M-DR-9999"
  }
  ```

---

### 23. Get Unfulfilled Orders

**Method:** `GET`
**Route:** `/api/orders/unfulfilled`
**Authentication:** API Key or Admin JWT

**Use Case:**
Returns all orders that have not yet been fulfilled (`fulfillmentDate` is null), sorted oldest first. Paginated.

**Query Parameters:**
| Parameter | Default | Description |
|---|---|---|
| `page` | `1` | Page number. |
| `limit` | `20` | Items per page. |

**Success Response (200 OK):**
```json
{
    "status": "success",
    "page": 1,
    "totalPages": 1,
    "totalItems": 3,
    "data": {
        "orders": [
            {
                "id": "507f1f77bcf86cd799439099",
                "name": "Smith's Game Shop",
                "accountType": "retailer",
                "totalOrderCost": 44.00,
                "createdAt": "2026-04-17T00:00:00.000Z",
                "fulfillmentDate": null
            }
        ]
    }
}
```

---

### 24. Get Order by ID

**Method:** `GET`
**Route:** `/api/orders/:id`
**Authentication:** API Key or Admin JWT

**Use Case:**
Returns the full details of a single order by its MongoDB ObjectId.

**URL Parameters:**
| Parameter | Description |
|---|---|
| `id` | The MongoDB ObjectId of the order. |

**Success Response (200 OK):**
```json
{
    "status": "success",
    "data": {
        "order": {
            "id": "507f1f77bcf86cd799439099",
            "userId": "507f1f77bcf86cd799439011",
            "name": "Smith's Game Shop",
            "accountType": "retailer",
            "items": [
                {
                    "miniatureId": "507f1f77bcf86cd799439022",
                    "productCode": "M-DR-0001",
                    "quantity": 2,
                    "unitCost": 22.00,
                    "totalCost": 44.00
                }
            ],
            "totalOrderCost": 44.00,
            "createdAt": "2026-04-17T00:00:00.000Z",
            "invoicePaidDate": null,
            "fulfillmentDate": null
        }
    }
}
```

**Error Responses:**

- **404 Not Found** — No order found with that ID.
  ```json
  {
      "status": "fail",
      "message": "No order found with that ID."
  }
  ```
