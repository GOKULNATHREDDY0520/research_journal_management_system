import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PaperDetails } from "./PaperDetails";

export function PaperList() {
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);
  
  const papers = useQuery(api.papers.getPapersByStatus, 
    selectedStatus ? { status: selectedStatus } : {}
  );

  const statusOptions = [
    { value: "", label: "All Papers" },
    { value: "submitted", label: "Submitted" },
    { value: "under_review", label: "Under Review" },
    { value: "revision_requested", label: "Revision Requested" },
    { value: "accepted", label: "Accepted" },
    { value: "rejected", label: "Rejected" },
    { value: "published", label: "Published" },
  ];

  const getStatusColor = (status: string) => {
    const colors = {
      submitted: "bg-blue-100 text-blue-800",
      under_review: "bg-yellow-100 text-yellow-800",
      revision_requested: "bg-orange-100 text-orange-800",
      accepted: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      published: "bg-purple-100 text-purple-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  if (selectedPaperId) {
    return (
      <div>
        <button
          onClick={() => setSelectedPaperId(null)}
          className="mb-4 text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back to Papers
        </button>
        <PaperDetails paperId={selectedPaperId} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">My Papers</h2>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {papers === undefined ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : papers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No papers found.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {papers.map((paper) => (
            <div
              key={paper._id}
              className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedPaperId(paper._id)}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-gray-900 hover:text-blue-600">
                  {paper.title}
                </h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(paper.status)}`}>
                  {paper.status.replace("_", " ")}
                </span>
              </div>

              <p className="text-gray-600 mb-4 line-clamp-3">{paper.abstract}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                {paper.keywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                  >
                    {keyword}
                  </span>
                ))}
              </div>

              <div className="flex justify-between items-center text-sm text-gray-500">
                <div className="flex items-center space-x-4">
                  <span>Category: {paper.category}</span>
                  <span>Version: {paper.version}</span>
                  {paper.coAuthors && paper.coAuthors.length > 0 && (
                    <span>Co-authors: {paper.coAuthors.length}</span>
                  )}
                </div>
                <span>{new Date(paper.submissionDate).toLocaleDateString()}</span>
              </div>

              {paper.fileUrl && (
                <div className="mt-4">
                  <a
                    href={paper.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    📄 View PDF
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
