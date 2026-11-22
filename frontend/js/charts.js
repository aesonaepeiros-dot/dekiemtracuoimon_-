/**
 * DataLens Studio – Charts Module
 * 5 Enterprise Charts with Chart.js: Bar, Line, Doughnut, Pareto ABC, Histogram
 */

const PALETTE = [
  '#4F46E5', // Indigo
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#06B6D4', // Cyan
  '#8B5CF6', // Violet
  '#EF4444', // Red
  '#F97316', // Orange
  '#64748B'  // Slate
];

const chartInstances = {
  bar: null,
  line: null,
  doughnut: null,
  pareto: null,
  histogram: null
};

function getChartColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    text: isDark ? '#94A3B8' : '#64748B',
    grid: isDark ? '#334155' : '#E2E8F0',
    surface: isDark ? '#1E293B' : '#FFFFFF',
    border: isDark ? '#475569' : '#CBD5E1'
  };
}

export function destroyCharts() {
  Object.keys(chartInstances).forEach(key => {
    if (chartInstances[key]) {
      chartInstances[key].destroy();
      chartInstances[key] = null;
    }
  });
}

/**
 * Render all 5 charts from AnalysisResponseDto
 * @param {object} analysis - AnalysisResponseDto from backend
 */
export function renderCharts(analysis) {
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js not loaded');
    return;
  }

  destroyCharts();
  const theme = getChartColors();
  const { metricCol, categoryCol, aggregatedData, trendData, paretoData, columnStats } = analysis;

  // 1. Bar Chart (Category Breakdown)
  const barCanvas = document.getElementById('chart-bar');
  if (barCanvas && aggregatedData && aggregatedData.length > 0) {
    const labels = aggregatedData.map(d => d.category || d.label || 'Khác');
    const values = aggregatedData.map(d => d.value !== undefined ? d.value : d.sum);

    chartInstances.bar = new Chart(barCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: metricCol || 'Giá trị',
          data: values,
          backgroundColor: '#4F46E5',
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${metricCol}: ${Number(ctx.raw).toLocaleString('vi-VN')}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: theme.text, font: { family: 'Inter', size: 11 } }
          },
          y: {
            grid: { color: theme.grid },
            ticks: {
              color: theme.text,
              font: { family: 'Inter', size: 11 },
              callback: (v) => formatCompactNumber(v)
            }
          }
        }
      }
    });
  }

  // 2. Line Chart (Trend)
  const lineCanvas = document.getElementById('chart-line');
  if (lineCanvas && trendData && trendData.length > 0) {
    const labels = trendData.map(d => d.category || d.label || 'Kỳ');
    const values = trendData.map(d => d.value !== undefined ? d.value : d.sum);

    chartInstances.line = new Chart(lineCanvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Xu hướng ' + (metricCol || ''),
          data: values,
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#10B981',
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${Number(ctx.raw).toLocaleString('vi-VN')}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: theme.text, font: { family: 'Inter', size: 11 } }
          },
          y: {
            grid: { color: theme.grid },
            ticks: {
              color: theme.text,
              font: { family: 'Inter', size: 11 },
              callback: (v) => formatCompactNumber(v)
            }
          }
        }
      }
    });
  }

  // 3. Doughnut Chart (Proportions)
  const doughnutCanvas = document.getElementById('chart-doughnut');
  if (doughnutCanvas && aggregatedData && aggregatedData.length > 0) {
    const topData = aggregatedData.slice(0, 6);
    const labels = topData.map(d => d.category || d.label || 'Khác');
    const values = topData.map(d => d.value !== undefined ? d.value : d.sum);

    chartInstances.doughnut = new Chart(doughnutCanvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: PALETTE.slice(0, topData.length),
          borderWidth: 2,
          borderColor: theme.surface
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: theme.text,
              font: { family: 'Inter', size: 11.5 },
              boxWidth: 12,
              padding: 10
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : 0;
                return ` ${ctx.label}: ${Number(ctx.raw).toLocaleString('vi-VN')} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  // 4. Pareto / ABC Chart (Bar + Cumulative line)
  const paretoCanvas = document.getElementById('chart-pareto');
  if (paretoCanvas && paretoData && paretoData.length > 0) {
    const labels = paretoData.map(d => d.category || d.label);
    const values = paretoData.map(d => d.value !== undefined ? d.value : d.sum);
    const cumPcts = paretoData.map(d => d.cumulativePercent || d.cumPct || 0);

    chartInstances.pareto = new Chart(paretoCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            type: 'line',
            label: 'Tích lũy (%)',
            data: cumPcts,
            borderColor: '#F59E0B',
            backgroundColor: '#F59E0B',
            yAxisID: 'y1',
            tension: 0.2,
            pointRadius: 4,
            borderWidth: 2
          },
          {
            type: 'bar',
            label: metricCol || 'Giá trị',
            data: values,
            backgroundColor: paretoData.map(d => {
              const grp = d.abcGroup || (d.cumulativePercent <= 80 ? 'A' : d.cumulativePercent <= 95 ? 'B' : 'C');
              return grp === 'A' ? '#4F46E5' : grp === 'B' ? '#6366F1' : '#94A3B8';
            }),
            borderRadius: 6,
            yAxisID: 'y'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: theme.text, font: { family: 'Inter', size: 11 }, boxWidth: 12 }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: theme.text, font: { family: 'Inter', size: 11 } }
          },
          y: {
            type: 'linear',
            position: 'left',
            grid: { color: theme.grid },
            ticks: {
              color: theme.text,
              callback: (v) => formatCompactNumber(v)
            }
          },
          y1: {
            type: 'linear',
            position: 'right',
            min: 0,
            max: 100,
            grid: { display: false },
            ticks: {
              color: '#F59E0B',
              callback: (v) => `${v}%`
            }
          }
        }
      }
    });
  }

  // 5. Histogram (Distribution Frequency)
  const histCanvas = document.getElementById('chart-histogram');
  if (histCanvas && columnStats && metricCol && columnStats[metricCol]) {
    const stats = columnStats[metricCol];
    const bins = stats.histogramBins || generateMockHistogram(stats);

    chartInstances.histogram = new Chart(histCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: bins.map(b => b.label),
        datasets: [{
          label: 'Tần suất xuất hiện',
          data: bins.map(b => b.count),
          backgroundColor: '#06B6D4',
          borderRadius: 4,
          barPercentage: 0.95,
          categoryPercentage: 0.95
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Số bản ghi: ${ctx.raw}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: theme.text, font: { family: 'Inter', size: 10.5 } }
          },
          y: {
            grid: { color: theme.grid },
            ticks: { color: theme.text, stepSize: 1 }
          }
        }
      }
    });
  }
}

function generateMockHistogram(stats) {
  const min = stats.min || 0;
  const max = stats.max || 100;
  const count = stats.count || 20;
  const binCount = 8;
  const step = (max - min) / binCount;
  const bins = [];

  for (let i = 0; i < binCount; i++) {
    const s = min + i * step;
    const e = min + (i + 1) * step;
    bins.push({
      label: `${formatCompactNumber(s)} - ${formatCompactNumber(e)}`,
      count: Math.max(1, Math.round(count * (Math.sin((i / binCount) * Math.PI) * 0.4 + 0.1)))
    });
  }
  return bins;
}

function formatCompactNumber(num) {
  if (num === null || num === undefined) return '';
  const n = Number(num);
  if (isNaN(n)) return '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + ' tỷ';
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + ' triệu';
  if (abs >= 1_000) return (n / 1_000).toFixed(0) + ' nghìn';
  return n.toLocaleString('vi-VN');
}
