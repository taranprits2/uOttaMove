const { loadAccessibleSegments, buildGraph } = require('./server/src/services/routing/walking_router');

const segments = loadAccessibleSegments();
const graph = buildGraph(segments);
const nodes = graph.nodes;

const visited = new Set();
const components = [];

for (const node of nodes.keys()) {
    if (visited.has(node)) continue;

    const component = [];
    const stack = [node];
    visited.add(node);

    while (stack.length > 0) {
        const curr = stack.pop();
        component.push(curr);

        const neighbors = nodes.get(curr) || [];
        neighbors.forEach(edge => {
            if (!visited.has(edge.to)) {
                visited.add(edge.to);
                stack.push(edge.to);
            }
        });
    }
    components.push(component);
}

components.sort((a, b) => b.length - a.length);

console.log(`Total Nodes: ${nodes.size}`);
console.log(`Total Components: ${components.length}`);
console.log(`Largest Component: ${components[0].length} nodes`);
console.log(`Components with > 10 nodes: ${components.filter(c => c.length > 10).length}`);
console.log(`Tiny Components (<= 2 nodes): ${components.filter(c => c.length <= 2).length}`);

for (let i = 0; i < 5; i++) {
    if (components[i]) {
        console.log(`Component ${i}: ${components[i].length} nodes`);
    }
}
