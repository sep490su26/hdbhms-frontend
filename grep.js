const fs = require('fs');
const text = fs.readFileSync('C:\\Users\\thanhcong\\.gemini\\antigravity\\brain\\fe18a5be-e9af-41a4-b95e-1f3b217498f0\\.system_generated\\steps\\5\\output.txt', 'utf-8');
const lines = text.split('\n');
for(let i=0; i<lines.length; i++) {
  if (lines[i].includes('RoomCard')) {
    console.log(`Line ${i}: ${lines[i]}`);
  }
}
