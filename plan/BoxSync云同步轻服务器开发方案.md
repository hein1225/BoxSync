# BoxSync 云同步服务器 - 开发方案

> **项目名称**：BoxSync
> **版本**：v1.0.0
> **创建日期**：2026-05-29
> **项目定位**：为安卓应用提供云同步服务的 Docker 部署服务器

---

## 一、项目概述

BoxSync 是一个基于 Docker 部署的轻量级云同步服务器，使用 Redis 作为数据存储引擎，为安卓客户端应用提供独立的数据同步空间。服务器提供管理员后台和 RESTful API 两套接口，分别面向管理员运维和安卓客户端数据同步。

### 1.1 核心特性

| 特性 | 说明 |
|------|------|
| 数据库 | Redis |
| 部署方式 | Docker + Docker Compose |
| 管理后台 | Web 页面，通过特定路径访问 |
| 客户端接口 | RESTful API，供安卓应用调用 |
| 安全策略 | 隐藏所有入口，无路径不返回任何内容 |

### 1.2 技术栈选型

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| 后端框架 | Node.js + Express / Fastify | 轻量、高性能，适合 API 服务 |
| 数据库 | Redis | 高性能键值存储，支持数据持久化 |
| 前端管理后台 | Vue 3 + Element Plus | 现代化 UI 组件库，开发效率高 |
| 认证方式 | JWT (JSON Web Token) | 无状态认证，适合 API 调用 |
| 部署 | Docker + Docker Compose | 一键部署，环境隔离 |
| 数据备份 | Redis RDB/AOF 导出 + 自定义序列化 | 支持完整数据库导出与导入 |

---

