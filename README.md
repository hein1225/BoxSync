# BoxSync 云同步轻服务器

BoxSync 是一款专为个人开发者和小型团队设计的轻量级云同步服务器。基于 Redis 高性能存储，支持多应用数据分区隔离，提供简洁的管理后台，让数据同步变得简单可靠。

> **部署模式说明：**
> - **本地开发**：无 Redis 时自动降级到内存模式（数据重启后丢失，仅用于测试）
> - **Docker 部署**：强制要求 Redis 连接，确保数据持久化

## 功能特性

- **多用户管理**：支持管理员创建用户或开启自助注册
- **多应用分区**：一个账户可为不同软件创建独立的同步数据分区
- **Redis 高性能存储**：用户同步数据存储在 Redis，读写速度快；本地开发无 Redis 时自动降级到内存模式
- **管理后台**：暗黑主题管理界面，支持概览、用户、存储、日志、设置等模块
- **数据备份导出**：支持 JSON 格式配置导出，方便 Docker 部署时持久化
- **安全认证**：首次登录强制修改默认凭据，支持强制认证开关
- **Docker 一键部署**：支持 Docker Compose 快速部署

## 技术栈

- **前端**：React 18 + TypeScript + Vite + Tailwind CSS + Zustand
- **后端**：Node.js + Express + TypeScript
- **数据存储**：Redis（生产/Docker 环境）/ 内存模式（仅本地开发测试）
- **认证**：JWT Token

## 快速开始

### 环境要求

- Node.js 18+（本地开发）
- Redis 6.0+（生产环境，可选）
- Docker & Docker Compose（推荐部署方式）

### 本地开发

```bash
# 克隆项目
git clone <repository-url>
cd BoxSync

# 安装依赖
npm install

# 启动后端服务（端口 9390，无 Redis 时自动使用内存模式）
npm run build:server
node dist/server/index.js

# 另开终端，启动前端开发服务器
npm run dev
```

前端开发服务器启动后，访问 `http://localhost:5173/`

默认管理员账户：
- 用户名：`admin`
- 密码：`admin123`

首次登录后会提示修改默认凭据。

### Docker 部署

#### 方式一：Docker Compose（推荐）

项目已包含 `docker-compose.yml`，直接启动即可：

```bash
docker-compose up -d
```

或手动配置：

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: boxsync-redis
    restart: unless-stopped
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3
    networks:
      - boxsync-network

  boxsync:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: boxsync-server
    restart: unless-stopped
    ports:
      - "9390:9390"
    environment:
      - REDIS_URL=redis://redis:6379
      - SERVER_PORT=9390
      - DOCKER_CONTAINER=true
      # IMPORTANT: 生产环境必须修改 JWT_SECRET！
      # 生成命令：openssl rand -base64 32
      - JWT_SECRET=boxsync-secret-key-change-in-production
    depends_on:
      redis:
        condition: service_healthy
    networks:
      - boxsync-network

volumes:
  redis-data:
    driver: local

networks:
  boxsync-network:
    driver: bridge
```

访问：`http://your-server-ip:9390/`

#### 方式二：使用预构建镜像

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: boxsync-redis
    restart: unless-stopped
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  boxsync:
    image: hyc5069/boxsync:latest
    container_name: boxsync
    ports:
      - "9390:9390"
    environment:
      - REDIS_URL=redis://redis:6379
      - SERVER_PORT=9390
      - DOCKER_CONTAINER=true
      - JWT_SECRET=boxsync-secret-key-change-in-production
    depends_on:
      redis:
        condition: service_healthy
    restart: unless-stopped

volumes:
  redis-data:
```

#### 方式三：Host 网络模式

适用于 NAS 等需要直接使用宿主机网络的场景：

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: boxsync-redis
    network_mode: host
    volumes:
      - ./redis-data:/data
    restart: unless-stopped

  boxsync:
    image: hyc5069/boxsync:latest
    container_name: boxsync
    network_mode: host
    environment:
      - REDIS_URL=redis://localhost:6379
      - SERVER_PORT=9390
      - DOCKER_CONTAINER=true
      - JWT_SECRET=boxsync-secret-key-change-in-production
    depends_on:
      - redis
    restart: unless-stopped
```

