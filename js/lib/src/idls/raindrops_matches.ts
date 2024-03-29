export type RaindropsMatches = {
  "version": "0.1.0",
  "name": "raindrops_matches",
  "instructions": [
    {
      "name": "createOrUpdateOracle",
      "accounts": [
        {
          "name": "oracle",
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
            "defined": "CreateOrUpdateOracleArgs"
          }
        }
      ]
    },
    {
      "name": "createMatch",
      "accounts": [
        {
          "name": "matchInstance",
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
            "defined": "CreateMatchArgs"
          }
        }
      ]
    },
    {
      "name": "updateMatch",
      "accounts": [
        {
          "name": "matchInstance",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "winOracle",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "UpdateMatchArgs"
          }
        }
      ]
    },
    {
      "name": "updateMatchFromOracle",
      "accounts": [
        {
          "name": "matchInstance",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "winOracle",
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
      "name": "drainOracle",
      "accounts": [
        {
          "name": "matchInstance",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "oracle",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
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
            "defined": "DrainOracleArgs"
          }
        }
      ]
    },
    {
      "name": "drainMatch",
      "accounts": [
        {
          "name": "matchInstance",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "receiver",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "leaveMatch",
      "accounts": [
        {
          "name": "matchInstance",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "receiver",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenAccountEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "destinationTokenAccount",
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
            "defined": "LeaveMatchArgs"
          }
        }
      ]
    },
    {
      "name": "disburseTokensByOracle",
      "accounts": [
        {
          "name": "matchInstance",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenAccountEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "destinationTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "winOracle",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "originalSender",
          "isMut": true,
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
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "DisburseTokensByOracleArgs"
          }
        }
      ]
    },
    {
      "name": "joinMatch",
      "accounts": [
        {
          "name": "matchInstance",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenTransferAuthority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "tokenAccountEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sourceTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sourceItemOrPlayerPda",
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
          "name": "validationProgram",
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
            "defined": "JoinMatchArgs"
          }
        }
      ]
    },
    {
      "name": "matchJoinNamespace",
      "accounts": [
        {
          "name": "matchInstance",
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
      "name": "matchLeaveNamespace",
      "accounts": [
        {
          "name": "matchInstance",
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
      "name": "matchCacheNamespace",
      "accounts": [
        {
          "name": "matchInstance",
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
      "name": "matchUncacheNamespace",
      "accounts": [
        {
          "name": "matchInstance",
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
      "name": "match",
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
            "name": "winOracle",
            "type": "publicKey"
          },
          {
            "name": "winOracleCooldown",
            "type": "u64"
          },
          {
            "name": "lastOracleCheck",
            "type": "u64"
          },
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "state",
            "type": {
              "defined": "MatchState"
            }
          },
          {
            "name": "leaveAllowed",
            "type": "bool"
          },
          {
            "name": "minimumAllowedEntryTime",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "currentTokenTransferIndex",
            "docs": [
              "Increased by 1 every time the next token transfer",
              "in the win oracle is completed."
            ],
            "type": "u64"
          },
          {
            "name": "tokenTypesAdded",
            "type": "u64"
          },
          {
            "name": "tokenTypesRemoved",
            "type": "u64"
          },
          {
            "name": "tokenEntryValidation",
            "type": {
              "option": {
                "vec": {
                  "defined": "TokenValidation"
                }
              }
            }
          },
          {
            "name": "tokenEntryValidationRoot",
            "type": {
              "option": {
                "defined": "Root"
              }
            }
          },
          {
            "name": "joinAllowedDuringStart",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "playerWinCallbackBitmap",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "matchKey",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "winOracle",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "finalized",
            "type": "bool"
          },
          {
            "name": "tokenTransferRoot",
            "type": {
              "option": {
                "defined": "Root"
              }
            }
          },
          {
            "name": "tokenTransfers",
            "type": {
              "option": {
                "vec": {
                  "defined": "TokenDelta"
                }
              }
            }
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "CreateOrUpdateOracleArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tokenTransferRoot",
            "type": {
              "option": {
                "defined": "Root"
              }
            }
          },
          {
            "name": "tokenTransfers",
            "type": {
              "option": {
                "vec": {
                  "defined": "TokenDelta"
                }
              }
            }
          },
          {
            "name": "seed",
            "type": "publicKey"
          },
          {
            "name": "space",
            "type": "u64"
          },
          {
            "name": "finalized",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "DrainOracleArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "seed",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "CreateMatchArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "matchState",
            "type": {
              "defined": "MatchState"
            }
          },
          {
            "name": "tokenEntryValidationRoot",
            "type": {
              "option": {
                "defined": "Root"
              }
            }
          },
          {
            "name": "tokenEntryValidation",
            "type": {
              "option": {
                "vec": {
                  "defined": "TokenValidation"
                }
              }
            }
          },
          {
            "name": "winOracle",
            "type": "publicKey"
          },
          {
            "name": "winOracleCooldown",
            "type": "u64"
          },
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "space",
            "type": "u64"
          },
          {
            "name": "leaveAllowed",
            "type": "bool"
          },
          {
            "name": "joinAllowedDuringStart",
            "type": "bool"
          },
          {
            "name": "minimumAllowedEntryTime",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "desiredNamespaceArraySize",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "UpdateMatchArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "matchState",
            "type": {
              "defined": "MatchState"
            }
          },
          {
            "name": "tokenEntryValidationRoot",
            "type": {
              "option": {
                "defined": "Root"
              }
            }
          },
          {
            "name": "tokenEntryValidation",
            "type": {
              "option": {
                "vec": {
                  "defined": "TokenValidation"
                }
              }
            }
          },
          {
            "name": "winOracleCooldown",
            "type": "u64"
          },
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "leaveAllowed",
            "type": "bool"
          },
          {
            "name": "joinAllowedDuringStart",
            "type": "bool"
          },
          {
            "name": "minimumAllowedEntryTime",
            "type": {
              "option": "u64"
            }
          }
        ]
      }
    },
    {
      "name": "JoinMatchArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "tokenEntryValidationProof",
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
            "name": "tokenEntryValidation",
            "type": {
              "option": {
                "defined": "TokenValidation"
              }
            }
          }
        ]
      }
    },
    {
      "name": "LeaveMatchArgs",
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
      "name": "DisburseTokensByOracleArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tokenDeltaProofInfo",
            "type": {
              "option": {
                "defined": "TokenDeltaProofInfo"
              }
            }
          }
        ]
      }
    },
    {
      "name": "TokenDeltaProofInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tokenDeltaProof",
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
            "name": "tokenDelta",
            "type": {
              "defined": "TokenDelta"
            }
          },
          {
            "name": "totalProof",
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
            "name": "total",
            "type": "u64"
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
            "name": "tokenValidation",
            "type": {
              "defined": "TokenValidation"
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
      "name": "TokenDelta",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "from",
            "type": "publicKey"
          },
          {
            "name": "to",
            "docs": [
              "if no to, token is burned"
            ],
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "tokenTransferType",
            "type": {
              "defined": "TokenTransferType"
            }
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
      "name": "TokenValidation",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "filter",
            "type": {
              "defined": "Filter"
            }
          },
          {
            "name": "isBlacklist",
            "type": "bool"
          },
          {
            "name": "validation",
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
      "name": "MatchState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Draft"
          },
          {
            "name": "Initialized"
          },
          {
            "name": "Started"
          },
          {
            "name": "Finalized"
          },
          {
            "name": "PaidOut"
          },
          {
            "name": "Deactivated"
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
      "name": "TokenType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Player"
          },
          {
            "name": "Item"
          },
          {
            "name": "Any"
          }
        ]
      }
    },
    {
      "name": "TokenTransferType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "PlayerToPlayer"
          },
          {
            "name": "PlayerToEntrant"
          },
          {
            "name": "Normal"
          }
        ]
      }
    },
    {
      "name": "Filter",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "None"
          },
          {
            "name": "All"
          },
          {
            "name": "Namespace",
            "fields": [
              {
                "name": "namespace",
                "type": "publicKey"
              }
            ]
          },
          {
            "name": "Parent",
            "fields": [
              {
                "name": "key",
                "type": "publicKey"
              }
            ]
          },
          {
            "name": "Mint",
            "fields": [
              {
                "name": "mint",
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
      "name": "InvalidStartingMatchState",
      "msg": "A match can only start in draft or initialized state"
    },
    {
      "code": 6009,
      "name": "InvalidUpdateMatchState",
      "msg": "Match authority can only shift from Draft to Initialized or from Initialized/Started to Deactivated"
    },
    {
      "code": 6010,
      "name": "InvalidOracleUpdate",
      "msg": "Cannot rely on an oracle until the match has been initialized or started"
    },
    {
      "code": 6011,
      "name": "CannotDrainYet",
      "msg": "Cannot drain a match until it is in paid out or deactivated and all token accounts have been drained"
    },
    {
      "code": 6012,
      "name": "CannotLeaveMatch",
      "msg": "You can only leave deactivated or paid out matches, or initialized matches with leave_allowed on."
    },
    {
      "code": 6013,
      "name": "ReceiverMustBeSigner",
      "msg": "You must be the person who joined the match to leave it in initialized or started state."
    },
    {
      "code": 6014,
      "name": "PublicKeyMismatch",
      "msg": "Public key mismatch"
    },
    {
      "code": 6015,
      "name": "AtaShouldNotHaveDelegate",
      "msg": "To use an ata in this contract, please remove its delegate first"
    },
    {
      "code": 6016,
      "name": "CannotEnterMatch",
      "msg": "Can only enter matches in started or initialized state"
    },
    {
      "code": 6017,
      "name": "InvalidProof",
      "msg": "Invalid proof"
    },
    {
      "code": 6018,
      "name": "RootNotPresent",
      "msg": "Root not present on object"
    },
    {
      "code": 6019,
      "name": "MustPassUpObject",
      "msg": "If using roots, must pass up the object you are proving is a member"
    },
    {
      "code": 6020,
      "name": "NoValidValidationFound",
      "msg": "No valid validations found"
    },
    {
      "code": 6021,
      "name": "Blacklisted",
      "msg": "Blacklisted"
    },
    {
      "code": 6022,
      "name": "NoTokensAllowed",
      "msg": "Tokens are explicitly not allowed in this match"
    },
    {
      "code": 6023,
      "name": "InvalidValidation",
      "msg": "This validation will not let in this token"
    },
    {
      "code": 6024,
      "name": "NoDeltasFound",
      "msg": "This oracle lacks any deltas"
    },
    {
      "code": 6025,
      "name": "UsePlayerEndpoint",
      "msg": "Please use the player-specific endpoint for token transfers from a player"
    },
    {
      "code": 6026,
      "name": "FromDoesNotMatch",
      "msg": "The original_sender argument does not match the from on the token delta"
    },
    {
      "code": 6027,
      "name": "CannotDeltaMoreThanAmountPresent",
      "msg": "Cannot give away more than is present in the token account"
    },
    {
      "code": 6028,
      "name": "DeltaMintDoesNotMatch",
      "msg": "Delta mint must match provided token mint account"
    },
    {
      "code": 6029,
      "name": "DestinationMismatch",
      "msg": "The given destination token account does not match the delta to field"
    },
    {
      "code": 6030,
      "name": "MatchMustBeInFinalized",
      "msg": "Match must be in finalized state to diburse"
    },
    {
      "code": 6031,
      "name": "AtaDelegateMismatch",
      "msg": "ATA delegate mismatch"
    },
    {
      "code": 6032,
      "name": "OracleAlreadyFinalized",
      "msg": "Oracle already finalized"
    },
    {
      "code": 6033,
      "name": "OracleCooldownNotPassed",
      "msg": "Oracle cooldown not over"
    },
    {
      "code": 6034,
      "name": "MatchMustBeDrained",
      "msg": "Match must be drained first"
    },
    {
      "code": 6035,
      "name": "NoParentPresent",
      "msg": "No parent present"
    },
    {
      "code": 6036,
      "name": "ReinitializationDetected",
      "msg": "Reinitialization hack detected"
    },
    {
      "code": 6037,
      "name": "FailedToLeaveNamespace",
      "msg": "Failed to leave Namespace"
    },
    {
      "code": 6038,
      "name": "FailedToJoinNamespace",
      "msg": "Failed to join Namespace"
    },
    {
      "code": 6039,
      "name": "UnauthorizedCaller",
      "msg": "Unauthorized Caller"
    },
    {
      "code": 6040,
      "name": "FailedToCache",
      "msg": "Failed to cache"
    },
    {
      "code": 6041,
      "name": "FailedToUncache",
      "msg": "Failed to uncache"
    },
    {
      "code": 6042,
      "name": "AlreadyCached",
      "msg": "Already cached"
    },
    {
      "code": 6043,
      "name": "NotCached",
      "msg": "Not cached"
    }
  ]
};

