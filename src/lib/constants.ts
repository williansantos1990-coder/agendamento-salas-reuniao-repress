export const ROOM_COLORS = [
  'bg-blue-100 border-blue-200 text-blue-800',
  'bg-emerald-100 border-emerald-200 text-emerald-800',
  'bg-violet-100 border-violet-200 text-violet-800',
  'bg-amber-100 border-amber-200 text-amber-800',
  'bg-rose-100 border-rose-200 text-rose-800',
  'bg-cyan-100 border-cyan-200 text-cyan-800',
  'bg-fuchsia-100 border-fuchsia-200 text-fuchsia-800',
  'bg-lime-100 border-lime-200 text-lime-800',
]

export const getRoomColor = (index: number) => {
  return ROOM_COLORS[index % ROOM_COLORS.length]
}
