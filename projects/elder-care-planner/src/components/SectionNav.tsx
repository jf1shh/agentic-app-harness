'use client';

export interface NavSection {
  id: string;
  label: string;
}

interface Props {
  sections: readonly NavSection[];
}

/**
 * Open a collapsed section and bring it into view.
 *
 * Opening first is not a nicety: scrolling to a closed `<details>` lands the
 * reader on a disclosure control with nothing under it, which reads as a broken
 * link rather than as a section they need to open (spec §5.1a).
 */
function reveal(id: string) {
  const heading = document.getElementById(`${id}-heading`);
  if (!heading) return;
  const details = heading.closest('details');
  if (details) details.open = true;
  const target = heading.closest('section') ?? heading;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  // Move the keyboard caret with the viewport. Without this a keyboard user is
  // scrolled to a section their next Tab does not continue from.
  heading.setAttribute('tabindex', '-1');
  (heading as HTMLElement).focus({ preventScroll: true });
}

/**
 * The "On this page" bar. Lists only sections that actually exist right now —
 * the split and summary cards do not render until there is a plan to split.
 */
export function SectionNav({ sections }: Props) {
  if (sections.length === 0) return null;

  return (
    <nav className="section-nav no-print" aria-label="Sections of this plan">
      <span className="section-nav-label">On this page</span>
      <ul>
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}-heading`}
              data-testid={`nav-${section.id}`}
              onClick={(e) => {
                e.preventDefault();
                reveal(section.id);
              }}
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
