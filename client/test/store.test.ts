import { beforeEach, describe, expect, it } from "vitest";

import { useAppStore } from "@/utils/store";

const initial = useAppStore.getState();
beforeEach(() => useAppStore.setState(initial, true));

describe("setPlayers", () => {
  it("keeps scores of players who stay and drops those who left", () => {
    const s = useAppStore.getState();
    s.setPlayers([
      { id: "a", name: "A" },
      { id: "b", name: "B" },
    ]);
    s.updatePlayerScores((p) => ({ ...p, a: 5 }));
    s.updateFinalScores((p) => ({ ...p, a: 5 }));

    s.setPlayers([
      { id: "a", name: "A" },
      { id: "c", name: "C" },
    ]);

    const { playerScores, finalScores, playerNames } = useAppStore.getState();
    expect(playerScores).toEqual({ a: 5, c: 0 });
    expect(finalScores).toEqual({ a: 5, c: -1 });
    expect(playerNames).toEqual({ a: "A", c: "C" });
  });
});
