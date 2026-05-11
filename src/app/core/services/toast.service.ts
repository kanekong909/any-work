import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toasts = signal<ToastMessage[]>([]);
  private counter = 0;

  getToasts() {
    return this.toasts.asReadonly();
  }

  show(options: Omit<ToastMessage, 'id'>) {
    const id = ++this.counter;
    const toast: ToastMessage = {
      ...options,
      id,
      duration: options.duration ?? (options.type === 'error' ? 5000 : 3000),
    };

    this.toasts.update(list => [...list, toast]);

    if (toast.duration && toast.duration > 0) {
      setTimeout(() => this.remove(id), toast.duration);
    }
  }

  success(title: string, message: string, duration = 3000) {
    this.show({ type: 'success', title, message, duration });
  }

  error(title: string, message: string, duration = 5000) {
    this.show({ type: 'error', title, message, duration });
  }

  warning(title: string, message: string, duration = 4000) {
    this.show({ type: 'warning', title, message, duration });
  }

  info(title: string, message: string, duration = 3000) {
    this.show({ type: 'info', title, message, duration });
  }

  remove(id: number) {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }
}