'use client'

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface CategorySpending {
  name: string
  spent: number
  color: string
}

interface DashboardChartsProps {
  totalIncome: number
  totalExpense: number
  categorySpending: CategorySpending[]
}

function formatRpShort(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}rb`
  return String(value)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-2xl px-3 py-2 text-xs font-semibold shadow-lg border"
      style={{
        background: 'rgba(255,255,255,0.96)',
        borderColor: 'rgba(184,212,232,0.4)',
        color: '#3D4A5C',
      }}
    >
      <p>{payload[0].name}</p>
      <p className="font-extrabold mt-0.5">{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-2xl px-3 py-2 text-xs font-semibold shadow-lg border"
      style={{
        background: 'rgba(255,255,255,0.96)',
        borderColor: 'rgba(184,212,232,0.4)',
        color: '#3D4A5C',
      }}
    >
      <p>{label}</p>
      <p className="font-extrabold mt-0.5">{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

export function DashboardCharts({
  totalIncome,
  totalExpense,
  categorySpending,
}: DashboardChartsProps) {
  const hasDonutData = totalIncome > 0 || totalExpense > 0
  const hasBarData = categorySpending.length > 0

  if (!hasDonutData && !hasBarData) return null

  const donutData = [
    { name: 'Pemasukan', value: totalIncome },
    { name: 'Pengeluaran', value: totalExpense },
  ].filter((d) => d.value > 0)

  // Top 5 categories by spending
  const topCategories = [...categorySpending]
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5)

  return (
    <section className="space-y-4">
      {/* Income vs Expense donut */}
      {hasDonutData && (
        <div
          className="rounded-3xl border p-4"
          style={{
            background: 'rgba(255,255,255,0.78)',
            backdropFilter: 'blur(12px)',
            borderColor: 'rgba(184,212,232,0.2)',
          }}
        >
          <p
            className="text-sm font-extrabold text-[#3D4A5C] mb-3"
            style={{ fontFamily: 'var(--font-nunito), sans-serif' }}
          >
            Pemasukan vs Pengeluaran
          </p>
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={54}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {donutData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={entry.name === 'Pemasukan' ? '#A8D8B9' : '#F2A8A8'}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<DonutTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3">
              {totalIncome > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: '#A8D8B9' }} />
                  <div>
                    <p className="text-[10px] text-[#9AAAB8] uppercase tracking-wide font-semibold">Pemasukan</p>
                    <p
                      className="text-sm font-extrabold text-[#2D5A3E]"
                      style={{ fontFamily: 'var(--font-nunito), sans-serif' }}
                    >
                      {formatCurrency(totalIncome)}
                    </p>
                  </div>
                </div>
              )}
              {totalExpense > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: '#F2A8A8' }} />
                  <div>
                    <p className="text-[10px] text-[#9AAAB8] uppercase tracking-wide font-semibold">Pengeluaran</p>
                    <p
                      className="text-sm font-extrabold text-[#8B3535]"
                      style={{ fontFamily: 'var(--font-nunito), sans-serif' }}
                    >
                      {formatCurrency(totalExpense)}
                    </p>
                  </div>
                </div>
              )}
              {totalIncome > 0 && totalExpense > 0 && (
                <div className="pt-1 border-t" style={{ borderColor: 'rgba(184,212,232,0.2)' }}>
                  <p className="text-[10px] text-[#9AAAB8] uppercase tracking-wide font-semibold">Saving rate</p>
                  <p
                    className="text-sm font-extrabold"
                    style={{
                      fontFamily: 'var(--font-nunito), sans-serif',
                      color: totalIncome > totalExpense ? '#2D5A3E' : '#8B3535',
                    }}
                  >
                    {Math.round(((totalIncome - totalExpense) / totalIncome) * 100)}%
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top categories bar chart */}
      {hasBarData && (
        <div
          className="rounded-3xl border p-4"
          style={{
            background: 'rgba(255,255,255,0.78)',
            backdropFilter: 'blur(12px)',
            borderColor: 'rgba(184,212,232,0.2)',
          }}
        >
          <p
            className="text-sm font-extrabold text-[#3D4A5C] mb-3"
            style={{ fontFamily: 'var(--font-nunito), sans-serif' }}
          >
            Top Kategori Pengeluaran
          </p>
          <ResponsiveContainer width="100%" height={topCategories.length * 40 + 8}>
            <BarChart
              data={topCategories}
              layout="vertical"
              margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
              barSize={14}
            >
              <XAxis
                type="number"
                tick={{ fontSize: 9, fill: '#9AAAB8' }}
                tickFormatter={formatRpShort}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: '#3D4A5C', fontWeight: 600 }}
                width={80}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(184,212,232,0.12)' }} />
              <Bar dataKey="spent" radius={[0, 6, 6, 0]}>
                {topCategories.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color || '#B8D4E8'}
                    fillOpacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}
