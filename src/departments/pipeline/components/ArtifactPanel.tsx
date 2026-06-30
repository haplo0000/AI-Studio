import type { Blueprint, DecisionPackage, IdeaBrief } from '../../shared/types';

// ─── Generic helpers ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
        {title}
      </h4>
      {children}
    </div>
  );
}

function StringList({ items }: { items: string[] }) {
  if (!items.length) return <p className="text-sm text-text-muted italic">None identified</p>;
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="text-sm text-text-secondary flex gap-2">
          <span className="text-text-muted mt-0.5">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Prose({ text }: { text: string }) {
  return <p className="text-sm text-text-secondary leading-relaxed">{text || '—'}</p>;
}

function ArtifactCard({
  label,
  icon,
  children,
  accentClass,
}: {
  label: string;
  icon: string;
  children: React.ReactNode;
  accentClass: string;
}) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-raised overflow-hidden">
      <div className={`px-5 py-3 flex items-center gap-2.5 border-b border-border-subtle ${accentClass}`}>
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-semibold text-text-primary">{label}</span>
      </div>
      <div className="px-5 py-4 space-y-4">{children}</div>
    </div>
  );
}

// ─── Idea Brief card ──────────────────────────────────────────────────────────

export function IdeaBriefCard({ brief }: { brief: IdeaBrief }) {
  return (
    <ArtifactCard label="Idea Brief" icon="📋" accentClass="bg-blue-500/5">
      <Section title="Project">
        <p className="text-base font-semibold text-text-primary">{brief.projectName || '—'}</p>
      </Section>

      <Section title="Problem Statement">
        <Prose text={brief.problemStatement} />
      </Section>

      <div className="grid grid-cols-2 gap-4">
        <Section title="Target User">
          <Prose text={brief.targetUser} />
        </Section>
        <Section title="Desired Outcome">
          <Prose text={brief.desiredOutcome} />
        </Section>
      </div>

      <Section title="Success Criteria">
        <StringList items={brief.successCriteria} />
      </Section>

      {brief.constraints.length > 0 && (
        <Section title="Constraints">
          <StringList items={brief.constraints} />
        </Section>
      )}

      {brief.assumptions.length > 0 && (
        <Section title="Assumptions">
          <StringList items={brief.assumptions} />
        </Section>
      )}

      {brief.unknowns.length > 0 && (
        <Section title="Unknowns">
          <StringList items={brief.unknowns} />
        </Section>
      )}

      {brief.risks.length > 0 && (
        <Section title="Risks">
          <StringList items={brief.risks} />
        </Section>
      )}

      {brief.questionsRemaining.length > 0 && (
        <Section title="Questions Remaining">
          <StringList items={brief.questionsRemaining} />
        </Section>
      )}

      {brief.founderNotes && (
        <Section title="Founder Notes">
          <blockquote className="border-l-2 border-accent/40 pl-3">
            <Prose text={brief.founderNotes} />
          </blockquote>
        </Section>
      )}

      <Section title="Summary">
        <Prose text={brief.summary} />
      </Section>

      <div className="flex items-center gap-3 pt-1">
        <div className="flex-1 bg-surface-overlay rounded-full h-1.5">
          <div
            className="bg-accent rounded-full h-1.5 transition-all"
            style={{ width: `${brief.confidence}%` }}
          />
        </div>
        <span className="text-xs text-text-muted">{brief.confidence}% confidence</span>
      </div>
    </ArtifactCard>
  );
}

// ─── Decision Package card ────────────────────────────────────────────────────

const DECISION_STYLES: Record<
  string,
  { color: string; bg: string; icon: string }
> = {
  'Build Now': { color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: '✅' },
  Prototype: { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: '🔬' },
  'Research Further': { color: 'text-amber-400', bg: 'bg-amber-500/10', icon: '🔭' },
  Delay: { color: 'text-slate-400', bg: 'bg-slate-500/10', icon: '⏳' },
  Reject: { color: 'text-red-400', bg: 'bg-red-500/10', icon: '⛔' },
};

