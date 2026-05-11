# JinLin

这是一个静态个人网页原型，内容从 `data/moments.json` 读取。页面名字已经设置为 `JinLin`。

## 修改内容

最简单的方法是在网页右上角点 `新增`，直接填写内容并上传图片。

如果已经配置云端数据库，发布后家人刷新同一个网址就能看到。未配置云端时，内容会保存在当前浏览器里。

编辑面板里可以做这些事：

- `发布`：把新内容放到首页最前面
- `导出备份`：把你在网页里新增的内容导出成 JSON 文件
- `导入备份`：把之前导出的 JSON 文件重新放回页面
- `清空新增`：只清空浏览器里新增的内容，不会删除原始示例卡片

也可以直接在 `data/moments.json` 里新增或修改卡片：

- `category` 可用：`旅行`、`作品`、`碎碎念`、`给作者的留言`
- `type` 可用：`photo`、`note`、`work`、`link`
- `image` 可以换成你自己的图片路径，例如 `assets/my-trip.jpg`
- `url` 只在收藏链接类卡片里需要

## 本地预览

在这个目录启动静态服务器：

```sh
python3 -m http.server 4173
```

然后打开：

```txt
http://localhost:4173
```

## 让网址带上 jinlin

上线时可以选一种方式：

- GitHub Pages：仓库名设为 `jinlin`，网址通常会是 `https://你的用户名.github.io/jinlin/`
- Vercel / Netlify：项目名设为 `jinlin`，如果名字没被占用，可能得到 `https://jinlin.vercel.app` 或类似网址
- 独立域名：购买类似 `jinlin.com`、`jinlin.me`、`jinlin.site` 的域名，再绑定到这个静态网页

## 接入云端数据库

当前代码已经支持 Supabase。配置后，发布内容会写入云端数据库。

1. 去 Supabase 新建项目
2. 打开 SQL Editor
3. 粘贴并运行 `supabase-schema.sql`
4. 在 Supabase 的 Project Settings / API 里复制：
   - Project URL
   - anon public key
5. 打开 `cloud-config.js`，改成：

```js
window.JINLIN_CLOUD = {
  enabled: true,
  provider: "supabase",
  url: "你的 Project URL",
  anonKey: "你的 anon public key",
  table: "moments"
};
```

这个简单版本允许知道网址的人发布内容，适合家人留言和个人轻量使用。以后如果需要“只有你能发布，家人只能看和留言”，可以再加登录权限。
