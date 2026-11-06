"use client";

import dynamic from "next/dynamic";
import Results from "@/components/Results";
import { useAppStore } from "@/utils/store";

const Game = dynamic(() => import("@/components/Game"), { ssr: false });

const Home = () => {
  const { isCompleted, gameKey } = useAppStore();
  return (
    <main className="mx-auto flex min-h-[calc(100svh-5rem)] w-full max-w-3xl flex-col items-center justify-center px-6 py-12">
      {isCompleted ? <Results /> : <Game key={gameKey} />}
    </main>
  );
};

export default Home;
