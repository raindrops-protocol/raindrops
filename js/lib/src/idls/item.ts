export type Item = {
  "version": "0.1.0",
  "name": "item",
  "instructions": [
    {
      "name": "createItemClass",
      "accounts": [
        {
          "name": "itemClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemMint",
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
            "defined": "CreateItemClassArgs"
          }
        }
      ]
    },
    {
      "name": "updateItemClass",
      "accounts": [
        {
          "name": "itemClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemMint",
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
            "defined": "UpdateItemClassArgs"
          }
        }
      ]
    },
    {
      "name": "drainItemClass",
      "accounts": [
        {
          "name": "itemClass",
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
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "DrainItemClassArgs"
          }
        }
      ]
    },
    {
      "name": "drainItem",
      "accounts": [
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
          "name": "receiver",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "DrainItemArgs"
          }
        }
      ]
    },
    {
      "name": "createItemEscrow",
      "accounts": [
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClassMetadata",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "newItemMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "newItemMetadata",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "newItemEdition",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "newItemToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "newItemTokenHolder",
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
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "CreateItemEscrowArgs"
          }
        }
      ]
    },
    {
      "name": "addCraftItemToEscrow",
      "accounts": [
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "craftItemCounter",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "newItemToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "newItemTokenHolder",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "craftItemTokenAccountEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "craftItemTokenMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "craftItemTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "craftItem",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "craftItemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "craftItemTransferAuthority",
          "isMut": false,
          "isSigner": true
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
          "name": "clock",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "AddCraftItemToEscrowArgs"
          }
        }
      ]
    },
    {
      "name": "removeCraftItemFromEscrow",
      "accounts": [
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "craftItemCounter",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "newItemToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "newItemTokenHolder",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "craftItemTokenAccountEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "craftItemTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "craftItem",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "craftItemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "receiver",
          "isMut": false,
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
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "RemoveCraftItemFromEscrowArgs"
          }
        }
      ]
    },
    {
      "name": "startItemEscrowBuildPhase",
      "accounts": [
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "newItemToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "newItemTokenHolder",
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
            "defined": "StartItemEscrowBuildPhaseArgs"
          }
        }
      ]
    },
    {
      "name": "completeItemEscrowBuildPhase",
      "accounts": [
        {
          "name": "itemClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "newItem",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "newItemMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "newItemMetadata",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "newItemEdition",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "newItemToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "newItemTokenHolder",
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
            "defined": "CompleteItemEscrowBuildPhaseArgs"
          }
        }
      ]
    },
    {
      "name": "updateItem",
      "accounts": [
        {
          "name": "itemClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "item",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "UpdateItemArgs"
          }
        }
      ]
    },
    {
      "name": "deactivateItemEscrow",
      "accounts": [
        {
          "name": "itemEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "originator",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "DeactivateItemEscrowArgs"
          }
        }
      ]
    },
    {
      "name": "drainItemEscrow",
      "accounts": [
        {
          "name": "itemEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "originator",
          "isMut": true,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "DrainItemEscrowArgs"
          }
        }
      ]
    },
    {
      "name": "beginItemActivation",
      "accounts": [
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "item",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemAccount",
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
            "defined": "BeginItemActivationArgs"
          }
        }
      ]
    },
    {
      "name": "endItemActivation",
      "accounts": [
        {
          "name": "item",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemMint",
          "isMut": true,
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
          "name": "tokenProgram",
          "isMut": false,
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
            "defined": "EndItemActivationArgs"
          }
        }
      ]
    },
    {
      "name": "resetStateValidationForActivation",
      "accounts": [
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
          "name": "itemAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemActivationMarker",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "ResetStateValidationForActivationArgs"
          }
        }
      ]
    },
    {
      "name": "updateValidForUseIfWarmupPassed",
      "accounts": [
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
          "name": "itemAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemActivationMarker",
          "isMut": true,
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
            "defined": "UpdateValidForUseIfWarmupPassedArgs"
          }
        }
      ]
    },
    {
      "name": "proveNewStateValid",
      "accounts": [
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
          "name": "itemAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemActivationMarker",
          "isMut": true,
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
            "defined": "ProveNewStateValidArgs"
          }
        }
      ]
    },
    {
      "name": "itemClassJoinNamespace",
      "accounts": [
        {
          "name": "itemClass",
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
      "name": "itemClassLeaveNamespace",
      "accounts": [
        {
          "name": "itemClass",
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
      "name": "itemClassCacheNamespace",
      "accounts": [
        {
          "name": "itemClass",
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
      "name": "itemClassUncacheNamespace",
      "accounts": [
        {
          "name": "itemClass",
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
      "name": "updateTokensStaked",
      "accounts": [
        {
          "name": "item",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "instructionSysvarAccount",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "UpdateTokensStakedArgs"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "itemClass",
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
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "existingChildren",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "itemEscrow",
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
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "deactivated",
            "type": "bool"
          },
          {
            "name": "step",
            "type": "u64"
          },
          {
            "name": "timeToBuild",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "buildBegan",
            "type": {
              "option": "u64"
            }
          }
        ]
      }
    },
    {
      "name": "craftItemCounter",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amountLoaded",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "itemActivationMarker",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "validForUse",
            "type": "bool"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "unixTimestamp",
            "type": "u64"
          },
          {
            "name": "proofCounter",
            "type": {
              "option": {
                "defined": "ItemActivationMarkerProofCounter"
              }
            }
          },
          {
            "name": "target",
            "type": {
              "option": "publicKey"
            }
          }
        ]
      }
    },
    {
      "name": "item",
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
            "name": "data",
            "type": {
              "defined": "ItemData"
            }
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "CreateItemClassArgs",
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
            "name": "itemClassData",
            "type": {
              "defined": "ItemClassData"
            }
          }
        ]
      }
    },
    {
      "name": "DrainItemClassArgs",
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
            "name": "itemClassMint",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "UpdateItemClassArgs",
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
            "name": "itemClassData",
            "type": {
              "option": {
                "defined": "ItemClassData"
              }
            }
          }
        ]
      }
    },
    {
      "name": "DrainItemArgs",
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
            "name": "itemMint",
            "type": "publicKey"
          },
          {
            "name": "itemClassMint",
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
      "name": "CreateItemEscrowArgs",
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
            "name": "craftEscrowIndex",
            "type": "u64"
          },
          {
            "name": "componentScope",
            "type": "string"
          },
          {
            "name": "amountToMake",
            "type": "u64"
          },
          {
            "name": "namespaceIndex",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "itemClassMint",
            "type": "publicKey"
          },
          {
            "name": "buildPermissivenessToUse",
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
      "name": "AddCraftItemToEscrowArgs",
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
            "name": "craftItemIndex",
            "type": "u64"
          },
          {
            "name": "craftItemClassIndex",
            "type": "u64"
          },
          {
            "name": "craftItemClassMint",
            "type": "publicKey"
          },
          {
            "name": "craftEscrowIndex",
            "type": "u64"
          },
          {
            "name": "componentScope",
            "type": "string"
          },
          {
            "name": "amountToMake",
            "type": "u64"
          },
          {
            "name": "amountToContributeFromThisContributor",
            "type": "u64"
          },
          {
            "name": "itemClassMint",
            "type": "publicKey"
          },
          {
            "name": "newItemMint",
            "type": "publicKey"
          },
          {
            "name": "originator",
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
            "name": "componentProof",
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
            "name": "component",
            "type": {
              "option": {
                "defined": "Component"
              }
            }
          },
          {
            "name": "craftUsageInfo",
            "type": {
              "option": {
                "defined": "CraftUsageInfo"
              }
            }
          }
        ]
      }
    },
    {
      "name": "StartItemEscrowBuildPhaseArgs",
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
            "name": "craftEscrowIndex",
            "type": "u64"
          },
          {
            "name": "componentScope",
            "type": "string"
          },
          {
            "name": "amountToMake",
            "type": "u64"
          },
          {
            "name": "itemClassMint",
            "type": "publicKey"
          },
          {
            "name": "originator",
            "type": "publicKey"
          },
          {
            "name": "newItemMint",
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
            "name": "endNodeProof",
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
            "name": "totalSteps",
            "type": {
              "option": "u64"
            }
          }
        ]
      }
    },
    {
      "name": "CompleteItemEscrowBuildPhaseArgs",
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
            "name": "newItemIndex",
            "type": "u64"
          },
          {
            "name": "craftEscrowIndex",
            "type": "u64"
          },
          {
            "name": "componentScope",
            "type": "string"
          },
          {
            "name": "amountToMake",
            "type": "u64"
          },
          {
            "name": "space",
            "type": "u64"
          },
          {
            "name": "itemClassMint",
            "type": "publicKey"
          },
          {
            "name": "originator",
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
      "name": "UpdateItemArgs",
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
            "name": "itemMint",
            "type": "publicKey"
          },
          {
            "name": "itemClassMint",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "DeactivateItemEscrowArgs",
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
            "name": "craftEscrowIndex",
            "type": "u64"
          },
          {
            "name": "componentScope",
            "type": "string"
          },
          {
            "name": "amountToMake",
            "type": "u64"
          },
          {
            "name": "itemClassMint",
            "type": "publicKey"
          },
          {
            "name": "newItemMint",
            "type": "publicKey"
          },
          {
            "name": "newItemToken",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "DrainItemEscrowArgs",
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
            "name": "craftEscrowIndex",
            "type": "u64"
          },
          {
            "name": "componentScope",
            "type": "string"
          },
          {
            "name": "amountToMake",
            "type": "u64"
          },
          {
            "name": "itemClassMint",
            "type": "publicKey"
          },
          {
            "name": "newItemMint",
            "type": "publicKey"
          },
          {
            "name": "newItemToken",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "RemoveCraftItemFromEscrowArgs",
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
            "name": "craftItemIndex",
            "type": "u64"
          },
          {
            "name": "craftEscrowIndex",
            "type": "u64"
          },
          {
            "name": "componentScope",
            "type": "string"
          },
          {
            "name": "amountToMake",
            "type": "u64"
          },
          {
            "name": "amountContributedFromThisContributor",
            "type": "u64"
          },
          {
            "name": "itemClassMint",
            "type": "publicKey"
          },
          {
            "name": "newItemMint",
            "type": "publicKey"
          },
          {
            "name": "originator",
            "type": "publicKey"
          },
          {
            "name": "craftItemTokenMint",
            "type": "publicKey"
          },
          {
            "name": "craftItemClassIndex",
            "type": "u64"
          },
          {
            "name": "craftItemClassMint",
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
            "name": "componentProof",
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
            "name": "component",
            "type": {
              "option": {
                "defined": "Component"
              }
            }
          }
        ]
      }
    },
    {
      "name": "BeginItemActivationArgs",
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
                "defined": "UsageInfo"
              }
            }
          }
        ]
      }
    },
    {
      "name": "ValidationArgs",
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
              "option": {
                "defined": "UsageInfo"
              }
            }
          }
        ]
      }
    },
    {
      "name": "ProveNewStateValidArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "usageStateProofs",
            "type": {
              "vec": {
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
            "name": "newUsageStateProofs",
            "type": {
              "vec": {
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
            "name": "usageStates",
            "type": {
              "vec": {
                "defined": "ItemUsageState"
              }
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
            "name": "amount",
            "type": "u64"
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
                "defined": "ItemUsage"
              }
            }
          },
          {
            "name": "classIndex",
            "type": "u64"
          },
          {
            "name": "itemClassMint",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "ResetStateValidationForActivationArgs",
      "type": {
        "kind": "struct",
        "fields": [
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
      "name": "UpdateValidForUseIfWarmupPassedArgs",
      "type": {
        "kind": "struct",
        "fields": [
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
                "defined": "ItemUsage"
              }
            }
          }
        ]
      }
    },
    {
      "name": "EndItemActivationArgs",
      "type": {
        "kind": "struct",
        "fields": [
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
                "defined": "CraftUsageInfo"
              }
            }
          }
        ]
      }
    },
    {
      "name": "UpdateTokensStakedArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "itemMint",
            "type": "publicKey"
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "staked",
            "type": "bool"
          },
          {
            "name": "amount",
            "type": "u64"
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
      "name": "ItemUsage",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "index",
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
            "name": "usagePermissiveness",
            "type": {
              "vec": {
                "defined": "PermissivenessType"
              }
            }
          },
          {
            "name": "inherited",
            "type": {
              "defined": "InheritanceState"
            }
          },
          {
            "name": "itemClassType",
            "type": {
              "defined": "ItemClassType"
            }
          },
          {
            "name": "callback",
            "type": {
              "option": {
                "defined": "Callback"
              }
            }
          },
          {
            "name": "validation",
            "type": {
              "option": {
                "defined": "Callback"
              }
            }
          },
          {
            "name": "doNotPairWithSelf",
            "type": "bool"
          },
          {
            "name": "dnp",
            "type": {
              "option": {
                "vec": {
                  "defined": "DNPItem"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "ItemUsageState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "index",
            "type": "u16"
          },
          {
            "name": "uses",
            "type": "u64"
          },
          {
            "name": "activatedAt",
            "type": {
              "option": "u64"
            }
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
      "name": "Component",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "publicKey"
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
            "name": "timeToBuild",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "componentScope",
            "type": "string"
          },
          {
            "name": "useUsageIndex",
            "type": "u16"
          },
          {
            "name": "condition",
            "type": {
              "defined": "ComponentCondition"
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
      "name": "DNPItem",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "key",
            "type": "publicKey"
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
      "name": "Root",
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
            "name": "root",
            "type": {
              "array": [
                "u8",
                32
              ]
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
      "name": "ItemClassSettings",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "freeBuild",
            "type": {
              "option": {
                "defined": "Boolean"
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
      "name": "ItemClassConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "usageRoot",
            "type": {
              "option": {
                "defined": "Root"
              }
            }
          },
          {
            "name": "usageStateRoot",
            "type": {
              "option": {
                "defined": "Root"
              }
            }
          },
          {
            "name": "componentRoot",
            "type": {
              "option": {
                "defined": "Root"
              }
            }
          },
          {
            "name": "usages",
            "type": {
              "option": {
                "vec": {
                  "defined": "ItemUsage"
                }
              }
            }
          },
          {
            "name": "components",
            "type": {
              "option": {
                "vec": {
                  "defined": "Component"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "ItemClassData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "settings",
            "type": {
              "defined": "ItemClassSettings"
            }
          },
          {
            "name": "config",
            "type": {
              "defined": "ItemClassConfig"
            }
          }
        ]
      }
    },
    {
      "name": "ItemActivationMarkerProofCounter",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "statesProven",
            "type": "u16"
          },
          {
            "name": "statesRequired",
            "type": "u16"
          },
          {
            "name": "ignoreIndex",
            "type": "u16"
          },
          {
            "name": "newStateRoot",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "ItemData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "usageStateRoot",
            "type": {
              "option": {
                "defined": "Root"
              }
            }
          },
          {
            "name": "usageStates",
            "type": {
              "option": {
                "vec": {
                  "defined": "ItemUsageState"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "CraftUsageInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "craftUsageStateProof",
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
            "name": "craftUsageState",
            "type": {
              "defined": "ItemUsageState"
            }
          },
          {
            "name": "craftUsageProof",
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
            "name": "craftUsage",
            "type": {
              "defined": "ItemUsage"
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
            "type": {
              "defined": "ItemUsage"
            }
          },
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
            "type": {
              "defined": "ItemUsageState"
            }
          },
          {
            "name": "newUsageStateProof",
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
            "name": "newUsageStateRoot",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "totalStates",
            "type": "u16"
          },
          {
            "name": "totalStatesProof",
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
            "name": "newTotalStatesProof",
            "type": {
              "vec": {
                "array": [
                  "u8",
                  32
                ]
              }
            }
          }
        ]
      }
    },
    {
      "name": "ItemClassType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Wearable",
            "fields": [
              {
                "name": "body_part",
                "type": {
                  "vec": "string"
                }
              },
              {
                "name": "limit_per_part",
                "type": {
                  "option": "u64"
                }
              }
            ]
          },
          {
            "name": "Consumable",
            "fields": [
              {
                "name": "max_uses",
                "type": {
                  "option": "u64"
                }
              },
              {
                "name": "max_players_per_use",
                "type": {
                  "option": "u64"
                }
              },
              {
                "name": "item_usage_type",
                "type": {
                  "defined": "ItemUsageType"
                }
              },
              {
                "name": "cooldown_duration",
                "type": {
                  "option": "u64"
                }
              },
              {
                "name": "warmup_duration",
                "type": {
                  "option": "u64"
                }
              }
            ]
          }
        ]
      }
    },
    {
      "name": "ItemUsageType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Exhaustion"
          },
          {
            "name": "Destruction"
          },
          {
            "name": "Infinite"
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
    },
    {
      "name": "ComponentCondition",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Consumed"
          },
          {
            "name": "Presence"
          },
          {
            "name": "Absence"
          },
          {
            "name": "Cooldown"
          },
          {
            "name": "CooldownAndConsume"
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
      "name": "ChildUpdatePropagationPermissivenessType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Usages"
          },
          {
            "name": "Components"
          },
          {
            "name": "UpdatePermissiveness"
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
            "name": "FreeBuildPermissiveness"
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
      "name": "ErrorCode",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "IncorrectOwner"
          },
          {
            "name": "Uninitialized"
          },
          {
            "name": "MintMismatch"
          },
          {
            "name": "TokenTransferFailed"
          },
          {
            "name": "NumericalOverflowError"
          },
          {
            "name": "TokenMintToFailed"
          },
          {
            "name": "TokenBurnFailed"
          },
          {
            "name": "DerivedKeyInvalid"
          },
          {
            "name": "MustSpecifyPermissivenessType"
          },
          {
            "name": "PermissivenessNotFound"
          },
          {
            "name": "PublicKeyMismatch"
          },
          {
            "name": "InsufficientBalance"
          },
          {
            "name": "MetadataDoesntExist"
          },
          {
            "name": "EditionDoesntExist"
          },
          {
            "name": "NoParentPresent"
          },
          {
            "name": "ExpectedParent"
          },
          {
            "name": "InvalidMintAuthority"
          },
          {
            "name": "NotMintAuthority"
          },
          {
            "name": "CannotMakeZero"
          },
          {
            "name": "MustBeHolderToBuild"
          },
          {
            "name": "InvalidConfigForFungibleMints"
          },
          {
            "name": "MissingMerkleInfo"
          },
          {
            "name": "InvalidProof"
          },
          {
            "name": "ItemReadyForCompletion"
          },
          {
            "name": "MustUseMerkleOrComponentList"
          },
          {
            "name": "MustUseMerkleOrUsageState"
          },
          {
            "name": "UnableToFindValidCooldownState"
          },
          {
            "name": "BalanceNeedsToBeZero"
          },
          {
            "name": "NotPartOfComponentScope"
          },
          {
            "name": "TimeToBuildMismatch"
          },
          {
            "name": "StakingMintNotWhitelisted"
          },
          {
            "name": "BuildPhaseNotStarted"
          },
          {
            "name": "BuildPhaseNotFinished"
          },
          {
            "name": "DeactivatedItemEscrow"
          },
          {
            "name": "BuildPhaseAlreadyStarted"
          },
          {
            "name": "StillMissingComponents"
          },
          {
            "name": "ChildrenStillExist"
          },
          {
            "name": "UnstakeTokensFirst"
          },
          {
            "name": "AlreadyDeactivated"
          },
          {
            "name": "NotDeactivated"
          },
          {
            "name": "NotEmptied"
          },
          {
            "name": "GivingTooMuch"
          },
          {
            "name": "MustProvideUsageIndex"
          },
          {
            "name": "CannotUseItemWithoutUsageOrMerkle"
          },
          {
            "name": "MaxUsesReached"
          },
          {
            "name": "CooldownNotOver"
          },
          {
            "name": "CannotUseWearable"
          },
          {
            "name": "UsageIndexMismatch"
          },
          {
            "name": "ProvingNewStateNotRequired"
          },
          {
            "name": "MustSubmitStatesInOrder"
          },
          {
            "name": "ItemActivationNotValidYet"
          },
          {
            "name": "WarmupNotFinished"
          },
          {
            "name": "MustBeChild"
          },
          {
            "name": "MustUseRealScope"
          },
          {
            "name": "CraftClassIndexMismatch"
          },
          {
            "name": "MustBeGreaterThanZero"
          },
          {
            "name": "AtaShouldNotHaveDelegate"
          },
          {
            "name": "ReinitializationDetected"
          },
          {
            "name": "FailedToJoinNamespace"
          },
          {
            "name": "FailedToLeaveNamespace"
          },
          {
            "name": "FailedToCache"
          },
          {
            "name": "FailedToUncache"
          },
          {
            "name": "AlreadyCached"
          },
          {
            "name": "NotCached"
          },
          {
            "name": "UnauthorizedCaller"
          },
          {
            "name": "MustBeCalledByStakingProgram"
          },
          {
            "name": "ExpectedDelegateToMatchProvided"
          },
          {
            "name": "CannotEffectTheSameStatTwice"
          }
        ]
      }
    }
  ]
};

