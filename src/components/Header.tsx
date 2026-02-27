import { Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getInitials(name: string | undefined) {
  const safe = name?.trim();
  if (!safe) return "U";
  return safe[0]?.toUpperCase() ?? "U";
}

export default function Header() {
  const { data: session } = authClient.useSession();
  const displayName =
    session?.user?.name?.trim() || session?.user?.email || "User";

  return (
    <>
      <header className="flex h-16 items-center justify-between px-4 bg-['#D9D9D9'] text-black shadow-lg">
        <div className="flex items-center">
          <h1 className="ml-4 text-xl font-semibold">
            <Link to="/">Word Poker</Link>
          </h1>
        </div>
        {session?.user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-black/5"
              >
                <Avatar className="h-8 w-8 border border-black/15">
                  <AvatarImage src={session.user.image ?? undefined} alt={`${displayName} avatar`} />
                  <AvatarFallback className="bg-neutral-200 text-xs font-semibold text-neutral-700">
                    {getInitials(session.user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-1">
                  <p className="max-w-40 truncate text-sm sm:max-w-xs">{displayName}</p>
                  <ChevronDown className="h-4 w-4 text-black/60" />
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="max-w-48 truncate">
                {displayName}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  void authClient.signOut();
                }}
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link
            to="/login"
            className="rounded-md border border-black/20 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-black/5"
          >
            Login
          </Link>
        )}
      </header>
    </>
  );
}
