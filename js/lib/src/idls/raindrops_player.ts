export type RaindropsPlayer = {
  "version": "0.1.0",
  "name": "raindrops_player",
  "instructions": [
    {
      "name": "createPlayerClass",
      "accounts": [
        {
          "name": "playerClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "playerMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "metadata",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "edition",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "parent",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "CreatePlayerClassArgs"
          }
        }
      ]
    },
    {
      "name": "updatePlayerClass",
      "accounts": [
        {
          "name": "playerClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "playerMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "parent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "UpdatePlayerClassArgs"
          }
        }
      ]
    },
    {
      "name": "drainPlayerClass",
      "accounts": [
        {
          "name": "playerClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "parentClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "receiver",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "DrainPlayerClassArgs"
          }
        }
      ]
    },
    {
      "name": "drainPlayer",
      "accounts": [
        {
          "name": "player",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "playerClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "receiver",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "rainToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rainTokenProgramAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "DrainPlayerArgs"
          }
        }
      ]
    },
    {
      "name": "updatePlayer",
      "accounts": [
        {
          "name": "playerClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "player",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "UpdatePlayerArgs"
          }
        }
      ]
    },
    {
      "name": "buildPlayer",
      "accounts": [
        {
          "name": "playerClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "newPlayer",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "newPlayerMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "newPlayerMetadata",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "newPlayerEdition",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "newPlayerToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rainTokenTransferAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rainToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rainTokenMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rainTokenProgramAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "newPlayerTokenHolder",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "BuildPlayerArgs"
          }
        }
      ]
    },
    {
      "name": "addItem",
      "accounts": [
        {
          "name": "player",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "playerClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "item",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemTransferAuthority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "playerItemAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "validationProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "AddItemArgs"
          }
        }
      ]
    },
    {
      "name": "removeItem",
      "accounts": [
        {
          "name": "player",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "playerClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "item",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemAccountOwner",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "playerItemAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "validationProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "RemoveItemArgs"
          }
        }
      ]
    },
    {
      "name": "useItem",
      "accounts": [
        {
          "name": "player",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "playerClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "item",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "playerItemAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemActivationMarker",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "clock",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "validationProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "UseItemArgs"
          }
        }
      ]
    },
    {
      "name": "updateValidForUseIfWarmupPassedOnItem",
      "accounts": [
        {
          "name": "player",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "playerClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "playerItemAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "item",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemActivationMarker",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "clock",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "UpdateValidForUseIfWarmupPassedOnItemArgs"
          }
        }
      ]
    },
    {
      "name": "subtractItemEffect",
      "accounts": [
        {
          "name": "player",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "playerClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "playerItemActivationMarker",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "item",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "receiver",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "clock",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "addItemEffect",
      "accounts": [
        {
          "name": "player",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "playerClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "playerItemAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "playerItemActivationMarker",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemActivationMarker",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "item",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "callbackProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "AddItemEffectArgs"
          }
        }
      ]
    },
    {
      "name": "toggleEquipItem",
      "accounts": [
        {
          "name": "player",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "playerClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "item",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "playerItemAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "validationProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "ToggleEquipItemArgs"
          }
        }
      ]
    },
    {
      "name": "resetPlayerStats",
      "accounts": [
        {
          "name": "player",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "playerClass",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "ResetPlayerStatsArgs"
          }
        }
      ]
    },
    {
      "name": "playerArtifactJoinNamespace",
      "accounts": [
        {
          "name": "playerArtifact",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "namespace",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "instructions",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "playerArtifactLeaveNamespace",
      "accounts": [
        {
          "name": "playerArtifact",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "namespace",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "instructions",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "playerArtifactCacheNamespace",
      "accounts": [
        {
          "name": "playerArtifact",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "namespace",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "instructions",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "page",
          "type": "u64"
        }
      ]
    },
    {
      "name": "playerArtifactUncacheNamespace",
      "accounts": [
        {
          "name": "playerArtifact",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "namespace",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "instructions",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "playerClass",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "namespaces",
            "type": {
              "option": {
                "vec": {
                  "defined": "NamespaceAndIndex"
                }
              }
            }
          },
          {
            "name": "parent",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "mint",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "metadata",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "edition",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "data",
            "type": {
              "defined": "PlayerClassData"
            }
          },
          {
            "name": "existingChildren",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "player",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "namespaces",
            "type": {
              "option": {
                "vec": {
                  "defined": "NamespaceAndIndex"
                }
              }
            }
          },
          {
            "name": "padding",
            "type": "u8"
          },
          {
            "name": "parent",
            "type": "publicKey"
          },
          {
            "name": "classIndex",
            "type": "u64"
          },
          {
            "name": "mint",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "metadata",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "edition",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "tokensStaked",
            "type": "u64"
          },
          {
            "name": "activeItemCounter",
            "type": "u64"
          },
          {
            "name": "itemsInBackpack",
            "type": "u64"
          },
          {
            "name": "data",
            "type": {
              "defined": "PlayerData"
            }
          },
          {
            "name": "equippedItems",
            "type": {
              "vec": {
                "defined": "EquippedItem"
              }
            }
          },
          {
            "name": "tokensPaidIn",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "playerItemActivationMarker",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "player",
            "type": "publicKey"
          },
          {
            "name": "item",
            "type": "publicKey"
          },
          {
            "name": "usageIndex",
            "type": "u16"
          },
          {
            "name": "basicItemEffects",
            "type": {
              "option": {
                "vec": {
                  "defined": "BasicItemEffect"
                }
              }
            }
          },
          {
            "name": "removedBieBitmap",
            "type": {
              "option": "bytes"
            }
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "activatedAt",
            "type": "u64"
          },
          {
            "name": "activeItemCounter",
            "type": "u64"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "ItemCallbackArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "instruction",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "extraIdentifier",
            "type": "u64"
          },
          {
            "name": "classIndex",
            "type": "u64"
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "itemClassMint",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "usagePermissivenessToUse",
            "type": {
              "option": {
                "defined": "PermissivenessType"
              }
            }
          },
          {
            "name": "usageIndex",
            "type": "u16"
          },
          {
            "name": "usageInfo",
            "type": {
              "option": "u8"
            }
          }
        ]
      }
    },
    {
      "name": "CopyEndItemActivationBecauseAnchorSucksSometimesArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "instruction",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "itemClassMint",
            "type": "publicKey"
          },
          {
            "name": "usagePermissivenessToUse",
            "type": {
              "option": {
                "defined": "PermissivenessType"
              }
            }
          },
          {
            "name": "usageIndex",
            "type": "u16"
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "classIndex",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "usageInfo",
            "type": {
              "option": {
                "defined": "raindrops_item::CraftUsageInfo"
              }
            }
          }
        ]
      }
    },
    {
      "name": "CopyBeginItemActivationBecauseAnchorSucksSometimesArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "instruction",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "classIndex",
            "type": "u64"
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "itemClassMint",
            "type": "publicKey"
          },
          {
            "name": "itemMint",
            "type": "publicKey"
          },
          {
            "name": "itemMarkerSpace",
            "type": "u8"
          },
          {
            "name": "usagePermissivenessToUse",
            "type": {
              "option": {
                "defined": "PermissivenessType"
              }
            }
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "usageIndex",
            "type": "u16"
          },
          {
            "name": "target",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "usageInfo",
            "type": {
              "option": {
                "defined": "raindrops_item::UsageInfo"
              }
            }
          }
        ]
      }
    },
    {
      "name": "CopyUpdateValidForUseIfWarmupPassedBecauseAnchorSucksSometimesArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "instruction",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "itemMint",
            "type": "publicKey"
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "usageIndex",
            "type": "u16"
          },
          {
            "name": "classIndex",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "itemClassMint",
            "type": "publicKey"
          },
          {
            "name": "usageProof",
            "type": {
              "option": {
                "vec": {
                  "array": [
                    "u8",
                    32
                  ]
                }
              }
            }
          },
          {
            "name": "usage",
            "type": {
              "option": {
                "defined": "raindrops_item::ItemUsage"
              }
            }
          }
        ]
      }
    },
    {
      "name": "AddOrRemoveItemValidationArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "instruction",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "extraIdentifier",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "playerMint",
            "type": "publicKey"
          },
          {
            "name": "itemPermissivenessToUse",
            "type": {
              "option": {
                "defined": "PermissivenessType"
              }
            }
          }
        ]
      }
    },
    {
      "name": "AddItemEffectArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "itemIndex",
            "type": "u64"
          },
          {
            "name": "itemClassIndex",
            "type": "u64"
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "playerMint",
            "type": "publicKey"
          },
          {
            "name": "itemClassMint",
            "type": "publicKey"
          },
          {
            "name": "itemUsageIndex",
            "type": "u16"
          },
          {
            "name": "useItemPermissivenessToUse",
            "type": {
              "option": {
                "defined": "PermissivenessType"
              }
            }
          },
          {
            "name": "space",
            "type": "u64"
          },
          {
            "name": "usageInfo",
            "type": {
              "option": {
                "defined": "UsageInfo"
              }
            }
          }
        ]
      }
    },
    {
      "name": "UsageInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "usageStateProof",
            "type": {
              "vec": {
                "array": [
                  "u8",
                  32
                ]
              }
            }
          },
          {
            "name": "usageState",
            "type": "bytes"
          },
          {
            "name": "usageProof",
            "type": {
              "vec": {
                "array": [
                  "u8",
                  32
                ]
              }
            }
          },
          {
            "name": "usage",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "AddItemArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "itemIndex",
            "type": "u64"
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "playerMint",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "addItemPermissivenessToUse",
            "type": {
              "option": {
                "defined": "PermissivenessType"
              }
            }
          }
        ]
      }
    },
    {
      "name": "RemoveItemArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "itemIndex",
            "type": "u64"
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "playerMint",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "removeItemPermissivenessToUse",
            "type": {
              "option": {
                "defined": "PermissivenessType"
              }
            }
          }
        ]
      }
    },
    {
      "name": "ToggleEquipItemArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "itemIndex",
            "type": "u64"
          },
          {
            "name": "itemMint",
            "type": "publicKey"
          },
          {
            "name": "itemClassMint",
            "type": "publicKey"
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "playerMint",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "equipping",
            "type": "bool"
          },
          {
            "name": "bodyPartIndex",
            "type": "u16"
          },
          {
            "name": "equipItemPermissivenessToUse",
            "type": {
              "option": {
                "defined": "PermissivenessType"
              }
            }
          },
          {
            "name": "itemUsageIndex",
            "type": "u16"
          },
          {
            "name": "itemUsageProof",
            "type": {
              "option": {
                "vec": {
                  "array": [
                    "u8",
                    32
                  ]
                }
              }
            }
          },
          {
            "name": "itemUsage",
            "type": {
              "option": "bytes"
            }
          }
        ]
      }
    },
    {
      "name": "ResetPlayerStatsArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "playerMint",
            "type": "publicKey"
          },
          {
            "name": "equipItemPermissivenessToUse",
            "type": {
              "option": {
                "defined": "PermissivenessType"
              }
            }
          }
        ]
      }
    },
    {
      "name": "DrainPlayerArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "classIndex",
            "type": "u64"
          },
          {
            "name": "playerMint",
            "type": "publicKey"
          },
          {
            "name": "playerClassMint",
            "type": "publicKey"
          },
          {
            "name": "updatePermissivenessToUse",
            "type": {
              "option": {
                "defined": "PermissivenessType"
              }
            }
          }
        ]
      }
    },
    {
      "name": "UpdatePlayerClassArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "classIndex",
            "type": "u64"
          },
          {
            "name": "parentClassIndex",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "updatePermissivenessToUse",
            "type": {
              "option": {
                "defined": "PermissivenessType"
              }
            }
          },
          {
            "name": "playerClassData",
            "type": {
              "option": {
                "defined": "PlayerClassData"
              }
            }
          }
        ]
      }
    },
    {
      "name": "CreatePlayerClassArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "classIndex",
            "type": "u64"
          },
          {
            "name": "parentClassIndex",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "parentOfParentClassIndex",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "space",
            "type": "u64"
          },
          {
            "name": "desiredNamespaceArraySize",
            "type": "u16"
          },
          {
            "name": "updatePermissivenessToUse",
            "type": {
              "option": {
                "defined": "PermissivenessType"
              }
            }
          },
          {
            "name": "storeMint",
            "type": "bool"
          },
          {
            "name": "storeMetadataFields",
            "type": "bool"
          },
          {
            "name": "playerClassData",
            "type": {
              "defined": "PlayerClassData"
            }
          }
        ]
      }
    },
    {
      "name": "DrainPlayerClassArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "classIndex",
            "type": "u64"
          },
          {
            "name": "parentClassIndex",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "updatePermissivenessToUse",
            "type": {
              "option": {
                "defined": "PermissivenessType"
              }
            }
          },
          {
            "name": "playerClassMint",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "BuildPlayerArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "classIndex",
            "type": "u64"
          },
          {
            "name": "parentClassIndex",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "newPlayerIndex",
            "type": "u64"
          },
          {
            "name": "space",
            "type": "u64"
          },
          {
            "name": "playerClassMint",
            "type": "publicKey"
          },
          {
            "name": "buildPermissivenessToUse",
            "type": {
              "option": {
                "defined": "PermissivenessType"
              }
            }
          },
          {
            "name": "storeMint",
            "type": "bool"
          },
          {
            "name": "storeMetadataFields",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "UpdatePlayerArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "classIndex",
            "type": "u64"
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "playerMint",
            "type": "publicKey"
          },
          {
            "name": "updatePermissivenessToUse",
            "type": {
              "option": {
                "defined": "PermissivenessType"
              }
            }
          },
          {
            "name": "playerClassMint",
            "type": "publicKey"
          },
          {
            "name": "newData",
            "type": {
              "option": {
                "defined": "PlayerData"
              }
            }
          }
        ]
      }
    },
    {
      "name": "UseItemArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "itemClassIndex",
            "type": "u64"
          },
          {
            "name": "itemIndex",
            "type": "u64"
          },
          {
            "name": "itemClassMint",
            "type": "publicKey"
          },
          {
            "name": "itemMint",
            "type": "publicKey"
          },
          {
            "name": "itemMarkerSpace",
            "type": "u8"
          },
          {
            "name": "useItemPermissivenessToUse",
            "type": {
              "option": {
                "defined": "PermissivenessType"
              }
            }
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "itemUsageIndex",
            "type": "u16"
          },
          {
            "name": "target",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "playerMint",
            "type": "publicKey"
          },
          {
            "name": "itemUsageInfo",
            "type": {
              "option": "bytes"
            }
          }
        ]
      }
    },
    {
      "name": "UpdateValidForUseIfWarmupPassedOnItemArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "itemMint",
            "type": "publicKey"
          },
          {
            "name": "itemIndex",
            "type": "u64"
          },
          {
            "name": "itemUsageIndex",
            "type": "u16"
          },
          {
            "name": "itemClassIndex",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "itemClassMint",
            "type": "publicKey"
          },
          {
            "name": "usagePermissivenessToUse",
            "type": {
              "option": {
                "defined": "PermissivenessType"
              }
            }
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "playerMint",
            "type": "publicKey"
          },
          {
            "name": "itemUsageProof",
            "type": {
              "option": {
                "vec": {
                  "array": [
                    "u8",
                    32
                  ]
                }
              }
            }
          },
          {
            "name": "itemUsage",
            "type": {
              "option": "bytes"
            }
          }
        ]
      }
    },
    {
      "name": "EquippedItem",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "item",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "index",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "NamespaceAndIndex",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "namespace",
            "type": "publicKey"
          },
          {
            "name": "index",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "inherited",
            "type": {
              "defined": "InheritanceState"
            }
          }
        ]
      }
    },
    {
      "name": "ChildUpdatePropagationPermissiveness",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "overridable",
            "type": "bool"
          },
          {
            "name": "inherited",
            "type": {
              "defined": "InheritanceState"
            }
          },
          {
            "name": "childUpdatePropagationPermissivenessType",
            "type": {
              "defined": "ChildUpdatePropagationPermissivenessType"
            }
          }
        ]
      }
    },
    {
      "name": "PlayerCategory",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "category",
            "type": "string"
          },
          {
            "name": "inherited",
            "type": {
              "defined": "InheritanceState"
            }
          }
        ]
      }
    },
    {
      "name": "StatsUri",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "statsUri",
            "type": "string"
          },
          {
            "name": "inherited",
            "type": {
              "defined": "InheritanceState"
            }
          }
        ]
      }
    },
    {
      "name": "BodyPart",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "index",
            "type": "u16"
          },
          {
            "name": "bodyPart",
            "type": "string"
          },
          {
            "name": "totalItemSpots",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "inherited",
            "type": {
              "defined": "InheritanceState"
            }
          }
        ]
      }
    },
    {
      "name": "PlayerClassData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "settings",
            "type": {
              "defined": "PlayerClassSettings"
            }
          },
          {
            "name": "config",
            "type": {
              "defined": "PlayerClassConfig"
            }
          }
        ]
      }
    },
    {
      "name": "Boolean",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "inherited",
            "type": {
              "defined": "InheritanceState"
            }
          },
          {
            "name": "boolean",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "Permissiveness",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "inherited",
            "type": {
              "defined": "InheritanceState"
            }
          },
          {
            "name": "permissivenessType",
            "type": {
              "defined": "PermissivenessType"
            }
          }
        ]
      }
    },
    {
      "name": "PlayerClassSettings",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "defaultCategory",
            "type": {
              "option": {
                "defined": "PlayerCategory"
              }
            }
          },
          {
            "name": "childrenMustBeEditions",
            "type": {
              "option": {
                "defined": "Boolean"
              }
            }
          },
          {
            "name": "builderMustBeHolder",
            "type": {
              "option": {
                "defined": "Boolean"
              }
            }
          },
          {
            "name": "updatePermissiveness",
            "type": {
              "option": {
                "vec": {
                  "defined": "Permissiveness"
                }
              }
            }
          },
          {
            "name": "instanceUpdatePermissiveness",
            "type": {
              "option": {
                "vec": {
                  "defined": "Permissiveness"
                }
              }
            }
          },
          {
            "name": "buildPermissiveness",
            "type": {
              "option": {
                "vec": {
                  "defined": "Permissiveness"
                }
              }
            }
          },
          {
            "name": "equipItemPermissiveness",
            "type": {
              "option": {
                "vec": {
                  "defined": "Permissiveness"
                }
              }
            }
          },
          {
            "name": "addItemPermissiveness",
            "type": {
              "option": {
                "vec": {
                  "defined": "Permissiveness"
                }
              }
            }
          },
          {
            "name": "useItemPermissiveness",
            "type": {
              "option": {
                "vec": {
                  "defined": "Permissiveness"
                }
              }
            }
          },
          {
            "name": "unequipItemPermissiveness",
            "type": {
              "option": {
                "vec": {
                  "defined": "Permissiveness"
                }
              }
            }
          },
          {
            "name": "removeItemPermissiveness",
            "type": {
              "option": {
                "vec": {
                  "defined": "Permissiveness"
                }
              }
            }
          },
          {
            "name": "stakingWarmUpDuration",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "stakingCooldownDuration",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "stakingPermissiveness",
            "type": {
              "option": {
                "vec": {
                  "defined": "Permissiveness"
                }
              }
            }
          },
          {
            "name": "unstakingPermissiveness",
            "type": {
              "option": {
                "vec": {
                  "defined": "Permissiveness"
                }
              }
            }
          },
          {
            "name": "childUpdatePropagationPermissiveness",
            "type": {
              "option": {
                "vec": {
                  "defined": "ChildUpdatePropagationPermissiveness"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "PlayerClassConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "startingStatsUri",
            "type": {
              "option": {
                "defined": "StatsUri"
              }
            }
          },
          {
            "name": "basicStats",
            "type": {
              "option": {
                "vec": {
                  "defined": "BasicStatTemplate"
                }
              }
            }
          },
          {
            "name": "bodyParts",
            "type": {
              "option": {
                "vec": {
                  "defined": "BodyPart"
                }
              }
            }
          },
          {
            "name": "equipValidation",
            "type": {
              "option": {
                "defined": "Callback"
              }
            }
          },
          {
            "name": "addToPackValidation",
            "type": {
              "option": {
                "defined": "Callback"
              }
            }
          }
        ]
      }
    },
    {
      "name": "Callback",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "key",
            "type": "publicKey"
          },
          {
            "name": "code",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "PlayerData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "statsUri",
            "type": {
              "option": {
                "defined": "StatsUri"
              }
            }
          },
          {
            "name": "category",
            "type": {
              "option": {
                "defined": "PlayerCategory"
              }
            }
          },
          {
            "name": "basicStats",
            "type": {
              "option": {
                "vec": {
                  "defined": "BasicStat"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "BasicStatTemplate",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "index",
            "type": "u16"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "statType",
            "type": {
              "defined": "BasicStatType"
            }
          },
          {
            "name": "inherited",
            "type": {
              "defined": "InheritanceState"
            }
          }
        ]
      }
    },
    {
      "name": "BasicStat",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "index",
            "type": "u16"
          },
          {
            "name": "state",
            "type": {
              "defined": "BasicStatState"
            }
          }
        ]
      }
    },
    {
      "name": "Threshold",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "value",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "BasicItemEffect",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "stat",
            "type": "string"
          },
          {
            "name": "itemEffectType",
            "type": {
              "defined": "BasicItemEffectType"
            }
          },
          {
            "name": "activeDuration",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "stakingAmountNumerator",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "stakingAmountDivisor",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "stakingDurationNumerator",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "stakingDurationDivisor",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "maxUses",
            "type": {
              "option": "u64"
            }
          }
        ]
      }
    },
    {
      "name": "PermissivenessType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "TokenHolder"
          },
          {
            "name": "ParentTokenHolder"
          },
          {
            "name": "UpdateAuthority"
          },
          {
            "name": "Anybody"
          }
        ]
      }
    },
    {
      "name": "InheritanceState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "NotInherited"
          },
          {
            "name": "Inherited"
          },
          {
            "name": "Overridden"
          }
        ]
      }
    },
    {
      "name": "ChildUpdatePropagationPermissivenessType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "UpdatePermissiveness"
          },
          {
            "name": "InstanceUpdatePermissiveness"
          },
          {
            "name": "BuildPermissiveness"
          },
          {
            "name": "ChildUpdatePropagationPermissiveness"
          },
          {
            "name": "ChildrenMustBeEditionsPermissiveness"
          },
          {
            "name": "BuilderMustBeHolderPermissiveness"
          },
          {
            "name": "StakingPermissiveness"
          },
          {
            "name": "Namespaces"
          },
          {
            "name": "EquipItemPermissiveness"
          },
          {
            "name": "AddItemPermissiveness"
          },
          {
            "name": "UseItemPermissiveness"
          },
          {
            "name": "BasicStatTemplates"
          },
          {
            "name": "DefaultCategory"
          },
          {
            "name": "BodyParts"
          },
          {
            "name": "StatsUri"
          }
        ]
      }
    },
    {
      "name": "BasicStatType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Enum",
            "fields": [
              {
                "name": "starting",
                "type": "u8"
              },
              {
                "name": "values",
                "type": {
                  "vec": {
                    "defined": "Threshold"
                  }
                }
              }
            ]
          },
          {
            "name": "Integer",
            "fields": [
              {
                "name": "min",
                "type": {
                  "option": "i64"
                }
              },
              {
                "name": "max",
                "type": {
                  "option": "i64"
                }
              },
              {
                "name": "starting",
                "type": "i64"
              },
              {
                "name": "staking_amount_scaler",
                "type": {
                  "option": "u64"
                }
              },
              {
                "name": "staking_duration_scaler",
                "type": {
                  "option": "u64"
                }
              }
            ]
          },
          {
            "name": "Bool",
            "fields": [
              {
                "name": "starting",
                "type": "bool"
              },
              {
                "name": "staking_flip",
                "type": {
                  "option": "u64"
                }
              }
            ]
          },
          {
            "name": "String",
            "fields": [
              {
                "name": "starting",
                "type": "string"
              }
            ]
          }
        ]
      }
    },
    {
      "name": "BasicStatState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Enum",
            "fields": [
              {
                "name": "current",
                "type": "u8"
              }
            ]
          },
          {
            "name": "Integer",
            "fields": [
              {
                "name": "base",
                "type": "i64"
              },
              {
                "name": "with_temporary_changes",
                "type": "i64"
              },
              {
                "name": "temporary_numerator",
                "type": "i64"
              },
              {
                "name": "temporary_denominator",
                "type": "i64"
              },
              {
                "name": "finalized",
                "type": "i64"
              }
            ]
          },
          {
            "name": "Bool",
            "fields": [
              {
                "name": "current",
                "type": "bool"
              }
            ]
          },
          {
            "name": "String",
            "fields": [
              {
                "name": "current",
                "type": "string"
              }
            ]
          },
          {
            "name": "Null"
          }
        ]
      }
    },
    {
      "name": "StatDiffType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Wearable"
          },
          {
            "name": "Consumable"
          }
        ]
      }
    },
    {
      "name": "BasicItemEffectType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Increment"
          },
          {
            "name": "Decrement"
          },
          {
            "name": "IncrementPercent"
          },
          {
            "name": "DecrementPercent"
          },
          {
            "name": "IncrementPercentFromBase"
          },
          {
            "name": "DecrementPercentFromBase"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "IncorrectOwner",
      "msg": "Account does not have correct owner!"
    },
    {
      "code": 6001,
      "name": "Uninitialized",
      "msg": "Account is not initialized!"
    },
    {
      "code": 6002,
      "name": "MintMismatch",
      "msg": "Mint Mismatch!"
    },
    {
      "code": 6003,
      "name": "TokenTransferFailed",
      "msg": "Token transfer failed"
    },
    {
      "code": 6004,
      "name": "NumericalOverflowError",
      "msg": "Numerical overflow error"
    },
    {
      "code": 6005,
      "name": "TokenMintToFailed",
      "msg": "Token mint to failed"
    },
    {
      "code": 6006,
      "name": "TokenBurnFailed",
      "msg": "TokenBurnFailed"
    },
    {
      "code": 6007,
      "name": "DerivedKeyInvalid",
      "msg": "Derived key is invalid"
    },
    {
      "code": 6008,
      "name": "NoParentPresent",
      "msg": "No parent present"
    },
    {
      "code": 6009,
      "name": "ExpectedParent",
      "msg": "Expected parent"
    },
    {
      "code": 6010,
      "name": "ChildrenStillExist",
      "msg": "You need to kill the children before killing the parent"
    },
    {
      "code": 6011,
      "name": "UnstakeTokensFirst",
      "msg": "Unstake tokens first"
    },
    {
      "code": 6012,
      "name": "MustBeHolderToBuild",
      "msg": "Must be holder to build"
    },
    {
      "code": 6013,
      "name": "CannotRemoveThisMuch",
      "msg": "Cannot remove this much of this item because there is not enough of it or too much of it is equipped"
    },
    {
      "code": 6014,
      "name": "UsageRootNotPresent",
      "msg": "This item lacks a usage root"
    },
    {
      "code": 6015,
      "name": "InvalidProof",
      "msg": "Invalid proof"
    },
    {
      "code": 6016,
      "name": "ItemContainsNoUsages",
      "msg": "Item contains no usages"
    },
    {
      "code": 6017,
      "name": "FoundNoMatchingUsage",
      "msg": "Found no item usage matching this index"
    },
    {
      "code": 6018,
      "name": "CannotEquipConsumable",
      "msg": "Cannot equip consumable"
    },
    {
      "code": 6019,
      "name": "BodyPartNotEligible",
      "msg": "This body part cannot equip this item"
    },
    {
      "code": 6020,
      "name": "CannotUnequipThisMuch",
      "msg": "Cannot unequip this much"
    },
    {
      "code": 6021,
      "name": "BodyPartContainsTooManyOfThisType",
      "msg": "Body part contains too many items of this type on it"
    },
    {
      "code": 6022,
      "name": "BodyPartContainsTooMany",
      "msg": "Body part contains too many items"
    },
    {
      "code": 6023,
      "name": "CannotEquipItemWithoutUsageOrMerkle",
      "msg": "Cannot equip item without usage or merkle"
    },
    {
      "code": 6024,
      "name": "NoBodyPartsToEquip",
      "msg": "No body parts to equip"
    },
    {
      "code": 6025,
      "name": "UnableToFindBodyPartByIndex",
      "msg": "Unable to find body part with this index"
    },
    {
      "code": 6026,
      "name": "ItemCannotBePairedWithSelf",
      "msg": "Item cannot be paired with self"
    },
    {
      "code": 6027,
      "name": "ItemCannotBeEquippedWithDNPEntry",
      "msg": "Item cannot be equipped because a DNP entry is also equipped"
    },
    {
      "code": 6028,
      "name": "BasicStatTemplateTypeDoesNotMatchBasicStatType",
      "msg": "Template stat type does not match stat of player, try updating player permissionlessly before running this command again"
    },
    {
      "code": 6029,
      "name": "CannotAlterThisTypeNumerically",
      "msg": "Cannot numerically alter this type of stat"
    },
    {
      "code": 6030,
      "name": "Unreachable",
      "msg": "Unreachable code"
    },
    {
      "code": 6031,
      "name": "NotValidForUseYet",
      "msg": "Not valid for use yet"
    },
    {
      "code": 6032,
      "name": "RemoveEquipmentFirst",
      "msg": "Remove equipped items first"
    },
    {
      "code": 6033,
      "name": "DeactivateAllItemsFirst",
      "msg": "Deactivate all items first"
    },
    {
      "code": 6034,
      "name": "RemoveAllItemsFromBackpackFirst",
      "msg": "Remove all items from backpack first"
    },
    {
      "code": 6035,
      "name": "InsufficientBalance",
      "msg": "Insufficient Balance"
    },
    {
      "code": 6036,
      "name": "PermissivenessNotFound",
      "msg": "Permissiveness Not Found"
    },
    {
      "code": 6037,
      "name": "MustSpecifyPermissivenessType",
      "msg": "Must specify permissiveness type"
    },
    {
      "code": 6038,
      "name": "IndexAlreadyUsed",
      "msg": "Cannot use the same index in basic stats or body parts twice"
    },
    {
      "code": 6039,
      "name": "NameAlreadyUsed",
      "msg": "Cannot use the same name in basic stats or body parts twice"
    },
    {
      "code": 6040,
      "name": "CannotResetPlayerStatsUntilItemEffectsAreRemoved",
      "msg": "Cannot reset player until item effects removed"
    },
    {
      "code": 6041,
      "name": "FailedToJoinNamespace",
      "msg": "Failed to join namespace"
    },
    {
      "code": 6042,
      "name": "FailedToLeaveNamespace",
      "msg": "Failed to leave namespace"
    },
    {
      "code": 6043,
      "name": "FailedToCache",
      "msg": "Failed to cache"
    },
    {
      "code": 6044,
      "name": "FailedToUncache",
      "msg": "Failed to uncache"
    },
    {
      "code": 6045,
      "name": "AlreadyCached",
      "msg": "Already cached"
    },
    {
      "code": 6046,
      "name": "NotCached",
      "msg": "Not cached"
    },
    {
      "code": 6047,
      "name": "UnauthorizedCaller",
      "msg": "Unauthorized Caller"
    },
    {
      "code": 6048,
      "name": "RainTokenMintMismatch",
      "msg": "Rain token mint mismatch"
    },
    {
      "code": 6049,
      "name": "AmountMustBeGreaterThanZero",
      "msg": "Amount must be greater than zero"
    }
  ]
};

