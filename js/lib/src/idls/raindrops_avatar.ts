export type RaindropsAvatar = {
  "version": "0.1.0",
  "name": "raindrops_avatar",
  "instructions": [
    {
      "name": "createAvatarClass",
      "accounts": [
        {
          "name": "avatarClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "avatarClassMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatarClassMintAta",
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
            "defined": "CreateAvatarClassArgs"
          }
        }
      ]
    },
    {
      "name": "createAvatar",
      "accounts": [
        {
          "name": "avatarClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatarClassMintAta",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatar",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "avatarMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rainVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authorityRainAta",
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
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "CreateAvatarArgs"
          }
        }
      ]
    },
    {
      "name": "createTrait",
      "accounts": [
        {
          "name": "avatarClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "avatarClassMintAta",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "traitAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "traitMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "traitConflicts",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rainVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authorityRainAta",
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
            "defined": "CreateTraitArgs"
          }
        }
      ]
    },
    {
      "name": "createPaymentMethod",
      "accounts": [
        {
          "name": "paymentMethod",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "avatarClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "avatarClassMintAta",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "paymentMints",
          "isMut": true,
          "isSigner": false,
          "isOptional": true
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
          "name": "accountCompression",
          "isMut": false,
          "isSigner": false,
          "isOptional": true
        },
        {
          "name": "logWrapper",
          "isMut": false,
          "isSigner": false,
          "isOptional": true
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "CreatePaymentMethodArgs"
          }
        }
      ]
    },
    {
      "name": "equipTrait",
      "accounts": [
        {
          "name": "avatarClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatar",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "updateState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "traitAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "traitConflicts",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "traitSource",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "avatarTraitAta",
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
      "name": "equipTraitAuthority",
      "accounts": [
        {
          "name": "avatarClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatarClassMintAta",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatar",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "traitAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "traitSource",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "avatarTraitAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
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
      "name": "removeTrait",
      "accounts": [
        {
          "name": "avatarClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatar",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "updateState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "traitAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "traitDestination",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "avatarTraitAta",
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
      "name": "removeTraitAuthority",
      "accounts": [
        {
          "name": "avatarClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatar",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "avatarClassMintAta",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "traitAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "traitMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "traitDestination",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "avatarTraitAta",
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
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "updateTraitVariant",
      "accounts": [
        {
          "name": "avatarClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatar",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "updateState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "traitAccount",
          "isMut": false,
          "isSigner": false,
          "isOptional": true
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
      "name": "updateTraitVariantAuthority",
      "accounts": [
        {
          "name": "avatar",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "avatarClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatarClassMintAta",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "traitAccount",
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
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "UpdateTraitVariantAuthorityArgs"
          }
        }
      ]
    },
    {
      "name": "updateClassVariantAuthority",
      "accounts": [
        {
          "name": "avatarClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatarClassMintAta",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatar",
          "isMut": true,
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
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "UpdateClassVariantAuthorityArgs"
          }
        }
      ]
    },
    {
      "name": "updateTraitVariantMetadata",
      "accounts": [
        {
          "name": "avatarClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatarClassMintAta",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "traitAccount",
          "isMut": true,
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
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "UpdateTraitVariantMetadataArgs"
          }
        }
      ]
    },
    {
      "name": "updateClassVariantMetadata",
      "accounts": [
        {
          "name": "avatarClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "avatarClassMintAta",
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
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "UpdateClassVariantMetadataArgs"
          }
        }
      ]
    },
    {
      "name": "beginVariantUpdate",
      "accounts": [
        {
          "name": "updateState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "avatarClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "traitAccount",
          "isMut": false,
          "isSigner": false,
          "isOptional": true
        },
        {
          "name": "avatar",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatarMintAta",
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
            "defined": "BeginVariantUpdateArgs"
          }
        }
      ]
    },
    {
      "name": "beginTraitUpdate",
      "accounts": [
        {
          "name": "updateState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "avatarClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "traitAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatar",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatarMintAta",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "traitMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatarTraitAta",
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
            "defined": "BeginTraitUpdateArgs"
          }
        }
      ]
    },
    {
      "name": "cancelUpdate",
      "accounts": [
        {
          "name": "updateState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "avatar",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatarMintAta",
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
            "defined": "CancelUpdateArgs"
          }
        }
      ]
    },
    {
      "name": "updateVariant",
      "accounts": [
        {
          "name": "avatarClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatar",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "updateState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "traitAccount",
          "isMut": false,
          "isSigner": false,
          "isOptional": true
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
      "name": "transferPayment",
      "accounts": [
        {
          "name": "updateState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "paymentMethod",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "paymentMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "paymentSource",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "paymentDestination",
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
          "name": "tokenProgram",
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
            "defined": "TransferPaymentArgs"
          }
        }
      ]
    },
    {
      "name": "burnPayment",
      "accounts": [
        {
          "name": "updateState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "paymentMethod",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "paymentMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "paymentSource",
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
          "name": "tokenProgram",
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
            "defined": "BurnPaymentArgs"
          }
        }
      ]
    },
    {
      "name": "burnPaymentTree",
      "accounts": [
        {
          "name": "updateState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "paymentMethod",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "paymentMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "verifiedPaymentMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "paymentSource",
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
          "name": "tokenProgram",
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
            "defined": "BurnPaymentTreeArgs"
          }
        }
      ]
    },
    {
      "name": "transferPaymentTree",
      "accounts": [
        {
          "name": "updateState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "paymentMethod",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "paymentMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "verifiedPaymentMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "paymentSource",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "paymentDestination",
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
          "name": "tokenProgram",
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
            "defined": "TransferPaymentTreeArgs"
          }
        }
      ]
    },
    {
      "name": "addPaymentMintPaymentMethod",
      "accounts": [
        {
          "name": "paymentMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "paymentMethod",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "paymentMints",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "avatarClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "avatarClassMintAta",
          "isMut": false,
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
      "name": "addTraitConflicts",
      "accounts": [
        {
          "name": "avatarClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatarClassMintAta",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "traitConflicts",
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
            "defined": "AddTraitConflictsArgs"
          }
        }
      ]
    },
    {
      "name": "verifyPaymentMint",
      "accounts": [
        {
          "name": "paymentMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "verifiedPaymentMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "paymentMethod",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "paymentMints",
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
          "name": "accountCompression",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "VerifyPaymentMintArgs"
          }
        }
      ]
    },
    {
      "name": "verifyPaymentMintTest",
      "accounts": [
        {
          "name": "paymentMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "paymentMints",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
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
            "defined": "VerifyPaymentMintTestArgs"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "avatarClass",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "publicKey"
          },
          {
            "name": "traitIndex",
            "type": "u16"
          },
          {
            "name": "paymentIndex",
            "type": "u64"
          },
          {
            "name": "attributeMetadata",
            "type": {
              "vec": {
                "defined": "AttributeMetadata"
              }
            }
          },
          {
            "name": "variantMetadata",
            "type": {
              "vec": {
                "defined": "VariantMetadata"
              }
            }
          },
          {
            "name": "globalRenderingConfigUri",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "avatar",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "avatarClass",
            "type": "publicKey"
          },
          {
            "name": "mint",
            "type": "publicKey"
          },
          {
            "name": "imageUri",
            "type": "string"
          },
          {
            "name": "traits",
            "type": {
              "vec": {
                "defined": "TraitData"
              }
            }
          },
          {
            "name": "variants",
            "type": {
              "vec": {
                "defined": "VariantOption"
              }
            }
          }
        ]
      }
    },
    {
      "name": "trait",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "u16"
          },
          {
            "name": "avatarClass",
            "type": "publicKey"
          },
          {
            "name": "traitMint",
            "type": "publicKey"
          },
          {
            "name": "attributeIds",
            "type": {
              "vec": "u16"
            }
          },
          {
            "name": "componentUri",
            "type": "string"
          },
          {
            "name": "status",
            "type": {
              "defined": "TraitStatus"
            }
          },
          {
            "name": "variantMetadata",
            "type": {
              "vec": {
                "defined": "VariantMetadata"
              }
            }
          },
          {
            "name": "equipPaymentDetails",
            "type": {
              "option": {
                "defined": "PaymentDetails"
              }
            }
          },
          {
            "name": "removePaymentDetails",
            "type": {
              "option": {
                "defined": "PaymentDetails"
              }
            }
          },
          {
            "name": "traitGate",
            "type": {
              "option": {
                "defined": "TraitGate"
              }
            }
          }
        ]
      }
    },
    {
      "name": "paymentMethod",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "uri",
            "type": "string"
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "avatarClass",
            "type": "publicKey"
          },
          {
            "name": "assetClass",
            "type": {
              "defined": "PaymentAssetClass"
            }
          },
          {
            "name": "action",
            "type": {
              "defined": "PaymentAction"
            }
          }
        ]
      }
    },
    {
      "name": "updateState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "initialized",
            "type": "bool"
          },
          {
            "name": "avatar",
            "type": "publicKey"
          },
          {
            "name": "currentPaymentDetails",
            "type": {
              "option": {
                "defined": "PaymentDetails"
              }
            }
          },
          {
            "name": "requiredPaymentDetails",
            "type": {
              "option": {
                "defined": "PaymentDetails"
              }
            }
          },
          {
            "name": "target",
            "type": {
              "defined": "UpdateTarget"
            }
          }
        ]
      }
    },
    {
      "name": "verifiedPaymentMint",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "paymentMethod",
            "type": "publicKey"
          },
          {
            "name": "paymentMint",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "traitConflicts",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "avatarClass",
            "type": "publicKey"
          },
          {
            "name": "traitAccount",
            "type": "publicKey"
          },
          {
            "name": "attributeConflicts",
            "type": {
              "vec": "u16"
            }
          },
          {
            "name": "traitConflicts",
            "type": {
              "vec": "u16"
            }
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "AddTraitConflictsArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "traitIds",
            "type": {
              "vec": "u16"
            }
          },
          {
            "name": "attributeIds",
            "type": {
              "vec": "u16"
            }
          }
        ]
      }
    },
    {
      "name": "BeginTraitUpdateArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "updateTarget",
            "type": {
              "defined": "UpdateTarget"
            }
          }
        ]
      }
    },
    {
      "name": "BeginVariantUpdateArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "updateTarget",
            "type": {
              "defined": "UpdateTarget"
            }
          }
        ]
      }
    },
    {
      "name": "BurnPaymentTreeArgs",
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
      "name": "BurnPaymentArgs",
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
      "name": "CancelUpdateArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "updateTarget",
            "type": {
              "defined": "UpdateTarget"
            }
          }
        ]
      }
    },
    {
      "name": "CreateAvatarClassArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "attributeMetadata",
            "type": {
              "vec": {
                "defined": "AttributeMetadata"
              }
            }
          },
          {
            "name": "variantMetadata",
            "type": {
              "vec": {
                "defined": "VariantMetadata"
              }
            }
          },
          {
            "name": "globalRenderingConfigUri",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "CreateAvatarArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "variants",
            "type": {
              "vec": {
                "defined": "VariantArg"
              }
            }
          }
        ]
      }
    },
    {
      "name": "VariantArg",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "variantId",
            "type": "string"
          },
          {
            "name": "optionId",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "CreatePaymentMethodArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "assetClass",
            "type": {
              "defined": "PaymentAssetClass"
            }
          },
          {
            "name": "action",
            "type": {
              "defined": "PaymentAction"
            }
          }
        ]
      }
    },
    {
      "name": "CreateTraitArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "componentUri",
            "type": "string"
          },
          {
            "name": "attributeIds",
            "type": {
              "vec": "u16"
            }
          },
          {
            "name": "variantMetadata",
            "type": {
              "vec": {
                "defined": "VariantMetadata"
              }
            }
          },
          {
            "name": "traitStatus",
            "type": {
              "defined": "TraitStatus"
            }
          },
          {
            "name": "equipPaymentDetails",
            "type": {
              "option": {
                "defined": "PaymentDetails"
              }
            }
          },
          {
            "name": "removePaymentDetails",
            "type": {
              "option": {
                "defined": "PaymentDetails"
              }
            }
          }
        ]
      }
    },
    {
      "name": "TransferPaymentTreeArgs",
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
      "name": "TransferPaymentArgs",
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
      "name": "UpdateClassVariantAuthorityArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "variantId",
            "type": "string"
          },
          {
            "name": "newVariantOptionId",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "UpdateClassVariantMetadataArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "variantMetadata",
            "type": {
              "defined": "VariantMetadata"
            }
          }
        ]
      }
    },
    {
      "name": "UpdateTraitVariantAuthorityArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "variantId",
            "type": "string"
          },
          {
            "name": "newVariantOptionId",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "UpdateTraitVariantMetadataArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "variantMetadata",
            "type": {
              "defined": "VariantMetadata"
            }
          }
        ]
      }
    },
    {
      "name": "VerifyPaymentMintTestArgs",
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
      "name": "VerifyPaymentMintArgs",
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
      "name": "AttributeMetadata",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "u16"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "status",
            "type": {
              "defined": "AttributeStatus"
            }
          }
        ]
      }
    },
    {
      "name": "VariantMetadata",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "id",
            "type": "string"
          },
          {
            "name": "status",
            "type": {
              "defined": "VariantStatus"
            }
          },
          {
            "name": "options",
            "type": {
              "vec": {
                "defined": "VariantOption"
              }
            }
          }
        ]
      }
    },
    {
      "name": "VariantOption",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "variantId",
            "type": "string"
          },
          {
            "name": "optionId",
            "type": "string"
          },
          {
            "name": "paymentDetails",
            "type": {
              "option": {
                "defined": "PaymentDetails"
              }
            }
          },
          {
            "name": "traitGate",
            "type": {
              "option": {
                "defined": "TraitGate"
              }
            }
          }
        ]
      }
    },
    {
      "name": "PaymentDetails",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "paymentMethod",
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
      "name": "TraitGate",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "operator",
            "type": {
              "defined": "Operator"
            }
          },
          {
            "name": "traits",
            "type": {
              "vec": "publicKey"
            }
          }
        ]
      }
    },
    {
      "name": "TraitData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "attributeIds",
            "type": {
              "vec": "u16"
            }
          },
          {
            "name": "traitId",
            "type": "u16"
          },
          {
            "name": "traitAddress",
            "type": "publicKey"
          },
          {
            "name": "variantSelection",
            "type": {
              "vec": {
                "defined": "VariantOption"
              }
            }
          }
        ]
      }
    },
    {
      "name": "TraitStatus",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "enabled",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "VariantStatus",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "enabled",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "AttributeStatus",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mutable",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "Operator",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "And"
          }
        ]
      }
    },
    {
      "name": "PaymentAssetClass",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Fungible",
            "fields": [
              {
                "name": "mint",
                "type": "publicKey"
              }
            ]
          },
          {
            "name": "NonFungible",
            "fields": [
              {
                "name": "mints",
                "type": "publicKey"
              }
            ]
          }
        ]
      }
    },
    {
      "name": "PaymentAction",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Transfer",
            "fields": [
              {
                "name": "treasury",
                "type": "publicKey"
              }
            ]
          },
          {
            "name": "Burn"
          }
        ]
      }
    },
    {
      "name": "UpdateTarget",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "ClassVariant",
            "fields": [
              {
                "name": "variant_id",
                "type": "string"
              },
              {
                "name": "option_id",
                "type": "string"
              }
            ]
          },
          {
            "name": "TraitVariant",
            "fields": [
              {
                "name": "variant_id",
                "type": "string"
              },
              {
                "name": "option_id",
                "type": "string"
              },
              {
                "name": "trait_account",
                "type": "publicKey"
              }
            ]
          },
          {
            "name": "EquipTrait",
            "fields": [
              {
                "name": "trait_account",
                "type": "publicKey"
              }
            ]
          },
          {
            "name": "RemoveTrait",
            "fields": [
              {
                "name": "trait_account",
                "type": "publicKey"
              },
              {
                "name": "trait_destination_authority",
                "type": "publicKey"
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
      "name": "AttributeAvailable",
      "msg": "Attribute is Available"
    },
    {
      "code": 6001,
      "name": "AttributeImmutable",
      "msg": "Attribute is not Mutable"
    },
    {
      "code": 6002,
      "name": "AttributeUnavailable",
      "msg": "Attribute is Unavailable"
    },
    {
      "code": 6003,
      "name": "InvalidAttributeId",
      "msg": "Invalid Attribute ID"
    },
    {
      "code": 6004,
      "name": "TraitNotEquipped",
      "msg": "Trait Not Equipped"
    },
    {
      "code": 6005,
      "name": "TraitConflict",
      "msg": "Trait Conflict"
    },
    {
      "code": 6006,
      "name": "TraitInUse",
      "msg": "Trait in Use"
    },
    {
      "code": 6007,
      "name": "InvalidVariant",
      "msg": "Invalid Variant"
    },
    {
      "code": 6008,
      "name": "InvalidPaymentMethod",
      "msg": "Invalid Payment Method"
    },
    {
      "code": 6009,
      "name": "InvalidPaymentMint",
      "msg": "Invalid Payment Mint"
    },
    {
      "code": 6010,
      "name": "PaymentNotPaid",
      "msg": "Payment Not Paid"
    },
    {
      "code": 6011,
      "name": "IncorrectAssetClass",
      "msg": "Incorrect Asset Class for Instruction"
    },
    {
      "code": 6012,
      "name": "InvalidTrait",
      "msg": "Invalid Trait Account for Update"
    },
    {
      "code": 6013,
      "name": "TraitDisabled",
      "msg": "Trait Is Disabled"
    },
    {
      "code": 6014,
      "name": "VariantDisabled",
      "msg": "Variant Is Disabled"
    },
    {
      "code": 6015,
      "name": "InvalidUpdateTarget",
      "msg": "Invalid UpdateTarget"
    }
  ]
};

