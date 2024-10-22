import { createServer } from 'http';
import open from 'open';
import { appBaseUrl } from '../constants.js';
import { AuthProvider } from './index.js';

const DEFAULT_PORT = 9335;

export default class XeelAuthProvider implements AuthProvider {
  async getHeaders() {
    if (process.env.CI) {
      throw new Error(
        'Xeel authentication is not supported in CI environments',
      );
    }
    let port = DEFAULT_PORT;
    if (process.env.PORT) {
      port = parseInt(process.env.PORT, 10);
    }
    const xeelToken = await new Promise((resolve, reject) => {
      const server = createServer((req, res) => {
        const url = new URL(req.url ?? '', `http://${req.headers.host}`);
        if (url.pathname === '/callback') {
          const token = url.searchParams.get('token');
          if (token) {
            res.writeHead(302, { Location: appBaseUrl });
            res.end();
            server.close();
            resolve(token);
          } else {
            res.writeHead(401, { 'Content-Type': 'text/plain' });
            res.end(
              'Authentication failed! Please close this window and try again.',
            );
            server.close();
            reject(new Error('Failed to authenticate'));
          }
        }
      });
      server.listen(port);
      // Launch the browser to authenticate the user
      open(
        `${appBaseUrl}/api/token?callbackUrl=http://localhost:${port}/callback`,
      );
    });
    return new Headers({
      Authorization: `Bearer ${xeelToken}`,
    });
  }
}
