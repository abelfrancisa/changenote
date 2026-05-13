import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2, Trash2, RotateCcw, Eye } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function History() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);

  const listQuery = trpc.notes.listSessions.useQuery(
    { limit: 50, offset: 0 },
    { enabled: isAuthenticated }
  );

  const getSessionQuery = trpc.notes.getSession.useQuery(
    { sessionId: selectedSessionId! },
    { enabled: selectedSessionId !== null }
  );

  const deleteQuery = trpc.notes.deleteSession.useMutation();

  const handleDelete = async (sessionId: number) => {
    if (!confirm("Are you sure you want to delete this session?")) return;

    try {
      await deleteQuery.mutateAsync({ sessionId });
      toast.success("Session deleted");
      setSelectedSessionId(null);
      listQuery.refetch();
    } catch (error) {
      toast.error("Failed to delete session");
    }
  };

  const handleReload = (session: any) => {
    // Store session data in sessionStorage for the home page to load
    sessionStorage.setItem(
      "reloadSession",
      JSON.stringify({
        inputText: session.session.inputText,
        subject: session.session.subject,
        improvedNotes: session.improvedNotes,
        flashcards: session.flashcards,
        summary: session.summary,
      })
    );
    setLocation("/");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">Please log in to view your history</p>
          <Button className="bg-black text-white">Log In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="border-b border-black py-8">
        <div className="container">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold">Your Sessions</h1>
            <Button onClick={() => setLocation("/")} className="bg-black text-white">
              Back to Editor
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Sessions List */}
          <div className="md:col-span-1">
            <div className="border-t-4 border-red-600 pt-4 mb-6">
              <h2 className="text-2xl font-bold">Sessions</h2>
            </div>

            {listQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : listQuery.data?.sessions.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                <p>No sessions yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {listQuery.data?.sessions.map((session) => (
                  <Card
                    key={session.id}
                    className={`p-4 border cursor-pointer transition-colors ${
                      selectedSessionId === session.id
                        ? "border-black bg-gray-50"
                        : "border-gray-300 hover:border-black"
                    }`}
                    onClick={() => setSelectedSessionId(session.id)}
                  >
                    <p className="font-bold text-sm">{session.subject}</p>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{session.inputPreview}...</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(session.createdAt).toLocaleDateString()}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Session Details */}
          <div className="md:col-span-2">
            {selectedSessionId && getSessionQuery.data ? (
              <div className="space-y-6">
                <div className="border-t-4 border-red-600 pt-4">
                  <h2 className="text-2xl font-bold mb-2">{getSessionQuery.data.session.subject}</h2>
                  <p className="text-sm text-gray-600">
                    {new Date(getSessionQuery.data.session.createdAt).toLocaleString()}
                  </p>
                </div>

                {/* Original Input */}
                <div>
                  <h3 className="text-lg font-bold mb-3">Original Input</h3>
                  <Card className="p-4 border border-black bg-gray-50">
                    <p className="text-sm whitespace-pre-wrap">{getSessionQuery.data.session.inputText}</p>
                  </Card>
                </div>

                {/* Improved Notes Preview */}
                <div>
                  <h3 className="text-lg font-bold mb-3">Improved Notes</h3>
                  <Card className="p-4 border border-black">
                    <p className="text-sm whitespace-pre-wrap line-clamp-4">
                      {getSessionQuery.data.improvedNotes}
                    </p>
                  </Card>
                </div>

                {/* Flashcards Preview */}
                <div>
                  <h3 className="text-lg font-bold mb-3">Flashcards ({getSessionQuery.data.flashcards.length})</h3>
                  <div className="space-y-2">
                    {getSessionQuery.data.flashcards.slice(0, 3).map((card, idx) => (
                      <Card key={idx} className="p-3 border border-black">
                        <p className="text-xs font-bold text-gray-600">Q{idx + 1}</p>
                        <p className="text-sm font-medium">{card.q}</p>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Summary Preview */}
                <div>
                  <h3 className="text-lg font-bold mb-3">Summary</h3>
                  <Card className="p-4 border border-black">
                    <p className="text-sm whitespace-pre-wrap line-clamp-3">
                      {getSessionQuery.data.summary}
                    </p>
                  </Card>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => handleReload(getSessionQuery.data)}
                    className="flex-1 bg-black text-white hover:bg-gray-900"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reload
                  </Button>
                  <Button
                    onClick={() => handleDelete(selectedSessionId)}
                    disabled={deleteQuery.isPending}
                    className="flex-1 bg-red-600 text-white hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            ) : selectedSessionId ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="h-96 border-2 border-dashed border-black flex items-center justify-center">
                <div className="text-center">
                  <Eye className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium text-gray-600">Select a session to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
