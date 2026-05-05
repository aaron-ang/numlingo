"use client";

import dynamic from "next/dynamic";
import Results from "@/components/Results";
import { useAppStore } from "@/utils/store";

const Game = dynamic(() => import("@/components/Game"), { ssr: false });

const Home = () => {
  const { isCompleted } = useAppStore();
  return (
    <div className="flex h-[87vh] w-full items-center justify-center">
      <div className="flex w-3/4 flex-col items-center">
        {isCompleted ? <Results /> : <Game />}
      </div>
    </div>
  );
};

export default Home;
