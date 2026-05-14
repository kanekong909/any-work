import { Component, signal, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { DragDropModule, moveItemInArray, CdkDragDrop } from '@angular/cdk/drag-drop';
import { Chart, registerables } from 'chart.js';

// Inicializacion de componentes Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink, DecimalPipe, DragDropModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  // ChartJS
  @ViewChild('salesChart') salesChartCanvas!: ElementRef<HTMLCanvasElement>; // Referencia al HTML
  chart: any; // Instancia del gráfico

  today = new Date();
  user = this.auth.currentUser;
  tenant = this.auth.currentTenant;
  primaryColor = signal('#6366f1');
  accentColor = signal('#8b5cf6');
  summary = signal<any>(null);
  recentSales = signal<any[]>([]);
  lowStockProducts = signal<any[]>([]);
  expenseSum = signal(0);
  expenseCount = signal(0);
  lowStockCount = signal(0);

  // Saludos
  greeting = signal('');

  kpis = signal([
    {
      id: 'today-sales',
      label: 'Ventas hoy',
      type: 'today-sales',
      color: () => this.primaryColor()
    },
    {
      id: 'month-sales',
      label: 'Ventas este mes',
      type: 'month-sales',
      color: () => this.accentColor()
    },
    {
      id: 'expenses',
      label: 'Gastos del mes',
      type: 'expenses',
      color: () => '#f59e0b'
    },
    {
      id: 'low-stock',
      label: 'Productos bajo stock',
      type: 'low-stock',
      color: () => '#ef4444'
    }
  ]);

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit(): void {
    this.greeting.set(this.getGreetingByHour());

    const saved = localStorage.getItem('dashboard-kpis');

    if (saved) {
      const order = JSON.parse(saved);

      const sorted = [...this.kpis()].sort(
        (a, b) =>
          order.indexOf(a.id) - order.indexOf(b.id)
      );

      this.kpis.set(sorted);
    }
    const t = this.tenant();
    if (!t) return;
    if (t) {
      this.primaryColor.set(t.primaryColor || '#6366f1');
      this.accentColor.set(t.accentColor || '#8b5cf6');
    }
    this.loadData();
  }

  loadData(): void {
      this.api.getSalesSummary().subscribe(s => this.summary.set(s));
      this.api.getSales({ limit: 5 }).subscribe(r => this.recentSales.set(r.items));
      this.api.getProducts({ lowStock: true, limit: 5 }).subscribe(r => {
        this.lowStockProducts.set(r.items);
        this.lowStockCount.set(r.total);
      });
      const now = new Date();
      this.api.getExpenses({ month: now.getMonth() + 1, year: now.getFullYear() }).subscribe(r => {
        this.expenseSum.set(r.sum);
        this.expenseCount.set(r.total);
      });

      // Petición del listado de ventas para armar la gráfica semanal
      this.api.getSales({ limit: 50 }).subscribe(r => {
        if (r && r.items) {
          this.initChart(r.items);
        }
      });
  }

  initChart(sales: any[]): void {
    if (this.chart) this.chart.destroy(); 

    const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const labels: string[] = [];
    const totals: number[] = [];

    // Bucle para iterar exactamente los últimos 7 días terminando en el día de hoy
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(daysOfWeek[d.getDay()]);

      // Filtrar transacciones ocurridas en este año, mes y día específicos
      const daySales = sales.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        return saleDate.getDate() === d.getDate() &&
               saleDate.getMonth() === d.getMonth() &&
               saleDate.getFullYear() === d.getFullYear();
      });

      // Sumar los campos 'total' parseados a valor numérico decimal
      const totalDay = daySales.reduce((acc, curr) => acc + parseFloat(curr.total || '0'), 0);
      totals.push(totalDay);
    }

    const ctx = this.salesChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chart = new Chart(ctx, {
      type: 'line', // Modifica por 'bar' si deseas cambiar la visualización a columnas
      data: {
        labels: labels,
        datasets: [{
          label: 'Ventas Semanales',
          data: totals,
          borderColor: this.primaryColor(),
          backgroundColor: `${this.primaryColor()}1a`, 
          borderWidth: 3,
          tension: 0.2, 
          fill: true,
          pointBackgroundColor: this.primaryColor(),
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value: any = context.parsed.y;
                return ' ' + '$' + value.toLocaleString('es-CO', { minimumFractionDigits: 0 });
              }
            }
          }
        },
        scales: { 
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => '$' + Number(value).toLocaleString('es-CO', { minimumFractionDigits: 0 })
            }
          }
        }
      }
    });
  }

  getStockPct(p: any): number {
    if (p.minStock === 0) return p.stock > 0 ? 50 : 0;
    return Math.min((p.stock / (p.minStock * 2)) * 100, 100);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    // Reemplaza el espacio por 'T' para que sea ISO y añade la 'Z' de UTC
    return dateString.replace(' ', 'T');
  }

  drop(event: CdkDragDrop<any[]>) {
    const current = [...this.kpis()];
    
    moveItemInArray(
      current,
      event.previousIndex,
      event.currentIndex
    );

    this.kpis.set(current);

    // opcional: guardar orden
    localStorage.setItem(
      'dashboard-kpis',
      JSON.stringify(current.map(k => k.id))
    );
  }

  // Saludos
  getGreetingByHour(): string {
      const hour = new Date().getHours();
      
      if (hour >= 5 && hour < 12) {
          return 'Buenos días';
      } else if (hour >= 12 && hour < 18) {
          return 'Buenas tardes';
      } else {
          return 'Buenas noches';
      }
  }
}
