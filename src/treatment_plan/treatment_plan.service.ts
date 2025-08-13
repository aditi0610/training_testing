import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prismaModule/prisma.service';
import { CreateTreatmentPlanDto } from './dto/create-treatment_plan.dto';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { 
  Prisma, 
  TreatmentPlanType, 
  BracketMaterial, 
  BracketType, 
  BracketSubType,
  AnchorageType 
} from '@prisma/client';
import { createEnumErrorMessage } from 'src/common/helpers/enum-helper';

@Injectable()
export class TreatmentPlanService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrUpdate(dto: CreateTreatmentPlanDto, imagePaths: string[] = []) {
    try {
      const { id, type, treatmentId, patientId, alignerDetails, bracesDetails } = dto;

      // Early validation for type consistency
      if (type === TreatmentPlanType.BRACES && (!bracesDetails || alignerDetails)) {
        throw new BadRequestException(
          'When type is BRACES, bracesDetails must be provided, and alignerDetails must not be provided',
        );
      }
      if (type === TreatmentPlanType.ALIGNER && (!alignerDetails || bracesDetails)) {
        throw new BadRequestException(
          'When type is ALIGNER, alignerDetails must be provided, and bracesDetails must not be provided',
        );
      }

      // Validate and process alignerDetails
      if (alignerDetails) {
        await this.validateAlignerDetails(alignerDetails);
      }

      // Validate and process bracesDetails  
      if (bracesDetails) {
        await this.validateBracesDetails(bracesDetails);
      }

      // Validate treatmentId and patientId
      const treatment = await this.prisma.treatment.findUnique({
        where: { id: treatmentId },
        select: { id: true, patientId: true },
      });
      if (!treatment) throw new NotFoundException('Treatment not found');
      if (treatment.patientId !== patientId) {
        throw new BadRequestException('Provided patientId does not match the patientId associated with the treatment');
      }

      // Validate patientId exists
      const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
      if (!patient) throw new NotFoundException('Patient not found');

      // Define the type for finalAlignerTable entries
      type AlignerTableEntry = { aligner: string; type: string };

      // Generate finalAlignerTable for alignerDetails
      let computedFinalAlignerTable: AlignerTableEntry[] = [];
      if (alignerDetails) {
        const upperJawEntries: AlignerTableEntry[] = (alignerDetails.upperJawOptions || []).map(aligner => ({
          aligner: aligner.toString(),
          type: 'U',
        }));
        const lowerJawEntries: AlignerTableEntry[] = (alignerDetails.lowerJawOptions || []).map(aligner => ({
          aligner: aligner.toString(),
          type: 'L',
        }));
        computedFinalAlignerTable = [...upperJawEntries, ...lowerJawEntries].sort(
          (a, b) => parseInt(a.aligner) - parseInt(b.aligner)
        );
      }

      // Generate finalAlignerTable for bracesDetails
      let bracesFinalAlignerTable: AlignerTableEntry[] = [];
      if (bracesDetails) {
        const upperJawEntries: AlignerTableEntry[] = (bracesDetails.extractUpperJawTeeth || []).map(aligner => ({
          aligner: aligner.toString(),
          type: 'U',
        }));
        const lowerJawEntries: AlignerTableEntry[] = (bracesDetails.extractLowerJawTeeth || []).map(aligner => ({
          aligner: aligner.toString(),
          type: 'L',
        }));
        bracesFinalAlignerTable = [...upperJawEntries, ...lowerJawEntries].sort(
          (a, b) => parseInt(a.aligner) - parseInt(b.aligner)
        );
      }

      if (id) {
        return await this.updateTreatmentPlan(
          id, 
          type, 
          treatmentId, 
          patientId, 
          alignerDetails, 
          bracesDetails, 
          computedFinalAlignerTable, 
          bracesFinalAlignerTable, 
          imagePaths
        );
      }

      return await this.createTreatmentPlan(
        type, 
        treatmentId, 
        patientId, 
        alignerDetails, 
        bracesDetails, 
        computedFinalAlignerTable, 
        bracesFinalAlignerTable, 
        imagePaths
      );

    } catch (error) {
      // Handle Prisma enum validation errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2000' && error.message.includes('Invalid value for argument')) {
          const enumErrorMessage = this.extractEnumErrorMessage(error.message);
          throw new BadRequestException(enumErrorMessage);
        }
      }
      
      // Re-throw known exceptions
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      // Log unexpected errors and throw generic message
      console.error('Unexpected error in createOrUpdate:', error);
      throw new BadRequestException('An error occurred while processing the treatment plan');
    }
  }

  private extractEnumErrorMessage(prismaErrorMessage: string): string {
    // Extract field name and expected enum type from Prisma error
    const fieldMatch = prismaErrorMessage.match(/argument `(\w+)`/);
    const enumMatch = prismaErrorMessage.match(/Expected (\w+)/);
    
    if (fieldMatch && enumMatch) {
      const fieldName = fieldMatch[1];
      const enumType = enumMatch[1];
      
      // Map Prisma enum types to our enum objects
      const enumMapping = {
        'BracketMaterial': BracketMaterial,
        'BracketType': BracketType,
        'BracketSubType': BracketSubType,
        'AnchorageType': AnchorageType,
        'TreatmentPlanType': TreatmentPlanType
      };
      
      const enumObject = enumMapping[enumType];
      if (enumObject) {
        return createEnumErrorMessage(fieldName, enumObject);
      }
    }
    
    return 'Invalid enum value provided. Please check the API documentation for valid options.';
  }

  private async validateAlignerDetails(alignerDetails: any) {
    // Ensure arrays are properly initialized
    if (!Array.isArray(alignerDetails.upperJawOptions)) {
      alignerDetails.upperJawOptions = [];
      console.warn('Invalid upperJawOptions, defaulting to empty array');
    }
    if (!Array.isArray(alignerDetails.lowerJawOptions)) {
      alignerDetails.lowerJawOptions = [];
      console.warn('Invalid lowerJawOptions, defaulting to empty array');
    }
    if (!Array.isArray(alignerDetails.prescriptions)) {
      alignerDetails.prescriptions = [];
      console.warn('Invalid prescriptions, defaulting to empty array');
    }

    // Validate daysToWearEachAligner
    const validDays = [7, 8, 10, 12, 15];
    if (
      alignerDetails.daysToWearEachAligner !== undefined &&
      !validDays.includes(alignerDetails.daysToWearEachAligner)
    ) {
      throw new BadRequestException(
        `daysToWearEachAligner must be one of: ${validDays.join(', ')}. Received: ${alignerDetails.daysToWearEachAligner}`
      );
    }

    // Validate upperJawOptions (1-16) and lowerJawOptions (17-32)
    if (alignerDetails.upperJawOptions.some((val) => val < 1 || val > 16)) {
      throw new BadRequestException('upperJawOptions must be between 1 and 16');
    }
    if (alignerDetails.lowerJawOptions.some((val) => val < 17 || val > 32)) {
      throw new BadRequestException('lowerJawOptions must be between 17 and 32');
    }

    // Validate no duplicates in upperJawOptions and lowerJawOptions
    const upperJawSet = new Set(alignerDetails.upperJawOptions);
    if (upperJawSet.size !== alignerDetails.upperJawOptions.length) {
      throw new BadRequestException('upperJawOptions must contain unique values');
    }
    const lowerJawSet = new Set(alignerDetails.lowerJawOptions);
    if (lowerJawSet.size !== alignerDetails.lowerJawOptions.length) {
      throw new BadRequestException('lowerJawOptions must contain unique values');
    }

    // Validate prescriptions
    if (alignerDetails.prescriptions && alignerDetails.prescriptions.length > 0) {
      await this.validatePrescriptions(alignerDetails.prescriptions);
    }
  }

  private async validateBracesDetails(bracesDetails: any) {
    // Ensure arrays are properly initialized
    if (!Array.isArray(bracesDetails.extractUpperJawTeeth)) {
      bracesDetails.extractUpperJawTeeth = [];
      console.warn('Invalid extractUpperJawTeeth, defaulting to empty array');
    }
    if (!Array.isArray(bracesDetails.extractLowerJawTeeth)) {
      bracesDetails.extractLowerJawTeeth = [];
      console.warn('Invalid extractLowerJawTeeth, defaulting to empty array');
    }
    if (!Array.isArray(bracesDetails.anchorageUpperJaw)) {
      bracesDetails.anchorageUpperJaw = [];
      console.warn('Invalid anchorageUpperJaw, defaulting to empty array');
    }
    if (!Array.isArray(bracesDetails.anchorageLowerJaw)) {
      bracesDetails.anchorageLowerJaw = [];
      console.warn('Invalid anchorageLowerJaw, defaulting to empty array');
    }
    if (!Array.isArray(bracesDetails.prescriptions)) {
      bracesDetails.prescriptions = [];
      console.warn('Invalid prescriptions, defaulting to empty array');
    }

    // Validate enum values with better error messages
    if (!Object.values(BracketMaterial).includes(bracesDetails.bracketMaterial)) {
      throw new BadRequestException(createEnumErrorMessage('bracketMaterial', BracketMaterial, bracesDetails.bracketMaterial));
    }

    if (!Object.values(BracketType).includes(bracesDetails.bracketType)) {
      throw new BadRequestException(createEnumErrorMessage('bracketType', BracketType, bracesDetails.bracketType));
    }

    if (bracesDetails.bracketSubType && !Object.values(BracketSubType).includes(bracesDetails.bracketSubType)) {
      throw new BadRequestException(createEnumErrorMessage('bracketSubType', BracketSubType, bracesDetails.bracketSubType));
    }

    // Validate jaw teeth ranges
    if (bracesDetails.extractUpperJawTeeth.some((val) => val < 1 || val > 16)) {
      throw new BadRequestException('extractUpperJawTeeth must be between 1 and 16');
    }
    if (bracesDetails.extractLowerJawTeeth.some((val) => val < 17 || val > 32)) {
      throw new BadRequestException('extractLowerJawTeeth must be between 17 and 32');
    }

    // Validate no duplicates
    const extractUpperJaw = new Set(bracesDetails.extractUpperJawTeeth);
    if (extractUpperJaw.size !== bracesDetails.extractUpperJawTeeth.length) {
      throw new BadRequestException('extractUpperJawTeeth must contain unique values');
    }
    const extractLowerJaw = new Set(bracesDetails.extractLowerJawTeeth);
    if (extractLowerJaw.size !== bracesDetails.extractLowerJawTeeth.length) {
      throw new BadRequestException('extractLowerJawTeeth must contain unique values');
    }

    // Validate anchorage types
    if (bracesDetails.anchorageUpperJaw.some(val => !Object.values(AnchorageType).includes(val))) {
      const invalidValues = bracesDetails.anchorageUpperJaw.filter(val => !Object.values(AnchorageType).includes(val));
      throw new BadRequestException(
        `Invalid anchorageUpperJaw values: ${invalidValues.join(', ')}. Valid options: ${Object.values(AnchorageType).join(', ')}`
      );
    }

    if (bracesDetails.anchorageLowerJaw.some(val => !Object.values(AnchorageType).includes(val))) {
      const invalidValues = bracesDetails.anchorageLowerJaw.filter(val => !Object.values(AnchorageType).includes(val));
      throw new BadRequestException(
        `Invalid anchorageLowerJaw values: ${invalidValues.join(', ')}. Valid options: ${Object.values(AnchorageType).join(', ')}`
      );
    }

    // Validate prescriptions
    if (bracesDetails.prescriptions && bracesDetails.prescriptions.length > 0) {
      await this.validatePrescriptions(bracesDetails.prescriptions);
    }

    // Normalize and validate startDate
    if (bracesDetails.startDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(bracesDetails.startDate)) {
        throw new BadRequestException('startDate must be a valid date in YYYY-MM-DD format');
      }
      try {
        const date = new Date(bracesDetails.startDate);
        if (isNaN(date.getTime())) {
          throw new BadRequestException('Invalid startDate format. Use YYYY-MM-DD');
        }
        bracesDetails.startDate = date.toISOString().split('T')[0];
      } catch (error) {
        throw new BadRequestException('Invalid startDate format. Use YYYY-MM-DD');
      }
    }
  }

  private async validatePrescriptions(prescriptions: any[]) {
    for (const prescription of prescriptions) {
      if (prescription.rxTemplateId) {
        const rxTemplate = await this.prisma.rxTemplate.findUnique({
          where: { id: prescription.rxTemplateId },
        });
        if (!rxTemplate) {
          throw new NotFoundException(`RxTemplate with id ${prescription.rxTemplateId} not found`);
        }
        // Fetch initial medications from RxTemplate, filter to ensure only strings
        const templateMedications = Array.isArray(rxTemplate.medication)
          ? rxTemplate.medication.filter((item): item is string => typeof item === 'string')
          : [];
        const providedMedications = prescription.medications || [];
        prescription.medications = Array.from(
          new Set([...templateMedications, ...providedMedications])
        );
      } else if (!prescription.medications || prescription.medications.length === 0) {
        throw new BadRequestException('Medications are required if rxTemplateId is not provided');
      }
    }
  }

  private async updateTreatmentPlan(
    id: string,
    type: any,
    treatmentId: string,
    patientId: string,
    alignerDetails: any,
    bracesDetails: any,
    computedFinalAlignerTable: any[],
    bracesFinalAlignerTable: any[],
    imagePaths: string[]
  ) {
    const existing = await this.prisma.treatmentPlan.findUnique({
      where: { id },
      include: { alignerDetails: { include: { iprDetails: true } }, bracesDetails: true },
    });
    if (!existing) throw new NotFoundException('Treatment Plan not found');

    // Remove old IPR detail files if alignerDetails exist
    if (existing.alignerDetails?.iprDetails) {
      for (const ipr of existing.alignerDetails.iprDetails) {
        const fullPath = join(__dirname, '..', '..', ipr.url);
        if (existsSync(fullPath)) await unlink(fullPath).catch(() => null);
      }
    }

    // Delete previous nested relations
    await this.prisma.alignerDetail.deleteMany({ where: { treatmentPlanId: id } });
    await this.prisma.braceDetail.deleteMany({ where: { treatmentPlanId: id } });

    const updated = await this.prisma.treatmentPlan.update({
      where: { id },
      data: {
        type,
        treatmentId,
        patientId,
        alignerDetails: alignerDetails
          ? {
              create: this.buildAlignerDetailData(alignerDetails, computedFinalAlignerTable, imagePaths),
            }
          : undefined,
        bracesDetails: bracesDetails
          ? {
              create: this.buildBraceDetailData(bracesDetails, bracesFinalAlignerTable),
            }
          : undefined,
      } as Prisma.TreatmentPlanUncheckedUpdateInput,
      include: {
        alignerDetails: { include: { iprDetails: true } },
        bracesDetails: true,
      },
    });

    return {
      statusCode: 200,
      message: 'Request successful',
      data: {
        message: 'Treatment Plan updated successfully',
        data: this.transformResponse(updated),
      },
    };
  }

  private async createTreatmentPlan(
    type: any,
    treatmentId: string,
    patientId: string,
    alignerDetails: any,
    bracesDetails: any,
    computedFinalAlignerTable: any[],
    bracesFinalAlignerTable: any[],
    imagePaths: string[]
  ) {
    const created = await this.prisma.treatmentPlan.create({
      data: {
        type,
        treatmentId,
        patientId,
        alignerDetails: alignerDetails
          ? {
              create: this.buildAlignerDetailData(alignerDetails, computedFinalAlignerTable, imagePaths),
            }
          : undefined,
        bracesDetails: bracesDetails
          ? {
              create: this.buildBraceDetailData(bracesDetails, bracesFinalAlignerTable),
            }
          : undefined,
      } as Prisma.TreatmentPlanUncheckedCreateInput,
      include: {
        alignerDetails: { include: { iprDetails: true } },
        bracesDetails: true,
      },
    });

    return {
      statusCode: 200,
      message: 'Request successful',
      data: {
        message: 'Treatment Plan created successfully',
        data: this.transformResponse(created),
      },
    };
  }

  private buildAlignerDetailData(alignerDetails: any, computedFinalAlignerTable: any[], imagePaths: string[]) {
    return {
      planName: alignerDetails.planName || '',
      daysToWearEachAligner: alignerDetails.daysToWearEachAligner || 0,
      recommendedDailyHours: alignerDetails.recommendedDailyHours || 0,
      upperJawOptions: JSON.stringify(alignerDetails.upperJawOptions || []),
      lowerJawOptions: JSON.stringify(alignerDetails.lowerJawOptions || []),
      finalAlignerTable: JSON.stringify(computedFinalAlignerTable),
      prescriptions: JSON.stringify(
        (alignerDetails.prescriptions || []).map((p) => ({
          rxTemplateId: p.rxTemplateId,
          medications: p.medications,
        })),
      ),
      iprDetails: imagePaths.length
        ? { create: imagePaths.map((p) => ({ url: p.replace(/\\/g, '/') })) }
        : undefined,
    };
  }

  private buildBraceDetailData(bracesDetails: any, bracesFinalAlignerTable: any[]) {
    return {
      treatmentType: bracesDetails.treatmentType || '',
      startDate: bracesDetails.startDate ? new Date(bracesDetails.startDate) : new Date(),
      durationInMonths: bracesDetails.durationInMonths || 0,
      extractUpperJawTeeth: JSON.stringify(bracesDetails.extractUpperJawTeeth || []),
      extractLowerJawTeeth: JSON.stringify(bracesDetails.extractLowerJawTeeth || []),
      finalAlignerTable: JSON.stringify(bracesFinalAlignerTable),
      bracketMaterial: bracesDetails.bracketMaterial,
      bracketType: bracesDetails.bracketType,
      bracketSubType: bracesDetails.bracketSubType,
      anchorageUpperJaw: JSON.stringify(bracesDetails.anchorageUpperJaw || []),
      anchorageLowerJaw: JSON.stringify(bracesDetails.anchorageLowerJaw || []),
      remarks: bracesDetails.remarks,
      prescriptions: JSON.stringify(
        (bracesDetails.prescriptions || []).map((p) => ({
          rxTemplateId: p.rxTemplateId,
          medications: p.medications,
        })),
      ),
    };
  }

  private transformResponse(data: any) {
    if (!data) {
      return null;
    }

    const result = { ...data };

    // Helper function to safely parse JSON
    const safeParse = (value: string | null | undefined, field: string, planId: string) => {
      if (!value) {
        return [];
      }
      try {
        return JSON.parse(value);
      } catch (error) {
        console.error(`Error parsing JSON for field "${field}" in plan ${planId}:`, error.message);
        return [];
      }
    };

    // Transform alignerDetails
    if (result.alignerDetails) {
      const planId = data.id || 'unknown';
      result.alignerDetails = {
        ...result.alignerDetails,
        upperJawOptions: safeParse(result.alignerDetails.upperJawOptions, 'alignerDetails.upperJawOptions', planId).map(Number),
        lowerJawOptions: safeParse(result.alignerDetails.lowerJawOptions, 'alignerDetails.lowerJawOptions', planId).map(Number),
        finalAlignerTable: safeParse(result.alignerDetails.finalAlignerTable, 'alignerDetails.finalAlignerTable', planId),
        prescriptions: safeParse(result.alignerDetails.prescriptions, 'alignerDetails.prescriptions', planId),
      };
    }

    // Transform bracesDetails
    if (result.bracesDetails) {
      const planId = data.id || 'unknown';
      result.bracesDetails = {
        ...result.bracesDetails,
        extractUpperJawTeeth: safeParse(result.bracesDetails.extractUpperJawTeeth, 'bracesDetails.extractUpperJawTeeth', planId).map(Number),
        extractLowerJawTeeth: safeParse(result.bracesDetails.extractLowerJawTeeth, 'bracesDetails.extractLowerJawTeeth', planId).map(Number),
        finalAlignerTable: safeParse(result.bracesDetails.finalAlignerTable, 'bracesDetails.finalAlignerTable', planId),
        anchorageUpperJaw: safeParse(result.bracesDetails.anchorageUpperJaw, 'bracesDetails.anchorageUpperJaw', planId),
        anchorageLowerJaw: safeParse(result.bracesDetails.anchorageLowerJaw, 'bracesDetails.anchorageLowerJaw', planId),
        prescriptions: safeParse(result.bracesDetails.prescriptions, 'bracesDetails.prescriptions', planId),
      };
    }

    return result;
  }

  async findAll() {
    try {
      const plans = await this.prisma.treatmentPlan.findMany({
        include: {
          alignerDetails: { include: { iprDetails: true } },
          bracesDetails: true,
        },
      });
      return plans.map((plan) => this.transformResponse(plan));
    } catch (error) {
      console.error('Error in findAll:', error);
      throw new Error('Failed to retrieve treatment plans');
    }
  }

  async findOne(id: string) {
    try {
      const plan = await this.prisma.treatmentPlan.findUnique({
        where: { id },
        include: {
          alignerDetails: { include: { iprDetails: true } },
          bracesDetails: true,
        },
      });
      if (!plan) throw new NotFoundException('Treatment Plan not found');
      return this.transformResponse(plan);
    } catch (error) {
      console.error('Error in findOne:', error);
      throw new NotFoundException('Treatment Plan not found');
    }
  }
}