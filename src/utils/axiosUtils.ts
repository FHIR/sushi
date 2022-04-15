import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import HttpsProxyAgent from 'https-proxy-agent';

/**
 * This function is called to better handle axios.get calls with logic that allows
 * the use of proxies. Not needed in tests unless specifically testing with proxies.
 * Check https://github.com/axios/axios/issues/3459#issuecomment-766171276 for more info.
 * @param url {string} - string representation of url to get
 * @param responseType {any} - optional parameter to change the data type needed from get
 * (ex. arraybuffer). In default it returns JSON
 */
export async function axiosGet(url: string, options?: any): Promise<AxiosResponse<any>> {
  const httpsProxy = process.env.HTTPS_PROXY;
  const axiosOptions: AxiosRequestConfig = options ?? {};
  if (httpsProxy) {
    // https://github.com/axios/axios/issues/3459
    axiosOptions.httpsAgent = new (HttpsProxyAgent as any)(httpsProxy);
    axiosOptions.proxy = false;
  }
  if (Object.keys(axiosOptions).length > 0) {
    return await axios.get(url, axiosOptions);
  } else {
    return await axios.get(url);
  }
}
