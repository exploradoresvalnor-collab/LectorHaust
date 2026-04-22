/**
 * Request Concurrency Manager
 * Limita el número de requests concurrentes a máximo 2
 * para evitar sobrecargar el API y el main thread
 */

interface PendingRequest {
  fn: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

class ConcurrencyManager {
  private activeRequests = 0;
  private maxConcurrent = 2;
  private queue: PendingRequest[] = [];

  async run<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: PendingRequest = { fn, resolve, reject };

      if (this.activeRequests < this.maxConcurrent) {
        this.executeRequest(request);
      } else {
        this.queue.push(request);
      }
    });
  }

  private executeRequest(request: PendingRequest) {
    this.activeRequests++;

    request
      .fn()
      .then((result) => {
        request.resolve(result);
        this.onRequestComplete();
      })
      .catch((error) => {
        request.reject(error);
        this.onRequestComplete();
      });
  }

  private onRequestComplete() {
    this.activeRequests--;

    if (this.queue.length > 0) {
      const nextRequest = this.queue.shift();
      if (nextRequest) {
        this.executeRequest(nextRequest);
      }
    }
  }

  setMaxConcurrent(max: number) {
    this.maxConcurrent = Math.max(1, max);
  }

  getActiveCount(): number {
    return this.activeRequests;
  }

  getQueueSize(): number {
    return this.queue.length;
  }
}

export const concurrencyManager = new ConcurrencyManager();
