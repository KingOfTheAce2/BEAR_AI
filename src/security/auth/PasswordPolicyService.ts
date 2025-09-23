/**
 * Password Policy Service
 * Comprehensive password security management with industry-standard policies
 */

import crypto from 'crypto';
import zxcvbn from 'zxcvbn';

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  minSpecialChars: number;
  minNumbers: number;
  preventCommonPasswords: boolean;
  preventUserInfo: boolean;
  preventRepeatingChars: boolean;
  maxRepeatingChars: number;
  preventSequentialChars: boolean;
  preventDictionaryWords: boolean;
  minUniqueChars: number;
  historyCount: number; // Number of previous passwords to check against
  expiryDays: number; // Password expiration in days
}

export interface PasswordStrengthResult {
  score: number; // 0-4 (0 = very weak, 4 = very strong)
  feedback: string[];
  suggestions: string[];
  estimatedCrackTime: string;
  isValid: boolean;
  errors: string[];
  entropy: number;
}

export interface UserContext {
  email?: string;
  firstName?: string;
  lastName?: string;
  organization?: string;
  previousPasswords?: string[]; // Hashed previous passwords
}

/**
 * Default password policies for different security levels
 */
export const PASSWORD_POLICIES = {
  // Basic policy for general users
  basic: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
    minSpecialChars: 0,
    minNumbers: 1,
    preventCommonPasswords: true,
    preventUserInfo: true,
    preventRepeatingChars: true,
    maxRepeatingChars: 2,
    preventSequentialChars: true,
    preventDictionaryWords: false,
    minUniqueChars: 6,
    historyCount: 5,
    expiryDays: 90
  } as PasswordPolicy,

  // Enhanced policy for legal professionals
  legal: {
    minLength: 12,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    minSpecialChars: 1,
    minNumbers: 2,
    preventCommonPasswords: true,
    preventUserInfo: true,
    preventRepeatingChars: true,
    maxRepeatingChars: 2,
    preventSequentialChars: true,
    preventDictionaryWords: true,
    minUniqueChars: 8,
    historyCount: 12,
    expiryDays: 60
  } as PasswordPolicy,

  // Maximum security for administrators
  admin: {
    minLength: 16,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    minSpecialChars: 2,
    minNumbers: 2,
    preventCommonPasswords: true,
    preventUserInfo: true,
    preventRepeatingChars: true,
    maxRepeatingChars: 1,
    preventSequentialChars: true,
    preventDictionaryWords: true,
    minUniqueChars: 12,
    historyCount: 24,
    expiryDays: 30
  } as PasswordPolicy
};

/**
 * Common passwords and patterns to prevent
 */
const COMMON_PASSWORDS = [
  'password', 'password123', '123456', '123456789', 'qwerty', 'abc123',
  'password1', 'admin', 'letmein', 'welcome', 'monkey', '1234567890',
  'admin123', 'root', 'toor', 'pass', 'test', 'guest', 'info', 'adm',
  'mysql', 'user', 'administrator', 'oracle', 'ftp', 'pi', 'puppet',
  'ansible', 'ec2-user', 'vagrant', 'azureuser', 'legal', 'law', 'attorney',
  'lawyer', 'paralegal', 'court', 'case', 'client', 'document', 'contract'
];

const SEQUENTIAL_PATTERNS = [
  'abcdefgh', '12345678', 'qwertyui', 'asdfghjk', 'zxcvbnm',
  'abcdefghijklmnop', '1234567890123456'
];

const COMMON_SUBSTITUTIONS = {
  'a': ['@', '4'],
  'e': ['3'],
  'i': ['1', '!'],
  'o': ['0'],
  's': ['$', '5'],
  't': ['7'],
  'l': ['1'],
  'g': ['9']
};

/**
 * Password Policy Service
 */
export class PasswordPolicyService {
  private policy: PasswordPolicy;
  private commonPasswords: Set<string>;

  constructor(policyLevel: 'basic' | 'legal' | 'admin' = 'legal', customPolicy?: Partial<PasswordPolicy>) {
    this.policy = { ...PASSWORD_POLICIES[policyLevel], ...customPolicy };
    this.commonPasswords = new Set(COMMON_PASSWORDS.map(p => p.toLowerCase()));
  }

