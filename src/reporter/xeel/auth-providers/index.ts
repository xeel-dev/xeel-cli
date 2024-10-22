export interface AuthProvider {
  getHeaders(): Promise<Headers>;
}
