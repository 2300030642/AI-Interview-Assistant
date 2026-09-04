import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

function Visualization({ visualization }) {
  if (!visualization) {
    return null;
  }

  const nodes = visualization.nodes || [];
  const connections = visualization.connections || [];

  if (nodes.length === 0) {
    return null;
  }

  // -----------------------------------------
  // Create React Flow nodes
  // -----------------------------------------

  const flowNodes = useMemo(() => {
    return nodes.map((label, index) => ({
      id: String(index + 1),

      position: {
        x: (index % 3) * 260,
        y: Math.floor(index / 3) * 140,
      },

      data: {
        label: String(label),
      },

      style: {
        padding: "14px 20px",
        borderRadius: "12px",
        border: "2px solid #6366f1",
        background: "#ffffff",
        color: "#111827",
        fontSize: "14px",
        fontWeight: "600",
        minWidth: "180px",
        textAlign: "center",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
      },
    }));
  }, [nodes]);

  // -----------------------------------------
  // Map node names to React Flow IDs
  // -----------------------------------------

  const nodeIdMap = useMemo(() => {
    const map = {};

    nodes.forEach((node, index) => {
      map[String(node).trim()] = String(index + 1);
    });

    return map;
  }, [nodes]);

  // -----------------------------------------
  // Create React Flow edges
  // -----------------------------------------

  const flowEdges = useMemo(() => {
    return connections
      .map((connection, index) => {
        let source;
        let target;

        // Gemini format:
        // ["Lead Generation", "Qualification"]

        if (Array.isArray(connection)) {
          source = connection[0];
          target = connection[1];
        }

        // Gemini format:
        // "Lead Generation -> Qualification"

        else if (typeof connection === "string") {
          const parts = connection.split("->");

          if (parts.length !== 2) {
            return null;
          }

          source = parts[0].trim();
          target = parts[1].trim();
        }

        if (!source || !target) {
          return null;
        }

        source = String(source).trim();
        target = String(target).trim();

        if (!nodeIdMap[source] || !nodeIdMap[target]) {
          return null;
        }

        return {
          id: `edge-${index}`,

          source: nodeIdMap[source],

          target: nodeIdMap[target],

          animated: true,

          style: {
            strokeWidth: 2,
          },
        };
      })
      .filter(Boolean);
  }, [connections, nodeIdMap]);

  // -----------------------------------------
  // Render visualization
  // -----------------------------------------

  return (
    <div className="visualization-container">

      <div className="visualization-header">

        <div className="visualization-icon">
          🖼️
        </div>

        <div>
          <h4>
            {visualization.title || "Interactive Visualization"}
          </h4>

          <p>
            {visualization.type || "Diagram"}
          </p>
        </div>

      </div>

      <div className="flow-wrapper">

        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          fitView
          fitViewOptions={{
            padding: 0.2,
          }}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          zoomOnScroll={true}
          panOnDrag={true}
        >

          <Background />

          <Controls />

          <MiniMap />

        </ReactFlow>

      </div>

    </div>
  );
}

export default Visualization;