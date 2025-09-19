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

export default classNames;
