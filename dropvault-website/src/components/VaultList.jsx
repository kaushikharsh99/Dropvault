import React, { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { Modal, Button, Badge, Row, Col } from "react-bootstrap";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Image as ImageIcon, Link as LinkIcon, Video, File, Trash2, ExternalLink, ArrowLeft, Filter, Edit2, Save, X, Loader2 } from "lucide-react";

const VaultList = ({ searchQuery = "", viewMode = "list", limit = 0, refreshTrigger }) => {
  const { user } = useAuth();
  
  // Global pool of all items loaded in this session
  const [itemsPool, setItemsPool] = useState([]);
  // Separate state for search results
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState("ALL");
  
  // Track 'hasMore' status for each category individually
  const [hasMoreMap, setHasMoreMap] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", content: "", tags: "" });

  const getPageSize = (isInitial) => isInitial ? 32 : 150;

  const getYoutubeId = (url) => {
    if (!url) return null;
    const regExp = /.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "";
    const days = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  const getIcon = (type, size=24) => {
    const props = { size, strokeWidth: 1.5 };
    const t = type?.toLowerCase();
    switch (t) {
        case "image": return <ImageIcon {...props} className="text-purple-500" />;
        case "video": return <Video {...props} className="text-red-500" />;
        case "pdf": return <FileText {...props} className="text-orange-500" />;
        case "link": return <LinkIcon {...props} className="text-blue-500" />;
        case "article": return <FileText {...props} className="text-gray-500" />;
        default: return <File {...props} className="text-gray-400" />;
    }
  };

  // Decide which items to filter based on whether we are searching
  const baseItems = searchQuery ? searchResults : itemsPool;

  const filteredItemsFromPool = baseItems.filter(item => {
      const isYoutube = getYoutubeId(item.content || item.source_url);
      const type = item.type?.toLowerCase();
      if (activeFilter === "ALL") return true;
      if (activeFilter === "YOUTUBE") return isYoutube;
      if (activeFilter === "IMAGE") return type === "image";
      if (activeFilter === "VIDEO") return type === "video" && !isYoutube;
      if (activeFilter === "DOCS") return type === "pdf" || type === "file";
      if (activeFilter === "LINKS") return (type === "link" || type === "article") && !isYoutube;
      if (activeFilter === "NOTES") return type === "note";
      return true;
  });

  const fetchItems = async (isInitial = true) => {
      // If we are not searching, and already have pool items for this tab, skip initial load
      if (isInitial && !searchQuery && filteredItemsFromPool.length > 0) {
          return;
      }

      if (isInitial) setLoading(true);
      else setLoadingMore(true);
      
      try {
          let url = "/api/items";
          const offset = isInitial ? 0 : filteredItemsFromPool.length;
          const currentPageSize = getPageSize(isInitial);
          
          if (searchQuery) {
              url = `/api/search?q=${encodeURIComponent(searchQuery)}`;
              setIsSearching(true);
          } else {
              url += `?limit=${currentPageSize}&offset=${offset}&type=${activeFilter}`;
              setIsSearching(false);
          }
          
          if (user) {
              const separator = url.includes('?') ? '&' : '?';
              url += `${separator}userId=${user.uid}`;
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
                      combined.forEach(item => uniqueMap[item.id] = item);
                      return Object.values(uniqueMap).sort((a, b) => 
                          new Date(b.created_at) - new Date(a.created_at)
                      );
                  });
                  const newHasMore = data.length === currentPageSize;
                  setHasMoreMap(prev => ({ ...prev, [activeFilter]: newHasMore }));
              }
          }
      } catch (e) {
          console.error("Fetch items failed", e);
      } finally {
          setLoading(false);
          setLoadingMore(false);
      }
  };

  useEffect(() => {
      if (refreshTrigger > 0) {
          setItemsPool([]);
          setHasMoreMap({});
      }
      
      if (limit > 0) {
          const fetchRecent = async () => {
              setLoading(true);
              try {
                  let url = `/api/items?limit=${limit}`;
                  if (user) url += `&userId=${user.uid}`;
                  const res = await fetch(url);
                  if (res.ok) {
                      const data = await res.json();
                      setItemsPool(prev => {
                          const combined = [...prev, ...data];
                          const uniqueMap = {};
                          combined.forEach(item => uniqueMap[item.id] = item);
                          return Object.values(uniqueMap).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                      });
                  }
              } catch (e) { console.error(e); }
              finally { setLoading(false); }
          };
          fetchRecent();
      } else {
          fetchItems(true); 
      }
  }, [user, searchQuery, refreshTrigger, limit, activeFilter]);

  useEffect(() => {
      if (selectedItem) {
          setIsEditing(false);
          setEditForm({
              title: selectedItem.title || "",
              content: selectedItem.content || "",
              tags: selectedItem.tags || ""
          });
      }
  }, [selectedItem]);

  const handleDelete = async (e) => {
    if (e) e.stopPropagation();
    if (!selectedItem || !window.confirm("Are you sure you want to delete this item? This action cannot be undone.")) return;
    try {
        const userIdParam = user ? `?userId=${user.uid}` : "";
        const res = await fetch(`/api/items/${selectedItem.id}${userIdParam}`, { method: 'DELETE' });
        if (res.ok) {
            const deletedId = selectedItem.id;
            setSelectedItem(null);
            setItemsPool(prev => prev.filter(item => item.id !== deletedId));
        } else {
            alert("Failed to delete item.");
        }
    } catch (err) { 
        console.error("Delete failed", err);
    }
  };

  const handleUpdate = async () => {
      if (!selectedItem) return;
      try {
          const formData = new FormData();
          formData.append("title", editForm.title);
          formData.append("content", editForm.content);
          formData.append("tags", editForm.tags);
          if (user) formData.append("userId", user.uid);
          
          const res = await fetch(`/api/items/${selectedItem.id}`, {
              method: 'PUT',
              body: formData
          });
          
          if (res.ok) {
              setIsEditing(false);
              const updatedItem = { ...selectedItem, ...editForm };
              setSelectedItem(updatedItem);
              setItemsPool(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
          }
      } catch (e) {
          console.error("Update failed", e);
      }
  };

  const isGridView = viewMode === "grouped" || limit > 0; 

  const FilterTabs = () => (
      <div className="d-flex gap-2 mb-4 overflow-auto pb-2" style={{ scrollbarWidth: "none" }}>
          {["ALL", "YOUTUBE", "IMAGE", "VIDEO", "DOCS", "LINKS", "NOTES"].map(filter => (
              <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`btn btn-sm rounded-pill px-3 fw-medium transition-all ${activeFilter === filter ? "btn-dark" : "btn-light text-muted border"}`}
                  style={{ whiteSpace: "nowrap" }}
              >
                  {filter === "ALL" ? "All Items" : filter === "YOUTUBE" ? "YouTube" : filter.charAt(0) + filter.slice(1).toLowerCase()}
              </button>
          ))}
      </div>
  );

  const handleItemClick = async (item) => {
      setSelectedItem(item); // Show immediate preview
      try {
          let url = `/api/items/${item.id}`;
          if (user) url += `?userId=${user.uid}`;
          const res = await fetch(url);
          if (res.ok) {
              const fullItem = await res.json();
              setSelectedItem(fullItem); // Update with full content
          }
      } catch (e) {
          console.error("Failed to fetch full item", e);
      }
  };

  const handleItemClick = async (item) => {
      setSelectedItem(item); // Show immediate preview
      try {
          let url = `/api/items/${item.id}`;
          if (user) url += `?userId=${user.uid}`;
          const res = await fetch(url);
          if (res.ok) {
              const fullItem = await res.json();
              setSelectedItem(fullItem); // Update with full content
          }
      } catch (e) {
          console.error("Failed to fetch full item", e);
      }
  };

  const SkeletonTile = () => (

  const GridItemCard = ({ item }) => {
      const youtubeId = (item.type === 'link' || item.type === 'article' || item.type === 'video') ? getYoutubeId(item.content || item.source_url) : null;
      const isHeavyImage = item.type === "image" && item.file_size > 512000; // > 500KB

      return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={{ y: -4, boxShadow: "0 8px 20px rgba(0,0,0,0.08)" }}
        whileTap={{ scale: 0.98 }}
        onClick={() => handleItemClick(item)}
        className="bg-white rounded-4 border h-100 overflow-hidden cursor-pointer d-flex flex-column"
        style={{ minHeight: "200px" }}
      >
          <div className="flex-grow-1 bg-light d-flex align-items-center justify-content-center position-relative overflow-hidden" style={{ minHeight: "140px" }}>
              {item.type === "image" ? (
                  isHeavyImage ? (
                      <div className="d-flex flex-column align-items-center text-muted opacity-75">
                          <ImageIcon size={32} className="mb-2" />
                          <span className="small fw-bold">Click to View</span>
                          <span style={{ fontSize: "0.6rem" }}>{(item.file_size / 1024 / 1024).toFixed(1)} MB</span>
                      </div>
                  ) : (
                      <img src={item.file_path} alt="" className="w-100 h-100 object-fit-cover position-absolute" />
                  )
              ) : youtubeId ? (
                   <div className="w-100 h-100 position-relative">
                        <img 
                            src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`} 
                            alt="YouTube Thumbnail" 
                            className="w-100 h-100 object-fit-cover position-absolute"
                        />
                        <div className="position-absolute top-50 start-50 translate-middle bg-black bg-opacity-50 rounded-circle p-2">
                            <Video size={24} className="text-white" />
                        </div>
                   </div>
              ) : (
                  <div className="opacity-50 transform scale-125">
                      {getIcon(item.type, 48)}
                  </div>
              )}
              {item.type === "video" && (
                 <div className="position-absolute bg-black bg-opacity-50 rounded-circle p-2">
                     <Video size={24} className="text-white" />
                 </div>
              )}
          </div>
          <div className="p-3 border-top">
              <h6 className="fw-semibold mb-1 text-truncate text-dark" style={{ fontSize: "0.95rem" }}>{item.title || "Untitled"}</h6>
              <div className="d-flex align-items-center justify-content-between text-muted small mt-2">
                  <span className="text-uppercase fw-bold" style={{ fontSize: "0.65rem" }}>{item.type}</span>
                  <span>{formatRelativeTime(item.created_at)}</span>
              </div>
              {item.tags && (
                  <div className="d-flex flex-wrap gap-1 mt-2">
                      {item.tags.split(',').slice(0, 3).map((tag, i) => (
                          <Badge key={i} bg="light" text="dark" className="border fw-normal" style={{ fontSize: "0.65rem" }}>
                              {tag.trim()}
                          </Badge>
                      ))}
                      {item.tags.split(',').length > 3 && (
                          <span className="text-muted" style={{ fontSize: "0.65rem" }}>+{item.tags.split(',').length - 3}</span>
                      )}
                  </div>
              )}
          </div>
      </motion.div>
      );
  };

  const ItemCard = ({ item }) => {
    const youtubeId = (item.type === 'link' || item.type === 'article' || item.type === 'video') ? getYoutubeId(item.content || item.source_url) : null;
    return (
    <motion.div 
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
        whileTap={{ scale: 0.98 }}
        className="bg-white rounded-3 border p-3 cursor-pointer d-flex align-items-center gap-3 transition-all"
        onClick={() => handleItemClick(item)}
    >
        {youtubeId ? (
            <div className="rounded overflow-hidden flex-shrink-0 position-relative bg-black" style={{ width: "160px", aspectRatio: "16/9" }} onClick={(e) => e.stopPropagation()}>
                <iframe 
                    src={`https://www.youtube.com/embed/${youtubeId}`}
                    title={item.title}
                    className="w-100 h-100"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                ></iframe>
            </div>
        ) : (
            <div className="p-2 bg-light rounded-circle d-flex align-items-center justify-content-center">
                {getIcon(item.type)}
            </div>
        )}
        <div className="flex-grow-1 overflow-hidden">
            <h6 className="fw-semibold mb-1 text-truncate text-dark">{item.title || "Untitled Note"}</h6>
            <div className="d-flex align-items-center gap-2 text-muted small flex-wrap">
                <span className="text-uppercase fw-bold" style={{ fontSize: "0.7rem" }}>{item.type}</span>
                <span>•</span>
                <span>{formatRelativeTime(item.created_at)}</span>
                {item.tags && (
                    <>
                        <span>•</span>
                        {item.tags.split(',').map((tag, i) => (
                            <Badge key={i} bg="secondary" className="fw-normal" style={{ fontSize: "0.7rem", opacity: 0.8 }}>
                                {tag.trim()}
                            </Badge>
                        ))}
                    </>
                )}
            </div>
        </div>
    </motion.div>
    );
  };

  const hasMore = hasMoreMap[activeFilter] ?? true;
  const items = filteredItemsFromPool;
  const displayedItems = limit > 0 ? items.slice(0, limit) : items;

  return (
    <>
      {isGridView && limit === 0 && <FilterTabs />}
      
      <AnimatePresence mode="popLayout">
          {loading ? (
               <div className="w-100">
                   <Row className="g-3">
                       {[...Array(limit > 0 ? limit : 8)].map((_, i) => (
                           <Col xs={6} md={4} lg={3} key={i}>
                               <SkeletonTile />
                           </Col>
                       ))}
                   </Row>
               </div>
          ) : items.length === 0 ? (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-5 text-muted">
                   <div className="mb-3 opacity-25"><File size={48} /></div>
                   {searchQuery ? "No matches found." : "Your vault is empty."}
               </motion.div>
          ) : (
                <>
                    {isGridView ? (
                        <div>
                            <Row className="g-3">
                                {displayedItems.map(item => (
                                    <Col xs={6} md={4} lg={3} key={item.id}>
                                        <GridItemCard item={item} />
                                    </Col>
                                ))}
                            </Row>
                        </div>
                    ) : (
                        <div className="d-flex flex-column gap-3">
                            {displayedItems.map(item => <ItemCard key={item.id} item={item} />)}
                        </div>
                    )}

                    {hasMore && !searchQuery && limit === 0 && (
                        <div className="text-center mt-5">
                            <Button 
                                variant="outline-primary" 
                                onClick={() => fetchItems(false)} 
                                disabled={loadingMore}
                                className="rounded-pill px-4"
                            >
                                {loadingMore ? (
                                    <div className="d-flex align-items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Loading...
                                    </div>
                                ) : "Load More Items"}
                            </Button>
                        </div>
                    )}
                </>
          )}
      </AnimatePresence>

      <Modal show={!!selectedItem} onHide={() => setSelectedItem(null)} centered size="lg" contentClassName="border-0 shadow-lg rounded-4 overflow-hidden">
        <Modal.Body className="p-0">
             {selectedItem && (
                 <div>
                     <div className="d-flex align-items-center justify-content-between p-4 border-bottom bg-white sticky-top">
                        <div className="d-flex align-items-center gap-2">
                            <Button variant="ghost" className="p-0 text-muted d-flex align-items-center gap-2" onClick={() => setSelectedItem(null)}>
                                <ArrowLeft size={20} /> Back
                            </Button>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                             {isEditing ? (
                                <>
                                    <Button variant="outline-secondary" size="sm" onClick={() => setIsEditing(false)} className="d-flex align-items-center gap-2">
                                        <X size={16} /> Cancel
                                    </Button>
                                    <Button variant="primary" size="sm" onClick={handleUpdate} className="d-flex align-items-center gap-2">
                                        <Save size={16} /> Save Changes
                                    </Button>
                                </>
                             ) : (
                                <>
                                    <Button variant="ghost" className="text-primary p-2" onClick={() => setIsEditing(true)} title="Edit Item">
                                        <Edit2 size={20} />
                                    </Button>
                                    <Button variant="ghost" className="text-danger p-2 d-flex align-items-center gap-2" onClick={handleDelete} title="Delete Item">
                                        <Trash2 size={20} /> <span className="d-none d-md-inline fw-medium">Delete</span>
                                    </Button>
                                </>
                             )}
                        </div>
                     </div>

                     <div className="p-4 p-md-5 bg-light" style={{ minHeight: "60vh" }}>
                        {isEditing ? (
                            <div className="d-flex flex-column gap-3">
                                <div className="bg-white p-4 rounded-4 shadow-sm border">
                                    <label className="small text-muted fw-bold text-uppercase mb-1">Title</label>
                                    <input 
                                        type="text" 
                                        className="form-control fs-5 fw-bold mb-3" 
                                        value={editForm.title} 
                                        onChange={e => setEditForm({...editForm, title: e.target.value})} 
                                    />
                                    
                                    <label className="small text-muted fw-bold text-uppercase mb-1">Content / Notes</label>
                                    <textarea 
                                        className="form-control mb-3" 
                                        rows={10} 
                                        value={editForm.content} 
                                        onChange={e => setEditForm({...editForm, content: e.target.value})} 
                                        style={{ fontSize: "1rem", lineHeight: "1.6" }}
                                    />
                                    
                                    <label className="small text-muted fw-bold text-uppercase mb-1">Tags (comma separated)</label>
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        value={editForm.tags} 
                                        onChange={e => setEditForm({...editForm, tags: e.target.value})} 
                                        placeholder="e.g. work, ideas, urgent"
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="mb-4">
                                    <motion.h2 layoutId={`title-${selectedItem.id}`} className="fw-bold mb-2 text-dark">{selectedItem.title || "Untitled"}</motion.h2>
                                    <div className="d-flex gap-3 text-muted small align-items-center flex-wrap">
                                        <span className="text-uppercase fw-bold">{selectedItem.type}</span>
                                        <span>•</span>
                                        <span>Added {formatRelativeTime(selectedItem.created_at)}</span>
                                        {selectedItem.tags && (
                                            <>
                                                <span>•</span>
                                                {selectedItem.tags.split(',').map((tag, i) => (
                                                    <Badge key={i} bg="secondary" className="fw-normal" style={{ opacity: 0.8 }}>{tag.trim()}</Badge>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-4 shadow-sm border">
                                    {selectedItem.type === "image" && (
                                        <div className="mb-4">
                                            <div className="text-center bg-light rounded-3 p-3 mb-3">
                                                <img src={selectedItem.file_path} alt="Preview" className="img-fluid rounded shadow-sm" style={{ maxHeight: "500px" }} />
                                            </div>
                                            {selectedItem.content && (
                                                <div className="text-start p-3 bg-light rounded-3 border">
                                                    <small className="text-muted d-block mb-2 fw-bold text-uppercase">Extracted Text (OCR)</small>
                                                    <p className="mb-0 text-dark" style={{ whiteSpace: "pre-wrap", fontSize: "0.95rem" }}>{selectedItem.content}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {/* Consolidated Video/Link Logic for YouTube */}
                                    {(() => {
                                        const youtubeId = getYoutubeId(selectedItem.content || selectedItem.source_url);
                                        if (youtubeId) {
                                            return (
                                                <div className="mb-4">
                                                    <div className="ratio ratio-16x9 rounded-3 overflow-hidden shadow-sm mb-3">
                                                        <iframe 
                                                            src={`https://www.youtube.com/embed/${youtubeId}`}
                                                            title="Video Player" 
                                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                            allowFullScreen 
                                                        ></iframe>
                                                    </div>
                                                    <Button 
                                                        href={selectedItem.content || selectedItem.source_url} 
                                                        target="_blank" 
                                                        variant="outline-primary" 
                                                        className="w-100 d-flex align-items-center justify-content-center gap-2"
                                                    >
                                                        <ExternalLink size={18} /> Open on YouTube
                                                    </Button>
                                                </div>
                                            );
                                        }
                                        if (selectedItem.type === "video") {
                                            // Fallback for non-YouTube videos
                                             return (
                                                <div className="mb-4">
                                                    <div className="ratio ratio-16x9 rounded-3 overflow-hidden shadow-sm mb-3">
                                                         <iframe 
                                                            src={selectedItem.content || selectedItem.source_url} 
                                                            title="Video Player" 
                                                            allowFullScreen 
                                                        ></iframe>
                                                    </div>
                                                     <Button 
                                                        href={selectedItem.content || selectedItem.source_url} 
                                                        target="_blank" 
                                                        variant="outline-primary" 
                                                        className="w-100 d-flex align-items-center justify-content-center gap-2"
                                                    >
                                                        <ExternalLink size={18} /> Open Original Link
                                                    </Button>
                                                </div>
                                             );
                                        }
                                        return null;
                                    })()}

                                    {selectedItem.type === "note" && (
                                        <p className="mb-0 text-dark" style={{ whiteSpace: "pre-wrap", fontSize: "1.1rem", lineHeight: "1.7" }}>{selectedItem.content}</p>
                                    )}
                                    {/* Update Link Logic to skip if YouTube (handled above) */}
                                    {((selectedItem.type === "link" || selectedItem.type === "article") && !getYoutubeId(selectedItem.content || selectedItem.source_url)) && (
                                        <div>
                                            <p className="mb-4 text-muted">{selectedItem.content}</p>
                                            <Button href={selectedItem.content} target="_blank" variant="primary" className="d-flex align-items-center gap-2">
                                                <ExternalLink size={18} /> Open Link
                                            </Button>
                                        </div>
                                    )}
                                    {(selectedItem.type === "pdf" || selectedItem.type === "file") && (
                                        <div className="text-center py-5">
                                            <FileText size={48} className="text-muted mb-3 opacity-50" />
                                            <div className="mb-4">
                                                <Button href={selectedItem.file_path} target="_blank" variant="primary" size="lg" className="d-flex align-items-center gap-2 mx-auto">
                                                    <ExternalLink size={20} /> View File
                                                </Button>
                                            </div>
                                            {selectedItem.content && (
                                                <div className="text-start p-3 bg-light rounded-3 border">
                                                    <small className="text-muted d-block mb-2 fw-bold text-uppercase">Extracted Text</small>
                                                    <p className="mb-0 small text-muted text-truncate-3-lines">{selectedItem.content}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                     </div>
                 </div>
             )}
        </Modal.Body>
      </Modal>
    </>
  );
};

export default VaultList;
