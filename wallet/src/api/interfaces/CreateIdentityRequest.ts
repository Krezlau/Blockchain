import { Request } from "express";

export interface CreateIdentityRequestDto extends Request {
  body: {
    encryptionPassword: string;
    path?: string;
  };
}
