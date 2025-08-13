import {
  IsEnum,
  IsString,
  IsOptional,
  IsArray,
  IsDateString,
  IsInt,
  ValidateNested,
  ArrayNotEmpty,
  Min,
  IsNotEmpty,
  IsIn,
  Max,
  Validate,
  ValidationArguments,
  ValidatorConstraintInterface,
  ValidatorConstraint,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

import {
  BracketMaterial,
  BracketType,
  BracketSubType,
  AnchorageType,
  TreatmentPlanType,
} from '@prisma/client';
import { UniqueArrayConstraint } from 'src/common/validators/unique-array.validator';
import { createEnumErrorMessage } from 'src/common/helpers/enum-helper';

// --------------------- Custom Enum Validators ---------------------
@ValidatorConstraint({ name: 'EnumValue', async: false })
export class EnumValueConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [enumObject] = args.constraints;
    return Object.values(enumObject).includes(value);
  }

  defaultMessage(args: ValidationArguments) {
    const [enumObject, fieldName] = args.constraints;
    const { value } = args;
    return createEnumErrorMessage(fieldName || args.property, enumObject, value);
  }
}

// --------------------- Prescription ---------------------
export class PrescriptionDto {
  @ApiProperty({ 
    example: 'cme2ov5ld0000r9ks1rq0inyx',
    description: 'UUID of the RX template',
    required: false
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  rxTemplateId?: string;

  @ApiProperty({ 
    example: ['Dolo 500mg', 'Paracetamol'], 
    type: [String],
    description: 'List of medications'
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  medications?: string[];
}

// --------------------- Aligner Details ---------------------
export class CreateAlignerDetailDto {
  @ApiProperty({ 
    example: 'Plan A',
    description: 'Name of the aligner plan'
  })
  @IsOptional()
  @IsString()
  planName?: string;

  @ApiProperty({ 
    example: 7, 
    enum: [7, 8, 10, 12, 15],
    description: 'Number of days to wear each aligner'
  })
  @IsOptional()
  @IsInt()
  @IsIn([7, 8, 10, 12, 15], { 
    message: 'daysToWearEachAligner must be one of: 7, 8, 10, 12, 15. Received: $value' 
  })
  daysToWearEachAligner?: number;

  @ApiProperty({ 
    example: 22,
    description: 'Recommended daily hours to wear aligners',
    minimum: 1,
    maximum: 24
  })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'recommendedDailyHours must be at least 1 hour' })
  @Max(24, { message: 'recommendedDailyHours cannot exceed 24 hours' })
  recommendedDailyHours?: number;

  @ApiProperty({ 
    example: [2, 3], 
    type: [Number],
    description: 'Upper jaw tooth numbers (1-16)'
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(1, { each: true, message: 'Each upperJawOption must be between 1 and 16' })
  @Max(16, { each: true, message: 'Each upperJawOption must be between 1 and 16' })
  @Validate(UniqueArrayConstraint, { message: 'upperJawOptions must contain unique values' })
  upperJawOptions?: number[];

  @ApiProperty({ 
    example: [17, 18], 
    type: [Number],
    description: 'Lower jaw tooth numbers (17-32)'
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(17, { each: true, message: 'Each lowerJawOption must be between 17 and 32' })
  @Max(32, { each: true, message: 'Each lowerJawOption must be between 17 and 32' })
  @Validate(UniqueArrayConstraint, { message: 'lowerJawOptions must contain unique values' })
  lowerJawOptions?: number[];

  @ApiProperty({ 
    example: [], 
    type: [Object],
    description: 'Final aligner table (auto-generated based on jaw options)'
  })
  @IsOptional()
  @IsArray()
  finalAlignerTable?: any[];

  @ApiProperty({ 
    type: [PrescriptionDto],
    description: 'List of prescriptions for the aligner treatment'
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionDto)
  prescriptions?: PrescriptionDto[];

  @ApiProperty({
    type: [String],
    description: 'IPR detail image file paths',
    required: false
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  iprDetails?: string[];
}

// --------------------- Braces Details ---------------------
export class CreateBraceDetailDto {
  @ApiProperty({ 
    example: 'new treatment',
    description: 'Type of braces treatment',
    enum: ['new treatment', 'ongoing treatment']
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @IsIn(['new treatment', 'ongoing treatment'], {
    message: 'treatmentType must be either "new treatment" or "ongoing treatment". Received: $value'
  })
  treatmentType?: string;

  @ApiProperty({ 
    example: '2025-07-17',
    description: 'Start date of the braces treatment (YYYY-MM-DD format)'
  })
  @IsOptional()
  @IsDateString({}, { message: 'startDate must be a valid date in YYYY-MM-DD format' })
  startDate?: string;

  @ApiProperty({ 
    example: 12,
    description: 'Duration of treatment in months',
    minimum: 1
  })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'durationInMonths must be at least 1 month' })
  durationInMonths?: number;

  @ApiProperty({ 
    example: [2, 3], 
    type: [Number],
    description: 'Upper jaw teeth to extract (1-16)'
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(1, { each: true, message: 'Each extractUpperJawTeeth must be between 1 and 16' })
  @Max(16, { each: true, message: 'Each extractUpperJawTeeth must be between 1 and 16' })
  @Validate(UniqueArrayConstraint, { message: 'extractUpperJawTeeth must contain unique values' })
  extractUpperJawTeeth?: number[];

  @ApiProperty({ 
    example: [17, 18], 
    type: [Number],
    description: 'Lower jaw teeth to extract (17-32)'
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(17, { each: true, message: 'Each extractLowerJawTeeth must be between 17 and 32' })
  @Max(32, { each: true, message: 'Each extractLowerJawTeeth must be between 17 and 32' })
  @Validate(UniqueArrayConstraint, { message: 'extractLowerJawTeeth must contain unique values' })
  extractLowerJawTeeth?: number[];

  @ApiProperty({ 
    example: [], 
    type: [Object],
    description: 'Final aligner table (auto-generated based on extraction teeth)'
  })
  @IsOptional()
  @IsArray()
  finalAlignerTable?: any[];

  @ApiProperty({ 
    enum: BracketMaterial, 
    example: BracketMaterial.METAL,
    description: `Bracket material. Valid options: ${Object.values(BracketMaterial).join(', ')}`
  })
  @IsEnum(BracketMaterial, {
    message: ({ value }) => createEnumErrorMessage('bracketMaterial', BracketMaterial, value)
  })
  bracketMaterial: BracketMaterial;

  @ApiProperty({ 
    enum: BracketType, 
    example: BracketType.PRE_ADJUSTED,
    description: `Bracket type. Valid options: ${Object.values(BracketType).join(', ')}`
  })
  @IsEnum(BracketType, {
    message: ({ value }) => createEnumErrorMessage('bracketType', BracketType, value)
  })
  bracketType: BracketType;

  @ApiProperty({ 
    enum: BracketSubType, 
    example: BracketSubType.TYPE_018,
    description: `Bracket sub-type. Valid options: ${Object.values(BracketSubType).join(', ')}`
  })
  @IsOptional()
  @IsEnum(BracketSubType, {
    message: ({ value }) => createEnumErrorMessage('bracketSubType', BracketSubType, value)
  })
  bracketSubType?: BracketSubType;

  @ApiProperty({
    enum: AnchorageType,
    example: [AnchorageType.TPA, AnchorageType.NANCE_PALATAL_ARCH],
    type: [String],
    description: `Upper jaw anchorage options. Valid options: ${Object.values(AnchorageType).join(', ')}`
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(AnchorageType, { 
    each: true, 
    message: ({ value, property }) => 
      `Each ${property} must be one of: ${Object.values(AnchorageType).join(', ')}. Invalid value: ${value}`
  })
  anchorageUpperJaw?: AnchorageType[];

  @ApiProperty({
    enum: AnchorageType,
    example: [AnchorageType.TPA],
    type: [String],
    description: `Lower jaw anchorage options. Valid options: ${Object.values(AnchorageType).join(', ')}`
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(AnchorageType, { 
    each: true, 
    message: ({ value, property }) => 
      `Each ${property} must be one of: ${Object.values(AnchorageType).join(', ')}. Invalid value: ${value}`
  })
  anchorageLowerJaw?: AnchorageType[];

  @ApiProperty({ 
    example: 'Patient remarks', 
    required: false,
    description: 'Additional remarks for the braces treatment'
  })
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiProperty({ 
    type: [PrescriptionDto], 
    required: false,
    description: 'List of prescriptions for the braces treatment'
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionDto)
  prescriptions?: PrescriptionDto[];
}

// --------------------- Root DTO ---------------------
@ValidatorConstraint({ name: 'TreatmentPlanTypeConsistency', async: false })
export class TreatmentPlanTypeConsistencyConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const { alignerDetails, bracesDetails, type } = args.object as CreateTreatmentPlanDto;
    
    if (type === TreatmentPlanType.BRACES) {
      return !!bracesDetails && !alignerDetails;
    }
    if (type === TreatmentPlanType.ALIGNER) {
      return !!alignerDetails && !bracesDetails;
    }
    return false;
  }

  defaultMessage(args: ValidationArguments) {
    const { type } = args.object as CreateTreatmentPlanDto;
    if (type === TreatmentPlanType.BRACES) {
      return 'When type is BRACES, bracesDetails must be provided, and alignerDetails must not be provided';
    }
    if (type === TreatmentPlanType.ALIGNER) {
      return 'When type is ALIGNER, alignerDetails must be provided, and bracesDetails must not be provided';
    }
    return createEnumErrorMessage('type', TreatmentPlanType);
  }
}

export class CreateTreatmentPlanDto {
  @ApiProperty({ 
    example: 'clxxxxx-xxx-xxx-xxx-xxxxxxxxxxxx', 
    required: false,
    description: 'Treatment plan ID for updates (leave empty for creation)'
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ 
    example: 'cmdwqe7u70006r9o1099ya664', 
    required: true,
    description: 'Patient ID (CUID)'
  })
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ 
    enum: TreatmentPlanType, 
    example: TreatmentPlanType.BRACES,
    description: `Treatment plan type. Valid options: ${Object.values(TreatmentPlanType).join(', ')}`
  })
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(TreatmentPlanType, {
    message: ({ value }) => createEnumErrorMessage('type', TreatmentPlanType, value)
  })
  @Validate(TreatmentPlanTypeConsistencyConstraint)
  type: TreatmentPlanType;

  @ApiProperty({ 
    example: 'cmdwr7uvu0008r9o1ad2m5h58',
    description: 'Treatment ID (CUID)'
  })
  @IsString()
  @IsNotEmpty()
  treatmentId: string;

  @ApiProperty({ 
    type: CreateAlignerDetailDto, 
    required: false,
    description: 'Aligner details (required when type is ALIGNER)'
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAlignerDetailDto)
  alignerDetails?: CreateAlignerDetailDto;

  @ApiProperty({ 
    type: CreateBraceDetailDto, 
    required: false,
    description: 'Braces details (required when type is BRACES)'
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateBraceDetailDto)
  bracesDetails?: CreateBraceDetailDto;
}