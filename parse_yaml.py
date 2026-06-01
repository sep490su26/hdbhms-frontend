import yaml
import sys
import json

file_path = "C:/Users/thanhcong/.gemini/antigravity/brain/fe18a5be-e9af-41a4-b95e-1f3b217498f0/.system_generated/steps/5/output.txt"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# The first two lines are metadata:
# Created At: 2026-05-16T15:49:14Z
# Completed At: 2026-05-16T15:49:17Z
# The output was large and was saved to: ...

# We just want the yaml content. It seems the file itself in output.txt starts from line 4.
yaml_content = ""
started = False
for line in lines:
    if line.startswith("metadata:"):
        started = True
    if started:
        yaml_content += line

try:
    data = yaml.safe_load(yaml_content)
    
    # We want to find nodes with name "RoomCard", "Floor Selector Tabs", "Text Input", etc.
    def find_nodes(node, names, results):
        if "name" in node and node["name"] in names:
            results.append(node)
        if "children" in node:
            for child in node["children"]:
                find_nodes(child, names, results)
    
    results = []
    find_nodes(data, ["RoomCard", "Floor Selector Tabs", "Search by room number…", "Container", "Header", "Button", "Link text"], results)
    
    # Let's print out interesting styles
    for res in results:
        if res["name"] in ["RoomCard", "Floor Selector Tabs", "Header"]:
            print(f"--- {res['name']} ---")
            print(json.dumps({k:v for k,v in res.items() if k not in ["children"]}, indent=2))
            
except Exception as e:
    print("Error parsing:", e)
