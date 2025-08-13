# Error Message Examples

## Before (Cryptic Prisma Errors)

### Invalid Enum Value
```json
{
  "statusCode": 500,
  "message": "\nInvalid `this.prisma.treatmentPlan.create()` invocation in\n/Users/aditi/Documents/microlent-project/orthodontic/src/treatment_plan/treatment_plan.service.ts:311:53\n\n  308 }\n  309 \n  310 // CREATE\n→ 311 const created = await this.prisma.treatmentPlan.create({\n        data: {\n          type: \"BRACES\",\n          treatmentId: \"cmdwr7uvu0008r9o1ad2m5h58\",\n          patientId: \"cmdwqe7u70006r9o1099ya664\",\n          alignerDetails: undefined,\n          bracesDetails: {\n            create: {\n              treatmentType: \"string\",\n              startDate: new Date(\"2025-08-13T00:00:00.000Z\"),\n              durationInMonths: 0,\n              extractUpperJawTeeth: \"[1]\",\n              extractLowerJawTeeth: \"[31,17]\",\n              finalAlignerTable: \"[{\\\"aligner\\\":\\\"1\\\",\\\"type\\\":\\\"U\\\"},{\\\"aligner\\\":\\\"17\\\",\\\"type\\\":\\\"L\\\"},{\\\"aligner\\\":\\\"31\\\",\\\"type\\\":\\\"L\\\"}]\",\n              bracketMaterial: \"string\",\n                               ~~~~~~~~\n              bracketType: \"string\",\n              bracketSubType: \"string\",\n              anchorageUpperJaw: \"[\\\"string\\\"]\",\n              anchorageLowerJaw: \"[\\\"string\\\"]\",\n              remarks: \"string\",\n              prescriptions: \"[{\\\"rxTemplateId\\\":\\\"cme2ov5ld0000r9ks1rq0inyx\\\",\\\"medications\\\":[\\\"Dolo 500mg\\\",\\\"Paracetamol\\\",\\\"string\\\"]}]\"\n            }\n          }\n        },\n        include: {\n          alignerDetails: {\n            include: {\n              iprDetails: true\n            }\n          },\n          bracesDetails: true\n        }\n      })\n\nInvalid value for argument `bracketMaterial`. Expected BracketMaterial.",
  "data": null
}
```

## After (Clear, Helpful Errors)

### Invalid Bracket Material
```json
{
  "statusCode": 400,
  "message": "bracketMaterial must be one of: METAL, AESTHETIC. Received: string",
  "data": null
}
```

### Invalid Bracket Type
```json
{
  "statusCode": 400,
  "message": "bracketType must be one of: PRE_ADJUSTED, SELF_LIGATING, LINGUAL. Received: invalid_type",
  "data": null
}
```

### Invalid Treatment Plan Type
```json
{
  "statusCode": 400,
  "message": "type must be one of: ALIGNER, BRACES. Received: INVALID",
  "data": null
}
```

### Invalid Anchorage Types
```json
{
  "statusCode": 400,
  "message": "Invalid anchorageUpperJaw values: INVALID_TYPE. Valid options: BANDING_2ND_MOLAR, TPA, NANCE_PALATAL_ARCH",
  "data": null
}
```

### Days to Wear Each Aligner Validation
```json
{
  "statusCode": 400,
  "message": "daysToWearEachAligner must be one of: 7, 8, 10, 12, 15. Received: 6",
  "data": null
}
```

### Tooth Number Range Validation
```json
{
  "statusCode": 400,
  "message": "Each upperJawOption must be between 1 and 16",
  "data": null
}
```

### Unique Values Validation
```json
{
  "statusCode": 400,
  "message": "upperJawOptions must contain unique values",
  "data": null
}
```

### Date Format Validation
```json
{
  "statusCode": 400,
  "message": "startDate must be a valid date in YYYY-MM-DD format",
  "data": null
}
```

### Treatment Type Consistency
```json
{
  "statusCode": 400,
  "message": "When type is BRACES, bracesDetails must be provided, and alignerDetails must not be provided",
  "data": null
}
```

### Missing Required Fields
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    "patientId should not be empty",
    "treatmentId should not be empty"
  ],
  "data": null
}
```

### JSON Parsing Error
```json
{
  "statusCode": 400,
  "message": "Invalid JSON in data field",
  "data": null
}
```

## Benefits of Improved Error Messages

1. **Clear Field Identification**: Errors specify exactly which field has the issue
2. **Valid Options Listed**: All acceptable enum values are provided
3. **Received Value Shown**: Shows what invalid value was actually provided
4. **Consistent Format**: All errors follow the same response structure
5. **Actionable Information**: Developers know exactly what to fix
6. **No Internal Stack Traces**: Clean, user-friendly error messages
7. **HTTP Status Codes**: Proper 400 vs 500 status codes for client vs server errors