## 二、系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────┐
│                   Docker 容器组                       │
│  ┌──────────────────┐    ┌────────────────────────┐ │
│  │   BoxSync App    │    │      Redis Server      │ │
│  │  (Node.js + Web) │◄──►│    (数据持久化存储)      │ │
│  │                  │    │                        │ │
│  │  ┌────────────┐  │    │  ┌──────────────────┐  │ │
│  │  │  Web 后台   │  │    │  │  用户数据空间     │  │ │
│  │  │ /admin/*   │  │    │  │  boxsync:user:  │  │ │
│  │  └────────────┘  │    │  │  boxsync:auth:  │  │ │
│  │  ┌────────────┐  │    │  │  boxsync:meta:  │  │ │
│  │  │  REST API  │  │    │  └──────────────────┘  │ │
│  │  │ /api/*     │  │    │                        │ │
│  │  └────────────┘  │    └────────────────────────┘ │
│  └──────────────────┘                                │
└─────────────────────────────────────────────────────┘
         ▲                           ▲
         │                           │
    ┌────┴────┐                 ┌─────┴─────┐
    │ 管理员   │                 │ 安卓客户端  │
    │ 浏览器   │                 │ (APP)     │
    └─────────┘                 └───────────┘
```

### 2.2 路由设计

| 路径 | 用途 | 访问权限 |
|------|------|---------|
| `/` | 无任何内容返回（404 或空白页） | 无 |
| `/admin` | 管理员登录页 | 管理员 |
| `/admin/dashboard` | 管理后台首页 | 管理员 |
| `/admin/users` | 用户管理页 | 管理员 |
| `/admin/storage` | 数据使用情况页 | 管理员 |
| `/admin/backup` | 数据备份与还原页 | 管理员 |
| `/admin/logs` | 日志查看页 | 管理员 |
| `/admin/about` | 关于页面（版本信息） | 管理员 |
| `/api/auth/login` | 用户登录认证 | 公开 |
| `/api/sync/*` | 数据同步 API | 已认证用户 |
| 其他任意路径 | 返回空白或 404 | 无 |

---

## 三、数据库设计（Redis）

### 3.1 Key 命名规范

采用冒号分隔的命名空间设计，便于管理和隔离数据：

```
boxsync:auth:token:{token}        → JWT Token 黑名单/白名单
boxsync:auth:session:{userId}     → 用户会话信息
boxsync:user:{userId}             → 用户基本信息
boxsync:user:username:{username}  → 用户名 → userId 映射
boxsync:data:{userId}:*           → 用户独立数据空间
boxsync:meta:version              → 服务器版本信息
boxsync:meta:stats                → 系统统计信息
```

### 3.2 数据结构

#### 用户信息 `boxsync:user:{userId}` (Hash)

```
{
  "userId": "唯一标识 (UUID)",
  "username": "用户名",
  "password": "密码哈希 (bcrypt)",
  "role": "admin | user",
  "createdAt": "创建时间戳",
  "updatedAt": "更新时间戳",
  "status": "active | disabled"
}
```

#### 用户名映射 `boxsync:user:username:{username}` (String)

```
值: userId（用于快速通过用户名查找用户）
```

#### 用户数据空间 `boxsync:data:{userId}:*`

每个用户拥有独立的 Key 前缀空间，安卓客户端通过 API 读写该空间下的数据。数据格式由客户端应用自行定义，服务器仅做传输和存储。

#### 服务器元信息 `boxsync:meta:version` (Hash)

```
{
  "version": "1.0.0",
  "buildDate": "2026-05-29",
  "apiVersion": "v1"
}
```

#### 日志存储 `boxsync:log:*` (List)

日志采用 Redis List 结构存储，按时间顺序追加，支持分页查询：

```
# 日志 Key 命名规则
boxsync:log:all              → 全量日志列表（所有类型）
boxsync:log:auth             → 认证日志（登录、注销）
boxsync:log:sync             → 同步日志（数据读写）
boxsync:log:error            → 错误日志（异常、失败）
boxsync:log:admin            → 管理员操作日志（用户管理、备份等）

# 单条日志格式（JSON 字符串）
{
  "id": "log-uuid",
  "timestamp": 1717000000000,
  "type": "auth | sync | error | admin",
  "action": "login | logout | read | write | delete | batch | create_user | delete_user | backup_export | backup_import",
  "userId": "操作用户ID",
  "username": "操作用户名",
  "ip": "客户端IP地址",
  "device": "设备信息（可选）",
  "detail": "详细描述",
  "success": true | false,
  "errorMsg": "错误信息（仅 error 类型）"
}
```

**日志保留策略**：

管理员可在设置页面选择日志保留时间，提供多个预设选项：

| 保留时间选项 | 说明 |
|-------------|------|
| 7 天 | 适合高频同步、日志量大的场景 |
| 14 天 | 平衡存储与历史追溯需求 |
| 30 天（默认） | 适合常规运维需求 |
| 60 天 | 适合需要较长审计周期的场景 |
| 90 天 | 适合合规审计要求较高的场景 |
| 永久保留 | 不自动删除，需手动清理 |

**配置存储**：

```
# Redis 存储日志配置
boxsync:config:log_retention_days → 保留天数（7/14/30/60/90/-1）
boxsync:config:log_max_count      → 最大条数限制（默认 50000）
```

**自动清理机制**：

- 每日凌晨执行清理任务
- 按配置的保留天数删除过期日志
- 若超出最大条数限制，删除最旧的日志
- 清理操作本身也会记录到管理日志

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| 最大条数 | 50000 | 超出后自动删除最旧的日志 |
| 分页大小 | 100 | 每次查询返回的最大条数 |
| 清理时间 | 02:00 | 每日自动清理执行时间 |

### 3.3 数据持久化策略

Redis 配置使用 **RDB + AOF 混合持久化**：

- **RDB**：定时快照，用于灾难恢复
- **AOF**：追加日志，保证数据完整性
- Docker Volume 挂载持久化数据到宿主机

---

## 四、功能模块详细设计

### 4.1 安全与隐藏策略

**核心原则**：服务器不暴露任何存在信息，所有入口必须通过精确路径访问。

| 访问场景 | 服务器行为 |
|---------|-----------|
| 直接访问 `http://server/` | 返回空白页面或 404 |
| 访问任意未定义路径 | 返回空白页面或 404 |
| 访问 `/admin` 未登录 | 显示登录页 |
| 访问 `/admin/*` 未登录 | 重定向到 `/admin` |
| 访问 `/api/*` 无有效 Token | 返回 `401 Unauthorized` |
| 访问 `/api/auth/login` | 正常返回认证接口 |
| robots.txt | 返回空或禁止爬取 |
| 响应 Header | 移除 `X-Powered-By`、`Server` 等标识信息 |

**实现方式**：

```javascript
// Express 中间件示例
app.use((req, res) => {
  // 对未匹配路由的请求返回空白
  res.status(404).send('');
});
```

### 4.2 管理员功能

#### 4.2.1 用户管理

**功能列表**：

| 操作 | 说明 | 注意事项 |
|------|------|---------|
| 创建用户 | 设置用户名、密码、角色（管理员/普通用户） | 密码需 bcrypt 加密存储 |
| 修改用户 | 修改用户名、密码、角色 | 修改密码需重新加密 |
| 删除用户 | 删除用户及其所有数据 | **需二次确认**，提示数据不可恢复 |
| 禁用/启用 | 临时禁用用户登录 | 禁用后用户无法通过 API 认证 |
| 角色变更 | 在管理员和普通用户之间切换 | 变更后需重新登录生效 |

**删除用户流程**：

```
确认删除 → 弹出二次确认对话框（显示将删除的数据量）
→ 确认 → 删除用户信息 + 用户名映射 + 用户所有数据空间
→ 刷新列表
```

**API 设计**：

```
POST   /api/admin/users          → 创建用户
PUT    /api/admin/users/:id      → 修改用户
DELETE /api/admin/users/:id      → 删除用户（需二次确认）
PATCH  /api/admin/users/:id/role → 修改用户角色
GET    /api/admin/users          → 获取用户列表
```

#### 4.2.2 用户数据使用情况

**展示内容**：

| 数据项 | 说明 |
|--------|------|
| 用户名 | 用户标识 |
| 数据条数 | 该用户空间下的 Key 数量 |
| 内存占用 | 该用户数据占用的内存大小 |
| 最后同步时间 | 最近一次数据写入时间 |

**实现方式**：

使用 Redis `SCAN` 命令遍历 `boxsync:data:{userId}:*` 前缀的 Key，统计数量并使用 `MEMORY USAGE` 命令获取内存占用。

#### 4.2.3 数据备份与还原

**备份功能**：

- **导出**：将整个 Redis 数据库序列化为 JSON 文件下载到本地
- **导出格式**：

```json
{
  "exportTime": "2026-05-29T10:00:00Z",
  "version": "1.0.0",
  "data": {
    "boxsync:user:xxx": { ... },
    "boxsync:data:xxx:key1": "value1",
    ...
  }
}
```

**还原功能**：

- **导入**：上传 JSON 备份文件，覆盖还原数据库
- **安全措施**：
  - 导入前显示警告：此操作将覆盖当前所有数据
  - 需二次确认
  - 建议先备份当前数据再导入

**API 设计**：

```
GET  /api/admin/backup/export  → 导出备份文件
POST /api/admin/backup/import  → 导入备份文件
```

#### 4.2.4 关于页面

**展示内容**：

- 服务器名称：BoxSync
- 当前版本号
- API 版本
- 构建日期
- Redis 连接状态

#### 4.2.5 日志查看

**功能概述**：

管理员可查看系统运行的所有日志，包括用户登录、数据同步、错误信息、管理员操作等，便于运维排查问题。

**日志类型**：

| 类型 | 说明 | 示例场景 |
|------|------|---------|
| 认证日志 (auth) | 用户登录/注销记录 | 用户登录成功、登录失败、Token过期 |
| 同步日志 (sync) | 数据读写操作记录 | 上传数据、下载数据、批量同步 |
| 错误日志 (error) | 系统异常记录 | 网络错误、认证失败、服务器异常 |
| 管理日志 (admin) | 管理员操作记录 | 创建用户、删除用户、导出备份 |

**日志详情字段**：

每条日志包含以下信息：

| 字段 | 说明 |
|------|------|
| 时间 | 操作发生的时间戳 |
| 类型 | auth / sync / error / admin |
| 操作 | 具体动作（login、write、delete 等） |
| 用户 | 操作用户名 |
| IP 地址 | 客户端来源 IP |
| 设备信息 | 客户端设备标识（可选） |
| 详情 | 操作详细描述 |
| 状态 | 成功 / 失败 |
| 错误信息 | 失败时的具体错误（如有） |

**页面功能**：

| 功能 | 说明 |
|------|------|
| 类型筛选 | 按日志类型过滤显示 |
| 时间范围 | 按日期范围筛选日志 |
| 用户筛选 | 按用户名查找相关日志 |
| 关键词搜索 | 在详情中搜索关键词 |
| 分页浏览 | 支持分页加载历史日志 |
| 导出日志 | 导出筛选结果为 JSON/CSV 文件 |
| 清除日志 | 清空指定类型或全部日志（需确认） |

**API 设计**：

```
GET    /api/admin/logs                    → 获取日志列表（支持筛选参数）
GET    /api/admin/logs/stats              → 获取日志统计信息（各类型数量）
DELETE /api/admin/logs                    → 清空日志（需二次确认）
GET    /api/admin/logs/export             → 导出日志文件
```

**请求参数示例**：

```
GET /api/admin/logs?type=auth&startDate=2026-05-01&endDate=2026-05-30&username=user1&page=1&limit=100
```

**响应示例**：

```json
{
  "total": 150,
  "page": 1,
  "limit": 100,
  "logs": [
    {
      "id": "log-abc123",
      "timestamp": 1717000000000,
      "type": "auth",
      "action": "login",
      "userId": "user-001",
      "username": "user1",
      "ip": "192.168.1.50",
      "device": "Android/Samsung Galaxy",
      "detail": "用户登录成功",
      "success": true
    },
    {
      "id": "log-def456",
      "timestamp": 1716999000000,
      "type": "sync",
      "action": "write",
      "userId": "user-001",
      "username": "user1",
      "ip": "192.168.1.50",
      "detail": "写入数据 key=data:records",
      "success": true
    }
  ]
}
```

**日志记录时机**：

| 场景 | 记录内容 |
|------|---------|
| 用户登录成功 | 用户名、IP、设备、登录时间 |
| 用户登录失败 | 用户名、IP、失败原因 |
| 用户注销 | 用户名、IP、注销时间 |
| 数据同步操作 | 用户名、IP、操作类型、Key、数据量 |
| 管理员操作 | 操作人、IP、操作类型、目标对象 |
| 系统错误 | 错误类型、错误信息、触发用户、IP |

**日志导出功能**：

管理员可将筛选后的日志导出为本地文件，支持多种格式：

| 导出格式 | 说明 | 适用场景 |
|---------|------|---------|
| JSON | 结构化数据，便于程序解析 | 数据分析、二次处理 |
| CSV | 表格格式，便于 Excel 打开 | 人工查阅、报表制作 |
| TXT | 纯文本格式，便于阅读 | 快速浏览、简单存档 |

**导出参数**：

```
GET /api/admin/logs/export?format=json&type=all&startDate=2026-05-01&endDate=2026-05-30
```

| 参数 | 说明 | 可选值 |
|------|------|--------|
| format | 导出格式 | json / csv / txt |
| type | 日志类型筛选 | all / auth / sync / error / admin |
| startDate | 开始日期 | YYYY-MM-DD |
| endDate | 结束日期 | YYYY-MM-DD |
| username | 用户筛选 | 用户名（可选） |

**导出文件命名**：

```
boxsync_logs_{type}_{startDate}_{endDate}_{timestamp}.{format}
例: boxsync_logs_all_2026-05-01_2026-05-30_1717000000.json
```

**导出响应示例（JSON格式）**：

```json
{
  "exportInfo": {
    "server": "BoxSync v1.0.0",
    "exportTime": "2026-05-30T10:00:00Z",
    "filter": {
      "type": "all",
      "startDate": "2026-05-01",
      "endDate": "2026-05-30",
      "username": null
    },
    "totalCount": 1500
  },
  "logs": [
    { ... },
    { ... }
  ]
}
```

**导出响应示例（CSV格式）**：

```csv
时间,类型,操作,用户,IP地址,设备,详情,状态,错误信息
2026-05-30 10:00:00,auth,login,user1,192.168.1.50,Android/Samsung,用户登录成功,成功,
2026-05-30 09:55:00,sync,write,user1,192.168.1.50,,写入数据 key=data:records,成功,
```

**导出限制与安全**：

| 限制项 | 说明 |
|--------|------|
| 单次最大导出 | 10000 条，超出需分批导出 |
| 导出权限 | 仅管理员可执行 |
| 导出记录 | 导出操作本身记录到管理日志 |
| 文件下载 | 通过浏览器直接下载，不存储在服务器 |

**日志设置页面**：

管理员可在日志页面配置保留策略：

```
┌─────────────────────────────────────┐
│           日志设置                    │
├─────────────────────────────────────┤
│                                     │
│  日志保留时间                        │
│  ┌─────────────────────────────┐   │
│  │ ○ 7 天                       │   │
│  │ ○ 14 天                      │   │
│  │ ● 30 天（推荐）               │   │
│  │ ○ 60 天                      │   │
│  │ ○ 90 天                      │   │
│  │ ○ 永久保留                    │   │
│  └─────────────────────────────┘   │
│                                     │
│  最大日志条数                        │
│  ┌─────────────────────────────┐   │
│  │ 50000                        │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌──────────┐  ┌──────────┐        │
│  │  保存设置  │  │ 清空日志  │        │
│  └──────────┘  └──────────┘        │
│                                     │
│  当前日志统计：                      │
│  认证日志: 320 条                    │
│  同步日志: 850 条                    │
│  错误日志: 15 条                     │
│  管理日志: 28 条                     │
│  总计: 1213 条                       │
│                                     │
└─────────────────────────────────────┘
```

### 4.3 普通用户功能（API）

#### 4.3.1 认证流程

```
安卓客户端 → POST /api/auth/login (用户名 + 密码)
          ← 返回 JWT Token

后续请求 → Header: Authorization: Bearer {token}
         ← 返回数据或执行操作
```

#### 4.3.2 数据同步 API

安卓客户端通过 API 读写自己独立的数据空间，每个用户的数据完全隔离。

**API 设计**：

```
# 认证
POST   /api/auth/login              → 登录获取 Token
POST   /api/auth/logout             → 注销 Token

# 数据操作（需 Token）
GET    /api/sync/keys               → 获取用户所有 Key 列表
GET    /api/sync/data/:key          → 读取指定 Key 的值
PUT    /api/sync/data/:key          → 写入/更新指定 Key 的值
DELETE /api/sync/data/:key          → 删除指定 Key
POST   /api/sync/batch              → 批量写入数据
GET    /api/sync/batch              → 批量读取数据
DELETE /api/sync/all                → 清空用户所有数据（需确认）
```

**请求/响应示例**：

```
# 登录
POST /api/auth/login
Body: { "username": "user1", "password": "pass123" }
Response: { "token": "eyJhbG...", "expiresIn": 86400 }

# 写入数据
PUT /api/sync/data/mykey
Header: Authorization: Bearer eyJhbG...
Body: { "value": "my data value" }
Response: { "success": true }

# 读取数据
GET /api/sync/data/mykey
Header: Authorization: Bearer eyJhbG...
Response: { "key": "mykey", "value": "my data value" }
```

#### 4.3.3 客户端接入说明

安卓软件配置云同步时，用户需输入：

| 配置项 | 说明 | 示例 |
|--------|------|------|
| 服务器地址 | BoxSync 服务器 URL | `http://192.168.1.100:9390` |
| 用户名 | 注册的账户名 | `user1` |
| 密码 | 账户密码 | `pass123` |

客户端自动拼接 API 路径：`{服务器地址}/api/auth/login`

---

## 五、项目目录结构

```
BoxSync/
├── plan/
│   └── 开发方案.md                  ← 本文档
├── docker-compose.yml               ← Docker 编排配置
├── Dockerfile                       ← 应用容器构建
├── .dockerignore                    ← Docker 构建忽略文件
├── .env                             ← 环境变量配置
├── server/
│   ├── package.json
│   ├── src/
│   │   ├── index.js                 ← 入口文件
│   │   ├── config/
│   │   │   ├── database.js          ← Redis 连接配置
│   │   │   ├── auth.js              ← JWT 配置
│   │   │   └── security.js          ← 安全策略配置
│   │   ├── routes/
│   │   │   ├── admin.js             ← 管理员后台路由
│   │   │   ├── apiAuth.js           ← API 认证路由
│   │   │   └── apiSync.js           ← 数据同步路由
│   │   ├── middleware/
│   │   │   ├── auth.js              ← JWT 认证中间件
│   │   │   ├── adminAuth.js         ← 管理员权限中间件
│   │   │   └── security.js          ← 安全隐藏中间件
│   │   ├── services/
│   │   │   ├── userService.js       ← 用户管理服务
│   │   │   ├── syncService.js       ← 数据同步服务
│   │   │   ├── backupService.js     ← 备份还原服务
│   │   │   ├── storageService.js    ← 存储统计服务
│   │   │   └── logService.js        ← 日志记录与查询服务
│   │   └── utils/
│   │       ├── redis.js             ← Redis 客户端封装
│   │       └── helpers.js           ← 工具函数
│   └── public/
│       └── admin/                   ← 管理后台静态文件
│           └── index.html
├── admin-web/                       ← 管理后台前端源码（可选独立构建）
│   ├── package.json
│   ├── src/
│   │   ├── App.vue
│   │   ├── views/
│   │   │   ├── Login.vue
│   │   │   ├── Dashboard.vue
│   │   │   ├── UserManage.vue
│   │   │   ├── StorageView.vue
│   │   │   ├── BackupRestore.vue
│   │   │   ├── LogView.vue
│   │   │   └── About.vue
│   │   ├── components/
│   │   ├── router/
│   │   └── api/
│   └── vite.config.js
└── redis/
    └── redis.conf                   ← Redis 自定义配置
```

---

## 六、Docker 部署配置

### 6.1 Docker Compose 编排

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Redis 数据库服务
  redis:
    image: redis:7-alpine
    container_name: boxsync-redis
    restart: unless-stopped
    ports:
      - "127.0.0.1:6379:6379"    # 仅本地访问，不暴露到外网
    volumes:
      - redis-data:/data
      - ./redis/redis.conf:/usr/local/etc/redis/redis.conf
    command: redis-server /usr/local/etc/redis/redis.conf
    networks:
      - boxsync-net

  # BoxSync 应用服务
  boxsync:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: boxsync-app
    restart: unless-stopped
    ports:
      - "${SERVER_PORT:-9390}:9390"   # 默认端口 9390，可通过环境变量修改
    environment:
      - NODE_ENV=production
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - JWT_SECRET=${JWT_SECRET}
      - JWT_EXPIRES_IN=24h
      - ADMIN_PATH=${ADMIN_PATH:-admin}
      - API_PATH=${API_PATH:-api}
    depends_on:
      - redis
    volumes:
      - backup-data:/backups      # 备份文件持久化
    networks:
      - boxsync-net

volumes:
  redis-data:
    driver: local
  backup-data:
    driver: local

networks:
  boxsync-net:
    driver: bridge
```

### 6.2 应用 Dockerfile

```dockerfile
# Dockerfile
# 多阶段构建：先构建前端，再打包后端

# ---- 阶段1：构建管理后台前端 ----
FROM node:20-alpine AS admin-build
WORKDIR /app/admin
COPY admin-web/package.json admin-web/package-lock.json ./
RUN npm ci
COPY admin-web/ ./
RUN npm run build

# ---- 阶段2：最终运行镜像 ----
FROM node:20-alpine
WORKDIR /app

# 安装后端依赖
COPY server/package.json server/package-lock.json ./
RUN npm ci --production

# 复制后端源码
COPY server/src/ ./src/

# 复制构建好的前端文件
COPY --from=admin-build /app/admin/dist ./public/admin

# 复制 Redis 配置
COPY redis/redis.conf ./redis/redis.conf

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=9390

EXPOSE 9390

CMD ["node", "src/index.js"]
```

### 6.3 Redis 配置

```ini
# redis/redis.conf

# 绑定地址（仅容器内网络访问）
bind 0.0.0.0

# 端口
port 6379

# 密码认证（生产环境必须设置）
requirepass ${REDIS_PASSWORD}

# 持久化 - RDB 配置
save 900 1
save 300 10
save 60 10000

# RDB 文件名
dbfilename dump.rdb

# 持久化 - AOF 配置
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec

# 内存限制（根据服务器配置调整）
maxmemory 512mb
maxmemory-policy allkeys-lru

# 日志级别
loglevel notice

# 客户端最大连接数
maxclients 100
```

### 6.4 环境变量配置

```env
# .env

# JWT 密钥（请修改为随机字符串）
JWT_SECRET=your-random-secret-key-change-this

# JWT 过期时间
JWT_EXPIRES_IN=24h

# Redis 密码
REDIS_PASSWORD=your-redis-password-change-this

# 服务器端口（默认 9390）
SERVER_PORT=9390

# 管理后台路径（可自定义，增加安全性）
ADMIN_PATH=admin

# API 路径前缀
API_PATH=api
```

### 6.5 部署步骤

```bash
# 1. 克隆项目
git clone <repository-url> BoxSync
cd BoxSync

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，修改 JWT_SECRET 和 REDIS_PASSWORD

# 3. 一键启动
docker-compose up -d

# 4. 查看运行状态
docker-compose ps

# 5. 查看日志
docker-compose logs -f

# 6. 初始化管理员账户（首次部署）
docker-compose exec boxsync node src/scripts/initAdmin.js --username admin --password your-password
```

### 6.6 常用运维命令

```bash
# 停止服务
docker-compose down

# 停止并清除数据（危险操作）
docker-compose down -v

# 重启服务
docker-compose restart

# 更新并重新构建
docker-compose up -d --build

# 查看 Redis 数据
docker-compose exec redis redis-cli -a ${REDIS_PASSWORD} keys "boxsync:*"

# 备份 Redis 数据（RDB 方式）
docker-compose exec redis redis-cli -a ${REDIS_PASSWORD} BGSAVE
docker cp boxsync-redis:/data/dump.rdb ./backup/
```

---

## 七、安全设计

### 7.1 入口隐藏

- 所有未定义路由返回空白 404 响应
- 移除所有 HTTP 响应头中的服务器标识信息
- 管理后台路径可通过环境变量自定义（默认 `/admin`）
- API 路径可通过环境变量自定义（默认 `/api`）

### 7.2 认证与授权

| 层级 | 机制 | 说明 |
|------|------|------|
| 管理员登录 | 用户名 + 密码 + JWT | 登录后签发管理员 Token |
| API 认证 | 用户名 + 密码 + JWT | 登录后签发用户 Token |
| 接口鉴权 | JWT 中间件 | 验证 Token 有效性及角色权限 |
| 密码存储 | bcrypt 哈希 | 不可逆加密，防泄露 |

### 7.3 网络安全

- Redis 仅绑定容器内部网络，不暴露到宿主机外网
- Redis 启用密码认证
- 应用服务端口可按需修改
- 建议生产环境前置 Nginx 反向代理并启用 HTTPS

### 7.4 数据安全

- 用户数据空间完全隔离，用户只能访问自己的数据
- 管理员可查看统计数据但无法直接读取用户数据内容（可选策略）
- 备份文件下载需管理员权限验证

---

## 八、开发计划

### 8.1 阶段划分

| 阶段 | 内容 | 预计工时 |
|------|------|---------|
| **第一阶段** | 项目初始化、Redis 连接、基础框架搭建 | 1 天 |
| **第二阶段** | 用户认证系统（JWT + bcrypt）、中间件 | 1 天 |
| **第三阶段** | 管理员后台 - 用户管理功能 | 1 天 |
| **第四阶段** | 管理员后台 - 数据统计、备份还原、关于页面 | 1 天 |
| **第五阶段** | 数据同步 API 开发 | 1 天 |
| **第六阶段** | 安全策略实现、入口隐藏 | 0.5 天 |
| **第七阶段** | Docker 配置、部署测试 | 0.5 天 |
| **第八阶段** | 整体测试、Bug 修复、文档完善 | 1 天 |

**总计预估**：约 7 天

### 8.2 里程碑

- **M1**：基础框架 + 认证系统可运行
- **M2**：管理员后台全部功能完成
- **M3**：API 接口开发完成，安卓客户端可对接
- **M4**：Docker 部署配置完成，可一键部署
- **M5**：全功能测试通过，发布 v1.0.0

---

## 九、API 接口汇总

### 9.1 管理员 API（需管理员 Token）

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/admin/users` | 创建用户 |
| `GET` | `/api/admin/users` | 获取用户列表 |
| `PUT` | `/api/admin/users/:id` | 修改用户信息 |
| `DELETE` | `/api/admin/users/:id` | 删除用户（连带数据） |
| `PATCH` | `/api/admin/users/:id/role` | 修改用户角色 |
| `GET` | `/api/admin/storage` | 获取所有用户存储统计 |
| `GET` | `/api/admin/backup/export` | 导出数据库备份 |
| `POST` | `/api/admin/backup/import` | 导入数据库备份 |
| `GET` | `/api/admin/logs` | 获取日志列表（支持筛选） |
| `GET` | `/api/admin/logs/stats` | 获取日志统计信息 |
| `DELETE` | `/api/admin/logs` | 清空日志（需确认） |
| `GET` | `/api/admin/logs/export` | 导出日志文件 |
| `GET` | `/api/admin/about` | 获取服务器版本信息 |

### 9.2 公开 API

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/auth/login` | 用户登录 |
| `POST` | `/api/auth/logout` | 用户注销 |

### 9.3 用户 API（需用户 Token）

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/sync/keys` | 获取用户所有 Key |
| `GET` | `/api/sync/data/:key` | 读取数据 |
| `PUT` | `/api/sync/data/:key` | 写入数据 |
| `DELETE` | `/api/sync/data/:key` | 删除数据 |
| `POST` | `/api/sync/batch` | 批量写入 |
| `GET` | `/api/sync/batch` | 批量读取 |
| `DELETE` | `/api/sync/all` | 清空所有数据 |

---

## 十、安卓客户端代码适配指南

本章面向安卓开发者，说明如何在安卓应用中集成 BoxSync 云同步功能。

### 10.1 依赖配置

在 `build.gradle` (Module级别) 中添加网络请求依赖：

```groovy
dependencies {
    // OkHttp - 网络请求
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'

    // Gson - JSON 序列化/反序列化
    implementation 'com.google.code.gson:gson:2.10.1'

    // DataStore 或 SharedPreferences - 本地持久化 Token
    implementation 'androidx.datastore:datastore-preferences:1.0.0'
}
```

同时确保 `AndroidManifest.xml` 中声明网络权限：

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

### 10.2 核心架构设计

建议采用分层架构，将云同步功能封装为独立模块：

```
app/
├── ...（其他业务代码）
└── sync/
    ├── BoxSyncClient.kt          ← 核心客户端封装（单例）
    ├── BoxSyncConfig.kt          ← 服务器配置
    ├── model/
    │   ├── LoginRequest.kt       ← 登录请求体
    │   ├── LoginResponse.kt      ← 登录响应体
    │   ├── SyncData.kt           ← 数据读写模型
    │   └── ApiResponse.kt         ← 通用响应封装
    ├── api/
    │   ├── AuthApi.kt            ← 认证接口
    │   └── SyncApi.kt            ← 同步接口
    └── exception/
        └── SyncException.kt      ← 自定义异常
```

### 10.3 服务器配置管理

用户在 APP 设置页面输入服务器信息，持久化存储到本地：

```kotlin
// BoxSyncConfig.kt
data class BoxSyncConfig(
    val serverUrl: String,    // 例: http://192.168.1.100:9390
    val username: String,
    val password: String
) {
    // 自动拼接完整 API 地址
    val baseUrl: String
        get() = serverUrl.trimEnd('/') + "/api"

    val loginUrl: String
        get() = "$baseUrl/auth/login"

    val syncBaseUrl: String
        get() = "$baseUrl/sync"
}
```

**本地存储示例（DataStore）**：

```kotlin
// 保存配置
suspend fun saveConfig(context: Context, config: BoxSyncConfig) {
    val dataStore = context.createDataStore(name = "boxsync_settings")
    dataStore.edit { prefs ->
        prefs[stringPreferencesKey("server_url")] = config.serverUrl
        prefs[stringPreferencesKey("username")] = config.username
        prefs[stringPreferencesKey("password")] = config.password
    }
}

// 读取配置
suspend fun loadConfig(context: Context): BoxSyncConfig? {
    val dataStore = context.createDataStore(name = "boxsync_settings")
    val prefs = dataStore.data.first()
    val url = prefs[stringPreferencesKey("server_url")] ?: return null
    val username = prefs[stringPreferencesKey("username")] ?: return null
    val password = prefs[stringPreferencesKey("password")] ?: return null
    return BoxSyncConfig(url, username, password)
}
```

### 10.4 认证模块实现

#### 10.4.1 登录与 Token 管理

```kotlin
// BoxSyncClient.kt - 核心客户端
object BoxSyncClient {

    private var authToken: String? = null
    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()
    private val gson = Gson()

    /** 登录获取 Token */
    suspend fun login(config: BoxSyncConfig): Result<String> = withContext(Dispatchers.IO) {
        try {
            val body = gson.toJson(mapOf(
                "username" to config.username,
                "password" to config.password
            )).toRequestBody("application/json".toMediaType())

            val request = Request.Builder()
                .url(config.loginUrl)
                .post(body)
                .build()

            val response = client.newCall(request).execute()
            val responseBody = response.body?.string() ?: return@withContext Result.failure(
                SyncException("空响应")
            )

            if (response.isSuccessful) {
                val loginResp = gson.fromJson(responseBody, LoginResponse::class.java)
                authToken = loginResp.token
                Result.success(loginResp.token)
            } else {
                Result.failure(SyncException("登录失败: ${response.code}"))
            }
        } catch (e: Exception) {
            Result.failure(SyncException("网络错误: ${e.message}"))
        }
    }

    /** 构建带认证头的请求 */
    private fun authRequestBuilder(url: String): Request.Builder {
        return Request.Builder()
            .url(url)
            .addHeader("Authorization", "Bearer $authToken")
    }

    /** 检查是否已认证 */
    fun isAuthenticated(): Boolean = authToken != null

    /** 清除 Token（注销） */
    fun logout() { authToken = null }
}
```

#### 10.4.2 Token 持久化

APP 重启后需要恢复 Token，避免每次都重新登录：

```kotlin
// 保存 Token
suspend fun saveToken(context: Context, token: String) {
    val dataStore = context.createDataStore(name = "boxsync_settings")
    dataStore.edit { prefs ->
        prefs[stringPreferencesKey("auth_token")] = token
    }
}

