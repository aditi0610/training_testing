/**
 * Helper function to create enum validation error messages with suggestions
 */
export function createEnumErrorMessage(
  fieldName: string,
  enumObject: Record<string, string>,
  receivedValue?: any
): string {
  const validValues = Object.values(enumObject).join(', ');
  const baseMessage = `${fieldName} must be one of: ${validValues}`;
  
  if (receivedValue !== undefined) {
    return `${baseMessage}. Received: ${receivedValue}`;
  }
  
  return baseMessage;
}

/**
 * Helper function to validate enum values and throw descriptive errors
 */
export function validateEnumValue(
  value: any,
  enumObject: Record<string, string>,
  fieldName: string
): boolean {
  if (!Object.values(enumObject).includes(value)) {
    throw new Error(createEnumErrorMessage(fieldName, enumObject, value));
  }
  return true;
}