> **Host 模式注意事项：**
> - `ports` 映射在 host 模式下不生效
> - 服务直接使用宿主机的 9390 端口
> - Redis 连接地址需改为 `redis://localhost:6379`
> - 部分 NAS 的 Docker 套件可能不支持 host 模式，请使用 Bridge 模式

## 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `REDIS_URL` | Redis 连接地址 | `redis://localhost:6379` |
| `SERVER_PORT` | 服务端口 | `9390` |
| `JWT_SECRET` | JWT 签名密钥（生产环境必须修改） | `boxsync-secret-key-change-in-production` |

> **注意：** 管理员初始用户名为 `admin`，密码为 `admin123`。首次登录后系统会强制提示修改密码，以确保安全性。

### 客户端软件连接原则

第三方客户端软件连接 BoxSync 时，**只需输入服务器基础地址**，API 路径由软件内部自动拼接：

| 场景 | 输入地址 |
|------|----------|
| 本地开发 | `http://localhost:9390` |
| Docker 部署 | `http://<服务器IP>:9390` |

**客户端软件内部应拼接的 API 路径：**
- 登录：`POST /api/auth/login`
- 数据写入：`POST /api/sync/write`
- 数据读取：`GET /api/sync/read`
- 批量同步：`POST /api/sync/batch`

> **示例：** 用户在软件中输入 `http://192.168.1.100:9390`，软件内部调用登录接口时应拼接为 `http://192.168.1.100:9390/api/auth/login`

### 管理后台设置

访问 `/admin/settings` 可配置：

- 服务器名称与端口
- 日志保留策略与自动清理
- 用户数量与数据上限限制
- 强制认证开关
- 用户注册开关（开启后显示注册链接）

## 数据存储架构

```
┌─────────────────────────────────────────────────────────┐
│                    BoxSync Server                        │
├─────────────────────────────────────────────────────────┤
│  Redis / MemoryDB (用户同步数据)                         │
│  ─────────────────────────────                          │
│  • 管理员账户              │    • 用户同步数据            │
│  • 服务器设置              │    • 应用分区数据            │
│  • 用户列表                │    • 会话信息                │
│  • 日志记录                │    • 操作日志                │
└─────────────────────────────────────────────────────────┘
```

### Redis Key 设计

```
boxsync:admin                          # 管理员账户信息
boxsync:users                          # 普通用户列表（Hash）
boxsync:partitions                     # 用户存储分区（Hash）
boxsync:settings                       # 服务器设置
boxsync:logs                           # 操作日志（List）
boxsync:session:{token}                # 会话信息
boxsync:data:{userId}:{appId}:{key}    # 用户应用数据
boxsync:data:{userId}:{appId}:_meta    # 应用元数据
```

## API 接口文档

### 基础信息

- **Base URL**: `http://your-server:9390`
- **认证方式**: Bearer Token（请求头 `Authorization: Bearer {token}`）

### 认证接口

#### 登录

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

响应：

```json
{
  "success": true,
  "token": "jwt-token-string",
  "userId": "admin",
  "username": "admin",
  "role": "admin",
  "isDefault": true
}
```

#### 注册（需开启允许注册）

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "newuser",
  "password": "password123"
}
```

响应：

```json
{
  "success": true,
  "message": "User registered successfully",
  "userId": "user-xxx",
  "username": "newuser"
}
```

#### 修改管理员凭据

```http
POST /api/auth/update-credentials
Content-Type: application/json

{
  "username": "newadmin",
  "password": "newpassword123"
}
```

### 用户管理接口（管理员）

#### 获取用户列表

```http
GET /api/users
Authorization: Bearer {token}
```

响应：

```json
{
  "success": true,
  "users": [
    {
      "userId": "admin",
      "username": "admin",
      "role": "admin",
      "status": "active",
      "createdAt": 1717000000000,
      "updatedAt": 1717000000000
    }
  ]
}
```

#### 创建用户

```http
POST /api/users
Authorization: Bearer {token}
Content-Type: application/json

