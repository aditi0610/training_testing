import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'uniqueArray', async: false })
export class UniqueArrayConstraint implements ValidatorConstraintInterface {
  validate(value: any[], args: ValidationArguments) {
    if (!Array.isArray(value)) {
      return false;
    }
    
    const uniqueSet = new Set(value);
    return uniqueSet.size === value.length;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must contain unique values`;
  }
}