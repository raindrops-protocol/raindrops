export type Avatar = {
  "version": "0.1.0",
  "name": "avatar",
  "instructions": [
    {
      "name": "createAvatar",
      "accounts": [
        {
          "name": "avatar",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "playerClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "playerAuthority",
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
          "name": "playerProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "avatar",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "playerClass",
            "type": "publicKey"
          }
        ]
      }
    }
  ]
};

export const IDL: Avatar = {
  "version": "0.1.0",
  "name": "avatar",
  "instructions": [
    {
      "name": "createAvatar",
      "accounts": [
        {
          "name": "avatar",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "playerClass",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "playerAuthority",
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
          "name": "playerProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "avatar",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "playerClass",
            "type": "publicKey"
          }
        ]
      }
    }
  ]
};
