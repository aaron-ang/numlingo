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
import Navbar from "@/components/Navbar";
import Results from "@/components/Results";
import { DEFAULT_TIMEOUT } from "@/utils/constants";
import { numToString } from "@/utils/numberConverter";
import { MAX_DIGITS, numberAt } from "@/utils/random";
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

const { joinOrCreate, create, joinById } = vi.hoisted(() => ({
  joinOrCreate: vi.fn(),
  create: vi.fn(),
  joinById: vi.fn(),
}));
vi.mock("@/utils/multiplayer", () => ({
  CLIENT: { joinOrCreate, create, joinById },
}));

const initialStore = useAppStore.getState();

// Mirrors app/page.tsx without next/dynamic.
const App = () => {
  const { isCompleted, gameKey } = useAppStore();
  return isCompleted ? <Results /> : <Game key={gameKey} />;
};

beforeEach(() => {
  useAppStore.setState(initialStore, true);
  joinOrCreate.mockReset();
  create.mockReset();
  joinById.mockReset();
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
  await userEvent.click(screen.getByText("Quick match"));
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

describe("private rooms", () => {
  it("creates a private room and shows its code", async () => {
    render(<Game />);
    const room = new FakeRoom("a");
    room.roomId = "K7QPX";
    create.mockResolvedValueOnce(room);

    await userEvent.click(screen.getByText("Create room"));
    await screen.findByText("Leave room");

    expect(create).toHaveBeenCalledWith("en", { name: "", private: true });
    expect(screen.getByLabelText("Copy room code K7QPX")).toBeTruthy();
  });

  it("joins by code and switches to the room's language", async () => {
    render(<Game />);
    const room = new FakeRoom("a");
    room.name = "fr";
    joinById.mockResolvedValueOnce(room);

    await userEvent.type(screen.getByLabelText("Room code"), "k7q-px");
    await userEvent.click(screen.getByText("Join"));
    await screen.findByText("Leave room");

    expect(joinById).toHaveBeenCalledWith("K7QPX", { name: "" });
    expect(useAppStore.getState().locale).toBe("fr");
  });

  it("says when a code matches no room", async () => {
    render(<Game />);
    joinById.mockRejectedValueOnce(new Error('room "ZZZZZ" not found'));

    await userEvent.type(screen.getByLabelText("Room code"), "zzzzz");
    await userEvent.click(screen.getByText("Join"));

    expect(await screen.findByText("No room with code ZZZZZ.")).toBeTruthy();
    expect(screen.getByText("Quick match")).toBeTruthy();
  });

  it("says when the room is mid-round", async () => {
    render(<Game />);
    joinById.mockRejectedValueOnce(new Error('room "K7QPX" is locked'));

    await userEvent.type(screen.getByLabelText("Room code"), "K7QPX");
    await userEvent.click(screen.getByText("Join"));

    expect(
      await screen.findByText(
        "Room K7QPX is full or mid-round. Try again later.",
      ),
    ).toBeTruthy();
  });
});

// A seed whose first number has three digits, so partial answers exist.
const SEED = Array.from({ length: 1000 }, (_, i) => i).find(
  (s) => numberAt(s, 0) >= 100,
)!;
const ANSWER = String(numberAt(SEED, 0));
const WRONG = ANSWER.slice(0, -1) + ((Number(ANSWER.at(-1)) + 1) % 10);

const joinSeeded = async () => {
  render(<Game />);
  const room = new FakeRoom("a");
  await join(room);
  room.emit("round", { seed: SEED });
  return room;
};

describe("prompts", () => {
  it("follows the room's seed so every player sees the same numbers", async () => {
    const room = await joinSeeded();
    expect(prompt()).toBe(numToString(numberAt(SEED, 0), "en"));

    await userEvent.type(answerInput(), `${ANSWER}{Enter}`);
    expect(prompt()).toBe(numToString(numberAt(SEED, 1), "en"));
    expect(room.send).toHaveBeenCalledWith("solve");
  });

  it("waits for Enter before checking", async () => {
    await joinSeeded();
    await userEvent.type(answerInput(), ANSWER);

    expect(useAppStore.getState().attempted).toBe(0);
    expect((answerInput() as HTMLInputElement).value).toBe(ANSWER);
  });

  it("submits with the Check button, for keypads without Enter", async () => {
    const room = await joinSeeded();
    await userEvent.type(answerInput(), ANSWER);
    await userEvent.click(screen.getByRole("button", { name: "Check" }));

    expect(prompt()).toBe(numToString(numberAt(SEED, 1), "en"));
    expect(room.send).toHaveBeenCalledWith("solve");
  });

  it("ignores Enter with nothing typed", async () => {
    render(<Game />);
    fireEvent.keyDown(answerInput(), { key: "Enter" });

    expect(useAppStore.getState().attempted).toBe(0);
  });

  it("records a wrong answer with its number and keeps the prompt", async () => {
    await joinSeeded();
    const before = prompt();

    await userEvent.type(answerInput(), `${WRONG}{Enter}`);

    expect(prompt()).toBe(before);
    expect(useAppStore.getState().incorrect).toEqual({
      [before!]: { number: Number(ANSWER), count: 1 },
    });
    expect(screen.getByTestId("answer-field").dataset.flash).toBe("miss");
    expect((answerInput() as HTMLInputElement).value).toBe("");
  });

  it("drops the miss feedback once the player types again", async () => {
    await joinSeeded();
    await userEvent.type(answerInput(), `${WRONG}{Enter}`);
    await userEvent.type(answerInput(), ANSWER[0]);

    expect(screen.getByTestId("answer-field").dataset.flash).toBeUndefined();
  });

  it("caps the answer at the longest number's length", async () => {
    render(<Game />);
    await userEvent.type(answerInput(), "1".repeat(MAX_DIGITS + 1));

    expect((answerInput() as HTMLInputElement).value).toBe(
      "1".repeat(MAX_DIGITS),
    );
  });

  it("ignores non-digits", async () => {
    await joinSeeded();
    await userEvent.type(answerInput(), "a-" + ANSWER[0] + "x");

    expect((answerInput() as HTMLInputElement).value).toBe(ANSWER[0]);
  });
});

describe("logo", () => {
  const renderApp = () =>
    render(
      <>
        <Navbar />
        <App />
      </>,
    );
  const logo = () => screen.getByText("Numlingo");

  it("solo, abandons the round and starts fresh", async () => {
    renderApp();
    await userEvent.type(answerInput(), "1");

    await userEvent.click(logo());

    expect(useAppStore.getState().isCompleted).toBe(false);
    expect(useAppStore.getState().attempted).toBe(0);
    expect(screen.getByText(/clock starts when you type/)).toBeTruthy();
    expect((answerInput() as HTMLInputElement).value).toBe("");
  });

  it("in a room, finishes the shared round early", async () => {
    renderApp();
    const room = new FakeRoom("a");
    await join(room);
    room.emit("round", { seed: SEED });
    await userEvent.type(answerInput(), `${ANSWER}{Enter}`);

    await userEvent.click(logo());

    expect(room.send).toHaveBeenLastCalledWith("end");
    expect(useAppStore.getState().isCompleted).toBe(true);
    expect(useAppStore.getState().gameRoom).toBe(room);
  });

  it("acts as Play again on the results screen", async () => {
    renderApp();
    act(() => useAppStore.setState({ isCompleted: true }));

    await userEvent.click(logo());

    expect(useAppStore.getState().isCompleted).toBe(false);
  });

  it("does nothing on the results screen while others still play", async () => {
    renderApp();
    const room = new FakeRoom("a");
    await join(room);
    room.emit("players", [
      { id: "a", name: "A", status: "done" },
      { id: "b", name: "B", status: "playing" },
    ]);
    act(() => useAppStore.setState({ isCompleted: true }));

    await userEvent.click(logo());

    expect(useAppStore.getState().isCompleted).toBe(true);
  });

  it("leaves a modified click to the browser", async () => {
    renderApp();
    act(() => useAppStore.setState({ isCompleted: true }));

    fireEvent.click(logo(), { metaKey: true });

    expect(useAppStore.getState().isCompleted).toBe(true);
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
    expect(screen.getByText("Quick match")).toBeTruthy();
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
    expect(screen.getByText("Quick match")).toBeTruthy();
  });

  it("can leave in the middle of a round", async () => {
    render(<Game />);
    const room = new FakeRoom("a");
    await join(room);
    await userEvent.type(answerInput(), "5");
    expect(room.send).toHaveBeenCalledWith("start");

    await userEvent.click(screen.getByText("Leave room"));

    expect(room.leave).toHaveBeenCalledOnce();
    expect(screen.getByText(/clock starts when you type/)).toBeTruthy();
    expect(screen.getByText("Quick match")).toBeTruthy();
  });

  it("still controls the room after the results screen", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
    render(<App />);
    const room = new FakeRoom("a");
    joinOrCreate.mockResolvedValueOnce(room);
    await act(async () => {
      fireEvent.click(screen.getByText("Quick match"));
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