export const IDL: RaindropsAvatar = {
  "version": "0.1.0",
  "name": "raindrops_avatar",
  "instructions": [
    {
      "name": "createAvatarClass",
      "accounts": [
        {
          "name": "avatarClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "avatarClassMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatarClassMintAta",
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
            "defined": "CreateAvatarClassArgs"
          }
        }
      ]
    },
    {
      "name": "createAvatar",
      "accounts": [
        {
          "name": "avatarClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatarClassMintAta",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatar",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "avatarMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rainVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authorityRainAta",
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
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "CreateAvatarArgs"
          }
        }
      ]
    },
    {
      "name": "createTrait",
      "accounts": [
        {
          "name": "avatarClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "avatarClassMintAta",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "traitAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "traitMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "traitConflicts",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rainVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authorityRainAta",
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
            "defined": "CreateTraitArgs"
          }
        }
      ]
    },
    {
      "name": "createPaymentMethod",
      "accounts": [
        {
          "name": "paymentMethod",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "avatarClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "avatarClassMintAta",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "paymentMints",
          "isMut": true,
          "isSigner": false,
          "isOptional": true
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
          "name": "accountCompression",
          "isMut": false,
          "isSigner": false,
          "isOptional": true
        },
        {
          "name": "logWrapper",
          "isMut": false,
          "isSigner": false,
          "isOptional": true
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "CreatePaymentMethodArgs"
          }
        }
      ]
    },
    {
      "name": "equipTrait",
      "accounts": [
        {
          "name": "avatarClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatar",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "updateState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "traitAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "traitConflicts",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "traitSource",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "avatarTraitAta",
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
      "name": "equipTraitAuthority",
      "accounts": [
        {
          "name": "avatarClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatarClassMintAta",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatar",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "traitAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "traitSource",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "avatarTraitAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
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
      "name": "removeTrait",
      "accounts": [
        {
          "name": "avatarClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatar",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "updateState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "traitAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "traitDestination",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "avatarTraitAta",
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
      "name": "removeTraitAuthority",
      "accounts": [
        {
          "name": "avatarClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatar",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "avatarClassMintAta",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "traitAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "traitMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "traitDestination",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "avatarTraitAta",
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
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "updateTraitVariant",
      "accounts": [
        {
          "name": "avatarClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatar",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "updateState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "traitAccount",
          "isMut": false,
          "isSigner": false,
          "isOptional": true
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
      "name": "updateTraitVariantAuthority",
      "accounts": [
        {
          "name": "avatar",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "avatarClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatarClassMintAta",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "traitAccount",
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
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "UpdateTraitVariantAuthorityArgs"
          }
        }
      ]
    },
    {
      "name": "updateClassVariantAuthority",
      "accounts": [
        {
          "name": "avatarClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatarClassMintAta",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatar",
          "isMut": true,
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
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "UpdateClassVariantAuthorityArgs"
          }
        }
      ]
    },
    {
      "name": "updateTraitVariantMetadata",
      "accounts": [
        {
          "name": "avatarClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatarClassMintAta",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "traitAccount",
          "isMut": true,
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
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "UpdateTraitVariantMetadataArgs"
          }
        }
      ]
    },
    {
      "name": "updateClassVariantMetadata",
      "accounts": [
        {
          "name": "avatarClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "avatarClassMintAta",
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
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "UpdateClassVariantMetadataArgs"
          }
        }
      ]
    },
    {
      "name": "beginVariantUpdate",
      "accounts": [
        {
          "name": "updateState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "avatarClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "traitAccount",
          "isMut": false,
          "isSigner": false,
          "isOptional": true
        },
        {
          "name": "avatar",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatarMintAta",
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
            "defined": "BeginVariantUpdateArgs"
          }
        }
      ]
    },
    {
      "name": "beginTraitUpdate",
      "accounts": [
        {
          "name": "updateState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "avatarClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "traitAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatar",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatarMintAta",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "traitMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatarTraitAta",
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
            "defined": "BeginTraitUpdateArgs"
          }
        }
      ]
    },
    {
      "name": "cancelUpdate",
      "accounts": [
        {
          "name": "updateState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "avatar",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatarMintAta",
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
            "defined": "CancelUpdateArgs"
          }
        }
      ]
    },
    {
      "name": "updateVariant",
      "accounts": [
        {
          "name": "avatarClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatar",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "updateState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "traitAccount",
          "isMut": false,
          "isSigner": false,
          "isOptional": true
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
      "name": "transferPayment",
      "accounts": [
        {
          "name": "updateState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "paymentMethod",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "paymentMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "paymentSource",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "paymentDestination",
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
          "name": "tokenProgram",
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
            "defined": "TransferPaymentArgs"
          }
        }
      ]
    },
    {
      "name": "burnPayment",
      "accounts": [
        {
          "name": "updateState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "paymentMethod",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "paymentMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "paymentSource",
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
          "name": "tokenProgram",
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
            "defined": "BurnPaymentArgs"
          }
        }
      ]
    },
    {
      "name": "burnPaymentTree",
      "accounts": [
        {
          "name": "updateState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "paymentMethod",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "paymentMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "verifiedPaymentMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "paymentSource",
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
          "name": "tokenProgram",
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
            "defined": "BurnPaymentTreeArgs"
          }
        }
      ]
    },
    {
      "name": "transferPaymentTree",
      "accounts": [
        {
          "name": "updateState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "paymentMethod",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "paymentMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "verifiedPaymentMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "paymentSource",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "paymentDestination",
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
          "name": "tokenProgram",
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
            "defined": "TransferPaymentTreeArgs"
          }
        }
      ]
    },
    {
      "name": "addPaymentMintPaymentMethod",
      "accounts": [
        {
          "name": "paymentMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "paymentMethod",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "paymentMints",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "avatarClass",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "avatarClassMintAta",
          "isMut": false,
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
      "name": "addTraitConflicts",
      "accounts": [
        {
          "name": "avatarClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "avatarClassMintAta",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "traitConflicts",
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
            "defined": "AddTraitConflictsArgs"
          }
        }
      ]
    },
    {
      "name": "verifyPaymentMint",
      "accounts": [
        {
          "name": "paymentMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "verifiedPaymentMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "paymentMethod",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "paymentMints",
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
          "name": "accountCompression",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "VerifyPaymentMintArgs"
          }
        }
      ]
    },
    {
      "name": "verifyPaymentMintTest",
      "accounts": [
        {
          "name": "paymentMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "paymentMints",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
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
            "defined": "VerifyPaymentMintTestArgs"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "avatarClass",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "publicKey"
          },
          {
            "name": "traitIndex",
            "type": "u16"
          },
          {
            "name": "paymentIndex",
            "type": "u64"
          },
          {
            "name": "attributeMetadata",
            "type": {
              "vec": {
                "defined": "AttributeMetadata"
              }
            }
          },
          {
            "name": "variantMetadata",
            "type": {
              "vec": {
                "defined": "VariantMetadata"
              }
            }
          },
          {
            "name": "globalRenderingConfigUri",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "avatar",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "avatarClass",
            "type": "publicKey"
          },
          {
            "name": "mint",
            "type": "publicKey"
          },
          {
            "name": "imageUri",
            "type": "string"
          },
          {
            "name": "traits",
            "type": {
              "vec": {
                "defined": "TraitData"
              }
            }
          },
          {
            "name": "variants",
            "type": {
              "vec": {
                "defined": "VariantOption"
              }
            }
          }
        ]
      }
    },
    {
      "name": "trait",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "u16"
          },
          {
            "name": "avatarClass",
            "type": "publicKey"
          },
          {
            "name": "traitMint",
            "type": "publicKey"
          },
          {
            "name": "attributeIds",
            "type": {
              "vec": "u16"
            }
          },
          {
            "name": "componentUri",
            "type": "string"
          },
          {
            "name": "status",
            "type": {
              "defined": "TraitStatus"
            }
          },
          {
            "name": "variantMetadata",
            "type": {
              "vec": {
                "defined": "VariantMetadata"
              }
            }
          },
          {
            "name": "equipPaymentDetails",
            "type": {
              "option": {
                "defined": "PaymentDetails"
              }
            }
          },
          {
            "name": "removePaymentDetails",
            "type": {
              "option": {
                "defined": "PaymentDetails"
              }
            }
          },
          {
            "name": "traitGate",
            "type": {
              "option": {
                "defined": "TraitGate"
              }
            }
          }
        ]
      }
    },
    {
      "name": "paymentMethod",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "uri",
            "type": "string"
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "avatarClass",
            "type": "publicKey"
          },
          {
            "name": "assetClass",
            "type": {
              "defined": "PaymentAssetClass"
            }
          },
          {
            "name": "action",
            "type": {
              "defined": "PaymentAction"
            }
          }
        ]
      }
    },
    {
      "name": "updateState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "initialized",
            "type": "bool"
          },
          {
            "name": "avatar",
            "type": "publicKey"
          },
          {
            "name": "currentPaymentDetails",
            "type": {
              "option": {
                "defined": "PaymentDetails"
              }
            }
          },
          {
            "name": "requiredPaymentDetails",
            "type": {
              "option": {
                "defined": "PaymentDetails"
              }
            }
          },
          {
            "name": "target",
            "type": {
              "defined": "UpdateTarget"
            }
          }
        ]
      }
    },
    {
      "name": "verifiedPaymentMint",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "paymentMethod",
            "type": "publicKey"
          },
          {
            "name": "paymentMint",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "traitConflicts",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "avatarClass",
            "type": "publicKey"
          },
          {
            "name": "traitAccount",
            "type": "publicKey"
          },
          {
            "name": "attributeConflicts",
            "type": {
              "vec": "u16"
            }
          },
          {
            "name": "traitConflicts",
            "type": {
              "vec": "u16"
            }
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "AddTraitConflictsArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "traitIds",
            "type": {
              "vec": "u16"
            }
          },
          {
            "name": "attributeIds",
            "type": {
              "vec": "u16"
            }
          }
        ]
      }
    },
    {
      "name": "BeginTraitUpdateArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "updateTarget",
            "type": {
              "defined": "UpdateTarget"
            }
          }
        ]
      }
    },
    {
      "name": "BeginVariantUpdateArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "updateTarget",
            "type": {
              "defined": "UpdateTarget"
            }
          }
        ]
      }
    },
    {
      "name": "BurnPaymentTreeArgs",
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
      "name": "BurnPaymentArgs",
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
      "name": "CancelUpdateArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "updateTarget",
            "type": {
              "defined": "UpdateTarget"
            }
          }
        ]
      }
    },
    {
      "name": "CreateAvatarClassArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "attributeMetadata",
            "type": {
              "vec": {
                "defined": "AttributeMetadata"
              }
            }
          },
          {
            "name": "variantMetadata",
            "type": {
              "vec": {
                "defined": "VariantMetadata"
              }
            }
          },
          {
            "name": "globalRenderingConfigUri",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "CreateAvatarArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "variants",
            "type": {
              "vec": {
                "defined": "VariantArg"
              }
            }
          }
        ]
      }
    },
    {
      "name": "VariantArg",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "variantId",
            "type": "string"
          },
          {
            "name": "optionId",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "CreatePaymentMethodArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "assetClass",
            "type": {
              "defined": "PaymentAssetClass"
            }
          },
          {
            "name": "action",
            "type": {
              "defined": "PaymentAction"
            }
          }
        ]
      }
    },
    {
      "name": "CreateTraitArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "componentUri",
            "type": "string"
          },
          {
            "name": "attributeIds",
            "type": {
              "vec": "u16"
            }
          },
          {
            "name": "variantMetadata",
            "type": {
              "vec": {
                "defined": "VariantMetadata"
              }
            }
          },
          {
            "name": "traitStatus",
            "type": {
              "defined": "TraitStatus"
            }
          },
          {
            "name": "equipPaymentDetails",
            "type": {
              "option": {
                "defined": "PaymentDetails"
              }
            }
          },
          {
            "name": "removePaymentDetails",
            "type": {
              "option": {
                "defined": "PaymentDetails"
              }
            }
          }
        ]
      }
    },
    {
      "name": "TransferPaymentTreeArgs",
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
      "name": "TransferPaymentArgs",
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
      "name": "UpdateClassVariantAuthorityArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "variantId",
            "type": "string"
          },
          {
            "name": "newVariantOptionId",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "UpdateClassVariantMetadataArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "variantMetadata",
            "type": {
              "defined": "VariantMetadata"
            }
          }
        ]
      }
    },
    {
      "name": "UpdateTraitVariantAuthorityArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "variantId",
            "type": "string"
          },
          {
            "name": "newVariantOptionId",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "UpdateTraitVariantMetadataArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "variantMetadata",
            "type": {
              "defined": "VariantMetadata"
            }
          }
        ]
      }
    },
    {
      "name": "VerifyPaymentMintTestArgs",
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
      "name": "VerifyPaymentMintArgs",
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
      "name": "AttributeMetadata",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "u16"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "status",
            "type": {
              "defined": "AttributeStatus"
            }
          }
        ]
      }
    },
    {
      "name": "VariantMetadata",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "id",
            "type": "string"
          },
          {
            "name": "status",
            "type": {
              "defined": "VariantStatus"
            }
          },
          {
            "name": "options",
            "type": {
              "vec": {
                "defined": "VariantOption"
              }
            }
          }
        ]
      }
    },
    {
      "name": "VariantOption",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "variantId",
            "type": "string"
          },
          {
            "name": "optionId",
            "type": "string"
          },
          {
            "name": "paymentDetails",
            "type": {
              "option": {
                "defined": "PaymentDetails"
              }
            }
          },
          {
            "name": "traitGate",
            "type": {
              "option": {
                "defined": "TraitGate"
              }
            }
          }
        ]
      }
    },
    {
      "name": "PaymentDetails",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "paymentMethod",
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
      "name": "TraitGate",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "operator",
            "type": {
              "defined": "Operator"
            }
          },
          {
            "name": "traits",
            "type": {
              "vec": "publicKey"
            }
          }
        ]
      }
    },
    {
      "name": "TraitData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "attributeIds",
            "type": {
              "vec": "u16"
            }
          },
          {
            "name": "traitId",
            "type": "u16"
          },
          {
            "name": "traitAddress",
            "type": "publicKey"
          },
          {
            "name": "variantSelection",
            "type": {
              "vec": {
                "defined": "VariantOption"
              }
            }
          }
        ]
      }
    },
    {
      "name": "TraitStatus",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "enabled",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "VariantStatus",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "enabled",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "AttributeStatus",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mutable",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "Operator",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "And"
          }
        ]
      }
    },
    {
      "name": "PaymentAssetClass",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Fungible",
            "fields": [
              {
                "name": "mint",
                "type": "publicKey"
              }
            ]
          },
          {
            "name": "NonFungible",
            "fields": [
              {
                "name": "mints",
                "type": "publicKey"
              }
            ]
          }
        ]
      }
    },
    {
      "name": "PaymentAction",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Transfer",
            "fields": [
              {
                "name": "treasury",
                "type": "publicKey"
              }
            ]
          },
          {
            "name": "Burn"
          }
        ]
      }
    },
    {
      "name": "UpdateTarget",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "ClassVariant",
            "fields": [
              {
                "name": "variant_id",
                "type": "string"
              },
              {
                "name": "option_id",
                "type": "string"
              }
            ]
          },
          {
            "name": "TraitVariant",
            "fields": [
              {
                "name": "variant_id",
                "type": "string"
              },
              {
                "name": "option_id",
                "type": "string"
              },
              {
                "name": "trait_account",
                "type": "publicKey"
              }
            ]
          },
          {
            "name": "EquipTrait",
            "fields": [
              {
                "name": "trait_account",
                "type": "publicKey"
              }
            ]
          },
          {
            "name": "RemoveTrait",
            "fields": [
              {
                "name": "trait_account",
                "type": "publicKey"
              },
              {
                "name": "trait_destination_authority",
                "type": "publicKey"
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
      "name": "AttributeAvailable",
      "msg": "Attribute is Available"
    },
    {
      "code": 6001,
      "name": "AttributeImmutable",
      "msg": "Attribute is not Mutable"
    },
    {
      "code": 6002,
      "name": "AttributeUnavailable",
      "msg": "Attribute is Unavailable"
    },
    {
      "code": 6003,
      "name": "InvalidAttributeId",
      "msg": "Invalid Attribute ID"
    },
    {
      "code": 6004,
      "name": "TraitNotEquipped",
      "msg": "Trait Not Equipped"
    },
    {
      "code": 6005,
      "name": "TraitConflict",
      "msg": "Trait Conflict"
    },
    {
      "code": 6006,
      "name": "TraitInUse",
      "msg": "Trait in Use"
    },
    {
      "code": 6007,
      "name": "InvalidVariant",
      "msg": "Invalid Variant"
    },
    {
      "code": 6008,
      "name": "InvalidPaymentMethod",
      "msg": "Invalid Payment Method"
    },
    {
      "code": 6009,
      "name": "InvalidPaymentMint",
      "msg": "Invalid Payment Mint"
    },
    {
      "code": 6010,
      "name": "PaymentNotPaid",
      "msg": "Payment Not Paid"
    },
    {
      "code": 6011,
      "name": "IncorrectAssetClass",
      "msg": "Incorrect Asset Class for Instruction"
    },
    {
      "code": 6012,
      "name": "InvalidTrait",
      "msg": "Invalid Trait Account for Update"
    },
    {
      "code": 6013,
      "name": "TraitDisabled",
      "msg": "Trait Is Disabled"
    },
    {
      "code": 6014,
      "name": "VariantDisabled",
      "msg": "Variant Is Disabled"
    },
    {
      "code": 6015,
      "name": "InvalidUpdateTarget",
      "msg": "Invalid UpdateTarget"
    }
  ]
};
