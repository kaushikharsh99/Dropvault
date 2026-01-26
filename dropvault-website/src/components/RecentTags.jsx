import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { motion } from 'framer-motion';
import { Tag, X } from 'lucide-react';
import { Button } from 'react-bootstrap';

const RecentTags = ({ onTagSelect, selectedTags = [] }) => {
    const { user } = useAuth();
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTags = async () => {
            if (!user) return;
            try {
                const res = await fetch(`/api/tags?userId=${user.uid}`);
                if (res.ok) {
                    const data = await res.json();
                    setTags(data);
                }
            } catch (e) {
                console.error("Failed to fetch tags", e);
            } finally {
                setLoading(false);
            }
        };
        fetchTags();
    }, [user]);

    if (loading || tags.length === 0) return null;

    return (
        <div className="mb-4">
             <div className="d-flex align-items-center justify-content-between mb-2 px-1">
                <h6 className="text-muted fw-bold small text-uppercase d-flex align-items-center gap-2">
                    <Tag size={16} /> Recent Tags
                </h6>
                {selectedTags.length > 0 && (
                    <Button 
                        variant="link" 
                        className="text-muted text-decoration-none small p-0 d-flex align-items-center gap-1"
                        onClick={() => onTagSelect([])}
                    >
                        Clear Filter <X size={14} />
                    </Button>
                )}
            </div>
            
            <div className="d-flex flex-wrap gap-2 align-items-center bg-card p-3 rounded-4 border shadow-sm">
                {tags.slice(0, 20).map((tag, idx) => {
                    const isActive = selectedTags.includes(tag.text);
                    
                    const pastelStyle = {
                        backgroundColor: 'rgba(255, 255, 255, 0.05)', 
                        color: 'rgba(255, 255, 255, 0.8)', 
                        borderColor: 'rgba(255, 255, 255, 0.1)'
                    };

                    return (
                        <motion.button
                            key={idx}
                            layout
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onTagSelect(tag.text)}
                            className={`btn rounded-pill px-3 py-1 transition-all d-flex align-items-center gap-2 border ${isActive ? 'shadow ring-2 ring-primary' : ''}`}
                            style={{ 
                                fontSize: '0.9rem',
                                ...(!isActive ? pastelStyle : { backgroundColor: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' })
                            }}
                        >
                            <span className="fw-medium">{tag.text}</span>
                            <span 
                                className="badge rounded-pill" 
                                style={{ 
                                    fontSize: "0.6em", 
                                    backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                                    color: 'inherit'
                                }}
                            >
                                {tag.value}
                            </span>
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
};

export default RecentTags;
