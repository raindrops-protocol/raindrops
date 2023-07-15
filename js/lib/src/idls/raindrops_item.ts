export type RaindropsItem = {
  "version": "0.1.0",
  "name": "raindrops_item",
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
          "isMut": true,
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
          "isMut": true,
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
          "isMut": true,
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
          "isMut": true,
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
      "name": "itemArtifactJoinNamespace",
      "accounts": [
        {
          "name": "itemArtifact",
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
      "name": "itemArtifactLeaveNamespace",
      "accounts": [
        {
          "name": "itemArtifact",
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
      "name": "itemArtifactCacheNamespace",
      "accounts": [
        {
          "name": "itemArtifact",
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
      "name": "itemArtifactUncacheNamespace",
      "accounts": [
        {
          "name": "itemArtifact",
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
    },
    {
      "name": "createItemClassV1",
      "accounts": [
        {
          "name": "items",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "recipe",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "accountCompression",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "logWrapper",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "CreateItemClassV1Args"
          }
        }
      ]
    },
    {
      "name": "createRecipe",
      "accounts": [
        {
          "name": "recipe",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "CreateRecipeArgs"
          }
        }
      ]
    },
    {
      "name": "addItemToItemClass",
      "accounts": [
        {
          "name": "itemMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "items",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "logWrapper",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "accountCompression",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "createPack",
      "accounts": [
        {
          "name": "pack",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "CreatePackArgs"
          }
        }
      ]
    },
    {
      "name": "startBuild",
      "accounts": [
        {
          "name": "build",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "recipe",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "buildPermit",
          "isMut": true,
          "isSigner": false,
          "isOptional": true
        },
        {
          "name": "builder",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "StartBuildArgs"
          }
        }
      ]
    },
    {
      "name": "addIngredientPnft",
      "accounts": [
        {
          "name": "ingredientMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "ingredientItemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "deterministicIngredient",
          "isMut": false,
          "isSigner": false,
          "isOptional": true
        },
        {
          "name": "ingredientMetadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "ingredientEdition",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authRules",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "ingredientSource",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "ingredientSourceTokenRecord",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "ingredientDestination",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "ingredientDestinationTokenRecord",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "recipe",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "build",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "item",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "builder",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "instructions",
          "isMut": false,
          "isSigner": false
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
          "name": "tokenMetadata",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "authRulesProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "addIngredientSpl",
      "accounts": [
        {
          "name": "ingredientMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "ingredientItemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "deterministicIngredient",
          "isMut": false,
          "isSigner": false,
          "isOptional": true
        },
        {
          "name": "ingredientSource",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "ingredientDestination",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "recipe",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "build",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "item",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "builder",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
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
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "AddIngredientSplArgs"
          }
        }
      ]
    },
    {
      "name": "verifyIngredient",
      "accounts": [
        {
          "name": "ingredientMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "ingredientItemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "ingredientItemClassItems",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "build",
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
          "name": "logWrapper",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "accountCompression",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "VerifyIngredientArgs"
          }
        }
      ]
    },
    {
      "name": "verifyIngredientTest",
      "accounts": [
        {
          "name": "ingredientMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "ingredientItemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "ingredientItemClassItems",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "logWrapper",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "accountCompression",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "VerifyIngredientTestArgs"
          }
        }
      ]
    },
    {
      "name": "receiveItemPnft",
      "accounts": [
        {
          "name": "itemMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemMetadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemEdition",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authRules",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemSource",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemSourceTokenRecord",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemDestination",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemDestinationTokenRecord",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "build",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "builder",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "instructions",
          "isMut": false,
          "isSigner": false
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
          "name": "tokenMetadata",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "authRulesProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "receiveItemSpl",
      "accounts": [
        {
          "name": "itemMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemSource",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemDestination",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "build",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "builder",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
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
        }
      ],
      "args": []
    },
    {
      "name": "completeBuildItem",
      "accounts": [
        {
          "name": "itemMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClassItems",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "recipe",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "buildPermit",
          "isMut": true,
          "isSigner": false,
          "isOptional": true
        },
        {
          "name": "build",
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
          "name": "logWrapper",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "accountCompression",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "CompleteBuildItemArgs"
          }
        }
      ]
    },
    {
      "name": "completeBuildPack",
      "accounts": [
        {
          "name": "pack",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "recipe",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "buildPermit",
          "isMut": true,
          "isSigner": false,
          "isOptional": true
        },
        {
          "name": "build",
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
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "CompleteBuildPackArgs"
          }
        }
      ]
    },
    {
      "name": "completeBuildPresetOnly",
      "accounts": [
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "recipe",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "buildPermit",
          "isMut": true,
          "isSigner": false,
          "isOptional": true
        },
        {
          "name": "build",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        }
      ],
      "args": []
    },
    {
      "name": "applyBuildEffect",
      "accounts": [
        {
          "name": "item",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "build",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        }
      ],
      "args": []
    },
    {
      "name": "returnIngredientPnft",
      "accounts": [
        {
          "name": "item",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemMetadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemEdition",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authRules",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemSource",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemSourceTokenRecord",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemDestination",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemDestinationTokenRecord",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "build",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "builder",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "instructions",
          "isMut": false,
          "isSigner": false
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
          "name": "tokenMetadata",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "authRulesProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "returnIngredientSpl",
      "accounts": [
        {
          "name": "item",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemSource",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemDestination",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "build",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "builder",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
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
        }
      ],
      "args": []
    },
    {
      "name": "destroyIngredientSpl",
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
          "name": "itemSource",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "build",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "builder",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "destroyIngredientPnft",
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
          "name": "itemMetadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "collectionMetadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemEdition",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemTokenRecord",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "build",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "instructions",
          "isMut": false,
          "isSigner": false
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
          "name": "tokenMetadata",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "closeBuild",
      "accounts": [
        {
          "name": "build",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "builder",
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
        }
      ],
      "args": []
    },
    {
      "name": "addPayment",
      "accounts": [
        {
          "name": "build",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "treasury",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "builder",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "createBuildPermit",
      "accounts": [
        {
          "name": "buildPermit",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "recipe",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "CreateBuildPermitArgs"
          }
        }
      ]
    },
    {
      "name": "createDeterministicIngredient",
      "accounts": [
        {
          "name": "ingredientMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "deterministicIngredient",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "recipe",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "CreateDeterministicIngredientArgs"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "itemClassV1",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "items",
            "type": "publicKey"
          },
          {
            "name": "recipeIndex",
            "type": "u64"
          },
          {
            "name": "outputMode",
            "type": {
              "defined": "ItemClassV1OutputMode"
            }
          }
        ]
      }
    },
    {
      "name": "itemV1",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "initialized",
            "type": "bool"
          },
          {
            "name": "itemMint",
            "type": "publicKey"
          },
          {
            "name": "itemState",
            "type": {
              "defined": "ItemState"
            }
          }
        ]
      }
    },
    {
      "name": "recipe",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "recipeIndex",
            "type": "u64"
          },
          {
            "name": "itemClass",
            "type": "publicKey"
          },
          {
            "name": "buildEnabled",
            "type": "bool"
          },
          {
            "name": "payment",
            "type": {
              "option": {
                "defined": "Payment"
              }
            }
          },
          {
            "name": "buildPermitRequired",
            "type": "bool"
          },
          {
            "name": "selectableOutputs",
            "type": {
              "vec": {
                "defined": "OutputSelectionGroup"
              }
            }
          },
          {
            "name": "ingredients",
            "type": {
              "vec": {
                "defined": "RecipeIngredientData"
              }
            }
          }
        ]
      }
    },
    {
      "name": "build",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "recipeIndex",
            "type": "u64"
          },
          {
            "name": "builder",
            "type": "publicKey"
          },
          {
            "name": "itemClass",
            "type": "publicKey"
          },
          {
            "name": "output",
            "type": {
              "defined": "BuildOutput"
            }
          },
          {
            "name": "payment",
            "type": {
              "option": {
                "defined": "PaymentState"
              }
            }
          },
          {
            "name": "ingredients",
            "type": {
              "vec": {
                "defined": "BuildIngredientData"
              }
            }
          },
          {
            "name": "status",
            "type": {
              "defined": "BuildStatus"
            }
          },
          {
            "name": "buildPermitInUse",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "pack",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "itemClass",
            "type": "publicKey"
          },
          {
            "name": "contentsHash",
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
      "name": "buildPermit",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "recipe",
            "type": "publicKey"
          },
          {
            "name": "builder",
            "type": "publicKey"
          },
          {
            "name": "remainingBuilds",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "deterministicIngredient",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "recipe",
            "type": "publicKey"
          },
          {
            "name": "ingredientMint",
            "type": "publicKey"
          },
          {
            "name": "outputs",
            "type": {
              "vec": {
                "defined": "DeterministicIngredientOutput"
              }
            }
          }
        ]
      }
    },
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
            "name": "index",
            "type": {
              "option": "u64"
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
            "docs": [
              "If not present, only Destruction/Infinite consumption types are allowed,",
              "And no cooldowns because we can't easily track a cooldown",
              "on a mint with more than 1 coin."
            ],
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
            "docs": [
              "If not present, only Destruction/Infinite consumption types are allowed,",
              "And no cooldowns because we can't easily track a cooldown",
              "on a mint with more than 1 coin."
            ],
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
      "name": "AddIngredientSplArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "CompleteBuildItemArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "root",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "leafIndex",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "CompleteBuildPackArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "packContents",
            "type": {
              "defined": "PackContents"
            }
          },
          {
            "name": "packContentsHashNonce",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          }
        ]
      }
    },
    {
      "name": "CreateBuildPermitArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "builder",
            "type": "publicKey"
          },
          {
            "name": "remainingBuilds",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "CreateDeterministicIngredientArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "outputs",
            "type": {
              "vec": {
                "defined": "DeterministicIngredientOutput"
              }
            }
          }
        ]
      }
    },
    {
      "name": "CreateItemClassV1Args",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "recipeArgs",
            "type": {
              "defined": "RecipeArgs"
            }
          },
          {
            "name": "outputMode",
            "type": {
              "defined": "ItemClassV1OutputMode"
            }
          }
        ]
      }
    },
    {
      "name": "RecipeArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "buildEnabled",
            "type": "bool"
          },
          {
            "name": "payment",
            "type": {
              "option": {
                "defined": "Payment"
              }
            }
          },
          {
            "name": "ingredients",
            "type": {
              "vec": {
                "defined": "RecipeIngredientData"
              }
            }
          },
          {
            "name": "buildPermitRequired",
            "type": "bool"
          },
          {
            "name": "selectableOutputs",
            "type": {
              "vec": {
                "defined": "OutputSelectionGroup"
              }
            }
          }
        ]
      }
    },
    {
      "name": "CreatePackArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "contentsHash",
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
      "name": "CreateRecipeArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "buildEnabled",
            "type": "bool"
          },
          {
            "name": "payment",
            "type": {
              "option": {
                "defined": "Payment"
              }
            }
          },
          {
            "name": "ingredients",
            "type": {
              "vec": {
                "defined": "RecipeIngredientData"
              }
            }
          },
          {
            "name": "buildPermitRequired",
            "type": "bool"
          },
          {
            "name": "selectableOutputs",
            "type": {
              "vec": {
                "defined": "OutputSelectionGroup"
              }
            }
          }
        ]
      }
    },
    {
      "name": "StartBuildArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "recipeIndex",
            "type": "u64"
          },
          {
            "name": "recipeOutputSelection",
            "type": {
              "vec": {
                "defined": "OutputSelectionArgs"
              }
            }
          }
        ]
      }
    },
    {
      "name": "VerifyIngredientTestArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "root",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "leafIndex",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "VerifyIngredientArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "root",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "leafIndex",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "BuildIngredientData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "itemClass",
            "type": "publicKey"
          },
          {
            "name": "currentAmount",
            "type": "u64"
          },
          {
            "name": "requiredAmount",
            "type": "u64"
          },
          {
            "name": "buildEffect",
            "type": {
              "defined": "BuildEffect"
            }
          },
          {
            "name": "mints",
            "type": {
              "vec": {
                "defined": "IngredientMint"
              }
            }
          },
          {
            "name": "isDeterministic",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "IngredientMint",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "publicKey"
          },
          {
            "name": "buildEffectApplied",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "RecipeIngredientData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "itemClass",
            "type": "publicKey"
          },
          {
            "name": "requiredAmount",
            "type": "u64"
          },
          {
            "name": "buildEffect",
            "type": {
              "defined": "BuildEffect"
            }
          },
          {
            "name": "isDeterministic",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "BuildEffect",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "degradation",
            "type": {
              "defined": "Degradation"
            }
          },
          {
            "name": "cooldown",
            "type": {
              "defined": "Cooldown"
            }
          }
        ]
      }
    },
    {
      "name": "Payment",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "treasury",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "PaymentState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "paid",
            "type": "bool"
          },
          {
            "name": "paymentDetails",
            "type": {
              "defined": "Payment"
            }
          }
        ]
      }
    },
    {
      "name": "PackContents",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "entries",
            "type": {
              "vec": {
                "defined": "PackContentsEntry"
              }
            }
          }
        ]
      }
    },
    {
      "name": "PackContentsEntry",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "BuildOutput",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "items",
            "type": {
              "vec": {
                "defined": "BuildOutputItem"
              }
            }
          }
        ]
      }
    },
    {
      "name": "BuildOutputItem",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "received",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "DeterministicIngredientOutput",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "OutputSelectionArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "groupId",
            "type": "u8"
          },
          {
            "name": "outputId",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "OutputSelectionGroup",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "groupId",
            "type": "u8"
          },
          {
            "name": "choices",
            "type": {
              "vec": {
                "defined": "OutputSelection"
              }
            }
          }
        ]
      }
    },
    {
      "name": "OutputSelection",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "outputId",
            "type": "u8"
          },
          {
            "name": "mint",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
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
      "name": "ItemClassV1OutputMode",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Item"
          },
          {
            "name": "Pack",
            "fields": [
              {
                "name": "index",
                "type": "u64"
              }
            ]
          },
          {
            "name": "PresetOnly"
          }
        ]
      }
    },
    {
      "name": "BuildStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "InProgress"
          },
          {
            "name": "Complete"
          },
          {
            "name": "ItemReceived"
          }
        ]
      }
    },
    {
      "name": "Degradation",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Off"
          },
          {
            "name": "On",
            "fields": [
              {
                "name": "rate",
                "type": "u64"
              }
            ]
          }
        ]
      }
    },
    {
      "name": "Cooldown",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Off"
          },
          {
            "name": "On",
            "fields": [
              {
                "name": "seconds",
                "type": "i64"
              }
            ]
          }
        ]
      }
    },
    {
      "name": "ItemState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Fungible"
          },
          {
            "name": "NonFungible",
            "fields": [
              {
                "name": "durability",
                "type": "u64"
              },
              {
                "name": "cooldown",
                "type": {
                  "option": "i64"
                }
              }
            ]
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
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "BuildNotEmpty",
      "msg": "Build still owns tokens"
    },
    {
      "code": 6001,
      "name": "BuildDisabled",
      "msg": "Building is disabled for this Item Class"
    },
    {
      "code": 6002,
      "name": "MissingIngredient",
      "msg": "Cannot Complete Build, Missing at least one build material"
    },
    {
      "code": 6003,
      "name": "IncorrectIngredient",
      "msg": "Incorrect material for build"
    },
    {
      "code": 6004,
      "name": "InvalidBuildStatus",
      "msg": "Build Status is incompatible with this instruction"
    },
    {
      "code": 6005,
      "name": "ItemNotReturnable",
      "msg": "Item cannot be returned"
    },
    {
      "code": 6006,
      "name": "ItemIneligibleForDestruction",
      "msg": "Item cannot be destroyed"
    },
    {
      "code": 6007,
      "name": "BuildEffectAlreadyApplied",
      "msg": "Build Effect Already Applied"
    },
    {
      "code": 6008,
      "name": "BuildEffectNotApplied",
      "msg": "Build Effect Not Applied"
    },
    {
      "code": 6009,
      "name": "ItemOnCooldown",
      "msg": "Item is on Cooldown"
    },
    {
      "code": 6010,
      "name": "InvalidPaymentTreasury",
      "msg": "Invalid Payment Treasury Account"
    },
    {
      "code": 6011,
      "name": "BuildNotPaid",
      "msg": "Must make build payment"
    },
    {
      "code": 6012,
      "name": "InvalidItemClassV1OutputMode",
      "msg": "Invalid ItemClassV1OutputMode"
    },
    {
      "code": 6013,
      "name": "InvalidBuildOutput",
      "msg": "Invalid Build Output"
    },
    {
      "code": 6014,
      "name": "InvalidPackContents",
      "msg": "Invalid Pack Contents"
    },
    {
      "code": 6015,
      "name": "PackAlreadyOpened",
      "msg": "Pack Already Opened"
    },
    {
      "code": 6016,
      "name": "BuildPermitRequired",
      "msg": "Build Permit Required"
    },
    {
      "code": 6017,
      "name": "NoBuildsRemaining",
      "msg": "No Builds Remaining"
    },
    {
      "code": 6018,
      "name": "InvalidRecipeConfig",
      "msg": "Invalid Recipe Config"
    },
    {
      "code": 6019,
      "name": "InvalidOutputSelection",
      "msg": "Invalid Output Selection"
    }
  ]
};