export const IDL: RaindropsMatches = {
  "version": "0.1.0",
  "name": "raindrops_matches",
  "instructions": [
    {
      "name": "createOrUpdateOracle",
      "accounts": [
        {
          "name": "oracle",
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
            "defined": "CreateOrUpdateOracleArgs"
          }
        }
      ]
    },
    {
      "name": "createMatch",
      "accounts": [
        {
          "name": "matchInstance",
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
            "defined": "CreateMatchArgs"
          }
        }
      ]
    },
    {
      "name": "updateMatch",
      "accounts": [
        {
          "name": "matchInstance",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "winOracle",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "UpdateMatchArgs"
          }
        }
      ]
    },
    {
      "name": "updateMatchFromOracle",
      "accounts": [
        {
          "name": "matchInstance",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "winOracle",
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
      "name": "drainOracle",
      "accounts": [
        {
          "name": "matchInstance",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "oracle",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
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
            "defined": "DrainOracleArgs"
          }
        }
      ]
    },
    {
      "name": "drainMatch",
      "accounts": [
        {
          "name": "matchInstance",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "receiver",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "leaveMatch",
      "accounts": [
        {
          "name": "matchInstance",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "receiver",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenAccountEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "destinationTokenAccount",
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
            "defined": "LeaveMatchArgs"
          }
        }
      ]
    },
    {
      "name": "disburseTokensByOracle",
      "accounts": [
        {
          "name": "matchInstance",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenAccountEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "destinationTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "winOracle",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "originalSender",
          "isMut": true,
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
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "DisburseTokensByOracleArgs"
          }
        }
      ]
    },
    {
      "name": "joinMatch",
      "accounts": [
        {
          "name": "matchInstance",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenTransferAuthority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "tokenAccountEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sourceTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sourceItemOrPlayerPda",
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
          "name": "validationProgram",
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
            "defined": "JoinMatchArgs"
          }
        }
      ]
    },
    {
      "name": "matchJoinNamespace",
      "accounts": [
        {
          "name": "matchInstance",
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
      "name": "matchLeaveNamespace",
      "accounts": [
        {
          "name": "matchInstance",
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
      "name": "matchCacheNamespace",
      "accounts": [
        {
          "name": "matchInstance",
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
      "name": "matchUncacheNamespace",
      "accounts": [
        {
          "name": "matchInstance",
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
      "name": "match",
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
            "name": "winOracle",
            "type": "publicKey"
          },
          {
            "name": "winOracleCooldown",
            "type": "u64"
          },
          {
            "name": "lastOracleCheck",
            "type": "u64"
          },
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "state",
            "type": {
              "defined": "MatchState"
            }
          },
          {
            "name": "leaveAllowed",
            "type": "bool"
          },
          {
            "name": "minimumAllowedEntryTime",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "currentTokenTransferIndex",
            "docs": [
              "Increased by 1 every time the next token transfer",
              "in the win oracle is completed."
            ],
            "type": "u64"
          },
          {
            "name": "tokenTypesAdded",
            "type": "u64"
          },
          {
            "name": "tokenTypesRemoved",
            "type": "u64"
          },
          {
            "name": "tokenEntryValidation",
            "type": {
              "option": {
                "vec": {
                  "defined": "TokenValidation"
                }
              }
            }
          },
          {
            "name": "tokenEntryValidationRoot",
            "type": {
              "option": {
                "defined": "Root"
              }
            }
          },
          {
            "name": "joinAllowedDuringStart",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "playerWinCallbackBitmap",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "matchKey",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "winOracle",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "finalized",
            "type": "bool"
          },
          {
            "name": "tokenTransferRoot",
            "type": {
              "option": {
                "defined": "Root"
              }
            }
          },
          {
            "name": "tokenTransfers",
            "type": {
              "option": {
                "vec": {
                  "defined": "TokenDelta"
                }
              }
            }
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "CreateOrUpdateOracleArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tokenTransferRoot",
            "type": {
              "option": {
                "defined": "Root"
              }
            }
          },
          {
            "name": "tokenTransfers",
            "type": {
              "option": {
                "vec": {
                  "defined": "TokenDelta"
                }
              }
            }
          },
          {
            "name": "seed",
            "type": "publicKey"
          },
          {
            "name": "space",
            "type": "u64"
          },
          {
            "name": "finalized",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "DrainOracleArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "seed",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "CreateMatchArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "matchState",
            "type": {
              "defined": "MatchState"
            }
          },
          {
            "name": "tokenEntryValidationRoot",
            "type": {
              "option": {
                "defined": "Root"
              }
            }
          },
          {
            "name": "tokenEntryValidation",
            "type": {
              "option": {
                "vec": {
                  "defined": "TokenValidation"
                }
              }
            }
          },
          {
            "name": "winOracle",
            "type": "publicKey"
          },
          {
            "name": "winOracleCooldown",
            "type": "u64"
          },
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "space",
            "type": "u64"
          },
          {
            "name": "leaveAllowed",
            "type": "bool"
          },
          {
            "name": "joinAllowedDuringStart",
            "type": "bool"
          },
          {
            "name": "minimumAllowedEntryTime",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "desiredNamespaceArraySize",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "UpdateMatchArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "matchState",
            "type": {
              "defined": "MatchState"
            }
          },
          {
            "name": "tokenEntryValidationRoot",
            "type": {
              "option": {
                "defined": "Root"
              }
            }
          },
          {
            "name": "tokenEntryValidation",
            "type": {
              "option": {
                "vec": {
                  "defined": "TokenValidation"
                }
              }
            }
          },
          {
            "name": "winOracleCooldown",
            "type": "u64"
          },
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "leaveAllowed",
            "type": "bool"
          },
          {
            "name": "joinAllowedDuringStart",
            "type": "bool"
          },
          {
            "name": "minimumAllowedEntryTime",
            "type": {
              "option": "u64"
            }
          }
        ]
      }
    },
    {
      "name": "JoinMatchArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "tokenEntryValidationProof",
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
            "name": "tokenEntryValidation",
            "type": {
              "option": {
                "defined": "TokenValidation"
              }
            }
          }
        ]
      }
    },
    {
      "name": "LeaveMatchArgs",
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
      "name": "DisburseTokensByOracleArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tokenDeltaProofInfo",
            "type": {
              "option": {
                "defined": "TokenDeltaProofInfo"
              }
            }
          }
        ]
      }
    },
    {
      "name": "TokenDeltaProofInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tokenDeltaProof",
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
            "name": "tokenDelta",
            "type": {
              "defined": "TokenDelta"
            }
          },
          {
            "name": "totalProof",
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
            "name": "total",
            "type": "u64"
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
            "name": "tokenValidation",
            "type": {
              "defined": "TokenValidation"
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
      "name": "TokenDelta",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "from",
            "type": "publicKey"
          },
          {
            "name": "to",
            "docs": [
              "if no to, token is burned"
            ],
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "tokenTransferType",
            "type": {
              "defined": "TokenTransferType"
            }
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
      "name": "TokenValidation",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "filter",
            "type": {
              "defined": "Filter"
            }
          },
          {
            "name": "isBlacklist",
            "type": "bool"
          },
          {
            "name": "validation",
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
      "name": "MatchState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Draft"
          },
          {
            "name": "Initialized"
          },
          {
            "name": "Started"
          },
          {
            "name": "Finalized"
          },
          {
            "name": "PaidOut"
          },
          {
            "name": "Deactivated"
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
      "name": "TokenType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Player"
          },
          {
            "name": "Item"
          },
          {
            "name": "Any"
          }
        ]
      }
    },
    {
      "name": "TokenTransferType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "PlayerToPlayer"
          },
          {
            "name": "PlayerToEntrant"
          },
          {
            "name": "Normal"
          }
        ]
      }
    },
    {
      "name": "Filter",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "None"
          },
          {
            "name": "All"
          },
          {
            "name": "Namespace",
            "fields": [
              {
                "name": "namespace",
                "type": "publicKey"
              }
            ]
          },
          {
            "name": "Parent",
            "fields": [
              {
                "name": "key",
                "type": "publicKey"
              }
            ]
          },
          {
            "name": "Mint",
            "fields": [
              {
                "name": "mint",
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
      "name": "InvalidStartingMatchState",
      "msg": "A match can only start in draft or initialized state"
    },
    {
      "code": 6009,
      "name": "InvalidUpdateMatchState",
      "msg": "Match authority can only shift from Draft to Initialized or from Initialized/Started to Deactivated"
    },
    {
      "code": 6010,
      "name": "InvalidOracleUpdate",
      "msg": "Cannot rely on an oracle until the match has been initialized or started"
    },
    {
      "code": 6011,
      "name": "CannotDrainYet",
      "msg": "Cannot drain a match until it is in paid out or deactivated and all token accounts have been drained"
    },
    {
      "code": 6012,
      "name": "CannotLeaveMatch",
      "msg": "You can only leave deactivated or paid out matches, or initialized matches with leave_allowed on."
    },
    {
      "code": 6013,
      "name": "ReceiverMustBeSigner",
      "msg": "You must be the person who joined the match to leave it in initialized or started state."
    },
    {
      "code": 6014,
      "name": "PublicKeyMismatch",
      "msg": "Public key mismatch"
    },
    {
      "code": 6015,
      "name": "AtaShouldNotHaveDelegate",
      "msg": "To use an ata in this contract, please remove its delegate first"
    },
    {
      "code": 6016,
      "name": "CannotEnterMatch",
      "msg": "Can only enter matches in started or initialized state"
    },
    {
      "code": 6017,
      "name": "InvalidProof",
      "msg": "Invalid proof"
    },
    {
      "code": 6018,
      "name": "RootNotPresent",
      "msg": "Root not present on object"
    },
    {
      "code": 6019,
      "name": "MustPassUpObject",
      "msg": "If using roots, must pass up the object you are proving is a member"
    },
    {
      "code": 6020,
      "name": "NoValidValidationFound",
      "msg": "No valid validations found"
    },
    {
      "code": 6021,
      "name": "Blacklisted",
      "msg": "Blacklisted"
    },
    {
      "code": 6022,
      "name": "NoTokensAllowed",
      "msg": "Tokens are explicitly not allowed in this match"
    },
    {
      "code": 6023,
      "name": "InvalidValidation",
      "msg": "This validation will not let in this token"
    },
    {
      "code": 6024,
      "name": "NoDeltasFound",
      "msg": "This oracle lacks any deltas"
    },
    {
      "code": 6025,
      "name": "UsePlayerEndpoint",
      "msg": "Please use the player-specific endpoint for token transfers from a player"
    },
    {
      "code": 6026,
      "name": "FromDoesNotMatch",
      "msg": "The original_sender argument does not match the from on the token delta"
    },
    {
      "code": 6027,
      "name": "CannotDeltaMoreThanAmountPresent",
      "msg": "Cannot give away more than is present in the token account"
    },
    {
      "code": 6028,
      "name": "DeltaMintDoesNotMatch",
      "msg": "Delta mint must match provided token mint account"
    },
    {
      "code": 6029,
      "name": "DestinationMismatch",
      "msg": "The given destination token account does not match the delta to field"
    },
    {
      "code": 6030,
      "name": "MatchMustBeInFinalized",
      "msg": "Match must be in finalized state to diburse"
    },
    {
      "code": 6031,
      "name": "AtaDelegateMismatch",
      "msg": "ATA delegate mismatch"
    },
    {
      "code": 6032,
      "name": "OracleAlreadyFinalized",
      "msg": "Oracle already finalized"
    },
    {
      "code": 6033,
      "name": "OracleCooldownNotPassed",
      "msg": "Oracle cooldown not over"
    },
    {
      "code": 6034,
      "name": "MatchMustBeDrained",
      "msg": "Match must be drained first"
    },
    {
      "code": 6035,
      "name": "NoParentPresent",
      "msg": "No parent present"
    },
    {
      "code": 6036,
      "name": "ReinitializationDetected",
      "msg": "Reinitialization hack detected"
    },
    {
      "code": 6037,
      "name": "FailedToLeaveNamespace",
      "msg": "Failed to leave Namespace"
    },
    {
      "code": 6038,
      "name": "FailedToJoinNamespace",
      "msg": "Failed to join Namespace"
    },
    {
      "code": 6039,
      "name": "UnauthorizedCaller",
      "msg": "Unauthorized Caller"
    },
    {
      "code": 6040,
      "name": "FailedToCache",
      "msg": "Failed to cache"
    },
    {
      "code": 6041,
      "name": "FailedToUncache",
      "msg": "Failed to uncache"
    },
    {
      "code": 6042,
      "name": "AlreadyCached",
      "msg": "Already cached"
    },
    {
      "code": 6043,
      "name": "NotCached",
      "msg": "Not cached"
    }
  ]
};
