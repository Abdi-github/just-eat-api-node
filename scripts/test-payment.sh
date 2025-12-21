#!/bin/bash
# Payment Module Test Script
set -e

BASE=http://localhost:4005/api/v1
PASS=0
FAIL=0

pass() { PASS=$((PASS + 1)); echo "  ✅ $1"; }
fail() { FAIL=$((FAIL + 1)); echo "  ❌ $1: $2"; }

check() {
  local desc=$1 expected=$2 actual=$3
  if [ "$actual" = "$expected" ]; then pass "$desc"; else fail "$desc" "expected=$expected got=$actual"; fi
}

echo "🔐 Getting auth tokens..."
CT=$(curl -s -X POST $BASE/public/auth/login -H "Content-Type: application/json" -d '{"email":"customer1@example.ch","password":"Password123!"}' | jq -r '.data.tokens.access_token')
AT=$(curl -s -X POST $BASE/public/auth/login -H "Content-Type: application/json" -d '{"email":"admin@justeat-clone.ch","password":"Password123!"}' | jq -r '.data.tokens.access_token')
KT=$(curl -s -X POST $BASE/public/auth/login -H "Content-Type: application/json" -d '{"email":"courier1@justeat-clone.ch","password":"Password123!"}' | jq -r '.data.tokens.access_token')
echo ""

# ─── Test 1: Place order for TWINT payment ───
echo "📦 Test 1: Place order (TWINT)"
R=$(curl -s -X POST $BASE/public/orders -H "Content-Type: application/json" -H "Authorization: Bearer $CT" \
  -d '{"restaurant_id":"6993a9f77dcee68d585a0bed","order_type":"delivery","delivery_address_id":"6993a9f77dcee68d585a1500","payment_method":"twint","items":[{"menu_item_id":"6993a9f77dcee68d585a0eb5","quantity":1}]}')
check "Place order success" "true" "$(echo $R | jq -r .success)"
ORDER_TWINT=$(echo $R | jq -r '.data.id')
echo "  Order ID: $ORDER_TWINT"
echo ""

# ─── Test 2: Initiate TWINT payment ───
echo "💳 Test 2: Initiate TWINT payment"
R=$(curl -s -X POST $BASE/public/payments/initiate -H "Content-Type: application/json" -H "Authorization: Bearer $CT" \
  -d "{\"order_id\":\"$ORDER_TWINT\",\"payment_method\":\"twint\"}")
check "Initiate success" "true" "$(echo $R | jq -r .success)"
check "Status is PENDING" "PENDING" "$(echo $R | jq -r '.data.status')"
TWINT_TXN=$(echo $R | jq -r '.data.provider_transaction_id')
check "Has redirect_url" "true" "$(echo $R | jq -r 'if .data.redirect_url then "true" else "false" end')"
echo "  TXN: $TWINT_TXN"
echo ""

# ─── Test 3: Get payment status (customer) ───
echo "📊 Test 3: Payment status (before confirm)"
R=$(curl -s $BASE/public/payments/$ORDER_TWINT/status -H "Authorization: Bearer $CT")
check "Status GET success" "true" "$(echo $R | jq -r .success)"
check "Status is PENDING" "PENDING" "$(echo $R | jq -r '.data.status')"
echo ""

# ─── Test 4: Simulate TWINT confirmation ───
echo "✅ Test 4: Simulate TWINT confirmation"
R=$(curl -s -X POST "$BASE/public/payments/twint/simulate-confirm/$TWINT_TXN")
check "Simulate success" "true" "$(echo $R | jq -r .success)"
check "Status is COMPLETED" "COMPLETED" "$(echo $R | jq -r '.data.status')"
echo ""

# ─── Test 5: Get payment status (after confirm) ───
echo "📊 Test 5: Payment status (after confirm)"
R=$(curl -s $BASE/public/payments/$ORDER_TWINT/status -H "Authorization: Bearer $CT")
check "Status GET success" "true" "$(echo $R | jq -r .success)"
check "Status is COMPLETED" "COMPLETED" "$(echo $R | jq -r '.data.status')"
echo ""

# ─── Test 6: Place & initiate PostFinance ───
echo "📦 Test 6: PostFinance flow"
R=$(curl -s -X POST $BASE/public/orders -H "Content-Type: application/json" -H "Authorization: Bearer $CT" \
  -d '{"restaurant_id":"6993a9f77dcee68d585a0bed","order_type":"pickup","payment_method":"postfinance","items":[{"menu_item_id":"6993a9f77dcee68d585a0eb6","quantity":1}]}')
ORDER_PF=$(echo $R | jq -r '.data.id')
check "PF order placed" "true" "$(echo $R | jq -r .success)"

R=$(curl -s -X POST $BASE/public/payments/initiate -H "Content-Type: application/json" -H "Authorization: Bearer $CT" \
  -d "{\"order_id\":\"$ORDER_PF\",\"payment_method\":\"postfinance\"}")
check "PF payment initiated" "true" "$(echo $R | jq -r .success)"
PF_TXN=$(echo $R | jq -r '.data.provider_transaction_id')
check "PF has redirect_url" "true" "$(echo $R | jq -r 'if .data.redirect_url then "true" else "false" end')"

R=$(curl -s -X POST "$BASE/public/payments/postfinance/simulate-confirm/$PF_TXN")
check "PF confirm success" "true" "$(echo $R | jq -r .success)"
check "PF status COMPLETED" "COMPLETED" "$(echo $R | jq -r '.data.status')"
echo ""