{
  "username": "user1",
  "password": "password123",
  "role": "user"
}
```

#### 更新用户

```http
PUT /api/users/{userId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "username": "newname",
  "role": "user",
  "status": "active"
}
```

#### 切换用户状态

```http
PATCH /api/users/{userId}/status
Authorization: Bearer {token}
```

#### 删除用户

```http
DELETE /api/users/{userId}
Authorization: Bearer {token}
```

### 数据同步接口

BoxSync 提供完整的数据同步接口，支持单条/批量上传、下载、对比同步等功能。

#### 接口清单

| 接口 | 方法 | 功能说明 |
|------|------|----------|
| `POST /api/sync/write` | 上传数据 | 单条数据写入 |
| `POST /api/sync/batch` | 批量上传 | 多条数据批量写入 |
| `GET /api/sync/read` | 下载数据 | 读取单条数据 |
| `GET /api/sync/changes` | 对比同步 | 获取指定时间后的变更数据 |
| `DELETE /api/sync/delete` | 删除数据 | 删除指定数据 |
| `GET /api/sync/apps` | 应用列表 | 获取用户的应用分区列表 |
| `POST /api/sync/apps` | 创建应用 | 创建新的应用分区 |
| `GET /api/sync/admin/stats` | 存储统计 | 管理员获取所有用户存储统计 |

#### 写入数据（上传）

```http
POST /api/sync/write
Authorization: Bearer {token}
Content-Type: application/json

{
  "appId": "myapp",
  "key": "settings.theme",
  "value": "dark",
  "timestamp": 1717000000000
}
```

响应：

```json
{
  "success": true,
  "message": "Data written successfully",
  "key": "settings.theme",
  "timestamp": 1717000000000,
  "version": 1717000000000
}
```

#### 读取数据（下载）

```http
GET /api/sync/read?appId=myapp&key=settings.theme
Authorization: Bearer {token}
```

响应：

```json
{
  "success": true,
  "value": "dark",
  "timestamp": 1717000000000,
  "version": 1717000000000,
  "key": "settings.theme"
}
```

#### 批量同步（批量上传）

```http
POST /api/sync/batch
Authorization: Bearer {token}
Content-Type: application/json

{
  "appId": "myapp",
  "changes": [
    {"key": "a", "value": "1", "timestamp": 1717000000000},
    {"key": "b", "value": "2", "timestamp": 1717000000001}
  ]
}
```

响应：

```json
{
  "success": true,
  "message": "Batch sync completed",
  "results": [
    {"key": "a", "timestamp": 1717000000000, "version": 1717000000000},
    {"key": "b", "timestamp": 1717000000001, "version": 1717000000001}
  ]
}
```

#### 获取变更列表（对比同步）

获取指定时间戳之后的所有变更数据，用于增量同步。

```http
GET /api/sync/changes?appId=myapp&since=1717000000000
Authorization: Bearer {token}
```

参数说明：
- `appId` - 应用ID（必填）
- `since` - 时间戳（可选，默认为0，返回所有数据）

响应：

```json
{
  "success": true,
  "changes": [
    {"key": "a", "value": "1", "timestamp": 1717000000000, "version": 1717000000000}
  ],
  "timestamp": 1717000001000
}
```

**客户端同步流程示例：**

```javascript
// 1. 首次同步（全量下载）
const res = await fetch('/api/sync/changes?appId=myapp&since=0');

// 2. 增量同步（对比下载）
const lastSyncTime = localStorage.getItem('lastSyncTime');
const res = await fetch(`/api/sync/changes?appId=myapp&since=${lastSyncTime}`);

// 3. 保存上次同步时间
localStorage.setItem('lastSyncTime', Date.now());
```

#### 删除数据

```http
DELETE /api/sync/delete?appId=myapp&key=settings.theme
Authorization: Bearer {token}
```

### 应用分区管理

#### 创建应用分区

```http
POST /api/sync/apps
Authorization: Bearer {token}
Content-Type: application/json

{
  "appId": "myapp",
  "appName": "My Application"
}
```

#### 列出应用分区

```http
GET /api/sync/apps
Authorization: Bearer {token}
```

响应：

```json
{
  "success": true,
  "apps": [
    {"appId": "myapp", "appName": "My Application", "keyCount": 15, "lastSyncTime": 1717000000000}
  ]
}
```

### 日志接口（管理员）

#### 获取日志

```http
GET /api/logs?type=sync&limit=100&offset=0
Authorization: Bearer {token}
```

#### 添加日志

```http
POST /api/logs
Authorization: Bearer {token}
Content-Type: application/json

