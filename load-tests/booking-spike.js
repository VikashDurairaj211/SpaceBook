import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * SpaceBook Enterprise Concurrent Load Test (k6)
 * Simulates peak 9:00 AM corporate reservation rush:
 * - Stage 1: Warm-up with 100 concurrent users (1 minute)
 * - Stage 2: Normal morning peak with 500 concurrent users (2 minutes)
 * - Stage 3: Extreme spike with 1,000 concurrent users (2 minutes)
 * - Stage 4: Cool-down to 0 users (1 minute)
 */

export const options = {
  stages: [
    { duration: '1m', target: 100 },  // Baseline traffic
    { duration: '2m', target: 500 },  // Normal peak
    { duration: '2m', target: 1000 }, // Morning rush spike (9:00 AM)
    { duration: '1m', target: 0 },    // Cool-down
  ],
  thresholds: {
    // 95% of requests must respond within 500ms
    http_req_duration: ['p(95)<500'],
    // Error rate must remain below 1% under peak load
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'https://spacebook-505h.onrender.com/api';

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'X-Correlation-ID': `load-${Date.now()}-${__VU}-${__ITER}`,
  };

  // 1. Employee searches for available rooms
  const searchRes = http.get(`${BASE_URL}/rooms/availability?date=2026-09-09&startTime=10:00&endTime=11:00`, { headers });
  check(searchRes, {
    'Search rooms status is 200': (r) => r.status === 200,
    'Search rooms returned data': (r) => r.body.length > 0,
  });

  sleep(1);

  // 2. Employee checks hotseat desk occupancy
  const hotseatRes = http.get(`${BASE_URL}/Hotseat?date=2026-09-09&shift=Full%20Day`, { headers });
  check(hotseatRes, {
    'Hotseat status is 200': (r) => r.status === 200,
  });

  sleep(2);
}
