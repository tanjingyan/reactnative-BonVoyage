export type TripStatus =
  | 'upcoming'
  | 'ongoing'
  | 'past';

function dateOnlyToTime(
  value: string
) {
  const [
    year,
    month,
    day,
  ] = value
    .split('-')
    .map(Number);

  return Date.UTC(
    year,
    month - 1,
    day
  );
}

export function getTripStatus(
  startDate: string,
  endDate: string,
  today = new Date()
): TripStatus {
  const start =
    dateOnlyToTime(
      startDate
    );

  const end =
    dateOnlyToTime(
      endDate
    );

  const current =
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate()
    );

  if (current < start) {
    return 'upcoming';
  }

  if (current > end) {
    return 'past';
  }

  return 'ongoing';
}

export function getTripDuration(
  startDate: string,
  endDate: string
) {
  const start =
    dateOnlyToTime(
      startDate
    );

  const end =
    dateOnlyToTime(
      endDate
    );

  const millisecondsPerDay =
    1000 * 60 * 60 * 24;

  return (
    Math.floor(
      (end - start) /
        millisecondsPerDay
    ) + 1
  );
}

export function isValidUsername(
  username: string
) {
  return /^[a-z0-9_]{3,20}$/.test(
    username
  );
}

export function getInitials(
  name: string
) {
  const parts =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (parts.length === 0) {
    return 'BV';
  }

  return parts
    .slice(0, 2)
    .map(
      part =>
        part[0]
          ?.toUpperCase() ??
        ''
    )
    .join('');
}