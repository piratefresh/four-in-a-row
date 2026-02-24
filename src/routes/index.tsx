import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import {
  Zap,
  Server,
  Route as RouteIcon,
  Shield,
  Waves,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/")({ component: App });

function App() {
  const navigate = useNavigate();
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const convexAuthUser = useQuery(api.auth.getCurrentUser);
  const rooms = useQuery(api.rooms.listRooms);
  const ensureSeedRooms = useMutation(api.rooms.ensureSeedRooms);
  const joinRoom = useMutation(api.rooms.joinRoom);
  const seededRef = useRef(false);
  const [joiningRoomCode, setJoiningRoomCode] = useState<string | null>(null);
  const [joinMessage, setJoinMessage] = useState<string | null>(null);

  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    void ensureSeedRooms({});
  }, [ensureSeedRooms]);

  const handleJoinRoom = async (roomCode: string) => {
    if (!session?.user) {
      await navigate({ to: "/login" });
      return;
    }
    if (convexAuthUser === undefined) {
      setJoinMessage("Checking authentication, please try again in a moment.");
      return;
    }
    if (!convexAuthUser) {
      setJoinMessage("Convex auth is not ready. Please sign out and sign back in.");
      return;
    }

    const displayName =
      session?.user?.name?.trim() || session?.user?.email || "Player";

    setJoiningRoomCode(roomCode);
    setJoinMessage(null);

    try {
      const result = await joinRoom({
        code: roomCode,
        name: displayName,
      });
      await navigate({ to: "/rooms/$code", params: { code: result.code } });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to join room.";
      setJoinMessage(message);
    } finally {
      setJoiningRoomCode(null);
    }
  };

  const features = [
    {
      icon: <Zap className="w-12 h-12 text-cyan-400" />,
      title: "Powerful Server Functions",
      description:
        "Write server-side code that seamlessly integrates with your client components. Type-safe, secure, and simple.",
    },
    {
      icon: <Server className="w-12 h-12 text-cyan-400" />,
      title: "Flexible Server Side Rendering",
      description:
        "Full-document SSR, streaming, and progressive enhancement out of the box. Control exactly what renders where.",
    },
    {
      icon: <RouteIcon className="w-12 h-12 text-cyan-400" />,
      title: "API Routes",
      description:
        "Build type-safe API endpoints alongside your application. No separate backend needed.",
    },
    {
      icon: <Shield className="w-12 h-12 text-cyan-400" />,
      title: "Strongly Typed Everything",
      description:
        "End-to-end type safety from server to client. Catch errors before they reach production.",
    },
    {
      icon: <Waves className="w-12 h-12 text-cyan-400" />,
      title: "Full Streaming Support",
      description:
        "Stream data from server to client progressively. Perfect for AI applications and real-time updates.",
    },
    {
      icon: <Sparkles className="w-12 h-12 text-cyan-400" />,
      title: "Next Generation Ready",
      description:
        "Built from the ground up for modern web applications. Deploy anywhere JavaScript runs.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <section className="relative py-20 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10"></div>
        <div className="relative max-w-5xl mx-auto">
          <div className="flex items-center justify-center gap-6 mb-6">
            <img
              src="/tanstack-circle-logo.png"
              alt="TanStack Logo"
              className="w-24 h-24 md:w-32 md:h-32"
            />
            <h1 className="text-6xl md:text-7xl font-black text-white [letter-spacing:-0.08em]">
              <span className="text-gray-300">TANSTACK</span>{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                START
              </span>
            </h1>
          </div>
          <p className="text-2xl md:text-3xl text-gray-300 mb-4 font-light">
            The framework for next generation AI applications
          </p>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto mb-8">
            Full-stack framework powered by TanStack Router for React and Solid.
            Build modern applications with server functions, streaming, and type
            safety.
          </p>
          <div className="flex flex-col items-center gap-4">
            <a
              href="https://tanstack.com/start"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-cyan-500/50"
            >
              Documentation
            </a>
            <p className="text-gray-400 text-sm mt-2">
              Begin your TanStack Start journey by editing{" "}
              <code className="px-2 py-1 bg-slate-700 rounded text-cyan-400">
                /src/routes/index.tsx
              </code>
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 mx-auto">
        <div className="mb-10 rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <h2 className="mb-4 text-2xl font-bold text-white">
            Generated Rooms
          </h2>
          {joinMessage && (
            <p className="mb-4 text-sm text-cyan-300">{joinMessage}</p>
          )}
          {rooms === undefined && (
            <p className="text-sm text-slate-300">Loading rooms...</p>
          )}
          {rooms && rooms.length === 0 && (
            <p className="text-sm text-slate-300">No rooms yet.</p>
          )}
          {rooms && rooms.length > 0 && (
            <ul className="space-y-3">
              {rooms.map((room) => (
                <li
                  key={room._id}
                  className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-cyan-300">
                      Room {room.code}
                    </p>
                    <p className="text-xs text-slate-400">
                      Active players: {room.activePlayers}/{room.maxPlayers}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-xs text-slate-400">
                      Updated {new Date(room.lastActiveAt).toLocaleTimeString()}
                    </p>
                    <button
                      type="button"
                      disabled={
                        joiningRoomCode === room.code ||
                        isSessionPending ||
                        !session?.user ||
                        convexAuthUser === undefined ||
                        !convexAuthUser
                      }
                      onClick={() => void handleJoinRoom(room.code)}
                      className="rounded-md bg-cyan-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-600"
                    >
                      {joiningRoomCode === room.code ? "Joining..." : "Join"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10"
            >
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
