import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Game from "@/components/Game";
import Results from "@/components/Results";
import { DEFAULT_TIMEOUT } from "@/utils/constants";
import { numToString } from "@/utils/numberConverter";
import { numberAt } from "@/utils/random";
import { leaveRoom } from "@/utils/session";
import { useAppStore } from "@/utils/store";

type Listener = (...args: unknown[]) => void;

// Minimal stand-in for a Colyseus SDK Room: records callbacks so tests can
// fire server events, and leave() stays pending until the test resolves it.
class FakeRoom {
  sessionId: string;
  roomId = "room1";
  name = "en";
  reconnection = { enabled: true };
  messages: Record<string, Listener> = {};
  leaveListeners: Listener[] = [];
  resolveLeave: () => void = () => {};
  leave = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        this.resolveLeave = () => {
          this.leaveListeners.forEach((cb) => cb(4000));
          resolve();
        };
      }),
  );
  send = vi.fn();

  constructor(id: string) {
    this.sessionId = id;
  }
  onMessage(type: string, cb: Listener) {
    this.messages[type] = cb;
  }
  onLeave(cb: Listener) {
    this.leaveListeners.push(cb);
  }
  onDrop() {}
  onError() {}
  emit(type: string, payload: unknown) {
    act(() => this.messages[type](payload));
  }
}

const { joinOrCreate } = vi.hoisted(() => ({ joinOrCreate: vi.fn() }));
vi.mock("@/utils/multiplayer", () => ({ CLIENT: { joinOrCreate } }));

const initialStore = useAppStore.getState();

// Mirrors app/page.tsx without next/dynamic.
const App = () => (useAppStore().isCompleted ? <Results /> : <Game />);

beforeEach(() => {
  useAppStore.setState(initialStore, true);
  joinOrCreate.mockReset();
  localStorage.clear();
});
afterEach(() => {
  act(() => leaveRoom());
  cleanup();
  vi.useRealTimers();
});

const answerInput = () => screen.getByLabelText("Your answer in digits");
const prompt = () => screen.getByRole("heading", { level: 1 }).textContent;

const join = async (room: FakeRoom, name = "") => {
  joinOrCreate.mockResolvedValueOnce(room);
  if (name) await userEvent.type(screen.getByLabelText("Your name"), name);
  await userEvent.click(screen.getByText("Play with friends"));
  await screen.findByText("Leave room");
};

describe("joining", () => {
  it("sends the player's name and remembers it", async () => {
    render(<Game />);
    await join(new FakeRoom("a"), "Ada");

    expect(joinOrCreate).toHaveBeenCalledWith("en", { name: "Ada" });
    expect(localStorage.getItem("numlingo:name")).toBe("Ada");
  });

  it("asks for the seed and player list once its handlers are registered", async () => {
    render(<Game />);
    const room = new FakeRoom("a");
    let registered: string[] = [];
    room.send.mockImplementation((type: string) => {
      if (type === "sync") registered = Object.keys(room.messages);
    });
    await join(room);
    expect(room.send).toHaveBeenCalledWith("sync");
    expect(registered).toEqual(expect.arrayContaining(["players", "round"]));
  });

  it("shows player names on the leaderboard", async () => {
    render(<Game />);
    const room = new FakeRoom("a");
    await join(room);
    room.emit("players", [
      { id: "a", name: "Ada" },
      { id: "b", name: "Bo" },
    ]);

    expect(screen.getByText("Ada")).toBeTruthy();
    expect(screen.getByText("Bo")).toBeTruthy();
    expect(screen.getByText("(you)")).toBeTruthy();
  });
});

describe("prompts", () => {
  it("follows the room's seed so every player sees the same numbers", async () => {
    render(<Game />);
    const room = new FakeRoom("a");
    await join(room);
    room.emit("round", { seed: 123 });

    expect(prompt()).toBe(numToString(numberAt(123, 0), "en"));

    await userEvent.type(answerInput(), `${numberAt(123, 0)}{Enter}`);
    expect(prompt()).toBe(numToString(numberAt(123, 1), "en"));
    expect(room.send).toHaveBeenCalledWith("solve");
  });

  it("records a wrong answer with its number and keeps the prompt", async () => {
    render(<Game />);
    const room = new FakeRoom("a");
    await join(room);
    room.emit("round", { seed: 9 });
    const answer = numberAt(9, 0);
    const before = prompt();

    await userEvent.type(answerInput(), `${(answer + 1) % 1000}{Enter}`);

    expect(prompt()).toBe(before);
    expect(useAppStore.getState().incorrect).toEqual({
      [before!]: { number: answer, count: 1 },
    });
    expect(screen.getByTestId("answer-slots").dataset.flash).toBe("miss");
  });

  it("ignores Enter with nothing typed", async () => {
    render(<Game />);
    fireEvent.keyDown(answerInput(), { key: "Enter" });

    expect(useAppStore.getState().attempted).toBe(0);
  });

  it("keeps only digits, up to three", async () => {
    render(<Game />);
    await userEvent.type(answerInput(), "1a2-34");

    expect((answerInput() as HTMLInputElement).value).toBe("123");
  });
});

