import { cn as mergeClassNames } from '../cn';

type ClassValue = string | false | null | undefined;

export function classNames(...classes: ClassValue[]): string {
  return mergeClassNames(...classes);
}

export function cn(...classes: ClassValue[]): string {
  return classNames(...classes);
}

export default classNames;
