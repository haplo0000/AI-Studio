/**
 * Executive Board Department — Public API
 *
 * The rest of the system must only use reviewIdeaBrief().
 * The internal implementation (single call, multi-perspective pipeline, etc.)
 * is not visible from outside this module.
 */
import type { DecisionPackage, DepartmentConfig, IdeaBrief } from '../shared/types';
import { DEFAULT_CONFIG } from '../shared/types';
import { milestone1Review } from './services/milestone1Review';

/**
 * The Executive Board reviews an Idea Brief and produces a Decision Package.
 *
 * Current implementation: Milestone 1 single-call review.
 * Future implementation: Full 6-perspective pipeline (Milestone 2) —
 * swap milestone1Review for the full pipeline without touching this signature.
 */
export async function reviewIdeaBrief(
  brief: IdeaBrief,
  config: DepartmentConfig = DEFAULT_CONFIG,
): Promise<DecisionPackage> {
  return milestone1Review(brief, config);
}
