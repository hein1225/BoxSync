# BoxSync 云同步轻服务器

BoxSync 是一款专为个人开发者和小型团队设计的轻量级云同步服务器。基于 Redis 高性能存储，支持多应用数据分区隔离，提供简洁的管理后台，让数据同步变得简单可靠。

## 功能特性

- **多用户管理**：支持管理员创建用户或开启自助注册
- **多应用分区**：一个账户可为不同软件创建独立的同步数据分区
- **Redis 高性能存储**：用户同步数据存储在 Redis，读写速度快
- **本地持久化配置**：服务器设置、管理员账户通过本地存储持久化
- **管理后台**：暗黑主题管理界面，支持概览、用户、存储、日志、备份、设置等模块
- **数据备份导出**：支持 JSON 格式配置导出，方便 Docker 部署时持久化
- **安全认证**：首次登录强制修改默认凭据，支持强制认证开关

## 技术栈

- **前端**：React 18 + TypeScript + Vite + Tailwind CSS + Zustand
- **后端存储**：Redis（用户同步数据）
- **持久化**：localStorage（服务器设置、管理员账户）

## 快速开始

### 环境要求

- Node.js 18+
- Redis 6.0+（生产环境）
- Docker & Docker Compose（推荐部署方式）

### 本地开发

```bash
# 克隆项目
git clone <repository-url>
cd BoxSync

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

开发服务器启动后，访问 `http://localhost:5173/admin/login`

默认管理员账户：
- 用户名：`admin`
- 密码：`admin123`

首次登录后会提示修改默认凭据。

### Docker 部署

#### 方式一：NAS 本地上传部署（以飞牛 NAS 为例）

适用于群晖、飞牛、威联通等支持 Docker 的 NAS 设备。

**步骤 1：准备部署文件**

在本地电脑创建以下两个文件：

**`docker-compose.yml`**

```yaml
version: '3.8'

services:
  boxsync:
    image: boxsync:latest
    container_name: boxsync
    ports:
      - "9390:9390"
    environment:
      - REDIS_URL=redis://redis:6379
      - SERVER_PORT=9390
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=admin123
    volumes:
      - ./config:/app/config
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: boxsync-redis
    volumes:
      - redis-data:/data
    restart: unless-stopped

volumes:
  redis-data:
```

**`Dockerfile`**（如需自定义构建）

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 9390
CMD ["node", "dist/server.js"]
```

**步骤 2：上传文件到 NAS**

1. 登录飞牛 NAS 管理界面
2. 打开文件管理器，进入 Docker 共享文件夹（如 `/docker/boxsync`）
3. 上传 `docker-compose.yml` 文件到该目录

**步骤 3：通过 SSH 或终端部署**

```bash
# SSH 登录到 NAS
ssh admin@your-nas-ip

# 进入项目目录
cd /docker/boxsync

# 启动服务
docker-compose up -d

# 查看运行状态
docker-compose ps

# 查看日志
docker-compose logs -f boxsync
```

**步骤 4：访问管理后台**

打开浏览器访问：`http://your-nas-ip:9390/admin/login`

默认管理员账户：
- 用户名：`admin`
- 密码：`admin123`

首次登录后请立即修改默认密码。

**步骤 5：数据持久化说明**

NAS 部署时，以下数据会自动持久化：
- `./config` 目录：服务器设置、管理员账户配置
- `redis-data` 卷：用户同步数据

建议定期备份 `./config` 目录和 Redis 数据卷。

---

#### 方式二：Host 直接部署

适用于云服务器、VPS 或物理机直接部署。

**环境要求：**
- Node.js 18+
- Redis 6.0+
- PM2（可选，用于进程管理）

**步骤 1：安装 Redis**

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install redis-server
sudo systemctl enable redis
sudo systemctl start redis

# CentOS/RHEL
sudo yum install redis
sudo systemctl enable redis
sudo systemctl start redis

# 验证 Redis 运行
redis-cli ping
# 应返回 PONG
```

**步骤 2：部署 BoxSync**

```bash
# 创建项目目录
mkdir -p /opt/boxsync
cd /opt/boxsync

# 下载项目代码（假设已打包）
# 方式 A：从 Git 克隆
git clone <repository-url> .

# 方式 B：上传打包文件后解压
# tar -xzf boxsync-release.tar.gz

# 安装依赖
npm install --production

# 构建前端
npm run build

# 创建配置目录
mkdir -p config
```

**步骤 3：配置环境变量**

创建 `.env` 文件：

```env
# 服务配置
SERVER_PORT=9390
NODE_ENV=production

# Redis 配置
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=          # 如 Redis 设置了密码，请填写

# 管理员配置
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# 可选配置
MAX_USERS=100
MAX_DATA_PER_USER=100
LOG_RETENTION_DAYS=30
```

**步骤 4：使用 PM2 启动（推荐）**

```bash
# 全局安装 PM2
npm install -g pm2

# 创建 PM2 配置文件 ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'boxsync',
    script: './dist/server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      SERVER_PORT: 9390
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    max_memory_restart: '500M',
    restart_delay: 3000,
    max_restarts: 5,
    min_uptime: '10s'
  }]
};
EOF

# 创建日志目录
mkdir -p logs

