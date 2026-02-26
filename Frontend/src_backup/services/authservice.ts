// src/services/authservice.ts
import { api } from "./api";

const TOKEN_KEY = "cv_token";

export type LoginResponse = {
  access_token: string;
  token_type: string; // "bearer"
};

export const authService = {
  async login(username: string, password: string): Promise<string> {
    // FastAPI OAuth2PasswordRequestForm => x-www-form-urlencoded
    const form = new URLSearchParams();
    form.set("username", username);
    form.set("password", password);

    const data = await api.post<LoginResponse>("/auth/login", form, {
      auth: false,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const token = data.access_token;
    localStorage.setItem(TOKEN_KEY, token);
    return token;
  },

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
  },

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  },
};