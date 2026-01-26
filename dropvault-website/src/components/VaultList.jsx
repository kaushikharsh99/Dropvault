import React, { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { Modal, Button, Badge, Row, Col } from "react-bootstrap";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Image as ImageIcon, Link as LinkIcon, Video, File, Trash2, ExternalLink, ArrowLeft, Filter, Edit2, Save, X, Loader2, Mic, Play, CheckSquare, Square } from "lucide-react";

// --- Helper Functions ---

const getYoutubeId = (url) => {
    if (!url) return null;
    const match = url.match(/.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
    return (match && match[2].length === 11) ? match[2] : null;
};

const getVimeoId = (url) => {
    if (!url) return null;
    const match = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/);
    return match ? match[1] : null;
};

const getDailymotionId = (url) => {
    if (!url) return null;
    const match = url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
};

const getTwitchId = (url) => {
    if (!url) return null;
    const videoMatch = url.match(/twitch\.tv\/videos\/(\d+)/);
    if (videoMatch) return { type: 'video', id: videoMatch[1] };
    const channelMatch = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
    if (channelMatch && !url.includes('/videos/')) return { type: 'channel', id: channelMatch[1] };
    return null;
};

const isTikTokUrl = (url) => (url && url.includes('tiktok.com'));
const isTwitterUrl = (url) => (url && (url.includes('twitter.com') || url.includes('x.com')));
const isFacebookUrl = (url) => (url && (url.includes('facebook.com') || url.includes('fb.watch')));
const isInstagramReel = (url) => (url && (url.includes("instagram.com/reel") || url.includes("instagram.com/p/")));

const formatRelativeTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "";
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
};

const getIcon = (type, size = 24) => {
    const props = { size, strokeWidth: 1.5 };
    const t = (type || "").toLowerCase();
    switch (t) {
        case "image": return <ImageIcon {...props} className="text-purple-400" />;
        case "video": return <Video {...props} className="text-red-400" />;
        case "pdf": return <FileText {...props} className="text-orange-400" />;
        case "link": return <LinkIcon {...props} className="text-blue-400" />;
        case "article": return <FileText {...props} className="text-gray-400" />;
        case "audio": return <Mic {...props} className="text-green-400" />;
        default: return <File {...props} className="text-gray-300" />;
    }
};

const InstagramEmbed = ({ url }) => {
    useEffect(() => {
        if (!document.querySelector('script[src="//www.instagram.com/embed.js"]')) {
            const script = document.createElement("script");
            script.src = "//www.instagram.com/embed.js";
            script.async = true;
            document.body.appendChild(script);
        } else if (window.instgrm) {
            window.instgrm.Embeds.process();
        }
    }, [url]);
    const cleanUrl = url.split('?')[0];
    return (
        <div className="d-flex justify-content-center my-3 w-100">
            <blockquote className="instagram-media" data-instgrm-permalink={cleanUrl} data-instgrm-version="14" style={{ background: "#FFF", border: "0", borderRadius: "3px", boxShadow: "0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15)", margin: "1px", maxWidth: "540px", minWidth: "326px", padding: "0", width: "99.375%" }}>
            </blockquote>
        </div>
    );
};

// --- Sub-Components ---

