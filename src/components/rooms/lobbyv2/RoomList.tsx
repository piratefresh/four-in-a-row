import { useEffect, useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpRight, ChevronsUpDown } from "lucide-react";
import { RoomRow } from "./RoomRow";

type RoomListItem = {
  _id: string;
  code: string;
  title?: string | null;
  config?: {
    showdownTimer?: number;
    bettingStructure?: string;
    choiceTileFrequency?: string;
    bonusStructure?: string;
  };
  economyMode?: string | null;
  buyIn?: number | null;
  activePlayers: number;
  maxPlayers: number;
  lastActiveAt: number;
  createdAt: number;
  isHot?: boolean;
  playerInitials?: string[];
};

interface RoomListProps {
  rooms: RoomListItem[] | undefined;
  joiningRoomCode: string | null;
  onOpenRoom: (roomCode: string) => void;
}

export function RoomList({
  rooms,
  joiningRoomCode,
  onOpenRoom,
}: RoomListProps) {
  const currentTime = useCurrentTime(1_000);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);

  const columns = useMemo<ColumnDef<RoomListItem>[]>(
    () => [
      {
        accessorKey: "code",
        header: "Room",
        cell: ({ row }) => {
          const room = row.original;
          const isJoining = joiningRoomCode === room.code;
          const isFull = room.activePlayers >= room.maxPlayers;
          const isLive = currentTime - room.lastActiveAt < 60_000 && !isFull;
          const status = isFull ? "full" : isLive ? "live" : "open";

          return (
            <RoomRow
              roomCode={room.code}
              roomTitle={room.title}
              configLabel={formatRoomConfig(room.config)}
              activePlayers={room.activePlayers}
              maxPlayers={room.maxPlayers}
              economyMode={room.economyMode}
              buyIn={room.buyIn}
              status={status}
              lastActiveAt={room.lastActiveAt}
              currentTime={currentTime}
              isHot={room.isHot}
              isJoining={isJoining}
              playerInitials={room.playerInitials}
              onClick={() => onOpenRoom(room.code)}
            />
          );
        },
      },
      { accessorKey: "activePlayers", id: "seats", header: "Seats" },
      { accessorKey: "buyIn", id: "buyin", header: "Buy-in" },
      { accessorKey: "createdAt", id: "trend", header: "Trend" },
    ],
    [currentTime, joiningRoomCode, onOpenRoom],
  );

  const table = useReactTable({
    data: rooms ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (rooms === undefined) {
    return (
      <div className="py-8 text-center font-mono text-sm text-cream/50">
        Loading rooms...
      </div>
    );
  }

  const headerGroups = table.getHeaderGroups();
  const rows = table.getRowModel().rows;

  return (
    <div className="space-y-2 px-4 sm:px-6">
      <div className="hidden grid-cols-[minmax(220px,1.6fr)_minmax(112px,1fr)_minmax(94px,0.9fr)_minmax(94px,0.8fr)_60px] gap-4 px-5 sm:grid">
        {headerGroups[0]?.headers.map((header) => {
          const isTrend = header.id === "trend";
          return (
            <div
              key={header.id}
              className={isTrend ? "flex justify-center" : ""}
            >
              <button
                type="button"
                onClick={header.column.getToggleSortingHandler()}
                className={`inline-flex items-center gap-1 font-mono text-[10px] uppercase leading-none tracking-[0.28em] transition-colors ${
                  header.column.getIsSorted()
                    ? "text-gold"
                    : "text-cream/40 hover:text-cream/70"
                }`}
              >
                {flexRender(
                  header.column.columnDef.header,
                  header.getContext(),
                )}
                {isTrend ? (
                  <ArrowUpRight className="h-2.5 w-2.5 text-gold/50" />
                ) : header.column.getCanSort() ? (
                  <span className="inline-flex">
                    {header.column.getIsSorted() === "desc" ? (
                      <ArrowDown className="h-3 w-3" />
                    ) : header.column.getIsSorted() === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ChevronsUpDown className="h-3 w-3 opacity-40" />
                    )}
                  </span>
                ) : null}
              </button>
            </div>
          );
        })}
        <div />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-cream/10 bg-cream/[0.02] py-12 text-center">
          <p className="font-serif text-sm italic text-cream/30">
            No active rooms
          </p>
          <p className="mt-1 font-mono text-xs uppercase tracking-wider text-cream/20">
            Create one to get started
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id}>
              {flexRender(
                row.getVisibleCells()[0].column.columnDef.cell,
                row.getVisibleCells()[0].getContext(),
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function useCurrentTime(intervalMs: number) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [intervalMs]);

  return currentTime;
}

function formatRoomConfig(config: RoomListItem["config"]) {
  const seconds = Math.round((config?.showdownTimer ?? 60_000) / 1000);
  const betting =
    config?.bettingStructure === "potLimit"
      ? "Pot-limit"
      : config?.bettingStructure === "fixedLimit"
        ? "Fixed-limit"
        : "No-limit";
  const tiles =
    (config?.choiceTileFrequency ?? "high") === "high"
      ? "2-3 tiles"
      : "0-1 tiles";
  return `${seconds}s / ${betting} / ${tiles}`;
}
