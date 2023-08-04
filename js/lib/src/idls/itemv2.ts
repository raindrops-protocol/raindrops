export type Itemv2 = {
  "version": "0.1.0",
  "name": "itemv2",
  "instructions": [
    {
      "name": "createItemClass",
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
          "name": "itemClassAuthorityMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClassAuthorityMintAta",
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
            "defined": "CreateItemClassArgs"
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
          "name": "itemClassAuthorityMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClassAuthorityMintAta",
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
          "name": "itemClassAuthorityMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClassAuthorityMintAta",
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
          "name": "itemClassAuthorityMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClassAuthorityMintAta",
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
          "name": "item",
          "isMut": true,
          "isSigner": false
        },
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
          "name": "builder",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClassAuthorityMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClassAuthorityMintAta",
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
          "name": "itemClassAuthorityMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClassAuthorityMintAta",
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
            "defined": "CreateDeterministicIngredientArgs"
          }
        }
      ]
    },
    {
      "name": "mintAuthorityTokens",
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
          "name": "itemClassAuthorityMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClassAuthorityMintAta",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "destination",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "destinationAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "authority",
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
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "MintAuthorityTokensArgs"
          }
        }
      ]
    },
    {
      "name": "releaseFromEscrowSpl",
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
          "name": "destinationAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClassAuthorityMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClassAuthorityMintAta",
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
            "defined": "ReleaseFromEscrowSplArgs"
          }
        }
      ]
    },
    {
      "name": "releaseFromEscrowPnft",
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
          "name": "destinationAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemDestinationTokenRecord",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClassAuthorityMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClassAuthorityMintAta",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "instructions",
          "isMut": false,
          "isSigner": false
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
    }
  ],
  "accounts": [
    {
      "name": "itemClass",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "authorityMint",
            "type": "publicKey"
          },
          {
            "name": "items",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "recipeIndex",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "outputMode",
            "type": {
              "defined": "ItemClassOutputMode"
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
            "name": "builder",
            "type": "publicKey"
          },
          {
            "name": "itemClass",
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
      "name": "CreateItemClassArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "itemClassName",
            "type": "string"
          },
          {
            "name": "outputMode",
            "type": {
              "defined": "ItemClassOutputMode"
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
      "name": "MintAuthorityTokensArgs",
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
      "name": "ReleaseFromEscrowSplArgs",
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
          },
          {
            "name": "nonce",
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
      "name": "ItemClassOutputMode",
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
      "name": "InvalidItemClassOutputMode",
      "msg": "Invalid ItemClassOutputMode"
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

export const IDL: Itemv2 = {
  "version": "0.1.0",
  "name": "itemv2",
  "instructions": [
    {
      "name": "createItemClass",
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
          "name": "itemClassAuthorityMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClassAuthorityMintAta",
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
            "defined": "CreateItemClassArgs"
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
          "name": "itemClassAuthorityMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClassAuthorityMintAta",
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
          "name": "itemClassAuthorityMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClassAuthorityMintAta",
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
          "name": "itemClassAuthorityMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClassAuthorityMintAta",
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
          "name": "item",
          "isMut": true,
          "isSigner": false
        },
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
          "name": "builder",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClassAuthorityMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClassAuthorityMintAta",
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
          "name": "itemClassAuthorityMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClassAuthorityMintAta",
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
            "defined": "CreateDeterministicIngredientArgs"
          }
        }
      ]
    },
    {
      "name": "mintAuthorityTokens",
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
          "name": "itemClassAuthorityMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClassAuthorityMintAta",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "destination",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "destinationAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "authority",
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
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "MintAuthorityTokensArgs"
          }
        }
      ]
    },
    {
      "name": "releaseFromEscrowSpl",
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
          "name": "destinationAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClassAuthorityMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClassAuthorityMintAta",
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
            "defined": "ReleaseFromEscrowSplArgs"
          }
        }
      ]
    },
    {
      "name": "releaseFromEscrowPnft",
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
          "name": "destinationAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemDestinationTokenRecord",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClassAuthorityMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemClassAuthorityMintAta",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "instructions",
          "isMut": false,
          "isSigner": false
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
    }
  ],
  "accounts": [
    {
      "name": "itemClass",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "authorityMint",
            "type": "publicKey"
          },
          {
            "name": "items",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "recipeIndex",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "outputMode",
            "type": {
              "defined": "ItemClassOutputMode"
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
            "name": "builder",
            "type": "publicKey"
          },
          {
            "name": "itemClass",
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
      "name": "CreateItemClassArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "itemClassName",
            "type": "string"
          },
          {
            "name": "outputMode",
            "type": {
              "defined": "ItemClassOutputMode"
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
      "name": "MintAuthorityTokensArgs",
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
      "name": "ReleaseFromEscrowSplArgs",
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
          },
          {
            "name": "nonce",
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
      "name": "ItemClassOutputMode",
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
      "name": "InvalidItemClassOutputMode",
      "msg": "Invalid ItemClassOutputMode"
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
