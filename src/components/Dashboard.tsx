import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PaperSubmission } from "./PaperSubmission";
import { PaperList } from "./PaperList";
import { ReviewDashboard } from "./ReviewDashboard";

interface DashboardProps {
  profile: {
    firstName: string;
    lastName: string;
    role: "author" | "reviewer" | "editor" | "admin";
    affiliation: string;
    expertise: string[];
  };
}

export function Dashboard({ profile }: DashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const notifications = useQuery(api.profiles.getMyNotifications, { unreadOnly: true });

  const tabs = [
    { id: "overview", label: "Overview", roles: ["author", "reviewer", "editor", "admin"] },
    { id: "submit", label: "Submit Paper", roles: ["author"] },
    { id: "my-papers", label: "My Papers", roles: ["author"] },
    { id: "reviews", label: "Reviews", roles: ["reviewer", "editor"] },
    { id: "editor", label: "Editorial", roles: ["editor", "admin"] },
  ];

  const visibleTabs = tabs.filter(tab => tab.roles.includes(profile.role));

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm border-r">
        <div className="p-6">
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900">
              {profile.firstName} {profile.lastName}
            </h3>
            <p className="text-sm text-gray-500 capitalize">{profile.role}</p>
            <p className="text-sm text-gray-500">{profile.affiliation}</p>
          </div>

          <nav className="space-y-2">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {notifications && notifications.length > 0 && (
            <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm font-medium text-yellow-800">
                {notifications.length} unread notification{notifications.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {activeTab === "overview" && <OverviewTab profile={profile} />}
          {activeTab === "submit" && <PaperSubmission />}
          {activeTab === "my-papers" && <PaperList />}
          {activeTab === "reviews" && <ReviewDashboard />}
          {activeTab === "editor" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Editorial Dashboard</h2>
              <p className="text-gray-600">Editorial features coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ profile }: { profile: DashboardProps["profile"] }) {
  const myPapers = useQuery(api.papers.getPapersByStatus, {});
  const myReviews = useQuery(api.reviews.getMyReviews, {});

  const paperStats = myPapers ? {
    total: myPapers.length,
    submitted: myPapers.filter(p => p.status === "submitted").length,
    underReview: myPapers.filter(p => p.status === "under_review").length,
    accepted: myPapers.filter(p => p.status === "accepted").length,
    published: myPapers.filter(p => p.status === "published").length,
  } : null;

  const reviewStats = myReviews ? {
    total: myReviews.length,
    assigned: myReviews.filter(r => r.status === "assigned").length,
    inProgress: myReviews.filter(r => r.status === "in_progress").length,
    completed: myReviews.filter(r => r.status === "completed").length,
  } : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back!</h1>
        <p className="text-gray-600">Here's an overview of your research activities.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {profile.role === "author" && paperStats && (
          <>
            <StatCard title="Total Papers" value={paperStats.total} color="blue" />
            <StatCard title="Under Review" value={paperStats.underReview} color="yellow" />
            <StatCard title="Accepted" value={paperStats.accepted} color="green" />
            <StatCard title="Published" value={paperStats.published} color="purple" />
          </>
        )}

        {(profile.role === "reviewer" || profile.role === "editor") && reviewStats && (
          <>
            <StatCard title="Total Reviews" value={reviewStats.total} color="blue" />
            <StatCard title="Assigned" value={reviewStats.assigned} color="yellow" />
            <StatCard title="In Progress" value={reviewStats.inProgress} color="orange" />
            <StatCard title="Completed" value={reviewStats.completed} color="green" />
          </>
        )}
      </div>

      {profile.expertise.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Areas of Expertise</h3>
          <div className="flex flex-wrap gap-2">
            {profile.expertise.map((area, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    yellow: "bg-yellow-50 text-yellow-600 border-yellow-200",
    green: "bg-green-50 text-green-600 border-green-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    orange: "bg-orange-50 text-orange-600 border-orange-200",
  };

  return (
    <div className={`p-6 rounded-lg border ${colorClasses[color as keyof typeof colorClasses]}`}>
      <h3 className="text-sm font-medium opacity-75">{title}</h3>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  );
}
