# Master Harness

[English](README.md) | 中文

Master Harness（`mh`）是一个独立维护的开源 agent harness（智能体框架），从 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 分叉而来。它保留上游**一切皆插件**的架构与 [Cordis](https://github.com/cordiverse/cordis) 基础，其设计参见论文 [_A Programming Paradigm for Spatiotemporal Composability_](https://arxiv.org/abs/2608.25512)。

文档：[https://hadimaster65555.github.io/deepseek-harness-master-ver/](https://hadimaster65555.github.io/deepseek-harness-master-ver/)

## 与 DeepSeek Harness 的关系

Master Harness 与 DeepSeek 不存在隶属或背书关系。它把 DeepSeek Harness 作为启发本分叉的上游项目并予以署名，同时保留上游的 MIT 许可证与版权声明。本 harness 仍随附 DeepSeek 模型提供方：`DEEPSEEK_API_KEY`、DeepSeek 模型 ID 及相关提供方代码保持不变。DeepSeek 与 DeepSeek Harness 是 DeepSeek AI 的商标。

## 开发者预览

Master Harness 处于 _开发者预览_ 阶段，正在快速迭代。**未来将出现破坏兼容性的变更。**

运行本项目前，请阅读[安全说明](SAFETY.zh.md)。

<a id="run"></a>

## 运行

### 通过 `npm` 运行

安装 `Node.js`，然后运行：

```sh
npx @master-harness/mh web
```

该命令默认会在 `http://127.0.0.1:3080` 启动 Web UI，本机启动时还会用默认浏览器打开页面。通过 SSH 启动时只打印宿主机 URL，因为本地转发地址由 SSH 客户端或编辑器持有。传入 `--no-open` 可仅运行服务器而不打开浏览器。详见 [Web UI 指南](docs/user/guide/index.zh.md)。

`@master-harness` npm 包由本分叉发布；只有在 registry 上发布对应版本后，才应从 registry 安装。

<a id="run-from-source"></a>

### 从源码运行

如需从仓库源码运行：

```sh
git clone https://github.com/hadimaster65555/deepseek-harness-master-ver.git
cd deepseek-harness-master-ver
pnpm install
pnpm run build
pnpm mh web
```

`pnpm run build` 会准备仓库产物。`pnpm mh web` 会直接使用这些已构建产物，不会重新构建。

## 社区与支持

- 通过 [GitHub Discussions](https://github.com/hadimaster65555/deepseek-harness-master-ver/discussions) 提交反馈或 bug 报告。
- 为你的插件仓库添加 [`mh-plugin`](https://github.com/topics/master-harness-plugin) 话题，便于被发现。
- 安全敏感问题请按[安全说明](SAFETY.zh.md)中的方式私下报告。

## 参与贡献

参见 [CONTRIBUTING.md](CONTRIBUTING.zh.md)。

## 开发

请先阅读[开发指南](docs/development.zh.md)与[架构文档](docs/architecture.zh.md)。

`pnpm run dev:web` 会在一个终端里完成构建、启动，并在源码修改时重建 client bundle；`make help` 列出 Web 与 Desktop 对应的 Make target。完整表格见开发指南的「应用命令」一节。

面向 agent：请遵循 [AGENTS.md](AGENTS.md)。

## 引用

```bibtex
@misc{master-harness2026,
  title={Master Harness: A Fork of DeepSeek Harness},
  author={Master Harness contributors},
  year={2026},
  publisher={GitHub},
  howpublished={\url{https://github.com/hadimaster65555/deepseek-harness-master-ver}},
  note={Inspired by DeepSeek Harness},
}
```

## 许可证

[MIT](LICENSE)。上游 DeepSeek 的版权声明予以保留。

第三方依赖及其许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