  /**
   * Validate password against policy
   */
  validatePassword(password: string, userContext?: UserContext): PasswordStrengthResult {
    const errors: string[] = [];
    const suggestions: string[] = [];

    // Basic length validation
    if (password.length < this.policy.minLength) {
      errors.push(`Password must be at least ${this.policy.minLength} characters long`);
      suggestions.push(`Add ${this.policy.minLength - password.length} more characters`);
    }

    if (password.length > this.policy.maxLength) {
      errors.push(`Password must not exceed ${this.policy.maxLength} characters`);
    }

    // Character type requirements
    this.validateCharacterTypes(password, errors, suggestions);

    // Advanced security checks
    this.validateSecurityRequirements(password, errors, suggestions, userContext);

    // Use zxcvbn for additional strength analysis
    const zxcvbnResult = zxcvbn(password, this.getUserInputs(userContext));

    // Calculate entropy
    const entropy = this.calculateEntropy(password);

    // Combine all feedback
    const allFeedback = [...errors, ...zxcvbnResult.feedback.suggestions];
    const allSuggestions = [...suggestions, ...zxcvbnResult.feedback.warning ? [zxcvbnResult.feedback.warning] : []];

    return {
      score: Math.min(zxcvbnResult.score, errors.length === 0 ? 4 : 2),
      feedback: allFeedback,
      suggestions: allSuggestions,
      estimatedCrackTime: zxcvbnResult.crack_times_display.offline_slow_hashing_1e4_per_second,
      isValid: errors.length === 0 && zxcvbnResult.score >= 3,
      errors,
      entropy
    };
  }

  /**
   * Validate character type requirements
   */
  private validateCharacterTypes(password: string, errors: string[], suggestions: string[]): void {
    if (this.policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
      suggestions.push('Add uppercase letters (A-Z)');
    }

    if (this.policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
      suggestions.push('Add lowercase letters (a-z)');
    }

    if (this.policy.requireNumbers) {
      const numberCount = (password.match(/\d/g) || []).length;
      if (numberCount < this.policy.minNumbers) {
        errors.push(`Password must contain at least ${this.policy.minNumbers} number(s)`);
        suggestions.push('Add more numbers (0-9)');
      }
    }

    if (this.policy.requireSpecialChars) {
      const specialChars = password.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || [];
      if (specialChars.length < this.policy.minSpecialChars) {
        errors.push(`Password must contain at least ${this.policy.minSpecialChars} special character(s)`);
        suggestions.push('Add special characters (!@#$%^&*...)');
      }
    }

    // Unique character requirement
    const uniqueChars = new Set(password.toLowerCase()).size;
    if (uniqueChars < this.policy.minUniqueChars) {
      errors.push(`Password must contain at least ${this.policy.minUniqueChars} unique characters`);
      suggestions.push('Use more varied characters');
    }
  }

  /**
   * Validate advanced security requirements
   */
  private validateSecurityRequirements(
    password: string,
    errors: string[],
    suggestions: string[],
    userContext?: UserContext
  ): void {
    // Check against common passwords
    if (this.policy.preventCommonPasswords) {
      const lowerPassword = password.toLowerCase();
      if (this.commonPasswords.has(lowerPassword) || this.isCommonPasswordVariant(lowerPassword)) {
        errors.push('Password is too common');
        suggestions.push('Avoid common passwords and dictionary words');
      }
    }

    // Check against user information
    if (this.policy.preventUserInfo && userContext) {
      const userInfo = this.getUserInputs(userContext);
      for (const info of userInfo) {
        if (info.length > 2 && password.toLowerCase().includes(info.toLowerCase())) {
          errors.push('Password must not contain personal information');
          suggestions.push('Avoid using your name, email, or organization in the password');
          break;
        }
      }
    }

    // Check for repeating characters
    if (this.policy.preventRepeatingChars) {
      const maxRepeating = this.getMaxRepeatingChars(password);
      if (maxRepeating > this.policy.maxRepeatingChars) {
        errors.push(`Password must not have more than ${this.policy.maxRepeatingChars} repeating characters in a row`);
        suggestions.push('Avoid repeating the same character multiple times');
      }
    }

    // Check for sequential characters
    if (this.policy.preventSequentialChars && this.hasSequentialChars(password)) {
      errors.push('Password must not contain sequential characters');
      suggestions.push('Avoid sequences like "123" or "abc"');
    }

    // Check against dictionary words
    if (this.policy.preventDictionaryWords && this.containsDictionaryWord(password)) {
      errors.push('Password must not contain dictionary words');
      suggestions.push('Use a combination of random words or add numbers and symbols');
    }
  }

