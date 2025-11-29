
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { FlowCanvas } from './components/FlowCanvas';
import { PropertiesPanel } from './components/PropertiesPanel';
import { INITIAL_NODES, WEEKEND_NODES } from './constants';
import { FlowNode, SingleNode, BranchNode, BlockNode } from './types';
import { MoreHorizontal, Share2, RotateCcw, Plus, Save, Layout as LayoutIcon, ChevronDown, Check, Cloud } from 'lucide-react';

// --- Types for Layout Management ---
interface Layout {
  id: string;
  name: string;
  nodes: FlowNode[];
}

interface AppData {
  layouts: Layout[];
  activeLayoutId: string;
}

const DEFAULT_LAYOUTS: Layout[] = [
  { id: 'layout_weekday', name: '工作日 (Weekday)', nodes: INITIAL_NODES },
  { id: 'layout_weekend', name: '周末 (Weekend)', nodes: WEEKEND_NODES }
];

export default function App() {
  // --- State Initialization ---
  
  // 1. App Data (Layouts container)
  const [layouts, setLayouts] = useState<Layout[]>(DEFAULT_LAYOUTS);
  const [activeLayoutId, setActiveLayoutId] = useState<string>('layout_weekday');
  
  // 2. Canvas State (The current working nodes)
  const [nodes, setNodes] = useState<FlowNode[]>(INITIAL_NODES);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');

  // UI State for custom dropdown
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Deletion Confirmation State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // --- Core Persistence Logic ---

  // Helper: Construct the full data object by merging current nodes into layouts
  // This ensures we always save the absolute latest state of the canvas
  const getPersistentData = useCallback((currentLayouts: Layout[], currentActiveId: string, currentNodes: FlowNode[]): AppData => {
      const updatedLayouts = currentLayouts.map(l => 
          l.id === currentActiveId ? { ...l, nodes: currentNodes } : l
      );
      return {
          layouts: updatedLayouts,
          activeLayoutId: currentActiveId
      };
  }, []);

  // Function to write to localStorage
  const saveToStorage = useCallback((data: AppData) => {
      try {
          localStorage.setItem('FLOWDAY_APP_DATA', JSON.stringify(data));
          // Clean up legacy storage
          localStorage.removeItem('FLOWDAY_NODES');
          
          const now = new Date();
          setLastSavedTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
          setSaveStatus('saved');
      } catch (e) {
          console.error("Save failed", e);
          alert("保存失败：可能是本地存储空间不足");
      }
  }, []);

  // --- Load Data on Mount ---
  useEffect(() => {
      try {
          const savedDataStr = localStorage.getItem('FLOWDAY_APP_DATA');
          if (savedDataStr) {
              const savedData: AppData = JSON.parse(savedDataStr);
              
              if (savedData.layouts && savedData.layouts.length > 0) {
                  setLayouts(savedData.layouts);
                  
                  const activeId = savedData.activeLayoutId || savedData.layouts[0].id;
                  setActiveLayoutId(activeId);
                  
                  const activeLayout = savedData.layouts.find(l => l.id === activeId) || savedData.layouts[0];
                  setNodes(activeLayout.nodes);
                  
                  // Set initial saved time
                  const now = new Date();
                  setLastSavedTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
                  return;
              }
          }
      } catch (error) {
          console.error("Failed to load app data", error);
      }
  }, []);

  // --- Auto-Save & Sync Logic ---

  // 1. Sync State: Keep the `layouts` state updated in memory when `nodes` change
  // This is for UI switching purposes, separate from the storage loop for safety
  useEffect(() => {
      setLayouts(prev => prev.map(l => 
          l.id === activeLayoutId ? { ...l, nodes: nodes } : l
      ));
      if (saveStatus !== 'saving') {
          setSaveStatus('unsaved');
      }
  }, [nodes, activeLayoutId]);

  // 2. Auto-Save Debounce
  useEffect(() => {
      // Don't auto-save on initial load to prevent overwrites or unnecessary writes
      // Simple check: if status is 'saved', we might not need to write unless nodes changed (handled by effect dependency)
      
      const timer = setTimeout(() => {
          if (saveStatus === 'unsaved') {
              setSaveStatus('saving');
              const data = getPersistentData(layouts, activeLayoutId, nodes);
              saveToStorage(data);
          }
      }, 1000); // 1 second debounce

      return () => clearTimeout(timer);
  }, [nodes, layouts, activeLayoutId, saveStatus, getPersistentData, saveToStorage]);

  // 3. Visibility Change (Save on tab switch/minimize) - "Emergency Save"
  useEffect(() => {
      const handleVisibilityChange = () => {
          if (document.hidden) {
              const data = getPersistentData(layouts, activeLayoutId, nodes);
              saveToStorage(data);
          }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [layouts, activeLayoutId, nodes, getPersistentData, saveToStorage]);


  // --- Layout Management Handlers ---

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle switching layouts
  const handleSwitchLayout = (newLayoutId: string) => {
      if (newLayoutId === activeLayoutId) return;

      // Force save current before switching
      const currentData = getPersistentData(layouts, activeLayoutId, nodes);
      saveToStorage(currentData);

      const targetLayout = layouts.find(l => l.id === newLayoutId);
      
      if (targetLayout) {
          setActiveLayoutId(newLayoutId);
          setNodes(targetLayout.nodes);
          setSelectedNodeId(null);
      }
  };

  const handleCreateLayout = () => {
      const name = prompt("请输入新布局名称 (例如: 假期/旅行):", "新布局");
      if (name) {
          // Save current first
          const currentData = getPersistentData(layouts, activeLayoutId, nodes);
          saveToStorage(currentData);

          const newId = `layout_${Date.now()}`;
          const newLayout: Layout = {
              id: newId,
              name: name,
              nodes: [] // Start empty
          };
          
          setLayouts(prev => [...prev, newLayout]);
          setActiveLayoutId(newId);
          setNodes([]); // Switch to empty canvas
          setSelectedNodeId(null);
          
          // Trigger immediate save for the new layout structure
          setTimeout(() => {
               const newData = getPersistentData([...layouts, newLayout], newId, []);
               saveToStorage(newData);
          }, 0);
      }
  }

  // Handle Manual Save (Force)
  const handleManualSave = () => {
      setSaveStatus('saving');
      const data = getPersistentData(layouts, activeLayoutId, nodes);
      // Simulate a small delay for visual feedback if it's too fast
      setTimeout(() => saveToStorage(data), 300);
  };

  // Handle Reset
  const handleResetData = () => {
      if (confirm('确定要重置所有数据到初始状态吗？这将清除所有自定义布局。')) {
          localStorage.removeItem('FLOWDAY_APP_DATA');
          localStorage.removeItem('FLOWDAY_NODES');
          
          setLayouts(DEFAULT_LAYOUTS);
          setActiveLayoutId(DEFAULT_LAYOUTS[0].id);
          setNodes(DEFAULT_LAYOUTS[0].nodes);
          setSelectedNodeId(null);
          setSaveStatus('saved');
          setLastSavedTime('');
      }
  };

  // --- Node Operations ---

  const handleUpdateNode = (updatedNode: FlowNode) => {
    const updateRecursive = (list: FlowNode[]): FlowNode[] => {
      return list.map(n => {
        if (n.id === updatedNode.id) return updatedNode;
        if (n.type === 'branch') {
          const branch = n as BranchNode;
          const childMatch = branch.branches.some(b => b.id === updatedNode.id);
          if (childMatch) {
             return {
                 ...n,
                 branches: branch.branches.map(b => b.id === updatedNode.id ? (updatedNode as SingleNode) : b)
             }
          }
        }
        if (n.type === 'block') {
            const block = n as BlockNode;
            const childMatch = block.sideEvents.some(b => b.id === updatedNode.id);
            if (childMatch) {
                return {
                    ...n,
                    sideEvents: block.sideEvents.map(b => b.id === updatedNode.id ? (updatedNode as SingleNode) : b)
                }
            }
        }
        return n;
      });
    };
    setNodes(updateRecursive(nodes));
  };

  const handleDeleteNode = useCallback((id: string) => {
      const deleteRecursive = (list: FlowNode[]): FlowNode[] => {
          return list
            .filter(n => n.id !== id)
            .map(n => {
                if (n.type === 'branch') {
                    return {
                        ...n,
                        branches: n.branches.filter(b => b.id !== id)
                    } as BranchNode;
                }
                if (n.type === 'block') {
                    return {
                        ...n,
                        sideEvents: n.sideEvents.filter(b => b.id !== id)
                    } as BlockNode;
                }
                return n;
            });
      };
      setNodes(prev => deleteRecursive(prev));
      if (selectedNodeId === id) setSelectedNodeId(null);
  }, [selectedNodeId]);

  // --- Keydown Listener for Backspace Delete ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const activeEl = document.activeElement as HTMLElement;
        const activeTag = activeEl?.tagName.toLowerCase();
        
        // Don't delete if typing in input/textarea or contentEditable
        if (activeTag === 'input' || activeTag === 'textarea' || activeEl.isContentEditable) return;

        if (e.key === 'Backspace' && selectedNodeId) {
            e.preventDefault(); 
            
            if (deleteConfirmId === selectedNodeId) {
                handleDeleteNode(selectedNodeId);
                setDeleteConfirmId(null);
            } else {
                setDeleteConfirmId(selectedNodeId);
                setTimeout(() => {
                    setDeleteConfirmId(prev => prev === selectedNodeId ? null : prev);
                }, 3000);
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, deleteConfirmId, handleDeleteNode]);

  // Reset confirmation if selection changes
  useEffect(() => {
      setDeleteConfirmId(null);
  }, [selectedNodeId]);


  const createNode = (type: string): FlowNode => {
      const newId = Date.now().toString();
      
      if (type === 'block') {
          return {
              id: newId,
              type: 'block',
              title: '新时间段',
              subtitle: '专注任务...',
              color: 'violet',
              duration: '60 mins',
              icon: 'Hourglass',
              sideEvents: []
          } as BlockNode;
      }

      if (type === 'branch') {
        return {
            id: newId,
            type: 'branch',
            title: '并行组',
            subtitle: '',
            branches: [
                { id: newId + '_1', type: 'task', title: '任务 A', subtitle: '', color: 'white', duration: '15 mins', icon: 'Square' },
                { id: newId + '_2', type: 'task', title: '任务 B', subtitle: '', color: 'white', duration: '15 mins', icon: 'Square' }
            ]
        } as BranchNode;
      }
      
      return {
            id: newId,
            type: type as any,
            title: type === 'time' ? '00:00' : '新节点',
            subtitle: '',
            color: type === 'time' ? 'rose' : type === 'place' ? 'yellow' : 'white',
            icon: type === 'task' ? 'Square' : undefined
      } as SingleNode;
  }

  const handleAddNode = (type: 'time' | 'task' | 'place' | 'branch' | 'block') => {
    const newNode = createNode(type);
    if (selectedNodeId) {
        const rootIndex = nodes.findIndex(n => n.id === selectedNodeId);
        if (rootIndex !== -1) {
            const newNodes = [...nodes];
            newNodes.splice(rootIndex + 1, 0, newNode);
            setNodes(newNodes);
            setSelectedNodeId(newNode.id);
            return;
        }
    }
    setNodes([...nodes, newNode]);
    setSelectedNodeId(newNode.id);
  };

  const handleDropNode = (dragData: any, targetId: string | null, position: 'before' | 'after' | 'append') => {
      if (dragData.id === targetId) return;

      let newNodes = [...nodes];
      let nodeToInsert: FlowNode;
      
      if (dragData.source === 'sidebar') {
          nodeToInsert = createNode(dragData.type);
      } else if (dragData.source === 'canvas') {
          const existingIndex = newNodes.findIndex(n => n.id === dragData.id);
          if (existingIndex === -1) return; 
          [nodeToInsert] = newNodes.splice(existingIndex, 1);
      } else {
          return;
      }

      if (position === 'append' || !targetId) {
          newNodes.push(nodeToInsert);
      } else {
          const targetIndex = newNodes.findIndex(n => n.id === targetId);
          if (targetIndex !== -1) {
              const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
              newNodes.splice(insertIndex, 0, nodeToInsert);
          } else {
              newNodes.push(nodeToInsert);
          }
      }

      setNodes(newNodes);
      if (dragData.source === 'sidebar') setSelectedNodeId(nodeToInsert.id);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-white text-gray-900 font-sans relative">
      
      {/* 1. Top Navigation */}
      <header className="h-16 border-b border-gray-200 flex items-center justify-between px-6 bg-white z-20 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-indigo-200 shadow-md">
                F
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-800">
                FlowDay <span className="font-normal text-gray-400 text-sm ml-2 hidden sm:inline-block">| 概念原型</span>
            </h1>
        </div>
        
        {/* CENTER: Layout Switcher */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg relative" ref={menuRef}>
            
            {/* Trigger Button */}
            <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-sm font-medium text-gray-700 min-w-[180px] group"
            >
                <LayoutIcon size={16} className="text-gray-500 group-hover:text-indigo-600 transition-colors" />
                <span className="flex-1 text-left truncate">
                    {layouts.find(l => l.id === activeLayoutId)?.name || '选择布局'}
                </span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Divider */}
            <div className="w-px h-4 bg-gray-300 mx-1"></div>

            {/* Add Button */}
            <button 
                onClick={handleCreateLayout}
                className="p-1.5 rounded-md text-gray-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all active:scale-95"
                title="新建布局"
            >
                <Plus size={16} />
            </button>

            {/* Custom Dropdown Menu */}
            {isMenuOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 flex flex-col animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                    <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 mb-1">
                        切换布局
                    </div>
                    {layouts.map(l => (
                        <button
                            key={l.id}
                            onClick={() => {
                                handleSwitchLayout(l.id);
                                setIsMenuOpen(false);
                            }}
                            className={`
                                w-full text-left px-4 py-3 text-sm flex items-center gap-3 transition-colors relative
                                ${l.id === activeLayoutId ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}
                            `}
                        >
                            <span className="flex-1 truncate">{l.name}</span>
                            {l.id === activeLayoutId && <Check size={16} className="text-indigo-600" />}
                            {l.id === activeLayoutId && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600" />}
                        </button>
                    ))}
                    <div className="border-t border-gray-50 mt-1 pt-1">
                         <button
                            onClick={() => {
                                handleCreateLayout();
                                setIsMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-3 text-sm flex items-center gap-3 text-gray-500 hover:text-indigo-600 hover:bg-gray-50 transition-colors"
                        >
                            <Plus size={16} />
                            <span>新建布局...</span>
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* RIGHT: Actions */}
        <div className="flex items-center gap-3">
            
            {/* Auto Save Status Indicator */}
            <div className="flex flex-col items-end mr-2">
                <button 
                    onClick={handleManualSave}
                    disabled={saveStatus === 'saving'}
                    className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${saveStatus === 'unsaved' ? 'text-amber-500' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    {saveStatus === 'saving' ? (
                        <>
                           <div className="w-2.5 h-2.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                           <span>正在保存...</span>
                        </>
                    ) : saveStatus === 'unsaved' ? (
                        <>
                            <Cloud size={14} />
                            <span>未保存</span>
                        </>
                    ) : (
                        <>
                            <Check size={14} className="text-green-500" />
                            <span>已自动保存</span>
                        </>
                    )}
                </button>
                {lastSavedTime && saveStatus === 'saved' && (
                    <span className="text-[10px] text-gray-300">
                        {lastSavedTime}
                    </span>
                )}
            </div>

            <div className="h-6 w-px bg-gray-200 mx-1"></div>

            <button 
                onClick={handleResetData}
                className="text-gray-400 hover:text-red-500 transition-colors p-2"
                title="重置所有数据"
            >
                <RotateCcw size={18} />
            </button>
            <button className="text-gray-400 hover:text-indigo-600 transition-colors p-2">
                <Share2 size={18} />
            </button>
        </div>
      </header>

      {/* 2. Main Workspace */}
      <main className="flex-1 flex overflow-hidden">
        <Sidebar onAddNode={handleAddNode} />
        <FlowCanvas 
            nodes={nodes} 
            selectedId={selectedNodeId} 
            onSelect={setSelectedNodeId}
            onDropNode={handleDropNode}
            onDeleteNode={handleDeleteNode}
            onUpdateNode={handleUpdateNode}
        />
        {selectedNodeId && (
            <PropertiesPanel 
                selectedNodeId={selectedNodeId}
                nodes={nodes}
                onUpdateNode={handleUpdateNode}
                onDeleteNode={handleDeleteNode}
                onClose={() => setSelectedNodeId(null)}
            />
        )}
      </main>

      {/* Floating Deletion Bubble */}
      {deleteConfirmId && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs font-medium px-4 py-2 rounded-full shadow-xl z-[60] animate-in fade-in slide-in-from-top-2 pointer-events-none flex items-center gap-2">
            <span>再按一次 <kbd className="bg-gray-600 px-1 rounded font-mono">Backspace</kbd> 以删除节点</span>
        </div>
      )}

    </div>
  );
}
