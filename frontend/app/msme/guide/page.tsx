"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/dib/authContext";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Bot, User, Send, Play, BookOpen } from "lucide-react";
import { cn } from "@/dib/utils";

const GUIDE_TOPICS = [
  { id: "score", title: "Understanding Your Score", duration: "3 min", videoId: "GuyecpBm2Qs" },
  { id: "improve", title: "How to Improve Your Score", duration: "4 min", videoId: "ka2raSNBPIs" },
  { id: "loan", title: "Applying for a Loan", duration: "5 min", videoId: "cYCGs0DNAyw" },
  { id: "cgtmse", title: "What is CGTMSE?", duration: "3 min", videoId: "xgjLJ05LVHg" },
  { id: "mudra", title: "What is MUDRA?", duration: "2 min", videoId: "LwMYQI7Rh0Y" },
  { id: "dispute", title: "How to Raise a Dispute", duration: "3 min", videoId: "G77sSlaA2i8" },
];

const CANNED_REPLIES: Record<string, string> = {
  score:
    "Your credit score is calculated using 43 features from your GST filing history, UPI transaction patterns, e-way bill data and more. A score above 700 is considered low risk.",
  gst: "GST filing compliance is one of the strongest positive signals. Ensure you file GSTR-1 by the 11th and GSTR-3B by the 20th each month.",
  loan: "To apply for a loan, go to Loans → Send Request. Select a bank, choose working capital or term loan, enter the amount and purpose, then submit.",
  cgtmse:
    "CGTMSE (Credit Guarantee Fund Trust for Micro and Small Enterprises) provides guarantee coverage for collateral-free loans up to ₹2 Crore.",
  mudra:
    "MUDRA loans under the Pradhan Mantri MUDRA Yojana (PMMY) are available up to ₹10 Lakh for micro enterprises.",
  dispute:
    "If your GSTIN has been fraud-flagged, go to Disputes and click 'Raise Dispute'. A credit analyst will review your case.",
  default:
    "I'm here to help! You can ask me about your credit score, GST filing, loan products, CGTMSE, MUDRA schemes, or how to navigate the platform.",
};

function getReply(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("score") || m.includes("credit")) return CANNED_REPLIES.score;
  if (m.includes("gst") || m.includes("filing")) return CANNED_REPLIES.gst;
  if (m.includes("loan") || m.includes("apply")) return CANNED_REPLIES.loan;
  if (m.includes("cgtmse") || m.includes("guarantee"))
    return CANNED_REPLIES.cgtmse;
  if (m.includes("mudra")) return CANNED_REPLIES.mudra;
  if (m.includes("dispute") || m.includes("flag"))
    return CANNED_REPLIES.dispute;
  return CANNED_REPLIES.default;
}

const LANGUAGES = ["English", "Hindi", "Marathi", "Tamil", "Telugu", "Kannada"];

