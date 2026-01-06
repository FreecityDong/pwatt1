# Vite + React + TypeScript + PWA（Windows）超详细部署流程（含局域网 HTTPS + 安卓安装）

> 目标：在 **Windows** 上开发 **Vite + React + TypeScript** 项目，接入 **vite-plugin-pwa**，并通过 **mkcert** 在局域网启用 **HTTPS**，最终在 **安卓手机**上以“应用（App）”方式安装运行（显示“正在应用内运行”），且 **Service Worker 正常激活**。

---

## 目录

1. 总览：你最终会得到什么  
2. 环境准备（Windows）  
3. 创建 Vite + React + TS + SWC 项目  
4. 安装与配置 PWA（vite-plugin-pwa）  
5. 注册 Service Worker（关键）  
6. 解决 TypeScript `virtual:pwa-register` 类型问题  
7. 准备 PWA 图标与 Manifest 校验  
8. 生产构建与本地预览（preview）  
9. 局域网 HTTPS：mkcert 全流程（Windows + 安卓）  
10. 让 Vite Preview 使用 HTTPS 证书  
11. 安卓端访问与“真安装”步骤（避免快捷方式）  
12. 验证：SW 是否激活、是否离线可开  
13. 常见错误与排查清单（对照表）  
14. 推荐的目录/脚本优化（可选）  

---

## 1. 总览：你最终会得到什么

完成后你将拥有：

- ✅ Windows 本地开发环境（Node + npm）  
- ✅ 一个 Vite + React + TypeScript + SWC 项目  
- ✅ PWA 能力（manifest + icons + service worker 缓存）  
- ✅ 通过局域网 IP 使用 **HTTPS** 访问（mkcert 证书）  
- ✅ 安卓 Chrome 显示 **“安装应用”**，安装后 **无地址栏**  
- ✅ Chrome 提示 **“正在应用内运行”**  
- ✅ DevTools Application 面板中 Service Worker 显示 **activated and running**  
- ✅ 离线（断网）仍能打开页面“壳”（App Shell）

---

## 2. 环境准备（Windows）

### 2.1 安装 Node.js

建议版本：Node 18+（推荐 Node 20）。

安装后打开 PowerShell 或 CMD 验证：

```powershell
node -v
npm -v
```

应输出类似：

- `v20.x.x`
- `10.x.x`

> 若提示找不到 `node` 或 `npm`：说明 PATH 未正确配置，需重新安装 Node 或手动加入 PATH（`C:\Program Files\nodejs\`）。

---

### 2.2（可选）解决 PowerShell 执行策略导致 npm.ps1 无法运行

若执行 npm 时出现类似：

- `... npm.ps1 ... cannot be loaded because running scripts is disabled ...`

执行：

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

出现提示输入 `Y` 确认。

验证：

```powershell
Get-ExecutionPolicy -Scope CurrentUser
```

应为 `RemoteSigned`。

---

### 2.3 建议安装工具（可选但强烈推荐）

- VS Code（开发编辑器）
- Git（拉取代码/管理版本）

---

## 3. 创建 Vite + React + TS + SWC 项目

在你要放项目的目录执行：

```powershell
npm create vite@latest pwatt1
```

交互选择：

- Framework：**React**
- Variant：**TypeScript + SWC**

进入目录并安装依赖：

```powershell
cd pwatt1
npm install
```

启动开发服务器（先确认能跑起来）：

```powershell
npm run dev
```

浏览器打开提示的地址（通常 `http://localhost:5173/`），看到页面即 OK。

---

## 4. 安装与配置 PWA（vite-plugin-pwa）

### 4.1 安装插件

在项目根目录执行：

```powershell
npm i -D vite-plugin-pwa
```

---

### 4.2 配置 `vite.config.ts`

打开 `vite.config.ts`，加入 `VitePWA` 插件配置。示例（可直接用）：

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 让 SW 自动更新
      registerType: 'autoUpdate',

      // 你可以先用默认 generateSW；后续需要更细缓存策略再调 workbox
      strategies: 'generateSW',

      // 强制注入注册脚本（可提高“可安装性”稳定性）
      injectRegister: 'script',

      manifest: {
        name: 'My PWA App',
        short_name: 'MyPWA',
        start_url: '/',
        scope: '/',
        id: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#111827',
        orientation: 'portrait',

        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          // 可选：maskable 图标（安卓更好看）
          // { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },

      // 缓存静态资源（PWA 离线“壳”）
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,json}'],
      },
    }),
  ],
})
```

---

## 5. 注册 Service Worker（关键步骤）

仅配置插件还不够，建议在入口手动注册（你已做过）。

编辑 `src/main.tsx`，确保存在：

```ts
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })
```

一个完整示例：

```ts
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

---

## 6. 解决 TypeScript `virtual:pwa-register` 类型问题

如果 `npm run build` 报错：

- `Cannot find module 'virtual:pwa-register' ...`

