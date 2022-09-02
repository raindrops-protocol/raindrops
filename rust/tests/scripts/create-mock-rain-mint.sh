#/bin/bash -xe

#
# Get $RAIN Mint from mainnet and replace the mint authority with our own to use in localnet tests
#

# fetch account and write file locally
solana account rainH85N1vCoerCi4cQ3w6mCf7oYUdrsTFtFzpaRwjL --output json-compact --output-file rain.json

# secretKey is hardcoded in the tests file
MINT_AUTHORITY="8XbgRBz8pHzCBy4mwgr4ViDhJWFc35cd7E5oo3t5FvY";

# replace mint authority with our own
# ugly
python3 -c "import base64;import base58;import json;rain = json.load(open('rain.json'));data = bytearray(base64.b64decode(rain['account']['data'][0]));data[4:4+32] = base58.b58decode('${MINT_AUTHORITY}');print(base64.b64encode(data));rain['account']['data'][0] = base64.b64encode(data).decode('utf8');json.dump(rain, open('rain-mock.json', 'w'))"
