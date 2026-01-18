
const { scoreSegment } = require('../src/services/accessibility/aggregator');

function runTests() {
    console.log('Running Accessibility Scoring Tests...');

    const testCases = [
        {
            name: 'No tags (Unknown)',
            props: {},
            expectedConfidence: 'medium',
        },
        {
            name: 'Explicit Wheelchair Yes',
            props: { wheelchair: 'yes' },
            expectedConfidence: 'high',
        },
        {
            name: 'Explicit Wheelchair No',
            props: { wheelchair: 'no' },
            expectedConfidence: 'low',
        },
        {
            name: 'Good Surfaces',
            props: { surface: 'paved', smoothness: 'good' },
            expectedConfidence: 'high',
        },
        {
            name: 'Bad Incline',
            props: { incline: '15%' },
            expectedConfidence: 'low',
        },
        {
            name: 'Steps',
            props: { highway: 'steps' },
            expectedConfidence: 'low',
        }
    ];

    testCases.forEach((test, index) => {
        console.log(`\nTest ${index + 1}: ${test.name}`);
        const result = scoreSegment(test.props);
        console.log(`  Confidence: ${result.confidence} (Expected: ${test.expectedConfidence})`);
        console.log(`  Score: ${result.score.toFixed(2)}`);
        console.log(`  Accessible: ${result.isAccessible}`);
        console.log(`  Issues: ${result.issues.join(', ')}`);
    });
}

runTests();