// 恢复 Token
suspend fun restoreToken(context: Context): String? {
    val dataStore = context.createDataStore(name = "boxsync_settings")
    val prefs = dataStore.data.first()
    return prefs[stringPreferencesKey("auth_token")]
}
```

### 10.5 数据同步模块实现

#### 10.5.1 单条数据读写

```kotlin
// SyncApi.kt

/** 读取数据 */
suspend fun readData(key: String): Result<String> = withContext(Dispatchers.IO) {
    try {
        val request = BoxSyncClient.authRequestBuilder(
            "${config.syncBaseUrl}/data/$key"
        ).get().build()

        val response = BoxSyncClient.execute(request)
        if (response.isSuccessful) {
            val body = response.body?.string() ?: return@withContext Result.failure(
                SyncException("空响应")
            )
            val json = JsonParser.parseString(body).asJsonObject
            Result.success(json.get("value").asString)
        } else if (response.code == 401) {
            // Token 过期，需要重新登录
            Result.failure(SyncException("TOKEN_EXPIRED"))
        } else {
            Result.failure(SyncException("读取失败: ${response.code}"))
        }
    } catch (e: Exception) {
        Result.failure(SyncException("网络错误: ${e.message}"))
    }
}

/** 写入数据 */
suspend fun writeData(key: String, value: String): Result<Unit> = withContext(Dispatchers.IO) {
    try {
        val json = gson.toJson(mapOf("value" to value))
        val body = json.toRequestBody("application/json".toMediaType())

        val request = BoxSyncClient.authRequestBuilder(
            "${config.syncBaseUrl}/data/$key"
        ).put(body).build()

        val response = BoxSyncClient.execute(request)
        if (response.isSuccessful) {
            Result.success(Unit)
        } else if (response.code == 401) {
            Result.failure(SyncException("TOKEN_EXPIRED"))
        } else {
            Result.failure(SyncException("写入失败: ${response.code}"))
        }
    } catch (e: Exception) {
        Result.failure(SyncException("网络错误: ${e.message}"))
    }
}

