
const { scoreSegment } = require('../src/services/accessibility/aggregator');

function runTests() {
    console.log('Running Accessibility Scoring Tests...');

    const testCases = [
        {
            name: 'No tags (Unknown)',
            props: {},
            expectedConfidence: 'medium',
            expectedScore: 0.90, // Changed from implicit 1.0
        },
        {
            name: 'Explicit Wheelchair Yes',
            props: { wheelchair: 'yes' },
            expectedConfidence: 'high',
            expectedScore: 1.0,
        },
        {
            name: 'Explicit Wheelchair No',
            props: { wheelchair: 'no' },
            expectedConfidence: 'low',
            expectedScore: 0.2, // 1.0 (start) - 0.8
        },
        {
            name: 'Good Surfaces',
            props: { surface: 'paved', smoothness: 'good' },
            expectedConfidence: 'high',
            expectedScore: 1.0, // 0.9 + 0.05 + 0.05 = 1.0
        },
        {
            name: 'Bad Incline',
            props: { incline: '15%' },
            expectedConfidence: 'low',
            expectedScore: 0.5, // 0.9 - 0.4
        },
        {
            name: 'Steps',
            props: { highway: 'steps' },
            expectedConfidence: 'low',
            expectedScore: 0.0, // 0.9 - 0.9
        }
    ];

    testCases.forEach((test, index) => {
        console.log(`\nTest ${index + 1}: ${test.name}`);
        const result = scoreSegment(test.props);
        console.log(`  Confidence: ${result.confidence} (Expected: ${test.expectedConfidence})`);
        console.log(`  Score: ${result.score.toFixed(2)} (Expected: ${test.expectedScore.toFixed(2)})`);
        console.log(`  Accessible: ${result.isAccessible}`);
        console.log(`  Issues: ${result.issues.join(', ')}`);

        if (Math.abs(result.score - test.expectedScore) > 0.01) {
            console.error(`  FAIL: Score mismatch!`);
        }
    });
}

runTests();
