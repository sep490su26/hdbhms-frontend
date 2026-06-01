const fs = require('fs');
const text = fs.readFileSync('C:\\Users\\thanhcong\\.gemini\\antigravity\\brain\\fe18a5be-e9af-41a4-b95e-1f3b217498f0\\.system_generated\\steps\\5\\output.txt', 'utf-8');
const lines = text.split('\n');

// Find where fills, strokes, or styles are defined. Usually at the bottom or top.
let inFills = false;
for(let i=0; i<lines.length; i++) {
  if (lines[i].startsWith('fills:')) inFills = true;
  else if (inFills && !lines[i].startsWith('  ')) {
      // not indented
      inFills = false;
  }
  
  if (inFills) {
      console.log(lines[i]);
  }
}
