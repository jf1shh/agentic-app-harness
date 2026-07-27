'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FacilityNote } from '@/lib/schemas';
import {
  MAX_PHOTOS_PER_FACILITY,
  capCheck,
  deletePhoto,
  estimateUsage,
  loadPhoto,
  photoFailureMessage,
  storePhoto,
  type PhotoFailure,
} from '@/lib/photos';
import { makeId } from '@/lib/format';

/**
 * Photographs from a tour (spec §11.2.4).
 *
 * The bytes live in IndexedDB and only the ids reach `PlannerState`, so a photo
 * can never take the plan payload down with it — see the note at the top of
 * `lib/photos.ts`, which is where the reasoning lives.
 *
 * Object URLs are created per rendered image and revoked when the id set
 * changes or the component unmounts. Leaking them would hold the decoded image
 * in memory for the life of the page, which on a phone in a hospital corridor
 * is exactly the wrong place to be careless.
 */
export function FacilityPhotos({
  facility,
  totalPhotos,
  onChange,
}: {
  facility: FacilityNote;
  /** Across the whole shortlist — the overall cap is not per community. */
  totalPhotos: number;
  onChange: (id: string, patch: Partial<FacilityNote>) => void;
}) {
  const [urls, setUrls] = useState<readonly { id: string; url: string }[]>([]);
  const [problem, setProblem] = useState<PhotoFailure | null>(null);
  const [nearLimit, setNearLimit] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const ids = facility.photoIds.join(',');

  // Load whatever is in the store for this facility, and hand back the object
  // URLs when the set changes. The cleanup runs on every change of `ids`, not
  // only on unmount, so replacing a photo does not strand the old URL.
  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];

    (async () => {
      const loaded: { id: string; url: string }[] = [];
      for (const id of facility.photoIds) {
        const blob = await loadPhoto(id);
        if (blob) {
          const url = URL.createObjectURL(blob);
          created.push(url);
          loaded.push({ id, url });
        }
      }
      if (cancelled) {
        for (const url of created) URL.revokeObjectURL(url);
        return;
      }
      setUrls(loaded);
    })();

    return () => {
      cancelled = true;
      for (const url of created) URL.revokeObjectURL(url);
    };
    // `ids` is the stable projection of `facility.photoIds`; depending on the
    // array itself would re-run this on every keystroke elsewhere in the card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  const onPick = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setProblem(null);

      const accepted: string[] = [];
      for (const file of Array.from(files)) {
        const cap = capCheck(
          facility.photoIds.length + accepted.length,
          totalPhotos + accepted.length,
        );
        if (!cap.ok) {
          setProblem(cap.reason);
          break;
        }
        const result = await storePhoto(file, makeId('photo'));
        if (!result.ok) {
          setProblem(result.reason);
          break;
        }
        accepted.push(result.value);
      }

      if (accepted.length > 0) {
        onChange(facility.id, { photoIds: [...facility.photoIds, ...accepted] });
      }
      const usage = await estimateUsage();
      setNearLimit(usage?.nearLimit ?? false);
      // Let the same file be picked again after a removal.
      if (inputRef.current) inputRef.current.value = '';
    },
    [facility.id, facility.photoIds, totalPhotos, onChange],
  );

  const remove = useCallback(
    async (id: string) => {
      await deletePhoto(id);
      onChange(facility.id, { photoIds: facility.photoIds.filter((p) => p !== id) });
    },
    [facility.id, facility.photoIds, onChange],
  );

  return (
    <div className="photos" data-testid={`photos-${facility.id}`}>
      <label htmlFor={`photo-input-${facility.id}`}>
        Photos from the visit
        <span className="hint">
          Up to {MAX_PHOTOS_PER_FACILITY} per community, kept on this device only and never
          uploaded. Photographs taken inside a community may include other residents, who have not
          agreed to being in them.
        </span>
      </label>
      <input
        ref={inputRef}
        id={`photo-input-${facility.id}`}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          void onPick(e.target.files);
        }}
      />

      {problem ? (
        <p className="callout" role="status" data-testid={`photo-problem-${facility.id}`}>
          {photoFailureMessage(problem)}
        </p>
      ) : null}

      {nearLimit ? (
        <p className="callout" role="status" data-testid={`photo-quota-${facility.id}`}>
          This browser&rsquo;s storage for this site is more than 80% full. Removing a few photos
          now avoids a failed save later.
        </p>
      ) : null}

      {urls.length > 0 ? (
        <ul className="photo-strip">
          {urls.map(({ id, url }, index) => (
            <li key={id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Photo ${index + 1} taken at ${facility.label}`} />
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  void remove(id);
                }}
              >
                Remove photo {index + 1} of {facility.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
