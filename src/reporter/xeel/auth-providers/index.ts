export interface AuthProvider {
  getHeaders(): Promise<Headers>;
}

export class NoOpAuthProvider implements AuthProvider {
  async getHeaders() {
    return new Headers();
  }
}
