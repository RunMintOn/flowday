
import React, { useState } from 'react';
import { SingleNode, BlockNode, BranchNode, FlowNode } from '../types';
import * as Icons from 'lucide-react';
import { Clock, Trash2, Pin, ListTodo } from 'lucide-react';

/* --- HELPERS --- */
export const getColorClass = (c?: string) => {
    if (c === 'rose') return 'text-rose-500';
    if (c === 'teal') return 'text-teal-400';
    if (c === 'yellow') return 'text-yellow-400';
    if (c === 'violet') return 'text-violet-600';
    if (c === 'indigo') return 'text-indigo-500';
    return 'text-gray-500';
};

/* --- NODE SHAPE --- */
export const NodeShape: React.FC<{ 
    node: FlowNode; 
    isSelected: boolean;
    onResizeStart?: (e: React.MouseEvent) => void;
}> = ({ node, isSelected, onResizeStart }) => {
    const LucideIcon = node.icon ? (Icons[node.icon as keyof typeof Icons] as React.ElementType) : null;
    const baseShadow = isSelected 
        ? "shadow-[0_10px_25px_-5px_rgba(0,0,0,0.2),0_8px_10px_-6px_rgba(0,0,0,0.1)]" 
        : "shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)]";
    
    // 1. Time
    if (node.type === 'time') {
        return (
            <div className={`min-w-[3.5rem] w-auto px-3 h-14 rounded-full flex items-center justify-center bg-rose-500 text-white font-bold border-[3px] border-white ${baseShadow} z-20`}>
                <span className="text-sm whitespace-nowrap">{node.title}</span>
            </div>
        );
    }

    // 2. Place
    if (node.type === 'place') {
        const bg = node.color === 'teal' ? 'bg-teal-400' : 'bg-yellow-400';
        return (
            <div className="relative flex items-center justify-center w-16 h-16 z-20">
                <div className={`absolute inset-0 transform rotate-45 rounded-xl border-[3px] border-white ${bg} ${baseShadow}`} />
                <span className="relative z-10 text-[10px] font-bold text-white tracking-wider">{node.title}</span>
            </div>
        );
    }

    // 3. Block Node (Special large size, Resizable, Content Inside)
    if (node.type === 'block') {
        const width = (node as BlockNode).customWidth || 128;
        const height = (node as BlockNode).customHeight || 128;

        return (
            <div 
                style={{ width: `${width}px`, height: `${height}px` }}
                className={`rounded-2xl flex flex-col items-center justify-center bg-white border border-gray-100 ${baseShadow} z-20 relative p-2 text-center overflow-hidden`}
            >
                {LucideIcon ? (
                    <LucideIcon size={24} className={`${getColorClass(node.color)} mb-1`} />
                ) : null}

                {/* Content Inside */}
                <span className="text-sm font-bold text-gray-800 leading-tight">{node.title}</span>
                {node.subtitle && (
                     <span className="text-[10px] text-gray-500 leading-snug mt-1 line-clamp-2">{node.subtitle}</span>
                )}
                 {node.duration && (
                     <div className="flex items-center gap-1 mt-1.5 text-[10px] text-gray-400 font-medium tracking-wide bg-gray-50 px-1.5 py-0.5 rounded-full">
                        <Clock size={8} />
                        <span>{node.duration}</span>
                    </div>
                )}

                {/* Resize Handle */}
                {isSelected && onResizeStart && (
                    <div 
                        onMouseDown={onResizeStart}
                        className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-end justify-end p-1 rounded-br-2xl hover:bg-gray-100 transition-colors group/handle"
                        title="拖动调整大小"
                    >
                         <svg width="8" height="8" viewBox="0 0 10 10" fill="none" className="opacity-40 group-hover/handle:opacity-100 transition-opacity">
                            <path d="M8 2L2 8" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
                            <path d="M8 6L6 8" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                    </div>
                )}
            </div>
        );
    }

    // 4. Default (Task & Branch & Others)
    return (
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center bg-white border border-gray-100 ${baseShadow} z-20`}>
            {LucideIcon ? (
                <LucideIcon size={24} className={getColorClass(node.color)} />
            ) : (
                <div className="w-4 h-4 rounded-full bg-gray-200" />
            )}
        </div>
    );
};

/* --- LABELS --- */
export const NodeLabels: React.FC<{ node: FlowNode }> = ({ node }) => {
    const isTitleInShape = node.type === 'time' || node.type === 'place';
    
    return (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-5 w-48 flex flex-col justify-center pointer-events-none text-left">
            {!isTitleInShape && (
                <span className="text-sm font-bold text-gray-800 leading-tight">{node.title}</span>
            )}
            {node.subtitle && (
                <span className={`text-xs text-gray-500 leading-snug ${!isTitleInShape ? '' : 'font-medium'}`}>{node.subtitle}</span>
            )}
            {node.duration && (
                 <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400 font-medium tracking-wide">
                    <Clock size={10} />
                    <span>{node.duration}</span>
                </div>
            )}
        </div>
    );
};

/* --- SIDE EVENTS NOTE --- */
interface SideEventsNoteProps {
    node: BlockNode;
    onUpdateNode: (node: FlowNode) => void;
    isSelected: boolean;
    variant?: 'default' | 'compact'; // 'compact' uses a badge + popover
}

export const SideEventsNote: React.FC<SideEventsNoteProps> = ({ 
    node, 
    onUpdateNode, 
    isSelected,
    variant = 'default'
}) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isHovered, setIsHovered] = useState(false);

    const handleSmartUpdate = (eventId: string, rawValue: string, type: string) => {
        let title = rawValue;
        let subtitle = '';

        if (type === 'time') {
            const match = rawValue.match(/^(\d{1,2}[:：]\d{2})\s*(.*)$/);
            if (match) {
                title = match[1];
                subtitle = match[2];
            } else {
                title = rawValue;
            }
        } else {
            title = rawValue;
        }

        const updatedEvents = node.sideEvents.map(evt => 
            evt.id === eventId ? { ...evt, title, subtitle } : evt
        );
        onUpdateNode({ ...node, sideEvents: updatedEvents });
    };

    const handleDeleteSideEvent = (eventId: string) => {
        const updatedEvents = node.sideEvents.filter(evt => evt.id !== eventId);
        onUpdateNode({ ...node, sideEvents: updatedEvents });
        if (editingId === eventId) setEditingId(null);
    }

    // The actual Sticky Note Card UI
    const CardContent = (
        <div 
            className={`
                bg-[#fff9c4] rounded-sm shadow-[2px_4px_12px_rgba(0,0,0,0.15)] p-4 border-t-8 border-[#fef08a] relative
                cursor-default transition-transform duration-300 w-64
                ${variant === 'default' ? 'transform rotate-1 hover:rotate-0 hover:scale-105' : ''}
                ${isSelected && variant === 'default' ? 'ring-2 ring-indigo-300 ring-offset-2' : ''}
            `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-gray-400 opacity-80 shadow-sm">
                <Pin size={20} fill="currentColor" className="text-gray-300" />
            </div>
            
            <div className="mb-3 border-b border-[#fde047] pb-1.5 flex justify-between items-center">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">期间待办 / 穿插事项</p>
                {variant === 'compact' && (
                     <span className="text-[9px] bg-[#fde047] text-yellow-800 px-1.5 rounded-full font-bold">{node.sideEvents.length}</span>
                )}
            </div>

            <ul className="space-y-2.5 min-h-[60px]">
                {node.sideEvents.length === 0 ? (
                    <li className="text-xs text-gray-400 italic text-center py-2">
                        {isSelected ? "点击属性面板添加..." : "暂无穿插事项"}
                    </li>
                ) : (
                    node.sideEvents.map((evt) => {
                        const displayValue = evt.type === 'time' 
                            ? `${evt.title} ${evt.subtitle || ''}`.trim()
                            : evt.title;

                        return (
                            <li key={evt.id} className="flex items-start gap-2 group">
                                <div className="mt-1 text-gray-500 group-hover:text-indigo-600 transition-colors shrink-0">
                                    {evt.type === 'time' ? <Clock size={14} /> : <div className="w-3.5 h-3.5 border-2 border-gray-400 rounded-sm" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    {editingId === evt.id ? (
                                        <div 
                                            className="relative"
                                            onBlur={(e) => {
                                                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                                    setEditingId(null);
                                                }
                                            }}
                                        >
                                            <div className="flex items-center border-b border-yellow-600/30 focus-within:border-yellow-600/60 transition-colors">
                                                <input 
                                                    autoFocus
                                                    value={displayValue}
                                                    onChange={(e) => handleSmartUpdate(evt.id, e.target.value, evt.type)}
                                                    onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                                                    className="w-full bg-transparent px-0 py-0.5 text-xs font-medium text-gray-900 focus:outline-none placeholder-yellow-800/40 selection:bg-yellow-500/30"
                                                    placeholder={evt.type === 'time' ? "例如: 12:00 事项..." : "任务内容..."}
                                                />
                                                <button 
                                                    onMouseDown={(e) => { e.preventDefault(); handleDeleteSideEvent(evt.id); }} 
                                                    className="text-gray-400 hover:text-red-500 p-0.5 rounded transition-colors opacity-50 hover:opacity-100" 
                                                    title="删除"
                                                >
                                                    <Trash2 size={10} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div 
                                            onClick={() => setEditingId(evt.id)}
                                            className="cursor-pointer hover:bg-yellow-200/50 rounded -mx-1 px-1 transition-colors"
                                        >
                                            <div className={`text-xs font-medium text-gray-800 leading-tight truncate ${evt.type === 'task' ? 'group-hover:line-through transition-all' : ''}`}>
                                                {displayValue}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </li>
                        );
                    })
                )}
            </ul>
        </div>
    );

    // --- RENDER LOGIC ---

    // 1. Default Vertical View (Always Visible)
    if (variant === 'default') {
        return (
            <div className="w-64 transition-all duration-300">
                {CardContent}
            </div>
        );
    }

    // 2. Compact Map View (Badge -> Popover)
    // Show popover if hovered OR if actively editing
    const showPopover = isHovered || editingId !== null;

    return (
        <div 
            className="relative z-40"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Visual Cue / Badge */}
            <div className={`
                w-7 h-7 rounded-full shadow-md flex items-center justify-center border-2 border-white
                cursor-pointer hover:scale-110 transition-transform
                ${node.sideEvents.length > 0 ? 'bg-amber-300 text-amber-900' : 'bg-amber-100 text-amber-400'}
            `}>
                {node.sideEvents.length > 0 ? (
                    <span className="text-[10px] font-bold">{node.sideEvents.length}</span>
                ) : (
                    <ListTodo size={14} />
                )}
                
                {/* Tiny Pin Decoration - Adjusted pos */}
                {node.sideEvents.length > 0 && (
                    <div className="absolute -top-1.5 -right-1.5 bg-white rounded-full p-0.5 shadow-sm">
                         <Pin size={8} className="text-rose-500 fill-rose-500 transform rotate-12" />
                    </div>
                )}
            </div>

            {/* Popover Content */}
            <div className={`
                absolute left-full top-0 ml-3 z-50
                transition-all duration-200 origin-top-left
                ${showPopover ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'}
            `}>
                {CardContent}
            </div>
        </div>
    );
};

/* --- BRANCH SVG --- */
export const BranchConnectorSVG: React.FC<{ count: number; isSelected: boolean; isBottom?: boolean }> = ({ count, isSelected, isBottom }) => {
    const strokeColor = isSelected ? "#818cf8" : "#d1d5db";
    const width = count === 3 ? 300 : count === 2 ? 200 : 40; 
    const height = 40;
    const viewBox = `0 0 ${width} ${height}`;
    const centerX = width / 2;
    
    const yCommon = isBottom ? height : 0; 
    const ySpread = isBottom ? 0 : height; 

    const yControlCommon = isBottom ? height * 0.5 : height * 0.5;

    if (count === 1) {
        return (
            <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox={viewBox} preserveAspectRatio="none">
                <line x1={centerX} y1="0" x2={centerX} y2="40" stroke={strokeColor} strokeWidth="4" />
            </svg>
        )
    }

    if (count === 2) {
        const xLeft = width * 0.2;
        const xRight = width * 0.8;
        
        return (
            <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox={viewBox} preserveAspectRatio="none">
                <path 
                    d={`M${centerX},${yCommon} L${centerX},${isBottom ? yCommon - 10 : 10} Q${centerX},${yControlCommon} ${xLeft},${isBottom ? 10 : 25} L${xLeft},${ySpread}`} 
                    fill="none" stroke={strokeColor} strokeWidth="4" strokeLinecap="round"
                />
                <path 
                    d={`M${centerX},${yCommon} L${centerX},${isBottom ? yCommon - 10 : 10} Q${centerX},${yControlCommon} ${xRight},${isBottom ? 10 : 25} L${xRight},${ySpread}`} 
                    fill="none" stroke={strokeColor} strokeWidth="4" strokeLinecap="round"
                />
            </svg>
        )
    }

    if (count === 3) {
        const xLeft = width * 0.15;
        const xRight = width * 0.85;
        
        return (
             <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox={viewBox} preserveAspectRatio="none">
                <path 
                     d={`M${centerX},${yCommon} Q${centerX},${yControlCommon} ${xLeft},${ySpread}`} 
                     fill="none" stroke={strokeColor} strokeWidth="4" strokeLinecap="round"
                />
                <line x1={centerX} y1={yCommon} x2={centerX} y2={ySpread} stroke={strokeColor} strokeWidth="4" strokeLinecap="round" />
                 <path 
                     d={`M${centerX},${yCommon} Q${centerX},${yControlCommon} ${xRight},${ySpread}`} 
                     fill="none" stroke={strokeColor} strokeWidth="4" strokeLinecap="round"
                />
            </svg>
        )
    }

    return null;
}
