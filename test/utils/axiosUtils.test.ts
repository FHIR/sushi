import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { axiosGet } from '../../src/utils/axiosUtils';

describe('axiosUtils', () => {
  let getSpy: jest.SpyInstance;

  beforeAll(() => {
    getSpy = jest.spyOn(axios, 'get');
    delete process.env.HTTPS_PROXY;
  });

  afterEach(() => {
    delete process.env.HTTPS_PROXY;
    getSpy.mockClear();
  });

  describe('#axiosGet', () => {
    it('returns get with responseType assigned when it is used as argument', async () => {
      getSpy.mockImplementationOnce(() => Promise.resolve({}));
      await axiosGet('packages.fhir.org/de.basisprofil.r4/1.1.0', { responseType: 'arraybuffer' });
      expect(getSpy).toHaveBeenCalledWith('packages.fhir.org/de.basisprofil.r4/1.1.0', {
        responseType: 'arraybuffer'
      });
    });

    it('returns get without responseType assigned by default', async () => {
      getSpy.mockImplementationOnce(() => Promise.resolve({}));
      await axiosGet('packages.fhir.org/de.basisprofil.r4/1.1.0');
      expect(getSpy).toHaveBeenCalledWith('packages.fhir.org/de.basisprofil.r4/1.1.0');
    });

    it('calls get with proxy agent when https env variable is set', async () => {
      getSpy.mockImplementationOnce(() => Promise.resolve({}));
      process.env.HTTPS_PROXY = 'https://127.0.0.1:2626';
      await axiosGet('packages.fhir.org/de.basisprofil.r4/1.1.0');
      expect(getSpy).toHaveBeenCalledOnce();
      const axiosGetArgs = getSpy.mock.calls[0];
      expect(axiosGetArgs[0]).toBe('packages.fhir.org/de.basisprofil.r4/1.1.0');
      expect(axiosGetArgs[1].proxy).toBeFalse();
      expect(axiosGetArgs[1].httpsAgent).toBeInstanceOf(HttpsProxyAgent);
      expect(axiosGetArgs[1].httpsAgent.proxy).toEqual(new URL('https://127.0.0.1:2626'));
    });
  });
});
