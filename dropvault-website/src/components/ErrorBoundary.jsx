import React from 'react';
import { Button } from 'react-bootstrap';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
              return (
                <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 bg-background p-4 text-center text-foreground">
                  <h1 className="display-4 fw-bold mb-3 text-primary">Oops!</h1>
                  <p className="lead mb-4">Something went wrong. Don't worry, your vault is safe.</p>
                  <div className="bg-card p-4 rounded-4 shadow-sm text-start mb-4 border" style={{ maxWidth: '800px', width: '100%', overflow: 'auto' }}>
                    <h5 className="text-foreground fw-bold mb-2">{this.state.error?.toString()}</h5>            <pre className="text-muted small" style={{ whiteSpace: 'pre-wrap' }}>
              {this.state.errorInfo?.componentStack}
            </pre>
          </div>
          <Button variant="primary" onClick={() => window.location.reload()}>
            Reload Page
          </Button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;