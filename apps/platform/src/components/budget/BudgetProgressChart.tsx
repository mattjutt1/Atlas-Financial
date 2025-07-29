'use client';

import React from 'react';
import { formatCurrency, formatCurrencyCompact } from '@atlas/shared/utils/currency';

interface BudgetProgressChartProps {
  categories: Array<{
    id: string;
    name: string;
    type: 'need' | 'want' | 'save';
    allocated_amount: number;
    spent_amount: number;
    remaining_amount: number;
    percentage_used: number;
  }>;
  totalIncome: number;
  totalAllocated: number;
  totalSpent: number;
}

export const BudgetProgressChart: React.FC<BudgetProgressChartProps> = ({
  categories,
  totalIncome,
  totalAllocated,
  totalSpent
}) => {
  // Group categories by type
  const needsCategories = categories.filter(cat => cat.type === 'need');
  const wantsCategories = categories.filter(cat => cat.type === 'want');
  const savingsCategories = categories.filter(cat => cat.type === 'save');

  const needsTotal = needsCategories.reduce((sum, cat) => sum + cat.allocated_amount, 0);
  const wantsTotal = wantsCategories.reduce((sum, cat) => sum + cat.allocated_amount, 0);
  const savingsTotal = savingsCategories.reduce((sum, cat) => sum + cat.allocated_amount, 0);

  const needsSpent = needsCategories.reduce((sum, cat) => sum + cat.spent_amount, 0);
  const wantsSpent = wantsCategories.reduce((sum, cat) => sum + cat.spent_amount, 0);
  const savingsSpent = savingsCategories.reduce((sum, cat) => sum + cat.spent_amount, 0);

  // Calculate percentages for the doughnut chart
  const unallocated = Math.max(0, totalIncome - totalAllocated);
  const chartData = [
    { label: 'Needs', allocated: needsTotal, spent: needsSpent, color: '#ef4444', lightColor: '#fecaca' },
    { label: 'Wants', allocated: wantsTotal, spent: wantsSpent, color: '#f59e0b', lightColor: '#fed7aa' },
    { label: 'Savings', allocated: savingsTotal, spent: savingsSpent, color: '#10b981', lightColor: '#a7f3d0' },
    { label: 'Unallocated', allocated: unallocated, spent: 0, color: '#6b7280', lightColor: '#d1d5db' }
  ].filter(item => item.allocated > 0);

  // Calculate SVG circle parameters
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  let currentAngle = 0;

  const createPath = (startAngle: number, endAngle: number, innerRadius: number, outerRadius: number) => {
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;

    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    const x1 = 100 + Math.cos(startAngleRad) * outerRadius;
    const y1 = 100 + Math.sin(startAngleRad) * outerRadius;
    const x2 = 100 + Math.cos(endAngleRad) * outerRadius;
    const y2 = 100 + Math.sin(endAngleRad) * outerRadius;

    const x3 = 100 + Math.cos(endAngleRad) * innerRadius;
    const y3 = 100 + Math.sin(endAngleRad) * innerRadius;
    const x4 = 100 + Math.cos(startAngleRad) * innerRadius;
    const y4 = 100 + Math.sin(startAngleRad) * innerRadius;

    return [
      `M ${x1} ${y1}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
      'Z'
    ].join(' ');
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Budget Overview</h3>
        <div className="text-sm text-gray-500">
          {formatCurrency(totalSpent)} of {formatCurrency(totalAllocated)} spent
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-center lg:items-start space-y-6 lg:space-y-0 lg:space-x-8">
        {/* Doughnut Chart */}
        <div className="flex-shrink-0">
          <div className="relative">
            <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
              {chartData.map((item, index) => {
                const percentage = totalIncome > 0 ? (item.allocated / totalIncome) * 100 : 0;
                const angle = (percentage / 100) * 360;
                const spentPercentage = item.allocated > 0 ? (item.spent / item.allocated) * 100 : 0;

                // Outer ring (allocated)
                const outerPath = createPath(currentAngle, currentAngle + angle, 60, 80);

                // Inner ring (spent)
                const spentAngle = (spentPercentage / 100) * angle;
                const innerPath = createPath(currentAngle, currentAngle + spentAngle, 40, 58);

                const result = (
                  <g key={index}>
                    {/* Allocated amount (outer ring) */}
                    <path
                      d={outerPath}
                      fill={item.lightColor}
                      stroke="white"
                      strokeWidth="2"
                    />
                    {/* Spent amount (inner ring) */}
                    <path
                      d={innerPath}
                      fill={item.color}
                      stroke="white"
                      strokeWidth="2"
                    />
                  </g>
                );

                currentAngle += angle;
                return result;
              })}
            </svg>

            {/* Center text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0}%
                </div>
                <div className="text-sm text-gray-600">Used</div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend and Details */}
        <div className="flex-1 w-full">
          <div className="space-y-4">
            {chartData.filter(item => item.label !== 'Unallocated').map((item, index) => {
              const spentPercentage = item.allocated > 0 ? (item.spent / item.allocated) * 100 : 0;

              return (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-medium text-gray-900">{item.label}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {Math.round(spentPercentage)}% used
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-gray-500">Allocated</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(item.allocated)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Spent</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(item.spent)}</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, spentPercentage)}%`,
                        backgroundColor: spentPercentage >= 100 ? '#ef4444' :
                                        spentPercentage >= 80 ? '#f59e0b' : item.color
                      }}
                    />
                  </div>

                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500">
                      {formatCurrency(Math.max(0, item.allocated - item.spent))} remaining
                    </span>
                    {spentPercentage >= 100 && (
                      <span className="text-xs text-red-600 font-medium">
                        Over by {formatCurrency(item.spent - item.allocated)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary Stats */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-500">Income</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrencyCompact(totalIncome)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Allocated</p>
                <p className="text-lg font-semibold text-blue-600">
                  {formatCurrencyCompact(totalAllocated)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Available</p>
                <p className={`text-lg font-semibold ${
                  totalIncome - totalAllocated >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrencyCompact(Math.abs(totalIncome - totalAllocated))}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Budget Health Insights */}
      {totalAllocated > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Budget Insights</h4>
          <div className="space-y-2">
            {totalSpent > totalAllocated && (
              <div className="flex items-center text-sm text-red-600">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                You're over budget by {formatCurrency(totalSpent - totalAllocated)}
              </div>
            )}
            {totalIncome - totalAllocated > 0 && (
              <div className="flex items-center text-sm text-blue-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
                You have {formatCurrency(totalIncome - totalAllocated)} unallocated
              </div>
            )}
            {(() => {
              const overCategories = categories.filter(cat => cat.percentage_used >= 100);
              if (overCategories.length > 0) {
                return (
                  <div className="flex items-center text-sm text-yellow-600">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2" />
                    {overCategories.length} category{overCategories.length > 1 ? 'ies' : 'y'} over budget
                  </div>
                );
              }
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
