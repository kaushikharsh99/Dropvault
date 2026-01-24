import React from "react";
import { Container, Row, Col, Navbar, Button } from "react-bootstrap";
import { Box, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import UniversalDropZone from "./UniversalDropZone";
import GlobalActivityBar from "./GlobalActivityBar";
import { useAuth } from "../AuthContext";

const StandaloneDropZone = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    // Simplified state for activity bar - in a real app, lift this state up or use context
    const [uploadingCount, setUploadingCount] = React.useState(0);
    const [queueSize, setQueueSize] = React.useState(0);

    const handleUploadStart = () => setUploadingCount(prev => prev + 1);
    const handleUploadEnd = () => setUploadingCount(prev => Math.max(0, prev - 1));
    const handleQueueChange = (size) => setQueueSize(size);

    return (
        <div className="min-vh-100 bg-light d-flex flex-column">
            <Navbar className="bg-white border-bottom py-3">
                <Container fluid className="px-4">
                    <div className="d-flex align-items-center gap-3">
                        <Button 
                            variant="ghost" 
                            className="p-1 text-muted"
                            onClick={() => navigate("/")}
                        >
                            <ArrowLeft size={24} />
                        </Button>
                        <Navbar.Brand className="fw-bold fs-4 d-flex align-items-center gap-2 text-primary m-0">
                            <Box size={28} strokeWidth={2} />
                            DropZone
                        </Navbar.Brand>
                    </div>
                </Container>
            </Navbar>

            <Container className="flex-grow-1 d-flex flex-column justify-content-center py-5">
                <GlobalActivityBar uploadingCount={uploadingCount} queueSize={queueSize} activeTasks={[]} />
                
                <Row className="justify-content-center w-100">
                    <Col xs={12} md={8} lg={6}>
                        <div className="text-center mb-4">
                            <h2 className="fw-bold mb-2">Quick Upload</h2>
                            <p className="text-muted">Drag and drop files, paste links, or type notes.</p>
                        </div>
                        <UniversalDropZone 
                            onUploadStart={handleUploadStart}
                            onUploadEnd={handleUploadEnd}
                            onQueueChange={handleQueueChange}
                            onItemAdded={() => {}} // No list to update here
                        />
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default StandaloneDropZone;
