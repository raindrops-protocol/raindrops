export type RaindropsStaking = {
  "version": "0.1.0",
  "name": "raindrops_staking",
  "instructions": [
    {
      "name": "beginArtifactStakeWarmup",
      "accounts": [
        {
          "name": "artifactClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "artifact",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "artifactIntermediaryStakingAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "artifactIntermediaryStakingCounter",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakingAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "stakingMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "stakingTransferAuthority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "namespace",
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
            "defined": "BeginArtifactStakeWarmupArgs"
          }
        }
      ]
    },
    {
      "name": "endArtifactStakeWarmup",
      "accounts": [
        {
          "name": "artifactClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "artifact",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "artifactIntermediaryStakingAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "artifactIntermediaryStakingCounter",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "artifactMintStakingAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakingMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "itemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "playerProgram",
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
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "clock",
          "isMut": false,
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
            "defined": "EndArtifactStakeWarmupArgs"
          }
        }
      ]
    },
    {
      "name": "beginArtifactStakeCooldown",
      "accounts": [
        {
          "name": "artifactClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "artifact",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "artifactIntermediaryStakingAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "artifactIntermediaryStakingCounter",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "artifactMintStakingAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakingAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakingMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "itemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "playerProgram",
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
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "clock",
          "isMut": false,
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
            "defined": "BeginArtifactStakeCooldownArgs"
          }
        }
      ]
    },
    {
      "name": "endArtifactStakeCooldown",
      "accounts": [
        {
          "name": "artifactClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "artifact",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "artifactIntermediaryStakingAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "artifactIntermediaryStakingCounter",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakingAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakingMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
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
            "defined": "EndArtifactStakeCooldownArgs"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "stakingCounter",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "eventStart",
            "type": "i64"
          },
          {
            "name": "eventType",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "BeginArtifactStakeWarmupArgs",
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
            "name": "index",
            "type": "u64"
          },
          {
            "name": "stakingIndex",
            "type": "u64"
          },
          {
            "name": "artifactClassMint",
            "type": "publicKey"
          },
          {
            "name": "artifactMint",
            "type": "publicKey"
          },
          {
            "name": "stakingAmount",
            "type": "u64"
          },
          {
            "name": "stakingPermissivenessToUse",
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
      "name": "EndArtifactStakeWarmupArgs",
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
            "name": "stakingIndex",
            "type": "u64"
          },
          {
            "name": "artifactClassMint",
            "type": "publicKey"
          },
          {
            "name": "artifactMint",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "BeginArtifactStakeCooldownArgs",
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
            "name": "index",
            "type": "u64"
          },
          {
            "name": "stakingIndex",
            "type": "u64"
          },
          {
            "name": "artifactClassMint",
            "type": "publicKey"
          },
          {
            "name": "artifactMint",
            "type": "publicKey"
          },
          {
            "name": "stakingPermissivenessToUse",
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
      "name": "EndArtifactStakeCooldownArgs",
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
            "name": "stakingIndex",
            "type": "u64"
          },
          {
            "name": "artifactClassMint",
            "type": "publicKey"
          },
          {
            "name": "artifactMint",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "ArtifactClassData",
      "type": {
        "kind": "struct",
        "fields": [
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
      "name": "MustSpecifyPermissivenessType",
      "msg": "Update authority for metadata expected as signer"
    },
    {
      "code": 6009,
      "name": "PermissivenessNotFound",
      "msg": "Permissiveness not found in array"
    },
    {
      "code": 6010,
      "name": "PublicKeyMismatch",
      "msg": "Public key mismatch"
    },
    {
      "code": 6011,
      "name": "InsufficientBalance",
      "msg": "Insufficient Balance"
    },
    {
      "code": 6012,
      "name": "MetadataDoesntExist",
      "msg": "Metadata doesn't exist"
    },
    {
      "code": 6013,
      "name": "EditionDoesntExist",
      "msg": "Edition doesn't exist"
    },
    {
      "code": 6014,
      "name": "NoParentPresent",
      "msg": "No parent present"
    },
    {
      "code": 6015,
      "name": "InvalidMintAuthority",
      "msg": "Invalid mint authority"
    },
    {
      "code": 6016,
      "name": "NotMintAuthority",
      "msg": "Not mint authority"
    },
    {
      "code": 6017,
      "name": "MustBeHolderToBuild",
      "msg": "Must be token holder to build against it"
    },
    {
      "code": 6018,
      "name": "MissingMerkleInfo",
      "msg": "Missing the merkle fields"
    },
    {
      "code": 6019,
      "name": "InvalidProof",
      "msg": "Invalid proof"
    },
    {
      "code": 6020,
      "name": "UnableToFindValidCooldownState",
      "msg": "Unable to find a valid cooldown state"
    },
    {
      "code": 6021,
      "name": "StakingWarmupNotStarted",
      "msg": "You havent started staking yet"
    },
    {
      "code": 6022,
      "name": "StakingWarmupNotFinished",
      "msg": "You havent finished your warm up period"
    },
    {
      "code": 6023,
      "name": "IncorrectStakingCounterType",
      "msg": "Attempting to use a staking counter going in the wrong direction"
    },
    {
      "code": 6024,
      "name": "StakingCooldownNotStarted",
      "msg": "Staking cooldown not started"
    },
    {
      "code": 6025,
      "name": "StakingCooldownNotFinished",
      "msg": "Staking cooldown not finished"
    },
    {
      "code": 6026,
      "name": "InvalidProgramOwner",
      "msg": "Invalid program owner"
    },
    {
      "code": 6027,
      "name": "NotInitialized",
      "msg": "Not initialized"
    },
    {
      "code": 6028,
      "name": "StakingMintNotWhitelisted",
      "msg": "Staking mint not whitelisted"
    },
    {
      "code": 6029,
      "name": "DiscriminatorMismatch",
      "msg": "Discriminator mismatch"
    },
    {
      "code": 6030,
      "name": "StakingForPlayerComingSoon",
      "msg": "Staking for player coming soon"
    }
  ]
};

export const IDL: RaindropsStaking = {
  "version": "0.1.0",
  "name": "raindrops_staking",
  "instructions": [
    {
      "name": "beginArtifactStakeWarmup",
      "accounts": [
        {
          "name": "artifactClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "artifact",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "artifactIntermediaryStakingAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "artifactIntermediaryStakingCounter",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakingAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "stakingMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "stakingTransferAuthority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "namespace",
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
            "defined": "BeginArtifactStakeWarmupArgs"
          }
        }
      ]
    },
    {
      "name": "endArtifactStakeWarmup",
      "accounts": [
        {
          "name": "artifactClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "artifact",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "artifactIntermediaryStakingAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "artifactIntermediaryStakingCounter",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "artifactMintStakingAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakingMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "itemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "playerProgram",
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
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "clock",
          "isMut": false,
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
            "defined": "EndArtifactStakeWarmupArgs"
          }
        }
      ]
    },
    {
      "name": "beginArtifactStakeCooldown",
      "accounts": [
        {
          "name": "artifactClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "artifact",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "artifactIntermediaryStakingAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "artifactIntermediaryStakingCounter",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "artifactMintStakingAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakingAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakingMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "itemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "playerProgram",
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
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "clock",
          "isMut": false,
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
            "defined": "BeginArtifactStakeCooldownArgs"
          }
        }
      ]
    },
    {
      "name": "endArtifactStakeCooldown",
      "accounts": [
        {
          "name": "artifactClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "artifact",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "artifactIntermediaryStakingAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "artifactIntermediaryStakingCounter",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakingAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakingMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
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
            "defined": "EndArtifactStakeCooldownArgs"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "stakingCounter",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "eventStart",
            "type": "i64"
          },
          {
            "name": "eventType",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "BeginArtifactStakeWarmupArgs",
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
            "name": "index",
            "type": "u64"
          },
          {
            "name": "stakingIndex",
            "type": "u64"
          },
          {
            "name": "artifactClassMint",
            "type": "publicKey"
          },
          {
            "name": "artifactMint",
            "type": "publicKey"
          },
          {
            "name": "stakingAmount",
            "type": "u64"
          },
          {
            "name": "stakingPermissivenessToUse",
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
      "name": "EndArtifactStakeWarmupArgs",
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
            "name": "stakingIndex",
            "type": "u64"
          },
          {
            "name": "artifactClassMint",
            "type": "publicKey"
          },
          {
            "name": "artifactMint",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "BeginArtifactStakeCooldownArgs",
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
            "name": "index",
            "type": "u64"
          },
          {
            "name": "stakingIndex",
            "type": "u64"
          },
          {
            "name": "artifactClassMint",
            "type": "publicKey"
          },
          {
            "name": "artifactMint",
            "type": "publicKey"
          },
          {
            "name": "stakingPermissivenessToUse",
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
      "name": "EndArtifactStakeCooldownArgs",
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
            "name": "stakingIndex",
            "type": "u64"
          },
          {
            "name": "artifactClassMint",
            "type": "publicKey"
          },
          {
            "name": "artifactMint",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "ArtifactClassData",
      "type": {
        "kind": "struct",
        "fields": [
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
      "name": "MustSpecifyPermissivenessType",
      "msg": "Update authority for metadata expected as signer"
    },
    {
      "code": 6009,
      "name": "PermissivenessNotFound",
      "msg": "Permissiveness not found in array"
    },
    {
      "code": 6010,
      "name": "PublicKeyMismatch",
      "msg": "Public key mismatch"
    },
    {
      "code": 6011,
      "name": "InsufficientBalance",
      "msg": "Insufficient Balance"
    },
    {
      "code": 6012,
      "name": "MetadataDoesntExist",
      "msg": "Metadata doesn't exist"
    },
    {
      "code": 6013,
      "name": "EditionDoesntExist",
      "msg": "Edition doesn't exist"
    },
    {
      "code": 6014,
      "name": "NoParentPresent",
      "msg": "No parent present"
    },
    {
      "code": 6015,
      "name": "InvalidMintAuthority",
      "msg": "Invalid mint authority"
    },
    {
      "code": 6016,
      "name": "NotMintAuthority",
      "msg": "Not mint authority"
    },
    {
      "code": 6017,
      "name": "MustBeHolderToBuild",
      "msg": "Must be token holder to build against it"
    },
    {
      "code": 6018,
      "name": "MissingMerkleInfo",
      "msg": "Missing the merkle fields"
    },
    {
      "code": 6019,
      "name": "InvalidProof",
      "msg": "Invalid proof"
    },
    {
      "code": 6020,
      "name": "UnableToFindValidCooldownState",
      "msg": "Unable to find a valid cooldown state"
    },
    {
      "code": 6021,
      "name": "StakingWarmupNotStarted",
      "msg": "You havent started staking yet"
    },
    {
      "code": 6022,
      "name": "StakingWarmupNotFinished",
      "msg": "You havent finished your warm up period"
    },
    {
      "code": 6023,
      "name": "IncorrectStakingCounterType",
      "msg": "Attempting to use a staking counter going in the wrong direction"
    },
    {
      "code": 6024,
      "name": "StakingCooldownNotStarted",
      "msg": "Staking cooldown not started"
    },
    {
      "code": 6025,
      "name": "StakingCooldownNotFinished",
      "msg": "Staking cooldown not finished"
    },
    {
      "code": 6026,
      "name": "InvalidProgramOwner",
      "msg": "Invalid program owner"
    },
    {
      "code": 6027,
      "name": "NotInitialized",
      "msg": "Not initialized"
    },
    {
      "code": 6028,
      "name": "StakingMintNotWhitelisted",
      "msg": "Staking mint not whitelisted"
    },
    {
      "code": 6029,
      "name": "DiscriminatorMismatch",
      "msg": "Discriminator mismatch"
    },
    {
      "code": 6030,
      "name": "StakingForPlayerComingSoon",
      "msg": "Staking for player coming soon"
    }
  ]
};
