'use client';

import { questionsFor } from '@/lib/data/questionsToAsk';
import type { CareType } from '@/lib/schemas';

/**
 * The cheapest genuinely useful screen in the app. Modelling hidden fees helps;
 * knowing which questions force them into the open before anything is signed
 * helps more.
 */
export function QuestionsPanel({ careType }: { careType: CareType }) {
  const groups = questionsFor(careType);

  return (
    <section className="card" aria-labelledby="questions-heading">
      <h2 id="questions-heading">Questions to ask before signing anything</h2>
      <p>
        Most of the costs that surprise families are answerable in advance. These are the
        questions that surface them. Ask for the answers in writing.
      </p>

      {groups.map((group) => (
        <div key={group.id} data-testid={`questions-${group.id}`}>
          <h3>{group.title}</h3>
          <p className="hint">{group.intro}</p>
          <ul className="checklist">
            {group.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
