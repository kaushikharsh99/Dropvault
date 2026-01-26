import React from 'react';
import { Loader2, UploadCloud, Database, Activity } from 'lucide-react';

const GlobalActivityBar = ({ uploadingCount = 0, queueSize = 0, activeTasks = [] }) => {
    const processingCount = activeTasks.length;
    const hasActivity = uploadingCount > 0 || queueSize > 0 || processingCount > 0;

    if (!hasActivity) return null;

    return (
    <div className="mb-4">
        <div className="bg-card rounded-4 border p-3 shadow-sm d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
                <div className="bg-primary bg-opacity-10 p-2 rounded-circle text-primary">
                    <Activity size={20} />
                </div>
                <div>
                    <h6 className="mb-0 fw-bold text-foreground small text-uppercase">System Activity</h6>
                        <div className="d-flex align-items-center gap-3 small text-muted mt-1">
                            {(uploadingCount > 0 || queueSize > 0) && (
                                <span className="d-flex align-items-center gap-1">
                                    <UploadCloud size={14} />
                                    Uploading: <strong>{uploadingCount}</strong> active
                                    {queueSize > 0 && <span className="text-muted opacity-75">({queueSize} queued)</span>}
                                </span>
                            )}
                            
                            {((uploadingCount > 0 || queueSize > 0) && processingCount > 0) && (
                                <span className="text-muted opacity-25">|</span>
                            )}

                            {processingCount > 0 && (
                                <span className="d-flex align-items-center gap-1 text-primary">
                                    <Database size={14} />
                                    Processing: <strong>{processingCount}</strong> items
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Optional: Add a simple progress bar if needed, but summary is cleaner */}
            </div>
        </div>
    );
};

export default GlobalActivityBar;