export const IDL: RaindropsItem = {
  "version": "0.1.0",
  "name": "raindrops_item",
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
          "isMut": true,
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
          "isMut": true,
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
          "isMut": true,
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
          "isMut": true,
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
      "name": "itemArtifactJoinNamespace",
      "accounts": [
        {
          "name": "itemArtifact",
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
      "name": "itemArtifactLeaveNamespace",
      "accounts": [
        {
          "name": "itemArtifact",
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
      "name": "itemArtifactCacheNamespace",
      "accounts": [
        {
          "name": "itemArtifact",
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
      "name": "itemArtifactUncacheNamespace",
      "accounts": [
        {
          "name": "itemArtifact",
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
    },
    {
      "name": "createItemClassV1",
      "accounts": [
        {
          "name": "items",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "recipe",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "accountCompression",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "logWrapper",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "CreateItemClassV1Args"
          }
        }
      ]
    },
    {
      "name": "createRecipe",
      "accounts": [
        {
          "name": "recipe",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "CreateRecipeArgs"
          }
        }
      ]
    },
    {
      "name": "addItemToItemClass",
      "accounts": [
        {
          "name": "itemMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "items",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "logWrapper",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "accountCompression",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "createPack",
      "accounts": [
        {
          "name": "pack",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "CreatePackArgs"
          }
        }
      ]
    },
    {
      "name": "startBuild",
      "accounts": [
        {
          "name": "build",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "recipe",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "buildPermit",
          "isMut": true,
          "isSigner": false,
          "isOptional": true
        },
        {
          "name": "builder",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "StartBuildArgs"
          }
        }
      ]
    },
    {
      "name": "addIngredientPnft",
      "accounts": [
        {
          "name": "ingredientMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "ingredientItemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "deterministicIngredient",
          "isMut": false,
          "isSigner": false,
          "isOptional": true
        },
        {
          "name": "ingredientMetadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "ingredientEdition",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authRules",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "ingredientSource",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "ingredientSourceTokenRecord",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "ingredientDestination",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "ingredientDestinationTokenRecord",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "recipe",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "build",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "item",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "builder",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "instructions",
          "isMut": false,
          "isSigner": false
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
          "name": "tokenMetadata",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "authRulesProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "addIngredientSpl",
      "accounts": [
        {
          "name": "ingredientMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "ingredientItemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "deterministicIngredient",
          "isMut": false,
          "isSigner": false,
          "isOptional": true
        },
        {
          "name": "ingredientSource",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "ingredientDestination",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "recipe",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "build",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "item",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "builder",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
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
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "AddIngredientSplArgs"
          }
        }
      ]
    },
    {
      "name": "verifyIngredient",
      "accounts": [
        {
          "name": "ingredientMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "ingredientItemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "ingredientItemClassItems",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "build",
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
          "name": "logWrapper",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "accountCompression",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "VerifyIngredientArgs"
          }
        }
      ]
    },
    {
      "name": "verifyIngredientTest",
      "accounts": [
        {
          "name": "ingredientMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "ingredientItemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "ingredientItemClassItems",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "logWrapper",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "accountCompression",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "VerifyIngredientTestArgs"
          }
        }
      ]
    },
    {
      "name": "receiveItemPnft",
      "accounts": [
        {
          "name": "itemMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemMetadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemEdition",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authRules",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemSource",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemSourceTokenRecord",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemDestination",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemDestinationTokenRecord",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "build",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "builder",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "instructions",
          "isMut": false,
          "isSigner": false
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
          "name": "tokenMetadata",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "authRulesProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "receiveItemSpl",
      "accounts": [
        {
          "name": "itemMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemSource",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemDestination",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "build",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "builder",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
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
        }
      ],
      "args": []
    },
    {
      "name": "completeBuildItem",
      "accounts": [
        {
          "name": "itemMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClassItems",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "recipe",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "buildPermit",
          "isMut": true,
          "isSigner": false,
          "isOptional": true
        },
        {
          "name": "build",
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
          "name": "logWrapper",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "accountCompression",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "CompleteBuildItemArgs"
          }
        }
      ]
    },
    {
      "name": "completeBuildPack",
      "accounts": [
        {
          "name": "pack",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "recipe",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "buildPermit",
          "isMut": true,
          "isSigner": false,
          "isOptional": true
        },
        {
          "name": "build",
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
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "CompleteBuildPackArgs"
          }
        }
      ]
    },
    {
      "name": "completeBuildPresetOnly",
      "accounts": [
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "recipe",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "buildPermit",
          "isMut": true,
          "isSigner": false,
          "isOptional": true
        },
        {
          "name": "build",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        }
      ],
      "args": []
    },
    {
      "name": "applyBuildEffect",
      "accounts": [
        {
          "name": "item",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "build",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        }
      ],
      "args": []
    },
    {
      "name": "returnIngredientPnft",
      "accounts": [
        {
          "name": "item",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemMetadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemEdition",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authRules",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemSource",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemSourceTokenRecord",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemDestination",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemDestinationTokenRecord",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "build",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "builder",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "instructions",
          "isMut": false,
          "isSigner": false
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
          "name": "tokenMetadata",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "authRulesProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "returnIngredientSpl",
      "accounts": [
        {
          "name": "item",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemSource",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemDestination",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "build",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "builder",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
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
        }
      ],
      "args": []
    },
    {
      "name": "destroyIngredientSpl",
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
          "name": "itemSource",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "build",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "builder",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "destroyIngredientPnft",
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
          "name": "itemMetadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "collectionMetadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemEdition",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemTokenRecord",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "build",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "instructions",
          "isMut": false,
          "isSigner": false
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
          "name": "tokenMetadata",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "closeBuild",
      "accounts": [
        {
          "name": "build",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "builder",
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
        }
      ],
      "args": []
    },
    {
      "name": "addPayment",
      "accounts": [
        {
          "name": "build",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "treasury",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "builder",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "createBuildPermit",
      "accounts": [
        {
          "name": "buildPermit",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "recipe",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "CreateBuildPermitArgs"
          }
        }
      ]
    },
    {
      "name": "createDeterministicIngredient",
      "accounts": [
        {
          "name": "ingredientMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "deterministicIngredient",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "recipe",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "CreateDeterministicIngredientArgs"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "itemClassV1",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "items",
            "type": "publicKey"
          },
          {
            "name": "recipeIndex",
            "type": "u64"
          },
          {
            "name": "outputMode",
            "type": {
              "defined": "ItemClassV1OutputMode"
            }
          }
        ]
      }
    },
    {
      "name": "itemV1",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "initialized",
            "type": "bool"
          },
          {
            "name": "itemMint",
            "type": "publicKey"
          },
          {
            "name": "itemState",
            "type": {
              "defined": "ItemState"
            }
          }
        ]
      }
    },
    {
      "name": "recipe",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "recipeIndex",
            "type": "u64"
          },
          {
            "name": "itemClass",
            "type": "publicKey"
          },
          {
            "name": "buildEnabled",
            "type": "bool"
          },
          {
            "name": "payment",
            "type": {
              "option": {
                "defined": "Payment"
              }
            }
          },
          {
            "name": "buildPermitRequired",
            "type": "bool"
          },
          {
            "name": "selectableOutputs",
            "type": {
              "vec": {
                "defined": "OutputSelectionGroup"
              }
            }
          },
          {
            "name": "ingredients",
            "type": {
              "vec": {
                "defined": "RecipeIngredientData"
              }
            }
          }
        ]
      }
    },
    {
      "name": "build",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "recipeIndex",
            "type": "u64"
          },
          {
            "name": "builder",
            "type": "publicKey"
          },
          {
            "name": "itemClass",
            "type": "publicKey"
          },
          {
            "name": "output",
            "type": {
              "defined": "BuildOutput"
            }
          },
          {
            "name": "payment",
            "type": {
              "option": {
                "defined": "PaymentState"
              }
            }
          },
          {
            "name": "ingredients",
            "type": {
              "vec": {
                "defined": "BuildIngredientData"
              }
            }
          },
          {
            "name": "status",
            "type": {
              "defined": "BuildStatus"
            }
          },
          {
            "name": "buildPermitInUse",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "pack",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "itemClass",
            "type": "publicKey"
          },
          {
            "name": "contentsHash",
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
      "name": "buildPermit",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "recipe",
            "type": "publicKey"
          },
          {
            "name": "builder",
            "type": "publicKey"
          },
          {
            "name": "remainingBuilds",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "deterministicIngredient",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "recipe",
            "type": "publicKey"
          },
          {
            "name": "ingredientMint",
            "type": "publicKey"
          },
          {
            "name": "outputs",
            "type": {
              "vec": {
                "defined": "DeterministicIngredientOutput"
              }
            }
          }
        ]
      }
    },
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
            "name": "index",
            "type": {
              "option": "u64"
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
            "docs": [
              "If not present, only Destruction/Infinite consumption types are allowed,",
              "And no cooldowns because we can't easily track a cooldown",
              "on a mint with more than 1 coin."
            ],
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
            "docs": [
              "If not present, only Destruction/Infinite consumption types are allowed,",
              "And no cooldowns because we can't easily track a cooldown",
              "on a mint with more than 1 coin."
            ],
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
      "name": "AddIngredientSplArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "CompleteBuildItemArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "root",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "leafIndex",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "CompleteBuildPackArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "packContents",
            "type": {
              "defined": "PackContents"
            }
          },
          {
            "name": "packContentsHashNonce",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          }
        ]
      }
    },
    {
      "name": "CreateBuildPermitArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "builder",
            "type": "publicKey"
          },
          {
            "name": "remainingBuilds",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "CreateDeterministicIngredientArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "outputs",
            "type": {
              "vec": {
                "defined": "DeterministicIngredientOutput"
              }
            }
          }
        ]
      }
    },
    {
      "name": "CreateItemClassV1Args",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "recipeArgs",
            "type": {
              "defined": "RecipeArgs"
            }
          },
          {
            "name": "outputMode",
            "type": {
              "defined": "ItemClassV1OutputMode"
            }
          }
        ]
      }
    },
    {
      "name": "RecipeArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "buildEnabled",
            "type": "bool"
          },
          {
            "name": "payment",
            "type": {
              "option": {
                "defined": "Payment"
              }
            }
          },
          {
            "name": "ingredients",
            "type": {
              "vec": {
                "defined": "RecipeIngredientData"
              }
            }
          },
          {
            "name": "buildPermitRequired",
            "type": "bool"
          },
          {
            "name": "selectableOutputs",
            "type": {
              "vec": {
                "defined": "OutputSelectionGroup"
              }
            }
          }
        ]
      }
    },
    {
      "name": "CreatePackArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "contentsHash",
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
      "name": "CreateRecipeArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "buildEnabled",
            "type": "bool"
          },
          {
            "name": "payment",
            "type": {
              "option": {
                "defined": "Payment"
              }
            }
          },
          {
            "name": "ingredients",
            "type": {
              "vec": {
                "defined": "RecipeIngredientData"
              }
            }
          },
          {
            "name": "buildPermitRequired",
            "type": "bool"
          },
          {
            "name": "selectableOutputs",
            "type": {
              "vec": {
                "defined": "OutputSelectionGroup"
              }
            }
          }
        ]
      }
    },
    {
      "name": "StartBuildArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "recipeIndex",
            "type": "u64"
          },
          {
            "name": "recipeOutputSelection",
            "type": {
              "vec": {
                "defined": "OutputSelectionArgs"
              }
            }
          }
        ]
      }
    },
    {
      "name": "VerifyIngredientTestArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "root",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "leafIndex",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "VerifyIngredientArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "root",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "leafIndex",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "BuildIngredientData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "itemClass",
            "type": "publicKey"
          },
          {
            "name": "currentAmount",
            "type": "u64"
          },
          {
            "name": "requiredAmount",
            "type": "u64"
          },
          {
            "name": "buildEffect",
            "type": {
              "defined": "BuildEffect"
            }
          },
          {
            "name": "mints",
            "type": {
              "vec": {
                "defined": "IngredientMint"
              }
            }
          },
          {
            "name": "isDeterministic",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "IngredientMint",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "publicKey"
          },
          {
            "name": "buildEffectApplied",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "RecipeIngredientData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "itemClass",
            "type": "publicKey"
          },
          {
            "name": "requiredAmount",
            "type": "u64"
          },
          {
            "name": "buildEffect",
            "type": {
              "defined": "BuildEffect"
            }
          },
          {
            "name": "isDeterministic",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "BuildEffect",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "degradation",
            "type": {
              "defined": "Degradation"
            }
          },
          {
            "name": "cooldown",
            "type": {
              "defined": "Cooldown"
            }
          }
        ]
      }
    },
    {
      "name": "Payment",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "treasury",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "PaymentState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "paid",
            "type": "bool"
          },
          {
            "name": "paymentDetails",
            "type": {
              "defined": "Payment"
            }
          }
        ]
      }
    },
    {
      "name": "PackContents",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "entries",
            "type": {
              "vec": {
                "defined": "PackContentsEntry"
              }
            }
          }
        ]
      }
    },
    {
      "name": "PackContentsEntry",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "BuildOutput",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "items",
            "type": {
              "vec": {
                "defined": "BuildOutputItem"
              }
            }
          }
        ]
      }
    },
    {
      "name": "BuildOutputItem",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "received",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "DeterministicIngredientOutput",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "OutputSelectionArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "groupId",
            "type": "u8"
          },
          {
            "name": "outputId",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "OutputSelectionGroup",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "groupId",
            "type": "u8"
          },
          {
            "name": "choices",
            "type": {
              "vec": {
                "defined": "OutputSelection"
              }
            }
          }
        ]
      }
    },
    {
      "name": "OutputSelection",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "outputId",
            "type": "u8"
          },
          {
            "name": "mint",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
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
      "name": "ItemClassV1OutputMode",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Item"
          },
          {
            "name": "Pack",
            "fields": [
              {
                "name": "index",
                "type": "u64"
              }
            ]
          },
          {
            "name": "PresetOnly"
          }
        ]
      }
    },
    {
      "name": "BuildStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "InProgress"
          },
          {
            "name": "Complete"
          },
          {
            "name": "ItemReceived"
          }
        ]
      }
    },
    {
      "name": "Degradation",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Off"
          },
          {
            "name": "On",
            "fields": [
              {
                "name": "rate",
                "type": "u64"
              }
            ]
          }
        ]
      }
    },
    {
      "name": "Cooldown",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Off"
          },
          {
            "name": "On",
            "fields": [
              {
                "name": "seconds",
                "type": "i64"
              }
            ]
          }
        ]
      }
    },
    {
      "name": "ItemState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Fungible"
          },
          {
            "name": "NonFungible",
            "fields": [
              {
                "name": "durability",
                "type": "u64"
              },
              {
                "name": "cooldown",
                "type": {
                  "option": "i64"
                }
              }
            ]
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
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "BuildNotEmpty",
      "msg": "Build still owns tokens"
    },
    {
      "code": 6001,
      "name": "BuildDisabled",
      "msg": "Building is disabled for this Item Class"
    },
    {
      "code": 6002,
      "name": "MissingIngredient",
      "msg": "Cannot Complete Build, Missing at least one build material"
    },
    {
      "code": 6003,
      "name": "IncorrectIngredient",
      "msg": "Incorrect material for build"
    },
    {
      "code": 6004,
      "name": "InvalidBuildStatus",
      "msg": "Build Status is incompatible with this instruction"
    },
    {
      "code": 6005,
      "name": "ItemNotReturnable",
      "msg": "Item cannot be returned"
    },
    {
      "code": 6006,
      "name": "ItemIneligibleForDestruction",
      "msg": "Item cannot be destroyed"
    },
    {
      "code": 6007,
      "name": "BuildEffectAlreadyApplied",
      "msg": "Build Effect Already Applied"
    },
    {
      "code": 6008,
      "name": "BuildEffectNotApplied",
      "msg": "Build Effect Not Applied"
    },
    {
      "code": 6009,
      "name": "ItemOnCooldown",
      "msg": "Item is on Cooldown"
    },
    {
      "code": 6010,
      "name": "InvalidPaymentTreasury",
      "msg": "Invalid Payment Treasury Account"
    },
    {
      "code": 6011,
      "name": "BuildNotPaid",
      "msg": "Must make build payment"
    },
    {
      "code": 6012,
      "name": "InvalidItemClassV1OutputMode",
      "msg": "Invalid ItemClassV1OutputMode"
    },
    {
      "code": 6013,
      "name": "InvalidBuildOutput",
      "msg": "Invalid Build Output"
    },
    {
      "code": 6014,
      "name": "InvalidPackContents",
      "msg": "Invalid Pack Contents"
    },
    {
      "code": 6015,
      "name": "PackAlreadyOpened",
      "msg": "Pack Already Opened"
    },
    {
      "code": 6016,
      "name": "BuildPermitRequired",
      "msg": "Build Permit Required"
    },
    {
      "code": 6017,
      "name": "NoBuildsRemaining",
      "msg": "No Builds Remaining"
    },
    {
      "code": 6018,
      "name": "InvalidRecipeConfig",
      "msg": "Invalid Recipe Config"
    },
    {
      "code": 6019,
      "name": "InvalidOutputSelection",
      "msg": "Invalid Output Selection"
    }
  ]
};
