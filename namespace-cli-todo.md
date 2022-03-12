# Namespace CLI

Make a single cli command for namespaces contract, testing out namespace creation. This will be similar to the existing command for item.

## TODO

Some things left to do or updates to make to work with latest anchor/package versions

## Anchor updates

* Anchor >0.20.1 now does not support using bump on init. <https://github.com/project-serum/anchor/commit/598c7b0790689187360ffbf80935dac94d9a939c>
* Unsafe accounts need doc comments explaining why they are unchecked

## Issues encountered

* IDL generation has issue with usize types. More investigation needed.

## Run new CLI scripts

initialize namespace command

`node ../js/build/cli/namespace.js initialize_namespace -k ~/.config/solana/id.json --rpc-url http://127.0.0.1:8899 -cp example-configs/initializeNamespace.json`

show namespace command, using mint address for lookup

`node ../js/build/cli/namespace.js show_namespace -k ~/.config/solana/id.json --rpc-url http://127.0.0.1:8899 -m "AZE8B2436AhQNNDeuXFpJQWrhALc8vAstNo4M7pguVfY"`

Helper to create a token mint

`KEYPAIR="/Users/andrew/.config/solana/id.json" SOLANA_CLUSTER="http://127.0.0.1:8899" node ../js/build/cli/tools/createTokenMint.js`
