# RuiC Card Skill

**中文** | [English](README.en.md)

基于 Blender 与 Three.js 的交互式全息卡片生成工具。项目提供 Agent Skill、分层素材校验、场景构建、网页打包与浏览器验证流程，输出可编辑的 Blender 工程和可独立运行的卡片展示页面。

本仓库由 [Leisurely-Cloud](https://github.com/Leisurely-Cloud) 维护，基于 [HRuiCcc/RuiC-card-skill](https://github.com/HRuiCcc/RuiC-card-skill) 开发。

## 功能

| 功能 | 说明 |
| --- | --- |
| 分层视差 | 根据观察角度调整主体、背景与特效的相对位置 |
| 浮雕模式 | 将人物、特效与标题拆分为独立几何层，支持破框构图 |
| 全息材质 | 提供珠光、银箔、烫金和原画显示模式，可调整光泽 |
| 主题背面 | 支持独立背面插画，并在网页中排版标题、编号与系列信息 |
| 交互控制 | 支持鼠标与触摸旋转、双指缩放、翻面、景深调整及 PNG 截图下载 |
| 界面配置 | 支持品牌名称、部分配色参数及移动端布局 |
| 可编辑输出 | 保留分层 PNG、卡片配置、Blender 场景与网页资源 |
| 自动验证 | 检查网页交互、资源加载、截图下载、窄屏布局与减弱动态效果设置 |

## 效果演示

下图来自上游项目，用于展示卡片旋转与分层效果；实际外观取决于素材、配置和渲染环境。

![上游项目的分层卡片演示](assets/demo-after.gif)

[查看演示视频](assets/demo-after.mp4)

## 环境要求

| 组件 | 用途与要求 |
| --- | --- |
| Python | 3.9 或更高版本，安装 Pillow；NumPy 用于棋盘格透明背景修复 |
| Node.js 与 npm | 网页依赖安装和打包；建议使用 Node.js 22 或更高版本运行验证脚本 |
| Blender | 建议使用 4.5 LTS；可指定已有程序，或由流水线下载并校验便携版本 |
| Chromium 浏览器 | Chrome、Edge 或 Chromium，用于自动化网页验证 |
| 字体 | 所用字体应覆盖标题中的字符；可通过配置中的 `font` 指定字体文件 |
| Agent 宿主（可选） | 使用 Skill 时，需要支持读取技能说明、执行命令及查看图片的宿主 |

图像素材可由用户提供、从获准使用的来源获取，或由宿主的图像生成工具制作。仓库本身不提供图像生成模型或服务。

自动下载 Blender、安装 npm 依赖及首次获取打包工具需要网络连接。Blender 下载器支持 Windows、macOS 和 Linux x64；具体安装逻辑见 [ensure_blender.py](scripts/ensure_blender.py)。

## 安装

```bash
git clone https://github.com/Leisurely-Cloud/RuiC-card-skill.git ruic-card-skill
cd ruic-card-skill
python -m pip install Pillow numpy
```

作为 Agent Skill 使用时，将仓库放入宿主支持的技能目录，并确保宿主可以读取根目录的 [SKILL.md](SKILL.md)。技能标识为 `ruic-card-skill`，安装位置以宿主约定为准。

调用示例：

```text
使用 ruic-card-skill 制作一张水墨锦鲤全息卡片。
采用黑金配色，标题为“跃龙门”，编号为 No.001，背面使用同主题插画。
```

## 命令行使用

以下命令均在仓库根目录执行。输出项目应放在仓库外，例如 `../card-project`。

### 1. 准备素材与配置

```text
card-project/
├── card-config.json
└── assets/
    ├── subject.png
    ├── background.png
    ├── lineart.png
    ├── text.png
    ├── effects.png     # 可选
    └── back.png        # 可选，建议为完整卡片准备主题背面
```

所有图片使用相同尺寸，建议为 1024 × 1536。主体、文字和特效使用真实透明通道；背景与背面使用不透明图片。线稿应由主体素材提取，以保持轮廓对齐。

从 [配置示例](references/config.example.json) 创建 `card-config.json`，填写标题、编号和渲染参数。缺少 `text.png` 时，流水线会根据配置生成文字层。关于构图与素材要求，参见 [美术说明](references/art-direction.md)。

### 2. 构建项目

```bash
python scripts/run_pipeline.py --project ../card-project
```

指定已有 Blender：

```bash
python scripts/run_pipeline.py --project ../card-project --blender /path/to/blender
```

| 参数 | 说明 |
| --- | --- |
| `--project` | 输出项目路径，必须包含素材和配置 |
| `--blender` | 可选，指定 Blender 可执行文件 |
| `--skip-render` | 跳过 Blender 预览渲染，仍生成场景与网页 |
| `--skip-npm` | 跳过依赖安装，要求项目中已有依赖；仍执行打包 |

构建流程依次执行素材校验、Blender 场景构建、模型导出、网页组装和 JavaScript 打包。打包失败会中止流水线。

### 3. 启动与验证

```bash
node ../card-project/web/server.mjs
```

默认访问地址为 [http://127.0.0.1:4173](http://127.0.0.1:4173)。可通过 `PORT` 环境变量调整端口。

在另一个终端运行验证：

```bash
node scripts/verify_web.mjs ../card-project
```

验证脚本启动独立服务与无头浏览器，将报告和截图写入项目的 `verification/` 目录。浏览器可通过 `RUIC_BROWSER` 环境变量或 `--browser` 参数指定。自动检查之外，仍需检查正背面、倾斜视角和文字可读性。

## 配置说明

| 配置项 | 作用 |
| --- | --- |
| `title`、`subtitle`、`edition`、`collection` | 卡片标题、副标题、编号与系列 |
| `parameters` | 主体比例、各层景深及光泽参数 |
| `sourceMode: "relief"` | 启用独立几何层的浮雕模式 |
| `layers` | 浮雕层的尺寸、偏移、深度与图片裁切范围 |
| `backDesign` | 网页背面文字的主色与辅助色 |
| `ui` | 品牌名称、英文标识及支持的界面配色变量 |
| `font` | 自动生成文字层时使用的字体文件 |

流水线根据 `assets/` 下实际存在的图片生成网页资源路径。浮雕层、主题背面和界面配置的详细说明见 [背面与浮雕配置](references/backs-and-relief.md)。

配置会在构建前校验，并在出错时指出字段或 JSON 的行列位置。标题不能为空；缩放与层尺寸必须为正数，景深与偏移必须为有限数值，光泽范围为 0–1。省略的可选字段继续使用现有默认值，自定义元数据会保留。重新构建时，会清理已取消的背面和特效素材，并保留模型、自定义文件与依赖缓存。

## 输出文件

| 路径 | 内容 |
| --- | --- |
| `card.blend` | 可编辑 Blender 场景，包含打包后的图像资源 |
| `assets/` | 原始分层素材 |
| `web/` | 本地服务器、页面、打包脚本与模型资源 |
| `renders/` | Blender 预览图，使用 `--skip-render` 时不生成 |
| `asset-validation.json` | 素材校验结果 |
| `verification.json` | Blender 构建信息 |
| `verification/` | 运行网页验证后生成的报告与截图 |

浏览器通过 GLSL 重建材质效果，glTF 负责传递几何与材质角色。浏览器和 Blender 的渲染结果存在差异；背面的精确文字排版由网页额外绘制。WebGL 不可用时，查看器使用效果较简化的 CSS 3D 回退模式。

## 开发与验证

项目按以下职责组织：

```text
scripts/
├── run_pipeline.py       # 流水线入口与步骤编排
├── project_config.py     # 配置读取与素材清单
├── viewer_build.py       # 网页组装、依赖安装与打包
├── build_card.py         # Blender 场景构建
├── export_web.py         # 模型导出
├── validate_assets.py    # 素材校验
└── verify_web.mjs        # 浏览器集成验证

assets/web-template/
├── app.js                # 查看器生命周期与交互
├── shaders.js            # 材质着色器
├── back-art.js           # 背面绘制与排版
├── relief.js             # 浮雕层定位
├── viewer-ui.js          # 品牌与界面配置
├── style.css             # 基础布局
└── ui.css                # 界面样式与响应式布局
```

运行回归检查：

```bash
python scripts/test_pipeline.py
python scripts/test_checkerboard.py
node --test scripts/test_viewer.mjs scripts/test_experience.mjs
```

修改网页模块后需重新生成 `app.bundle.js`。模块边界、构建方式与完整验证流程见 [开发说明](references/development.md) 和 [验证说明](references/verification.md)。

[GitHub Actions](.github/workflows/checks.yml) 在提交和拉取请求时自动执行回归测试、网页打包及技能包审计，覆盖 Linux、Windows 和 macOS。涉及材质、几何或交互的改动仍需完成 Blender 构建与实际浏览器验证。

打包可分发的技能文件：

```bash
python scripts/package_skill.py . --out ../ruic-card-skill.zip
```

打包器仅纳入允许的文本文件，并排除演示媒体、生成素材、依赖缓存及 Blender 工程。

## 许可证与致谢

本项目基于 [HRuiCcc/RuiC-card-skill](https://github.com/HRuiCcc/RuiC-card-skill)，保留原作者版权声明，代码采用 [MIT License](LICENSE)。上游演示素材保留于仓库中；生成图片、用户提供的参考素材及第三方作品的使用权不由本项目的软件许可证授予。