  /**
   * Check if password is a variant of common passwords
   */
  private isCommonPasswordVariant(password: string): boolean {
    // Check for simple substitutions (e.g., p@ssw0rd)
    const reversedSubstitutions: Record<string, string[]> = {};
    for (const [char, substitutes] of Object.entries(COMMON_SUBSTITUTIONS)) {
      for (const substitute of substitutes) {
        if (!reversedSubstitutions[substitute]) {
          reversedSubstitutions[substitute] = [];
        }
        reversedSubstitutions[substitute].push(char);
      }
    }

    let normalizedPassword = password;
    for (const [substitute, originals] of Object.entries(reversedSubstitutions)) {
      for (const original of originals) {
        normalizedPassword = normalizedPassword.replace(new RegExp(substitute, 'g'), original);
      }
    }

    return this.commonPasswords.has(normalizedPassword);
  }

  /**
   * Get maximum number of repeating characters
   */
  private getMaxRepeatingChars(password: string): number {
    let maxRepeating = 1;
    let currentRepeating = 1;

    for (let i = 1; i < password.length; i++) {
      if (password[i].toLowerCase() === password[i - 1].toLowerCase()) {
        currentRepeating++;
        maxRepeating = Math.max(maxRepeating, currentRepeating);
      } else {
        currentRepeating = 1;
      }
    }

    return maxRepeating;
  }

