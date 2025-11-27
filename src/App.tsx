import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { Dashboard } from "./components/Dashboard";
import { ProfileSetup } from "./components/ProfileSetup";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <h2 className="text-xl font-semibold text-blue-600">Research Journal</h2>
        <Authenticated>
          <SignOutButton />
        </Authenticated>
      </header>
      <main className="flex-1">
        <Content />
      </main>
      <Toaster />
    </div>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const profile = useQuery(api.profiles.getMyProfile);

  if (loggedInUser === undefined || profile === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Unauthenticated>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-full max-w-md mx-auto p-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">Research Journal</h1>
              <p className="text-xl text-gray-600">Academic Publishing Platform</p>
              <p className="text-gray-500 mt-2">Submit, review, and publish research papers</p>
            </div>
            <SignInForm />
          </div>
        </div>
      </Unauthenticated>

      <Authenticated>
        {!profile ? (
          <ProfileSetup />
        ) : (
          <Dashboard profile={profile} />
        )}
      </Authenticated>
    </div>
  );
}
