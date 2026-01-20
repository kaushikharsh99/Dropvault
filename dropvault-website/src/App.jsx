import React, { useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { Container, Button, Navbar, Row, Col } from "react-bootstrap";
import { motion, AnimatePresence } from "framer-motion";
import { Search, LogOut, User, ArrowRight, ArrowLeft, Library, Box, Loader2 } from "lucide-react";
import UniversalDropZone from "./components/UniversalDropZone";
import VaultList from "./components/VaultList";
import LandingPage from "./components/LandingPage";
import RecentTags from "./components/RecentTags";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTags, setActiveTags] = useState([]);
  const [viewMode, setViewMode] = useState("dashboard"); // 'dashboard' | 'all_items'
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [processingItems, setProcessingItems] = useState({}); // item_id -> progress data
  const [uploadingCount, setUploadingCount] = useState(0); // Number of files currently uploading

  const handleRefresh = () => setRefreshTrigger(prev => prev + 1);

  // Handlers for UniversalDropZone
  const handleUploadStart = () => setUploadingCount(prev => prev + 1);
  const handleUploadEnd = () => setUploadingCount(prev => Math.max(0, prev - 1));

  // Restore processing state on mount
  React.useEffect(() => {
      if (!user) return;
      const fetchProcessing = async () => {
          try {
              const res = await fetch(`/api/items?limit=20&userId=${user.uid}`);
              if (res.ok) {
                  const items = await res.json();
                  const processing = {};
                  items.forEach(item => {
                      if (item.status === 'pending' || item.status === 'processing') {
                          processing[item.id] = {
                              item_id: item.id,
                              stage: item.progress_stage || 'queued',
                              percent: item.progress_percent || 0,
                              status: item.status
                          };
                      }
                  });
                  setProcessingItems(prev => ({ ...prev, ...processing }));
              }
          } catch (e) { console.error(e); }
      };
      fetchProcessing();
  }, [user]);

  // Global WebSocket for Progress
  React.useEffect(() => {
    if (!user) return;
    let ws;
    try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${protocol}//${window.location.host}/ws/progress/${user.uid}`);
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.status === "completed" || data.status === "failed") {
                setProcessingItems(prev => {
                    const next = { ...prev };
                    delete next[data.item_id];
                    return next;
                });
                handleRefresh();
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
  const hasActivity = uploadingCount > 0 || activeTasks.length > 0;

  return (
    <div className="min-vh-100 bg-light">
      <Navbar className="mb-4 bg-white border-bottom sticky-top py-3">
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
                    className="form-control rounded-pill border-0 bg-light ps-5 py-2"
                    style={{ fontSize: "0.95rem" }}
                  />
              </div>
              
              <div className="d-flex align-items-center gap-2 border-start ps-3 ms-2">
                  <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center text-primary fw-bold" style={{ width: "36px", height: "36px" }}>
                      {user.displayName?.charAt(0)}
                  </div>
                  <Button variant="ghost" className="text-muted p-1" onClick={logout} title="Sign Out">
                      <LogOut size={20} />
                  </Button>
              </div>
          </div>
        </Container>
      </Navbar>
      
      <Container fluid className="px-4 pb-5">
        {/* GLOBAL ACTIVITY BAR */}
        <AnimatePresence>
            {hasActivity && (
                <motion.div 
                    initial={{ opacity: 0, y: -20, height: 0 }} 
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -20, height: 0 }}
                    className="mb-4 overflow-hidden"
                >
                    <div className="bg-white rounded-4 border p-3 shadow-sm">
                        <div className="d-flex align-items-center gap-3 mb-3 px-1 border-bottom pb-2">
                            <Loader2 size={20} className="text-primary animate-spin" />
                            <div>
                                <h6 className="mb-0 fw-bold text-dark">System Activity</h6>
                                <small className="text-muted">
                                    {uploadingCount > 0 ? `Uploading ${uploadingCount} file(s)... ` : ""}
                                    {activeTasks.length > 0 ? `Processing ${activeTasks.length} item(s)...` : ""}
                                </small>
                            </div>
                        </div>
                        
                        <div className="d-flex flex-column gap-2" style={{ maxHeight: "200px", overflowY: "auto" }}>
                            {/* Uploads Placeholder */}
                            {uploadingCount > 0 && (
                                <div className="bg-light rounded-3 p-2 px-3 border border-opacity-10 d-flex align-items-center gap-3">
                                    <div className="spinner-border spinner-border-sm text-secondary" role="status"></div>
                                    <div className="flex-grow-1">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <span className="small fw-bold text-dark">Uploading Files...</span>
                                            <span className="small text-muted">{uploadingCount} remaining</span>
                                        </div>
                                        <div className="progress mt-1" style={{ height: '4px' }}>
                                            <div className="progress-bar progress-bar-striped progress-bar-animated bg-secondary" style={{ width: '100%' }}></div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Processing Tasks */}
                            {activeTasks.map(task => (
                                <div key={task.item_id} className="bg-light rounded-3 p-2 px-3 border border-opacity-10">
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                        <span className="small fw-bold text-dark">Item #{task.item_id}</span>
                                        <span className="small text-primary fw-bold text-uppercase" style={{ fontSize: '0.65rem' }}>
                                            {task.stage} • {task.percent}%
                                        </span>
                                    </div>
                                    <div className="progress" style={{ height: '4px' }}>
                                        <div 
                                            className="progress-bar progress-bar-striped progress-bar-animated" 
                                            style={{ width: `${task.percent}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

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
                                onItemAdded={handleRefresh} 
                                onUploadStart={handleUploadStart}
                                onUploadEnd={handleUploadEnd}
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
    <BrowserRouter>
      <TooltipProvider>
        <Toaster />
        {user ? <Dashboard /> : <LandingPage />}
      </TooltipProvider>
    </BrowserRouter>
  );
}

export default App;