export interface User {
  username: string;
  email?: string;
}

export interface AuthValidateResponse {
  valid: boolean;
  username?: string;
  email?: string;
}
