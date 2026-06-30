import type { Blueprint, BlueprintComponent } from '../../departments/shared/types';

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

function ComponentCard({ comp }: { comp: BlueprintComponent }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-overlay px-4 py-3 space-y-2">
      <p className="text-sm font-semibold text-text-primary">{comp.name}</p>
      <p className="text-sm text-text-secondary">{comp.responsibility}</p>
      {comp.interfaces.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
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
  );
}

export function BlueprintContent({ content }: { content: Blueprint }) {
  return (
    <div className="space-y-7">
      <DocSection title="Problem">
        <DocParagraph text={content.problem} />
      </DocSection>

      <div className="grid grid-cols-2 gap-6">
        <DocSection title="Goals">
          <DocList items={content.goals} />
        </DocSection>
        {content.nonGoals.length > 0 && (
          <DocSection title="Non-Goals">
            <DocList items={content.nonGoals} />
          </DocSection>
        )}
      </div>

      {content.userStories.length > 0 && (
        <DocSection title="User Stories">
          <DocList items={content.userStories} />
        </DocSection>
      )}

      <DocSection title="Architecture">
        <DocParagraph text={content.architecture} />
      </DocSection>

      {content.majorComponents.length > 0 && (
        <DocSection title="Major Components">
          <div className="grid grid-cols-1 gap-3">
            {content.majorComponents.map((comp, i) => (
              <ComponentCard key={i} comp={comp} />
            ))}
          </div>
        </DocSection>
      )}

      {content.dataModel && (
        <DocSection title="Data Model">
          <DocParagraph text={content.dataModel} />
        </DocSection>
      )}

      {content.dependencies.length > 0 && (
        <DocSection title="Dependencies">
          <DocList items={content.dependencies} />
        </DocSection>
      )}

      {content.risks.length > 0 && (
        <DocSection title="Architectural Risks">
          <DocList items={content.risks} />
        </DocSection>
      )}

      <DocSection title="Success Criteria">
        <DocList items={content.successCriteria} />
      </DocSection>

      {content.futureExpansion.length > 0 && (
        <DocSection title="Future Expansion">
          <DocList items={content.futureExpansion} />
        </DocSection>
      )}
    </div>
  );
}
