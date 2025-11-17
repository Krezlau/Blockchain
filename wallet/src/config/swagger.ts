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
    ],
  },
  apis: [],
};
