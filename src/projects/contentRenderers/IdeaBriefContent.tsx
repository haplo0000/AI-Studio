import type { IdeaBrief } from '../../departments/shared/types';

function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted border-b border-border-subtle pb-1">
        {title}
      </h3>
      {children}
    </section>
  );
}

function DocParagraph({ text }: { text: string }) {
  if (!text) return <p className="text-sm text-text-muted italic">Not recorded.</p>;
  return <p className="text-sm text-text-secondary leading-relaxed">{text}</p>;
}

function DocList({ items }: { items: string[] }) {
  if (!items.length) return <p className="text-sm text-text-muted italic">None identified.</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-sm text-text-secondary">
          <span className="text-text-muted mt-0.5 shrink-0">—</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function IdeaBriefContent({ content }: { content: IdeaBrief }) {
  return (
    <div className="space-y-7">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-text-primary">{content.projectName || 'Untitled Project'}</h2>
        <p className="text-sm text-text-secondary">{content.summary}</p>
        <div className="flex items-center gap-2 pt-1">
          <div className="flex-1 bg-surface-overlay rounded-full h-1">
            <div
              className="bg-accent rounded-full h-1 transition-all"
              style={{ width: `${content.confidence}%` }}
            />
          </div>
          <span className="text-xs text-text-muted">{content.confidence}% intake confidence</span>
        </div>
      </div>

      <DocSection title="Problem Statement">
        <DocParagraph text={content.problemStatement} />
      </DocSection>

      <div className="grid grid-cols-2 gap-6">
        <DocSection title="Target User">
          <DocParagraph text={content.targetUser} />
        </DocSection>
        <DocSection title="Desired Outcome">
          <DocParagraph text={content.desiredOutcome} />
        </DocSection>
      </div>

      <DocSection title="Success Criteria">
        <DocList items={content.successCriteria} />
      </DocSection>

      {content.constraints.length > 0 && (
        <DocSection title="Constraints">
          <DocList items={content.constraints} />
        </DocSection>
      )}

      {content.assumptions.length > 0 && (
        <DocSection title="Assumptions">
          <DocList items={content.assumptions} />
        </DocSection>
      )}

      {content.unknowns.length > 0 && (
        <DocSection title="Unknowns">
          <DocList items={content.unknowns} />
        </DocSection>
      )}

      {content.risks.length > 0 && (
        <DocSection title="Identified Risks">
          <DocList items={content.risks} />
        </DocSection>
      )}

      {content.questionsAnswered.length > 0 && (
        <DocSection title="Questions Answered">
          <DocList items={content.questionsAnswered} />
        </DocSection>
      )}

      {content.questionsRemaining.length > 0 && (
        <DocSection title="Open Questions">
          <DocList items={content.questionsRemaining} />
        </DocSection>
      )}

      {content.founderNotes && (
        <DocSection title="Founder Notes">
          <blockquote className="border-l-2 border-accent/30 pl-4">
            <p className="text-sm text-text-secondary italic leading-relaxed">
              {content.founderNotes}
            </p>
          </blockquote>
        </DocSection>
      )}
    </div>
  );
}
