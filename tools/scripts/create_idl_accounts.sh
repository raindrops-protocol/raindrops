#!/bin/bash

pushd rust

# Namespace
anchor idl parse -f namespace/src/lib.rs -o target/idl/namespace.json
anchor idl init --provider.cluster localnet -f target/idl/namespace.json nameAxQRRBnd4kLfsVoZBBXfrByZdZTkh8mULLxLyqV
anchor idl upgrade -f target/idl/namespace.json nameAxQRRBnd4kLfsVoZBBXfrByZdZTkh8mULLxLyqV

popd rust
