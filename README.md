Architecture Docs: https://solanalabs.notion.site/Raindrops-Protocol-Architecture-Guide-c13bbd3ff0ae4989baeb27208318c558

**_ NONE OF THIS CODE IS AUDITED YET USE AT YOUR OWN RISK _**

Can install the raindrop-cli with

`npm install -g raindrops-cli`

Access the items-cli via

`items-cli --help`

Right now this is just scratch pad for examples. Will be readme eventually.

Example usage:

```
 {
          "index": 0,
          "basicItemEffects": null,
          "callback": null,
           "validation": {
            "key": "nameAxQRRBnd4kLfsVoZBBXfrByZdZTkh8mULLxLyqV",
            "code": 35
          },
          "usagePermissiveness": [{ "updateAuthority": true }],
          "inherited": { "notInherited": true },
          "itemClassType": {
            "consumable": {
              "maxUses": null,
              "maxPlayersPerUse": null,
              "itemUsageType": { "infinite": true },
              "cooldownDuration": 500,
              "warmupDuration": null
            }
          }
        }
```

Example component:

```
  {
          "mint": "6dwpqSumAiXWWWXSLAcscauNrqijBQdR8DDQgTuBs8v4",
          "amount": 0,
          "classIndex": 0,
          "timeToBuild": null,
          "componentScope": "set1",
          "useUsageIndex": 0,
          "condition": { "absence": true },
          "inherited": { "notInherited": true }
        }
```
