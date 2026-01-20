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
        <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 bg-light p-4 text-center">
          <h2 className="text-danger mb-3">Something went wrong</h2>
          <div className="bg-white p-4 rounded-4 shadow-sm text-start mb-4 border" style={{ maxWidth: '800px', width: '100%', overflow: 'auto' }}>
            <h5 className="text-dark fw-bold mb-2">{this.state.error?.toString()}</h5>
            <pre className="text-muted small" style={{ whiteSpace: 'pre-wrap' }}>
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