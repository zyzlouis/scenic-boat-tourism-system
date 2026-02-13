-- ================================================
-- 景区游船计时收费系统 - 数据库建表脚本
-- 数据库: MySQL 8.0
-- 字符集: utf8mb4
-- 排序规则: utf8mb4_unicode_ci
-- 创建时间: 2026-02-04
-- ================================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS boat_rental CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE boat_rental;

-- ================================================
-- 1. 用户表 (users)
-- ================================================
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `open_id` VARCHAR(128) NOT NULL COMMENT '微信OpenID',
  `union_id` VARCHAR(128) DEFAULT NULL COMMENT '微信UnionID',
  `nickname` VARCHAR(64) DEFAULT NULL COMMENT '微信昵称',
  `avatar_url` VARCHAR(512) DEFAULT NULL COMMENT '微信头像URL',
  `phone` VARCHAR(20) DEFAULT NULL COMMENT '手机号',
  `is_vip` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否VIP会员(0:否, 1:是)',
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记(0:未删除, 1:已删除)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_open_id` (`open_id`),
  KEY `idx_phone` (`phone`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ================================================
-- 2. 船型配置表 (boat_types)
-- ================================================
DROP TABLE IF EXISTS `boat_types`;
CREATE TABLE `boat_types` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '船型ID',
  `type_code` VARCHAR(32) NOT NULL COMMENT '船型编码(powered/unpowered)',
  `type_name` VARCHAR(64) NOT NULL COMMENT '船型名称',
  `description` VARCHAR(256) DEFAULT NULL COMMENT '船型描述',
  `max_capacity` INT NOT NULL DEFAULT 4 COMMENT '最大载客量(人数)',
  `image_url` VARCHAR(512) DEFAULT NULL COMMENT '船型图片URL',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序顺序',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用(0:禁用, 1:启用)',
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_type_code` (`type_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='船型配置表';

-- 插入初始船型数据
INSERT INTO `boat_types` (`type_code`, `type_name`, `description`, `max_capacity`, `sort_order`, `is_active`) VALUES
('powered', '有动力船', '配有电动马达，速度较快，适合远距离游玩', 4, 1, 1),
('unpowered', '无动力船', '脚踏或手划，速度较慢，适合悠闲游湖', 2, 2, 1);

-- ================================================
-- 3. 价格配置表 (pricing_config)
-- ================================================
DROP TABLE IF EXISTS `pricing_config`;
CREATE TABLE `pricing_config` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '价格配置ID',
  `boat_type_id` INT NOT NULL COMMENT '关联船型ID',
  `price_name` VARCHAR(64) NOT NULL COMMENT '价格方案名称',
  `base_price` DECIMAL(10,2) NOT NULL COMMENT '基础门票价格(元)',
  `deposit_amount` DECIMAL(10,2) NOT NULL COMMENT '押金金额(元)',
  `included_minutes` INT NOT NULL DEFAULT 60 COMMENT '包含时长(分钟)',
  `overtime_rate` DECIMAL(10,2) NOT NULL COMMENT '超时费率(元/分钟)',
  `cap_amount` DECIMAL(10,2) DEFAULT NULL COMMENT '封顶金额(元)',
  `effective_date` DATE DEFAULT NULL COMMENT '生效日期',
  `expiry_date` DATE DEFAULT NULL COMMENT '失效日期',
  `is_default` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否默认价格(0:否, 1:是)',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用(0:禁用, 1:启用)',
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_boat_type` (`boat_type_id`),
  KEY `idx_effective_date` (`effective_date`, `expiry_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='价格配置表';

-- 插入初始价格数据
INSERT INTO `pricing_config`
(`boat_type_id`, `price_name`, `base_price`, `deposit_amount`, `included_minutes`, `overtime_rate`, `cap_amount`, `is_default`, `is_active`)
VALUES
(1, '有动力船-平日价', 50.00, 100.00, 60, 1.00, 200.00, 1, 1),
(2, '无动力船-平日价', 30.00, 50.00, 60, 0.50, 100.00, 1, 1);

-- ================================================
-- 4. 船只表 (boats)
-- ================================================
DROP TABLE IF EXISTS `boats`;
CREATE TABLE `boats` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '船只ID',
  `boat_number` VARCHAR(32) NOT NULL COMMENT '船号',
  `boat_type_id` INT NOT NULL COMMENT '关联船型ID',
  `status` VARCHAR(20) NOT NULL DEFAULT 'idle' COMMENT '状态(idle:空闲, in_use:使用中, maintenance:维护中)',
  `last_used_at` DATETIME DEFAULT NULL COMMENT '最后使用时间',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用(0:禁用, 1:启用)',
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_boat_number` (`boat_number`),
  KEY `idx_boat_type` (`boat_type_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='船只表';

-- 插入初始船只数据（示例：10艘有动力船，15艘无动力船）
-- 有动力船 E-001 ~ E-010
INSERT INTO `boats` (`boat_number`, `boat_type_id`, `status`) VALUES
('E-001', 1, 'idle'), ('E-002', 1, 'idle'), ('E-003', 1, 'idle'), ('E-004', 1, 'idle'), ('E-005', 1, 'idle'),
('E-006', 1, 'idle'), ('E-007', 1, 'idle'), ('E-008', 1, 'idle'), ('E-009', 1, 'idle'), ('E-010', 1, 'idle');

-- 无动力船 P-001 ~ P-015
INSERT INTO `boats` (`boat_number`, `boat_type_id`, `status`) VALUES
('P-001', 2, 'idle'), ('P-002', 2, 'idle'), ('P-003', 2, 'idle'), ('P-004', 2, 'idle'), ('P-005', 2, 'idle'),
('P-006', 2, 'idle'), ('P-007', 2, 'idle'), ('P-008', 2, 'idle'), ('P-009', 2, 'idle'), ('P-010', 2, 'idle'),
('P-011', 2, 'idle'), ('P-012', 2, 'idle'), ('P-013', 2, 'idle'), ('P-014', 2, 'idle'), ('P-015', 2, 'idle');

-- ================================================
-- 5. 订单表 (orders)
-- ================================================
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '订单ID',
  `order_no` VARCHAR(32) NOT NULL COMMENT '订单号',
  `user_id` BIGINT NOT NULL COMMENT '关联用户ID',
  `boat_type_id` INT NOT NULL COMMENT '关联船型ID',
  `boat_id` INT DEFAULT NULL COMMENT '关联船只ID(发船后绑定)',
  `pricing_config_id` INT NOT NULL COMMENT '关联价格配置ID',
  `base_price` DECIMAL(10,2) NOT NULL COMMENT '基础票价(元)',
  `deposit_amount` DECIMAL(10,2) NOT NULL COMMENT '押金金额(元)',
  `included_minutes` INT NOT NULL DEFAULT 60 COMMENT '包含时长(分钟)',
  `overtime_rate` DECIMAL(10,2) NOT NULL COMMENT '超时费率(元/分钟)',
  `total_amount` DECIMAL(10,2) NOT NULL COMMENT '订单总额(元)',
  `verification_code` VARCHAR(64) DEFAULT NULL COMMENT '核销码',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '订单状态',
  `start_time` DATETIME DEFAULT NULL COMMENT '开始计时时间',
  `end_time` DATETIME DEFAULT NULL COMMENT '结束计时时间',
  `used_minutes` INT DEFAULT NULL COMMENT '实际使用时长(分钟)',
  `overtime_minutes` INT DEFAULT NULL COMMENT '超时时长(分钟)',
  `overtime_fee` DECIMAL(10,2) DEFAULT NULL COMMENT '超时费用(元)',
  `refund_amount` DECIMAL(10,2) DEFAULT NULL COMMENT '退款金额(元)',
  `final_amount` DECIMAL(10,2) DEFAULT NULL COMMENT '最终支付金额(元)',
  `remark` VARCHAR(512) DEFAULT NULL COMMENT '备注',
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `completed_at` DATETIME DEFAULT NULL COMMENT '完成时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  UNIQUE KEY `uk_verification_code` (`verification_code`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_boat_type_id` (`boat_type_id`),
  KEY `idx_boat_id` (`boat_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单表';

-- ================================================
-- 6. 支付记录表 (payments)
-- ================================================
DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '支付记录ID',
  `order_id` BIGINT NOT NULL COMMENT '关联订单ID',
  `payment_no` VARCHAR(64) NOT NULL COMMENT '支付流水号',
  `transaction_id` VARCHAR(64) DEFAULT NULL COMMENT '微信支付交易号',
  `amount` DECIMAL(10,2) NOT NULL COMMENT '支付金额(元)',
  `payment_method` VARCHAR(32) NOT NULL DEFAULT 'wechat' COMMENT '支付方式',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '支付状态(pending/success/failed)',
  `paid_at` DATETIME DEFAULT NULL COMMENT '支付完成时间',
  `callback_data` TEXT DEFAULT NULL COMMENT '微信支付回调数据(JSON)',
  `remark` VARCHAR(512) DEFAULT NULL COMMENT '备注',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payment_no` (`payment_no`),
  UNIQUE KEY `uk_transaction_id` (`transaction_id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付记录表';

-- ================================================
-- 7. 退款记录表 (refunds)
-- ================================================
DROP TABLE IF EXISTS `refunds`;
CREATE TABLE `refunds` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '退款记录ID',
  `order_id` BIGINT NOT NULL COMMENT '关联订单ID',
  `payment_id` BIGINT NOT NULL COMMENT '关联支付记录ID',
  `refund_no` VARCHAR(64) NOT NULL COMMENT '退款流水号',
  `refund_id` VARCHAR(64) DEFAULT NULL COMMENT '微信退款单号',
  `refund_amount` DECIMAL(10,2) NOT NULL COMMENT '退款金额(元)',
  `refund_reason` VARCHAR(256) DEFAULT NULL COMMENT '退款原因',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '退款状态(pending/success/failed)',
  `refunded_at` DATETIME DEFAULT NULL COMMENT '退款完成时间',
  `callback_data` TEXT DEFAULT NULL COMMENT '微信退款回调数据(JSON)',
  `remark` VARCHAR(512) DEFAULT NULL COMMENT '备注',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_refund_no` (`refund_no`),
  UNIQUE KEY `uk_refund_id` (`refund_id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_payment_id` (`payment_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='退款记录表';

-- ================================================
-- 8. 员工表 (staff)
-- ================================================
DROP TABLE IF EXISTS `staff`;
CREATE TABLE `staff` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '员工ID',
  `username` VARCHAR(32) NOT NULL COMMENT '用户名(登录账号)',
  `password` VARCHAR(128) NOT NULL COMMENT '密码(bcrypt加密)',
  `real_name` VARCHAR(32) NOT NULL COMMENT '真实姓名',
  `phone` VARCHAR(20) DEFAULT NULL COMMENT '手机号',
  `role` VARCHAR(20) NOT NULL DEFAULT 'staff' COMMENT '角色(staff:员工, admin:管理员)',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用(0:禁用, 1:启用)',
  `last_login_at` DATETIME DEFAULT NULL COMMENT '最后登录时间',
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  KEY `idx_phone` (`phone`),
  KEY `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='员工表';

-- 插入初始员工数据（密码需要在应用层用bcrypt加密后插入）
-- 这里仅提供示例，实际密码应该是bcrypt哈希值
-- 默认管理员账号: admin / admin123
-- 默认员工账号: staff01 / staff123
INSERT INTO `staff` (`username`, `password`, `real_name`, `role`) VALUES
('admin', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36Zf/Zk8K8K8K8K8K8K8K8K8', '系统管理员', 'admin'),
('staff01', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36Zf/Zk8K8K8K8K8K8K8K8K8', '张三', 'staff');
-- 注意: 上面的密码哈希是示例，实际使用时需要用真实的bcrypt哈希值

-- ================================================
-- 9. 核销记录表 (verification_logs)
-- ================================================
DROP TABLE IF EXISTS `verification_logs`;
CREATE TABLE `verification_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '核销记录ID',
  `order_id` BIGINT NOT NULL COMMENT '关联订单ID',
  `staff_id` INT NOT NULL COMMENT '关联员工ID',
  `boat_id` INT DEFAULT NULL COMMENT '关联船只ID',
  `action_type` VARCHAR(20) NOT NULL COMMENT '操作类型(start:发船, end:收船)',
  `scan_time` DATETIME NOT NULL COMMENT '扫码时间',
  `remark` VARCHAR(512) DEFAULT NULL COMMENT '备注',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_staff_id` (`staff_id`),
  KEY `idx_action_type` (`action_type`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='核销记录表';

-- ================================================
-- 10. 计时记录表 (timing_records)
-- ================================================
DROP TABLE IF EXISTS `timing_records`;
CREATE TABLE `timing_records` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '计时记录ID',
  `order_id` BIGINT NOT NULL COMMENT '关联订单ID',
  `boat_id` INT NOT NULL COMMENT '关联船只ID',
  `start_time` DATETIME NOT NULL COMMENT '开始计时时间',
  `end_time` DATETIME DEFAULT NULL COMMENT '结束计时时间',
  `used_seconds` INT DEFAULT NULL COMMENT '实际使用秒数',
  `used_minutes` INT DEFAULT NULL COMMENT '实际使用分钟数(向上取整)',
  `overtime_minutes` INT DEFAULT NULL COMMENT '超时分钟数',
  `overtime_fee` DECIMAL(10,2) DEFAULT NULL COMMENT '超时费用(元)',
  `is_abnormal` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否异常(0:正常, 1:异常)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_id` (`order_id`),
  KEY `idx_boat_id` (`boat_id`),
  KEY `idx_is_abnormal` (`is_abnormal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='计时记录表';

-- ================================================
-- 数据库初始化完成
-- ================================================

-- 查看所有表
SHOW TABLES;

-- 验证数据
SELECT * FROM boat_types;
SELECT * FROM pricing_config;
SELECT * FROM boats;
SELECT * FROM staff;
