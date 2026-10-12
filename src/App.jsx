export default function App() {
  return (
    <div className="flex flex-col items-start gap-6 p-10">
      <h1 className="text-display font-extrabold">Espial</h1>
      <p className="bg-ink px-4 py-3 font-bold text-on-ink">Filled button</p>
      <p className="bg-alert px-2.5 py-1 font-bold text-coal">
        Delayed: alert chip
      </p>
      <p className="border-2 border-badge-ring bg-green-line px-1.5 text-xs font-bold text-white">
        GL E
      </p>
    </div>
  )
}