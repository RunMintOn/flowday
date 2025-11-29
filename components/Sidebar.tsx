import React from 'react';
import { Clock, CheckSquare, MapPin, Plus, GitFork, Hourglass } from 'lucide-react';

interface SidebarProps {
  onAddNode: (type: 'time' | 'task' | 'place' | 'branch' | 'block') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onAddNode }) => {
  
  const handleDragStart = (e: React.DragEvent, type: string) => {
    // Set data for the drop operation
    e.dataTransfer.setData('application/reactflow', JSON.stringify({ source: 'sidebar', type }));
    // Allow both copy and move to ensure compatibility with different drop zone configurations
    e.dataTransfer.effectAllowed = 'all';
  };

  return (
    <div className="w-20 bg-white border-r border-gray-200 flex flex-col items-center py-6 gap-6 z-10 shadow-sm shrink-0">
      
      {/* Tool: Time */}
      <div 
        className="group flex flex-col items-center gap-1.5 cursor-grab active:cursor-grabbing" 
        onClick={() => onAddNode('time')}
        draggable
        onDragStart={(e) => handleDragStart(e, 'time')}
      >
        <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md transition-transform group-hover:scale-110">
          <Clock size={20} />
        </div>
        <span className="text-[10px] text-gray-500 font-medium group-hover:text-rose-600 transition-colors">时间</span>
      </div>

      {/* Tool: Task */}
      <div 
        className="group flex flex-col items-center gap-1.5 cursor-grab active:cursor-grabbing" 
        onClick={() => onAddNode('task')}
        draggable
        onDragStart={(e) => handleDragStart(e, 'task')}
      >
        <div className="w-10 h-10 rounded-lg bg-teal-400 text-white flex items-center justify-center shadow-md transition-transform group-hover:scale-110">
          <CheckSquare size={20} />
        </div>
        <span className="text-[10px] text-gray-500 font-medium group-hover:text-teal-600 transition-colors">任务</span>
      </div>

      {/* Tool: Place */}
      <div 
        className="group flex flex-col items-center gap-1.5 cursor-grab active:cursor-grabbing" 
        onClick={() => onAddNode('place')}
        draggable
        onDragStart={(e) => handleDragStart(e, 'place')}
      >
        <div className="w-10 h-10 bg-yellow-400 text-white flex items-center justify-center shadow-md transform rotate-45 transition-transform group-hover:rotate-0 group-hover:rounded-lg">
          <MapPin size={20} className="transform -rotate-45 group-hover:rotate-0 transition-transform" />
        </div>
        <span className="text-[10px] text-gray-500 font-medium mt-1 group-hover:text-yellow-600 transition-colors">地点</span>
      </div>

      {/* Tool: Branch */}
      <div 
        className="group flex flex-col items-center gap-1.5 cursor-grab active:cursor-grabbing" 
        onClick={() => onAddNode('branch')}
        draggable
        onDragStart={(e) => handleDragStart(e, 'branch')}
      >
        <div className="w-10 h-10 rounded-lg bg-indigo-500 text-white flex items-center justify-center shadow-md transition-transform group-hover:scale-110">
          <GitFork size={20} />
        </div>
        <span className="text-[10px] text-gray-500 font-medium group-hover:text-indigo-600 transition-colors">并行</span>
      </div>

      {/* Tool: Time Block (New) */}
      <div 
        className="group flex flex-col items-center gap-1.5 cursor-grab active:cursor-grabbing" 
        onClick={() => onAddNode('block')}
        draggable
        onDragStart={(e) => handleDragStart(e, 'block')}
      >
        <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-md transition-transform group-hover:scale-110 border-2 border-violet-400">
          <Hourglass size={20} />
        </div>
        <span className="text-[10px] text-gray-500 font-medium group-hover:text-violet-600 transition-colors">时间段</span>
      </div>
      
      <div className="flex-grow"></div>
      
      <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 cursor-default mb-4" title="点击上方图标添加或拖拽到画布">
        <Plus size={20} />
      </div>

    </div>
  );
};