# 启动服务
pm2 start ecosystem.config.js

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status
pm2 logs boxsync
```

**步骤 5：使用 Systemd 启动（替代方案）**

如果不使用 PM2，可以创建 Systemd 服务：

```bash
sudo tee /etc/systemd/system/boxsync.service > /dev/null << 'EOF'
[Unit]
Description=BoxSync Server
After=network.target redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/boxsync
ExecStart=/usr/bin/node /opt/boxsync/dist/server.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=SERVER_PORT=9390

[Install]
WantedBy=multi-user.target
EOF

# 重载配置并启动
sudo systemctl daemon-reload
sudo systemctl enable boxsync
sudo systemctl start boxsync

# 查看状态
sudo systemctl status boxsync
```

**步骤 6：配置 Nginx 反向代理（可选）**

如需使用域名和 HTTPS：

```nginx
server {
    listen 80;
    server_name sync.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:9390;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

然后申请 SSL 证书：
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d sync.yourdomain.com
```

**步骤 7：防火墙配置**

```bash
# 开放 BoxSync 端口
sudo ufw allow 9390/tcp

# 或仅允许本地访问（配合 Nginx 反向代理）
sudo ufw deny 9390/tcp
```

---

#### 方式三：Docker 单独部署

**部署 Redis：**

```bash
docker run -d \
  --name boxsync-redis \
  -v redis-data:/data \
  -p 6379:6379 \
  redis:7-alpine
```

**部署 BoxSync：**

```bash
docker run -d \
  --name boxsync \
  -p 9390:9390 \
  -e REDIS_URL=redis://host.docker.internal:6379 \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=your-secure-password \
  -v $(pwd)/config:/app/config \
  boxsync:latest
```

## 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `REDIS_URL` | Redis 连接地址 | `redis://localhost:6379` |
| `SERVER_PORT` | 服务端口 | `9390` |
| `ADMIN_USERNAME` | 管理员用户名 | `admin` |
| `ADMIN_PASSWORD` | 管理员密码 | `admin123` |
| `MAX_USERS` | 最大用户数量 | `100` |
| `MAX_DATA_PER_USER` | 单用户数据上限(MB) | `100` |
| `LOG_RETENTION_DAYS` | 日志保留天数 | `30` |

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
│  localStorage (持久化)    │    Redis (用户同步数据)      │
│  ─────────────────────    │    ────────────────────      │
│  • 管理员账户              │    • 用户同步数据            │
│  • 服务器设置              │    • 应用分区数据            │
│  • 用户列表                │    • 同步历史记录            │
│  • 日志记录                │                              │
└─────────────────────────────────────────────────────────┘
```

### Redis Key 设计

```
boxsync:data:{userId}:{appId}:{key}   # 用户应用数据
boxsync:data:{userId}:{appId}:_meta   # 应用元数据
boxsync:session:{token}               # 会话信息
boxsync:lock:{userId}:{appId}         # 同步锁
```

## 开发接口文档

### 认证接口

#### 登录

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "user1",
  "password": "password123"
}
```

响应：

```json
{
  "token": "jwt-token-string",
  "userId": "user-xxx",
  "username": "user1"
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

### 数据同步接口

#### 写入数据

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

#### 读取数据

```http
GET /api/sync/read?appId=myapp&key=settings.theme
Authorization: Bearer {token}
```

响应：

```json
{
  "key": "settings.theme",
  "value": "dark",
  "timestamp": 1717000000000,
  "version": 3
}
```

#### 批量同步

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

#### 获取变更列表

```http
GET /api/sync/changes?appId=myapp&since=1717000000000
Authorization: Bearer {token}
```

响应：

```json
{
  "changes": [
    {"key": "a", "value": "1", "timestamp": 1717000000000, "version": 2}
  ],
  "timestamp": 1717000001000
}
```

#### 删除数据

```http
DELETE /api/sync/delete?appId=myapp&key=settings.theme
Authorization: Bearer {token}
```

### 应用分区管理

#### 创建应用分区

```http
POST /api/app/create
Authorization: Bearer {token}
Content-Type: application/json

{
  "appId": "myapp",
  "appName": "My Application"
}
```

#### 列出应用分区

```http
GET /api/app/list
Authorization: Bearer {token}
```

响应：

```json
{
  "apps": [
    {"appId": "myapp", "appName": "My Application", "keyCount": 15},
    {"appId": "another", "appName": "Another App", "keyCount": 8}
  ]
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
├── src/
│   ├── components/       # 通用组件
│   ├── pages/           # 页面组件
│   ├── stores/          # 状态管理
│   ├── types/           # TypeScript 类型
│   ├── App.tsx          # 主应用
│   └── main.tsx         # 入口文件
├── public/              # 静态资源
├── docker-compose.yml   # Docker 部署配置
├── Dockerfile           # 镜像构建
└── README.md           # 项目说明
```

## 开发计划

- [x] 管理后台界面开发
- [x] 用户管理与持久化
- [x] 多应用分区支持
- [x] 设置持久化与导入导出
- [ ] 后端 API 实现
- [ ] 客户端 SDK 开发
- [ ] WebSocket 实时同步
- [ ] 数据加密传输

## License

MIT License
