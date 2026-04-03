'use client'

import { useCallback, useMemo } from 'react'
import ReactFlow, {
  Node,
  Edge,
  ConnectionLineType,
  useNodesState,
  useEdgesState,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
} from 'reactflow'
import 'reactflow/dist/style.css'

interface MindMapChild {
  label: string
  children?: MindMapChild[]
}

interface MindMapBranch {
  label: string
  children?: MindMapChild[]
}

interface MindMapData {
  central: string
  branches: MindMapBranch[]
}

interface Props {
  data: MindMapData
  onClose: () => void
}

const branchColors = [
  { bg: '#7c3aed20', border: '#7c3aed', text: '#c4b5fd' },
  { bg: '#0891b220', border: '#0891b2', text: '#67e8f9' },
  { bg: '#059669', border: '#059669', text: '#6ee7b7' },
  { bg: '#d9770620', border: '#d97706', text: '#fcd34d' },
  { bg: '#52525220', border: '#525252', text: '#d4d4d4' },
  { bg: '#2563eb20', border: '#2563eb', text: '#93c5fd' },
]

function buildNodesAndEdges(data: MindMapData) {
  const nodes: Node[] = []
  const edges: Edge[] = []
  let nodeId = 0

  // Central node
  const centralId = `node-${nodeId++}`
  nodes.push({
    id: centralId,
    position: { x: 0, y: 0 },
    data: { label: data.central },
    style: {
      background: 'linear-gradient(135deg, #7c3aed, #0891b2)',
      color: '#fff',
      border: 'none',
      borderRadius: '16px',
      padding: '16px 24px',
      fontSize: '16px',
      fontWeight: 700,
      boxShadow: '0 0 30px rgba(124,58,237,0.3)',
      maxWidth: '220px',
      textAlign: 'center' as const,
    },
    type: 'default',
  })

  const branchCount = data.branches.length
  const angleStep = (2 * Math.PI) / branchCount
  const branchRadius = 320

  data.branches.forEach((branch, bi) => {
    const color = branchColors[bi % branchColors.length]
    const angle = angleStep * bi - Math.PI / 2
    const bx = Math.cos(angle) * branchRadius
    const by = Math.sin(angle) * branchRadius

    const branchId = `node-${nodeId++}`
    nodes.push({
      id: branchId,
      position: { x: bx, y: by },
      data: { label: branch.label },
      style: {
        background: color.bg,
        color: color.text,
        border: `2px solid ${color.border}`,
        borderRadius: '12px',
        padding: '10px 18px',
        fontSize: '13px',
        fontWeight: 600,
        maxWidth: '180px',
        textAlign: 'center' as const,
      },
    })

    edges.push({
      id: `edge-${centralId}-${branchId}`,
      source: centralId,
      target: branchId,
      style: { stroke: color.border, strokeWidth: 2 },
      type: 'smoothstep',
    })

    // Children
    if (branch.children) {
      const childAngleSpread = 0.6
      const childRadius = 200

      branch.children.forEach((child, ci) => {
        const childAngle = angle + (ci - (branch.children!.length - 1) / 2) * (childAngleSpread / branch.children!.length)
        const cx = bx + Math.cos(childAngle) * childRadius
        const cy = by + Math.sin(childAngle) * childRadius

        const childId = `node-${nodeId++}`
        nodes.push({
          id: childId,
          position: { x: cx, y: cy },
          data: { label: child.label },
          style: {
            background: '#ffffff08',
            color: '#e2e8f0',
            border: `1px solid ${color.border}50`,
            borderRadius: '10px',
            padding: '8px 14px',
            fontSize: '11px',
            fontWeight: 500,
            maxWidth: '160px',
            textAlign: 'center' as const,
          },
        })

        edges.push({
          id: `edge-${branchId}-${childId}`,
          source: branchId,
          target: childId,
          style: { stroke: `${color.border}80`, strokeWidth: 1.5 },
          type: 'smoothstep',
        })

        // Sub-children
        if (child.children) {
          const subRadius = 140
          child.children.forEach((sub, si) => {
            const subAngle = childAngle + (si - (child.children!.length - 1) / 2) * 0.3
            const sx = cx + Math.cos(subAngle) * subRadius
            const sy = cy + Math.sin(subAngle) * subRadius

            const subId = `node-${nodeId++}`
            nodes.push({
              id: subId,
              position: { x: sx, y: sy },
              data: { label: sub.label },
              style: {
                background: '#ffffff05',
                color: '#94a3b8',
                border: `1px dashed ${color.border}40`,
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '10px',
                maxWidth: '140px',
                textAlign: 'center' as const,
              },
            })

            edges.push({
              id: `edge-${childId}-${subId}`,
              source: childId,
              target: subId,
              style: { stroke: `${color.border}50`, strokeWidth: 1 },
              type: 'smoothstep',
            })
          })
        }
      })
    }
  })

  return { nodes, edges }
}

export default function MindMap({ data, onClose }: Props) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildNodesAndEdges(data),
    [data]
  )

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  return (
    <div className="glass-card border border-purple-500/20 mt-4 overflow-hidden" style={{ height: '500px' }}>
      <div className="flex items-center justify-between p-3 border-b border-white/5">
        <h3 className="font-display font-semibold flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v7m0 6v7M2 12h7m6 0h7M4.93 4.93l4.95 4.95m4.24 4.24l4.95 4.95M19.07 4.93l-4.95 4.95m-4.24 4.24l-4.95 4.95" />
          </svg>
          Mind Map
        </h3>
        <button onClick={onClose} className="text-white/40 hover:text-white/60 text-sm">Close</button>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#ffffff08" />
        <Controls
          showInteractive={false}
          style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
        />
        <MiniMap
          nodeColor="#7c3aed40"
          maskColor="#0a0a1580"
          style={{ background: '#0a0a15', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px' }}
        />
      </ReactFlow>
    </div>
  )
}
