/**
 * Architect Department — Public API
 *
 * The rest of the system must only use createBlueprint().
 * Internal implementation details are hidden behind this export.
 */
import type { Blueprint, DecisionPackage, DepartmentConfig, IdeaBrief } from '../shared/types';
import { DEFAULT_CONFIG } from '../shared/types';
import { generateBlueprint } from './services/blueprint';

/**
 * The Architect creates a Blueprint from an approved Idea Brief and the
 * Executive Board's Decision Package.
 *
 * Only called when the Decision is "Build Now" or "Prototype".
 */
export async function createBlueprint(
  brief: IdeaBrief,
  decisionPackage: DecisionPackage,
  config: DepartmentConfig = DEFAULT_CONFIG,
): Promise<Blueprint> {
  return generateBlueprint(brief, decisionPackage, config);
}