describe("timer", () => {
  it("ends the round after the time limit, measured from the start", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
    render(<App />);
    fireEvent.change(answerInput(), { target: { value: "1" } });

    act(() => vi.advanceTimersByTime((DEFAULT_TIMEOUT - 1) * 1000));
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "1",
    );

    act(() => vi.advanceTimersByTime(1000));
    expect(useAppStore.getState().isCompleted).toBe(true);
    expect(screen.getByText("No answers submitted")).toBeTruthy();
  });
});

describe("leaving", () => {
  it("resets the UI without waiting for the server", async () => {
    render(<Game />);
    const room = new FakeRoom("a");
    await join(room);
    room.emit("players", [{ id: "a", name: "Ada" }]);

    await userEvent.click(screen.getByText("Leave room"));

    expect(room.leave).toHaveBeenCalledOnce();
    expect(room.reconnection.enabled).toBe(false);
    expect(screen.getByText("Play with friends")).toBeTruthy();
    expect(useAppStore.getState().gameRoom).toBeNull();
    expect(useAppStore.getState().playerScores).toEqual({});
  });

  it("ignores late events from a room it already left", async () => {
    render(<Game />);
    const oldRoom = new FakeRoom("old");
    await join(oldRoom);
    await userEvent.click(screen.getByText("Leave room"));

    const newRoom = new FakeRoom("new");
    await join(newRoom);
    newRoom.emit("players", [{ id: "new", name: "N" }]);

    // Server finally acks the first leave and sends a stale broadcast.
    act(() => {
      oldRoom.messages.players([{ id: "old", name: "O" }]);
      oldRoom.resolveLeave();
    });

    expect(useAppStore.getState().gameRoom).toBe(newRoom);
    expect(useAppStore.getState().playerScores).toEqual({ new: 0 });
    expect(screen.getByText("Leave room")).toBeTruthy();
  });

  it("tears down when the server disconnects the current room", async () => {
    render(<Game />);
    const room = new FakeRoom("a");
    await join(room);

    act(() => room.leaveListeners.forEach((cb) => cb(4000)));

    expect(useAppStore.getState().gameRoom).toBeNull();
    expect(screen.getByText("Play with friends")).toBeTruthy();
  });

  it("can leave in the middle of a round", async () => {
    render(<Game />);
    const room = new FakeRoom("a");
    await join(room);
    await userEvent.type(answerInput(), "5");
    expect(room.send).toHaveBeenCalledWith("start");

    await userEvent.click(screen.getByText("Leave room"));

    expect(room.leave).toHaveBeenCalledOnce();
    expect(screen.getByText(/The clock starts when you type/)).toBeTruthy();
    expect(screen.getByText("Play with friends")).toBeTruthy();
  });

  it("still controls the room after the results screen", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
    render(<App />);
    const room = new FakeRoom("a");
    joinOrCreate.mockResolvedValueOnce(room);
    await act(async () => {
      fireEvent.click(screen.getByText("Play with friends"));
    });
    fireEvent.change(answerInput(), { target: { value: "1" } });
    act(() => vi.advanceTimersByTime(DEFAULT_TIMEOUT * 1000));
    expect(room.send).toHaveBeenCalledWith("end");

    fireEvent.click(screen.getByText("Play again"));
    fireEvent.change(answerInput(), { target: { value: "1" } });
    expect(room.send).toHaveBeenLastCalledWith("start");

    fireEvent.click(screen.getByText("Leave room"));
    expect(room.leave).toHaveBeenCalledOnce();
  });
});

describe("compatibility", () => {
  it("accepts the old players format (bare ids)", async () => {
    render(<Game />);
    const room = new FakeRoom("a");
    await join(room);
    room.emit("players", ["a", "b"]);

    expect(useAppStore.getState().playerScores).toEqual({ a: 0, b: 0 });
  });
});
