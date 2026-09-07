import {
  describe,
  expect,
  test,
} from '@jest/globals';

import {
  getInitials,
  getTripDuration,
  getTripStatus,
  isValidUsername,
} from '../src/utils/bonVoyageUtils';

describe('getTripStatus', () => {
  const today =
    new Date(
      '2026-09-07T12:00:00Z'
    );

  test(
    'returns upcoming for a future trip',
    () => {
      expect(
        getTripStatus(
          '2026-10-09',
          '2026-10-17',
          today
        )
      ).toBe('upcoming');
    }
  );

  test(
    'returns ongoing for a current trip',
    () => {
      expect(
        getTripStatus(
          '2026-09-05',
          '2026-09-10',
          today
        )
      ).toBe('ongoing');
    }
  );

  test(
    'returns past for a completed trip',
    () => {
      expect(
        getTripStatus(
          '2026-08-18',
          '2026-08-19',
          today
        )
      ).toBe('past');
    }
  );
});

describe('getTripDuration', () => {
  test(
    'calculates a two day trip',
    () => {
      expect(
        getTripDuration(
          '2026-08-18',
          '2026-08-19'
        )
      ).toBe(2);
    }
  );

  test(
    'returns one day for same start and end date',
    () => {
      expect(
        getTripDuration(
          '2026-08-18',
          '2026-08-18'
        )
      ).toBe(1);
    }
  );

  test(
    'includes both first and last day',
    () => {
      expect(
        getTripDuration(
          '2026-10-09',
          '2026-10-17'
        )
      ).toBe(9);
    }
  );
});

describe('isValidUsername', () => {
  test(
    'accepts a valid username',
    () => {
      expect(
        isValidUsername(
          'jing_yan'
        )
      ).toBe(true);
    }
  );

  test(
    'rejects spaces',
    () => {
      expect(
        isValidUsername(
          'jing yan'
        )
      ).toBe(false);
    }
  );

  test(
    'rejects a username that is too short',
    () => {
      expect(
        isValidUsername(
          'jy'
        )
      ).toBe(false);
    }
  );
});

describe('getInitials', () => {
  test(
    'returns initials for full name',
    () => {
      expect(
        getInitials(
          'Jing Yan'
        )
      ).toBe('JY');
    }
  );

  test(
    'returns one initial for single name',
    () => {
      expect(
        getInitials(
          'Jingyan'
        )
      ).toBe('J');
    }
  );

  test(
    'returns BV for empty name',
    () => {
      expect(
        getInitials('')
      ).toBe('BV');
    }
  );
});