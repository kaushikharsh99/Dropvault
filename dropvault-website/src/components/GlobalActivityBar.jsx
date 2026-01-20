import React from 'react';
import { Loader2, FileText, Image as ImageIcon, Mic, Database, CheckCircle2, UploadCloud } from 'lucide-react';

const StageIcon = ({ stage, currentStage, completed }) => {
    const isActive = stage === currentStage;
    const isDone = completed;
    
    let Icon = FileText;
    if (stage === 'visual') Icon = ImageIcon;
    if (stage === 'whisper') Icon = Mic;
    if (stage === 'embed') Icon = Database;
    if (stage === 'done') Icon = CheckCircle2;

    return (
        <div className={`d-flex flex-column align-items-center gap-1 ${isActive ? 'text-primary' : isDone ? 'text-success' : 'text-muted opacity-50'}`}>
            <div className={`rounded-circle p-1 d-flex align-items-center justify-content-center border ${isActive ? 'border-primary bg-primary bg-opacity-10' : isDone ? 'border-success bg-success bg-opacity-10' : 'border-secondary'}`} style={{ width: 24, height: 24 }}>
                <Icon size={12} />
            </div>
            <span style={{ fontSize: '0.6rem', fontWeight: isActive ? 'bold' : 'normal' }}>{stage.toUpperCase()}</span>
        </div>
    );
};

const PipelineProgress = ({ task }) => {
    if (!task) return null;
    
    const stages = ['ocr', 'visual', 'whisper', 'embed', 'done'];
    const currentStageIndex = stages.indexOf(task.stage || 'queued');
    
    return (
        <div className="bg-light rounded-3 p-3 border border-opacity-10 mb-2">
            <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="small fw-bold text-dark">Item #{task.item_id}</span>
                <span className="badge bg-white text-primary border shadow-sm" style={{ fontSize: '0.65rem' }}>
                    {task.message || "Processing..."}
                </span>
            </div>
            
            {/* Visual Pipeline Steps */}
            <div className="d-flex justify-content-between align-items-center px-2 mb-2 position-relative">
                {/* Connecting Line */}
                <div className="position-absolute top-50 start-0 w-100 bg-secondary opacity-25" style={{ height: '1px', zIndex: 0 }}></div>
                
                {stages.map((stage, i) => (
                    <div key={stage} className="position-relative bg-light px-1" style={{ zIndex: 1 }}>
                        <StageIcon 
                            stage={stage} 
                            currentStage={task.stage} 
                            completed={i < currentStageIndex || task.status === 'completed'} 
                        />
                    </div>
                ))}
            </div>

            <div className="progress" style={{ height: '4px' }}>
                <div 
                    className="progress-bar progress-bar-striped progress-bar-animated" 
                    style={{ width: `${task.percent || 0}%` }}
                ></div>
            </div>
        </div>
    );
};

const GlobalActivityBar = ({ uploadingCount = 0, activeTasks = [] }) => {
    const hasActivity = uploadingCount > 0 || activeTasks.length > 0;

    if (!hasActivity) return null;

    return (
        <div className="mb-4">
            <div className="bg-white rounded-4 border p-3 shadow-sm">
                <div className="d-flex align-items-center gap-3 mb-3 px-1 border-bottom pb-2">
                    <Loader2 size={20} className="text-primary animate-spin" />
                    <div>
                        <h6 className="mb-0 fw-bold text-dark">System Activity</h6>
                        <small className="text-muted">
                            Real-time processing tracker
                        </small>
                    </div>
                </div>
                
                <div className="d-flex flex-column gap-2" style={{ maxHeight: "300px", overflowY: "auto" }}>
                    {/* Uploads Placeholder */}
                    {uploadingCount > 0 && (
                        <div className="bg-light rounded-3 p-3 border border-opacity-10 d-flex align-items-center gap-3">
                            <div className="bg-white p-2 rounded-circle border shadow-sm">
                                <UploadCloud size={18} className="text-primary" />
                            </div>
                            <div className="flex-grow-1">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                    <span className="small fw-bold text-dark">Uploading Files...</span>
                                    <span className="small text-muted">{uploadingCount} remaining</span>
                                </div>
                                <div className="progress" style={{ height: '4px' }}>
                                    <div className="progress-bar progress-bar-striped progress-bar-animated bg-secondary" style={{ width: '100%' }}></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Detailed Task Pipelines */}
                    {activeTasks.map(task => (
                        <PipelineProgress key={task.item_id} task={task} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GlobalActivityBar;