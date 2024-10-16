// Simple function
function add(a, b) {
  return a + b;
}

// More complex function with error handling
function divide(a, b) {
  if (b === 0) {
    throw new Error("Cannot divide by zero");
  }
  return a / b;
}

// Function using a closure
function outerFunction() {
  let x = 10;
  function innerFunction() {
    console.log(x);
  }
  return innerFunction;
}

//definition run function
// Asynchronous function using promises with improved error handling and dummy JSON URL
async function fetchData(timeoutMs = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
      const response = await fetch('https://jsonplaceholder.typicode.com/todos/1', { signal: controller.signal });
      clearTimeout(id);
      return response.ok ? await response.json() : null;
  } catch (error) {
      clearTimeout(id);
      if (error.name === 'AbortError') {
          console.error('Fetch timed out');
      } else {
          console.error('Fetch failed:', error);
      }
      return null;
  }
}

// Class definition
class Person {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }

  greet() {
    console.log(`Hello, my name is ${this.name} and I am ${this.age} years old.`);
  }
}

// Example usage of the above functions and class
console.log(add(5, 3)); // Output: 8
try {
  console.log(divide(10, 0));
} catch (error) {
  console.error(error); // Output: Error: Cannot divide by zero
}
const myInnerFunction = outerFunction();
myInnerFunction(); // Output: 10
fetchData().then(data => console.log(data));
const person = new Person("Alice", 30);
person.greet(); // Output: Hello, my name is Alice and I am 30 years old.

// More complex example with array manipulation and filtering
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const evenNumbers = numbers.filter(number => number % 2 === 0);
const doubledEvenNumbers = evenNumbers.map(number => number * 2);
console.log(doubledEvenNumbers); // Output: [4, 8, 12, 16, 20]


// Recursive function to calculate factorial
function factorial(n) {
  if (n === 0) {
    return 1;
  } else {
    return n * factorial(n - 1);
  }
}
console.log(factorial(5)); // Output: 120

// Breadth-First Search implementation
function breadthFirstSearch(graph, startNode) {
  const visited = new Set();
  const queue = [startNode];
  visited.add(startNode);

  while (queue.length > 0) {
    const currentNode = queue.shift();
    console.log(currentNode);

    for (const neighbor of graph[currentNode] || []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
}

const graph = {
  'A': ['B', 'C'],
  'B': ['D', 'E'],
  'C': ['F'],
  'D': [],
  'E': ['F'],
  'F': []
};

console.log("Breadth-First Search:");
breadthFirstSearch(graph, 'A'); // Output: A B C D E F (order may vary slightly)


// Depth-First Search implementation (recursive)
function depthFirstSearchRecursive(graph, node, visited = new Set()) {
  visited.add(node);
  console.log(node);

  for (const neighbor of graph[node] || []) {
    if (!visited.has(neighbor)) {
      depthFirstSearchRecursive(graph, neighbor, visited);
    }
  }
}

console.log("\nDepth-First Search:");
depthFirstSearchRecursive(graph, 'A'); // Output: A B D E F C (order may vary slightly)


// Insertion Sort implementation
function insertionSort(array) {
  for (let i = 1; i < array.length; i++) {
    let key = array[i];
    let j = i - 1;

    while (j >= 0 && array[j] > key) {
      array[j + 1] = array[j];
      j--;
    }
    array[j + 1] = key;
  }
  return array;
}

const unsortedArray = [5, 2, 8, 1, 9, 4];
const sortedArray = insertionSort(unsortedArray);
console.log("\nInsertion Sort:", sortedArray); // Output: [1, 2, 4, 5, 8, 9]




// Example member array
const members = [
  { name: 'Alice', score: 90 },
  { name: 'Bob', score: 85 },
  { name: 'Charlie', score: 95 },
  { name: 'David', score: 80 }
];

// Function to rank members
function rankMembers(members) {
  // Sort members by score in descending order
  members.sort((a, b) => b.score - a.score);

  // Assign rank
  const rankedMembers = members.map((member, index) => ({
      ...member,
      rank: index + 1  // Rank starts from 1
  }));

  return rankedMembers;
}

// Fetch ranked array
const rankedArray = rankMembers(members);
console.log(rankedArray);

process.on('SIGINT', () => {
  console.log('Received SIGINT. Shutting down gracefully...');
  // Add your cleanup logic here (e.g., close database connections, stop servers).
  process.exit(5); 
});

process.on('SIGINT', () => {
  console.log('Received SIGINT. Shutting down gracefully...');
  // Add your cleanup logic here.
  setTimeout(() => {
    process.exit(0); // Exit with success code 0
  }, 5000); // Adjust delay (milliseconds) as needed
});