import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

export function showEmailVerificationToast(email: string) {
  toast.warning("Please verify your email to continue playing", {
    description: email,
    action: {
      label: "Resend",
      onClick: async () => {
        try {
          const result = await authClient.sendVerificationEmail({
            email,
            callbackURL: "/verify-email",
          });
          if (result.error) {
            toast.error(
              result.error.message || "Failed to send verification email",
            );
          } else {
            toast.success("Verification email sent! Check your inbox.");
          }
        } catch {
          toast.error("Failed to send verification email");
        }
      },
    },
    duration: Infinity,
  });
}