const GridItemCard = ({ item, isSelectionMode, isSelected, onSelect, onClick }) => {
    const url = item.content || item.source_url;
    const ytId = getYoutubeId(url);
    const itemType = (item.type || "").toLowerCase();
    const isVid = ytId || getVimeoId(url) || getDailymotionId(url) || getTwitchId(url) || isTikTokUrl(url) || isInstagramReel(url) || isFacebookUrl(url) || itemType === 'video';
    
    // Prioritize backend metadata thumbnail, fallback to YT default
    const displayThumbnail = item.thumbnail_path || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null);

    return (
    <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        whileHover={{ y: -4, boxShadow: "0 8px 20px rgba(0,0,0,0.3)" }} 
        onClick={() => isSelectionMode ? onSelect(item.id) : onClick(item)} 
        className="bg-card rounded-4 border h-100 overflow-hidden cursor-pointer d-flex flex-column position-relative" 
        style={{ minHeight: "200px", ...(isSelected ? {boxShadow: "0 0 0 2px var(--bs-primary)"} : {}) }}
    >
        {isSelectionMode && (
           <div className="position-absolute top-0 end-0 p-2" style={{ zIndex: 10 }}>
               <div className={`rounded bg-card d-flex align-items-center justify-content-center shadow-sm border ${isSelected ? 'border-primary text-primary' : 'border-secondary text-muted'}`} style={{ width: 28, height: 28 }}>
                   {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
               </div>
           </div>
        )}
        <div className="flex-grow-1 bg-muted d-flex align-items-center justify-content-center position-relative overflow-hidden" style={{ minHeight: "140px" }}>
            {itemType === "image" ? <img src={item.file_path} alt="" className="w-100 h-100 object-fit-cover position-absolute" /> :
             isVid ? (
                 displayThumbnail ? (
                     <React.Fragment>
                         <img src={displayThumbnail} alt="" className="w-100 h-100 object-fit-cover position-absolute" />
                         <div className="position-absolute bg-dark bg-opacity-50 rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: "40px", height: "40px" }}>
                             <Play size={20} className="text-white fill-white" />
                         </div>
                     </React.Fragment>
                 ) : (
                     <div className="w-100 h-100 d-flex align-items-center justify-content-center bg-dark">
                         <Video size={48} className="text-white opacity-75" />
                     </div>
                 )
             ) :
             <div className="opacity-50 transform scale-125">{getIcon(item.type, 48)}</div>}
        </div>
        <div className="p-3 border-top">
            <h6 className="fw-semibold mb-1 text-truncate text-foreground">{item.title || "Untitled"}</h6>
            
            {/* Smart Search Explanation */}
            {item.explanation && (
                <div className="mb-2 p-2 rounded bg-primary bg-opacity-10 border border-primary border-opacity-25">
                    <div className="d-flex align-items-center gap-1 mb-1">
                        <span className="badge bg-primary text-white" style={{fontSize: "0.6rem"}}>AI Match</span>
                    </div>
                    <p className="mb-0 text-muted fst-italic lh-sm" style={{fontSize: "0.7rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden"}}>
                        "{item.explanation}"
                    </p>
                </div>
            )}

            <div className="d-flex align-items-center justify-content-between text-muted small mt-2">
                <span className="text-uppercase fw-bold" style={{ fontSize: "0.65rem" }}>{item.type}</span>
                <span>{formatRelativeTime(item.created_at)}</span>
            </div>
        </div>
    </motion.div>
    );
};

const ItemCard = ({ item, isSelectionMode, isSelected, onSelect, onClick }) => {
  return (
  <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }} 
      className={`bg-card rounded-3 border p-3 cursor-pointer d-flex align-items-center gap-3 transition-all ${isSelected ? 'border-primary bg-muted' : ''}`} 
      onClick={() => isSelectionMode ? onSelect(item.id) : onClick(item)}
  >
      {isSelectionMode && (
           <div className={`${isSelected ? 'text-primary' : 'text-muted'}`}>
               {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
           </div>
      )}
      <div className="p-2 bg-muted rounded-circle d-flex align-items-center justify-content-center position-relative">
          {getIcon(item.type)}
      </div>
      <div className="flex-grow-1 overflow-hidden">
          <h6 className="fw-semibold mb-1 text-truncate text-foreground">{item.title || "Untitled"}</h6>
          
          {/* Smart Search Explanation */}
          {item.explanation && (
             <div className="my-1 text-muted small fst-italic text-truncate">
                 <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 me-2" style={{fontSize: "0.65rem"}}>AI Match</span>
                 "{item.explanation}"
             </div>
          )}

          <div className="d-flex align-items-center gap-2 text-muted small">
              <span className="text-uppercase fw-bold" style={{ fontSize: "0.7rem" }}>{item.type}</span>
              <span>•</span>
              <span>{formatRelativeTime(item.created_at)}</span>
          </div>
      </div>
  </motion.div>
  );
};
// --- Main Component ---

