import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

const AVATAR_MAX_FILE_BYTES = 1024 * 1024; // 1MB - Convex limit

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function getFirstLetter(name: string | undefined) {
  const value = name?.trim();
  if (!value) return "U";
  return value[0]?.toUpperCase() ?? "U";
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

function SettingsPage() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const [name, setName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  useEffect(() => {
    if (!isPending && !session?.user) {
      void navigate({ to: "/login" });
    }
  }, [isPending, navigate, session?.user]);

  useEffect(() => {
    setName(session?.user?.name ?? "");
  }, [session?.user?.name]);

  const handleSaveName = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Name cannot be empty.");
      return;
    }
    setIsSavingName(true);
    try {
      const result = await authClient.updateUser({ name: trimmed });
      if (result.error) {
        toast.error(result.error.message || "Failed to update name.");
        return;
      }
      toast.success("Name updated.");
    } finally {
      setIsSavingName(false);
    }
  };

  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file || !session?.user || isSavingAvatar) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > AVATAR_MAX_FILE_BYTES) {
      toast.error("Image is too large. Max size is 1MB.");
      return;
    }

    setIsSavingAvatar(true);
    try {
      const image = await fileToDataUrl(file);
      const result = await authClient.updateUser({ image });
      if (result.error) {
        toast.error(result.error.message || "Failed to update avatar.");
        return;
      }
      toast.success("Avatar updated.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Avatar upload failed.";
      toast.error(message);
    } finally {
      setIsSavingAvatar(false);
    }
  };

  if (isPending || !session?.user) {
    return (
      <main className="min-h-[calc(100dvh-4rem)] bg-[#252525] px-6 py-10 text-[#f2f2f2]">
        <div className="mx-auto max-w-3xl text-sm text-slate-300">Loading settings...</div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-[#252525] px-4 py-8 text-[#f2f2f2] sm:px-6">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold">Account</h1>
          <p className="mt-1 text-sm text-slate-300">Manage your account</p>
        </header>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[200px_1fr]">
          <aside className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-medium text-white">General</p>
            <p className="mt-1 text-xs text-slate-300">Profile settings</p>
          </aside>

          <section className="space-y-4">
            <article className="rounded-xl border border-white/10 bg-white/5">
              <div className="p-4 sm:p-5">
                <h2 className="text-xl font-medium">Full name</h2>
                <p className="mt-1 text-sm text-slate-300">
                  This is your name as it will be displayed on the platform.
                </p>
                <div className="mt-4">
                  <label className="mb-2 block text-sm text-slate-200">Name</label>
                  <Input
                    value={name}
                    maxLength={30}
                    onChange={(event) => setName(event.target.value)}
                    className="border-white/15 bg-white/10 text-white"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 p-4 sm:p-5">
                <p className="text-xs text-slate-300">Maximum of 30 characters</p>
                <button
                  type="button"
                  onClick={() => void handleSaveName()}
                  disabled={isSavingName}
                  className="rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-60"
                >
                  {isSavingName ? "Saving..." : "Save"}
                </button>
              </div>
            </article>

            <article className="rounded-xl border border-white/10 bg-white/5">
              <div className="p-4 sm:p-5">
                <h2 className="text-xl font-medium">Avatar</h2>
                <p className="mt-1 text-sm text-slate-300">
                  This is what you will look like on the platform.
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <Avatar className="h-14 w-14 border border-white/20">
                    <AvatarImage src={session.user.image ?? undefined} alt={session.user.name ?? "Avatar"} />
                    <AvatarFallback className="bg-white/15 text-lg font-semibold text-white">
                      {getFirstLetter(session.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    disabled={isSavingAvatar}
                    className="h-9 max-w-[220px] border-white/15 bg-white/10 text-sm text-white file:text-white"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 p-4 sm:p-5">
                <p className="text-xs text-slate-300">Square image recommended</p>
                <button
                  type="button"
                  disabled={true}
                  className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-400"
                >
                  {isSavingAvatar ? "Saving..." : "Saved on upload"}
                </button>
              </div>
            </article>
          </section>
        </div>
      </div>
    </main>
  );
}
