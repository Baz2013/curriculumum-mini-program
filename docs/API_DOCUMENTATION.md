# API 接口文档

本文档描述了课程预约系统的所有RESTful API接口。

## 基础信息

- **Base URL**: `http://localhost:3000/api`
- **响应格式**: JSON
- **字符编码**: UTF-8

---

## 公共接口

### 健康检查

**接口地址**: `GET /health`

**请求参数**: 无

**响应示例**:
```json
{
  "status": "ok",
  "timestamp": "2024-04-15T10:30:00.000Z"
}
```

---

## 课程相关接口 (`/courses`)

### 1. 获取课程列表

**接口地址**: `GET /courses/list`

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | Integer | 否 | 页码，默认1 |
| pageSize | Integer | 否 | 每页数量，默认10 |
| categoryId | Integer | 否 | 分类ID |
| keyword | String | 否 | 搜索关键词 |

**响应示例**:
```json
{
  "success": true,
  "list": [
    {
      "id": 1,
      "title": "Python零基础入门到精通",
      "description": "...",
      "category_id": 1,
      "category_name": "编程技术",
      "teacher": "张老师",
      "location": "线上直播",
      "start_time": "2024-04-15 19:00:00",
      "end_time": "2024-04-15 21:00:00",
      "capacity": 50,
      "booked_count": 35,
      "price": 199,
      "availability": "available"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

### 2. 获取课程详情

**接口地址**: `GET /courses/{id}/detail`

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | Integer | 是 | 课程ID |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Python零基础入门到精通",
    "description": "...",
    "category_id": 1,
    "category_name": "编程技术",
    ...
  }
}
```

### 3. 高级搜索课程

**接口地址**: `POST /courses/search`

**请求体**:
```json
{
  "filters": {
    "categoryId": 1,
    "dateFrom": "2024-04-01",
    "dateTo": "2024-04-30",
    "maxPrice": 300,
    "sortBy": "price_asc"
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "list": [...]
}
```

### 4. 获取所有分类

**接口地址**: `GET /courses/categories/all`

**响应示例**:
```json
{
  "success": true,
  "list": [
    {
      "id": 1,
      "name": "编程技术",
      "description": "各类编程语言和技术培训",
      "sort_order": 0
    }
  ]
}
```

---

## 预约相关接口 (`/bookings`)

### 1. 创建预约

**接口地址**: `POST /bookings/create`

**请求体**:
```json
{
  "userId": 1,
  "courseId": 1
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "预约成功"
}
```

### 2. 取消预约

**接口地址**: `DELETE /bookings/cancel/{courseId}`

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| courseId | Integer | 是 | 课程ID |

**请求体**:
```json
{
  "userId": 1
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "已取消预约"
}
```

### 3. 获取用户预约列表

**接口地址**: `GET /bookings/user/{userId}`

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| userId | Integer | 是 | 用户ID |

**查询参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| status | String | 否 | 预约状态(confirmed/cancelled) |

**响应示例**:
```json
{
  "success": true,
  "list": [
    {
      "id": 1,
      "user_id": 1,
      "course_id": 1,
      "status": "confirmed",
      "check_in_status": "unchecked",
      "course_title": "Python零基础入门到精通",
      "teacher": "张老师",
      "location": "线上直播",
      "start_time": "2024-04-15 19:00:00",
      "end_time": "2024-04-15 21:00:00",
      "category_name": "编程技术"
    }
  ]
}
```

### 4. 签到打卡

**接口地址**: `PUT /bookings/checkin/{id}`

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | Integer | 是 | 预约记录ID |

**响应示例**:
```json
{
  "success": true,
  "message": "签到成功"
}
```

---

## 用户相关接口 (`/user`)

### 1. 用户登录/注册

**接口地址**: `POST /user/login`

**请求体**:
```json
{
  "openid": "oxxxxxxxxxxxxxx",
  "nickname": "微信用户",
  "avatarUrl": "https://..."
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nickname": "微信用户",
    "avatar_url": "https://...",
    "role": "student",
    "created_at": "2024-04-01 10:00:00"
  },
  "message": "登录成功"
}
```

### 2. 获取用户信息

**接口地址**: `GET /user/info`

