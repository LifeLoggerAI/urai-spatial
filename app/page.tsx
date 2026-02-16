import LifeMapCanvas from "@/components/lifemap/LifeMapCanvas";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="absolute top-0 left-0 w-full h-full">
        <LifeMapCanvas />
      </div>
      <div className="z-10">
        <h1 className="text-4xl font-bold text-center text-white">URAI</h1>
      </div>
    </main>
  );
}
