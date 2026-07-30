import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-3rem)] bg-[var(--background)] flex items-center justify-center px-4">
      <SignIn
        path="/login"
        signUpUrl="/signup"
        appearance={{
          elements: {
            rootBox: "w-full max-w-sm",
            cardBox: "w-full shadow-sm border border-gray-200 rounded-xl",
            card: "p-8",
            headerTitle: "text-xl font-bold text-[#1A1D21]",
            headerSubtitle: "text-sm text-[#6B7075]",
            formButtonPrimary:
              "bg-[#1A1D21] hover:bg-[#3C4043] text-sm normal-case",
            footerActionLink: "text-[#1A1D21] font-medium hover:underline",
          },
        }}
      />
    </div>
  );
}
