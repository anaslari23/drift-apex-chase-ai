
import GameCanvas from '@/components/GameCanvas';
import { Suspense } from 'react';
import { Loader } from "@/components/ui/loader";

const Index = () => {
  return (
    <div className="min-h-screen w-full overflow-hidden relative bg-black">
      <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader className="w-12 h-12 text-white" /></div>}>
        <GameCanvas />
      </Suspense>
    </div>
  );
};

export default Index;