/** 删除数据 */
suspend fun deleteData(key: String): Result<Unit> = withContext(Dispatchers.IO) {
    try {
        val request = BoxSyncClient.authRequestBuilder(
            "${config.syncBaseUrl}/data/$key"
        ).delete().build()

        val response = BoxSyncClient.execute(request)
        if (response.isSuccessful) {
            Result.success(Unit)
        } else {
            Result.failure(SyncException("删除失败: ${response.code}"))
        }
    } catch (e: Exception) {
        Result.failure(SyncException("网络错误: ${e.message}"))
    }
}
```

#### 10.5.2 批量数据操作

```kotlin
/** 批量写入（适合首次同步或大量数据上传） */
suspend fun batchWrite(dataMap: Map<String, String>): Result<Unit> = withContext(Dispatchers.IO) {
    try {
        val json = gson.toJson(mapOf("data" to dataMap))
        val body = json.toRequestBody("application/json".toMediaType())

        val request = BoxSyncClient.authRequestBuilder(
            "${config.syncBaseUrl}/batch"
        ).post(body).build()

        val response = BoxSyncClient.execute(request)
        if (response.isSuccessful) {
            Result.success(Unit)
        } else {
            Result.failure(SyncException("批量写入失败: ${response.code}"))
        }
    } catch (e: Exception) {
        Result.failure(SyncException("网络错误: ${e.message}"))
    }
}

