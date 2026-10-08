# HoloCard

**中文** | [English](README.en.md)

将描述或参考图片制作成可交互的 3D 全息卡片，输出独立网页与可编辑的 Blender 工程。支持作为 Agent Skill 使用，也可通过命令行构建。

![DeepSeek 娘 · 蓝银浮雕卡，网页效果旋转与翻面演示](https://raw.githubusercontent.com/Leisurely-Cloud/HoloCard/main/assets/holocard-demo.gif?v=deepseek-smooth20)

## 功能

- 分层视差与浮雕构图，支持主体、特效和文字破框。
- 珠光、银箔、烫金和原画材质，可调整光泽与景深。
- 根据图片风格设计配色、字体、边框和主题背面。
- 鼠标与触摸旋转、缩放、翻面，支持 PNG 截图和 JSON 参数导入导出。

## 安装

需要 Python 3.9+、Node.js 22+ 与 npm。Blender 建议使用 4.5 LTS，可由流水线自动下载，也可通过 `--blender` 指定已有程序；浏览器验证需要 Chrome 或 Edge。

```bash
git clone https://github.com/Leisurely-Cloud/HoloCard.git holocard
cd holocard
python -m pip install Pillow numpy
```

也可[下载 Skill 安装包](https://github.com/Leisurely-Cloud/HoloCard/releases/latest)，解压后将 `holocard` 文件夹放入宿主的技能目录，并让宿主读取 [SKILL.md](SKILL.md)。首次下载 Blender 和安装网页依赖需要联网。

## 使用

向支持执行命令和查看图片的 Agent 提供参考图，并描述制作要求：

```text
使用 holocard，把这张图片做成全息闪卡。
配色、字体、材质和背面与图片风格匹配，标题“权威”，编号 No.001。
```

图片分析与设计由 Agent 完成，网页支持手动调整效果。

### 命令行构建

在仓库外创建 `../card-project`，将[配置示例](references/config.example.json)保存为 `card-config.json`，并在 `assets/` 中准备素材：

| 文件 | 用途 |
| --- | --- |
| `subject.png` | 透明主体 |
| `background.png` | 不透明背景 |
| `lineart.png` | 与主体对齐的白底黑色线稿 |
| `text.png` | 透明文字，可省略并由配置生成 |
| `effects.png`、`back.png` | 可选的透明特效与不透明背面 |

所有图片尺寸一致，建议 1024 × 1536。具体要求见[素材说明](references/art-direction.md)。在仓库根目录执行：

```bash
python scripts/run_pipeline.py --project ../card-project
node ../card-project/web/server.mjs
```

打开 [http://127.0.0.1:4173](http://127.0.0.1:4173)。输出包含 `card.blend`、`web/` 网页和 `renders/` 预览图。

## 文档

- [图片风格匹配](references/style-matching.md)
- [背面与浮雕配置](references/backs-and-relief.md)
- [开发与参数保存](references/development.md)
- [验证流程](references/verification.md)

## 许可证

代码采用 [MIT License](LICENSE)。图片和第三方素材的使用权由其各自的许可决定。