创建/编辑 `src/vite-env.d.ts`：

```ts
/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
```

---

## 7. 准备 PWA 图标与 Manifest 校验

### 7.1 放置图标文件

在项目中创建：

```
public/icons/icon-192.png
public/icons/icon-512.png
```

要求：

- PNG 格式
- 尺寸分别 **192x192**、**512x512**
- 文件名必须与 `manifest.icons.src` 一致

---

### 7.2 校验 manifest 是否可访问

启动后（preview 或 dev 都可）在浏览器访问：

- `http://localhost:5173/manifest.webmanifest`（dev）  
- 或 `http://localhost:4173/manifest.webmanifest`（preview）  

应能看到 JSON 内容（不应 404）。

---

## 8. 生产构建与本地预览（preview）

> PWA 的 SW 与“安装应用”在 **生产预览** 下最可靠。

执行：

```powershell
npm run build
npm run preview -- --host 0.0.0.0 --port 4173
```

说明：

- `--host 0.0.0.0`：允许局域网设备访问
- `--port 4173`：固定端口便于手机访问

---

## 9. 局域网 HTTPS：mkcert 全流程（Windows + 安卓）

> 关键点：`http://192.168.x.x` 不是安全上下文，很多 PWA/SW/蓝牙能力需要 **HTTPS**（或 `localhost` 例外）。  
> 要让手机通过 IP 访问也具备 HTTPS，必须：  
> 1）Windows 生成证书  2）手机信任根证书  3）证书包含该 IP（SAN）

---

### 9.1 安装 mkcert

方式 A：winget（推荐）

```powershell
winget install FiloSottile.mkcert
```

验证：

```powershell
mkcert -version
```

---

### 9.2 安装本地根证书（Windows）

```powershell
mkcert -install
```

---

### 9.3 找到 mkcert 根证书目录（用于传到手机）

```powershell
mkcert -CAROOT
```

在该目录中找到 `rootCA.pem`。

---

### 9.4 将 `rootCA.pem` 传到安卓手机

方式任选：

- 微信文件传输助手
- 数据线拷贝
- 网盘/局域网共享

---

### 9.5 安卓安装 CA 证书（必须）

在安卓手机：

- 设置 → 安全 → 加密与凭据 → 安装证书 → **CA 证书** → 选择 `rootCA.pem`

> 注意：一定是 **CA 证书**，不是“VPN 与应用”之类的用户证书。

安装后建议：

- 重启 Chrome（或重启手机更稳）
- 清理该站点旧缓存（可选）

---

### 9.6 生成包含“局域网 IP”的站点证书（SAN 必须包含 IP）

先查你的电脑 IPv4：

```powershell
ipconfig
```

找到例如 `192.168.110.174`。

在项目根目录执行（把 IP 替换成你的实际值）：

```powershell
mkcert 192.168.110.174 localhost 127.0.0.1
```

生成两个文件（名字可能略不同）：

- `192.168.110.174+2.pem`
- `192.168.110.174+2-key.pem`

---

## 10. 让 Vite Preview 使用 HTTPS 证书

在 `vite.config.ts` 里引入 `fs` 并配置 `preview.https`：

```ts
import fs from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      injectRegister: 'script',
      manifest: {
        name: 'My PWA App',
        short_name: 'MyPWA',
        start_url: '/',
        scope: '/',
        id: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#111827',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],

  preview: {
    host: true,
    port: 4173,
    https: {
      cert: fs.readFileSync('./192.168.110.174+2.pem'),
      key: fs.readFileSync('./192.168.110.174+2-key.pem'),
    },
  },
})
```

> 注意：`readFileSync` 路径要与证书文件实际名称一致。  
> 最简单做法：把 pem/key 放在项目根目录，与 `vite.config.ts` 同级。

---

## 11. 安卓端访问与“真安装”步骤（避免快捷方式）

### 11.1 启动生产预览

```powershell
npm run build
npm run preview
```

确保显示正在监听 `4173`。

---

### 11.2 手机访问（必须是 https）

在安卓 Chrome 打开：

```
https://192.168.110.174:4173/
```

如果仍提示不安全：

- 证书未装到手机（rootCA.pem）
- 或证书不包含该 IP（SAN 不匹配）
- 或访问的 IP 变了（电脑换网/IP 变化，需要重新签发）

---

### 11.3 安装应用（Chrome）

打开页面后等待 2–5 秒，然后：

- Chrome 右上角菜单（三点）
- 选择 **安装应用 / Install app**

安装成功后：

- 无地址栏（standalone）
- 可能提示 **“正在应用内运行”**

> 若只有“添加到主屏幕”（快捷方式），通常是 PWA 条件未满足（见第 13 章排查）。

---

## 12. 验证：SW 是否激活、是否离线可开

### 12.1 检查 SW 是否激活

电脑端 Chrome 打开同一地址（https），打开 DevTools：

- Application → Service Workers

