# Treatment Plan API - Enhanced Enum Validation

This project implements an improved treatment plan API with comprehensive enum validation and user-friendly error messages.

## Problem Solved

Previously, the API would throw cryptic Prisma errors when invalid enum values were provided:

```json
{
  "statusCode": 500,
  "message": "Invalid value for argument `bracketMaterial`. Expected BracketMaterial.",
  "data": null
}
```

Now, the API provides clear, helpful error messages with enum suggestions:

```json
{
  "statusCode": 400,
  "message": "bracketMaterial must be one of: METAL, AESTHETIC. Received: string",
  "data": null
}
```

## Key Improvements

### 1. Enhanced Error Messages
- Clear enum validation errors with all valid options listed
- Specific field names and received values in error messages
- Consistent error response format

### 2. Better Input Validation
- Comprehensive DTO validation with class-validator
- Custom validators for unique arrays and enum consistency
- Range validation for tooth numbers and other numeric fields

### 3. Improved API Documentation
- Complete Swagger documentation with enum values
- Field descriptions and validation rules
- Example requests and responses

### 4. Robust Error Handling
- Graceful handling of Prisma enum errors
- JSON parsing error handling
- Validation error formatting

## Valid Enum Values

### Treatment Plan Type
- `ALIGNER`
- `BRACES`

### Bracket Material
- `METAL`
- `AESTHETIC`

### Bracket Type
- `PRE_ADJUSTED`
- `SELF_LIGATING`
- `LINGUAL`

### Bracket Sub-Type
- `TYPE_018` (represents 0.018)
- `TYPE_022` (represents 0.022)

### Anchorage Type
- `BANDING_2ND_MOLAR`
- `TPA`
- `NANCE_PALATAL_ARCH`

## Usage Examples

### Creating a Braces Treatment Plan

```json
{
  "type": "BRACES",
  "patientId": "cmdwqe7u70006r9o1099ya664",
  "treatmentId": "cmdwr7uvu0008r9o1ad2m5h58",
  "bracesDetails": {
    "treatmentType": "new treatment",
    "startDate": "2025-08-13",
    "durationInMonths": 12,
    "extractUpperJawTeeth": [1, 2],
    "extractLowerJawTeeth": [31, 17],
    "bracketMaterial": "METAL",
    "bracketType": "PRE_ADJUSTED", 
    "bracketSubType": "TYPE_018",
    "anchorageUpperJaw": ["TPA", "NANCE_PALATAL_ARCH"],
    "anchorageLowerJaw": ["TPA"],
    "remarks": "Patient requires careful monitoring",
    "prescriptions": [
      {
        "rxTemplateId": "cme2ov5ld0000r9ks1rq0inyx",
        "medications": ["Dolo 500mg", "Paracetamol"]
      }
    ]
  }
}
```

### Creating an Aligner Treatment Plan

```json
{
  "type": "ALIGNER",
  "patientId": "cmdwqe7u70006r9o1099ya664",
  "treatmentId": "cmdwr7uvu0008r9o1ad2m5h58",
  "alignerDetails": {
    "planName": "Advanced Treatment Plan",
    "daysToWearEachAligner": 7,
    "recommendedDailyHours": 22,
    "upperJawOptions": [1, 2, 3],
    "lowerJawOptions": [17, 18, 19],
    "prescriptions": [
      {
        "rxTemplateId": "cme2ov5ld0000r9ks1rq0inyx",
        "medications": ["Dolo 500mg", "Paracetamol"]
      }
    ]
  }
}
```

## Validation Rules

### Treatment Plan Type Consistency
- When `type` is `BRACES`, only `bracesDetails` should be provided
- When `type` is `ALIGNER`, only `alignerDetails` should be provided

### Tooth Number Ranges
- Upper jaw teeth: 1-16
- Lower jaw teeth: 17-32
- All tooth numbers must be unique within their arrays

### Date Validation
- `startDate` must be in YYYY-MM-DD format
- Must be a valid date

### Numeric Constraints
- `daysToWearEachAligner`: Must be one of [7, 8, 10, 12, 15]
- `recommendedDailyHours`: 1-24
- `durationInMonths`: Minimum 1

### Treatment Type
- Must be either "new treatment" or "ongoing treatment"

## API Endpoints

### POST /treatment-plan/create-update
Creates or updates a treatment plan with optional IPR image uploads.

**Content-Type**: `multipart/form-data`

**Body Parameters**:
- `data` (string): JSON string containing treatment plan data
- `iprDetails` (files, optional): IPR image files (max 10, images only)

### GET /treatment-plan/getAll
Retrieves all treatment plans with parsed JSON fields.

### GET /treatment-plan/getById/:id
Retrieves a specific treatment plan by ID.

## Error Handling

The API provides consistent error responses:

```json
{
  "statusCode": 400,
  "message": "Descriptive error message with suggestions",
  "data": null
}
```

Common error scenarios:
- Invalid enum values with suggestions
- Missing required fields
- Invalid date formats
- Duplicate tooth numbers
- Inconsistent treatment plan types

## File Structure

```
src/
├── common/
│   ├── helpers/
│   │   └── enum-helper.ts          # Enum validation helpers
│   └── validators/
│       └── unique-array.validator.ts # Custom array validators
├── treatment_plan/
│   ├── dto/
│   │   └── create-treatment_plan.dto.ts # Enhanced DTOs with validation
│   ├── treatment_plan.controller.ts     # Controller with Swagger docs
│   └── treatment_plan.service.ts        # Service with error handling
└── schema.prisma                        # Database schema
```

## Installation & Setup

1. Install dependencies:
```bash
npm install @nestjs/common @nestjs/swagger class-validator class-transformer prisma @prisma/client
```

2. Generate Prisma client:
```bash
npx prisma generate
```

3. Run database migrations:
```bash
npx prisma db push
```

4. Start the application and visit `/api` for Swagger documentation.

## Testing

Use the provided example files in the `examples/` directory to test the API with proper enum values.