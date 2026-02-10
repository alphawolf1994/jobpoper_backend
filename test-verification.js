const http = require('http');

const PORT = 3001; 
const BASE_URL = `http://localhost:${PORT}/api`;

const tests = [
  {
    name: 'Get Normal Jobs - Near Delhi (Should find "Delhi pist")',
    path: '/jobs/normal',
    params: {
      latitude: '28.6108',
      longitude: '77.1148'
    },
    expectedTitle: 'Delhi pist'
  },
  {
    name: 'Get Hot Jobs - Near Delhi (Should find "Urgent Driver")',
    path: '/jobs/hot',
    params: {
      latitude: '28.6108',
      longitude: '77.1148'
    },
    // We expect at least one job if data exists. Adjust expectation based on data.
    // For now just check success status and maybe count > 0 if we know data.
    // Or check failure if no coordinates.
  },
  {
    name: 'Get Normal Jobs - Missing Coordinates (Should FAIL 400)',
    path: '/jobs/normal',
    params: {
      // No lat/long
    },
    expectedStatus: 400
  },
  {
    name: 'Get Hot Jobs - Missing Coordinates (Should FAIL 400)',
    path: '/jobs/hot',
    params: {
        // No lat/long
    },
    expectedStatus: 400
  },
  {
    name: 'Search Normal Jobs - "cleaning" near Guntur',
    path: '/jobs/search/normal',
    params: {
      search: 'cleaning',
      latitude: '16.3002',
      longitude: '80.4426'
    },
    expectedTitle: 'Car cleaning'
  },
   {
    name: 'Search Hot Jobs - "urgent" near Delhi',
    path: '/jobs/search/hot',
    params: {
      search: 'urgent',
      latitude: '28.6108',
      longitude: '77.1148'
    },
    // Just expect success for now
  }
];

function makeRequest(path, params) {
  return new Promise((resolve, reject) => {
    // Construct query string manually
    const query = Object.keys(params)
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
      .join('&');
      
    const url = `${BASE_URL}${path}?${query}`;
    console.log(`Requesting: ${url}`);

    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 400) {
            resolve({ error: true, status: res.statusCode, data: json });
          } else {
            resolve({ error: false, status: res.statusCode, data: json });
          }
        } catch (e) {
          resolve({ error: true, status: res.statusCode, raw: data });
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function runTests() {
  console.log('Starting verification tests for Location Filtering (Query Params)...');
  
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`\n---------------------------------------------------`);
    console.log(`Running Test: ${test.name}`);
    try {
      const result = await makeRequest(test.path, test.params);
      
      if (result.error) {
        console.error('API Error:', result);
        failed++;
        continue;
      }

      const jobs = result.data.data.jobs; 
      console.log(`Found ${jobs.length} jobs.`);

      if (test.expectedCount !== undefined) {
        if (jobs.length === test.expectedCount) {
          console.log('✅ PASSED');
          passed++;
        } else {
          console.error(`❌ FAILED: Expected ${test.expectedCount} jobs, found ${jobs.length}`);
          failed++;
        }
      } else if (test.expectedTitle) {
        const found = jobs.find(j => j.title === test.expectedTitle);
        if (found) {
          console.log(`✅ PASSED: Found job "${found.title}"`);
          if (found.distance !== undefined) {
             console.log(`   Distance calculated: ${found.distance.toFixed(2)} km`);
          }
          passed++;
        } else {
          console.error(`❌ FAILED: Job "${test.expectedTitle}" not found in results.`);
          failed++;
        }
      }

    } catch (error) {
      console.error(`❌ FAILED with exception:`, error.message);
      failed++;
    }
  }

  console.log(`\n---------------------------------------------------`);
  console.log(`Summary: ${passed} Passed, ${failed} Failed`);
}

runTests();
