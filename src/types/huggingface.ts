/**
 * Legacy compatibility layer for HuggingFace types.
 *
 * All HuggingFace related type definitions now live in
 * `src/types/huggingface/index.ts`. This file simply re-exports those
 * definitions so existing imports that reference `@/types/huggingface`
 * continue to function without modification.
 */

export * from './huggingface/index';

