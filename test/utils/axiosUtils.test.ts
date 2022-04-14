import axios from 'axios';
import HttpsProxyAgent from 'https-proxy-agent';
import { axiosGet } from '../../src/utils/axiosUtils';

describe('axiosUtils', () => {
  beforeAll(() => {
    delete process.env.HTTPS_PROXY;
  });
  afterEach(() => {
    delete process.env.HTTPS_PROXY;
  });
  describe('#axiosGet', () => {
    it('returns get with responseType assigned when it is used as argument', async () => {
      const getSpy = jest.spyOn(axios, 'get').mockImplementationOnce(() => Promise.resolve({}));
      await axiosGet('packages.fhir.org/de.basisprofil.r4/1.1.0', { responseType: 'arraybuffer' });
      expect(getSpy).toHaveBeenCalledWith('packages.fhir.org/de.basisprofil.r4/1.1.0', {
        responseType: 'arraybuffer'
      });
    });

    it('returns get without responseType assigned by default', async () => {
      const getSpy = jest.spyOn(axios, 'get').mockImplementationOnce(() => Promise.resolve({}));
      await axiosGet('packages.fhir.org/de.basisprofil.r4/1.1.0');
      expect(getSpy).toHaveBeenCalledWith('packages.fhir.org/de.basisprofil.r4/1.1.0');
    });

    it('calls get with proxy agent when https env variable is set', async () => {
      const getSpy = jest.spyOn(axios, 'get').mockImplementationOnce(() => Promise.resolve({}));
      process.env.HTTPS_PROXY = 'https://127.0.0.1:2626';
      await axiosGet('packages.fhir.org/de.basisprofil.r4/1.1.0');
      expect(getSpy).toHaveBeenCalledWith('packages.fhir.org/de.basisprofil.r4/1.1.0', {
        httpsAgent: new (HttpsProxyAgent as any)('https://127.0.0.1:2626'),
        proxy: false
      });
    });
  });
});