**查询参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| userId | Integer | 是 | 用户ID |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nickname": "微信用户",
    "avatar_url": "https://...",
    "phone": "138****8888",
    "email": "***@example.com",
    "role": "student",
    "created_at": "2024-04-01 10:00:00"
  }
}
```

### 3. 更新用户信息

**接口地址**: `PUT /user/update`

**请求体**:
```json
{
  "userId": 1,
  "nickname": "新昵称",
  "phone": "13800138000",
  "email": "user@example.com"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "更新成功"
}
```

### 4. 获取用户预约列表

**接口地址**: `GET /user/bookings`

**查询参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| userId | Integer | 是 | 用户ID |

**响应示例**: 同上"获取用户预约列表"

### 5. 获取用户统计数据

**接口地址**: `GET /user/stats`

**查询参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| userId | Integer | 是 | 用户ID |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "total_bookings": 12,
    "attended_count": 8,
    "study_hours": 16
  }
}
```

---

## 管理员接口 (`/admin`)

### 1. 获取仪表盘数据

**接口地址**: `GET /admin/dashboard`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalCourses": 25,
      "totalBookings": 156,
      "totalUsers": 89,
      "todayBookings": 12
    },
    "trends": {
      "weekly": [
        {
          "date": "2024-04-09",
          "count": 15
        }
      ],
      "categories": [
        {
          "name": "编程技术",
          "count": 10
        }
      ]
    }
  }
}
```

### 2. 获取所有课程（管理员视角）

**接口地址**: `GET /admin/courses`

**查询参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | Integer | 否 | 页码 |
| pageSize | Integer | 否 | 每页数量 |
| status | String | 否 | 课程状态(published/draft) |

**响应示例**:
```json
{
  "success": true,
  "list": [...],
  "pagination": {...}
}
```

### 3. 创建新课程

**接口地址**: `POST /admin/courses`

**请求体**:
```json
{
  "title": "新课程",
  "description": "课程描述",
  "categoryId": 1,
  "teacher": "讲师姓名",
  "location": "授课地点",
  "startTime": "2024-04-20 14:00:00",
  "endTime": "2024-04-20 16:00:00",
  "capacity": 30,
  "price": 299,
  "image": "https://..."
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "课程创建成功"
}
```

### 4. 更新课程

**接口地址**: `PUT /admin/courses/{id}`

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | Integer | 是 | 课程ID |

**请求体**: 可选的字段同创建课程

**响应示例**:
```json
{
  "success": true,
  "message": "课程更新成功"
}
```

### 5. 删除课程

**接口地址**: `DELETE /admin/courses/{id}`

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | Integer | 是 | 课程ID |

**响应示例**:
```json
{
  "success": true,
  "message": "课程删除成功"
}
```

### 6. 获取所有预约记录

**接口地址**: `GET /admin/bookings`

**查询参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | Integer | 否 | 页码 |
| pageSize | Integer | 否 | 每页数量 |
| status | String | 否 | 预约状态 |
| courseId | Integer | 否 | 课程ID |

**响应示例**:
```json
{
  "success": true,
  "list": [
    {
      "id": 1,
      "user_id": 1,
      "user_nickname": "张三",
      "user_phone": "138****8888",
      "course_id": 1,
      "course_title": "Python零基础入门到精通",
      "course_start_time": "2024-04-15 19:00:00",
      "course_end_time": "2024-04-15 21:00:00",
      "status": "confirmed",
      "check_in_status": "unchecked",
      "created_at": "2024-04-10 10:00:00"
    }
  ],
  "pagination": {...}
}
```

### 7. 获取用户列表

**接口地址**: `GET /admin/users`

**查询参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | Integer | 否 | 页码 |
| pageSize | Integer | 否 | 每页数量 |

**响应示例**:
```json
{
  "success": true,
  "list": [
    {
      "id": 1,
      "nickname": "张三",
      "avatar_url": "https://...",
      "role": "student",
      "phone": "138****8888",
      "email": "***@example.com",
      "booking_count": 5,
      "created_at": "2024-04-01 10:00:00"
    }
  ],
  "pagination": {...}
}
```

---

## 错误响应

所有接口的错误响应统一格式如下：

```json
{
  "success": false,
  "message": "错误描述信息"
}
```

常见HTTP状态码：

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 注意事项

1. 所有时间戳均为ISO 8601格式
2. 价格单位为元
3. 分页从1开始
4. 字段命名采用snake_case风格
5. 敏感信息如密码不会在响应中返回