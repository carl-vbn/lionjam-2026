let notesAssigned = 0;
let nextNoteIndex = 0;

/** Attempt to assign a note to a tree.
 *  Probability increases logarithmically with distance from origin, reaching 50% at 200 tiles.
 *  Capped at the total number of available notes. */
export function tryClaimNote(sitanceSq: number): boolean {
    if (notesAssigned >= notes.length) return false;
    const p = sitanceSq / 4000000;
    if (Math.random() >= p) return false;
    notesAssigned++;
    return true;
}

/** Release a previously claimed note slot so a new tree can claim it. */
export function releaseNote(): void {
    if (notesAssigned > 0) notesAssigned--;
}

/** Returns the next unread note text, or null if all notes have been read. */
export function openNextNote(): string | null {
    if (nextNoteIndex >= notes.length) return null;
    return notes[nextNoteIndex++];
}

const notes = [
`Day 12 on the Island

I had to build a shelter to protect myself
from the creatures of this island. I find
them terribly cute but whenever I get close
they attack. The shelter is crude but offers
enough respite to recover. This place is
dangerous, it is easy to become lost, I
must be sure to keep my wits about me.`,

`Day 37 on the Island

I am starting to lose hope of anyone coming
to my rescue. The collection of planes and
boats crashed here suggests it is not a
place many make it to, or out of, alive.
They have provided me with much useful
material though, and I am grateful for the
occasional bottled water, it tastes much
better than my boiled water.`,

`Day 83 on the Island

I have seen some boats and planes passing
in the distance, but have failed to catch
their attention. I attempted to build a
large fire, hopeful that the flame would
shine bright through the night. But I have
lived off of mangos and coconuts far too
long. I am too weak.`,

`Day 149 on the Island

I hear the trees speaking to me, calling
to me. I observe the ruins of man's
creations, battered and overcome with
greenery. I too will return, they tell me,
I will return to the earth and become one
with the island.`,

`Day 182 on the Island

I have started scattering my notes around
the island, hoping that if someone else ends
up here they might find them and learn from
my experience. I have no way of knowing if
anyone will ever read them, but it gives me
a sense of purpose to write them.`,
];