/** 批量读取 */
suspend fun batchRead(keys: List<String>): Result<Map<String, String>> = withContext(Dispatchers.IO) {
    try {
        val json = gson.toJson(mapOf("keys" to keys))
        val body = json.toRequestBody("application/json".toMediaType())

        val request = BoxSyncClient.authRequestBuilder(
            "${config.syncBaseUrl}/batch"
        ).post(body).build()

        val response = BoxSyncClient.execute(request)
        if (response.isSuccessful) {
            val responseBody = response.body?.string() ?: return@withContext Result.failure(
                SyncException("空响应")
            )
            val type = object : TypeToken<Map<String, String>>() {}.type
            Result.success(gson.fromJson(responseBody, type))
        } else {
            Result.failure(SyncException("批量读取失败: ${response.code}"))
        }
    } catch (e: Exception) {
        Result.failure(SyncException("网络错误: ${e.message}"))
    }
}
```

### 10.6 同步策略设计

#### 10.6.1 同步流程

```
APP 启动
  │
  ├─→ 检查本地是否已保存 Token
  │     ├─→ 有 Token → 验证可用性（请求 /api/sync/keys）
  │     │     ├─→ 200 OK → Token 有效，进入同步
  │     │     └─→ 401 → Token 过期，重新登录
  │     └─→ 无 Token → 提示用户配置服务器信息并登录
  │
  ├─→ 同步流程
  │     ├─→ 获取服务器 Key 列表 (GET /api/sync/keys)
  │     ├─→ 对比本地数据，找出差异
  │     │     ├─→ 服务器有、本地无 → 下载
  │     │     ├─→ 本地有、服务器无 → 上传
  │     │     └─→ 两边都有、内容不同 → 按时间戳取最新
  │     └─→ 执行差异同步
  │
  └─→ 同步完成，更新本地数据
