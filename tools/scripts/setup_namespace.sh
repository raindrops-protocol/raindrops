#!/usr/bin/env bash

## Prepare Wallets

solana-keygen new --silent --no-bip39-passphrase --outfile keypairs/namespace1.json
# solana-keygen new --silent --no-bip39-passphrase --outfile solpair2.json

### Airdrop and label them

amman airdrop ./keypairs/namespace1.json -l namespace1
# amman airdrop ./solpair2.json -l soladdr2

### Use first one as default wallet

# Use localhost
solana config set -u l
solana config set --keypair ./keypairs/namespace1.json

# amman account namespace1

## Create namespace mint
amman run -l mint-namespace1mint1 -l tx-create-namespace1-mint -- spl-token create-token --decimals 0 --mint-authority ./keypairs/namespace1.json
amman run -l mint-namespace1whitelist1mint1 -l tx-create-namespace1-whitelist-mint -- spl-token create-token --mint-authority ./keypairs/namespace1.json

## Mint namepsace mint token to namespace wallet
amman run -l ata-namespace1token1 -l tx-create-ata-namespace1-mint-namespace1 --  spl-token create-account +mint-namespace1mint1 --owner +namespace1
amman run -l tx-mint-namespace1token1-to-ata-namespace1 -t -- spl-token mint +mint-namespace1mint1 1 +ata-namespace1token1 --mint-authority ./keypairs/namespace1.json

## Token Creation

# amman run -l token1 -l tx-create-token1 --   spl-token create-token --mint-authority ./solpair1.json

## Token Account Creation

# amman run -l ata-tok1-addr1 -l tx-create-ata-tok1-addr1 --   spl-token create-account +token1 --owner +soladdr1

## Token Minting

# amman run -l tx-mint-token1-to-ata-tok1-addr1 -t --   spl-token mint +token1 10 +ata-tok1-addr1 --mint-authority ./solpair1.json

## Token Transferring

### Create ATA for 'soladdr2'

# amman run -l ata-tok1-addr2 -l tx-ata-tok1-addr2 --   spl-token create-account +token1 --owner +soladdr2

### Transfer the token Soladdr2

# amman run -l tx-transfer-token1-addr2 -t --   spl-token transfer +token1 1 +soladdr2 --owner ./solpair1.json
