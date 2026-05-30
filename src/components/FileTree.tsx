import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, File } from 'lucide-react';
import type { FileTreeNode } from '@/types';

interface FileTreeProps {
  data: FileTreeNode[];
}

function TreeNode({ node, depth = 0 }: { node: FileTreeNode; depth?: number }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  const getColorStyle = (color?: string) => {
    switch (color) {
      case 'blue':
        return { color: '#60a5fa' };
      case 'green':
        return { color: '#34d399' };
      case 'purple':
        return { color: '#a78bfa' };
      case 'orange':
        return { color: '#fb923c' };
      case 'red':
        return { color: '#f87171' };
      case 'yellow':
        return { color: '#facc15' };
      case 'cyan':
        return { color: '#22d3ee' };
      default:
        return { color: 'var(--text-secondary)' };
    }
  };

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer transition-all duration-150 hover:bg-white/5"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />
          ) : (
            <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />
          )
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        {node.type === 'folder' ? (
          <Folder className="w-4 h-4 flex-shrink-0" style={getColorStyle(node.color)} />
        ) : (
          <File className="w-4 h-4 flex-shrink-0" style={getColorStyle(node.color)} />
        )}

        <span className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
          {node.name}
        </span>
      </div>

      {hasChildren && expanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileTree({ data }: FileTreeProps) {
  return (
    <div className="overflow-y-auto" style={{ maxHeight: '500px' }}>
      {data.map((node) => (
        <TreeNode key={node.id} node={node} />
      ))}
    </div>
  );
}