```

#### 10.6.2 Key 命名约定

建议安卓端与服务器约定统一的 Key 前缀规范，便于管理和避免冲突：

```
# 应用配置数据
app:settings         → 全局设置
app:theme            → 主题配置

# 业务数据
data:records         → 记录列表
data:profile         → 用户资料
data:preferences     → 偏好设置

# 同步元数据
sync:last_sync_time  → 上次同步时间戳
sync:device_id       → 设备标识
```

#### 10.6.3 冲突解决策略

| 场景 | 策略 | 说明 |
|------|------|------|
| 仅本地有数据 | 上传到服务器 | 首次同步场景 |
| 仅服务器有数据 | 下载到本地 | 换设备场景 |
| 两边都有，内容相同 | 跳过 | 无需操作 |
| 两边都有，内容不同 | 取较新的 | 每条数据附带 `updatedAt` 时间戳 |
| 两边同时修改同一条 | 取较新的 | 同上，基于时间戳判断 |

**建议**：每条同步数据使用 JSON 格式，包含 `updatedAt` 字段：

```json
{
  "value": "实际业务数据",
  "updatedAt": 1717000000000
}
```

### 10.7 错误处理与重试

```kotlin
// SyncException.kt
sealed class SyncException(message: String) : Exception(message) {
    class NetworkError(message: String) : SyncException("网络错误: $message")
    class AuthError(message: String) : SyncException("认证错误: $message")
    class ServerError(code: Int, message: String) : SyncException("服务器错误($code): $message")
    class TokenExpired : SyncException("Token 已过期，请重新登录")
}

