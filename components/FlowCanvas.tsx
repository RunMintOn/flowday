
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { FlowNode, SingleNode, BranchNode, BlockNode } from '../types';
import { Trash2, ZoomIn, ZoomOut, Maximize, Map, ArrowDown, Clock } from 'lucide-react';
import { NodeShape, NodeLabels, SideEventsNote, BranchConnectorSVG } from './NodeComponents';

/* --- TYPES --- */
interface FlowCanvasProps {
  nodes: FlowNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDropNode: (dragSource: any, targetId: string | null, position: 'before' | 'after' | 'append') => void;
  onDeleteNode: (id: string) => void;
  onUpdateNode: (node: FlowNode) => void;
}

type ViewMode = 'vertical' | 'map';

/* --- MAIN COMPONENT --- */
export const FlowCanvas: React.FC<FlowCanvasProps> = (props) => {
  const [viewMode, setViewMode] = useState<ViewMode>('vertical');
  const [isDragging, setIsDragging] = useState(false);
  const [isOverTrash, setIsOverTrash] = useState(false);
  
  // Transform State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  
  // Drag State shared across layouts
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Reset Pan/Zoom when switching views
  useEffect(() => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, [viewMode]);

  // Zoom Handlers (Center Screen)
  const handleZoomIn = () => {
    setZoom(prev => {
        const newZoom = Math.min(prev + 0.1, 2);
        return newZoom;
    });
  };

  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.2));
  const handleResetZoom = () => {
      setZoom(1);
      setPan({ x: 0, y: 0 });
  };

  /* --- CANVAS NAVIGATION HANDLERS --- */

  const handleMouseDown = (e: React.MouseEvent) => {
      // Button 2 is Right Click, Button 1 is Middle Click
      if (e.button === 2 || e.button === 1) {
          e.preventDefault();
          setIsPanning(true);
          lastMousePos.current = { x: e.clientX, y: e.clientY };
      }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      // Handle Panning
      if (isPanning) {
          e.preventDefault();
          const dx = e.clientX - lastMousePos.current.x;
          const dy = e.clientY - lastMousePos.current.y;
          
          setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
          lastMousePos.current = { x: e.clientX, y: e.clientY };
          return;
      }
  };

  const handleMouseUp = () => {
      setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Logic: 
    // 1. Right Click held + Wheel -> Zoom (Cursor Centered)
    // 2. Ctrl + Wheel -> Zoom (Cursor Centered)
    // 3. Normal Wheel -> Scroll Vertical/Horizontal (Pan)
    
    if (e.buttons === 2 || e.ctrlKey) {
        // Zoom Mode
        e.preventDefault();
        e.stopPropagation();
        
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) return;

        // 1. Calculate mouse position relative to container
        const mouseX = e.clientX - containerRect.left;
        const mouseY = e.clientY - containerRect.top;

        // 2. Calculate the point on the canvas (world space) that is currently under the mouse
        // WorldX = (ScreenX - PanX) / CurrentZoom
        const worldX = (mouseX - pan.x) / zoom;
        const worldY = (mouseY - pan.y) / zoom;

        // 3. Calculate new zoom level
        const scaleAmount = -e.deltaY * 0.001;
        const newZoom = Math.min(Math.max(zoom + scaleAmount, 0.2), 3);

        // 4. Calculate new pan position to keep the world point under the mouse
        // ScreenX = WorldX * NewZoom + NewPanX
        // => NewPanX = ScreenX - (WorldX * NewZoom)
        const newPanX = mouseX - (worldX * newZoom);
        const newPanY = mouseY - (worldY * newZoom);

        setZoom(newZoom);
        setPan({ x: newPanX, y: newPanY });
    } else {
        // Pan Mode (Scroll)
        // Adjust pan based on wheel delta (Standard scrolling behavior)
        const panSpeed = 1;
        setPan(prev => ({
            x: prev.x - e.deltaX * panSpeed,
            y: prev.y - e.deltaY * panSpeed
        }));
    }
  };

  // Global Drag handlers (For Nodes)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = isDragging ? 'move' : 'copy';
    if (e.target === e.currentTarget) {
        setDragOverId(null);
        setDropPosition(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(false);
    setDragOverId(null);
    setDropPosition(null);
    setIsOverTrash(false);

    const dataStr = e.dataTransfer.getData('application/reactflow');
    if (!dataStr) return;

    try {
        const data = JSON.parse(dataStr);
        
        if (isOverTrash) {
            if (data.source === 'canvas') {
                props.onDeleteNode(data.id);
            }
            return;
        }

        if (dragOverId && dropPosition) {
             if (data.id !== dragOverId) {
                props.onDropNode(data, dragOverId, dropPosition);
             }
        } else {
            if (data.source === 'sidebar') {
                props.onDropNode(data, null, 'append');
            }
        }

    } catch (err) {
        console.error('Drop error', err);
    }
  };

  const handleNodeDragStart = (e: React.DragEvent, node: FlowNode) => {
      e.stopPropagation();
      e.dataTransfer.setData('application/reactflow', JSON.stringify({ source: 'canvas', id: node.id, type: node.type }));
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => setIsDragging(true), 10);
  };

  const sharedLayoutProps = {
      ...props,
      isDragging,
      dragOverId,
      setDragOverId,
      dropPosition,
      setDropPosition,
      handleNodeDragStart,
      handleDrop,
      zoom
  };

  return (
    <div 
        ref={containerRef}
        className={`
            flex-1 relative overflow-hidden flex flex-col select-none
            ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}
        `}
        style={{
            backgroundColor: '#f1f5f9', // Slate-100
            backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)', // Slate-300 dots
            // Sync background size and position with Zoom and Pan state
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`, 
            backgroundPosition: `${pan.x}px ${pan.y}px`
        }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onContextMenu={(e) => e.preventDefault()} // Disable native context menu
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
    >
      
      {/* Scrollable Canvas Area (Transform Based) */}
      <div className="absolute inset-0 w-full h-full">
        <div 
            className="origin-top-left transition-transform duration-75 ease-out min-h-full min-w-full"
            style={{ 
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0', 
            }}
        >
            {viewMode === 'vertical' ? (
                <VerticalLayout {...sharedLayoutProps} />
            ) : (
                <MapLayout {...sharedLayoutProps} />
            )}
        </div>
      </div>

      {/* Trash Zone */}
      <div 
        className={`
            fixed bottom-8 left-1/2 -translate-x-1/2 w-48 h-20 rounded-xl border-2 border-dashed flex items-center justify-center gap-3
            transition-all duration-300 z-50 shadow-2xl
            ${isDragging ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}
            ${isOverTrash ? 'bg-red-50 border-red-500 text-red-600 scale-105 shadow-red-200' : 'bg-white/80 border-gray-300 text-gray-500 backdrop-blur-md'}
        `}
        onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = isDragging ? 'move' : 'copy';
            setIsOverTrash(true);
            setDragOverId(null); 
        }}
        onDrop={handleDrop}
        onDragLeave={() => setIsOverTrash(false)}
      >
        <Trash2 size={24} />
        <span className="font-medium text-sm">拖拽到此处删除</span>
      </div>

      {/* View Toggle & Zoom Controls */}
      <div 
        className="fixed bottom-8 right-8 flex flex-col gap-2 bg-white/90 backdrop-blur-sm p-2 rounded-xl shadow-xl border border-gray-200/60 z-50 transition-all hover:bg-white"
        onMouseDown={(e) => e.stopPropagation()} // Prevent pan starting on controls
      >
          <button 
            onClick={() => setViewMode(prev => prev === 'vertical' ? 'map' : 'vertical')}
            className={`p-1.5 rounded-lg transition-colors flex flex-col items-center gap-1 mb-1 border-b pb-2 ${viewMode === 'map' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-600 hover:bg-gray-100'}`}
            title="切换视图"
          >
              {viewMode === 'vertical' ? <Map size={18} /> : <ArrowDown size={18} />}
              <span className="text-[10px] font-bold">{viewMode === 'vertical' ? '地图' : '列表'}</span>
          </button>

          <button onClick={handleZoomIn} className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="放大"><ZoomIn size={18} /></button>
          <div className="text-[10px] text-center font-bold text-gray-400 select-none cursor-default py-0.5">{Math.round(zoom * 100)}%</div>
          <button onClick={handleZoomOut} className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="缩小"><ZoomOut size={18} /></button>
          <button onClick={handleResetZoom} className="p-1.5 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-lg" title="重置视图"><Maximize size={14} /></button>
      </div>

    </div>
  );
};

/* -----------------------------------------------------------------------------------------
   LAYOUT RENDERERS
----------------------------------------------------------------------------------------- */

interface LayoutProps extends FlowCanvasProps {
    isDragging: boolean;
    dragOverId: string | null;
    setDragOverId: (id: string | null) => void;
    dropPosition: 'before' | 'after' | null;
    setDropPosition: (pos: 'before' | 'after' | null) => void;
    handleNodeDragStart: (e: React.DragEvent, node: FlowNode) => void;
    handleDrop: (e: React.DragEvent) => void;
    zoom: number;
}

/* --- VERTICAL LAYOUT (Original) --- */
const VerticalLayout: React.FC<LayoutProps> = ({ 
    nodes, selectedId, onSelect, onUpdateNode, 
    isDragging, dragOverId, setDragOverId, dropPosition, setDropPosition, handleNodeDragStart, handleDrop, zoom 
}) => {

    const handleNodeDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation(); 
        
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const pos = e.clientY < midY ? 'before' : 'after';
        
        setDragOverId(id);
        setDropPosition(pos);
    };

    return (
        <div className="relative w-full max-w-2xl py-20 px-4 min-h-full z-10 mx-auto">
            <div className="flex flex-col items-center relative pb-32">
            
            {nodes.map((node, index) => {
                const isLast = index === nodes.length - 1;
                const showTopLine = isDragging && dragOverId === node.id && dropPosition === 'before';
                const showBottomLine = isDragging && dragOverId === node.id && dropPosition === 'after';

                return (
                <React.Fragment key={node.id}>
                    
                    {/* Insert Indicator Top */}
                    <div className={`w-full transition-all duration-200 pointer-events-none ${showTopLine ? 'h-1.5 my-3 opacity-100' : 'h-0 my-0 opacity-0'} bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.6)]`} />

                    {/* Node Wrapper (Drop Zone) */}
                    <div 
                        className="w-full flex justify-center relative transition-transform duration-200 ease-out py-1"
                        onDragOver={(e) => handleNodeDragOver(e, node.id)}
                        onDrop={handleDrop} 
                    >
                        {node.type === 'branch' ? (
                            <BranchRenderer 
                                node={node as BranchNode} 
                                selectedId={selectedId} 
                                onSelect={onSelect}
                                isLast={isLast}
                                prevNode={index > 0 ? nodes[index - 1] : undefined}
                                onDragStart={(e) => handleNodeDragStart(e, node)}
                                isDragging={isDragging}
                            />
                        ) : node.type === 'block' ? (
                            <BlockRenderer 
                                node={node as BlockNode}
                                selectedId={selectedId}
                                onSelect={onSelect}
                                onUpdateNode={onUpdateNode}
                                isLast={isLast}
                                onDragStart={(e) => handleNodeDragStart(e, node)}
                                isDragging={isDragging}
                                zoom={zoom}
                            />
                        ) : (
                            <SingleNodeRenderer
                                node={node as SingleNode}
                                selectedId={selectedId}
                                onSelect={onSelect}
                                isLast={isLast}
                                onDragStart={(e) => handleNodeDragStart(e, node)}
                                isDragging={isDragging}
                            />
                        )}
                    </div>

                    {/* Insert Indicator Bottom */}
                    <div className={`w-full transition-all duration-200 pointer-events-none ${showBottomLine ? 'h-1.5 my-3 opacity-100' : 'h-0 my-0 opacity-0'} bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.6)]`} />

                </React.Fragment>
                );
            })}
            
            {/* End cap */}
            <div className="w-3 h-3 bg-gray-300 rounded-full mt-[-2px] z-0 relative shadow-sm" />

            </div>
        </div>
    );
};