  /**
   * Check for sequential characters
   */
  private hasSequentialChars(password: string): boolean {
    const lowerPassword = password.toLowerCase();

    // Check against known sequential patterns
    for (const pattern of SEQUENTIAL_PATTERNS) {
      if (lowerPassword.includes(pattern)) {
        return true;
      }
    }

    // Check for numeric sequences
    for (let i = 0; i < password.length - 2; i++) {
      const char1 = password.charCodeAt(i);
      const char2 = password.charCodeAt(i + 1);
      const char3 = password.charCodeAt(i + 2);

      if (char2 === char1 + 1 && char3 === char2 + 1) {
        return true;
      }
      if (char2 === char1 - 1 && char3 === char2 - 1) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check for dictionary words (simplified implementation)
   */
  private containsDictionaryWord(password: string): boolean {
    const lowerPassword = password.toLowerCase();

    // Common English words that should be avoided
    const commonWords = [
      'password', 'legal', 'lawyer', 'attorney', 'court', 'case', 'client',
      'document', 'contract', 'law', 'firm', 'office', 'admin', 'user',
      'login', 'access', 'secure', 'private', 'confidential'
    ];

    return commonWords.some(word => lowerPassword.includes(word));
  }

  /**
   * Calculate password entropy
   */
  private calculateEntropy(password: string): number {
    const charSets = {
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };

    let charsetSize = 0;
    if (charSets.lowercase) charsetSize += 26;
    if (charSets.uppercase) charsetSize += 26;
    if (charSets.numbers) charsetSize += 10;
    if (charSets.special) charsetSize += 32;

    return password.length * Math.log2(charsetSize);
  }

  /**
   * Get user inputs for zxcvbn analysis
   */
  private getUserInputs(userContext?: UserContext): string[] {
    if (!userContext) return [];

    const inputs: string[] = [];
    if (userContext.email) {
      inputs.push(userContext.email);
      inputs.push(userContext.email.split('@')[0]); // Username part
    }
    if (userContext.firstName) inputs.push(userContext.firstName);
    if (userContext.lastName) inputs.push(userContext.lastName);
    if (userContext.organization) inputs.push(userContext.organization);

    return inputs;
  }

  /**
   * Generate secure password suggestion
   */
  generateSecurePassword(length?: number): string {
    const targetLength = length || Math.max(this.policy.minLength, 16);
    const charset = {
      lowercase: 'abcdefghijklmnopqrstuvwxyz',
      uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      numbers: '0123456789',
      special: '!@#$%^&*()_+-=[]{}|;:,.<>?'
    };

    let password = '';
    let availableChars = '';

    // Ensure required character types are included
    if (this.policy.requireLowercase) {
      password += this.getRandomChar(charset.lowercase);
      availableChars += charset.lowercase;
    }
    if (this.policy.requireUppercase) {
      password += this.getRandomChar(charset.uppercase);
      availableChars += charset.uppercase;
    }
    if (this.policy.requireNumbers) {
      for (let i = 0; i < this.policy.minNumbers; i++) {
        password += this.getRandomChar(charset.numbers);
      }
      availableChars += charset.numbers;
    }
    if (this.policy.requireSpecialChars) {
      for (let i = 0; i < this.policy.minSpecialChars; i++) {
        password += this.getRandomChar(charset.special);
      }
      availableChars += charset.special;
    }

    // Fill remaining length with random characters
    while (password.length < targetLength) {
      password += this.getRandomChar(availableChars);
    }

    // Shuffle the password to avoid predictable patterns
    return this.shuffleString(password);
  }

  /**
   * Get random character from charset
   */
  private getRandomChar(charset: string): string {
    return charset[Math.floor(Math.random() * charset.length)];
  }

  /**
   * Shuffle string characters
   */
  private shuffleString(str: string): string {
    return str.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Check if password needs to be changed based on age
   */
  isPasswordExpired(passwordCreatedAt: Date): boolean {
    if (this.policy.expiryDays === 0) return false;

    const ageInDays = (Date.now() - passwordCreatedAt.getTime()) / (1000 * 60 * 60 * 24);
    return ageInDays > this.policy.expiryDays;
  }

  /**
   * Get days until password expiration
   */
  getDaysUntilExpiration(passwordCreatedAt: Date): number {
    if (this.policy.expiryDays === 0) return Infinity;

    const ageInDays = (Date.now() - passwordCreatedAt.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, this.policy.expiryDays - ageInDays);
  }

  /**
   * Check if password has been used before
   */
  async checkPasswordHistory(newPasswordHash: string, userContext?: UserContext): Promise<boolean> {
    if (!userContext?.previousPasswords || this.policy.historyCount === 0) {
      return false;
    }

    const recentPasswords = userContext.previousPasswords.slice(-this.policy.historyCount);
    return recentPasswords.includes(newPasswordHash);
  }

  /**
   * Get current password policy
   */
  getPolicy(): PasswordPolicy {
    return { ...this.policy };
  }

  /**
   * Get password policy description for users
   */
  getPolicyDescription(): string {
    const requirements: string[] = [];

    requirements.push(`At least ${this.policy.minLength} characters long`);

    if (this.policy.requireUppercase) {
      requirements.push('At least one uppercase letter');
    }
    if (this.policy.requireLowercase) {
      requirements.push('At least one lowercase letter');
    }
    if (this.policy.requireNumbers) {
      requirements.push(`At least ${this.policy.minNumbers} number(s)`);
    }
    if (this.policy.requireSpecialChars) {
      requirements.push(`At least ${this.policy.minSpecialChars} special character(s)`);
    }
    if (this.policy.preventCommonPasswords) {
      requirements.push('Cannot be a common password');
    }
    if (this.policy.preventUserInfo) {
      requirements.push('Cannot contain personal information');
    }
    if (this.policy.expiryDays > 0) {
      requirements.push(`Must be changed every ${this.policy.expiryDays} days`);
    }

    return `Password must meet the following requirements:\n• ${requirements.join('\n• ')}`;
  }
}

// Export default instances for different security levels
export const basicPasswordPolicy = new PasswordPolicyService('basic');
export const legalPasswordPolicy = new PasswordPolicyService('legal');
export const adminPasswordPolicy = new PasswordPolicyService('admin');

export default PasswordPolicyService;