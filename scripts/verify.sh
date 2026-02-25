#!/bin/bash
# script relies on a valid auth cookie being present in cookies.txt

BASE_URL="http://localhost:8080/api/v1"

echo "1. List initial todos (this is the baseline)"
curl -s -b cookies.txt "$BASE_URL/todos"
echo -e "\n"

echo "2. Create a Todo"
RESPONSE=$(curl -s -b cookies.txt -X POST "$BASE_URL/todos" -d '{"title": "Test Todo"}')
echo "Created: $RESPONSE"
ID=$(echo $RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "Extracted ID: $ID"
echo -e "\n"

echo "3. List Todos (should have one + baseline)"
curl -s -b cookies.txt "$BASE_URL/todos"
echo -e "\n"

echo "4. Complete the Todo"
curl -s -b cookies.txt -X PUT "$BASE_URL/todos/$ID" -d '{"completed": true, "title": "Test Todo Completed"}'
echo -e "\n"

echo "5. Verify update"
curl -s -b cookies.txt "$BASE_URL/todos"
echo -e "\n"

echo "6. Delete the Todo"
curl -s -b cookies.txt -X DELETE "$BASE_URL/todos/$ID"
echo -e "Deleted"
echo -e "\n"

echo "7. Final list (should be empty besides pre-existing baseline)"
curl -s -b cookies.txt "$BASE_URL/todos"
echo -e "\n"
