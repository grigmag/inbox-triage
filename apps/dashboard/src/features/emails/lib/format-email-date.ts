function datePart(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}
function timePart(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
export function formatEmailDate(
  value: string,
  {
    detail = false,
    now = new Date(),
  }: {
    detail?: boolean;
    now?: Date;
  } = {},
): string {
  const date = new Date(value);
  if (detail) return `${datePart(date)} ${timePart(date)}`;
  return date.toDateString() === now.toDateString()
    ? timePart(date)
    : datePart(date);
}
