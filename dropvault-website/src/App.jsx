import React, { useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { Container, Button, Navbar, Row, Col } from "react-bootstrap";
import { motion, AnimatePresence } from "framer-motion";
import { Search, LogOut, User, ArrowRight, ArrowLeft, Library, Box } from "lucide-react";
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

  const handleRefresh = () => setRefreshTrigger(prev => prev + 1);

  const effectiveSearchQuery = activeTags.length > 0 ? activeTags.join(", ") : searchQuery;

  const handleTagToggle = (tag) => {
      if (Array.isArray(tag)) {
          // Clear all
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
      setSearchQuery(""); // Clear text search when tagging
  };

  return (
    <div className="min-vh-100 bg-light">
      <Navbar className="mb-4 bg-white border-bottom sticky-top py-3">
        <Container style={{ maxWidth: "900px" }}>
          <Navbar.Brand 
            href="#" 
            className="fw-bold fs-4 d-flex align-items-center gap-2 text-primary" 
            onClick={() => { setViewMode("dashboard"); setActiveTags([]); setSearchQuery(""); }}
          >
            <Box size={28} strokeWidth={2} />
            DropVault
          </Navbar.Brand>
          
          <div className="d-flex align-items-center gap-3">
              <div className="position-relative" style={{ width: "240px" }}>
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
      
      <Container style={{ maxWidth: "900px" }} className="pb-5">
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
                            <UniversalDropZone onItemAdded={handleRefresh} />
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
                        
                        <VaultList searchQuery="" viewMode="grouped" limit={4} refreshTrigger={refreshTrigger} />
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