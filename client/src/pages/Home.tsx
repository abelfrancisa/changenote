import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";
import * as React from "react";
import { trpc } from "@/lib/trpc";
import { Copy, Loader2, LogIn, LogOut } from "lucide-react";
import { getLoginUrl } from "@/const";

function LogoutButton() {
  const logoutMutation = trpc.auth.logout.useMutation();
  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    window.location.href = "/";
  };
  return (
    <button
      onClick={handleLogout}
      className="text-sm text-gray-600 hover:text-black transition-colors"
    >
      <LogOut className="w-4 h-4" />
    </button>
  );
}

const SUBJECTS = ["Biology", "History", "Maths", "English", "Chemistry", "Physics"];

interface GeneratedContent {
  improvedNotes: string;
  flashcards: Array<{ q: string; a: string }>;
  summary: string;
}

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [inputText, setInputText] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("Biology");
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedFlashcard, setExpandedFlashcard] = useState<number | null>(null);

  // Load reloaded session from history if available
  React.useEffect(() => {
    const reloadData = sessionStorage.getItem("reloadSession");
    if (reloadData) {
      try {
        const session = JSON.parse(reloadData);
        setInputText(session.inputText);
        setSelectedSubject(session.subject);
        setGeneratedContent({
          improvedNotes: session.improvedNotes,
          flashcards: session.flashcards,
          summary: session.summary,
        });
        sessionStorage.removeItem("reloadSession");
        toast.success("Session reloaded");
      } catch (error) {
        console.error("Failed to reload session", error);
      }
    }
  }, []);

  const generateMutation = trpc.notes.generate.useMutation();
  const saveMutation = trpc.notes.saveSession.useMutation();

  const handleGenerate = async () => {
    if (!inputText.trim()) {
      toast.error("Please enter some notes to transform");
      return;
    }

    setIsLoading(true);
    try {
      const result = await generateMutation.mutateAsync({
        text: inputText,
        subject: selectedSubject,
      });

      setGeneratedContent({
        improvedNotes: result.improvedNotes,
        flashcards: result.flashcards,
        summary: result.summary,
      });

      toast.success("Notes transformed successfully!");
    } catch (error) {
      toast.error("Failed to generate content. Please try again.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!isAuthenticated || !user) {
      toast.error("Please log in to save your work");
      return;
    }

    if (!generatedContent) {
      toast.error("Generate content first");
      return;
    }

    try {
      await saveMutation.mutateAsync({
        text: inputText,
        subject: selectedSubject,
        improvedNotes: generatedContent.improvedNotes,
        flashcards: generatedContent.flashcards,
        summary: generatedContent.summary,
      });

      toast.success("Session saved successfully!");
    } catch (error) {
      toast.error("Failed to save session");
      console.error(error);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="border-b border-black py-8 md:py-12">
        <div className="container">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight">ChangeNote</h1>
              <p className="text-lg md:text-xl mt-2 text-gray-700">Transform your GCSE revision notes with AI</p>
            </div>
            {isAuthenticated ? (
              <div className="text-right space-y-2">
                <p className="text-sm font-medium">{user?.name}</p>
                <div className="flex gap-3 justify-end">
                  <a href="/history" className="text-sm text-red-600 hover:underline">
                    View History
                  </a>
                  <LogoutButton />
                </div>
              </div>
            ) : (
              <a href={getLoginUrl()}>
                <Button className="bg-black text-white hover:bg-gray-900">
                  <LogIn className="w-4 h-4 mr-2" />
                  Login
                </Button>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Input Panel */}
          <div className="md:col-span-1">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-4">Input</h2>
                <div className="border-t-4 border-red-600 pt-4">
                  <label className="block text-sm font-medium mb-3">Subject</label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full px-4 py-2 border border-black bg-white text-black"
                  >
                    {SUBJECTS.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-3">Your Notes</label>
                <Textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value.slice(0, 1500))}
                  placeholder="Paste or type your raw GCSE revision notes here..."
                  className="w-full h-64 p-4 border border-black bg-white text-black resize-none"
                />
                <p className="text-xs text-gray-600 mt-2">{inputText.length} / 1500 characters</p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleGenerate}
                  disabled={isLoading || !inputText.trim()}
                  className="flex-1 bg-black text-white hover:bg-gray-900"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Transform Notes"
                  )}
                </Button>
                {isAuthenticated && (
                  <Button
                    onClick={handleSave}
                    disabled={!generatedContent || saveMutation.isPending}
                    className="flex-1 bg-red-600 text-white hover:bg-red-700"
                  >
                    {saveMutation.isPending ? "Saving..." : "Save Session"}
                  </Button>
                )}
              </div>
              
              <Button
                onClick={() => {
                  setInputText("");
                  setGeneratedContent(null);
                  setSelectedSubject("Biology");
                }}
                variant="outline"
                className="w-full border-black hover:bg-gray-50"
              >
                Clear All
              </Button>
            </div>
          </div>

          {/* Output Panel */}
          <div className="md:col-span-2">
            {generatedContent ? (
              <Tabs defaultValue="notes" className="space-y-6">
                <div className="border-t-4 border-red-600 pt-4">
                  <TabsList className="grid w-full grid-cols-3 bg-gray-100">
                    <TabsTrigger value="notes">Improved Notes</TabsTrigger>
                    <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
                    <TabsTrigger value="summary">Summary</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="notes" className="space-y-4">
                  <Card className="p-6 border border-black">
                    <div className="prose prose-sm max-w-none">
                      <p className="whitespace-pre-wrap text-base leading-relaxed">{generatedContent.improvedNotes}</p>
                    </div>
                  </Card>
                  <Button
                    onClick={() => copyToClipboard(generatedContent.improvedNotes, "Notes")}
                    variant="outline"
                    className="w-full border-black"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Notes
                  </Button>
                </TabsContent>

                <TabsContent value="flashcards" className="space-y-4">
                  <div className="space-y-3">
                    {generatedContent.flashcards.map((card, idx) => (
                      <Card
                        key={idx}
                        className="border border-black cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setExpandedFlashcard(expandedFlashcard === idx ? null : idx)}
                      >
                        <div className="p-4">
                          <p className="font-medium text-sm text-gray-600 mb-2">Card {idx + 1}</p>
                          <p className="font-bold text-base">{card.q}</p>
                          {expandedFlashcard === idx && (
                            <div className="mt-4 pt-4 border-t border-black">
                              <p className="text-sm text-gray-700">{card.a}</p>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                  <Button
                    onClick={() =>
                      copyToClipboard(
                        generatedContent.flashcards.map((c) => `Q: ${c.q}\nA: ${c.a}`).join("\n\n"),
                        "Flashcards"
                      )
                    }
                    variant="outline"
                    className="w-full border-black"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy All Flashcards
                  </Button>
                </TabsContent>

                <TabsContent value="summary" className="space-y-4">
                  <Card className="p-6 border border-black">
                    <p className="whitespace-pre-wrap text-base leading-relaxed">{generatedContent.summary}</p>
                  </Card>
                  <Button
                    onClick={() => copyToClipboard(generatedContent.summary, "Summary")}
                    variant="outline"
                    className="w-full border-black"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Summary
                  </Button>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="h-96 border-2 border-dashed border-black flex items-center justify-center">
                <div className="text-center">
                  <p className="text-lg font-medium text-gray-600">Enter your notes and click "Transform Notes"</p>
                  <p className="text-sm text-gray-500 mt-2">Your improved content will appear here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-black mt-16 py-8">
        <div className="container text-center text-sm text-gray-600">
          <p>ChangeNote • Transform your revision notes with AI • {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}
