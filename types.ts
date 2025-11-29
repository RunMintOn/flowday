import { LucideIcon } from 'lucide-react';

export type NodeType = 'time' | 'task' | 'place' | 'branch' | 'block';

export interface BaseNode {
  id: string;
  type: NodeType;
  title: string;
  subtitle?: string;
  duration?: string; // e.g., "30 mins"
  icon?: string; // icon name key
  color?: string; // Tailwind color class stub (e.g., 'rose', 'teal')
  isDashedConnection?: boolean; // For the commute line
}

export interface SingleNode extends BaseNode {
  type: 'time' | 'task' | 'place';
}

export interface BlockNode extends BaseNode {
  type: 'block';
  sideEvents: SingleNode[]; // Events happening during this block (displayed on the right)
  customWidth?: number;
  customHeight?: number;
}

export interface BranchNode extends BaseNode {
  type: 'branch';
  branches: SingleNode[]; // Array of nodes to show in parallel
}

export type FlowNode = SingleNode | BranchNode | BlockNode;

export interface NodeStyleConfig {
  bgColor: string;
  borderColor: string;
  textColor: string;
  shapeClass: string;
}