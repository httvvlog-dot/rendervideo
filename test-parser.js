const greedy = /\{[\s\S]*\}/;
const textA = '{\n  "a": 1\n}';
const textB = '```json\n{\n  "a": 1,\n  "b": {}\n}\n```\nEnjoy!';
const textC = '{\n  "a": 1\n}\nOops I dropped a closing bracket }';

console.log('A:', textA.match(greedy)[0]);
console.log('B:', textB.match(greedy)[0]);
console.log('C:', textC.match(greedy)[0]);
