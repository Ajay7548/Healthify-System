export function getSkip({ page, pageSize }) {
  return (page - 1) * pageSize;
}

export function buildPaginationMeta({ page, pageSize }, total) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
