# 💦 Raindrops

## _NONE OF THIS CODE IS AUDITED YET USE AT YOUR OWN RISK_

## Guide

https://docs.raindropstudios.xyz/raindrops

## About

The Solana ecosystem has a fragmented and very customized way of storing in-game assets on chain, with as many different formats as there are play-2-earn games. However, the methods of storing ordinary NFT data are standardized in the Metaplex Protocol. The aim of Raindrops is to do the same thing for game assets.

## Development 

[Turbo](https://turborepo.org/) is used for dependency management and building all components.

- Build all: `yarn build`
- Build CLI: `yarn build:cli`
- Build Libs: `yarn build:lib`
- Build Programs: `yarn build:program`
- Format: `yarn format`
- Lint: `yarn lint`
- Run tests locally: `yarn test`

## Contributing

Contributors welcome!

If you want to contribute a bug fix, please open a pull request with your changes

If you're making changes other than fixing a bug, please open an issue and label it appropiately. We will respond as soon as we can.

## License

This project contains two licenses.

- The first is the [AGPL 3.0 license](rust/LICENSE). This license applies specifically to the contracts deployed to the blockchain. Located in the directory `rust`.
- The second is the [Apache License 2.0](js/LICENSE). This license applies to the library code for interacting with the raindrops-protocol contracts. Located in the directory `js`.
