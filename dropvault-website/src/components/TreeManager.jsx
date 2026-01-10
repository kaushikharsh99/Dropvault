import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, orderBy, doc, updateDoc, arrayUnion, deleteDoc } from "firebase/firestore";
import { Form, Button, ListGroup, Card, Spinner, Badge, Breadcrumb } from "react-bootstrap";
import { useAuth } from "../AuthContext";

const TreeManager = () => {
  const { user } = useAuth();
  const [trees, setTrees] = useState([]);
  const [selectedTree, setSelectedTree] = useState(null);
  const [newTreeTitle, setNewTreeTitle] = useState("");
  const [newNodeTitle, setNewNodeTitle] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch users trees in real-time
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "trees"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const treesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTrees(treesData);
      
      // If we are viewing a tree, update its local state too so changes appear instantly
      if (selectedTree) {
        const updatedCurrentTree = treesData.find(t => t.id === selectedTree.id);
        if (updatedCurrentTree) setSelectedTree(updatedCurrentTree);
      }
    });

    return () => unsubscribe();
  }, [user, selectedTree?.id]); // Depend on selectedTree.id to keep it in sync

  const handleAddTree = async (e) => {
    e.preventDefault();
    if (!newTreeTitle.trim()) return;

    setLoading(true);
    try {
      await addDoc(collection(db, "trees"), {
        userId: user.uid,
        title: newTreeTitle,
        createdAt: serverTimestamp(),
        nodes: [] 
      });
      setNewTreeTitle("");
    } catch (error) {
      console.error("Error adding tree: ", error);
      alert("Error saving tree");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTree = async (treeId, e) => {
    e.stopPropagation(); // Prevent opening the tree
    if (!window.confirm("Are you sure you want to delete this tree?")) return;
    try {
      await deleteDoc(doc(db, "trees", treeId));
      if (selectedTree?.id === treeId) setSelectedTree(null);
    } catch (error) {
      console.error("Error deleting tree:", error);
    }
  };

  const handleAddNode = async (e) => {
    e.preventDefault();
    if (!newNodeTitle.trim() || !selectedTree) return;

    try {
      const treeRef = doc(db, "trees", selectedTree.id);
      const newNode = {
        id: Date.now().toString(), // Simple ID
        title: newNodeTitle,
        status: "pending", // pending, in-progress, completed
        createdAt: new Date().toISOString()
      };

      await updateDoc(treeRef, {
        nodes: arrayUnion(newNode)
      });
      setNewNodeTitle("");
    } catch (error) {
      console.error("Error adding node:", error);
      alert("Error adding node");
    }
  };

  const toggleNodeStatus = async (node) => {
    if (!selectedTree) return;
    
    // We have to copy the array, modify the item, and update the whole array
    // Firestore arrayUnion/Remove is simple, but modifying an item requires reading/writing the field.
    // Since we have the latest 'selectedTree' from the snapshot listener, we can just modify that and save.
    
    const updatedNodes = selectedTree.nodes.map(n => {
      if (n.id === node.id) {
        const nextStatus = n.status === "pending" ? "completed" : "pending";
        return { ...n, status: nextStatus };
      }
      return n;
    });

    try {
        const treeRef = doc(db, "trees", selectedTree.id);
        await updateDoc(treeRef, { nodes: updatedNodes });
    } catch (error) {
        console.error("Error updating node:", error);
    }
  };
  
  const deleteNode = async (nodeId) => {
     if (!selectedTree) return;
     const updatedNodes = selectedTree.nodes.filter(n => n.id !== nodeId);
     
     try {
        const treeRef = doc(db, "trees", selectedTree.id);
        await updateDoc(treeRef, { nodes: updatedNodes });
    } catch (error) {
        console.error("Error deleting node:", error);
    }
  };

  // --- RENDER HELPERS ---

  if (selectedTree) {
    return (
      <div>
        <Breadcrumb>
          <Breadcrumb.Item onClick={() => setSelectedTree(null)} href="#">Trees</Breadcrumb.Item>
          <Breadcrumb.Item active>{selectedTree.title}</Breadcrumb.Item>
        </Breadcrumb>

        <Card className="mb-4 shadow-sm">
          <Card.Header>Add Knowledge Node</Card.Header>
          <Card.Body>
             <Form onSubmit={handleAddNode} className="d-flex gap-2">
                <Form.Control
                  type="text"
                  placeholder="What do you want to learn? (e.g. 'Async/Await')"
                  value={newNodeTitle}
                  onChange={(e) => setNewNodeTitle(e.target.value)}
                />
                <Button variant="success" type="submit">Add</Button>
             </Form>
          </Card.Body>
        </Card>

        <h5>Nodes</h5>
        <ListGroup variant="flush" className="shadow-sm rounded bg-white">
          {!selectedTree.nodes || selectedTree.nodes.length === 0 ? (
              <ListGroup.Item className="text-muted text-center py-4">No nodes yet. Add one above!</ListGroup.Item>
          ) : (
            selectedTree.nodes.map((node) => (
              <ListGroup.Item key={node.id} className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-3">
                    <Form.Check 
                        type="checkbox" 
                        checked={node.status === "completed"}
                        onChange={() => toggleNodeStatus(node)}
                        style={{ cursor: "pointer", transform: "scale(1.2)" }}
                    />
                    <span style={{ 
                        textDecoration: node.status === "completed" ? "line-through" : "none",
                        color: node.status === "completed" ? "#aaa" : "inherit"
                    }}>
                        {node.title}
                    </span>
                </div>
                <Button variant="outline-danger" size="sm" onClick={() => deleteNode(node.id)}>×</Button>
              </ListGroup.Item>
            ))
          )}
        </ListGroup>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <Card className="mb-4 shadow-sm">
        <Card.Header>Create New Knowledge Vault</Card.Header>
        <Card.Body>
          <Form onSubmit={handleAddTree} className="d-flex gap-2">
            <Form.Control
              type="text"
              placeholder="Enter tree title (e.g., 'React Learning Path')"
              value={newTreeTitle}
              onChange={(e) => setNewTreeTitle(e.target.value)}
              disabled={loading}
            />
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? <Spinner as="span" animation="border" size="sm" /> : "Add"}
            </Button>
          </Form>
        </Card.Body>
      </Card>

      <h5 className="mb-3">Your Trees</h5>
      {trees.length === 0 ? (
        <p className="text-muted">No trees found. Start by creating one!</p>
      ) : (
        <ListGroup>
          {trees.map((tree) => (
            <ListGroup.Item 
                key={tree.id} 
                className="d-flex justify-content-between align-items-center action-hover"
                style={{ cursor: "pointer" }}
                onClick={() => setSelectedTree(tree)}
            >
              <div>
                <strong>{tree.title}</strong>
                <br />
                <small className="text-muted">
                   {tree.nodes?.length || 0} nodes • Created: {tree.createdAt?.toDate().toLocaleDateString()}
                </small>
              </div>
              <div className="d-flex gap-2">
                  <Button variant="outline-primary" size="sm">Open</Button>
                  <Button variant="outline-danger" size="sm" onClick={(e) => handleDeleteTree(tree.id, e)}>Delete</Button>
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}
    </div>
  );
};

export default TreeManager;