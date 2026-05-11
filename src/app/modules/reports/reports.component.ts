import { Component, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

const CATEGORY_LABELS: Record<string, string> = {
  supplies: 'Insumos', utilities: 'Servicios públicos', rent: 'Arriendo',
  salary: 'Nómina', transport: 'Transporte', maintenance: 'Mantenimiento',
  marketing: 'Publicidad', other: 'Otro',
};

const PAY_LABELS: Record<string, string> = {
  cash: 'Efectivo', card: 'Tarjeta', nequi: 'Nequi',
  transfer: 'Transferencia', credit: 'Fiar',
};

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './reports.component.html', 
  styleUrl: './reports.component.css' 
})
export class ReportsComponent implements OnInit {
  data = signal<any>(null);
  loading = signal(false);
  salesDetail = signal<any[]>([]);
  from = '';
  to = '';
  activeRange = 'month';

  salesDays = signal<{ date: string; value: number }[]>([]);
  expenseCategories = signal<{ key: string; value: number }[]>([]);
  maxSale = 0;
  maxExpense = 0;

  // SVG config
  svgWidth = 500;
  svgHeight = 160;
  chartPad = 40;
  gridLines: { y: number; value: number }[] = [];
  svgBars = signal<any[]>([]);

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.setRange('month');
  }

  setRange(range: string): void {
    this.activeRange = range;
    const now = new Date();
    if (range === 'month') {
      this.from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      this.to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    } else if (range === 'lastmonth') {
      this.from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      this.to = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
    } else if (range === 'year') {
      this.from = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      this.to = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
    }
    this.load();
  }

  load(): void {
    if (!this.from || !this.to) return;
    this.loading.set(true);

    Promise.all([
      this.api.getReportSummary(this.from, this.to).toPromise(),
      this.api.getSalesDetail(this.from, this.to).toPromise(),
    ]).then(([summary, detail]) => {
      // Summary
      this.data.set(summary);
      const days = Object.entries(summary.salesByDay)
        .map(([date, value]) => ({ date, value: value as number }))
        .sort((a, b) => a.date.localeCompare(b.date));
      this.maxSale = Math.max(...days.map(d => d.value), 1);
      this.salesDays.set(days);
      this.buildSvgBars(days);

      const cats = Object.entries(summary.expensesByCategory)
        .map(([key, value]) => ({ key, value: value as number }))
        .sort((a, b) => b.value - a.value);
      this.maxExpense = Math.max(...cats.map(c => c.value), 1);
      this.expenseCategories.set(cats);

      // Detail
      this.salesDetail.set(detail || []);
      this.loading.set(false);
    }).catch(() => this.loading.set(false));
  }

  buildSvgBars(days: { date: string; value: number }[]): void {
    if (!days.length) { this.svgBars.set([]); return; }
    const chartW = this.svgWidth - this.chartPad - 10;
    const chartH = this.svgHeight - 25;
    const barW = Math.max(6, Math.min(30, chartW / days.length - 4));
    const step = chartW / days.length;

    // Grid lines
    const max = this.maxSale;
    this.gridLines = [0.25, 0.5, 0.75, 1].map(pct => ({
      y: chartH - (chartH * pct) + 5,
      value: max * pct,
    }));

    this.svgBars.set(days.map((day, i) => {
      const barH = Math.max(2, (day.value / max) * (chartH - 5));
      return {
        date: day.date,
        x: this.chartPad + i * step + (step - barW) / 2,
        y: chartH - barH + 5,
        w: barW,
        h: barH,
        label: new Date(day.date + 'T12:00:00').getDate().toString(),
      };
    }));
  }

  getTrend(current: number, prev: number): string {
    if (prev === 0) return current > 0 ? '↑ Nuevo' : '—';
    const pct = ((current - prev) / prev) * 100;
    return (pct >= 0 ? '↑ ' : '↓ ') + Math.abs(pct).toFixed(1) + '%';
  }

  exportCSV(): void {
    const detail = this.salesDetail();
    if (!detail.length) return;
    const headers = ['# Venta', 'Cliente', 'Método de pago', 'Items', 'Subtotal', 'Descuento', 'Total', 'Fecha'];
    const rows = detail.map(s => [
      s.saleNumber,
      s.customerName || 'General',
      PAY_LABELS[s.paymentType] || s.paymentType,
      s.items?.length || 0,
      s.subtotal,
      s.discount,
      s.total,
      this.formatDate(s.createdAt),
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-ventas-${this.from}-${this.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  formatMoney(val: number): string {
    return '$ ' + Number(val).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  formatShort(val: number): string {
    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
    if (val >= 1000) return (val / 1000).toFixed(0) + 'k';
    return val.toFixed(0);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric',
      timeZone: 'America/Bogota',
    });
  }

  getBarPct(val: number): number { return (val / this.maxSale) * 100; }
  getCatPct(val: number): number { return (val / this.maxExpense) * 100; }
  getCatLabel(key: string): string { return CATEGORY_LABELS[key] || key; }
  getPayLabel(type: string): string { return PAY_LABELS[type] || type; }

  getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      supplies: '#10b981',
      utilities: '#3b82f6',
      rent: '#f59e0b',
      salary: '#ef4444',
      transport: '#8b5cf6',
      maintenance: '#ec4899',
      marketing: '#06b6d4',
      other: '#6b7280'
    };
    return colors[category] || '#6366f1';
  }
}