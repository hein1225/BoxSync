import { HardDrive, Folder, FileText, Image, Music, Video } from 'lucide-react';
import FileTree from '@/components/FileTree';
import type { FileTreeNode } from '@/types';

const fileTreeData: FileTreeNode[] = [
  {
    id: '1',
    name: 'boxsync',
    type: 'folder',
    color: 'blue',
    children: [
      {
        id: '2',
        name: 'users',
        type: 'folder',
        color: 'green',
        children: [
          {
            id: '3',
            name: 'admin',
            type: 'folder',
            color: 'purple',
            children: [
              { id: '4', name: 'settings.json', type: 'file', color: 'yellow' },
              { id: '5', name: 'profile.dat', type: 'file', color: 'cyan' },
            ],
          },
          {
            id: '6',
            name: 'user1',
            type: 'folder',
            color: 'purple',
            children: [
              { id: '7', name: 'data.json', type: 'file', color: 'yellow' },
              { id: '8', name: 'backup.zip', type: 'file', color: 'red' },
            ],
          },
        ],
      },
      {
        id: '9',
        name: 'system',
        type: 'folder',
        color: 'orange',
        children: [
          { id: '10', name: 'config.ini', type: 'file', color: 'cyan' },
          { id: '11', name: 'logs.txt', type: 'file', color: 'green' },
        ],
      },
      { id: '12', name: 'README.md', type: 'file', color: 'blue' },
    ],
  },
];

const fileStats = [
  { label: '总文件数', value: '1,234', icon: FileText, color: '#60a5fa' },
  { label: '文件夹', value: '56', icon: Folder, color: '#34d399' },
  { label: '图片', value: '320', icon: Image, color: '#a78bfa' },
  { label: '音视频', value: '89', icon: Video, color: '#f87171' },
];

export default function Files() {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
        文件管理
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {fileStats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${stat.color}20` }}
            >
              <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{stat.label}</p>
              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* File Tree */}
      <div
        className="rounded-2xl p-6"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <HardDrive className="w-5 h-5" style={{ color: 'var(--accent-purple-light)' }} />
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            文件目录
          </h2>
        </div>
        <FileTree data={fileTreeData} />
      </div>
    </div>
  );
}