# ─── Test 7: Cash payment flow ───
echo "💵 Test 7: Cash payment flow"
R=$(curl -s -X POST $BASE/public/orders -H "Content-Type: application/json" -H "Authorization: Bearer $CT" \
  -d '{"restaurant_id":"6993a9f77dcee68d585a0bed","order_type":"delivery","delivery_address_id":"6993a9f77dcee68d585a1500","payment_method":"cash","items":[{"menu_item_id":"6993a9f77dcee68d585a0eb5","quantity":2}]}')
ORDER_CASH=$(echo $R | jq -r '.data.id')
check "Cash order placed" "true" "$(echo $R | jq -r .success)"

R=$(curl -s -X POST $BASE/public/payments/initiate -H "Content-Type: application/json" -H "Authorization: Bearer $CT" \
  -d "{\"order_id\":\"$ORDER_CASH\",\"payment_method\":\"cash\"}")
check "Cash payment initiated" "true" "$(echo $R | jq -r .success)"
check "Cash status PENDING" "PENDING" "$(echo $R | jq -r '.data.status')"

R=$(curl -s -X POST "$BASE/public/payments/$ORDER_CASH/cash/confirm" -H "Authorization: Bearer $KT")
check "Cash confirm success" "true" "$(echo $R | jq -r .success)"
check "Cash status COMPLETED" "COMPLETED" "$(echo $R | jq -r '.data.status')"
echo ""

# ─── Test 8: Admin list payments ───
echo "⚙️ Test 8: Admin list payments"
R=$(curl -s "$BASE/admin/payments" -H "Authorization: Bearer $AT")
check "Admin list success" "true" "$(echo $R | jq -r .success)"
check "Has payments" "true" "$(echo $R | jq -r 'if (.data | length) > 0 then "true" else "false" end')"
echo "  Total payments: $(echo $R | jq -r '.meta.total')"
echo ""

# ─── Test 9: Admin get payment by ID ───
echo "⚙️ Test 9: Admin get payment by ID"
PAYMENT_ID=$(echo $R | jq -r '.data[0].id')
R=$(curl -s "$BASE/admin/payments/$PAYMENT_ID" -H "Authorization: Bearer $AT")
check "Admin get by ID success" "true" "$(echo $R | jq -r .success)"
check "Has payment data" "true" "$(echo $R | jq -r 'if .data.id then "true" else "false" end')"
echo ""

# ─── Test 10: Admin refund (TWINT completed order) ───
echo "💰 Test 10: Admin refund"
R=$(curl -s -X POST "$BASE/admin/payments/$ORDER_TWINT/refund" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $AT" \
  -d '{"reason":"Customer complaint"}')
check "Refund success" "true" "$(echo $R | jq -r .success)"
echo "  Refund status: $(echo $R | jq -r '.data.status')"
echo ""

# ─── Test 11: Duplicate payment prevention ───
echo "🚫 Test 11: Duplicate payment prevention"
R=$(curl -s -X POST $BASE/public/payments/initiate -H "Content-Type: application/json" -H "Authorization: Bearer $CT" \
  -d "{\"order_id\":\"$ORDER_TWINT\",\"payment_method\":\"twint\"}")
check "Duplicate blocked" "false" "$(echo $R | jq -r .success)"
echo ""

# ─── Test 12: Validation errors ───
echo "🔒 Test 12: Validation errors"
R=$(curl -s -X POST $BASE/public/payments/initiate -H "Content-Type: application/json" -H "Authorization: Bearer $CT" \
  -d '{"payment_method":"twint"}')
check "Missing order_id blocked" "false" "$(echo $R | jq -r .success)"

R=$(curl -s -X POST $BASE/public/payments/initiate -H "Content-Type: application/json" -H "Authorization: Bearer $CT" \
  -d '{"order_id":"invalid","payment_method":"twint"}')
check "Invalid order_id blocked" "false" "$(echo $R | jq -r .success)"

R=$(curl -s -X POST $BASE/public/payments/initiate -H "Content-Type: application/json" -H "Authorization: Bearer $CT" \
  -d '{"order_id":"6993a9f77dcee68d585a0bed","payment_method":"bitcoin"}')
check "Invalid payment method blocked" "false" "$(echo $R | jq -r .success)"
echo ""

# ─── Test 13: Unauthorized access ───
echo "🔒 Test 13: Unauthorized access"
R=$(curl -s $BASE/public/payments/$ORDER_TWINT/status)
check "No token → 401" "false" "$(echo $R | jq -r .success)"

R=$(curl -s "$BASE/admin/payments" -H "Authorization: Bearer $CT")
check "Customer → admin blocked" "false" "$(echo $R | jq -r .success)"
echo ""

# ─── Test 14: Webhook endpoints exist ───
echo "🔗 Test 14: Webhook endpoints"
R=$(curl -s -X POST http://localhost:4005/api/v1/webhooks/payments/stripe -H "Content-Type: application/json" -d '{}')
check "Stripe webhook reachable" "Missing stripe-signature header" "$(echo $R | jq -r '.message')"

R=$(curl -s -X POST http://localhost:4005/api/v1/webhooks/payments/twint -H "Content-Type: application/json" -d '{}')
check "TWINT webhook reachable" "true" "$(echo $R | jq -r .success)"
echo ""

# ─── Summary ───
echo "═══════════════════════════════════════"
echo "  Results: ✅ $PASS passed, ❌ $FAIL failed"
echo "═══════════════════════════════════════"
