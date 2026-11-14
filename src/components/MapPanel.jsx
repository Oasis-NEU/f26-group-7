// Stand-in for the map until the interactive map (roadmap step 7).
export default function MapPanel() {
  return (
    <div className="grid aspect-4/3 place-items-center border-2 border-ink bg-map-land p-6 text-center text-coal">
      <p className="max-w-56 text-sm font-bold">
        Map of Fenway and downtown with the T lines. Coming in step 7.
      </p>
    </div>
  )
}
