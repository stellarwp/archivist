import { singleton } from 'tsyringe';
import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { ConfigService } from './config.service';
import { LoggerService } from './logger.service';

@singleton()
export class HttpService {
  private axiosInstance: AxiosInstance;
  
  constructor(
    private configService: ConfigService,
    private logger: LoggerService
  ) {
    this.axiosInstance = this.createAxiosInstance();
  }
  
  private createAxiosInstance(): AxiosInstance {
    const instance = axios.create();
    
    // Add request interceptor for logging
    instance.interceptors.request.use(
      (config) => {
        this.logger.debug(`HTTP ${config.method?.toUpperCase()} ${config.url}`, {
          headers: config.headers,
        });
        return config;
      },
      (error) => {
        this.logger.error('HTTP request error', { error: error.message });
        return Promise.reject(error);
      }
    );
    
    // Add response interceptor for logging
    instance.interceptors.response.use(
      (response) => {
        this.logger.debug(`HTTP ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        if (error.response) {
          this.logger.error(`HTTP ${error.response.status} ${error.config?.url}`, {
            data: error.response.data,
          });
        } else {
          this.logger.error('HTTP network error', { 
            message: error.message,
            url: error.config?.url,
          });
        }
        return Promise.reject(error);
      }
    );
    
    return instance;
  }
  
  getAxiosConfig(): AxiosRequestConfig {
    try {
      const config = this.configService.getCrawlConfig();
      return {
        timeout: config.timeout || 30000,
        headers: {
          'User-Agent': config.userAgent || 'Archivist/0.1.0-beta.6',
        },
        maxRedirects: 5,
        validateStatus: (status) => status < 400,
      };
    } catch {
      // Config not yet initialized, return defaults
      return {
        timeout: 30000,
        headers: {
          'User-Agent': 'Archivist/0.1.0-beta.6',
        },
        maxRedirects: 5,
        validateStatus: (status) => status < 400,
      };
    }
  }
  
  createInstance(config?: AxiosRequestConfig): AxiosInstance {
    const defaultConfig = this.getAxiosConfig();
    return axios.create({ ...defaultConfig, ...config });
  }
  
  get instance(): AxiosInstance {
    // Return the existing instance without modifying defaults
    return this.axiosInstance;
  }
  
  async get(url: string, config?: AxiosRequestConfig) {
    return this.instance.get(url, { ...this.getAxiosConfig(), ...config });
  }
  
  async head(url: string, config?: AxiosRequestConfig) {
    return this.instance.head(url, { ...this.getAxiosConfig(), ...config });
  }
  
  async post(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.instance.post(url, data, { ...this.getAxiosConfig(), ...config });
  }
}