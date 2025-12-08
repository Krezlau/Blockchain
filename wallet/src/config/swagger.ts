const port = process.env.PORT || 8081;

export const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Blockchain Identity API",
      version: "1.0.0",
      description:
        "API for managing blockchain Virtual Identity operations including identity creation, encryption/decryption, and signature verification using ECC (secp256k1).",
      contact: {
        name: "Blockchain Team",
      },
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: "Development Server",
      },
    ],
    components: {
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Error message",
            },
            error: {
              type: "string",
              description: "Detailed error information",
            },
          },
        },
        HelloResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "hello world",
            },
          },
        },
        CreateIdentityRequest: {
          type: "object",
          required: ["encryptionPassword"],
          properties: {
            encryptionPassword: {
              type: "string",
              description: "Password to encrypt the private key",
              example: "password",
            },
            path: {
              type: "string",
              description: "Optional custom path to save identity files",
              example: "keys",
            },
          },
        },
        CreateIdentityResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Identity created successfully using ECC (secp256k1) and AES-256-GCM.",
            },
            paths: {
              type: "object",
              properties: {
                publicKey: {
                  type: "string",
                  description: "Path to the public key file",
                },
                privateKey: {
                  type: "string",
                  description: "Path to the encrypted private key file (JSON)",
                },
              },
            },
          },
        },
        SignDataRequest: {
          type: "object",
          required: ["privateKeyPath", "password", "dataToSign"],
          properties: {
            privateKeyObjectPath: {
              type: "string",
              description: "Path to the private key file containing encrypted private key",
              example: "keys/ecc_priv_key.json",
            },
            password: {
              type: "string",
              description: "Password to decrypt the private key",
              example: "password",
            },
            dataToSign: {
              type: "string",
              description: "Data to be signed (hex format recommended)",
              example: "Test podpisywania",
            },
          },
        },
        SignDataResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Dane podpisane pomyślnie (ECC/secp256k1).",
            },
            signature: {
              type: "string",
              description: "DER encoded signature in hex format",
            },
          },
        },
        VerifySignatureRequest: {
          type: "object",
          required: ["publicKeyPath", "signature"],
          properties: {
            publicKeyPath: {
              type: "string",
              description: "Path to the public key file",
              example: "keys/ecc_pub_key.txt",
            },
            signature: {
              type: "string",
              description: "DER encoded signature in hex format to verify",
              example: "<put_here_signature>",
            },
            dataToSign: {
              type: "string",
              example: "Test podpisywania",
            },
          },
        },
        VerifySignatureResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Weryfikacja zakończona pomyślnie.",
            },
            isValid: {
              type: "boolean",
              description: "Whether the signature is valid",
            },
            status: {
              type: "string",
              example: "Podpis jest POPRAWNY.",
            },
          },
        },
        MakeTransactionRequest: {
          type: "object",
          required: ["publicKeyPath", "amount", "privateKeyObjectPath", "password", "receiverAddress"],
          properties: {
            publicKeyPath: {
              type: "string",
              description: "Path to the public key file (used to find change address).",
              example: "keys/ecc_pub_key.txt",
            },
            amount: {
              type: "integer",
              description: "Amount of currency to send.",
              example: 10,
            },
            privateKeyObjectPath: {
              type: "string",
              description: "Path to the encrypted private key file (sender).",
              example: "keys/ecc_priv_key.json",
            },
            password: {
              type: "string",
              description: "Password to decrypt the private key.",
              example: "password",
            },
            receiverAddress: {
              type: "string",
              description: "Public address of the receiver.",
              example: "04abcdef1234567890...",
            },
          },
        },
        MakeTransactionResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Successfully signed data",
            },
            transaction: {
              type: "string",
              description: "The created and signed transaction object (JSON string).",
              example: '{"id": "...", "txIns": [...], "txOuts": [...]}',
            },
          },
        },
        CheckCreditsRequest: {
          type: "object",
          required: ["myAddress"],
          properties: {
            myAddress: {
              type: "string",
              description: "Your public key address to check balance for.",
              example: "04abcdef1234567890...",
            },
          },
        },
        CheckCreditsResponse: {
          type: "object",
          properties: {
            availableCredits: {
              type: "integer",
              description: "Total available unspent amount (sum of UTXOs) for the given address.",
              example: 150,
            },
          },
        },
        MineBlockRequest: {
          type: "object",
          required: ["minerAdress"],
          properties: {
            minerAdress: {
              type: "string",
              description: "The public address that will receive the block reward (Coinbase TxOut).",
              example: "04abcdef1234567890...",
            },
          },
        },
        MineBlockResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Pomyślnie wydobyto blok 123",
            },
            block: {
              type: "object",
              description: "The newly mined block object (Block class structure).",
              properties: {
                index: { type: "integer" },
                hash: { type: "string" },
                previousHash: { type: "string" },
                timestamp: { type: "integer" },
                data: { type: "array", description: "Array of transactions included in the block." },
                difficulty: { type: "integer" },
                nonce: { type: "integer" }
              }
            },
          },
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Bearer token authentication",
        },
      },
    },
    paths: {
      "/api/hello": {
        get: {
          summary: "Hello endpoint",
          description: "Returns a hello world message",
          tags: ["General"],
          responses: {
            "200": {
              description: "Success",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/HelloResponse",
                  },
                },
              },
            },
          },
        },
      },
      "/api/create-identity": {
        post: {
          summary: "Create a new blockchain identity",
          description:
            "Generates a new ECC key pair (secp256k1) and encrypts the private key using AES-256-GCM. Returns paths to both public and encrypted private key files.",
          tags: ["Identity"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CreateIdentityRequest",
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Identity created successfully",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/CreateIdentityResponse",
                  },
                },
              },
            },
            "400": {
              description: "Missing required parameters",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse",
                  },
                },
              },
            },
            "500": {
              description: "Internal server error",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse",
                  },
                },
              },
            },
          },
        },
      },
      "/api/sign-data": {
        post: {
          summary: "Sign data with encrypted private key",
          description:
            "Signs the provided data using the private key decrypted from the private key file. Uses ECC (secp256k1) algorithm.",
          tags: ["Encryption"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SignDataRequest",
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Data signed successfully",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/SignDataResponse",
                  },
                },
              },
            },
            "400": {
              description: "Missing required parameters",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse",
                  },
                },
              },
            },
            "500": {
              description: "Error during signing (incorrect password or file issues)",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse",
                  },
                },
              },
            },
          },
        },
      },
      "/api/decrypt-data": {
        post: {
          summary: "Verify a signature",
          description:
            "Verifies that a signature was created using the private key corresponding to the provided public key. Uses ECC (secp256k1) algorithm.",
          tags: ["Encryption"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/VerifySignatureRequest",
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Signature verification completed",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/VerifySignatureResponse",
                  },
                },
              },
            },
            "400": {
              description: "Missing required parameters",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse",
                  },
                },
              },
            },
            "500": {
              description: "Error during verification",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse",
                  },
                },
              },
            },
          },
        },
      },
      "/api/make-transaction": {
        post: {
          summary: "Create and sign a new transaction",
          description: "Gathers necessary UTXOs, signs a new transaction using the private key, and prepares it for broadcasting. NOTE: This endpoint only creates the transaction, broadcasting must be done separately.",
          tags: ["Transaction"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/MakeTransactionRequest",
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Transaction successfully created and signed.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/MakeTransactionResponse",
                  },
                },
              },
            },
            "400": {
              description: "Missing required parameters or insufficient funds.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse",
                  },
                },
              },
            },
            "500": {
              description: "Error during transaction creation (e.g., file reading error, signing failure).",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse",
                  },
                },
              },
            },
          },
        },
      },
      "/api/check-credits": {
        post: {
          summary: "Check available balance (credits)",
          description: "Fetches the current UTXO set from the node and calculates the total available balance for the given address.",
          tags: ["Transaction"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CheckCreditsRequest",
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Balance checked successfully.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/CheckCreditsResponse",
                  },
                },
              },
            },
            "400": {
              description: "Missing required parameters.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse",
                  },
                },
              },
            },
            "500": {
              description: "Internal server error (e.g., node connection failure).",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse",
                  },
                },
              },
            },
          },
        },
      },
      "/api/mine-block": {
        post: {
          summary: "Mine a single block",
          description: "Sends a request to the node to initiate the Proof-of-Work process and mine a single block, including transactions from the Mempool.",
          tags: ["Transaction"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/MineBlockRequest",
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Block successfully mined and added to the chain.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/MineBlockResponse",
                  },
                },
              },
            },
            "400": {
              description: "Missing required parameters.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse",
                  },
                },
              },
            },
            "500": {
              description: "Error during mining (e.g., node connection failure, internal mining error).",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse",
                  },
                },
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: "General",
        description: "General endpoints",
      },
      {
        name: "Identity",
        description: "Blockchain identity management",
      },
      {
        name: "Encryption",
        description: "Encryption and signature operations",
      },
      {
        name: "Transaction",
        description: "Wallet and transaction operations",
      },
    ],
  },
  apis: [],
};
