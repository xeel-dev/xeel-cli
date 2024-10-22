import { createServer } from 'http';
import open from 'open';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import XeelAuthProvider from '../xeel.js';

vi.mock('http');
vi.mock('open');

describe('XeelAuthProvider', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  it('should throw an error in CI environments', async () => {
    const CI = process.env.CI;
    process.env.CI = 'true';
    const provider = new XeelAuthProvider();
    await expect(provider.getHeaders()).rejects.toThrow(
      'Xeel authentication is not supported in CI environments',
    );
    process.env.CI = CI;
  });

  it('should resolve with a token when authentication is successful', async () => {
    const CI = process.env.CI;
    delete process.env.CI;
    const mockServer: any = {
      listen: vi.fn(),
      close: vi.fn(),
    };
    const createServerMock = vi
      .mocked(createServer)
      .mockReturnValueOnce(mockServer);

    const mockRequest = {
      url: '/callback?token=test-token',
      headers: { host: 'localhost:9335' },
    };
    const mockResponse = {
      writeHead: vi.fn(),
      end: vi.fn(),
    };

    const headersPromise = new XeelAuthProvider().getHeaders();

    expect(createServerMock).toHaveBeenCalledOnce();
    expect(mockServer.listen).toHaveBeenCalledWith(9335);
    expect(open).toHaveBeenCalledWith(
      'https://app.xeel.dev/api/token?callbackUrl=http://localhost:9335/callback',
    );

    const handler = createServerMock.mock.calls[0][0] as Function;
    handler(mockRequest, mockResponse);

    const headers = await headersPromise;
    expect(headers.get('Authorization')).toBe('Bearer test-token');
    expect(mockResponse.writeHead).toHaveBeenCalledWith(302, {
      Location: 'https://app.xeel.dev',
    });
    expect(mockServer.close).toHaveBeenCalled();
    process.env.CI = CI;
  });

  it('should reject with an error when authentication fails', async () => {
    const CI = process.env.CI;
    delete process.env.CI;

    const mockServer: any = {
      listen: vi.fn(),
      close: vi.fn(),
    };
    const createServerMock = vi
      .mocked(createServer)
      .mockReturnValueOnce(mockServer);

    const mockRequest = {
      url: '/callback',
      headers: { host: 'localhost:9335' },
    };
    const mockResponse = {
      writeHead: vi.fn(),
      end: vi.fn(),
    };

    const headersPromise = new XeelAuthProvider().getHeaders();

    expect(createServerMock).toHaveBeenCalledOnce();
    expect(mockServer.listen).toHaveBeenCalledWith(9335);
    expect(open).toHaveBeenCalledWith(
      'https://app.xeel.dev/api/token?callbackUrl=http://localhost:9335/callback',
    );

    const handler = createServerMock.mock.calls[0][0] as Function;
    handler(mockRequest, mockResponse);

    await expect(headersPromise).rejects.toThrow('Failed to authenticate');
    expect(mockResponse.writeHead).toHaveBeenCalledWith(401, {
      'Content-Type': 'text/plain',
    });
    expect(mockResponse.end).toHaveBeenCalledWith(
      'Authentication failed! Please close this window and try again.',
    );
    expect(mockServer.close).toHaveBeenCalled();
    process.env.CI = CI;
  });
});
