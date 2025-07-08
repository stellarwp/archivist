import { readFileSync } from 'fs';
import { join } from 'path';

export interface MockResponse {
  status?: number;
  headers?: Record<string, string>;
  body: string;
}

export interface MockRoute {
  url: string;
  response: MockResponse | string;
}

export class MockServer {
  private routes: Map<string, MockResponse> = new Map();
  
  constructor(routes?: MockRoute[]) {
    if (routes) {
      routes.forEach(route => this.addRoute(route));
    }
  }
  
  addRoute(route: MockRoute) {
    const response: MockResponse = typeof route.response === 'string' 
      ? { body: route.response, status: 200 }
      : route.response;
    
    this.routes.set(route.url, response);
  }
  
  addFixture(url: string, fixtureName: string) {
    const fixturePath = join(__dirname, '..', 'fixtures', fixtureName);
    const content = readFileSync(fixturePath, 'utf-8');
    this.addRoute({ url, response: content });
  }
  
  getResponse(url: string): MockResponse | undefined {
    // Try exact match first
    if (this.routes.has(url)) {
      return this.routes.get(url);
    }
    
    // Try to match with URL object to handle different URL formats
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Try pathname match
      for (const [routeUrl, response] of this.routes) {
        try {
          const routeUrlObj = new URL(routeUrl);
          if (routeUrlObj.pathname === pathname) {
            return response;
          }
        } catch {
          // If routeUrl is just a path, compare directly
          if (routeUrl === pathname) {
            return response;
          }
        }
      }
    } catch {
      // If url is not a valid URL, ignore
    }
    
    return undefined;
  }
  
  clear() {
    this.routes.clear();
  }
}