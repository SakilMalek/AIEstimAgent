import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import type { Takeoff } from '@shared/schema';

Chart.register(...registerables);

interface CostBreakdownChartProps {
  takeoffs: Takeoff[];
  chartType?: 'pie' | 'doughnut' | 'bar';
  title?: string;
}

export function CostBreakdownChart({ 
  takeoffs, 
  chartType = 'doughnut', 
  title = 'Cost Breakdown by Element Type' 
}: CostBreakdownChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || !takeoffs.length) return;

    // Destroy existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Group takeoffs by element type and calculate totals
    const groupedData = takeoffs.reduce((acc, takeoff) => {
      const type = takeoff.elementType;
      const cost = takeoff.totalCost || 0;
      
      if (!acc[type]) {
        acc[type] = { cost: 0, count: 0 };
      }
      acc[type].cost += cost;
      acc[type].count += 1;
      
      return acc;
    }, {} as Record<string, { cost: number; count: number }>);

    const labels = Object.keys(groupedData).map(key => 
      key.charAt(0).toUpperCase() + key.slice(1)
    );
    const costs = Object.values(groupedData).map(item => item.cost);
    const counts = Object.values(groupedData).map(item => item.count);

    // Color palette for different element types
    const colors = [
      '#3B82F6', // Blue - doors
      '#10B981', // Green - windows  
      '#F59E0B', // Amber - flooring
      '#EF4444', // Red - electrical
      '#8B5CF6', // Purple - plumbing
      '#F97316', // Orange - HVAC
      '#06B6D4', // Cyan - walls
      '#84CC16'  // Lime - structural
    ];

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const config = {
      type: chartType,
      data: {
        labels,
        datasets: [{
          label: 'Cost ($)',
          data: costs,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: colors.slice(0, labels.length),
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: !!title,
            text: title,
            font: {
              size: 16,
              weight: 'bold' as const
            },
            padding: 20
          },
          legend: {
            position: chartType === 'bar' ? ('top' as const) : ('right' as const),
            labels: {
              generateLabels: (chart: Chart) => {
                const dataset = chart.data.datasets[0];
                return labels.map((label, index) => ({
                  text: `${label}: $${costs[index].toLocaleString()} (${counts[index]} items)`,
                  fillStyle: colors[index],
                  strokeStyle: colors[index],
                  lineWidth: 2,
                  hidden: false,
                  index
                }));
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const label = context.label;
                const value = context.parsed;
                const count = counts[context.dataIndex];
                const percentage = ((value / costs.reduce((a, b) => a + b, 0)) * 100).toFixed(1);
                
                return [
                  `${label}: $${value.toLocaleString()}`,
                  `${count} items (${percentage}%)`
                ];
              }
            }
          }
        },
        ...(chartType === 'bar' && {
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (value: any) => `$${value.toLocaleString()}`
              }
            }
          }
        })
      }
    };

    chartInstance.current = new Chart(ctx, config as any);

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [takeoffs, chartType, title]);

  if (!takeoffs.length) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-50 rounded-lg">
        <p className="text-slate-500">No data available for chart</p>
      </div>
    );
  }

  return (
    <div className="relative h-64 md:h-80">
      <canvas ref={chartRef} />
    </div>
  );
}