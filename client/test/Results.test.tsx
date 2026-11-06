import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import Results from "@/components/Results";
import type { Room } from "@colyseus/sdk";
import { useAppStore } from "@/utils/store";

const initial = useAppStore.getState();
beforeEach(() => useAppStore.setState({ ...initial, isCompleted: true }, true));
afterEach(cleanup);

describe("Results", () => {
  it("handles a round with no answers", () => {
    render(<Results />);
    expect(screen.getByText("No answers submitted")).toBeTruthy();
    expect(screen.queryByText(/NaN/)).toBeNull();
  });

  it("shows accuracy and missed numbers", () => {
    useAppStore.setState({
      solved: 3,
      attempted: 4,
      incorrect: { "forty-two": { number: 42, count: 2 } },
    });
    render(<Results />);
    expect(screen.getByText("75% accuracy over 4 answers")).toBeTruthy();
    expect(screen.getByText("forty-two")).toBeTruthy();
    expect(screen.getByText("×2")).toBeTruthy();
    expect(screen.getByText("42")).toBeTruthy();
  });

  it("resets the round on Play again", async () => {
    useAppStore.setState({
      solved: 3,
      attempted: 4,
      incorrect: { x: { number: 1, count: 1 } },
    });
    render(<Results />);
    await userEvent.click(screen.getByText("Play again"));

    const s = useAppStore.getState();
    expect([s.solved, s.attempted, s.incorrect, s.isCompleted]).toEqual([
      0,
      0,
      {},
      false,
    ]);
  });

  it("waits for others mid-round before Play again in a room", () => {
    useAppStore.setState({
      gameRoom: { sessionId: "me", roomId: "r" } as unknown as Room,
      playerNames: { me: "Me", b: "B", c: "C" },
      playerStatus: { me: "done", b: "playing", c: "idle" },
      finalScores: { me: 4, b: -1, c: -1 },
    });
    render(<Results />);

    const button = screen.getByRole("button", {
      name: "Waiting for others to finish…",
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    // b is mid-round; c never started and is left off the final board.
    expect(screen.getByText("still playing")).toBeTruthy();
    expect(screen.queryByText("C")).toBeNull();
  });

  it("allows Play again once nobody else is mid-round", () => {
    useAppStore.setState({
      gameRoom: { sessionId: "me", roomId: "r" } as unknown as Room,
      playerNames: { me: "Me", b: "B" },
      playerStatus: { me: "idle", b: "idle" },
      finalScores: { me: 4, b: 2 },
    });
    render(<Results />);

    expect(
      (screen.getByRole("button", { name: "Play again" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    expect(screen.getByText("B")).toBeTruthy();
  });
});