{
  "type": "sync",
  "action": "write",
  "detail": "Synced 5 keys",
  "success": true,
  "device": "Chrome 120"
}
```

#### 清空日志

```http
DELETE /api/logs
Authorization: Bearer {token}
```

### 设置接口

#### 获取设置

```http
GET /api/settings
Authorization: Bearer {token}
```

#### 更新设置（管理员）

```http
PUT /api/settings
Authorization: Bearer {token}
Content-Type: application/json

{
  "serverName": "My BoxSync",
  "allowRegistration": true,
  "maxUsers": 50
}
```

#### 重置设置（管理员）

```http
POST /api/settings/reset
Authorization: Bearer {token}
```

#### 导出配置（管理员）

```http
GET /api/settings/export
Authorization: Bearer {token}
```

#### 导入配置（管理员）

```http
POST /api/settings/import
Authorization: Bearer {token}
Content-Type: application/json

{
  "settings": {...},
  "users": [...]
}
```

### 健康检查

```http
GET /api/health
```

响应：

```json
{
  "success": true,
  "status": "healthy",
  "redis": {
    "connected": true,
    "latency": "0ms",
    "url": "redis://localhost:6379",
    "mode": "memory"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 客户端开发指南

### 设计要点

1. **本地优先**：客户端应优先使用本地缓存，后台同步到服务器
2. **增量同步**：只传输变更数据，减少网络开销
3. **冲突解决**：基于时间戳的 Last-Write-Wins 策略
4. **离线支持**：支持离线操作，恢复网络后自动同步
5. **多设备**：同一账户可在多台设备上同步数据

### 推荐同步流程

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  本地数据  │ ←→ │  变更检测  │ ←→ │  云端同步  │
└──────────┘     └──────────┘     └──────────┘
     ↑                                  ↑
     └────────── 冲突解决 ←─────────────┘
```

### 示例代码（JavaScript）

```javascript
class BoxSyncClient {
  constructor(serverUrl, token) {
    this.serverUrl = serverUrl;
    this.token = token;
    this.localCache = new Map();
  }

  async sync(appId, changes) {
    // 1. 获取云端变更
    const serverChanges = await this.fetchChanges(appId);

    // 2. 合并变更（本地优先或时间戳优先）
    const merged = this.mergeChanges(changes, serverChanges);

    // 3. 上传本地变更
    await this.uploadChanges(appId, merged.local);

    // 4. 应用云端变更到本地
    this.applyChanges(merged.remote);

    return merged;
  }

  async fetchChanges(appId) {
    const response = await fetch(
      `${this.serverUrl}/api/sync/changes?appId=${appId}`,
      { headers: { 'Authorization': `Bearer ${this.token}` } }
    );
    return response.json();
  }

  async uploadChanges(appId, changes) {
    await fetch(`${this.serverUrl}/api/sync/batch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ appId, changes })
    });
  }
}
```

## 项目结构

```
BoxSync/
├── src/                    # 前端源码
│   ├── components/         # 通用组件
│   ├── pages/              # 页面组件
│   ├── stores/             # 状态管理 (Zustand)
│   ├── types/              # TypeScript 类型定义
│   ├── App.tsx             # 主应用
│   └── main.tsx            # 入口文件
├── server/                 # 后端源码
│   ├── routes/             # API 路由
│   │   ├── auth.ts         # 认证接口
│   │   ├── users.ts        # 用户管理
│   │   ├── sync.ts         # 数据同步
│   │   ├── logs.ts         # 日志管理
│   │   ├── settings.ts     # 服务器设置
│   │   └── health.ts       # 健康检查
│   ├── middleware/         # 中间件
│   │   ├── auth.ts         # JWT 认证
│   │   └── error.ts        # 错误处理
│   ├── db.ts               # Redis / 内存存储
│   └── index.ts            # 入口文件
├── public/                 # 静态资源
├── Dockerfile              # Docker 镜像构建
├── docker-compose.yml      # Docker Compose 配置
├── vite.config.ts          # Vite 配置
├── package.json            # 项目依赖
└── README.md               # 项目说明
```

## License

MIT License