// 带自动重试的请求封装
suspend fun <T> withRetry(
    maxRetries: Int = 3,
    delayMs: Long = 1000,
    block: suspend () -> Result<T>
): Result<T> {
    var lastException: Exception? = null
    repeat(maxRetries) { attempt ->
        when (val result = block()) {
            is Result.Success -> return result
            is Result.Failure -> {
                lastException = result.exception
                // Token 过期不重试，直接返回
                if (result.exception is SyncException.TokenExpired) return result
                if (attempt < maxRetries - 1) {
                    delay(delayMs * (attempt + 1))  // 指数退避
                }
            }
        }
    }
    return Result.failure(lastException ?: SyncException("未知错误"))
}
```

### 10.8 UI 设置页面参考

用户在 APP 中配置云同步的设置页面应包含以下元素：

```
┌─────────────────────────────────┐
│        云同步设置                 │
├─────────────────────────────────┤
│                                 │
│  服务器地址                       │
│  ┌─────────────────────────┐   │
│  │ http://192.168.1.100:9390│   │
│  └─────────────────────────┘   │
│                                 │
│  用户名                          │
│  ┌─────────────────────────┐   │
│  │ user1                    │   │
│  └─────────────────────────┘   │
│                                 │
│  密码                            │
│  ┌─────────────────────────┐   │
│  │ ••••••••                  │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌──────────┐  ┌──────────┐    │
│  │  测试连接  │  │   登录    │    │
│  └──────────┘  └──────────┘    │
│                                 │
│  状态: ● 已连接 · 上次同步 10:30  │
│                                 │
│  ┌─────────────────────────┐   │
│  │     立即同步               │   │
│  └─────────────────────────┘   │
│                                 │
│  ☑ 仅在 Wi-Fi 下同步            │
│  ☑ 自动同步（每30分钟）          │
│                                 │
└─────────────────────────────────┘
```

### 10.9 完整集成示例

```kotlin
// 在 ViewModel 或 Repository 中使用
class SyncViewModel : ViewModel() {

