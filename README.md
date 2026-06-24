# 刘看山小游戏乐园

一个为知乎项目广场准备的刘看山主题小游戏合集原型。第一版包含游戏大厅、贪吃蛇和扫雷，后续可以继续加入纸牌接龙、泡泡龙、连连看、消消乐。

## 本地运行

```powershell
npm install
npm run dev
```

## 发布构建

```powershell
npm run build
```

构建产物会生成在 `dist` 目录，可以按知乎项目广场的要求上传或部署。

## Netlify 部署

- Build command: `npm run build`
- Publish directory: `dist`
- 仓库内已包含 `netlify.toml`，从 GitHub 连接 Netlify 后通常会自动读取这些设置。

## 素材约定

- 主题图片副本放在 `public/assets`。
- `E:\liukanshan game` 仅作为参考目录，本项目不会修改其中任何文件。
- 后续替换官方素材时，优先保持现有文件名不变，避免改动代码路径。
