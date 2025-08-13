import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  UsePipes,
  ValidationPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { 
  ApiOperation, 
  ApiTags, 
  ApiBody, 
  ApiBearerAuth, 
  ApiConsumes, 
  ApiResponse,
  ApiParam
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { TreatmentPlanService } from './treatment_plan.service';
import { CreateTreatmentPlanDto } from './dto/create-treatment_plan.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { TreatmentPlanType, BracketMaterial, BracketType, BracketSubType, AnchorageType } from '@prisma/client';

const storage = diskStorage({
  destination: './Uploads/ipr-details',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
  },
});

@ApiTags('Treatment Plan')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('treatment-plan')
export class TreatmentPlanController {
  constructor(private readonly service: TreatmentPlanService) {}

  @Post('create-update')
  @ApiOperation({ 
    summary: 'Create or update treatment plan (aligner or braces) with optional IPR details',
    description: `
    Creates a new treatment plan or updates an existing one. Supports both ALIGNER and BRACES types.
    
    **Important Notes:**
    - When type is ALIGNER, only provide alignerDetails
    - When type is BRACES, only provide bracesDetails  
    - Use valid enum values for all enum fields
    - All enum values are case-sensitive
    
    **Valid Enum Values:**
    - TreatmentPlanType: ${Object.values(TreatmentPlanType).join(', ')}
    - BracketMaterial: ${Object.values(BracketMaterial).join(', ')}
    - BracketType: ${Object.values(BracketType).join(', ')}
    - BracketSubType: ${Object.values(BracketSubType).join(', ')}
    - AnchorageType: ${Object.values(AnchorageType).join(', ')}
    `
  })
  @UseInterceptors(
    FilesInterceptor('iprDetails', 10, {
      storage,
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed!'), false);
      },
    }),
  )
  @UsePipes(new ValidationPipe({ 
    transform: true, 
    transformOptions: { enableImplicitConversion: true },
    forbidNonWhitelisted: true,
    whitelist: true,
    exceptionFactory: (errors) => {
      const formattedErrors = errors.map(error => {
        const constraints = error.constraints;
        if (constraints) {
          return Object.values(constraints).join(', ');
        }
        return 'Validation failed';
      });
      throw new HttpException({
        statusCode: 400,
        message: 'Validation failed',
        errors: formattedErrors,
        data: null
      }, HttpStatus.BAD_REQUEST);
    }
  }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Treatment plan data with optional IPR image files',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { 
              type: 'string', 
              nullable: true,
              description: 'Treatment plan ID for updates (leave empty for new plans)'
            },
            type: { 
              type: 'string', 
              enum: Object.values(TreatmentPlanType),
              description: `Treatment plan type. Must be one of: ${Object.values(TreatmentPlanType).join(', ')}`
            },
            patientId: { 
              type: 'string',
              description: 'Patient ID (CUID format)'
            },
            treatmentId: { 
              type: 'string',
              description: 'Treatment ID (CUID format)'
            },
            alignerDetails: {
              type: 'object',
              description: 'Required when type is ALIGNER. Must not be provided when type is BRACES.',
              properties: {
                planName: { type: 'string', description: 'Name of the aligner plan' },
                daysToWearEachAligner: { 
                  type: 'number', 
                  enum: [7, 8, 10, 12, 15],
                  description: 'Number of days to wear each aligner. Must be one of: 7, 8, 10, 12, 15'
                },
                recommendedDailyHours: { 
                  type: 'number',
                  minimum: 1,
                  maximum: 24,
                  description: 'Recommended daily hours (1-24)'
                },
                upperJawOptions: { 
                  type: 'array', 
                  items: { type: 'number', minimum: 1, maximum: 16 },
                  description: 'Upper jaw tooth numbers (1-16). Must be unique values.'
                },
                lowerJawOptions: { 
                  type: 'array', 
                  items: { type: 'number', minimum: 17, maximum: 32 },
                  description: 'Lower jaw tooth numbers (17-32). Must be unique values.'
                },
                finalAlignerTable: { 
                  type: 'array', 
                  items: { type: 'object' },
                  description: 'Auto-generated based on jaw options'
                },
                prescriptions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      rxTemplateId: { 
                        type: 'string', 
                        nullable: true,
                        description: 'Optional RX template ID'
                      },
                      medications: { 
                        type: 'array', 
                        items: { type: 'string' },
                        description: 'List of medications'
                      },
                    },
                  },
                  description: 'List of prescriptions'
                },
              },
            },
            bracesDetails: {
              type: 'object',
              description: 'Required when type is BRACES. Must not be provided when type is ALIGNER.',
              properties: {
                treatmentType: { 
                  type: 'string',
                  enum: ['new treatment', 'ongoing treatment'],
                  description: 'Type of braces treatment'
                },
                startDate: { 
                  type: 'string', 
                  format: 'date',
                  pattern: '^\\d{4}-\\d{2}-\\d{2}$',
                  description: 'Start date in YYYY-MM-DD format'
                },
                durationInMonths: { 
                  type: 'number',
                  minimum: 1,
                  description: 'Duration in months (minimum 1)'
                },
                extractUpperJawTeeth: { 
                  type: 'array', 
                  items: { type: 'number', minimum: 1, maximum: 16 },
                  description: 'Upper jaw teeth to extract (1-16). Must be unique values.'
                },
                extractLowerJawTeeth: { 
                  type: 'array', 
                  items: { type: 'number', minimum: 17, maximum: 32 },
                  description: 'Lower jaw teeth to extract (17-32). Must be unique values.'
                },
                finalAlignerTable: { 
                  type: 'array', 
                  items: { type: 'object' },
                  description: 'Auto-generated based on extraction teeth'
                },
                bracketMaterial: { 
                  type: 'string',
                  enum: Object.values(BracketMaterial),
                  description: `Bracket material. Must be one of: ${Object.values(BracketMaterial).join(', ')}`
                },
                bracketType: { 
                  type: 'string',
                  enum: Object.values(BracketType),
                  description: `Bracket type. Must be one of: ${Object.values(BracketType).join(', ')}`
                },
                bracketSubType: { 
                  type: 'string',
                  enum: Object.values(BracketSubType),
                  description: `Bracket sub-type. Must be one of: ${Object.values(BracketSubType).join(', ')}`
                },
                anchorageUpperJaw: { 
                  type: 'array', 
                  items: { 
                    type: 'string',
                    enum: Object.values(AnchorageType)
                  },
                  description: `Upper jaw anchorage. Each value must be one of: ${Object.values(AnchorageType).join(', ')}`
                },
                anchorageLowerJaw: { 
                  type: 'array', 
                  items: { 
                    type: 'string',
                    enum: Object.values(AnchorageType)
                  },
                  description: `Lower jaw anchorage. Each value must be one of: ${Object.values(AnchorageType).join(', ')}`
                },
                remarks: { 
                  type: 'string',
                  description: 'Additional remarks'
                },
                prescriptions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      rxTemplateId: { 
                        type: 'string', 
                        nullable: true,
                        description: 'Optional RX template ID'
                      },
                      medications: { 
                        type: 'array', 
                        items: { type: 'string' },
                        description: 'List of medications'
                      },
                    },
                  },
                  description: 'List of prescriptions'
                },
              },
            },
          },
        },
        iprDetails: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Optional IPR image files (max 10, images only)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Treatment plan created/updated successfully',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Request successful' },
        data: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Treatment Plan created successfully' },
            data: { type: 'object', description: 'Treatment plan data' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error with enum suggestions',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'bracketMaterial must be one of: METAL, AESTHETIC. Received: string' },
        data: { type: 'null', example: null }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Treatment or Patient not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Treatment not found' },
        data: { type: 'null', example: null }
      }
    }
  })
  async createOrUpdate(
    @Body('data') data: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    try {
      const parsedDto: CreateTreatmentPlanDto = JSON.parse(data);
      const imagePaths = files ? files.map((file) => file.path) : [];
      return this.service.createOrUpdate(parsedDto, imagePaths);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new HttpException({
          statusCode: 400,
          message: 'Invalid JSON in data field',
          data: null
        }, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }

  @Get('getAll')
  @ApiOperation({ 
    summary: 'Get all treatment plans',
    description: 'Retrieves all treatment plans with their associated details (aligner/braces) and IPR images'
  })
  @ApiResponse({
    status: 200,
    description: 'List of all treatment plans',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        description: 'Treatment plan object with parsed JSON fields'
      }
    }
  })
  findAll() {
    return this.service.findAll();
  }

  @Get('getById/:id')
  @ApiOperation({ 
    summary: 'Get treatment plan by ID',
    description: 'Retrieves a specific treatment plan by its ID with all associated details'
  })
  @ApiParam({
    name: 'id',
    description: 'Treatment plan ID (CUID format)',
    example: 'clxxxxx-xxx-xxx-xxx-xxxxxxxxxxxx'
  })
  @ApiResponse({
    status: 200,
    description: 'Treatment plan found',
    schema: {
      type: 'object',
      description: 'Treatment plan object with parsed JSON fields'
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Treatment plan not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Treatment Plan not found' }
      }
    }
  })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}