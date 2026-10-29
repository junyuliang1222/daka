# 打卡 · 个人每日打卡 PWA

一个只属于自己的打卡应用。纯 HTML + CSS + JavaScript，**没有任何依赖、不需要构建**，改完刷新就生效。

## 目录结构

```
index.html              入口，含 iOS 全屏 / 主屏幕图标等配置
manifest.webmanifest    PWA 清单
sw.js                   离线缓存（仅在 https 或 localhost 生效）
icon.svg               矢量图标
apple-touch-icon.png    iOS 主屏幕图标（512×512）

src/
├── main.js             应用主控：状态、打卡动作、渲染调度
├── dom.js              el() 构建工具、图标、进度环
├── styles.css          iOS 原生极简设计系统（含深色模式）
├── lib/
│   ├── date.js         日期
│   ├── color.js        颜色
│   ├── stats.js        连续天数 / 累计 / 完成率 / 奖励进度
│   ├── store.js        本地存储、导入导出、示例数据
│   └── encourage.js    鼓励语挑选（里程碑 > 自己的池 > 兜底）
└── views/
    ├── today.js        今日页（含奖励解锁提示条）
    ├── stats.js        进度页（热力图 + 统计 + 每个事项的月历与奖励）
    ├── editor.js       新建 / 编辑事项弹层
    └── settings.js     设置（备份）
```

## 界面结构

底部只有两个标签页：

- **今日**：待完成 / 已完成清单、打卡与撤销；有奖励解锁时顶部会出现提示条
- **进度**：**打卡总览月历**、四项汇总统计，以及**每个事项一张月历卡**——
  做到的日子涂上该事项的主题色，做了但没达标的日子浅色，漏掉的日子灰色，
  月历下方直接挂该事项的奖励（进度 + 领取）

### 打卡总览月历

每一天是一个 **3×3 九宫格**，完成 1 个事项就涂亮 1 格，用的是该事项自己的主题色，
所以一眼能看出这天做了哪几项：

```
 1  ▪▪▪     2  ▪▪▪     3  ▪▪▪
    ▪▪▪▪     ▪▪▪▪     ▪▪▪▪
    ▪▪▪▪     ▪▪▪▪     ▪▪▪▪
```

- 灰格 = 还没填满的容量；透明格 = 还没到的日子
- 今天那格有蓝色描边
- 月份切换在页面顶部，同时控制总览月历和下面各事项的月历
- 想改格子数量（比如只有 4 个事项时用 2×2）：改 `src/views/stats.js` 里的 `SLOTS`

奖励不再是独立页面，因为它本质上是某个事项的属性，现在跟着事项走。

## 本地运行

```bash
python3 -m http.server 5173 --bind 0.0.0.0
```

然后浏览器打开 <http://localhost:5173>

### 手机上查看（同一 Wi-Fi）

1. 先查电脑的局域网 IP：

```bash
ipconfig getifaddr en0
```

2. iPhone 的 Safari 打开 `http://<你的IP>:5173`

> 注意：局域网是 http，不是 https。页面和打卡都能正常用，但「添加到主屏幕」和离线缓存的完整体验需要 https，所以正式使用要按下面的方式部署。

## 部署（已完成）

线上地址：**https://junyuliang1222.github.io/daka/**

仓库：https://github.com/junyuliang1222/daka （公开仓库，只放代码，不含任何打卡数据）

部署方式：GitHub Actions 自动部署

- 工作流文件：`.github/workflows/pages.yml`
- Pages 的 Source 设置为 `GitHub Actions`
- **以后只要 `git push` 到 main，大约 1 分钟后线上自动更新**，不用再做任何配置

```bash
git add .
git commit -m "改了什么"
git push
```

### iPhone 安装成 App

1. Safari 打开 https://junyuliang1222.github.io/daka/
2. 点底部分享按钮（方框加向上箭头）
3. 选「添加到主屏幕」
4. 命名为「打卡」→ 添加

装好之后：桌面有独立图标、全屏无地址栏、断网也能打开、数据存在手机本地。

### 如果以后要换托管

代码是纯静态的，整个目录可以原样丢到任何静态托管（Cloudflare Pages、Netlify、Vercel）。
所有资源都用相对路径（`./src/...`），所以放在仓库子路径下（`/daka/`）也能正常工作，不需要改任何代码。

## 数据说明

- 打卡数据只存在本机的 localStorage，键名 `habit-checkin:v1`，不会上传到任何服务器
- 设置页可以导出 JSON 备份、从备份恢复
- 建议定期导出备份（存到「文件」App 或发给自己），防止 iOS 清理网页数据

## 想改点什么

| 想改 | 去哪改 |
| --- | --- |
| 配色、圆角、字号 | `src/styles.css` 顶部的 CSS 变量 |
| 全局兜底鼓励语 | `src/lib/encourage.js` 的 `GLOBAL_LINES` |
| 首次打开的示例数据 | `src/lib/store.js` 的 `createSeedData()` |
| 打卡逻辑 / 连续天数算法 | `src/lib/stats.js` |
| 月历格子样式 | `src/styles.css` 的 `.cal-cell` / `.oc-sq` 系列 |
| 九宫格行列数 | `src/views/stats.js` 的 `SLOTS` 常量 |
