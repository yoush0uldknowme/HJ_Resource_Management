# 电机试点系统设计说明

## 目标

建设一个基于局域网访问的网页试点系统，优先支撑电机管理场景，完成建档、编码、条码生成、入库、出库、查询、留痕的最小闭环。

## 已确认范围

- 形态：局域网网页系统
- 终端：电脑优先，手机自适应访问
- 用户：仓库管理员、普通使用人
- 粒度：一台电机一条记录
- 标签：第一版只生成条码/二维码图片，不做系统内一键打印

## 第一版功能

### 仓库管理员

- 登录
- 新建电机档案
- 自动生成内部编码
- 上传电机照片
- 生成并查看条码图片
- 电机入库
- 电机出库
- 查看电机详情与操作记录

### 普通使用人

- 登录
- 查看电机列表
- 搜索电机
- 查看电机状态、照片、详情与历史记录

## 页面结构

1. 登录页
2. 首页概览
3. 电机列表页
4. 新建电机页
5. 电机详情页
6. 入库页
7. 出库页
8. 操作记录页

## 数据模型

### motors

- id
- motor_code
- name
- model
- brand
- sn_code
- batch_no
- supplier
- purchase_date
- status
- current_location
- remark
- created_by
- created_at
- updated_at

### motor_photos

- id
- motor_id
- photo_path
- photo_type
- uploaded_by
- uploaded_at

### motor_transactions

- id
- motor_id
- transaction_type
- operator
- target_person
- location
- purpose
- remark
- created_at

### users

- id
- username
- password_hash
- role
- is_active
- created_at

## 业务规则

- 电机编码格式：`MTR-YYYYMM-XXXX`
- 一台电机一条记录
- 第一版主状态：`在库`、`已领用`
- 预留状态：`维修中`、`已报废`
- 入库创建 `inbound` 流水并将状态更新为 `在库`
- 出库创建 `outbound` 流水并将状态更新为 `已领用`

## 技术方案

- 前端：Next.js App Router
- 后端：Next.js Route Handlers
- 数据：SQLite
- ORM：Prisma
- 样式：Tailwind CSS
- 条码：二维码或条码图片生成库
- 图片：本地上传目录存储

## 验收标准

1. 能创建电机档案
2. 能自动生成唯一编码
3. 能展示条码或二维码图片
4. 能上传并查看电机照片
5. 能完成入库
6. 能完成出库
7. 能按编码、型号、SN、状态查询
8. 能查看单个电机完整历史记录

## 当前结论

第一阶段不做完整资源平台，只做电机试点系统，先把真实业务闭环跑通，再扩展到其他物资模块。
