import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { RoomCard, roomCardGridColumnsClassName } from "./RoomCard";
import { Button } from "@/components/ui/button";

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
  activePlayers: number;
  maxPlayers: number;
  lastActiveAt: number;
  createdAt: number;
};

type RoomListProps = {
  rooms: RoomListItem[] | undefined;
  joiningRoomCode: string | null;
  onOpenRoom: (roomCode: string) => void;
};

export function RoomList({
  rooms,
  joiningRoomCode,
  onOpenRoom,
}: RoomListProps) {
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
          const disabled = isJoining || isFull;

          return (
            <RoomCard
              roomCode={room.code}
              roomTitle={room.title}
              config={room.config}
              activePlayers={room.activePlayers}
              maxPlayers={room.maxPlayers}
              lastActiveAt={room.lastActiveAt}
              createdAt={room.createdAt}
              isJoining={isJoining}
              onClick={() => onOpenRoom(room.code)}
              disabled={disabled}
            />
          );
        },
      },
      {
        accessorFn: (row) => row.activePlayers / row.maxPlayers,
        id: "status",
        header: "Status",
        sortingFn: "basic",
        cell: () => null,
      },
      {
        accessorKey: "activePlayers",
        header: "Players",
        sortingFn: "basic",
        cell: () => null,
      },
      {
        accessorKey: "lastActiveAt",
        header: "Next",
        sortingFn: "basic",
        cell: () => null,
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        sortingFn: "basic",
        cell: () => null,
      },
    ],
    [joiningRoomCode, onOpenRoom],
  );

  const table = useReactTable({
    data: rooms ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
  });

  if (rooms === undefined) {
    return (
      <div className="py-8 text-center text-sm text-cream/50">
        Loading rooms...
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-cream/50">
        No active games yet.
      </div>
    );
  }

  const headerGroups = table.getHeaderGroups();

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <div className="min-w-max space-y-2">
          <div className="rounded-2xl border border-cream/10 bg-cream/5 px-4 py-2">
            <div
              className={`grid ${roomCardGridColumnsClassName} gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-gold`}
            >
              {headerGroups[0]?.headers.map((header) => (
                <div
                  key={header.id}
                  className={
                    header.id === "activePlayers" ||
                    header.id === "lastActiveAt" ||
                    header.id === "createdAt"
                      ? "text-right"
                      : ""
                  }
                >
                  <button
                    type="button"
                    onClick={header.column.getToggleSortingHandler()}
                    className={`flex items-center gap-1 transition-colors hover:text-gold-bright ${
                      header.id === "activePlayers" ||
                      header.id === "lastActiveAt" ||
                      header.id === "createdAt"
                        ? "justify-end"
                        : ""
                    }`}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    {header.column.getCanSort() && (
                      <span className="inline-flex">
                        {header.column.getIsSorted() === "desc" ? (
                          <ArrowDown className="h-3 w-3" />
                        ) : header.column.getIsSorted() === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-50" />
                        )}
                      </span>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {table.getRowModel().rows.map((row) => (
            <div key={row.id}>
              {flexRender(
                row.getVisibleCells()[0].column.columnDef.cell,
                row.getVisibleCells()[0].getContext(),
              )}
            </div>
          ))}
        </div>
      </div>

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between gap-4 pt-2">
          <p className="text-xs text-cream/50">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              variant="secondary"
            >
              Previous
            </Button>
            <Button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              variant="primary"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