你应看到：

- Status: **activated and running**
- Scope: `https://192.168.110.174:4173/`

---

### 12.2 验证离线可开（App Shell）

步骤：

1. 手机打开 App 一次（让缓存完成）
2. 开启飞行模式 / 断网
3. 从桌面图标启动 App

期望：

- 能打开页面“壳”（界面加载出来）
- 如果你的业务数据来自网络，数据可能为空，但页面应能打开

---

## 13. 常见错误与排查清单（对照表）

### 13.1 手机总提示“连接不安全”
- ✅ 手机是否已安装 `rootCA.pem` 为 **CA 证书**
- ✅ 证书是否包含访问 IP（SAN）
- ✅ 手机访问的 IP 是否与证书一致（IP 变了需要重新 mkcert）
- ✅ 手机时间是否正确（自动时间）

---

### 13.2 Service Worker 面板为空 / `navigator.serviceWorker` 为 undefined
- ✅ 是否在 **HTTPS** 下访问（或 localhost 例外）
- ✅ 是否是 **preview（生产预览）** 而不是 dev
- ✅ 是否已注册 `registerSW(...)`
- ✅ 是否清理旧缓存（Application → Storage → Clear site data）

---

### 13.3 只能“添加到主屏幕”而不是“安装应用”
- ✅ SW 是否 activated
- ✅ manifest 是否可访问（`/manifest.webmanifest`）
- ✅ icons 是否存在且尺寸正确
- ✅ 等待几秒再打开菜单（浏览器需要判定可安装性）
- ✅ 建议在 **HTTPS** 下再测 Edge/Chrome（成功率最高）

---

### 13.4 `npm run preview` 只有 Local，没有 Network
- 不是问题；你可以手动用 `ipconfig` 查 IPv4
- 或使用：
  ```powershell
  npm run preview -- --host 0.0.0.0
  ```

---

### 13.5 Windows 防火墙导致手机打不开
- 第一次运行 node 监听端口时，Windows 会弹“允许访问网络”
- 勾选 **专用网络** 并允许
- 或手动放行端口 `4173`

---

## 14. 推荐的目录/脚本优化（可选）

### 14.1 添加一个方便的脚本命令（package.json）

```json
{
  "scripts": {
    "build:preview": "npm run build && vite preview --host 0.0.0.0 --port 4173"
  }
}
```

以后只需：

```powershell
npm run build:preview
```

---

### 14.2 建议固定 IP（可选）
如果你电脑 IP 经常变（DHCP），证书会不匹配。可考虑：

- 在路由器给电脑 MAC 绑定固定 IP
- 或每次 IP 变更后重新 `mkcert <new-ip> ...`

---

## 完成 ✅

你现在已经具备：

- 局域网 HTTPS 调试  
- 真 PWA 安装（非快捷方式）  
- Service Worker 正常运行  
- 离线壳可用  

后续你可以继续做：

- React Router + 底部 Tab（App 外壳）
- IndexedDB 本地数据
- Web Bluetooth（安卓）
- 线上 HTTPS 部署（Vercel/Netlify）避免局域网证书流程

---

## 人脸识别与图片处理功能（拍照后替换背景/打马赛克）

### 功能概览
- 拍照：点击“打开摄像头”→“拍照”捕获一帧并停止摄像头。
- 人脸检测：使用浏览器的 `FaceDetector` API 识别人脸。
- 图片处理：
  - “一键替换背景”：用纯色背景填充整张图，仅保留人脸区域。
  - “人脸打马赛克”：对检测到的人脸区域做块状马赛克。
- 状态提示：检测中/处理中的提示；未检测到人脸或浏览器不支持时，效果按钮禁用并提示原因。

### 兼容性与限制
- 依赖 `FaceDetector` API：Android Chrome 108+ 支持；iOS Safari 暂不支持。若不支持，会提示“当前浏览器不支持人脸检测”。
- 根据相关信息，安卓版Chrome浏览器在v70版本中开始引入Shape Detection API，其中包含了人脸检测功能2。该版本于2024年9月发布Beta版，标志着Chrome浏览器在安卓平台上正式支持人脸检测能力。
具体实现方面，Chrome通过Shape Detection API提供人脸检测功能，开发者可以使用FaceDetector接口来实现人脸检测功能17。在实际使用中，需要开启chrome://flags/#enable-experimental-web-platform-features功能来启用相关API1。
- 需在 HTTPS 或 localhost 环境调用摄像头。

### 移动端使用步骤
1) 访问 HTTPS 站点或已安装的 PWA，点击“打开摄像头”，授予权限。
2) 点击“拍照”，等待人脸检测完成。
3) 若检测到人脸，可选择：
   - “一键替换背景”：替换为深色纯色背景，保留人脸。
   - “人脸打马赛克”：对人脸区域加马赛克。
4) 未检测到人脸时，可重新拍摄，或更换支持 FaceDetector 的浏览器/设备。