export const IDL: Item = {
  "version": "0.1.0",
  "name": "item",
  "instructions": [
    {
      "name": "createItemClass",
      "accounts": [
        {
          "name": "itemClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemMint",
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
            "defined": "CreateItemClassArgs"
          }
        }
      ]
    },
    {
      "name": "updateItemClass",
      "accounts": [
        {
          "name": "itemClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemMint",
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
            "defined": "UpdateItemClassArgs"
          }
        }
      ]
    },
    {
      "name": "drainItemClass",
      "accounts": [
        {
          "name": "itemClass",
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
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "DrainItemClassArgs"
          }
        }
      ]
    },
    {
      "name": "drainItem",
      "accounts": [
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
          "name": "receiver",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "DrainItemArgs"
          }
        }
      ]
    },
    {
      "name": "createItemEscrow",
      "accounts": [
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClassMetadata",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "newItemMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "newItemMetadata",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "newItemEdition",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "newItemToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "newItemTokenHolder",
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
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "CreateItemEscrowArgs"
          }
        }
      ]
    },
    {
      "name": "addCraftItemToEscrow",
      "accounts": [
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "craftItemCounter",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "newItemToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "newItemTokenHolder",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "craftItemTokenAccountEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "craftItemTokenMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "craftItemTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "craftItem",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "craftItemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "craftItemTransferAuthority",
          "isMut": false,
          "isSigner": true
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
          "name": "clock",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "AddCraftItemToEscrowArgs"
          }
        }
      ]
    },
    {
      "name": "removeCraftItemFromEscrow",
      "accounts": [
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "craftItemCounter",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "newItemToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "newItemTokenHolder",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "craftItemTokenAccountEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "craftItemTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "craftItem",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "craftItemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "receiver",
          "isMut": false,
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
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "RemoveCraftItemFromEscrowArgs"
          }
        }
      ]
    },
    {
      "name": "startItemEscrowBuildPhase",
      "accounts": [
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "newItemToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "newItemTokenHolder",
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
            "defined": "StartItemEscrowBuildPhaseArgs"
          }
        }
      ]
    },
    {
      "name": "completeItemEscrowBuildPhase",
      "accounts": [
        {
          "name": "itemClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "newItem",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "newItemMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "newItemMetadata",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "newItemEdition",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "newItemToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "newItemTokenHolder",
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
            "defined": "CompleteItemEscrowBuildPhaseArgs"
          }
        }
      ]
    },
    {
      "name": "updateItem",
      "accounts": [
        {
          "name": "itemClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "item",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "UpdateItemArgs"
          }
        }
      ]
    },
    {
      "name": "deactivateItemEscrow",
      "accounts": [
        {
          "name": "itemEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "originator",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "DeactivateItemEscrowArgs"
          }
        }
      ]
    },
    {
      "name": "drainItemEscrow",
      "accounts": [
        {
          "name": "itemEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "originator",
          "isMut": true,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "DrainItemEscrowArgs"
          }
        }
      ]
    },
    {
      "name": "beginItemActivation",
      "accounts": [
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "item",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemAccount",
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
            "defined": "BeginItemActivationArgs"
          }
        }
      ]
    },
    {
      "name": "endItemActivation",
      "accounts": [
        {
          "name": "item",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemMint",
          "isMut": true,
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
          "name": "tokenProgram",
          "isMut": false,
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
            "defined": "EndItemActivationArgs"
          }
        }
      ]
    },
    {
      "name": "resetStateValidationForActivation",
      "accounts": [
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
          "name": "itemAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemActivationMarker",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "ResetStateValidationForActivationArgs"
          }
        }
      ]
    },
    {
      "name": "updateValidForUseIfWarmupPassed",
      "accounts": [
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
          "name": "itemAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemActivationMarker",
          "isMut": true,
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
            "defined": "UpdateValidForUseIfWarmupPassedArgs"
          }
        }
      ]
    },
    {
      "name": "proveNewStateValid",
      "accounts": [
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
          "name": "itemAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemActivationMarker",
          "isMut": true,
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
            "defined": "ProveNewStateValidArgs"
          }
        }
      ]
    },
    {
      "name": "itemClassJoinNamespace",
      "accounts": [
        {
          "name": "itemClass",
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
      "name": "itemClassLeaveNamespace",
      "accounts": [
        {
          "name": "itemClass",
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
      "name": "itemClassCacheNamespace",
      "accounts": [
        {
          "name": "itemClass",
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
      "name": "itemClassUncacheNamespace",
      "accounts": [
        {
          "name": "itemClass",
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
      "name": "updateTokensStaked",
      "accounts": [
        {
          "name": "item",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "instructionSysvarAccount",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "UpdateTokensStakedArgs"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "itemClass",
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
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "existingChildren",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "itemEscrow",
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
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "deactivated",
            "type": "bool"
          },
          {
            "name": "step",
            "type": "u64"
          },
          {
            "name": "timeToBuild",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "buildBegan",
            "type": {
              "option": "u64"
            }
          }
        ]
      }
    },
    {
      "name": "craftItemCounter",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amountLoaded",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "itemActivationMarker",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "validForUse",
            "type": "bool"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "unixTimestamp",
            "type": "u64"
          },
          {
            "name": "proofCounter",
            "type": {
              "option": {
                "defined": "ItemActivationMarkerProofCounter"
              }
            }
          },
          {
            "name": "target",
            "type": {
              "option": "publicKey"
            }
          }
        ]
      }
    },
    {
      "name": "item",
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
            "name": "data",
            "type": {
              "defined": "ItemData"
            }
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "CreateItemClassArgs",
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
            "name": "itemClassData",
            "type": {
              "defined": "ItemClassData"
            }
          }
        ]
      }
    },
    {
      "name": "DrainItemClassArgs",
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
            "name": "itemClassMint",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "UpdateItemClassArgs",
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
            "name": "itemClassData",
            "type": {
              "option": {
                "defined": "ItemClassData"
              }
            }
          }
        ]
      }
    },
    {
      "name": "DrainItemArgs",
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
            "name": "itemMint",
            "type": "publicKey"
          },
          {
            "name": "itemClassMint",
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
      "name": "CreateItemEscrowArgs",
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
            "name": "craftEscrowIndex",
            "type": "u64"
          },
          {
            "name": "componentScope",
            "type": "string"
          },
          {
            "name": "amountToMake",
            "type": "u64"
          },
          {
            "name": "namespaceIndex",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "itemClassMint",
            "type": "publicKey"
          },
          {
            "name": "buildPermissivenessToUse",
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
      "name": "AddCraftItemToEscrowArgs",
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
            "name": "craftItemIndex",
            "type": "u64"
          },
          {
            "name": "craftItemClassIndex",
            "type": "u64"
          },
          {
            "name": "craftItemClassMint",
            "type": "publicKey"
          },
          {
            "name": "craftEscrowIndex",
            "type": "u64"
          },
          {
            "name": "componentScope",
            "type": "string"
          },
          {
            "name": "amountToMake",
            "type": "u64"
          },
          {
            "name": "amountToContributeFromThisContributor",
            "type": "u64"
          },
          {
            "name": "itemClassMint",
            "type": "publicKey"
          },
          {
            "name": "newItemMint",
            "type": "publicKey"
          },
          {
            "name": "originator",
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
            "name": "componentProof",
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
            "name": "component",
            "type": {
              "option": {
                "defined": "Component"
              }
            }
          },
          {
            "name": "craftUsageInfo",
            "type": {
              "option": {
                "defined": "CraftUsageInfo"
              }
            }
          }
        ]
      }
    },
    {
      "name": "StartItemEscrowBuildPhaseArgs",
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
            "name": "craftEscrowIndex",
            "type": "u64"
          },
          {
            "name": "componentScope",
            "type": "string"
          },
          {
            "name": "amountToMake",
            "type": "u64"
          },
          {
            "name": "itemClassMint",
            "type": "publicKey"
          },
          {
            "name": "originator",
            "type": "publicKey"
          },
          {
            "name": "newItemMint",
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
            "name": "endNodeProof",
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
            "name": "totalSteps",
            "type": {
              "option": "u64"
            }
          }
        ]
      }
    },
    {
      "name": "CompleteItemEscrowBuildPhaseArgs",
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
            "name": "newItemIndex",
            "type": "u64"
          },
          {
            "name": "craftEscrowIndex",
            "type": "u64"
          },
          {
            "name": "componentScope",
            "type": "string"
          },
          {
            "name": "amountToMake",
            "type": "u64"
          },
          {
            "name": "space",
            "type": "u64"
          },
          {
            "name": "itemClassMint",
            "type": "publicKey"
          },
          {
            "name": "originator",
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
      "name": "UpdateItemArgs",
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
            "name": "itemMint",
            "type": "publicKey"
          },
          {
            "name": "itemClassMint",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "DeactivateItemEscrowArgs",
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
            "name": "craftEscrowIndex",
            "type": "u64"
          },
          {
            "name": "componentScope",
            "type": "string"
          },
          {
            "name": "amountToMake",
            "type": "u64"
          },
          {
            "name": "itemClassMint",
            "type": "publicKey"
          },
          {
            "name": "newItemMint",
            "type": "publicKey"
          },
          {
            "name": "newItemToken",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "DrainItemEscrowArgs",
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
            "name": "craftEscrowIndex",
            "type": "u64"
          },
          {
            "name": "componentScope",
            "type": "string"
          },
          {
            "name": "amountToMake",
            "type": "u64"
          },
          {
            "name": "itemClassMint",
            "type": "publicKey"
          },
          {
            "name": "newItemMint",
            "type": "publicKey"
          },
          {
            "name": "newItemToken",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "RemoveCraftItemFromEscrowArgs",
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
            "name": "craftItemIndex",
            "type": "u64"
          },
          {
            "name": "craftEscrowIndex",
            "type": "u64"
          },
          {
            "name": "componentScope",
            "type": "string"
          },
          {
            "name": "amountToMake",
            "type": "u64"
          },
          {
            "name": "amountContributedFromThisContributor",
            "type": "u64"
          },
          {
            "name": "itemClassMint",
            "type": "publicKey"
          },
          {
            "name": "newItemMint",
            "type": "publicKey"
          },
          {
            "name": "originator",
            "type": "publicKey"
          },
          {
            "name": "craftItemTokenMint",
            "type": "publicKey"
          },
          {
            "name": "craftItemClassIndex",
            "type": "u64"
          },
          {
            "name": "craftItemClassMint",
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
            "name": "componentProof",
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
            "name": "component",
            "type": {
              "option": {
                "defined": "Component"
              }
            }
          }
        ]
      }
    },
    {
      "name": "BeginItemActivationArgs",
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
                "defined": "UsageInfo"
              }
            }
          }
        ]
      }
    },
    {
      "name": "ValidationArgs",
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
              "option": {
                "defined": "UsageInfo"
              }
            }
          }
        ]
      }
    },
    {
      "name": "ProveNewStateValidArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "usageStateProofs",
            "type": {
              "vec": {
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
            "name": "newUsageStateProofs",
            "type": {
              "vec": {
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
            "name": "usageStates",
            "type": {
              "vec": {
                "defined": "ItemUsageState"
              }
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
            "name": "amount",
            "type": "u64"
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
                "defined": "ItemUsage"
              }
            }
          },
          {
            "name": "classIndex",
            "type": "u64"
          },
          {
            "name": "itemClassMint",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "ResetStateValidationForActivationArgs",
      "type": {
        "kind": "struct",
        "fields": [
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
      "name": "UpdateValidForUseIfWarmupPassedArgs",
      "type": {
        "kind": "struct",
        "fields": [
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
                "defined": "ItemUsage"
              }
            }
          }
        ]
      }
    },
    {
      "name": "EndItemActivationArgs",
      "type": {
        "kind": "struct",
        "fields": [
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
                "defined": "CraftUsageInfo"
              }
            }
          }
        ]
      }
    },
    {
      "name": "UpdateTokensStakedArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "itemMint",
            "type": "publicKey"
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "staked",
            "type": "bool"
          },
          {
            "name": "amount",
            "type": "u64"
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
      "name": "ItemUsage",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "index",
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
            "name": "usagePermissiveness",
            "type": {
              "vec": {
                "defined": "PermissivenessType"
              }
            }
          },
          {
            "name": "inherited",
            "type": {
              "defined": "InheritanceState"
            }
          },
          {
            "name": "itemClassType",
            "type": {
              "defined": "ItemClassType"
            }
          },
          {
            "name": "callback",
            "type": {
              "option": {
                "defined": "Callback"
              }
            }
          },
          {
            "name": "validation",
            "type": {
              "option": {
                "defined": "Callback"
              }
            }
          },
          {
            "name": "doNotPairWithSelf",
            "type": "bool"
          },
          {
            "name": "dnp",
            "type": {
              "option": {
                "vec": {
                  "defined": "DNPItem"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "ItemUsageState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "index",
            "type": "u16"
          },
          {
            "name": "uses",
            "type": "u64"
          },
          {
            "name": "activatedAt",
            "type": {
              "option": "u64"
            }
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
      "name": "Component",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "publicKey"
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
            "name": "timeToBuild",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "componentScope",
            "type": "string"
          },
          {
            "name": "useUsageIndex",
            "type": "u16"
          },
          {
            "name": "condition",
            "type": {
              "defined": "ComponentCondition"
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
      "name": "DNPItem",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "key",
            "type": "publicKey"
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
      "name": "Root",
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
            "name": "root",
            "type": {
              "array": [
                "u8",
                32
              ]
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
      "name": "ItemClassSettings",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "freeBuild",
            "type": {
              "option": {
                "defined": "Boolean"
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
      "name": "ItemClassConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "usageRoot",
            "type": {
              "option": {
                "defined": "Root"
              }
            }
          },
          {
            "name": "usageStateRoot",
            "type": {
              "option": {
                "defined": "Root"
              }
            }
          },
          {
            "name": "componentRoot",
            "type": {
              "option": {
                "defined": "Root"
              }
            }
          },
          {
            "name": "usages",
            "type": {
              "option": {
                "vec": {
                  "defined": "ItemUsage"
                }
              }
            }
          },
          {
            "name": "components",
            "type": {
              "option": {
                "vec": {
                  "defined": "Component"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "ItemClassData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "settings",
            "type": {
              "defined": "ItemClassSettings"
            }
          },
          {
            "name": "config",
            "type": {
              "defined": "ItemClassConfig"
            }
          }
        ]
      }
    },
    {
      "name": "ItemActivationMarkerProofCounter",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "statesProven",
            "type": "u16"
          },
          {
            "name": "statesRequired",
            "type": "u16"
          },
          {
            "name": "ignoreIndex",
            "type": "u16"
          },
          {
            "name": "newStateRoot",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "ItemData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "usageStateRoot",
            "type": {
              "option": {
                "defined": "Root"
              }
            }
          },
          {
            "name": "usageStates",
            "type": {
              "option": {
                "vec": {
                  "defined": "ItemUsageState"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "CraftUsageInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "craftUsageStateProof",
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
            "name": "craftUsageState",
            "type": {
              "defined": "ItemUsageState"
            }
          },
          {
            "name": "craftUsageProof",
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
            "name": "craftUsage",
            "type": {
              "defined": "ItemUsage"
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
            "type": {
              "defined": "ItemUsage"
            }
          },
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
            "type": {
              "defined": "ItemUsageState"
            }
          },
          {
            "name": "newUsageStateProof",
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
            "name": "newUsageStateRoot",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "totalStates",
            "type": "u16"
          },
          {
            "name": "totalStatesProof",
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
            "name": "newTotalStatesProof",
            "type": {
              "vec": {
                "array": [
                  "u8",
                  32
                ]
              }
            }
          }
        ]
      }
    },
    {
      "name": "ItemClassType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Wearable",
            "fields": [
              {
                "name": "body_part",
                "type": {
                  "vec": "string"
                }
              },
              {
                "name": "limit_per_part",
                "type": {
                  "option": "u64"
                }
              }
            ]
          },
          {
            "name": "Consumable",
            "fields": [
              {
                "name": "max_uses",
                "type": {
                  "option": "u64"
                }
              },
              {
                "name": "max_players_per_use",
                "type": {
                  "option": "u64"
                }
              },
              {
                "name": "item_usage_type",
                "type": {
                  "defined": "ItemUsageType"
                }
              },
              {
                "name": "cooldown_duration",
                "type": {
                  "option": "u64"
                }
              },
              {
                "name": "warmup_duration",
                "type": {
                  "option": "u64"
                }
              }
            ]
          }
        ]
      }
    },
    {
      "name": "ItemUsageType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Exhaustion"
          },
          {
            "name": "Destruction"
          },
          {
            "name": "Infinite"
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
    },
    {
      "name": "ComponentCondition",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Consumed"
          },
          {
            "name": "Presence"
          },
          {
            "name": "Absence"
          },
          {
            "name": "Cooldown"
          },
          {
            "name": "CooldownAndConsume"
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
      "name": "ChildUpdatePropagationPermissivenessType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Usages"
          },
          {
            "name": "Components"
          },
          {
            "name": "UpdatePermissiveness"
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
            "name": "FreeBuildPermissiveness"
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
      "name": "ErrorCode",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "IncorrectOwner"
          },
          {
            "name": "Uninitialized"
          },
          {
            "name": "MintMismatch"
          },
          {
            "name": "TokenTransferFailed"
          },
          {
            "name": "NumericalOverflowError"
          },
          {
            "name": "TokenMintToFailed"
          },
          {
            "name": "TokenBurnFailed"
          },
          {
            "name": "DerivedKeyInvalid"
          },
          {
            "name": "MustSpecifyPermissivenessType"
          },
          {
            "name": "PermissivenessNotFound"
          },
          {
            "name": "PublicKeyMismatch"
          },
          {
            "name": "InsufficientBalance"
          },
          {
            "name": "MetadataDoesntExist"
          },
          {
            "name": "EditionDoesntExist"
          },
          {
            "name": "NoParentPresent"
          },
          {
            "name": "ExpectedParent"
          },
          {
            "name": "InvalidMintAuthority"
          },
          {
            "name": "NotMintAuthority"
          },
          {
            "name": "CannotMakeZero"
          },
          {
            "name": "MustBeHolderToBuild"
          },
          {
            "name": "InvalidConfigForFungibleMints"
          },
          {
            "name": "MissingMerkleInfo"
          },
          {
            "name": "InvalidProof"
          },
          {
            "name": "ItemReadyForCompletion"
          },
          {
            "name": "MustUseMerkleOrComponentList"
          },
          {
            "name": "MustUseMerkleOrUsageState"
          },
          {
            "name": "UnableToFindValidCooldownState"
          },
          {
            "name": "BalanceNeedsToBeZero"
          },
          {
            "name": "NotPartOfComponentScope"
          },
          {
            "name": "TimeToBuildMismatch"
          },
          {
            "name": "StakingMintNotWhitelisted"
          },
          {
            "name": "BuildPhaseNotStarted"
          },
          {
            "name": "BuildPhaseNotFinished"
          },
          {
            "name": "DeactivatedItemEscrow"
          },
          {
            "name": "BuildPhaseAlreadyStarted"
          },
          {
            "name": "StillMissingComponents"
          },
          {
            "name": "ChildrenStillExist"
          },
          {
            "name": "UnstakeTokensFirst"
          },
          {
            "name": "AlreadyDeactivated"
          },
          {
            "name": "NotDeactivated"
          },
          {
            "name": "NotEmptied"
          },
          {
            "name": "GivingTooMuch"
          },
          {
            "name": "MustProvideUsageIndex"
          },
          {
            "name": "CannotUseItemWithoutUsageOrMerkle"
          },
          {
            "name": "MaxUsesReached"
          },
          {
            "name": "CooldownNotOver"
          },
          {
            "name": "CannotUseWearable"
          },
          {
            "name": "UsageIndexMismatch"
          },
          {
            "name": "ProvingNewStateNotRequired"
          },
          {
            "name": "MustSubmitStatesInOrder"
          },
          {
            "name": "ItemActivationNotValidYet"
          },
          {
            "name": "WarmupNotFinished"
          },
          {
            "name": "MustBeChild"
          },
          {
            "name": "MustUseRealScope"
          },
          {
            "name": "CraftClassIndexMismatch"
          },
          {
            "name": "MustBeGreaterThanZero"
          },
          {
            "name": "AtaShouldNotHaveDelegate"
          },
          {
            "name": "ReinitializationDetected"
          },
          {
            "name": "FailedToJoinNamespace"
          },
          {
            "name": "FailedToLeaveNamespace"
          },
          {
            "name": "FailedToCache"
          },
          {
            "name": "FailedToUncache"
          },
          {
            "name": "AlreadyCached"
          },
          {
            "name": "NotCached"
          },
          {
            "name": "UnauthorizedCaller"
          },
          {
            "name": "MustBeCalledByStakingProgram"
          },
          {
            "name": "ExpectedDelegateToMatchProvided"
          },
          {
            "name": "CannotEffectTheSameStatTwice"
          }
        ]
      }
    }
  ]
};
