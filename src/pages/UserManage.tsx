import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, UserCheck, UserX, Database } from 'lucide-react';
import { useUserStore } from '@/stores/userStore';
import { useUserPartitionsStore } from '@/stores/userPartitionsStore';
import type { User } from '@/types';

export default function UserManage() {
  const { users, fetchUsers, addUser, updateUser, deleteUser, toggleStatus, loading } = useUserStore();
  const { createPartition, deletePartition, getPartitionByUserId } = useUserPartitionsStore();
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', role: 'user' as 'admin' | 'user' });

  // Load users on mount
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const adminCount = users.filter((u) => u.role === 'admin' || u.role === 'owner').length;
  const ownerCount = users.filter((u) => u.role === 'owner').length;

  const isLastAdmin = (user: User) => (user.role === 'admin' || user.role === 'owner') && adminCount <= 1;
  const isOwner = (user: User) => user.role === 'owner';

  const handleCreate = () => {
    setEditingUser(null);
    setShowPasswordField(true);
    setFormData({ username: '', password: '', role: 'user' });
    setShowModal(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setShowPasswordField(false);
    // 站长角色不能通过表单编辑，如果是站长则默认为 admin（实际上后端会拒绝）
    setFormData({ username: user.username, password: '', role: user.role === 'owner' ? 'admin' : user.role });
    setShowModal(true);
  };

  const handleToggleStatus = async (userId: string) => {
    const user = users.find((u) => u.userId === userId);
    if (user?.role === 'owner') {
      alert('不能禁用站长账户');
      return;
    }
    if (user?.role === 'admin' && adminCount <= 1) {
      alert('不能禁用唯一的管理员账户');
      return;
    }
    await toggleStatus(userId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      await updateUser(editingUser.userId, {
        username: formData.username,
        role: formData.role,
      });
      if (formData.password) {
        console.log('Password update for user:', editingUser.userId);
      }
    } else {
      const success = await addUser({
        username: formData.username,
        password: formData.password,
        role: formData.role,
      });
      if (success) {
        // Auto-create storage partition for new user
        await createPartition(`user-${Date.now()}`, formData.username);
      }
    }
    setShowModal(false);
  };

  const handleDeleteUser = async (userId: string) => {
    const user = users.find((u) => u.userId === userId);
    if (user?.role === 'owner') {
      alert('不能删除站长账户');
      return;
    }
    if (user?.role === 'admin' && adminCount <= 1) {
      alert('不能删除唯一的管理员账户');
      return;
    }
    if (confirm('确定要删除该用户吗？此操作将同时删除该用户的所有存储数据，不可恢复。')) {
      await deleteUser(userId);
      deletePartition(userId);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          用户管理
        </h1>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-all duration-200 hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-purple-light) 100%)',
          }}
        >
          <Plus className="w-4 h-4" />
          创建用户
        </button>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
        }}
      >
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <th className="text-left px-6 py-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                用户名
              </th>
              <th className="text-left px-6 py-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                角色
              </th>
              <th className="text-left px-6 py-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                状态
              </th>
              <th className="text-left px-6 py-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                创建时间
              </th>
              <th className="text-right px-6 py-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.userId}
                className="transition-colors duration-150 hover:bg-white/5"
                style={{ borderBottom: '1px solid var(--border-color)' }}
              >
                <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-primary)' }}>
                  {user.username}
                </td>
                <td className="px-6 py-4">
                  <span
                    className="text-xs px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: user.role === 'owner' ? 'rgba(245, 158, 11, 0.2)' : user.role === 'admin' ? 'rgba(124, 58, 237, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                      color: user.role === 'owner' ? 'var(--accent-orange)' : user.role === 'admin' ? 'var(--accent-purple-light)' : 'var(--accent-green)',
                    }}
                  >
                    {user.role === 'owner' ? '站长' : user.role === 'admin' ? '管理员' : '普通用户'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className="text-xs px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: user.status === 'active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: user.status === 'active' ? 'var(--accent-green)' : 'var(--accent-red)',
                    }}
                  >
                    {user.status === 'active' ? '正常' : '已禁用'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    {!isOwner(user) && !isLastAdmin(user) && (
                      <button
                        onClick={() => handleToggleStatus(user.userId)}
                        className="p-2 rounded-lg transition-all duration-150"
                        style={{ color: 'var(--text-secondary)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                          e.currentTarget.style.color = 'var(--accent-green)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }}
                        title={user.status === 'active' ? '禁用' : '启用'}
                      >
                        {user.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(user)}
                      className="p-2 rounded-lg transition-all duration-150"
                      style={{ color: 'var(--text-secondary)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                        e.currentTarget.style.color = 'var(--accent-purple-light)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }}
                      title="编辑"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        const partition = getPartitionByUserId(user.userId);
                        if (partition && partition.appPartitions.length > 0) {
                          alert(`该用户已创建 ${partition.appPartitions.length} 个应用存储分区`);
                        } else {
                          alert('该用户暂无存储分区');
                        }
                      }}
                      className="p-2 rounded-lg transition-all duration-150"
                      style={{ color: 'var(--text-secondary)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                        e.currentTarget.style.color = 'var(--accent-purple-light)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }}
                      title="查看存储分区"
                    >
                      <Database className="w-4 h-4" />
                    </button>
                    {!isOwner(user) && !isLastAdmin(user) && (
                      <button
                        onClick={() => handleDeleteUser(user.userId)}
                        className="p-2 rounded-lg transition-all duration-150"
                        style={{ color: 'var(--text-secondary)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                          e.currentTarget.style.color = 'var(--accent-red)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }}
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="w-full max-w-md p-6 rounded-2xl animate-fade-in"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
            }}
          >
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              {editingUser ? '编辑用户' : '创建用户'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                  用户名
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl outline-none"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                  }}
                  required
                />
              </div>
              {showPasswordField && (
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                    {editingUser ? '新密码' : '密码'}
                    {editingUser && (
                      <span className="text-xs ml-2" style={{ color: 'var(--text-secondary)' }}>
                        (留空则不修改)
                      </span>
                    )}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl outline-none"
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                    }}
                    required={!editingUser}
                  />
                </div>
              )}
              {editingUser && !showPasswordField && (
                <button
                  type="button"
                  onClick={() => setShowPasswordField(true)}
                  className="text-sm transition-all duration-200 hover:opacity-80"
                  style={{ color: 'var(--accent-purple-light)' }}
                >
                  + 修改密码
                </button>
              )}
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                  角色
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
                  className="w-full px-4 py-2.5 rounded-xl outline-none"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <option value="user">普通用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:opacity-90"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-purple-light) 100%)',
                  }}
                >
                  {editingUser ? '保存' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
