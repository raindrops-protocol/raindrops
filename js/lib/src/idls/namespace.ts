export type Namespace = {
  "version": "0.1.0",
  "name": "namespace",
  "instructions": [
    {
      "name": "initializeNamespace",
      "accounts": [
        {
          "name": "namespace",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "metadata",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "masterEdition",
          "isMut": false,
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
            "defined": "InitializeNamespaceArgs"
          }
        }
      ]
    },
    {
      "name": "updateNamespace",
      "accounts": [
        {
          "name": "namespace",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "namespaceToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenHolder",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "UpdateNamespaceArgs"
          }
        }
      ]
    },
    {
      "name": "cacheArtifact",
      "accounts": [
        {
          "name": "namespace",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "namespaceToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "index",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "artifact",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenHolder",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "instructions",
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
        },
        {
          "name": "raindropsProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "CacheArtifactArgs"
          }
        }
      ]
    },
    {
      "name": "uncacheArtifact",
      "accounts": [
        {
          "name": "namespace",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "namespaceToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "index",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "artifact",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenHolder",
          "isMut": false,
          "isSigner": false
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
        },
        {
          "name": "instructions",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "raindropsProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "UncacheArtifactArgs"
          }
        }
      ]
    },
    {
      "name": "createNamespaceGatekeeper",
      "accounts": [
        {
          "name": "namespace",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "namespaceToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "namespaceGatekeeper",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenHolder",
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
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "addToNamespaceGatekeeper",
      "accounts": [
        {
          "name": "namespace",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "namespaceToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "namespaceGatekeeper",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenHolder",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "artifactFilter",
          "type": {
            "defined": "ArtifactFilter"
          }
        }
      ]
    },
    {
      "name": "removeFromNamespaceGatekeeper",
      "accounts": [
        {
          "name": "namespace",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "namespaceToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "namespaceGatekeeper",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenHolder",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "artifactFilter",
          "type": {
            "defined": "ArtifactFilter"
          }
        }
      ]
    },
    {
      "name": "leaveNamespace",
      "accounts": [
        {
          "name": "namespace",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "namespaceToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "artifact",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "namespaceGatekeeper",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenHolder",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "instructions",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "raindropsProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "joinNamespace",
      "accounts": [
        {
          "name": "namespace",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "namespaceToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "artifact",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "namespaceGatekeeper",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenHolder",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "instructions",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "raindropsProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "itemValidation",
      "accounts": [
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "item",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemAccount",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "ValidationArgs"
          }
        }
      ]
    },
    {
      "name": "matchValidation",
      "accounts": [
        {
          "name": "sourceItemOrPlayerPda",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "mint",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "MatchValidationArgs"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "namespaceGatekeeper",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "namespace",
            "type": "publicKey"
          },
          {
            "name": "artifactFilters",
            "type": {
              "vec": {
                "defined": "ArtifactFilter"
              }
            }
          }
        ]
      }
    },
    {
      "name": "namespace",
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
            "name": "mint",
            "type": "publicKey"
          },
          {
            "name": "metadata",
            "type": "publicKey"
          },
          {
            "name": "masterEdition",
            "type": "publicKey"
          },
          {
            "name": "uuid",
            "type": "string"
          },
          {
            "name": "prettyName",
            "type": "string"
          },
          {
            "name": "artifactsAdded",
            "type": "u64"
          },
          {
            "name": "maxPages",
            "type": "u64"
          },
          {
            "name": "fullPages",
            "type": {
              "vec": "u64"
            }
          },
          {
            "name": "artifactsCached",
            "type": "u64"
          },
          {
            "name": "permissivenessSettings",
            "type": {
              "defined": "PermissivenessSettings"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "whitelistedStakingMints",
            "type": {
              "vec": "publicKey"
            }
          },
          {
            "name": "gatekeeper",
            "type": {
              "option": "publicKey"
            }
          }
        ]
      }
    },
    {
      "name": "namespaceIndex",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "namespace",
            "type": "publicKey"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "page",
            "type": "u64"
          },
          {
            "name": "caches",
            "type": {
              "vec": "publicKey"
            }
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "InitializeNamespaceArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "desiredNamespaceArraySize",
            "type": "u64"
          },
          {
            "name": "uuid",
            "type": "string"
          },
          {
            "name": "prettyName",
            "type": "string"
          },
          {
            "name": "permissivenessSettings",
            "type": {
              "defined": "PermissivenessSettings"
            }
          },
          {
            "name": "whitelistedStakingMints",
            "type": {
              "vec": "publicKey"
            }
          }
        ]
      }
    },
    {
      "name": "UpdateNamespaceArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "prettyName",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "permissivenessSettings",
            "type": {
              "option": {
                "defined": "PermissivenessSettings"
              }
            }
          },
          {
            "name": "whitelistedStakingMints",
            "type": {
              "option": {
                "vec": "publicKey"
              }
            }
          }
        ]
      }
    },
    {
      "name": "CacheArtifactArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "page",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "UncacheArtifactArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "page",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "ArtifactFilter",
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
            "name": "tokenType",
            "type": {
              "defined": "ArtifactType"
            }
          }
        ]
      }
    },
    {
      "name": "PermissivenessSettings",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "namespacePermissiveness",
            "type": {
              "defined": "Permissiveness"
            }
          },
          {
            "name": "itemPermissiveness",
            "type": {
              "defined": "Permissiveness"
            }
          },
          {
            "name": "playerPermissiveness",
            "type": {
              "defined": "Permissiveness"
            }
          },
          {
            "name": "matchPermissiveness",
            "type": {
              "defined": "Permissiveness"
            }
          },
          {
            "name": "missionPermissiveness",
            "type": {
              "defined": "Permissiveness"
            }
          },
          {
            "name": "cachePermissiveness",
            "type": {
              "defined": "Permissiveness"
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
      "name": "ValidationArgs",
      "type": {
        "kind": "struct",
        "fields": [
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
              "option": "u8"
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
      "name": "TokenValidation",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "filter",
            "type": {
              "defined": "TokenValidationFilter"
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
      "name": "MatchValidationArgs",
      "type": {
        "kind": "struct",
        "fields": [
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
      "name": "Permissiveness",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "All"
          },
          {
            "name": "Whitelist"
          },
          {
            "name": "Blacklist"
          },
          {
            "name": "Namespace"
          }
        ]
      }
    },
    {
      "name": "ArtifactType",
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
            "name": "Mission"
          },
          {
            "name": "Namespace"
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
            "name": "Namespace",
            "fields": [
              {
                "name": "namespaces",
                "type": {
                  "vec": "publicKey"
                }
              }
            ]
          },
          {
            "name": "Key",
            "fields": [
              {
                "name": "key",
                "type": "publicKey"
              },
              {
                "name": "mint",
                "type": "publicKey"
              },
              {
                "name": "metadata",
                "type": "publicKey"
              },
              {
                "name": "edition",
                "type": {
                  "option": "publicKey"
                }
              }
            ]
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
      "name": "TokenValidationFilter",
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
      "name": "UUIDTooLong",
      "msg": "UUID too long, 6 char max"
    },
    {
      "code": 6009,
      "name": "PrettyNameTooLong",
      "msg": "Pretty name too long, 32 char max"
    },
    {
      "code": 6010,
      "name": "WhitelistStakeListTooLong",
      "msg": "Whitelist stake list too long, 5 max"
    },
    {
      "code": 6011,
      "name": "MetadataDoesntExist",
      "msg": "Metadata doesnt exist"
    },
    {
      "code": 6012,
      "name": "EditionDoesntExist",
      "msg": "Edition doesnt exist"
    },
    {
      "code": 6013,
      "name": "PreviousIndexNotFull",
      "msg": "The previous index is not full yet, so you cannot make a new one"
    },
    {
      "code": 6014,
      "name": "IndexFull",
      "msg": "Index is full"
    },
    {
      "code": 6015,
      "name": "CanOnlyCacheValidRaindropsObjects",
      "msg": "Can only cache valid raindrops artifacts (players, items, matches)"
    },
    {
      "code": 6016,
      "name": "ArtifactLacksNamespace",
      "msg": "Artifact lacks namespace!"
    },
    {
      "code": 6017,
      "name": "ArtifactNotPartOfNamespace",
      "msg": "Artifact not part of namespace!"
    },
    {
      "code": 6018,
      "name": "CannotJoinNamespace",
      "msg": "You do not have permissions to join this namespace"
    },
    {
      "code": 6019,
      "name": "CannotLeaveNamespace",
      "msg": "Error leaving namespace"
    },
    {
      "code": 6020,
      "name": "ArtifactStillCached",
      "msg": "You cannot remove an artifact from a namespace while it is still cached there. Uncache it first."
    },
    {
      "code": 6021,
      "name": "CacheFull",
      "msg": "Artifact Cache full"
    },
    {
      "code": 6022,
      "name": "CannotUncacheArtifact",
      "msg": "Cannot Uncache Artifact"
    },
    {
      "code": 6023,
      "name": "CannotCacheArtifact",
      "msg": "Cannot Cache Artifact"
    },
    {
      "code": 6024,
      "name": "DesiredNamespacesNone",
      "msg": "Artifact not configured for namespaces"
    }
  ]
};

export const IDL: Namespace = {
  "version": "0.1.0",
  "name": "namespace",
  "instructions": [
    {
      "name": "initializeNamespace",
      "accounts": [
        {
          "name": "namespace",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "metadata",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "masterEdition",
          "isMut": false,
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
            "defined": "InitializeNamespaceArgs"
          }
        }
      ]
    },
    {
      "name": "updateNamespace",
      "accounts": [
        {
          "name": "namespace",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "namespaceToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenHolder",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "UpdateNamespaceArgs"
          }
        }
      ]
    },
    {
      "name": "cacheArtifact",
      "accounts": [
        {
          "name": "namespace",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "namespaceToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "index",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "artifact",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenHolder",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "instructions",
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
        },
        {
          "name": "raindropsProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "CacheArtifactArgs"
          }
        }
      ]
    },
    {
      "name": "uncacheArtifact",
      "accounts": [
        {
          "name": "namespace",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "namespaceToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "index",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "artifact",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenHolder",
          "isMut": false,
          "isSigner": false
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
        },
        {
          "name": "instructions",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "raindropsProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "UncacheArtifactArgs"
          }
        }
      ]
    },
    {
      "name": "createNamespaceGatekeeper",
      "accounts": [
        {
          "name": "namespace",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "namespaceToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "namespaceGatekeeper",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenHolder",
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
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "addToNamespaceGatekeeper",
      "accounts": [
        {
          "name": "namespace",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "namespaceToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "namespaceGatekeeper",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenHolder",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "artifactFilter",
          "type": {
            "defined": "ArtifactFilter"
          }
        }
      ]
    },
    {
      "name": "removeFromNamespaceGatekeeper",
      "accounts": [
        {
          "name": "namespace",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "namespaceToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "namespaceGatekeeper",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenHolder",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "artifactFilter",
          "type": {
            "defined": "ArtifactFilter"
          }
        }
      ]
    },
    {
      "name": "leaveNamespace",
      "accounts": [
        {
          "name": "namespace",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "namespaceToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "artifact",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "namespaceGatekeeper",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenHolder",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "instructions",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "raindropsProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "joinNamespace",
      "accounts": [
        {
          "name": "namespace",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "namespaceToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "artifact",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "namespaceGatekeeper",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenHolder",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "instructions",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "raindropsProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "itemValidation",
      "accounts": [
        {
          "name": "itemClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "item",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemAccount",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "ValidationArgs"
          }
        }
      ]
    },
    {
      "name": "matchValidation",
      "accounts": [
        {
          "name": "sourceItemOrPlayerPda",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "mint",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "MatchValidationArgs"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "namespaceGatekeeper",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "namespace",
            "type": "publicKey"
          },
          {
            "name": "artifactFilters",
            "type": {
              "vec": {
                "defined": "ArtifactFilter"
              }
            }
          }
        ]
      }
    },
    {
      "name": "namespace",
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
            "name": "mint",
            "type": "publicKey"
          },
          {
            "name": "metadata",
            "type": "publicKey"
          },
          {
            "name": "masterEdition",
            "type": "publicKey"
          },
          {
            "name": "uuid",
            "type": "string"
          },
          {
            "name": "prettyName",
            "type": "string"
          },
          {
            "name": "artifactsAdded",
            "type": "u64"
          },
          {
            "name": "maxPages",
            "type": "u64"
          },
          {
            "name": "fullPages",
            "type": {
              "vec": "u64"
            }
          },
          {
            "name": "artifactsCached",
            "type": "u64"
          },
          {
            "name": "permissivenessSettings",
            "type": {
              "defined": "PermissivenessSettings"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "whitelistedStakingMints",
            "type": {
              "vec": "publicKey"
            }
          },
          {
            "name": "gatekeeper",
            "type": {
              "option": "publicKey"
            }
          }
        ]
      }
    },
    {
      "name": "namespaceIndex",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "namespace",
            "type": "publicKey"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "page",
            "type": "u64"
          },
          {
            "name": "caches",
            "type": {
              "vec": "publicKey"
            }
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "InitializeNamespaceArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "desiredNamespaceArraySize",
            "type": "u64"
          },
          {
            "name": "uuid",
            "type": "string"
          },
          {
            "name": "prettyName",
            "type": "string"
          },
          {
            "name": "permissivenessSettings",
            "type": {
              "defined": "PermissivenessSettings"
            }
          },
          {
            "name": "whitelistedStakingMints",
            "type": {
              "vec": "publicKey"
            }
          }
        ]
      }
    },
    {
      "name": "UpdateNamespaceArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "prettyName",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "permissivenessSettings",
            "type": {
              "option": {
                "defined": "PermissivenessSettings"
              }
            }
          },
          {
            "name": "whitelistedStakingMints",
            "type": {
              "option": {
                "vec": "publicKey"
              }
            }
          }
        ]
      }
    },
    {
      "name": "CacheArtifactArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "page",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "UncacheArtifactArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "page",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "ArtifactFilter",
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
            "name": "tokenType",
            "type": {
              "defined": "ArtifactType"
            }
          }
        ]
      }
    },
    {
      "name": "PermissivenessSettings",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "namespacePermissiveness",
            "type": {
              "defined": "Permissiveness"
            }
          },
          {
            "name": "itemPermissiveness",
            "type": {
              "defined": "Permissiveness"
            }
          },
          {
            "name": "playerPermissiveness",
            "type": {
              "defined": "Permissiveness"
            }
          },
          {
            "name": "matchPermissiveness",
            "type": {
              "defined": "Permissiveness"
            }
          },
          {
            "name": "missionPermissiveness",
            "type": {
              "defined": "Permissiveness"
            }
          },
          {
            "name": "cachePermissiveness",
            "type": {
              "defined": "Permissiveness"
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
      "name": "ValidationArgs",
      "type": {
        "kind": "struct",
        "fields": [
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
              "option": "u8"
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
      "name": "TokenValidation",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "filter",
            "type": {
              "defined": "TokenValidationFilter"
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
      "name": "MatchValidationArgs",
      "type": {
        "kind": "struct",
        "fields": [
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
      "name": "Permissiveness",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "All"
          },
          {
            "name": "Whitelist"
          },
          {
            "name": "Blacklist"
          },
          {
            "name": "Namespace"
          }
        ]
      }
    },
    {
      "name": "ArtifactType",
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
            "name": "Mission"
          },
          {
            "name": "Namespace"
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
            "name": "Namespace",
            "fields": [
              {
                "name": "namespaces",
                "type": {
                  "vec": "publicKey"
                }
              }
            ]
          },
          {
            "name": "Key",
            "fields": [
              {
                "name": "key",
                "type": "publicKey"
              },
              {
                "name": "mint",
                "type": "publicKey"
              },
              {
                "name": "metadata",
                "type": "publicKey"
              },
              {
                "name": "edition",
                "type": {
                  "option": "publicKey"
                }
              }
            ]
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
      "name": "TokenValidationFilter",
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
      "name": "UUIDTooLong",
      "msg": "UUID too long, 6 char max"
    },
    {
      "code": 6009,
      "name": "PrettyNameTooLong",
      "msg": "Pretty name too long, 32 char max"
    },
    {
      "code": 6010,
      "name": "WhitelistStakeListTooLong",
      "msg": "Whitelist stake list too long, 5 max"
    },
    {
      "code": 6011,
      "name": "MetadataDoesntExist",
      "msg": "Metadata doesnt exist"
    },
    {
      "code": 6012,
      "name": "EditionDoesntExist",
      "msg": "Edition doesnt exist"
    },
    {
      "code": 6013,
      "name": "PreviousIndexNotFull",
      "msg": "The previous index is not full yet, so you cannot make a new one"
    },
    {
      "code": 6014,
      "name": "IndexFull",
      "msg": "Index is full"
    },
    {
      "code": 6015,
      "name": "CanOnlyCacheValidRaindropsObjects",
      "msg": "Can only cache valid raindrops artifacts (players, items, matches)"
    },
    {
      "code": 6016,
      "name": "ArtifactLacksNamespace",
      "msg": "Artifact lacks namespace!"
    },
    {
      "code": 6017,
      "name": "ArtifactNotPartOfNamespace",
      "msg": "Artifact not part of namespace!"
    },
    {
      "code": 6018,
      "name": "CannotJoinNamespace",
      "msg": "You do not have permissions to join this namespace"
    },
    {
      "code": 6019,
      "name": "CannotLeaveNamespace",
      "msg": "Error leaving namespace"
    },
    {
      "code": 6020,
      "name": "ArtifactStillCached",
      "msg": "You cannot remove an artifact from a namespace while it is still cached there. Uncache it first."
    },
    {
      "code": 6021,
      "name": "CacheFull",
      "msg": "Artifact Cache full"
    },
    {
      "code": 6022,
      "name": "CannotUncacheArtifact",
      "msg": "Cannot Uncache Artifact"
    },
    {
      "code": 6023,
      "name": "CannotCacheArtifact",
      "msg": "Cannot Cache Artifact"
    },
    {
      "code": 6024,
      "name": "DesiredNamespacesNone",
      "msg": "Artifact not configured for namespaces"
    }
  ]
};