export const IDL: RaindropsPlayer = {
  "version": "0.1.0",
  "name": "raindrops_player",
  "instructions": [
    {
      "name": "createPlayerClass",
      "accounts": [
        {
          "name": "playerClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "playerMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "metadata",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "edition",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "parent",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "CreatePlayerClassArgs"
          }
        }
      ]
    },
    {
      "name": "updatePlayerClass",
      "accounts": [
        {
          "name": "playerClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "playerMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "parent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "UpdatePlayerClassArgs"
          }
        }
      ]
    },
    {
      "name": "drainPlayerClass",
      "accounts": [
        {
          "name": "playerClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "parentClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "receiver",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "DrainPlayerClassArgs"
          }
        }
      ]
    },
    {
      "name": "drainPlayer",
      "accounts": [
        {
          "name": "player",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "playerClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "receiver",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "rainToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rainTokenProgramAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "DrainPlayerArgs"
          }
        }
      ]
    },
    {
      "name": "updatePlayer",
      "accounts": [
        {
          "name": "playerClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "player",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "UpdatePlayerArgs"
          }
        }
      ]
    },
    {
      "name": "buildPlayer",
      "accounts": [
        {
          "name": "playerClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "newPlayer",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "newPlayerMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "newPlayerMetadata",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "newPlayerEdition",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "newPlayerToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rainTokenTransferAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rainToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rainTokenMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rainTokenProgramAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "newPlayerTokenHolder",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "BuildPlayerArgs"
          }
        }
      ]
    },
    {
      "name": "addItem",
      "accounts": [
        {
          "name": "player",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "playerClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "item",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemTransferAuthority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "playerItemAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "validationProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "AddItemArgs"
          }
        }
      ]
    },
    {
      "name": "removeItem",
      "accounts": [
        {
          "name": "player",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "playerClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "item",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemAccountOwner",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "playerItemAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "validationProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "RemoveItemArgs"
          }
        }
      ]
    },
    {
      "name": "useItem",
      "accounts": [
        {
          "name": "player",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "playerClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "item",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "playerItemAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemActivationMarker",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "clock",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "validationProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "UseItemArgs"
          }
        }
      ]
    },
    {
      "name": "updateValidForUseIfWarmupPassedOnItem",
      "accounts": [
        {
          "name": "player",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "playerClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "playerItemAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "item",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemActivationMarker",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "clock",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "UpdateValidForUseIfWarmupPassedOnItemArgs"
          }
        }
      ]
    },
    {
      "name": "subtractItemEffect",
      "accounts": [
        {
          "name": "player",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "playerClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "playerItemActivationMarker",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "item",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "receiver",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "clock",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "addItemEffect",
      "accounts": [
        {
          "name": "player",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "playerClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "playerItemAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "playerItemActivationMarker",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemActivationMarker",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "item",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "callbackProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "AddItemEffectArgs"
          }
        }
      ]
    },
    {
      "name": "toggleEquipItem",
      "accounts": [
        {
          "name": "player",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "playerClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "item",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "playerItemAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "validationProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "ToggleEquipItemArgs"
          }
        }
      ]
    },
    {
      "name": "resetPlayerStats",
      "accounts": [
        {
          "name": "player",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "playerClass",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "ResetPlayerStatsArgs"
          }
        }
      ]
    },
    {
      "name": "playerArtifactJoinNamespace",
      "accounts": [
        {
          "name": "playerArtifact",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "namespace",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "instructions",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "playerArtifactLeaveNamespace",
      "accounts": [
        {
          "name": "playerArtifact",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "namespace",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "instructions",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "playerArtifactCacheNamespace",
      "accounts": [
        {
          "name": "playerArtifact",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "namespace",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "instructions",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "page",
          "type": "u64"
        }
      ]
    },
    {
      "name": "playerArtifactUncacheNamespace",
      "accounts": [
        {
          "name": "playerArtifact",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "namespace",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "instructions",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "playerClass",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "namespaces",
            "type": {
              "option": {
                "vec": {
                  "defined": "NamespaceAndIndex"
                }
              }
            }
          },
          {
            "name": "parent",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "mint",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "metadata",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "edition",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "data",
            "type": {
              "defined": "PlayerClassData"
            }
          },
          {
            "name": "existingChildren",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "player",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "namespaces",
            "type": {
              "option": {
                "vec": {
                  "defined": "NamespaceAndIndex"
                }
              }
            }
          },
          {
            "name": "padding",
            "type": "u8"
          },
          {
            "name": "parent",
            "type": "publicKey"
          },
          {
            "name": "classIndex",
            "type": "u64"
          },
          {
            "name": "mint",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "metadata",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "edition",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "tokensStaked",
            "type": "u64"
          },
          {
            "name": "activeItemCounter",
            "type": "u64"
          },
          {
            "name": "itemsInBackpack",
            "type": "u64"
          },
          {
            "name": "data",
            "type": {
              "defined": "PlayerData"
            }
          },
          {
            "name": "equippedItems",
            "type": {
              "vec": {
                "defined": "EquippedItem"
              }
            }
          },
          {
            "name": "tokensPaidIn",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "playerItemActivationMarker",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "player",
            "type": "publicKey"
          },
          {
            "name": "item",
            "type": "publicKey"
          },
          {
            "name": "usageIndex",
            "type": "u16"
          },
          {
            "name": "basicItemEffects",
            "type": {
              "option": {
                "vec": {
                  "defined": "BasicItemEffect"
                }
              }
            }
          },
          {
            "name": "removedBieBitmap",
            "type": {
              "option": "bytes"
            }
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "activatedAt",
            "type": "u64"
          },
          {
            "name": "activeItemCounter",
            "type": "u64"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "ItemCallbackArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "instruction",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "extraIdentifier",
            "type": "u64"
          },
          {
            "name": "classIndex",
            "type": "u64"
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "itemClassMint",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "usagePermissivenessToUse",
            "type": {
              "option": {
                "defined": "PermissivenessType"
              }
            }
          },
          {
            "name": "usageIndex",
            "type": "u16"
          },
          {
            "name": "usageInfo",
            "type": {
              "option": "u8"
            }
          }
        ]
      }
    },
    {
      "name": "CopyEndItemActivationBecauseAnchorSucksSometimesArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "instruction",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "itemClassMint",
            "type": "publicKey"
          },
          {
            "name": "usagePermissivenessToUse",
            "type": {
              "option": {
                "defined": "PermissivenessType"
              }
            }
          },
          {
            "name": "usageIndex",
            "type": "u16"
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "classIndex",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "usageInfo",
            "type": {
              "option": {
                "defined": "raindrops_item::CraftUsageInfo"
              }
            }
          }
        ]
      }
    },
    {
      "name": "CopyBeginItemActivationBecauseAnchorSucksSometimesArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "instruction",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "classIndex",
            "type": "u64"
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "itemClassMint",
            "type": "publicKey"
          },
          {
            "name": "itemMint",
            "type": "publicKey"
          },
          {
            "name": "itemMarkerSpace",
            "type": "u8"
          },
          {
            "name": "usagePermissivenessToUse",
            "type": {
              "option": {
                "defined": "PermissivenessType"
              }
            }
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "usageIndex",
            "type": "u16"
          },
          {
            "name": "target",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "usageInfo",
            "type": {
              "option": {
                "defined": "raindrops_item::UsageInfo"
              }
            }
          }
        ]
      }
    },
    {
      "name": "CopyUpdateValidForUseIfWarmupPassedBecauseAnchorSucksSometimesArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "instruction",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "itemMint",
            "type": "publicKey"
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "usageIndex",
            "type": "u16"
          },
          {
            "name": "classIndex",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "itemClassMint",
            "type": "publicKey"
          },
          {
            "name": "usageProof",
            "type": {
              "option": {
                "vec": {
                  "array": [
                    "u8",
                    32
                  ]
                }
              }
            }
          },
          {
            "name": "usage",
            "type": {
              "option": {
                "defined": "raindrops_item::ItemUsage"
              }
            }
          }
        ]
      }
    },
    {
      "name": "AddOrRemoveItemValidationArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "instruction",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "extraIdentifier",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "playerMint",
            "type": "publicKey"
          },
          {
            "name": "itemPermissivenessToUse",
            "type": {
              "option": {
                "defined": "PermissivenessType"
              }
            }
          }
        ]
      }
    },
    {
      "name": "AddItemEffectArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "itemIndex",
            "type": "u64"
          },
          {
            "name": "itemClassIndex",
            "type": "u64"
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "playerMint",
            "type": "publicKey"
          },
          {
            "name": "itemClassMint",
            "type": "publicKey"
          },
          {
            "name": "itemUsageIndex",
            "type": "u16"
          },
          {
            "name": "useItemPermissivenessToUse",
            "type": {
              "option": {
                "defined": "PermissivenessType"
              }
            }
          },
          {
            "name": "space",
            "type": "u64"
          },
          {
            "name": "usageInfo",
            "type": {
              "option": {
                "defined": "UsageInfo"
              }
            }
          }
        ]
      }
    },
    {
      "name": "UsageInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "usageStateProof",
            "type": {
              "vec": {
                "array": [
                  "u8",
                  32
                ]
              }
            }
          },
          {
            "name": "usageState",
            "type": "bytes"
          },
          {
            "name": "usageProof",
            "type": {
              "vec": {
                "array": [
                  "u8",
                  32
                ]
              }
            }
          },
          {
            "name": "usage",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "AddItemArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "itemIndex",
            "type": "u64"
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "playerMint",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "addItemPermissivenessToUse",
            "type": {
              "option": {
                "defined": "PermissivenessType"
              }
            }
          }
        ]
      }
    },
    {
      "name": "RemoveItemArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "itemIndex",
            "type": "u64"
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "playerMint",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "removeItemPermissivenessToUse",
            "type": {
              "option": {
                "defined": "PermissivenessType"
              }
            }
          }
        ]
      }
    },
    {
      "name": "ToggleEquipItemArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "itemIndex",
            "type": "u64"
          },
          {
            "name": "itemMint",
            "type": "publicKey"
          },
          {
            "name": "itemClassMint",
            "type": "publicKey"
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "playerMint",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "equipping",
            "type": "bool"
          },
          {
            "name": "bodyPartIndex",
            "type": "u16"
          },
          {
            "name": "equipItemPermissivenessToUse",
            "type": {
              "option": {
                "defined": "PermissivenessType"
              }
            }
          },
          {
            "name": "itemUsageIndex",
            "type": "u16"
          },
          {
            "name": "itemUsageProof",
            "type": {
              "option": {
                "vec": {
                  "array": [
                    "u8",
                    32
                  ]
                }
              }
            }
          },
          {
            "name": "itemUsage",
            "type": {
              "option": "bytes"
            }
          }
        ]
      }
    },
    {
      "name": "ResetPlayerStatsArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "playerMint",
            "type": "publicKey"
          },
          {
            "name": "equipItemPermissivenessToUse",
            "type": {
              "option": {
                "defined": "PermissivenessType"
              }
            }
          }
        ]
      }
    },
    {
      "name": "DrainPlayerArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "classIndex",
            "type": "u64"
          },
          {
            "name": "playerMint",
            "type": "publicKey"
          },
          {
            "name": "playerClassMint",
            "type": "publicKey"
          },
          {
            "name": "updatePermissivenessToUse",
            "type": {
              "option": {
                "defined": "PermissivenessType"
              }
            }
          }
        ]
      }
    },
    {
      "name": "UpdatePlayerClassArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "classIndex",
            "type": "u64"
          },
          {
            "name": "parentClassIndex",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "updatePermissivenessToUse",
            "type": {
              "option": {
                "defined": "PermissivenessType"
              }
            }
          },
          {
            "name": "playerClassData",
            "type": {
              "option": {
                "defined": "PlayerClassData"
              }
            }
          }
        ]
      }
    },
    {
      "name": "CreatePlayerClassArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "classIndex",
            "type": "u64"
          },
          {
            "name": "parentClassIndex",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "parentOfParentClassIndex",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "space",
            "type": "u64"
          },
          {
            "name": "desiredNamespaceArraySize",
            "type": "u16"
          },
          {
            "name": "updatePermissivenessToUse",
            "type": {
              "option": {
                "defined": "PermissivenessType"
              }
            }
          },
          {
            "name": "storeMint",
            "type": "bool"
          },
          {
            "name": "storeMetadataFields",
            "type": "bool"
          },
          {
            "name": "playerClassData",
            "type": {
              "defined": "PlayerClassData"
            }
          }
        ]
      }
    },
    {
      "name": "DrainPlayerClassArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "classIndex",
            "type": "u64"
          },
          {
            "name": "parentClassIndex",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "updatePermissivenessToUse",
            "type": {
              "option": {
                "defined": "PermissivenessType"
              }
            }
          },
          {
            "name": "playerClassMint",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "BuildPlayerArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "classIndex",
            "type": "u64"
          },
          {
            "name": "parentClassIndex",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "newPlayerIndex",
            "type": "u64"
          },
          {
            "name": "space",
            "type": "u64"
          },
          {
            "name": "playerClassMint",
            "type": "publicKey"
          },
          {
            "name": "buildPermissivenessToUse",
            "type": {
              "option": {
                "defined": "PermissivenessType"
              }
            }
          },
          {
            "name": "storeMint",
            "type": "bool"
          },
          {
            "name": "storeMetadataFields",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "UpdatePlayerArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "classIndex",
            "type": "u64"
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "playerMint",
            "type": "publicKey"
          },
          {
            "name": "updatePermissivenessToUse",
            "type": {
              "option": {
                "defined": "PermissivenessType"
              }
            }
          },
          {
            "name": "playerClassMint",
            "type": "publicKey"
          },
          {
            "name": "newData",
            "type": {
              "option": {
                "defined": "PlayerData"
              }
            }
          }
        ]
      }
    },
    {
      "name": "UseItemArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "itemClassIndex",
            "type": "u64"
          },
          {
            "name": "itemIndex",
            "type": "u64"
          },
          {
            "name": "itemClassMint",
            "type": "publicKey"
          },
          {
            "name": "itemMint",
            "type": "publicKey"
          },
          {
            "name": "itemMarkerSpace",
            "type": "u8"
          },
          {
            "name": "useItemPermissivenessToUse",
            "type": {
              "option": {
                "defined": "PermissivenessType"
              }
            }
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "itemUsageIndex",
            "type": "u16"
          },
          {
            "name": "target",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "playerMint",
            "type": "publicKey"
          },
          {
            "name": "itemUsageInfo",
            "type": {
              "option": "bytes"
            }
          }
        ]
      }
    },
    {
      "name": "UpdateValidForUseIfWarmupPassedOnItemArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "itemMint",
            "type": "publicKey"
          },
          {
            "name": "itemIndex",
            "type": "u64"
          },
          {
            "name": "itemUsageIndex",
            "type": "u16"
          },
          {
            "name": "itemClassIndex",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "itemClassMint",
            "type": "publicKey"
          },
          {
            "name": "usagePermissivenessToUse",
            "type": {
              "option": {
                "defined": "PermissivenessType"
              }
            }
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "playerMint",
            "type": "publicKey"
          },
          {
            "name": "itemUsageProof",
            "type": {
              "option": {
                "vec": {
                  "array": [
                    "u8",
                    32
                  ]
                }
              }
            }
          },
          {
            "name": "itemUsage",
            "type": {
              "option": "bytes"
            }
          }
        ]
      }
    },
    {
      "name": "EquippedItem",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "item",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "index",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "NamespaceAndIndex",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "namespace",
            "type": "publicKey"
          },
          {
            "name": "index",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "inherited",
            "type": {
              "defined": "InheritanceState"
            }
          }
        ]
      }
    },
    {
      "name": "ChildUpdatePropagationPermissiveness",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "overridable",
            "type": "bool"
          },
          {
            "name": "inherited",
            "type": {
              "defined": "InheritanceState"
            }
          },
          {
            "name": "childUpdatePropagationPermissivenessType",
            "type": {
              "defined": "ChildUpdatePropagationPermissivenessType"
            }
          }
        ]
      }
    },
    {
      "name": "PlayerCategory",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "category",
            "type": "string"
          },
          {
            "name": "inherited",
            "type": {
              "defined": "InheritanceState"
            }
          }
        ]
      }
    },
    {
      "name": "StatsUri",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "statsUri",
            "type": "string"
          },
          {
            "name": "inherited",
            "type": {
              "defined": "InheritanceState"
            }
          }
        ]
      }
    },
    {
      "name": "BodyPart",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "index",
            "type": "u16"
          },
          {
            "name": "bodyPart",
            "type": "string"
          },
          {
            "name": "totalItemSpots",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "inherited",
            "type": {
              "defined": "InheritanceState"
            }
          }
        ]
      }
    },
    {
      "name": "PlayerClassData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "settings",
            "type": {
              "defined": "PlayerClassSettings"
            }
          },
          {
            "name": "config",
            "type": {
              "defined": "PlayerClassConfig"
            }
          }
        ]
      }
    },
    {
      "name": "Boolean",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "inherited",
            "type": {
              "defined": "InheritanceState"
            }
          },
          {
            "name": "boolean",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "Permissiveness",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "inherited",
            "type": {
              "defined": "InheritanceState"
            }
          },
          {
            "name": "permissivenessType",
            "type": {
              "defined": "PermissivenessType"
            }
          }
        ]
      }
    },
    {
      "name": "PlayerClassSettings",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "defaultCategory",
            "type": {
              "option": {
                "defined": "PlayerCategory"
              }
            }
          },
          {
            "name": "childrenMustBeEditions",
            "type": {
              "option": {
                "defined": "Boolean"
              }
            }
          },
          {
            "name": "builderMustBeHolder",
            "type": {
              "option": {
                "defined": "Boolean"
              }
            }
          },
          {
            "name": "updatePermissiveness",
            "type": {
              "option": {
                "vec": {
                  "defined": "Permissiveness"
                }
              }
            }
          },
          {
            "name": "instanceUpdatePermissiveness",
            "type": {
              "option": {
                "vec": {
                  "defined": "Permissiveness"
                }
              }
            }
          },
          {
            "name": "buildPermissiveness",
            "type": {
              "option": {
                "vec": {
                  "defined": "Permissiveness"
                }
              }
            }
          },
          {
            "name": "equipItemPermissiveness",
            "type": {
              "option": {
                "vec": {
                  "defined": "Permissiveness"
                }
              }
            }
          },
          {
            "name": "addItemPermissiveness",
            "type": {
              "option": {
                "vec": {
                  "defined": "Permissiveness"
                }
              }
            }
          },
          {
            "name": "useItemPermissiveness",
            "type": {
              "option": {
                "vec": {
                  "defined": "Permissiveness"
                }
              }
            }
          },
          {
            "name": "unequipItemPermissiveness",
            "type": {
              "option": {
                "vec": {
                  "defined": "Permissiveness"
                }
              }
            }
          },
          {
            "name": "removeItemPermissiveness",
            "type": {
              "option": {
                "vec": {
                  "defined": "Permissiveness"
                }
              }
            }
          },
          {
            "name": "stakingWarmUpDuration",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "stakingCooldownDuration",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "stakingPermissiveness",
            "type": {
              "option": {
                "vec": {
                  "defined": "Permissiveness"
                }
              }
            }
          },
          {
            "name": "unstakingPermissiveness",
            "type": {
              "option": {
                "vec": {
                  "defined": "Permissiveness"
                }
              }
            }
          },
          {
            "name": "childUpdatePropagationPermissiveness",
            "type": {
              "option": {
                "vec": {
                  "defined": "ChildUpdatePropagationPermissiveness"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "PlayerClassConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "startingStatsUri",
            "type": {
              "option": {
                "defined": "StatsUri"
              }
            }
          },
          {
            "name": "basicStats",
            "type": {
              "option": {
                "vec": {
                  "defined": "BasicStatTemplate"
                }
              }
            }
          },
          {
            "name": "bodyParts",
            "type": {
              "option": {
                "vec": {
                  "defined": "BodyPart"
                }
              }
            }
          },
          {
            "name": "equipValidation",
            "type": {
              "option": {
                "defined": "Callback"
              }
            }
          },
          {
            "name": "addToPackValidation",
            "type": {
              "option": {
                "defined": "Callback"
              }
            }
          }
        ]
      }
    },
    {
      "name": "Callback",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "key",
            "type": "publicKey"
          },
          {
            "name": "code",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "PlayerData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "statsUri",
            "type": {
              "option": {
                "defined": "StatsUri"
              }
            }
          },
          {
            "name": "category",
            "type": {
              "option": {
                "defined": "PlayerCategory"
              }
            }
          },
          {
            "name": "basicStats",
            "type": {
              "option": {
                "vec": {
                  "defined": "BasicStat"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "BasicStatTemplate",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "index",
            "type": "u16"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "statType",
            "type": {
              "defined": "BasicStatType"
            }
          },
          {
            "name": "inherited",
            "type": {
              "defined": "InheritanceState"
            }
          }
        ]
      }
    },
    {
      "name": "BasicStat",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "index",
            "type": "u16"
          },
          {
            "name": "state",
            "type": {
              "defined": "BasicStatState"
            }
          }
        ]
      }
    },
    {
      "name": "Threshold",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "value",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "BasicItemEffect",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "stat",
            "type": "string"
          },
          {
            "name": "itemEffectType",
            "type": {
              "defined": "BasicItemEffectType"
            }
          },
          {
            "name": "activeDuration",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "stakingAmountNumerator",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "stakingAmountDivisor",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "stakingDurationNumerator",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "stakingDurationDivisor",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "maxUses",
            "type": {
              "option": "u64"
            }
          }
        ]
      }
    },
    {
      "name": "PermissivenessType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "TokenHolder"
          },
          {
            "name": "ParentTokenHolder"
          },
          {
            "name": "UpdateAuthority"
          },
          {
            "name": "Anybody"
          }
        ]
      }
    },
    {
      "name": "InheritanceState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "NotInherited"
          },
          {
            "name": "Inherited"
          },
          {
            "name": "Overridden"
          }
        ]
      }
    },
    {
      "name": "ChildUpdatePropagationPermissivenessType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "UpdatePermissiveness"
          },
          {
            "name": "InstanceUpdatePermissiveness"
          },
          {
            "name": "BuildPermissiveness"
          },
          {
            "name": "ChildUpdatePropagationPermissiveness"
          },
          {
            "name": "ChildrenMustBeEditionsPermissiveness"
          },
          {
            "name": "BuilderMustBeHolderPermissiveness"
          },
          {
            "name": "StakingPermissiveness"
          },
          {
            "name": "Namespaces"
          },
          {
            "name": "EquipItemPermissiveness"
          },
          {
            "name": "AddItemPermissiveness"
          },
          {
            "name": "UseItemPermissiveness"
          },
          {
            "name": "BasicStatTemplates"
          },
          {
            "name": "DefaultCategory"
          },
          {
            "name": "BodyParts"
          },
          {
            "name": "StatsUri"
          }
        ]
      }
    },
    {
      "name": "BasicStatType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Enum",
            "fields": [
              {
                "name": "starting",
                "type": "u8"
              },
              {
                "name": "values",
                "type": {
                  "vec": {
                    "defined": "Threshold"
                  }
                }
              }
            ]
          },
          {
            "name": "Integer",
            "fields": [
              {
                "name": "min",
                "type": {
                  "option": "i64"
                }
              },
              {
                "name": "max",
                "type": {
                  "option": "i64"
                }
              },
              {
                "name": "starting",
                "type": "i64"
              },
              {
                "name": "staking_amount_scaler",
                "type": {
                  "option": "u64"
                }
              },
              {
                "name": "staking_duration_scaler",
                "type": {
                  "option": "u64"
                }
              }
            ]
          },
          {
            "name": "Bool",
            "fields": [
              {
                "name": "starting",
                "type": "bool"
              },
              {
                "name": "staking_flip",
                "type": {
                  "option": "u64"
                }
              }
            ]
          },
          {
            "name": "String",
            "fields": [
              {
                "name": "starting",
                "type": "string"
              }
            ]
          }
        ]
      }
    },
    {
      "name": "BasicStatState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Enum",
            "fields": [
              {
                "name": "current",
                "type": "u8"
              }
            ]
          },
          {
            "name": "Integer",
            "fields": [
              {
                "name": "base",
                "type": "i64"
              },
              {
                "name": "with_temporary_changes",
                "type": "i64"
              },
              {
                "name": "temporary_numerator",
                "type": "i64"
              },
              {
                "name": "temporary_denominator",
                "type": "i64"
              },
              {
                "name": "finalized",
                "type": "i64"
              }
            ]
          },
          {
            "name": "Bool",
            "fields": [
              {
                "name": "current",
                "type": "bool"
              }
            ]
          },
          {
            "name": "String",
            "fields": [
              {
                "name": "current",
                "type": "string"
              }
            ]
          },
          {
            "name": "Null"
          }
        ]
      }
    },
    {
      "name": "StatDiffType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Wearable"
          },
          {
            "name": "Consumable"
          }
        ]
      }
    },
    {
      "name": "BasicItemEffectType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Increment"
          },
          {
            "name": "Decrement"
          },
          {
            "name": "IncrementPercent"
          },
          {
            "name": "DecrementPercent"
          },
          {
            "name": "IncrementPercentFromBase"
          },
          {
            "name": "DecrementPercentFromBase"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "IncorrectOwner",
      "msg": "Account does not have correct owner!"
    },
    {
      "code": 6001,
      "name": "Uninitialized",
      "msg": "Account is not initialized!"
    },
    {
      "code": 6002,
      "name": "MintMismatch",
      "msg": "Mint Mismatch!"
    },
    {
      "code": 6003,
      "name": "TokenTransferFailed",
      "msg": "Token transfer failed"
    },
    {
      "code": 6004,
      "name": "NumericalOverflowError",
      "msg": "Numerical overflow error"
    },
    {
      "code": 6005,
      "name": "TokenMintToFailed",
      "msg": "Token mint to failed"
    },
    {
      "code": 6006,
      "name": "TokenBurnFailed",
      "msg": "TokenBurnFailed"
    },
    {
      "code": 6007,
      "name": "DerivedKeyInvalid",
      "msg": "Derived key is invalid"
    },
    {
      "code": 6008,
      "name": "NoParentPresent",
      "msg": "No parent present"
    },
    {
      "code": 6009,
      "name": "ExpectedParent",
      "msg": "Expected parent"
    },
    {
      "code": 6010,
      "name": "ChildrenStillExist",
      "msg": "You need to kill the children before killing the parent"
    },
    {
      "code": 6011,
      "name": "UnstakeTokensFirst",
      "msg": "Unstake tokens first"
    },
    {
      "code": 6012,
      "name": "MustBeHolderToBuild",
      "msg": "Must be holder to build"
    },
    {
      "code": 6013,
      "name": "CannotRemoveThisMuch",
      "msg": "Cannot remove this much of this item because there is not enough of it or too much of it is equipped"
    },
    {
      "code": 6014,
      "name": "UsageRootNotPresent",
      "msg": "This item lacks a usage root"
    },
    {
      "code": 6015,
      "name": "InvalidProof",
      "msg": "Invalid proof"
    },
    {
      "code": 6016,
      "name": "ItemContainsNoUsages",
      "msg": "Item contains no usages"
    },
    {
      "code": 6017,
      "name": "FoundNoMatchingUsage",
      "msg": "Found no item usage matching this index"
    },
    {
      "code": 6018,
      "name": "CannotEquipConsumable",
      "msg": "Cannot equip consumable"
    },
    {
      "code": 6019,
      "name": "BodyPartNotEligible",
      "msg": "This body part cannot equip this item"
    },
    {
      "code": 6020,
      "name": "CannotUnequipThisMuch",
      "msg": "Cannot unequip this much"
    },
    {
      "code": 6021,
      "name": "BodyPartContainsTooManyOfThisType",
      "msg": "Body part contains too many items of this type on it"
    },
    {
      "code": 6022,
      "name": "BodyPartContainsTooMany",
      "msg": "Body part contains too many items"
    },
    {
      "code": 6023,
      "name": "CannotEquipItemWithoutUsageOrMerkle",
      "msg": "Cannot equip item without usage or merkle"
    },
    {
      "code": 6024,
      "name": "NoBodyPartsToEquip",
      "msg": "No body parts to equip"
    },
    {
      "code": 6025,
      "name": "UnableToFindBodyPartByIndex",
      "msg": "Unable to find body part with this index"
    },
    {
      "code": 6026,
      "name": "ItemCannotBePairedWithSelf",
      "msg": "Item cannot be paired with self"
    },
    {
      "code": 6027,
      "name": "ItemCannotBeEquippedWithDNPEntry",
      "msg": "Item cannot be equipped because a DNP entry is also equipped"
    },
    {
      "code": 6028,
      "name": "BasicStatTemplateTypeDoesNotMatchBasicStatType",
      "msg": "Template stat type does not match stat of player, try updating player permissionlessly before running this command again"
    },
    {
      "code": 6029,
      "name": "CannotAlterThisTypeNumerically",
      "msg": "Cannot numerically alter this type of stat"
    },
    {
      "code": 6030,
      "name": "Unreachable",
      "msg": "Unreachable code"
    },
    {
      "code": 6031,
      "name": "NotValidForUseYet",
      "msg": "Not valid for use yet"
    },
    {
      "code": 6032,
      "name": "RemoveEquipmentFirst",
      "msg": "Remove equipped items first"
    },
    {
      "code": 6033,
      "name": "DeactivateAllItemsFirst",
      "msg": "Deactivate all items first"
    },
    {
      "code": 6034,
      "name": "RemoveAllItemsFromBackpackFirst",
      "msg": "Remove all items from backpack first"
    },
    {
      "code": 6035,
      "name": "InsufficientBalance",
      "msg": "Insufficient Balance"
    },
    {
      "code": 6036,
      "name": "PermissivenessNotFound",
      "msg": "Permissiveness Not Found"
    },
    {
      "code": 6037,
      "name": "MustSpecifyPermissivenessType",
      "msg": "Must specify permissiveness type"
    },
    {
      "code": 6038,
      "name": "IndexAlreadyUsed",
      "msg": "Cannot use the same index in basic stats or body parts twice"
    },
    {
      "code": 6039,
      "name": "NameAlreadyUsed",
      "msg": "Cannot use the same name in basic stats or body parts twice"
    },
    {
      "code": 6040,
      "name": "CannotResetPlayerStatsUntilItemEffectsAreRemoved",
      "msg": "Cannot reset player until item effects removed"
    },
    {
      "code": 6041,
      "name": "FailedToJoinNamespace",
      "msg": "Failed to join namespace"
    },
    {
      "code": 6042,
      "name": "FailedToLeaveNamespace",
      "msg": "Failed to leave namespace"
    },
    {
      "code": 6043,
      "name": "FailedToCache",
      "msg": "Failed to cache"
    },
    {
      "code": 6044,
      "name": "FailedToUncache",
      "msg": "Failed to uncache"
    },
    {
      "code": 6045,
      "name": "AlreadyCached",
      "msg": "Already cached"
    },
    {
      "code": 6046,
      "name": "NotCached",
      "msg": "Not cached"
    },
    {
      "code": 6047,
      "name": "UnauthorizedCaller",
      "msg": "Unauthorized Caller"
    },
    {
      "code": 6048,
      "name": "RainTokenMintMismatch",
      "msg": "Rain token mint mismatch"
    },
    {
      "code": 6049,
      "name": "AmountMustBeGreaterThanZero",
      "msg": "Amount must be greater than zero"
    }
  ]
};