export default function MsmeGuidePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Namaste! I'm your MSME Credit Assistant. How can I help you today? You can ask about your credit score, GST filing, loan products, or schemes like CGTMSE and MUDRA.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("English");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  useEffect(() => {
    if (!user || user.role !== "msme") {
      router.push("/unauthorized");
    }

  }, [user, router]);

  if (!user || user.role !== "msme") {
    router.push("/login");
    return null;
  }

  const sendMessage = () => {
    if (!input.trim()) return;
    const userMsg = {
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };
    const botMsg = {
      role: "assistant",
      content: getReply(input),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput("");
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Help & Guide"
        description="Chatbot assistance and video explainers"
      />

      <div className="flex flex-col gap-8">
        {/* Chatbot */}
        <Card className="border-border shadow-xl flex flex-col h-[600px] overflow-hidden bg-white/50 backdrop-blur-sm">
          <CardHeader className="py-4 px-6 border-b flex-row items-center justify-between gap-2 shrink-0 bg-white/10">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-semibold">
                Credit Assistant
              </CardTitle>
            </div>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-28 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l} value={l} className="text-xs">
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth scrollbar-thin scrollbar-thumb-primary/20"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
                  m.role === "user" && "flex-row-reverse",
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm shadow-md transition-transform hover:scale-110",
                    m.role === "assistant"
                      ? "bg-primary text-white ring-4 ring-primary/10"
                      : "bg-background text-foreground border shadow-sm",
                  )}
                >
                  {m.role === "assistant" ? (
                    <Bot className="w-5 h-5" />
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                </div>
                <div
                  className={cn(
                    "max-w-[70%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm border",
                    m.role === "assistant"
                      ? "bg-card text-foreground rounded-tl-none border-border"
                      : "bg-primary text-white rounded-tr-none border-primary/20",
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t flex gap-2 shrink-0">
            <Input
              placeholder="Ask anything about your score, GST, loans..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              className="text-sm"
            />
            <Button
              size="icon"
              onClick={sendMessage}
              className="bg-primary hover:bg-primary/90 shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </Card>

        {/* Video guides */}
        <Card className="border-border shadow-xl flex flex-col h-[auto] min-h-[600px] overflow-hidden bg-card/60 backdrop-blur-xl">
          <CardHeader className="py-4 px-6 border-b flex-row items-center justify-between bg-white/10 shrink-0">
             <div className="flex items-center gap-3">
               <div className="p-2 bg-primary/10 rounded-xl">
                  <BookOpen className="w-5 h-5 text-primary" />
               </div>
               <div>
                  <CardTitle className="text-lg font-bold">Video Learning Library</CardTitle>
                  <p className="text-xs text-muted-foreground">Expert guides for MSME growth</p>
               </div>
             </div>
             <Badge className="bg-primary/5 text-primary border-primary/20 hover:bg-primary/10 tracking-widest px-3 py-1 text-[10px] uppercase font-black">
               {GUIDE_TOPICS.length} MODULES
             </Badge>
          </CardHeader>
          <div className="p-8 space-y-8">
            {/* Top: Premium Video Player Area */}
            <div className="w-full max-w-4xl mx-auto">
              {selectedTopic ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-8 duration-700">
                  <div className="relative group p-1 bg-gradient-to-br from-primary/30 via-transparent to-blue-400/30 rounded-3xl">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl opacity-20 -z-10 group-hover:opacity-40 transition-opacity duration-1000" />
                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl ring-1 ring-white/10">
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${GUIDE_TOPICS.find((t) => t.id === selectedTopic)?.videoId}?autoplay=1&rel=0`}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="w-full h-full"
                      ></iframe>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row items-start justify-between gap-6 p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                         <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5 font-extrabold px-3 py-1">
                            LESSON {GUIDE_TOPICS.findIndex(t => t.id === selectedTopic) + 1}
                         </Badge>
                         <span className="text-xs text-muted-foreground bg-muted/30 px-3 py-1 rounded-full border border-border/50">
                            Duraton: {GUIDE_TOPICS.find((t) => t.id === selectedTopic)?.duration}
                         </span>
                      </div>
                      <h2 className="text-2xl font-black tracking-tight text-foreground line-clamp-2">
                        {GUIDE_TOPICS.find((t) => t.id === selectedTopic)?.title}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-3 max-w-3xl leading-relaxed font-medium">
                        Elevate your business strategy with our masterclass on {GUIDE_TOPICS.find((t) => t.id === selectedTopic)?.title.toLowerCase()}. Learn actionable insights to optimize your financial posture.
                      </p>
                    </div>
                    <Button size="lg" className="h-12 px-8 rounded-full font-bold shadow-lg shadow-primary/25 hover:scale-105 transition-transform">
                       Mark Lesson as Done
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="aspect-video bg-muted/10 rounded-3xl flex flex-col items-center justify-center border-2 border-dashed border-border/50 transition-colors p-8">
                  <div className="relative w-24 h-24 mb-6">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                    <div className="relative w-full h-full bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                      <Play className="w-10 h-10 text-primary opacity-60 ml-1" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Select a Masterclass</h3>
                  <p className="text-sm text-muted-foreground mt-2 max-w-xs text-center leading-relaxed">
                    Choose a module from the collection below to start your financial learning journey.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom: Comprehensive Grid Sidebar */}
            <div className="pt-4 border-t border-border/50">
              <h3 className="text-sm font-black text-foreground uppercase tracking-widest mb-6 px-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                Lesson Modules
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {GUIDE_TOPICS.map((topic, index) => (
                  <button
                    key={topic.id}
                    onClick={() =>
                      setSelectedTopic(selectedTopic === topic.id ? null : topic.id)
                    }
                    className={cn(
                      "group p-1 rounded-2xl transition-all duration-500",
                      selectedTopic === topic.id
                        ? "bg-gradient-to-br from-primary via-primary to-blue-500 shadow-xl shadow-primary/20"
                        : "bg-transparent hover:bg-muted/30"
                    )}
                  >
                    <div className={cn(
                      "w-full text-left p-4 rounded-xl flex items-center gap-4 border transition-all duration-300",
                      selectedTopic === topic.id
                        ? "bg-white/5 border-transparent text-white"
                        : "bg-white/50 border-border group-hover:border-primary/40 group-hover:bg-background"
                    )}>
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ring-1",
                          selectedTopic === topic.id
                            ? "bg-white/20 ring-white/30 text-white"
                            : "bg-muted ring-border text-foreground"
                        )}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-xs font-black truncate mb-1 uppercase tracking-tight",
                          selectedTopic === topic.id ? "text-white" : "text-foreground"
                        )}>
                          {topic.title}
                        </p>
                        <div className="flex items-center gap-2">
                           <Play className={cn("w-2.5 h-2.5", selectedTopic === topic.id ? "text-white" : "text-primary/70")} />
                           <span className={cn("text-[10px] font-bold", selectedTopic === topic.id ? "text-white/70" : "text-muted-foreground")}>
                             {topic.duration}
                           </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* AI Agent */}
      <div className="mt-8">
        <Card className="border-border shadow-md overflow-hidden">
          <CardHeader className="py-4 px-6 border-b bg-muted/30 flex-row items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Interactive AI Guide</CardTitle>
              <p className="text-xs text-muted-foreground">Speak with our virtual credit expert</p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative w-full aspect-video sm:aspect-[21/9] min-h-[300px] bg-black">
              <iframe
                src="https://embed.liveavatar.com/v1/c82bf1c5-4229-4588-831c-746488888418"
                allow="microphone"
                title="LiveAvatar Embed"
                className="absolute inset-0 w-full h-full border-0"
              ></iframe>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
