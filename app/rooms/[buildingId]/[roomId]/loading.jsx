export default function Loading() {
  return (
    <div className="min-h-screen bg-[#091426] px-4 pb-12 pt-28 text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="h-[460px] animate-pulse rounded-[2rem] bg-white/10" />
        <div className="h-[520px] animate-pulse rounded-[20px] bg-white/10" />
      </div>
    </div>
  );
}