/* --- MAP / SNAKE LAYOUT (New) --- */
const MapLayout: React.FC<LayoutProps> = ({ 
    nodes, selectedId, onSelect, onUpdateNode, 
    isDragging, dragOverId, setDragOverId, dropPosition, setDropPosition, handleNodeDragStart, handleDrop, zoom 
}) => {
    // Config
    const GRID_W = 260; // Horizontal spacing
    const GRID_H = 220; // Vertical spacing
    const COLS = 4;     // Items per row
    const OFFSET_X = 150;
    const OFFSET_Y = 150;

    // Calculate all positions using useMemo to avoid recalc on every render unless nodes change
    const { positions, contentSize } = useMemo(() => {
        let maxX = 0;
        let maxY = 0;

        const pos = nodes.map((_, i) => {
            const row = Math.floor(i / COLS);
            const isEvenRow = row % 2 === 0;
            const col = isEvenRow ? (i % COLS) : (COLS - 1 - (i % COLS));
            
            const x = col * GRID_W + OFFSET_X;
            const y = row * GRID_H + OFFSET_Y;

            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;

            return { x, y, row, isRightEnd: isEvenRow && col === COLS - 1, isLeftEnd: !isEvenRow && col === 0 };
        });

        // Add padding to content size
        return {
            positions: pos,
            contentSize: {
                width: Math.max(maxX + 250, 800), 
                height: Math.max(maxY + 300, 800)
            }
        };
    }, [nodes]);

    // Generate Path SVG
    let pathD = "";
    if (positions.length > 0) {
        pathD = `M ${positions[0].x} ${positions[0].y}`;
        for (let i = 0; i < positions.length - 1; i++) {
            const curr = positions[i];
            const next = positions[i+1];
            
            if (curr.row === next.row) {
                pathD += ` L ${next.x} ${next.y}`;
            } else {
                if (curr.x === next.x) {
                    const direction = (curr.row % 2 === 0) ? 1 : -1;
                    const curveDist = 80 * direction;
                    pathD += ` C ${curr.x + curveDist} ${curr.y}, ${curr.x + curveDist} ${next.y}, ${next.x} ${next.y}`;
                } else {
                    const curveOut = 80;
                    pathD += ` C ${curr.x + curveOut} ${curr.y}, ${curr.x + curveOut} ${next.y}, ${next.x} ${next.y}`;
                }
            }
        }
    }

    const handleNodeDragOver = (e: React.DragEvent, id: string, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverId(id);
        setDropPosition('after'); 
    };

    return (
        <div 
            className="relative overflow-visible" 
            style={{ 
                width: contentSize.width, 
                height: contentSize.height 
            }}
        >
            {/* SVG Background Layer */}
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-visible">
                <path 
                    d={pathD} 
                    fill="none" 
                    stroke="#cbd5e1" 
                    strokeWidth="4" 
                    strokeDasharray="12 8" 
                    strokeLinecap="round"
                />
            </svg>

            {/* Nodes Layer */}
            {nodes.map((node, i) => {
                const pos = positions[i];
                const isSelected = selectedId === node.id;
                const isDragOver = dragOverId === node.id;
                const isBlock = node.type === 'block';

                return (
                    <div
                        key={node.id}
                        className="absolute flex items-center justify-center transition-all duration-300"
                        style={{ 
                            left: pos.x, 
                            top: pos.y, 
                            transform: `translate(-50%, -50%) ${isSelected ? 'scale(1.1)' : 'scale(1)'}`,
                            zIndex: isSelected ? 30 : 10
                        }}
                        onDragOver={(e) => handleNodeDragOver(e, node.id, i)}
                        onDrop={handleDrop}
                    >
                        {isDragOver && (
                            <div className="absolute inset-0 rounded-3xl border-4 border-indigo-400 opacity-60 animate-pulse scale-125 pointer-events-none z-0" />
                        )}

                        <div
                             draggable
                             onDragStart={(e) => handleNodeDragStart(e, node)}
                             onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
                             className={`cursor-pointer ${isDragging ? 'opacity-50' : 'opacity-100'} relative`}
                        >
                            <NodeShape node={node} isSelected={isSelected} onResizeStart={() => {}} />
                            
                            {isBlock && (
                                <div className="absolute -top-3 -right-3 z-50">
                                    <SideEventsNote 
                                        node={node as BlockNode} 
                                        onUpdateNode={onUpdateNode}
                                        isSelected={isSelected}
                                        variant="compact"
                                    />
                                </div>
                            )}

                            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-center w-40 pointer-events-none">
                                {node.type !== 'time' && node.type !== 'place' && (
                                    <>
                                        <div className="text-sm font-bold text-gray-800 leading-tight">{node.title}</div>
                                        {node.subtitle && <div className="text-xs text-gray-500">{node.subtitle}</div>}
                                    </>
                                )}
                                {(node.type === 'time' || node.type === 'place') && node.subtitle && (
                                     <div className="text-xs font-medium text-gray-500 bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded-full mt-1 inline-block shadow-sm">
                                         {node.subtitle}
                                     </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* -----------------------------------------------------------------------------------------
   SUB-RENDERERS (For Vertical View)
----------------------------------------------------------------------------------------- */
interface RendererProps {
    onDragStart: (e: React.DragEvent) => void;
    isDragging: boolean;
}

const SingleNodeRenderer: React.FC<{
  node: SingleNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLast: boolean;
} & RendererProps> = ({ node, selectedId, onSelect, isLast, isDragging, onDragStart }) => {
    
  const isSelected = selectedId === node.id;
  const LineClass = node.isDashedConnection ? "border-dashed" : "border-solid";
  
  return (
    <div className="relative flex flex-col items-center w-full z-10">
      {!isLast && (
        <div 
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 w-0 border-l-4 ${LineClass} border-gray-300 h-full -z-10`} 
            style={{ height: 'calc(100% + 40px)' }}
        />
      )}

      <div 
        draggable
        onDragStart={onDragStart}
        onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
        className={`
            relative z-10 cursor-pointer transition-all duration-300 mb-10 group
            ${isSelected ? 'scale-105 -translate-y-1' : 'hover:scale-102'}
            ${isDragging ? 'opacity-50' : 'opacity-100'}
        `}
      >
        <NodeShape node={node} isSelected={isSelected} />
        <NodeLabels node={node} />
        {isSelected && (
           <div className="absolute inset-0 -m-2 rounded-2xl border-2 border-indigo-400/50 animate-pulse pointer-events-none" />
        )}
      </div>
    </div>
  );
};

const BlockRenderer: React.FC<{
    node: BlockNode;
    selectedId: string | null;
    onSelect: (id: string) => void;
    onUpdateNode: (node: FlowNode) => void;
    isLast: boolean;
    zoom: number; 
} & RendererProps> = ({ node, selectedId, onSelect, onUpdateNode, isLast, isDragging, onDragStart, zoom }) => {
    
    const isSelected = selectedId === node.id;
    const hasSideEvents = node.sideEvents && node.sideEvents.length > 0;
    const shouldShowSideEvents = hasSideEvents || isSelected;

    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = node.customWidth || 128;
        const startHeight = node.customHeight || 128;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const dx = (moveEvent.clientX - startX) / zoom;
            const dy = (moveEvent.clientY - startY) / zoom;
            
            const newWidth = Math.max(100, startWidth + dx);
            const newHeight = Math.max(100, startHeight + dy);

            onUpdateNode({
                ...node,
                customWidth: newWidth,
                customHeight: newHeight
            });
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    return (
        <div className="relative flex flex-col items-center w-full z-10">
            {!isLast && (
                <div 
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 w-0 border-l-4 border-solid border-gray-300 h-full -z-10"
                    style={{ height: 'calc(100% + 40px)' }}
                />
            )}

            <div className="flex items-start gap-6 relative">
                <div 
                    draggable
                    onDragStart={onDragStart}
                    onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
                    className={`
                        relative z-10 cursor-pointer transition-all duration-300 mb-10 group
                        ${isSelected ? 'scale-105' : 'hover:scale-102'}
                        ${isDragging ? 'opacity-50' : 'opacity-100'}
                    `}
                >
                    <NodeShape 
                        node={node} 
                        isSelected={isSelected} 
                        onResizeStart={handleResizeStart}
                    />
                    
                    {isSelected && (
                        <div className="absolute inset-0 -m-2 rounded-2xl border-2 border-indigo-400/50 animate-pulse pointer-events-none" />
                    )}
                </div>
                
                {shouldShowSideEvents && (
                    <>
                        <div className="absolute left-full top-1/2 -translate-y-1/2 w-48 h-40 pointer-events-none overflow-visible z-0">
                            <svg width="100%" height="100%" viewBox="0 0 200 160" className="overflow-visible">
                                <defs>
                                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                        <polygon points="0 0, 10 3.5, 0 7" fill="#cbd5e1" />
                                    </marker>
                                </defs>
                                <path 
                                    d="M 10 80 Q 100 20, 190 60" 
                                    fill="none" 
                                    stroke="#cbd5e1" 
                                    strokeWidth="2" 
                                    strokeDasharray="6 4" 
                                    strokeLinecap="round"
                                    markerEnd="url(#arrowhead)"
                                />
                            </svg>
                        </div>

                        <div className="absolute left-[calc(100%+12rem)] -top-10 z-0">
                            <SideEventsNote 
                                node={node} 
                                onUpdateNode={onUpdateNode}
                                isSelected={isSelected}
                                variant="default"
                            />
                        </div>
                    </>
                )}

            </div>
        </div>
    );
};

const BranchRenderer: React.FC<{
    node: BranchNode;
    selectedId: string | null;
    onSelect: (id: string) => void;
    isLast: boolean;
    prevNode?: FlowNode;
} & RendererProps> = ({ node, selectedId, onSelect, isLast, prevNode, isDragging, onDragStart }) => {
    
    const prevDashed = prevNode?.isDashedConnection ? "border-dashed" : "border-solid";
    const isBranchSelected = selectedId === node.id;
    const branchCount = node.branches.length;

    const containerGap = branchCount === 3 ? "gap-4" : "gap-16";
    const svgContainerWidth = branchCount === 3 ? "w-72" : branchCount === 2 ? "w-48" : "w-10";

    return (
        <div className="w-full flex flex-col items-center relative mb-10 z-10">
            <div className={`h-10 w-0 border-l-4 ${prevDashed} border-gray-300 mb-0 -z-10`} />

            <div 
                draggable
                onDragStart={onDragStart}
                className={`relative flex flex-col items-center group cursor-pointer z-10 ${isDragging ? 'opacity-50' : 'opacity-100'}`} 
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(node.id);
                }}
            >
                <div className={`
                    bg-white px-4 py-1.5 rounded-full border shadow-md text-[11px] font-bold tracking-wider mb-2 z-20 transition-all
                    ${isBranchSelected ? 'border-indigo-500 text-indigo-600 ring-2 ring-indigo-200' : 'border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-500'}
                `}>
                    {node.title}
                </div>

                <div className={`${svgContainerWidth} h-10 relative -z-10 transition-all duration-300`}>
                    <BranchConnectorSVG count={branchCount} isSelected={isBranchSelected} />
                </div>
            </div>

            <div 
                className={`
                    flex justify-center ${containerGap} relative z-10 mt-0
                    p-4 rounded-3xl transition-all duration-300 border-2
                    ${isBranchSelected ? 'bg-indigo-50/40 border-indigo-200 border-dashed' : 'border-transparent'}
                `}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(node.id);
                }}
            >
                {node.branches.map((bNode) => {
                    return (
                        <div 
                            key={bNode.id} 
                            className="flex flex-col items-center cursor-pointer group min-w-[120px]"
                        >
                            <div className={`transition-all duration-200 ${isBranchSelected ? 'scale-105' : 'group-hover:scale-105 group-hover:-translate-y-0.5'}`}>
                                <NodeShape node={bNode} isSelected={isBranchSelected} />
                            </div>
                            <span className="mt-3 text-xs font-semibold text-gray-600 bg-white/50 px-2 rounded-md">{bNode.title}</span>
                        </div>
                    );
                })}
            </div>

            {!isLast && (
                <div className={`${svgContainerWidth} h-10 relative mt-2 -z-10 transition-all duration-300`}>
                     <BranchConnectorSVG count={branchCount} isSelected={isBranchSelected} isBottom />
                </div>
            )}
            
             {!isLast && (
                 <div className="h-6 w-0 border-l-4 border-solid border-gray-300 -z-10" />
             )}
        </div>
    )
}