    private val _syncState = MutableStateFlow<SyncState>(SyncState.Idle)
    val syncState: StateFlow<SyncState> = _syncState

    /** 执行云同步 */
    fun performSync() {
        viewModelScope.launch {
            _syncState.value = SyncState.Syncing

            // 1. 检查 Token，必要时登录
            val token = loadToken() ?: login().getOrThrow()
            BoxSyncClient.setToken(token)

            // 2. 获取服务器数据列表
            val keysResult = withRetry { fetchServerKeys() }
            val serverKeys = keysResult.getOrThrow()

            // 3. 获取本地数据列表
            val localKeys = getLocalDataKeys()

            // 4. 计算差异并同步
            val toDownload = serverKeys - localKeys.toSet()
            val toUpload = localKeys.filter { it !in serverKeys }

            // 下载服务器独有的数据
            toDownload.forEach { key ->
                val result = withRetry { readData(key) }
                result.onSuccess { saveToLocal(key, it) }
            }

            // 上传本地独有的数据
            toUpload.forEach { key ->
                val localValue = readFromLocal(key)
                val result = withRetry { writeData(key, localValue) }
                result.onSuccess { updateSyncMeta(key) }
            }

            _syncState.value = SyncState.Completed(
                downloaded = toDownload.size,
                uploaded = toUpload.size
            )
        }
    }
}

sealed class SyncState {
    object Idle : SyncState()
    object Syncing : SyncState()
    data class Completed(val downloaded: Int, val uploaded: Int) : SyncState()
    data class Error(val message: String) : SyncState()
}
```

### 10.10 注意事项

1. **网络环境**：BoxSync 服务器通常部署在局域网或内网，需提醒用户确保手机与服务器在同一网络，或服务器有公网访问能力
2. **HTTPS**：生产环境强烈建议服务器配置 HTTPS，安卓端默认使用 HTTPS 地址
3. **Token 刷新**：JWT Token 有过期时间（默认 24h），过期后需引导用户重新登录，或实现自动重新登录逻辑
4. **数据大小**：单条数据不宜过大（建议 < 1MB），大数据应拆分为多条 Key 存储
5. **后台同步**：使用 WorkManager 实现后台定期同步，避免依赖前台 Activity
6. **离线优先**：APP 应采用离线优先策略，本地数据始终可用，网络恢复后自动同步
7. **线程安全**：所有网络请求必须在 IO 线程执行，UI 更新在主线程

---

## 十一、注意事项

1. **首次部署**：必须修改 `.env` 中的 `JWT_SECRET` 和 `REDIS_PASSWORD`，使用强随机字符串
2. **数据安全**：删除用户操作不可逆，务必实现二次确认机制
3. **备份策略**：建议定期通过管理后台导出备份，或配置定时任务自动备份
4. **生产环境**：建议使用 Nginx 反向代理并配置 HTTPS，不要直接暴露应用端口
5. **Redis 内存**：根据实际用户数量和数据量调整 `maxmemory` 配置
6. **路径自定义**：可通过环境变量修改管理后台和 API 的路径前缀，进一步提升安全性
