# Master Harness

English | [中文](README.zh.md)

Master Harness (`mh`) is an independent, open-source agent harness forked from [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). It keeps the upstream **everything-is-a-plugin** architecture and its [Cordis](https://github.com/cordiverse/cordis) foundation, whose design is described in [_A Programming Paradigm for Spatiotemporal Composability_](https://arxiv.org/abs/2608.25512).

Documentation: [https://hadimaster65555.github.io/deepseek-harness-master-ver/](https://hadimaster65555.github.io/deepseek-harness-master-ver/)

## Relationship to DeepSeek Harness

Master Harness is not affiliated with or endorsed by DeepSeek. It credits DeepSeek Harness as the upstream project that inspired this fork, and it keeps the upstream MIT license and copyright notice. The harness still ships the DeepSeek model provider: `DEEPSEEK_API_KEY`, DeepSeek model IDs, and the related provider code remain unchanged. DeepSeek and DeepSeek Harness are trademarks of DeepSeek AI.

## Developer preview

Master Harness is in _developer preview_ and iterating rapidly. **THERE WILL BE COMPATIBILITY-BREAKING CHANGES.**

Review the [safety notice](SAFETY.md) before running the project.

## Run

### Run from `npm`

Install `Node.js`, then run:

```sh
npx @master-harness/mh web
```

The command starts the Web UI at `http://127.0.0.1:3080` by default and opens it in the default browser for a local launch. An SSH launch only prints the host URL because the SSH client or editor owns the local forwarded address. Pass `--no-open` to run the server without opening a browser. See [Web UI guide](docs/user/guide/index.md).

The `@master-harness` npm packages are published from this fork; install from the registry only after a release is published there.

### Run from source

To run from a repository checkout:

```sh
git clone https://github.com/hadimaster65555/deepseek-harness-master-ver.git
cd deepseek-harness-master-ver
pnpm install
pnpm run build
pnpm mh web
```

`pnpm run build` prepares the repository artifacts. `pnpm mh web` uses those built artifacts without rebuilding.

## Community and support

- Submit feedback or bug reports through [GitHub Discussions](https://github.com/hadimaster65555/deepseek-harness-master-ver/discussions).
- Add the [`mh-plugin`](https://github.com/topics/master-harness-plugin) topic to your plugin repository for discoverability.
- Report security-sensitive issues privately as described in the [safety notice](SAFETY.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Development

Start with the [development guide](docs/development.md) and [architecture documentation](docs/architecture.md).

`pnpm run dev:web` builds, serves, and rebuilds client bundles on source edits in one terminal, and `make help` lists the matching Make targets for Web and Desktop; the guide's application commands section owns the full table.

For agents, follow [AGENTS.md](AGENTS.md).

## Citation

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

## License

[MIT](LICENSE). The upstream DeepSeek copyright notice is preserved.

Third-party dependencies and their licenses are disclosed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
