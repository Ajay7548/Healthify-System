// Maps a stored report document to the API shape (healthReportSchema in
// validation/health-report.js). Dates become ISO strings; null fields are
// normalized so the client never has to guess between undefined and null.
export function toReportDto(doc) {
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    reportDate: new Date(doc.reportDate).toISOString(),
    source: doc.source,
    summary: doc.summary ?? null,
    metrics: (doc.metrics ?? []).map((metric) => ({
      code: metric.code,
      label: metric.label,
      kind: metric.kind ?? 'NUMERIC',
      value: metric.value ?? null,
      valueText: metric.valueText ?? null,
      unit: metric.unit ?? '',
      refLow: metric.refLow ?? null,
      refHigh: metric.refHigh ?? null,
      flag: metric.flag,
    })),
    createdAt: new Date(doc.createdAt).toISOString(),
  };
}
