import React, { useState, useRef } from "react";
import { useAuth } from "../AuthContext";
import { Form } from "react-bootstrap";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileText, Link as LinkIcon, Image as ImageIcon, Loader2, Plus, X } from "lucide-react";

const UniversalDropZone = ({ onItemAdded }) => {
  const { user } = useAuth();
  const [inputVal, setInputVal] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [processingFiles, setProcessingFiles] = useState([]); // List of file names currently being processed
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-expand textarea height
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputVal]);

  const detectType = (content) => {
    if (content.match(/^https?:\/\//)) return "link";
    return "note";
  };

  const createItem = async (payload) => {
      try {
          const formData = new FormData();
          if (user) formData.append("userId", user.uid);
          formData.append("title", payload.title);
          formData.append("type", payload.type);
          if (payload.content) formData.append("content", payload.content);
          if (payload.file_path) formData.append("file_path", payload.file_path);
          if (tags) formData.append("tags", tags);

          const res = await fetch("/api/items", { method: "POST", body: formData });
          if (!res.ok) throw new Error("Failed to create item");
          const data = await res.json();
          if (onItemAdded) onItemAdded();
          return data;
      } catch (e) {
          console.error("Create item failed:", e);
      }
  };

  const uploadFile = async (file) => {
    // Add to processing list
    setProcessingFiles(prev => [...prev, file.name]);
    setLoading(true); // Keep global loading state true while any file processes

    try {
      const formData = new FormData();
      if (user) formData.append("userId", user.uid);
      formData.append("file", file);
      
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      const initialType = file.type === "application/pdf" ? "pdf" : (file.type.startsWith("image/") ? "image" : "file");
      
      await createItem({
          title: file.name,
          type: initialType,
          file_path: data.fileUrl
      });
    } catch (error) {
      console.error("Error saving file:", error);
    } finally {
      // Remove from processing list
      setProcessingFiles(prev => prev.filter(name => name !== file.name));
      
      // If no files left processing, reset global loading
      setProcessingFiles(prev => {
          if (prev.length === 0) {
              setLoading(false);
              setInputVal("");
              setTags(""); 
          }
          return prev;
      });
    }
  };

  const handleFileUpload = (e) => {
    if (e.target.files && e.target.files.length > 0) {
        Array.from(e.target.files).forEach(file => uploadFile(file));
    }
  };

  const handleTextSubmit = async () => {
    if (!inputVal.trim()) return;
    const content = inputVal.trim();
    const type = detectType(content);
    setLoading(true);
    try {
      let title = content.split('\n')[0].substring(0, 50);
      if (content.length > 50) title += "...";
      await createItem({ title, type, content });
      setInputVal("");
      setTags("");
    } catch (error) {
      console.error("Error saving item:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="position-relative"
    >
        <motion.div
            layout
            className={`d-flex flex-column align-items-center justify-content-center p-5 rounded-4 border-2 border-dashed transition-all cursor-pointer bg-white shadow-sm position-relative overflow-hidden`}
            style={{ 
                borderColor: isDragging ? "#4F6EF7" : "#E5E7EB",
                backgroundColor: isDragging ? "rgba(79, 110, 247, 0.05)" : "#FFFFFF",
                minHeight: "160px"
            }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files?.length > 0) {
                    Array.from(e.dataTransfer.files).forEach(file => uploadFile(file));
                } else {
                    const text = e.dataTransfer.getData("text");
                    if (text) setInputVal(prev => prev + text);
                }
            }}
            onClick={() => { if(!inputVal && !tags) fileInputRef.current?.click() }}
            whileHover={{ scale: 1.01, borderColor: "#9CA3AF" }}
            whileTap={{ scale: 0.99 }}
        >
            <AnimatePresence mode="wait">
                {loading || processingFiles.length > 0 ? (
                    <motion.div 
                        key="loader"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center w-100 px-5"
                    >
                        <motion.div 
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 2, ease: "easeInOut" }}
                            className="bg-primary rounded-pill mb-3"
                            style={{ height: "6px" }}
                        />
                        <p className="small text-muted fw-bold mb-0">
                            {processingFiles.length > 0 
                                ? `Uploading ${processingFiles.length} file(s)...` 
                                : "Uploading..."}
                        </p>
                        {processingFiles.length > 0 && (
                            <div className="mt-2 d-flex flex-wrap justify-content-center gap-2">
                                {processingFiles.map((name, i) => (
                                    <span key={i} className="badge bg-light text-secondary border border-secondary border-opacity-25 rounded-pill px-2 py-1 fw-normal" style={{ fontSize: "0.7rem" }}>
                                        {name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div  
                        key="content"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="w-100 d-flex flex-column align-items-center"
                    >
                        {!inputVal && !tags && (
                            <div className="mb-4 text-center pointer-events-none">
                                <div className="d-flex justify-content-center gap-3 mb-3 text-muted opacity-50">
                                    <FileText size={24} />
                                    <ImageIcon size={24} />
                                    <LinkIcon size={24} />
                                </div>
                                <h5 className="fw-bold mb-1 text-dark">Drop anything here</h5>
                                <p className="small text-muted mb-0">PDFs, Images, Links, or just Notes</p>
                                <span className="badge bg-light text-muted mt-2 border rounded-pill px-2 py-1" style={{ fontSize: "0.7rem" }}>Multi-upload supported</span>
                            </div>
                        )}

                        <div className="w-100 position-relative d-flex flex-column gap-2" style={{ maxWidth: "500px" }} onClick={e => e.stopPropagation()}>
                             <div className="d-flex align-items-end bg-light rounded-4 px-3 py-2 border">
                                <Plus size={20} className="text-muted me-2 mb-1" />
                                <Form.Control 
                                    as="textarea" 
                                    ref={textareaRef}
                                    rows={1}
                                    placeholder="Type a note or paste a link..."
                                    value={inputVal}
                                    onChange={(e) => setInputVal(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleTextSubmit();
                                        }
                                    }}
                                    className="bg-transparent border-0 shadow-none p-0 text-dark fw-medium"
                                    style={{ 
                                        resize: "none", 
                                        fontSize: "1rem", 
                                        minHeight: "24px",
                                        maxHeight: "300px",
                                        overflowY: "auto"
                                    }}
                                />
                                {inputVal && (
                                    <motion.button
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="btn btn-primary rounded-circle p-1 ms-2 d-flex align-items-center justify-content-center mb-1"
                                        style={{ width: "28px", height: "28px", flexShrink: 0 }}
                                        onClick={handleTextSubmit}
                                    >
                                        <Plus size={16} />
                                    </motion.button>
                                )}
                             </div>
                             
                             <div className="d-flex align-items-center px-2 py-1 bg-light rounded-pill mt-2 border border-opacity-10">
                                <span className="text-muted small me-2 ps-2 fw-bold text-uppercase" style={{ fontSize: '0.65rem' }}>Tags:</span>
                                <Form.Control
                                    type="text"
                                    placeholder="Add tags (e.g. work, ideas)..."
                                    value={tags}
                                    onChange={(e) => setTags(e.target.value)}
                                    className="bg-transparent border-0 shadow-none p-0 text-muted small"
                                    style={{ fontSize: "0.85rem" }}
                                    onClick={(e) => e.stopPropagation()}
                                />
                             </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            <input 
                type="file" 
                ref={fileInputRef} 
                multiple 
                style={{ display: "none" }} 
                onChange={handleFileUpload} 
            />
        </motion.div>
    </motion.div>
  );
};

export default UniversalDropZone;