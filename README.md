# Yon ying · 自己写的小工具

一个纯白、极简的单页导航，把自己的开源项目、下载和联系方式摆在一起，可以直接发给别人。

## 怎么打开

- **自己看**：双击 `index.html`，不用联网、不用服务器。
- **发人**：整个文件夹打包发过去，对方解压双击就行。
- **挂网上**：把 `index.html` 和 `assets/` 一起传到静态托管（GitHub Pages / Vercel / Netlify / Cloudflare Pages 都行）。

## 文件结构

```
index.html              页面本体（样式和脚本都在里面，没有任何外部依赖）
assets/avatar.jpg       头像（480×480，已裁成正方形）
assets/icons/           5 个项目图标 + 3 个 SVG
  xiaoxia.svg           小匣        ┐
  bootanim.svg          开机动画    ├ 这三个是画的（源码里没有图标）
  kotlin-plugin.svg     Kotlin      ┘
  st-manager.png        ST 管理器   ┐ 这两个取自项目源码 res/mipmap/ic_launcher.png
  yoyo-iade.png         YoYo iade   ┘
README.md               本文件
```

## 关于图标（重要）

翻过源码了，五个项目里**只有两个真的图标**：

- `yoyoiade/res/mipmap/ic_launcher.png` ✔
- `ST管理器/res/mipmap/ic_launcher.png` ✔（其实是 1.7 MB 的 JPEG，已压到 256px）

另外三个没有：

- `小匣/res/mipmap/` 是**空目录**（它的图标是 `IconLib` 用代码画的，没有 PNG）
- `一键制作开机动画/res/mipmap/` 也是空的
- `KotlinPlugin` 根本没有 res/mipmap

所以这三个是按同一套风格补的：圆角方块 + 渐变 + 白色图形（蓝色星芒＝AI、橙红播放键＝视频、Kotlin 官方标志）。
**如果你从 APK 里抠出真图标，或者用豆包生成了更满意的图**，
直接替换同名文件即可，页面不用改一行：

- 想用 PNG/JPG：命名成 `xiaoxia.png` / `bootanim.png` / `kotlin-plugin.png`，
  再把 `index.html` 里对应的 `.svg` 改成 `.png`（搜 `assets/icons/` 就能看到 4 处）。
- 想保持 SVG：把豆包生成的图转成 SVG，或者直接把 PNG 放进 assets 再改引用。

## 页面内容

- 头像 + 一句自我介绍
- 五个项目卡片：小匣、ST 管理器、YoYo iade、一键制作开机动画、Kotlin 编译插件，
  外加一张「全都在这儿」的 GitHub 入口
- 分段筛选：全部 / 装手机上的 / 写代码用的
- 下载列表：env.zip 编译环境（194 MiB）、Releases、FQA 文档、smali 手册、语法高亮配置
- 联系方式：QQ 群 `282592755`、邮箱 `2667900199@qq.com`，都能一键复制

## 怎么改

全在 `index.html` 里，不用编译：

| 想改 | 改哪里 |
| --- | --- |
| 名字、自我介绍 | 搜 `Yon ying`（出现 3 处）和 `白天上班` |
| 大标题 | `<h1>自己写的小工具<br><em>都放这儿了</em></h1>` |
| 联系方式 | 搜 `282592755`、`2667900199@qq.com` |
| 卡片文案 | 搜 `<!-- 卡片 -->` 附近的 `<article class="card">`，照格式复制一份就是新卡片 |
| 主色 | `:root` 里的 `--blue` / `--link` |
| 头图 | 换 `assets/avatar.jpg`（建议正方形，≥480px） |

## 几个实现说明

- **只有浅色**：`<meta name="color-scheme" content="light only">` 已经锁死，系统开深色模式也不会变黑。
- **零依赖**：没有 CDN、没有外部字体、没有框架，断网照常显示。
- **入场动画是纯 CSS**：即使 JS 报错或者被禁用，内容也不会停在透明状态。
- **图形**：页面上所有小图标（邮件、复制、箭头）来自开源图标库 Lucide（MIT），
  直接内联成 SVG 路径，不额外加载文件。
- **复制按钮**：`file://` 打开时 Clipboard API 不可用，会自动退回 `execCommand`。
