/**
 * Document content renderer registry.
 *
 * The DocumentViewer shell is generic — it does not contain artifact-type logic.
 * New document types register a renderer here. The shell never changes.
 */
import type React from 'react';
import type { Artifact, ArtifactType } from '../types';
import type { Blueprint, DecisionPackage, IdeaBrief } from '../../departments/shared/types';

export type ContentRenderer = (artifact: Artifact) => React.ReactNode;

// Lazy imports keep bundles clean — renderers only load when viewed
async function loadRenderer(type: ArtifactType): Promise<ContentRenderer> {
  switch (type) {
    case 'idea-brief': {
      const { IdeaBriefContent } = await import('./IdeaBriefContent');
      return (artifact) => {
        const React = require('react') as typeof import('react');
        return React.createElement(IdeaBriefContent, { content: artifact.content as IdeaBrief });
      };
    }
    case 'decision-package': {
      const { DecisionPackageContent } = await import('./DecisionPackageContent');
      return (artifact) => {
        const React = require('react') as typeof import('react');
        return React.createElement(DecisionPackageContent, { content: artifact.content as DecisionPackage });
      };
    }
    case 'blueprint': {
      const { BlueprintContent } = await import('./BlueprintContent');
      return (artifact) => {
        const React = require('react') as typeof import('react');
        return React.createElement(BlueprintContent, { content: artifact.content as Blueprint });
      };
    }
    default:
      return () => null;
  }
}

// Synchronous registry for direct use in components
import { IdeaBriefContent } from './IdeaBriefContent';
import { DecisionPackageContent } from './DecisionPackageContent';
import { BlueprintContent } from './BlueprintContent';
import React from 'react';

const RENDERERS: Record<ArtifactType, (artifact: Artifact) => React.ReactNode> = {
  'idea-brief': (artifact) =>
    React.createElement(IdeaBriefContent, { content: artifact.content as IdeaBrief }),
  'decision-package': (artifact) =>
    React.createElement(DecisionPackageContent, { content: artifact.content as DecisionPackage }),
  'blueprint': (artifact) =>
    React.createElement(BlueprintContent, { content: artifact.content as Blueprint }),
};

export function renderDocumentContent(artifact: Artifact): React.ReactNode {
  const renderer = RENDERERS[artifact.artifactType];
  if (!renderer) return null;
  return renderer(artifact);
}

export { loadRenderer };
