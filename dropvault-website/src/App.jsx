import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import StandaloneDropZone from "./components/StandaloneDropZone";
import { useAuth } from "./AuthContext";
import { ThemeProvider } from "./ThemeContext";
import { Container, Button, Navbar, Row, Col } from "react-bootstrap";
import { motion, AnimatePresence } from "framer-motion";
import { Search, LogOut, User, ArrowRight, ArrowLeft, Library, Box, Loader2, Github } from "lucide-react";
import UniversalDropZone from "./components/UniversalDropZone";
import VaultList from "./components/VaultList";
import LandingPage from "./components/LandingPage";
import RecentTags from "./components/RecentTags";
import GlobalActivityBar from "./components/GlobalActivityBar";
import ErrorBoundary from "./components/ErrorBoundary";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTags, setActiveTags] = useState([]);
  const [viewMode, setViewMode] = useState("dashboard"); // 'dashboard' | 'all_items'
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [processingItems, setProcessingItems] = useState({}); // item_id -> progress data
  const [uploadingCount, setUploadingCount] = useState(0); // Number of files currently uploading
  const [queueSize, setQueueSize] = useState(0); // Number of files waiting in queue

  const handleRefresh = () => setRefreshTrigger(prev => prev + 1);

  // Handle GitHub Callback
  React.useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const state = params.get("state"); // userId
      
      if (code && state && user && user.uid === state) {
          // Clear URL
          window.history.replaceState({}, document.title, window.location.pathname);
          
          const completeAuth = async () => {
              try {
                  const res = await fetch("/api/auth/github/callback", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ code, state })
                  });
                  if (res.ok) {
                      alert("GitHub Connected Successfully! Syncing repositories in background...");
                      // Trigger Sync
                      fetch("/api/sync/github", {
                          method: "POST",
                          headers: { "Content-Type": "application/x-www-form-urlencoded" },
                          body: `userId=${user.uid}`
                      }).catch(console.error);
                  } else {
                      const err = await res.json();
                      alert("GitHub Connection Failed: " + err.detail);
                  }
              } catch (e) {
                  console.error(e);
                  alert("Connection error.");
              }
          };
          completeAuth();
      }
  }, [user]);

  // Handlers for UniversalDropZone
  const handleUploadStart = () => setUploadingCount(prev => prev + 1);
  const handleUploadEnd = () => setUploadingCount(prev => Math.max(0, prev - 1));
  const handleQueueChange = (size) => setQueueSize(size);
  
  const connectGithub = async () => {
      try {
          const res = await fetch(`/api/auth/github/url?userId=${user.uid}`);
          if (!res.ok) throw new Error("Failed to get auth URL");
          const data = await res.json();
          window.location.href = data.url;
      } catch (e) {
          console.error(e);
          alert("Could not start GitHub connection. Check console.");
      }
  };

  const handleItemCreated = (item) => {
      setProcessingItems(prev => ({
          ...prev,
          [item.id]: {
              item_id: item.id,
              stage: item.progress_stage || 'queued',
              percent: item.progress_percent || 0,
              message: "Queued...",
              status: item.status
          }
      }));
      // Trigger list refresh immediately to show "queued" item
      handleRefresh();
  };

  // Restore processing state on mount & Periodic Fallback
  React.useEffect(() => {
      if (!user) return;
      
      const fetchProcessing = async () => {
          try {
              const res = await fetch(`/api/processing?userId=${user.uid}`);
              if (res.ok) {
                  const items = await res.json();
                  const processing = {};
                  items.forEach(item => {
                      processing[item.item_id] = {
                          item_id: item.item_id,
                          stage: item.stage || 'queued',
                          percent: item.percent || 0,
                          message: item.message || "Processing...",
                          status: item.status
                      };
                  });
                  // Only update if something changed to avoid unnecessary re-renders
                  setProcessingItems(prev => {
                      // Check if lengths differ or items changed
                      const prevIds = Object.keys(prev);
                      const nextIds = Object.keys(processing);
                      if (prevIds.length !== nextIds.length) return processing;
                      
                      const hasChanged = nextIds.some(id => 
                          prev[id]?.percent !== processing[id].percent || 
                          prev[id]?.stage !== processing[id].stage
                      );
                      return hasChanged ? processing : prev;
                  });
              }
          } catch (e) { console.error("Polling error:", e); }
      };

      fetchProcessing(); // Initial fetch
      const interval = setInterval(fetchProcessing, 2000); // Poll every 2 seconds
      
      return () => clearInterval(interval);
  }, [user]);

  // Global WebSocket for Progress
  React.useEffect(() => {
    if (!user) return;
    let ws;
    try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Hack: Force port 8000 for local dev to bypass Vite proxy issues
        const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
        ws = new WebSocket(`${protocol}//${host}/ws/progress/${user.uid}`);
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.status === "completed" || data.status === "failed") {
                // Update to 100% / Done state first
                setProcessingItems(prev => ({
                    ...prev,
                    [data.item_id]: data
                }));
                
                // Refresh list to show final data
                handleRefresh();

                // Remove after delay so user sees "Done"
                setTimeout(() => {
                    setProcessingItems(prev => {
                        const next = { ...prev };
                        delete next[data.item_id];
                        return next;
                    });
                }, 2000);
            } else {
                setProcessingItems(prev => ({
                    ...prev,
                    [data.item_id]: data
                }));
            }
        };
    } catch (e) { console.error(e); }
    return () => ws?.close();
  }, [user]);

  const effectiveSearchQuery = activeTags.length > 0 ? activeTags.join(", ") : searchQuery;

  const handleTagToggle = (tag) => {
      if (Array.isArray(tag)) {
          setActiveTags([]);
          return;
      }
      
      setActiveTags(prev => {
          if (prev.includes(tag)) {
              return prev.filter(t => t !== tag);
          } else {
              return [...prev, tag];
          }
      });
      setViewMode("all_items");
      setSearchQuery(""); 
  };

  const activeTasks = Object.values(processingItems);

  return (
    <div className="min-vh-100 bg-background text-foreground">
      <Navbar className="mb-4 bg-card border-bottom sticky-top py-3">
        <Container fluid className="px-4">
          <Navbar.Brand 
            href="#" 
            className="fw-bold fs-4 d-flex align-items-center gap-2 text-primary" 
            onClick={() => { setViewMode("dashboard"); setActiveTags([]); setSearchQuery(""); }}
          >
            <Box size={28} strokeWidth={2} />
            DropVault
          </Navbar.Brand>
          
          <div className="d-flex align-items-center gap-3">
              <div className="position-relative" style={{ width: "300px" }}>
                  <Search size={16} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setActiveTags([]);
                        if (e.target.value && viewMode !== "all_items") {
                            setViewMode("all_items");
                        }
                    }}
                    onFocus={() => {
                        if (viewMode !== "all_items") setViewMode("all_items");
                    }}
                    className="form-control rounded-pill border-0 bg-muted text-foreground ps-5 py-2"
                    style={{ fontSize: "0.95rem" }}
                  />
              </div>
              
              <div className="d-flex align-items-center gap-2 border-start ps-3 ms-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="p-0 rounded-circle border-0 bg-transparent shadow-none" style={{ width: 40, height: 40 }}>
                        <Avatar className="h-9 w-9 border border-border">
                          <AvatarImage src={user.photoURL} alt={user.displayName} />
                          <AvatarFallback className="bg-primary/10 text-primary fw-bold">
                            {user.displayName?.charAt(0)?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-card border-border text-foreground">
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">{user.displayName}</p>
                          <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-border" />
                      <DropdownMenuItem className="cursor-pointer focus:bg-muted focus:text-foreground" onClick={() => {}}>
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer focus:bg-muted focus:text-foreground" onClick={connectGithub}>
                        <Github className="mr-2 h-4 w-4" />
                        <span>Connect GitHub</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-border" />
                      <DropdownMenuItem className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={logout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
              </div>
          </div>
        </Container>
      </Navbar>
      
      <Container fluid className="px-4 pb-5">
        <GlobalActivityBar 
            uploadingCount={uploadingCount} 
            queueSize={queueSize} 
            activeTasks={activeTasks} 
        />

        <AnimatePresence mode="wait">
            {viewMode === "dashboard" ? (
                <motion.div
                    key="dashboard"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                >
                    {/* ADD ITEM SECTION */}
                    <Row className="justify-content-center mb-5">
                        <Col xs={12}>
                            <UniversalDropZone 
                                onItemAdded={handleItemCreated} 
                                onUploadStart={handleUploadStart}
                                onUploadEnd={handleUploadEnd}
                                onQueueChange={handleQueueChange}
                            />
                        </Col>
                    </Row>

                    {/* RECENT TAGS SECTION */}
                    <RecentTags 
                        selectedTags={activeTags} 
                        onTagSelect={handleTagToggle} 
                    />

                    {/* RECENT ITEMS SECTION */}
                    <div>
                        <div className="d-flex align-items-center justify-content-between mb-3 px-1">
                            <h6 className="text-muted fw-bold small text-uppercase d-flex align-items-center gap-2">
                                <Library size={16} /> Recent Items
                            </h6>
                            <Button 
                                variant="link" 
                                className="text-primary text-decoration-none fw-medium small d-flex align-items-center gap-1"
                                onClick={() => setViewMode("all_items")}
                            >
                                View Library <ArrowRight size={16} />
                            </Button>
                        </div>
                        
                        <VaultList searchQuery="" viewMode="grouped" limit={5} refreshTrigger={refreshTrigger} />
                    </div>
                </motion.div>
            ) : (
                <motion.div
                    key="library"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                >
                    {/* TAGS IN LIBRARY VIEW */}
                    <RecentTags 
                        selectedTags={activeTags} 
                        onTagSelect={handleTagToggle} 
                    />

                    {/* ALL ITEMS LIBRARY HEADER */}
                    <div className="mb-4 d-flex align-items-center gap-2">
                        <Button 
                            variant="ghost" 
                            className="text-muted p-0 me-2"
                            onClick={() => { setViewMode("dashboard"); setActiveTags([]); }}
                        >
                            <ArrowLeft size={24} />
                        </Button>
                        <h4 className="mb-0 fw-bold">
                            {activeTags.length > 0 ? `Tagged: ${activeTags.join(", ")}` : "Full Library"}
                        </h4>
                    </div>
                    
                    <VaultList searchQuery={effectiveSearchQuery} viewMode="grouped" refreshTrigger={refreshTrigger} />
                </motion.div>
            )}
        </AnimatePresence>
      </Container>
    </div>
  );
};

function App() {
  const { user } = useAuth();
  return (
    <ThemeProvider>
      <BrowserRouter>
        <TooltipProvider>
          <Toaster />
          <ErrorBoundary>
              <Routes>
                  <Route path="/" element={user ? <Dashboard /> : <LandingPage />} />
                  <Route path="/dropzone" element={user ? <StandaloneDropZone /> : <Navigate to="/" />} />
              </Routes>
          </ErrorBoundary>
        </TooltipProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;