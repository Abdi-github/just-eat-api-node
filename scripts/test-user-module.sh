#!/bin/bash
# Test script for User Module endpoints
# Run from: just-eat-api-node directory

BASE_URL="http://localhost:4005/api/v1"

echo "=========================================="
echo "  TESTING USER MODULE ENDPOINTS"
echo "=========================================="

# 1. Login as super_admin
echo ""
echo ">>> 1. Login as super_admin"
LOGIN_RESP=$(curl -s -X POST "$BASE_URL/public/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@justeat-clone.ch","password":"Password123!"}')
echo "$LOGIN_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print('SUCCESS:', d.get('success'), '| MESSAGE:', d.get('message'))" 2>/dev/null || echo "$LOGIN_RESP" | head -c 200

ADMIN_TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('tokens',{}).get('access_token',''))" 2>/dev/null)
if [ -z "$ADMIN_TOKEN" ]; then
  echo "FATAL: Could not get admin token. Aborting."
  exit 1
fi
echo "Token: ${ADMIN_TOKEN:0:30}..."

# 2. Login as customer
echo ""
echo ">>> 2. Login as customer"
CUST_RESP=$(curl -s -X POST "$BASE_URL/public/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"customer1@example.ch","password":"Password123!"}')
echo "$CUST_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print('SUCCESS:', d.get('success'), '| MESSAGE:', d.get('message'))" 2>/dev/null || echo "$CUST_RESP" | head -c 200

CUST_TOKEN=$(echo "$CUST_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('tokens',{}).get('access_token',''))" 2>/dev/null)
if [ -z "$CUST_TOKEN" ]; then
  echo "WARNING: Could not get customer token."
fi
echo "Token: ${CUST_TOKEN:0:30}..."

echo ""
echo "=========================================="
echo "  ADMIN ENDPOINTS"
echo "=========================================="

# 3. Admin: Get user statistics
echo ""
echo ">>> 3. GET /admin/users/statistics"
curl -s "$BASE_URL/admin/users/statistics" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool 2>/dev/null | head -20

# 4. Admin: List all users
echo ""
echo ">>> 4. GET /admin/users"
curl -s "$BASE_URL/admin/users?limit=5" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('SUCCESS:', d.get('success'))
print('MESSAGE:', d.get('message'))
if d.get('data'):
  for u in d['data'][:3]:
    print(f'  - {u[\"email\"]} | {u[\"full_name\"]} | roles: {[r[\"name\"] for r in u.get(\"roles\",[])]}')
if d.get('meta'):
  print('PAGINATION:', d['meta'])
" 2>/dev/null

# 5. Admin: List users filtered by status
echo ""
echo ">>> 5. GET /admin/users?status=active"
curl -s "$BASE_URL/admin/users?status=active&limit=3" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('SUCCESS:', d.get('success'), '| Total:', d.get('meta',{}).get('total','?'))
" 2>/dev/null

# 6. Admin: Get user by ID (get first user ID from list)
echo ""
echo ">>> 6. GET /admin/users/:id"
FIRST_USER_ID=$(curl -s "$BASE_URL/admin/users?limit=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -c "
import sys,json
d=json.load(sys.stdin)
users=d.get('data',[])
print(users[0]['id'] if users else '')
" 2>/dev/null)
echo "First user ID: $FIRST_USER_ID"
if [ -n "$FIRST_USER_ID" ]; then
  curl -s "$BASE_URL/admin/users/$FIRST_USER_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -c "
import sys,json
d=json.load(sys.stdin)
u=d.get('data',{})
print('SUCCESS:', d.get('success'))
print(f'  email: {u.get(\"email\")}')
print(f'  name: {u.get(\"full_name\")}')
print(f'  roles: {[r[\"name\"] for r in u.get(\"roles\",[])]}')
print(f'  permissions: {u.get(\"permissions\",[])}')
" 2>/dev/null
fi

# 7. Admin: Create a new user
echo ""
echo ">>> 7. POST /admin/users (create)"
CREATE_RESP=$(curl -s -X POST "$BASE_URL/admin/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.ch","password":"TestPass1!","first_name":"Test","last_name":"User","phone":"+41791234567"}')
echo "$CREATE_RESP" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('SUCCESS:', d.get('success'), '| MESSAGE:', d.get('message'))
u=d.get('data',{})
if u: print(f'  id: {u.get(\"id\")}  email: {u.get(\"email\")}')
" 2>/dev/null
NEW_USER_ID=$(echo "$CREATE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('id',''))" 2>/dev/null)

# 8. Admin: Update user
echo ""
echo ">>> 8. PUT /admin/users/:id (update)"
if [ -n "$NEW_USER_ID" ]; then
  curl -s -X PUT "$BASE_URL/admin/users/$NEW_USER_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"first_name":"Updated","is_active":true,"status":"active"}' | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('SUCCESS:', d.get('success'), '| MESSAGE:', d.get('message'))
u=d.get('data',{})
if u: print(f'  name: {u.get(\"full_name\")} | status: {u.get(\"status\")} | active: {u.get(\"is_active\")}')
" 2>/dev/null
fi

# 9. Admin: Assign role
echo ""
echo ">>> 9. POST /admin/users/:id/roles (assign role)"
if [ -n "$NEW_USER_ID" ]; then
  curl -s -X POST "$BASE_URL/admin/users/$NEW_USER_ID/roles" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"role":"customer"}' | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('SUCCESS:', d.get('success'), '| MESSAGE:', d.get('message'))
u=d.get('data',{})
if u: print(f'  roles: {[r[\"name\"] for r in u.get(\"roles\",[])]}')
" 2>/dev/null
fi

# 10. Admin: Remove role
echo ""
echo ">>> 10. DELETE /admin/users/:id/roles/:role (remove role)"
if [ -n "$NEW_USER_ID" ]; then
  curl -s -X DELETE "$BASE_URL/admin/users/$NEW_USER_ID/roles/customer" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('SUCCESS:', d.get('success'), '| MESSAGE:', d.get('message'))
u=d.get('data',{})
if u: print(f'  roles: {[r[\"name\"] for r in u.get(\"roles\",[])]}')
" 2>/dev/null
fi

# 11. Admin: Activate user
echo ""
echo ">>> 11. PATCH /admin/users/:id/activate"
if [ -n "$NEW_USER_ID" ]; then
  curl -s -X PATCH "$BASE_URL/admin/users/$NEW_USER_ID/activate" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('SUCCESS:', d.get('success'), '| MESSAGE:', d.get('message'))
u=d.get('data',{})
if u: print(f'  status: {u.get(\"status\")} | is_active: {u.get(\"is_active\")}')
" 2>/dev/null
fi

# 12. Admin: Suspend user
echo ""
echo ">>> 12. PATCH /admin/users/:id/suspend"
if [ -n "$NEW_USER_ID" ]; then
  curl -s -X PATCH "$BASE_URL/admin/users/$NEW_USER_ID/suspend" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('SUCCESS:', d.get('success'), '| MESSAGE:', d.get('message'))
u=d.get('data',{})
if u: print(f'  status: {u.get(\"status\")} | is_active: {u.get(\"is_active\")}')
" 2>/dev/null
fi

# 13. Admin: Delete user
echo ""
echo ">>> 13. DELETE /admin/users/:id"
if [ -n "$NEW_USER_ID" ]; then
  curl -s -X DELETE "$BASE_URL/admin/users/$NEW_USER_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('SUCCESS:', d.get('success'), '| MESSAGE:', d.get('message'))
" 2>/dev/null
fi

echo ""
echo "=========================================="
echo "  USER PROFILE ENDPOINTS (Self)"
echo "=========================================="

# 14. Get own profile
echo ""
echo ">>> 14. GET /public/users/profile"
if [ -n "$CUST_TOKEN" ]; then
  curl -s "$BASE_URL/public/users/profile" \
    -H "Authorization: Bearer $CUST_TOKEN" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('SUCCESS:', d.get('success'), '| MESSAGE:', d.get('message'))
u=d.get('data',{})
if u: print(f'  email: {u.get(\"email\")} | name: {u.get(\"full_name\")}')
" 2>/dev/null
else
  echo "SKIPPED: No customer token"
fi

# 15. Update profile
echo ""
echo ">>> 15. PUT /public/users/profile"
if [ -n "$CUST_TOKEN" ]; then
  curl -s -X PUT "$BASE_URL/public/users/profile" \
    -H "Authorization: Bearer $CUST_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"first_name":"Maria","preferred_language":"fr"}' | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('SUCCESS:', d.get('success'), '| MESSAGE:', d.get('message'))
u=d.get('data',{})
if u: print(f'  name: {u.get(\"full_name\")} | lang: {u.get(\"preferred_language\")}')
" 2>/dev/null
fi

# 16. Change password
echo ""
echo ">>> 16. PUT /public/users/password"
if [ -n "$CUST_TOKEN" ]; then
  curl -s -X PUT "$BASE_URL/public/users/password" \
    -H "Authorization: Bearer $CUST_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"current_password":"Password123!","new_password":"NewPass456!"}' | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('SUCCESS:', d.get('success'), '| MESSAGE:', d.get('message'))
" 2>/dev/null
fi

echo ""
echo "=========================================="
echo "  SETTINGS ENDPOINTS"
echo "=========================================="

# 17. Get settings
echo ""
echo ">>> 17. GET /public/users/settings"
if [ -n "$CUST_TOKEN" ]; then
  curl -s "$BASE_URL/public/users/settings" \
    -H "Authorization: Bearer $CUST_TOKEN" | python3 -m json.tool 2>/dev/null | head -15
fi

# 18. Update settings
echo ""
echo ">>> 18. PUT /public/users/settings"
if [ -n "$CUST_TOKEN" ]; then
  curl -s -X PUT "$BASE_URL/public/users/settings" \
    -H "Authorization: Bearer $CUST_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"email_promotions":true,"push_enabled":true}' | python3 -m json.tool 2>/dev/null | head -15
fi

# 19. Deactivate account
echo ""
echo ">>> 19. POST /public/users/deactivate"
if [ -n "$CUST_TOKEN" ]; then
  curl -s -X POST "$BASE_URL/public/users/deactivate" \
    -H "Authorization: Bearer $CUST_TOKEN" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('SUCCESS:', d.get('success'), '| MESSAGE:', d.get('message'))
" 2>/dev/null
fi

echo ""
echo "=========================================="
echo "  RBAC TESTS"
echo "=========================================="

# 20. Customer trying admin endpoint (should fail)
echo ""
echo ">>> 20. RBAC: Customer tries GET /admin/users (should fail)"
# Re-login customer (password was changed)
CUST_RESP2=$(curl -s -X POST "$BASE_URL/public/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"customer2@example.ch","password":"Password123!"}')
CUST_TOKEN2=$(echo "$CUST_RESP2" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('tokens',{}).get('access_token',''))" 2>/dev/null)
if [ -n "$CUST_TOKEN2" ]; then
  curl -s "$BASE_URL/admin/users" \
    -H "Authorization: Bearer $CUST_TOKEN2" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('SUCCESS:', d.get('success'), '| MESSAGE:', d.get('message'), '(expected: denied)')
" 2>/dev/null
fi

# 21. Unauthenticated access (should fail)
echo ""
echo ">>> 21. RBAC: No token - GET /public/users/profile (should fail)"
curl -s "$BASE_URL/public/users/profile" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('SUCCESS:', d.get('success'), '| MESSAGE:', d.get('message'), '(expected: unauthorized)')
" 2>/dev/null

echo ""
echo "=========================================="
echo "  VALIDATION TESTS"
echo "=========================================="

# 22. Invalid email on create
echo ""
echo ">>> 22. Validation: Create user with invalid email"
curl -s -X POST "$BASE_URL/admin/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"not-an-email","password":"short","first_name":"","last_name":"Test"}' | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('SUCCESS:', d.get('success'), '| MESSAGE:', d.get('message'))
if d.get('errors'):
  for e in d['errors']:
    print(f'  - {e.get(\"field\",\"?\")} : {e.get(\"message\",\"?\")}')
" 2>/dev/null

# 23. Invalid sort field
echo ""
echo ">>> 23. Validation: Invalid sort field"
curl -s "$BASE_URL/admin/users?sort=invalid_field" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('SUCCESS:', d.get('success'), '| MESSAGE:', d.get('message'))
" 2>/dev/null

echo ""
echo "=========================================="
echo "  ALL TESTS COMPLETE"
echo "=========================================="