const VaultList = ({ searchQuery = "", viewMode = "list", limit = 0, refreshTrigger }) => {
  const { user } = useAuth();
  
  const [itemsPool, setItemsPool] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [hasMoreMap, setHasMoreMap] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", content: "", tags: "" });
  const [selectedItems, setSelectedItems] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // WebSocket Connection
  useEffect(() => {
    if (!user) return;
    
    let ws;
    try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Hack: Force port 8000 for local dev to bypass Vite proxy issues
        const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
        ws = new WebSocket(`${protocol}//${host}/ws/progress/${user.uid}`);
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setItemsPool(prev => prev.map(item => {
                if (item.id === data.item_id) {
                    return { ...item, ...data };
                }
                return item;
            }));
        };
        
        ws.onerror = (e) => console.error("WS Error:", e);
    } catch (e) { console.error("WS Setup Error:", e); }

    return () => {
        if (ws) ws.close();
    };
  }, [user]);

  const getPageSize = (isInitial) => (isInitial ? 32 : 150);
  const toggleSelection = (id, e) => {
      if (e) e.stopPropagation();
      setSelectedItems(prev => {
          if (prev.includes(id)) return prev.filter(i => i !== id);
          return [...prev, id];
      });
  };

  const handleBulkDelete = async () => {
      if (!window.confirm(`Delete ${selectedItems.length} items?`)) return;
      
      // Optimistic Update
      const previousItems = [...itemsPool];
      setItemsPool(prev => prev.filter(item => !selectedItems.includes(item.id)));
      setSearchResults(prev => prev.filter(item => !selectedItems.includes(item.id)));
      setIsSelectionMode(false);
      const itemsToDelete = [...selectedItems];
      setSelectedItems([]);

      try {
          const url = `/api/items/bulk-delete${user ? `?userId=${user.uid}` : ""}`;
          const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ item_ids: itemsToDelete })
          });
          
          if (!res.ok) {
              // Revert if failed
              setItemsPool(previousItems);
              alert("Failed to delete items.");
          }
      } catch (e) { 
          console.error(e);
          setItemsPool(previousItems); // Revert on error
      }
  };

  // ... (fetch logic remains same, but using itemsPool/searchResults)
  // 1. Derived State: base items
  const baseItems = searchQuery ? searchResults : itemsPool;

  // 2. Derived State: filtered items
  const filteredItems = baseItems.filter(item => {
      const url = item.content || item.source_url;
      const isYoutube = getYoutubeId(url);
      const itemType = (item.type || "").toLowerCase();
      const isVideo = itemType === "video" || isYoutube || getVimeoId(url) || getDailymotionId(url) || getTwitchId(url) || isTikTokUrl(url) || isInstagramReel(url) || isFacebookUrl(url);
      
      if (activeFilter === "ALL") return true;
      if (activeFilter === "YOUTUBE") return isYoutube;
      if (activeFilter === "IMAGE") return itemType === "image";
      if (activeFilter === "VIDEO") return isVideo && !isYoutube;
      if (activeFilter === "AUDIO") return itemType === "audio";
      if (activeFilter === "DOCS") return (itemType === "pdf" || itemType === "file") && itemType !== "audio";
      if (activeFilter === "LINKS") return ((itemType === "link" || itemType === "article") && !isVideo);
      if (activeFilter === "NOTES") return itemType === "note";
      return true;
  });

  // 3. Derived State: Displayed Items
  const displayedItems = limit > 0 ? filteredItems.slice(0, limit) : filteredItems;

  const fetchItems = async (isInitial = true) => {
      if (isInitial) setLoading(true); else setLoadingMore(true);
      
      try {
          let url = "/api/items";
          const offset = isInitial ? 0 : itemsPool.length; 
          const currentPageSize = getPageSize(isInitial);
          
          if (searchQuery) {
              url = `/api/search?q=${encodeURIComponent(searchQuery)}`;
              setIsSearching(true);
          } else {
              url += `?limit=${currentPageSize}&offset=${offset}&type=${activeFilter}`;
              setIsSearching(false);
          }
          
          if (user) {
              url += (url.includes('?') ? '&' : '?') + `userId=${user.uid}`;
          }

          const res = await fetch(url);
          if (res.ok) {
              const data = await res.json();
              if (searchQuery) {
                  setSearchResults(data);
              } else {
                  setItemsPool(prev => {
                      const combined = isInitial ? data : [...prev, ...data];
                      const uniqueMap = {};
                      combined.forEach(item => { uniqueMap[item.id] = item; });
                      return Object.values(uniqueMap).sort((a, b) => {
                          const dateA = new Date((a.created_at || "").replace(" ", "T"));
                          const dateB = new Date((b.created_at || "").replace(" ", "T"));
                          return dateB - dateA;
                      });
                  });
                  setHasMoreMap(prev => ({ ...prev, [activeFilter]: data.length === currentPageSize }));
              }
          } else {
              console.error("Fetch failed:", res.status);
          }
      } catch (e) { 
          console.error("Fetch error:", e); 
      } finally { 
          setLoading(false); 
          setLoadingMore(false); 
      } 
  };

  useEffect(() => {
      if (refreshTrigger > 0) { setItemsPool([]); setHasMoreMap({}); }
      if (limit > 0) {
          const fetchRecent = async () => {
              setLoading(true);
              try {
                  let url = `/api/items?limit=${limit}` + (user ? `&userId=${user.uid}` : "");
                  const res = await fetch(url);
                  if (res.ok) {
                      const data = await res.json();
                      setItemsPool(prev => {
                          const combined = [...prev, ...data];
                          const uniqueMap = {};
                          combined.forEach(item => { uniqueMap[item.id] = item; });
                          return Object.values(uniqueMap).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                      });
                  }
              } catch (e) { console.error(e); } finally { setLoading(false); }
          };
          fetchRecent();
      } else {
          fetchItems(true);
      }
  }, [user, searchQuery, refreshTrigger, limit, activeFilter]);

  useEffect(() => {
      if (selectedItem) {
          setIsEditing(false);
          setEditForm({ title: selectedItem.title || "", content: selectedItem.content || "", tags: selectedItem.tags || "" });
      }
  }, [selectedItem]);

  const handleDelete = async (e) => {
    if (e) e.stopPropagation();
    if (!selectedItem || !window.confirm("Are you sure?")) return;
    try {
        const res = await fetch(`/api/items/${selectedItem.id}${user ? `?userId=${user.uid}` : ""}`, { method: 'DELETE' });
        if (res.ok) {
            setItemsPool(prev => prev.filter(item => item.id !== selectedItem.id));
            setSelectedItem(null);
        }
    } catch (err) { console.error(err); }
  };

  const handleUpdate = async () => {
      if (!selectedItem) return;
      try {
          const formData = new FormData();
          formData.append("title", editForm.title);
          formData.append("content", editForm.content);
          formData.append("tags", editForm.tags);
          if (user) formData.append("userId", user.uid);
          
          const res = await fetch(`/api/items/${selectedItem.id}`, { method: 'PUT', body: formData });
          if (res.ok) {
              const updatedItem = { ...selectedItem, ...editForm };
              setItemsPool(prev => prev.map(i => (i.id === updatedItem.id ? updatedItem : i)));
              setSelectedItem(updatedItem);
              setIsEditing(false);
          }
      } catch (e) { console.error(e); }
  };

  const FilterTabs = () => (
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-4 gap-3">
        <div className="d-flex gap-2 overflow-auto pb-2 flex-grow-1" style={{ scrollbarWidth: "none" }}>
            {["ALL", "YOUTUBE", "IMAGE", "VIDEO", "AUDIO", "DOCS", "LINKS", "NOTES"].map(f => (
                <button key={f} onClick={() => setActiveFilter(f)} className={`btn btn-sm rounded-pill px-3 fw-medium transition-all ${activeFilter === f ? "btn-primary text-white" : "btn-muted text-muted border border-muted"}`} style={{ whiteSpace: "nowrap" }}>
                    {f === "ALL" ? "All Items" : f === "YOUTUBE" ? "YouTube" : f === "AUDIO" ? "Audio" : f.charAt(0) + f.slice(1).toLowerCase()}
                </button>
            ))}
        </div>
        <div className="d-flex gap-2 ms-auto">
            {isSelectionMode ? (
                <React.Fragment>
                     <Button variant="danger" size="sm" onClick={handleBulkDelete} disabled={selectedItems.length === 0} className="rounded-pill px-3 d-flex align-items-center gap-2">
                        <Trash2 size={14} /> Delete ({selectedItems.length})
                     </Button>
                     <Button variant="outline-secondary" size="sm" onClick={() => { setIsSelectionMode(false); setSelectedItems([]); }} className="rounded-pill px-3">
                        Cancel
                     </Button>
                </React.Fragment>
            ) : (
                <Button variant="ghost" size="sm" onClick={() => setIsSelectionMode(true)} className="text-muted rounded-pill px-3">
                    Select
                </Button>
            )}
        </div>
      </div>
  );

  const isGrid = (viewMode === "grouped" || limit > 0);

  return (
    <React.Fragment>
      {viewMode === "grouped" && limit === 0 && <FilterTabs />}
      <AnimatePresence mode="popLayout">
          {loading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-100"
              >
                  <Row className="g-3 row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5">
                      {[...Array(limit > 0 ? limit : 10)].map((_, i) => (
                          <Col key={i}>
                              <div className="bg-muted rounded-4 border animate-pulse" style={{ height: "200px" }}></div>
                          </Col>
                      ))}
                  </Row>
              </motion.div>
          ) : filteredItems.length === 0 ? (
              <motion.div key="empty" className="text-center py-5 text-muted">
                  <File size={48} className="mb-3 opacity-25" />
                  {searchQuery ? "No matches found." : "Your vault is empty."}
              </motion.div>
          ) : (
              <motion.div key="content">
                  {isGrid ? (
                      <Row className="g-3 row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5">
                          {displayedItems.map(item => (
                              <Col key={item.id}>
                                  <GridItemCard 
                                    item={item} 
                                    isSelectionMode={isSelectionMode}
                                    isSelected={selectedItems.includes(item.id)}
                                    onSelect={toggleSelection}
                                    onClick={setSelectedItem}
                                  />
                              </Col>
                          ))}
                      </Row>
                  ) : (
                      <div className="d-flex flex-column gap-3">
                          {displayedItems.map(item => (
                              <ItemCard 
                                key={item.id} 
                                item={item} 
                                isSelectionMode={isSelectionMode}
                                isSelected={selectedItems.includes(item.id)}
                                onSelect={toggleSelection}
                                onClick={setSelectedItem}
                              />
                          ))}
                      </div>
                  )}
                  {hasMoreMap[activeFilter] && !searchQuery && limit === 0 && (
                      <div className="text-center mt-5">
                          <Button variant="outline-primary" onClick={() => fetchItems(false)} disabled={loadingMore} className="rounded-pill px-4">
                              {loadingMore ? "Loading..." : "Load More"}
                          </Button>
                      </div>
                  )}
              </motion.div>
          )}
      </AnimatePresence>

      <Modal show={!!selectedItem} onHide={() => setSelectedItem(null)} centered size="lg" contentClassName="border-0 shadow-lg rounded-4 overflow-hidden bg-card text-foreground">
        <Modal.Body className="p-0">
             {selectedItem && (
                 <div>
                     <div className="d-flex align-items-center justify-content-between p-4 border-bottom bg-card sticky-top">
                        <Button variant="ghost" className="p-0 text-muted d-flex align-items-center gap-2" onClick={() => setSelectedItem(null)}><ArrowLeft size={20} /> Back</Button>
                        <div className="d-flex gap-2">
                             {isEditing ? (
                                <React.Fragment>
                                    <Button variant="outline-secondary" size="sm" onClick={() => setIsEditing(false)}><X size={16} /> Cancel</Button>
                                    <Button variant="primary" size="sm" onClick={handleUpdate}><Save size={16} /> Save</Button>
                                </React.Fragment>
                             ) : (
                                <React.Fragment>
                                    <Button variant="ghost" className="text-primary" onClick={() => setIsEditing(true)}><Edit2 size={20} /></Button>
                                    <Button variant="ghost" className="text-danger" onClick={handleDelete}><Trash2 size={20} /></Button>
                                </React.Fragment>
                             )}
                        </div>
                     </div>
                     <div className="p-4 p-md-5 bg-background" style={{ minHeight: "60vh" }}>
                        {isEditing ? (
                            <div className="bg-card p-4 rounded-4 border">
                                <input type="text" className="form-control mb-3 bg-muted border-0 text-foreground" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} />
                                <textarea className="form-control mb-3 bg-muted border-0 text-foreground" rows={10} value={editForm.content} onChange={e => setEditForm({...editForm, content: e.target.value})} />
                                <input type="text" className="form-control bg-muted border-0 text-foreground" value={editForm.tags} onChange={e => setEditForm({...editForm, tags: e.target.value})} />
                            </div>
                        ) : (
                            <div>
                                <h2 className="fw-bold mb-2">{selectedItem.title || "Untitled"}</h2>
                                <div className="d-flex gap-2 mb-4 text-muted small"><span className="text-uppercase">{selectedItem.type}</span>•<span>{formatRelativeTime(selectedItem.created_at)}</span></div>
                                <div className="bg-card p-4 rounded-4 border">
                                    {selectedItem.type === "image" && <div className="text-center"><img src={selectedItem.file_path} alt="" className="img-fluid rounded mb-3" style={{ maxHeight: "500px" }} /></div>}
                                    
                                    {(selectedItem.type === "audio" || (selectedItem.type === "video" && selectedItem.file_path && !selectedItem.file_path.startsWith('http'))) && (
                                        <div className="mb-4">
                                            <div className="bg-muted p-3 rounded-3 mb-3 border d-flex align-items-center justify-content-center">
                                                {selectedItem.type === "audio" ? (
                                                    <audio controls style={{ width: "100%" }}>
                                                        <source 
                                                            src={selectedItem.file_path} 
                                                            type={selectedItem.file_path.toLowerCase().endsWith('.wav') ? 'audio/wav' : 'audio/mpeg'} 
                                                        />
                                                        Your browser does not support the audio element.
                                                    </audio>
                                                ) : (
                                                    <video controls src={selectedItem.file_path} style={{ width: "100%", borderRadius: "8px" }}>
                                                        Your browser does not support the video element.
                                                    </video>
                                                )}
                                            </div>
                                            <div className="d-flex justify-content-end">
                                                <Button 
                                                    variant="outline-secondary" 
                                                    size="sm" 
                                                    onClick={() => {
                                                        let text = selectedItem.content || "";
                                                        if (text.includes("AI Description:")) {
                                                            text = text.split("AI Description:")[0];
                                                        }
                                                        if (text.includes("Detected Objects:")) {
                                                            text = text.split("Detected Objects:")[0];
                                                        }
                                                        navigator.clipboard.writeText(text.trim());
                                                    }}
                                                    className="d-flex align-items-center gap-2"
                                                >
                                                    <FileText size={14} /> Copy Transcription
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {(() => {
                                        const url = selectedItem.file_path || selectedItem.content || selectedItem.source_url;
                                        if (!url || !url.startsWith('http')) return null;
                                        if (isInstagramReel(url)) return <InstagramEmbed url={url} />;
                                        const ytId = getYoutubeId(url);
                                        if (ytId) return <div className="ratio ratio-16x9 mb-3"><iframe src={`https://www.youtube.com/embed/${ytId}`} allowFullScreen></iframe></div>;
                                        const vId = getVimeoId(url);
                                        if (vId) return <div className="ratio ratio-16x9 mb-3"><iframe src={`https://player.vimeo.com/video/${vId}`} allowFullScreen></iframe></div>;
                                        const dmId = getDailymotionId(url);
                                        if (dmId) return <div className="ratio ratio-16x9 mb-3"><iframe src={`https://www.dailymotion.com/embed/video/${dmId}`} allowFullScreen></iframe></div>;
                                        const tw = getTwitchId(url);
                                        if (tw) return <div className="ratio ratio-16x9 mb-3"><iframe src={`https://player.twitch.tv/?${tw.type}=${tw.id}&parent=${window.location.hostname}`} allowFullScreen></iframe></div>;
                                        if (isTikTokUrl(url)) {
                                            const tId = url.split('/video/')[1]?.split('?')[0];
                                            return tId ? <div className="d-flex justify-content-center mb-3"><blockquote className="tiktok-embed" cite={url} data-video-id={tId} style={{ maxWidth: "605px", minWidth: "325px" }}><section><a href={url}>{url}</a></section></blockquote><script async src="https://www.tiktok.com/embed.js"></script></div> : null;
                                        }
                                        if (isTwitterUrl(url)) return <div className="d-flex justify-content-center mb-3"><blockquote className="twitter-tweet"><a href={url}></a></blockquote><script async src="https://platform.twitter.com/widgets.js"></script></div>;
                                        if (isFacebookUrl(url)) return <div className="ratio ratio-16x9 mb-3"><iframe src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`} allowFullScreen></iframe></div>;
                                        return null;
                                    })()}

                                    <div className="mb-4 text-muted" style={{ whiteSpace: "pre-wrap" }}>
                                        {selectedItem.content?.includes("--- Extracted Links ---") ? selectedItem.content.split("--- Extracted Links ---")[0] : selectedItem.content}
                                    </div>

                                    {selectedItem.type !== "note" && (
                                        <div className="py-3 text-center">
                                            <Button href={selectedItem.file_path || selectedItem.content} target="_blank" variant="primary">
                                                <ExternalLink size={18} className="me-2" /> 
                                                {(selectedItem.type === "pdf" || selectedItem.type === "file" || selectedItem.type === "audio" || (selectedItem.type === "video" && selectedItem.file_path && !selectedItem.file_path.startsWith('http'))) ? "View File" : "Open Original Link"}
                                            </Button>
                                        </div>
                                    )}

                                    {selectedItem.content?.includes("--- Extracted Links ---") && (
                                        <div className="mt-4 p-3 bg-muted rounded-3 border">
                                            <small className="text-muted d-block mb-2 fw-bold text-uppercase">Extracted Links</small>
                                            <div className="d-flex flex-column gap-2">
                                                {selectedItem.content.split("--- Extracted Links ---")[1].split("\n").map(l => {
                                                    const m = l.match(/(https?:\/\/[^\s]+)/);
                                                    return m ? m[0] : null;
                                                }).filter(l => l).map((l, i) => (
                                                    <a key={i} href={l} target="_blank" rel="noreferrer" className="text-break text-decoration-none small d-flex gap-2"><LinkIcon size={14} className="mt-1" />{l}</a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                     </div>
                 </div>
             )}
        </Modal.Body>
      </Modal>
    </React.Fragment>
  );
};

export default VaultList;