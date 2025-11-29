
import React, { useState } from 'react';
import { FlowNode, SingleNode, BranchNode, BlockNode } from '../types';
import { Save, Trash2, X, Clock, Square, Edit2, Check } from 'lucide-react';

interface PropertiesPanelProps {
  selectedNodeId: string | null;
  nodes: FlowNode[];
  onUpdateNode: (updatedNode: FlowNode) => void;
  onDeleteNode: (id: string) => void;
  onClose: () => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ 
  selectedNodeId, 
  nodes, 
  onUpdateNode,
  onDeleteNode,
  onClose
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);

  // Find node (Single, Branch, or Block child)
  const findNode = (id: string): FlowNode | undefined => {
    for (const node of nodes) {
      if (node.id === id) return node;
      
      if (node.type === 'branch') {
        const found = node.branches.find(b => b.id === id);
        if (found) return found;
      }

      if (node.type === 'block') {
        const found = node.sideEvents.find(b => b.id === id);
        if (found) return found;
      }
    }
    return undefined;
  };

  const selectedNode = selectedNodeId ? findNode(selectedNodeId) : null;

  if (!selectedNode) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-6 flex flex-col items-center justify-center text-gray-400">
        <p>请选择一个节点进行编辑</p>
      </div>
    );
  }

  const handleChange = (field: keyof SingleNode, value: string | boolean) => {
    onUpdateNode({ ...selectedNode, [field]: value } as FlowNode);
  };

  const getTypeLabel = (type: string) => {
      switch(type) {
          case 'time': return '时间点';
          case 'branch': return '分组名称';
          case 'block': return '专注主题';
          default: return '标题';
      }
  }

  const getSubtitleLabel = (type: string) => {
      switch(type) {
          case 'time': return '活动名称';
          case 'block': return '详细目标';
          default: return '副标题 / 描述';
      }
  }

  // Branch Specific Handlers
  const handleBranchCountChange = (count: number) => {
      if (selectedNode.type !== 'branch') return;
      const branch = selectedNode as BranchNode;
      let newBranches = [...branch.branches];

      if (count > newBranches.length) {
          // Add branches
          for (let i = newBranches.length; i < count; i++) {
              newBranches.push({
                  id: `${branch.id}_task_${Date.now()}_${i}`,
                  type: 'task',
                  title: i === 0 ? '主任务' : '并行任务',
                  subtitle: '任务描述...',
                  color: 'white',
                  duration: '15 mins',
                  icon: 'CheckSquare'
              });
          }
      } else if (count < newBranches.length) {
          // Remove branches
          newBranches = newBranches.slice(0, count);
      }
      
      onUpdateNode({ ...branch, branches: newBranches });
  }
  
  const handleBranchUpdate = (branchIndex: number, field: keyof SingleNode, value: string) => {
      if (selectedNode.type !== 'branch') return;
      const branch = selectedNode as BranchNode;
      const newBranches = [...branch.branches];
      newBranches[branchIndex] = { ...newBranches[branchIndex], [field]: value } as SingleNode;
      onUpdateNode({ ...branch, branches: newBranches });
  }

  // Block Side Event Handler
  const addSideEvent = (type: 'task' | 'time') => {
      if (selectedNode.type !== 'block') return;
      const block = selectedNode as BlockNode;
      
      const newId = `${block.id}_side_${Date.now()}`;
      const newEvent: SingleNode = {
          id: newId,
          type: type,
          title: type === 'time' ? '12:00' : '新任务',
          subtitle: type === 'time' ? '事项...' : '',
          color: type === 'time' ? 'rose' : 'white',
          duration: type === 'task' ? '15 mins' : undefined,
          icon: type === 'task' ? 'Square' : undefined
      };

      onUpdateNode({
          ...block,
          sideEvents: [...block.sideEvents, newEvent]
      });
      
      // Auto enter edit mode
      setEditingId(newId);
  }

  // Smart Parsing Logic: Combines Title and Subtitle input
  // Supports "12:00 Lunch" -> Title: 12:00, Subtitle: Lunch
  const handleSmartUpdate = (eventId: string, rawValue: string, type: string) => {
      if (selectedNode.type !== 'block') return;
      const block = selectedNode as BlockNode;
      
      let title = rawValue;
      let subtitle = '';

      if (type === 'time') {
          // Regex to check for HH:MM at the start (supports standard colon and full-width colon)
          // Captures "11:10" as group 1, and the rest as group 2
          const match = rawValue.match(/^(\d{1,2}[:：]\d{2})\s*(.*)$/);
          if (match) {
              title = match[1];
              subtitle = match[2];
          } else {
              title = rawValue;
          }
      } else {
          // For tasks, everything is the title (single line)
          title = rawValue;
      }

      const updatedEvents = block.sideEvents.map(evt => 
          evt.id === eventId ? { ...evt, title, subtitle } : evt
      );
      onUpdateNode({ ...block, sideEvents: updatedEvents });
  }

  const deleteSideEvent = (eventId: string) => {
      if (selectedNode.type !== 'block') return;
      const block = selectedNode as BlockNode;
      onUpdateNode({ 
          ...block, 
          sideEvents: block.sideEvents.filter(evt => evt.id !== eventId) 
      });
      if (editingId === eventId) setEditingId(null);
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 shadow-xl flex flex-col z-20">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <div>
           <h2 className="text-lg font-bold text-gray-800">节点属性</h2>
           <p className="text-xs text-gray-400">ID: {selectedNode.id}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
        </button>
      </div>

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        
        {/* Title Input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {getTypeLabel(selectedNode.type)}
          </label>
          <input
            type="text"
            value={selectedNode.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-gray-800 font-medium"
          />
        </div>

        {/* Subtitle Input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
             {getSubtitleLabel(selectedNode.type)}
          </label>
          <input
            type="text"
            value={selectedNode.subtitle || ''}
            onChange={(e) => handleChange('subtitle', e.target.value)}
            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-gray-800"
          />
        </div>

        {/* Branch Parallel Settings */}
        {selectedNode.type === 'branch' && (
             <div className="space-y-3 pt-4 border-t border-gray-100">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex justify-between">
                    并行任务数量
                    <span className="text-indigo-600">{(selectedNode as BranchNode).branches.length}</span>
                </label>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    {[2, 3].map(count => {
                        const isSelected = (selectedNode as BranchNode).branches.length === count;
                        return (
                            <button
                                key={count}
                                onClick={() => handleBranchCountChange(count)}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all duration-200 ${
                                    isSelected 
                                    ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' 
                                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200/50'
                                }`}
                            >
                                {count}
                            </button>
                        )
                    })}
                </div>
                
                {/* Branch Editors */}
                <div className="space-y-4 mt-4">
                     {(selectedNode as BranchNode).branches.map((branch, index) => (
                         <div key={branch.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                             <div className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wide">任务 {index + 1}</div>
                             <div className="space-y-2">
                                <input 
                                    value={branch.title}
                                    onChange={(e) => handleBranchUpdate(index, 'title', e.target.value)}
                                    className="w-full text-sm font-medium bg-white border border-gray-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                    placeholder="任务标题"
                                />
                                <input 
                                    value={branch.subtitle || ''}
                                    onChange={(e) => handleBranchUpdate(index, 'subtitle', e.target.value)}
                                    className="w-full text-xs bg-white border border-gray-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                    placeholder="描述"
                                />
                                 <input 
                                    value={branch.duration || ''}
                                    onChange={(e) => handleBranchUpdate(index, 'duration', e.target.value)}
                                    className="w-full text-xs bg-white border border-gray-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                    placeholder="时长 (例如 15 mins)"
                                />
                             </div>
                         </div>
                     ))}
                </div>
             </div>
        )}

        {/* Block Side Event Settings */}
        {selectedNode.type === 'block' && (
             <div className="space-y-3 pt-4 border-t border-gray-100">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    期间穿插事项
                </label>
                <p className="text-[10px] text-gray-400 leading-relaxed">
                    在专注时间段内必须处理的小事务 (如点餐、吃药)。
                </p>
                <div className="grid grid-cols-2 gap-2">
                    <button 
                        onClick={() => addSideEvent('time')}
                        className="flex items-center justify-center gap-1 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 transition-colors"
                    >
                        <Clock size={14} className="text-rose-500" /> 添加时间点
                    </button>
                    <button 
                        onClick={() => addSideEvent('task')}
                        className="flex items-center justify-center gap-1 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 transition-colors"
                    >
                        <Square size={14} className="text-teal-500" /> 添加任务
                    </button>
                </div>
                
                {/* Editable List of Side Events */}
                <div className="flex flex-col gap-2 mt-2">
                    {(selectedNode as BlockNode).sideEvents.map(event => {
                        const isEditing = editingId === event.id;
                        // Construct display value for the single input
                        const displayValue = event.type === 'time' 
                            ? `${event.title} ${event.subtitle || ''}`.trim()
                            : event.title;

                        return (
                            <div key={event.id} className={`flex flex-col bg-white border ${isEditing ? 'border-indigo-300 ring-2 ring-indigo-50 shadow-sm' : 'border-gray-100'} p-2 rounded transition-all`}>
                                {isEditing ? (
                                    <div 
                                        className="space-y-2"
                                        onBlur={(e) => {
                                            // Only close editing if focus leaves the container
                                            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                                setEditingId(null);
                                            }
                                        }}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            {/* Single Smart Input */}
                                            <input 
                                                autoFocus
                                                type="text"
                                                value={displayValue}
                                                onChange={(e) => handleSmartUpdate(event.id, e.target.value, event.type)}
                                                onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                                                className="flex-1 text-xs px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-gray-800 focus:border-indigo-500 focus:bg-white focus:outline-none placeholder-gray-400"
                                                placeholder={event.type === 'time' ? "例如: 12:00 吃饭" : "任务内容..."}
                                            />
                                        </div>
                                        <div className="flex justify-end gap-2 pt-1">
                                            <button onClick={() => deleteSideEvent(event.id)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors" title="删除">
                                                <Trash2 size={14} />
                                            </button>
                                            <button onClick={() => setEditingId(null)} className="text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-1 rounded font-medium text-xs flex items-center gap-1 transition-colors">
                                                <Check size={14} /> 完成
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div 
                                        onClick={() => setEditingId(event.id)}
                                        className="flex items-center justify-between cursor-pointer hover:bg-gray-50 -m-1 p-2 rounded group"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="text-gray-400">
                                                {event.type === 'time' ? <Clock size={12} /> : <Square size={12} />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs text-gray-700 font-medium">{displayValue}</span>
                                            </div>
                                        </div>
                                        <Edit2 size={12} className="text-gray-300 opacity-0 group-hover:opacity-100 hover:text-indigo-500 transition-all" />
                                    </div>
                                )}
                            </div>
                        )
                    })}
                    {(selectedNode as BlockNode).sideEvents.length === 0 && (
                        <div className="text-[10px] text-gray-300 italic text-center py-2">无穿插事项</div>
                    )}
                </div>
             </div>
        )}

        {/* Duration (Skip for Branch) */}
        {selectedNode.type !== 'branch' && (
            <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">持续时间</label>
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
                <input
                type="text"
                value={selectedNode.duration || ''}
                onChange={(e) => handleChange('duration', e.target.value)}
                className="bg-transparent w-full focus:outline-none text-gray-800"
                placeholder="例如: 30 mins"
                />
                <span className="text-gray-400 text-xs ml-2">est.</span>
            </div>
            </div>
        )}

        {/* Style / Color Picker (Simple) - Skip for branch usually, but let's keep it available if needed */}
        {selectedNode.type !== 'branch' && selectedNode.type !== 'block' && (
            <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">样式风格</label>
            <div className="flex gap-2">
                {['white', 'rose', 'teal', 'yellow', 'gradient'].map((c) => (
                    <button 
                        key={c}
                        onClick={() => handleChange('color', c)}
                        className={`w-8 h-8 rounded-full border-2 ${selectedNode.color === c ? 'border-indigo-600' : 'border-transparent'} shadow-sm`}
                        style={{ 
                            background: c === 'white' ? '#fff' : c === 'gradient' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : `var(--color-${c}-400, ${getColorHex(c)})` 
                        }}
                    />
                ))}
            </div>
            </div>
        )}
        
        {/* Connection Type - Hide for Branch nodes as it doesn't apply cleanly to the container */}
        {selectedNode.type !== 'branch' && (
            <div className="flex items-center gap-3 pt-2">
                <input 
                    type="checkbox" 
                    id="dashed"
                    checked={selectedNode.isDashedConnection || false}
                    onChange={(e) => {
                        handleChange('isDashedConnection', e.target.checked);
                    }}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                />
                <label htmlFor="dashed" className="text-sm text-gray-600 select-none">使用虚线连接 (通勤/移动)</label>
            </div>
        )}

      </div>

      <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3">
        <button 
            className="flex-1 bg-gray-800 hover:bg-gray-900 text-white py-2.5 rounded-full font-medium text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-gray-300"
            onClick={onClose}
        >
          <Save size={16} /> 保存
        </button>
        <button 
            className="p-2.5 text-red-500 hover:bg-red-50 rounded-full border border-gray-200 transition-colors"
            onClick={() => onDeleteNode(selectedNode.id)}
            title="删除节点"
        >
            <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

// Helper for inline styles
const getColorHex = (colorName: string) => {
    switch(colorName) {
        case 'rose': return '#f43f5e';
        case 'teal': return '#2dd4bf';
        case 'yellow': return '#facc15';
        default: return '#e2e8f0';
    }
}
    