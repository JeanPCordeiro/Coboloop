const fs = require('fs');
const path = require('path');

// Utility to read a COBOL source file
function readCobolFile(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf-8');
    } catch (err) {
        console.error(`Error reading file: ${err.message}`);
        process.exit(1);
    }
}

// Parse COBOL source to extract PERFORM calls and detect EXEC SQL blocks
function parseCobolSource(sourceCode) {
    const lines = sourceCode.split('\n');
    const performCalls = {};
    const sqlUsage = {};
    let currentFunction = null;

    lines.forEach((line) => {
        const trimmedLine = line.trim();

        // Detect paragraph/function start
        const functionMatch = trimmedLine.match(/^(\d{3}-[\w-]+)/);
        if (functionMatch) {
            currentFunction = functionMatch[1];
            performCalls[currentFunction] = [];
            sqlUsage[currentFunction] = false; // Initialize SQL usage as false
            return;
        }

        // Detect PERFORM statements
        if (currentFunction && trimmedLine.startsWith('PERFORM')) {
            const performMatch = trimmedLine.match(/PERFORM\s+([\w-]+)/);
            if (performMatch) {
                performCalls[currentFunction].push(performMatch[1]);
            }
        }

        // Detect EXEC SQL blocks
        if (currentFunction && /EXEC\s+SQL/i.test(trimmedLine)) {
            sqlUsage[currentFunction] = true; // Mark that this function uses SQL
        }
    });

    return { performCalls, sqlUsage };
}

// Recursively build the PERFORM call tree
function buildPerformTree(performCalls, startFunction, sqlUsage, visited = new Set()) {
    if (visited.has(startFunction)) {
        return { name: startFunction, calls: [], usesSQL: sqlUsage[startFunction] }; // Avoid infinite loops
    }

    visited.add(startFunction);
    const calls = performCalls[startFunction] || [];
    const tree = { name: startFunction, usesSQL: sqlUsage[startFunction], calls: [] };

    calls.forEach((call) => {
        tree.calls.push(buildPerformTree(performCalls, call, sqlUsage, visited));
    });

    return tree;
}

// Check if any function in the call tree uses EXEC SQL
function containsExecSQL(tree) {
    if (tree.usesSQL) return true;
    return tree.calls.some(containsExecSQL);
}

// Display the PERFORM call tree
function displayPerformTree(tree, indent = 0) {
    console.log(
        `${' '.repeat(indent)}- ${tree.name} ${tree.usesSQL ? '(Uses EXEC SQL)' : ''}`
    );
    tree.calls.forEach((subTree) => displayPerformTree(subTree, indent + 2));
}

// Main function
function main() {
    const startFunction = process.argv[2];
    const filePath = path.resolve(process.argv[3]);

    if (!startFunction || !filePath) {
        console.error('Usage: node analyzeCobol.js <startFunction> <filePath>');
        process.exit(1);
    }

    const cobolSource = readCobolFile(filePath);
    const { performCalls, sqlUsage } = parseCobolSource(cobolSource);
    const callTree = buildPerformTree(performCalls, startFunction, sqlUsage);

    console.log('PERFORM Call Tree:');
    displayPerformTree(callTree);

    const hasExecSQL = containsExecSQL(callTree);
    if (hasExecSQL) {
        console.error('ERROR: EXEC SQL found in the call tree.');
        process.exit(1); // Exit with error code 1
    } else {
        console.log('SUCCESS: No EXEC SQL found in the call tree.');
        process.exit(0); // Exit with success code 0
    }
}

// Run the program
main();
