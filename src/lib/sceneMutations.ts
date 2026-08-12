import { Mutation, WalkthroughStep } from "./types";

/** Deterministic, idempotent application of the mutation model onto a real
 * persistent DOM tree — shared by the GSAP live player and the Remotion
 * renderer so "what does the scene look like after step N" is computed the
 * same way in both places. Idempotent because forward playback (which
 * applies mutations via scheduled callbacks) and jump/seek (which resyncs
 * by replaying from scratch) can both touch the same mutation; re-applying
 * setText/setAttr is naturally harmless, and addElement/removeElement guard
 * against double-inserting or double-removing. */

export function findMotionEl(root: HTMLElement, id: string): HTMLElement | null {
  if (!id) return null;
  return root.querySelector<HTMLElement>(`[data-motion-id="${cssEscape(id)}"]`);
}

function cssEscape(id: string): string {
  return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(id) : id.replace(/"/g, '\\"');
}

function extractMotionId(html: string): string | null {
  const match = html.match(/data-motion-id="([^"]+)"/);
  return match ? match[1] : null;
}

function parseFragment(html: string): HTMLElement | null {
  const tmp = document.createElement("div");
  tmp.innerHTML = html.trim();
  return tmp.firstElementChild as HTMLElement | null;
}

/** Applies a single mutation with no animation — used for the "instant,
 * settled" cases (jump/seek resync, and non-primary mutations that
 * accompany an animated one within the same step). Returns the newly
 * inserted element for addElement, if any, so the caller can animate it in. */
export function applyMutationInstant(root: HTMLElement, m: Mutation): HTMLElement | null {
  switch (m.op) {
    case "setText": {
      const el = findMotionEl(root, m.targetId);
      if (el) el.textContent = m.text;
      return null;
    }
    case "setAttr": {
      const el = findMotionEl(root, m.targetId);
      if (el) el.setAttribute(m.attr, m.value);
      return null;
    }
    case "addElement": {
      const parent = findMotionEl(root, m.parentId);
      if (!parent) return null;
      const newId = extractMotionId(m.html);
      if (newId && findMotionEl(root, newId)) return null; // already applied
      const el = parseFragment(m.html);
      if (!el) return null;
      if (m.position === "start") parent.insertBefore(el, parent.firstChild);
      else parent.appendChild(el);
      return el;
    }
    case "removeElement": {
      const el = findMotionEl(root, m.targetId);
      el?.remove();
      return null;
    }
    default:
      return null;
  }
}

/** Full reset-and-replay to the settled state as of the end of
 * `targetIndex`. Used whenever the playhead jumps discontinuously (step
 * pills, scrub, restart) instead of relying on forward-playback callbacks,
 * since those can't reliably fire "in reverse" during an arbitrary seek. */
export function resyncSceneToStep(
  root: HTMLElement,
  baseHtml: string,
  steps: Pick<WalkthroughStep, "mutations">[],
  targetIndex: number
): void {
  root.innerHTML = baseHtml;
  for (let i = 0; i <= targetIndex && i < steps.length; i++) {
    for (const m of steps[i].mutations) applyMutationInstant(root, m);
  }
}
