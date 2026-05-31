import { User } from '../users/user.model.js';
import { HealthReport } from '../reports/health-report.model.js';
import { METRIC_CATALOG } from '../../common/metric-catalog.js';

const TOP_STATES = 10;
const MAX_MONTHS = 36;

// $bucket boundaries are lower-inclusive; the dataset's ages are 18-75.
const AGE_BOUNDARIES = [18, 30, 40, 50, 60, 70, 200];
const AGE_LABELS = { 18: '18-29', 30: '30-39', 40: '40-49', 50: '50-59', 60: '60-69', 70: '70+' };

function toCounts(rows) {
  return rows
    .filter((row) => row._id != null && row._id !== '')
    .map((row) => ({ key: String(row._id), count: row.count }));
}

function groupByField(field) {
  return User.aggregate([
    { $match: { role: 'USER' } },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]).then(toCounts);
}

// Collapse a long tail into a single "Other" bucket so a chart stays readable.
function topWithOther(counts, top) {
  if (counts.length <= top) return counts;
  const head = counts.slice(0, top);
  const otherCount = counts.slice(top).reduce((sum, c) => sum + c.count, 0);
  return otherCount > 0 ? [...head, { key: 'Other', count: otherCount }] : head;
}

// One pass over the latest report per client, fanned out with $facet into the
// "any abnormal metric" client rate and the per-metric abnormal counts.
function latestReportStats() {
  return HealthReport.aggregate([
    { $sort: { userId: 1, reportDate: -1 } },
    { $group: { _id: '$userId', metrics: { $first: '$metrics' } } },
    {
      $facet: {
        clientLevel: [
          {
            $project: {
              abnormal: {
                $gt: [
                  {
                    $size: {
                      $filter: {
                        input: '$metrics',
                        as: 'm',
                        cond: { $ne: ['$$m.flag', 'NORMAL'] },
                      },
                    },
                  },
                  0,
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              abnormal: { $sum: { $cond: ['$abnormal', 1, 0] } },
            },
          },
        ],
        metricLevel: [
          { $unwind: '$metrics' },
          {
            $group: {
              _id: '$metrics.code',
              total: { $sum: 1 },
              abnormal: { $sum: { $cond: [{ $ne: ['$metrics.flag', 'NORMAL'] }, 1, 0] } },
            },
          },
        ],
      },
    },
  ]);
}

export async function getInsights() {
  const [
    clients,
    reports,
    byHealthCondition,
    byState,
    byGender,
    byBeautyGoal,
    ageRows,
    monthRows,
    latest,
  ] = await Promise.all([
    User.countDocuments({ role: 'USER' }),
    HealthReport.countDocuments(),
    groupByField('healthCondition'),
    groupByField('state'),
    groupByField('gender'),
    groupByField('beautyGoal'),
    User.aggregate([
      { $match: { role: 'USER', age: { $ne: null } } },
      {
        $bucket: {
          groupBy: '$age',
          boundaries: AGE_BOUNDARIES,
          default: 'Other',
          output: { count: { $sum: 1 } },
        },
      },
    ]),
    HealthReport.aggregate([
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$reportDate' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    latestReportStats(),
  ]);

  const facet = latest[0] ?? { clientLevel: [], metricLevel: [] };
  const clientLevel = facet.clientLevel[0] ?? { total: 0, abnormal: 0 };
  const metricByCode = new Map(facet.metricLevel.map((m) => [m._id, m]));

  // Ordered by the catalog so the UI shows metrics in a stable, sensible order.
  const abnormalByMetric = METRIC_CATALOG.map((def) => {
    const m = metricByCode.get(def.code) ?? { total: 0, abnormal: 0 };
    return {
      code: def.code,
      label: def.label,
      total: m.total,
      abnormal: m.abnormal,
      rate: m.total ? m.abnormal / m.total : 0,
    };
  });

  const byAgeBucket = ageRows.map((row) => ({
    key: AGE_LABELS[row._id] ?? 'Other',
    count: row.count,
  }));

  const reportsByMonth = monthRows.slice(-MAX_MONTHS).map((row) => ({ month: row._id, count: row.count }));

  return {
    totals: {
      clients,
      reports,
      avgReportsPerClient: clients ? Number((reports / clients).toFixed(1)) : 0,
      abnormalLatestRate: clientLevel.total ? clientLevel.abnormal / clientLevel.total : 0,
    },
    byHealthCondition,
    byState: topWithOther(byState, TOP_STATES),
    byGender,
    byAgeBucket,
    byBeautyGoal,
    abnormalByMetric,
    reportsByMonth,
  };
}