export function DecisionPackageCard({ pkg }: { pkg: DecisionPackage }) {
  const style = DECISION_STYLES[pkg.decision] ?? {
    color: 'text-text-primary',
    bg: 'bg-surface-overlay',
    icon: '📌',
  };

  return (
    <ArtifactCard label="Decision Package" icon="⚖️" accentClass="bg-purple-500/5">
      <div className={`rounded-xl px-4 py-3 flex items-center gap-3 ${style.bg}`}>
        <span className="text-2xl">{style.icon}</span>
        <div>
          <p className={`text-lg font-bold ${style.color}`}>{pkg.decision}</p>
          <p className="text-xs text-text-muted">{pkg.confidence}% confidence</p>
        </div>
      </div>

      <Section title="Reasoning">
        <Prose text={pkg.reasoning} />
      </Section>

      <Section title="Recommendation">
        <Prose text={pkg.recommendation} />
      </Section>

      {pkg.opportunityCost && (
        <Section title="Opportunity Cost">
          <Prose text={pkg.opportunityCost} />
        </Section>
      )}

      {pkg.risks.length > 0 && (
        <Section title="Risks">
          <StringList items={pkg.risks} />
        </Section>
      )}

      {pkg.opportunities.length > 0 && (
        <Section title="Opportunities">
          <StringList items={pkg.opportunities} />
        </Section>
      )}

      {pkg.openQuestions.length > 0 && (
        <Section title="Open Questions">
          <StringList items={pkg.openQuestions} />
        </Section>
      )}
    </ArtifactCard>
  );
}

// ─── Blueprint card ───────────────────────────────────────────────────────────

export function BlueprintCard({ blueprint }: { blueprint: Blueprint }) {
  return (
    <ArtifactCard label="Blueprint" icon="🏗️" accentClass="bg-orange-500/5">
      <Section title="Problem">
        <Prose text={blueprint.problem} />
      </Section>

      <Section title="Goals">
        <StringList items={blueprint.goals} />
      </Section>

      {blueprint.nonGoals.length > 0 && (
        <Section title="Non-Goals">
          <StringList items={blueprint.nonGoals} />
        </Section>
      )}

      {blueprint.userStories.length > 0 && (
        <Section title="User Stories">
          <StringList items={blueprint.userStories} />
        </Section>
      )}

      <Section title="Architecture">
        <Prose text={blueprint.architecture} />
      </Section>

      {blueprint.majorComponents.length > 0 && (
        <Section title="Major Components">
          <div className="space-y-3">
            {blueprint.majorComponents.map((comp, i) => (
              <div
                key={i}
                className="rounded-lg border border-border-subtle bg-surface-overlay px-3 py-2.5 space-y-1"
              >
                <p className="text-sm font-semibold text-text-primary">{comp.name}</p>
                <p className="text-sm text-text-secondary">{comp.responsibility}</p>
                {comp.interfaces.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {comp.interfaces.map((iface, j) => (
                      <span
                        key={j}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-surface-raised border border-border-subtle text-text-muted"
                      >
                        {iface}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {blueprint.dataModel && (
        <Section title="Data Model">
          <Prose text={blueprint.dataModel} />
        </Section>
      )}

      {blueprint.dependencies.length > 0 && (
        <Section title="Dependencies">
          <StringList items={blueprint.dependencies} />
        </Section>
      )}

      {blueprint.risks.length > 0 && (
        <Section title="Architectural Risks">
          <StringList items={blueprint.risks} />
        </Section>
      )}

      <Section title="Success Criteria">
        <StringList items={blueprint.successCriteria} />
      </Section>

      {blueprint.futureExpansion.length > 0 && (
        <Section title="Future Expansion">
          <StringList items={blueprint.futureExpansion} />
        </Section>
      )}
    </ArtifactCard>
  );
}

// ─── Combined artifact panel ──────────────────────────────────────────────────

interface ArtifactPanelProps {
  ideaBrief: IdeaBrief | null;
  decisionPackage: DecisionPackage | null;
  blueprint: Blueprint | null;
}

export function ArtifactPanel({ ideaBrief, decisionPackage, blueprint }: ArtifactPanelProps) {
  if (!ideaBrief && !decisionPackage && !blueprint) return null;

  return (
    <div className="space-y-4 px-6 py-4">
      {ideaBrief && <IdeaBriefCard brief={ideaBrief} />}
      {decisionPackage && <DecisionPackageCard pkg={decisionPackage} />}
      {blueprint && <BlueprintCard blueprint={blueprint} />}
    </div>
  );
}
