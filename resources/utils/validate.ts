export interface NonEmptyStringOptions {
  minLength?: number;
  maxLength?: number;
}

export const ErrorMessages = {
  required: (name: string): string => `${name} is required`,
  mustBeString: (name: string): string => `${name} must be a string`,
  empty: (name: string): string => `${name} must not be empty`,
  blank: (name: string): string => `${name} must not be blank`,
  minLength: (name: string, min: number): string =>
    `${name} must be at least ${min} characters`,
  maxLength: (name: string, max: number): string =>
    `${name} must be at most ${max} characters`,
};

export function requireNonEmptyString(
  value: unknown,
  name: string,
  options: NonEmptyStringOptions = {},
): string {
  if (value === null || value === undefined) {
    throw new Error(ErrorMessages.required(name));
  }
  if (typeof value !== "string") {
    throw new Error(ErrorMessages.mustBeString(name));
  }
  if (value.length === 0) {
    throw new Error(ErrorMessages.empty(name));
  }
  if (value.trim().length === 0) {
    throw new Error(ErrorMessages.blank(name));
  }
  if (options.minLength !== undefined && value.length < options.minLength) {
    throw new Error(ErrorMessages.minLength(name, options.minLength));
  }
  if (options.maxLength !== undefined && value.length > options.maxLength) {
    throw new Error(ErrorMessages.maxLength(name, options.maxLength));
  }
  return value;
}

export function requireS3BucketName(value: unknown, name: string): string {
  return requireNonEmptyString(value, name, { minLength: 3, maxLength: 63 });
}
