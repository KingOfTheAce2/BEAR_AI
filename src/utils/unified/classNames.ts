import { cn as mergeClassNames } from '../cn';

export function classNames(
  ...classes: Array<string | false | null | undefined>
): string {
  return mergeClassNames(...classes);
}

export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classNames(...classes);
}

export function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classNames(...classes);
}
export default classNames;
