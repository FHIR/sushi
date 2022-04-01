import axios, { AxiosResponse } from 'axios';
import HttpsProxyAgent from 'https-proxy-agent';

//axoisGet
//document why we need this
//explain why not needed in tests
//https://github.com/axios/axios/issues/3459#issuecomment-766171276

export async function axiosGet(url: string, responseType?: any): Promise<AxiosResponse<any>> {
  let proxyAgent;
  const httpsProxy = process.env.HTTPS_PROXY;
  if (httpsProxy) {
    // https://github.com/axios/axios/issues/3459
    proxyAgent = new (HttpsProxyAgent as any)(httpsProxy);
  }
  if (typeof responseType !== 'undefined') {
    const res = await axios.get(url, {
      responseType: responseType,
      httpsAgent: proxyAgent,
      proxy: false
    });
    return res;
  } else {
    const res = await axios.get(url, {
      httpsAgent: proxyAgent,
      proxy: false
    });
    return res;
  }
}
