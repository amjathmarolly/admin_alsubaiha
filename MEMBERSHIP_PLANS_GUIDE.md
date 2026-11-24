# Membership Plans System - Complete Guide

## Overview

The membership plans system automatically assigns customers to loyalty tiers based on their total purchase history. Each tier provides increasing discounts to reward customer loyalty and encourage repeat purchases.

## 5-Tier Structure

### 1. Blue (Entry Level)
- **Purchase Range:** 0 - 49,999.99 AED
- **Discount:** 0%
- **Color:** Blue
- **Description:** Entry level membership
- **Target:** New customers and small purchasers

### 2. Silver (Rising)
- **Purchase Range:** 50,000 - 99,999.99 AED
- **Discount:** 10%
- **Color:** Slate
- **Description:** Silver tier membership
- **Target:** Growing customer segment

### 3. Gold (Mid-Tier)
- **Purchase Range:** 100,000 - 199,999.99 AED
- **Discount:** 15%
- **Color:** Yellow
- **Description:** Gold tier membership
- **Target:** Established customers

### 4. Platinum (Premium)
- **Purchase Range:** 200,000 - 499,999.99 AED
- **Discount:** 20%
- **Color:** Purple
- **Description:** Platinum tier membership
- **Target:** Premium customers

### 5. Diamond (Elite)
- **Purchase Range:** 500,000+ AED
- **Discount:** 25%
- **Color:** Pink
- **Description:** Diamond tier membership
- **Target:** VIP/Elite customers

## How It Works

### Automatic Assignment
1. Customer makes a purchase
2. Order is completed and total_spent is updated
3. System automatically assigns appropriate tier based on cumulative purchases
4. Customer receives tier benefits on next order

### Tier Progression
```
New Customer (Blue) 
    ↓ (purchases ≥ 50k AED)
Silver Member (10% discount)
    ↓ (purchases ≥ 100k AED)
Gold Member (15% discount)
    ↓ (purchases ≥ 200k AED)
Platinum Member (20% discount)
    ↓ (purchases ≥ 500k AED)
Diamond Member (25% discount)
```

### Discount Application
- Discounts are automatically applied at checkout based on customer's current tier
- Discounts are calculated on subtotal (before shipping and tax)
- Integration with order processing system

## Admin Interface

### Accessing Membership Plans
1. Go to Dashboard → Sidebar → Inventory section
2. Click "Membership Plans"
3. View all tiers and their configurations

### Managing Plans

#### View Plans
- See all membership tiers in a table format
- View purchase ranges, discount percentages, and status
- Color-coded tier indicators
- Statistics dashboard showing:
  - Total plans
  - Active plans
  - Maximum discount percentage
  - Total tier count

#### Add New Plan
1. Click "+ Add Plan" button
2. Fill in plan details:
   - Plan Name (required)
   - Tier Level (required, unique)
   - Description (optional)
   - Min Purchase Amount (required)
   - Max Purchase Amount (optional, leave empty for unlimited)
   - Discount Percentage (required, 0-100)
   - Color (for UI display)
3. Click "Create Plan"

#### Edit Plan
1. Click the plan row's dropdown menu
2. Select "Edit"
3. Update any details
4. Click "Update Plan"

#### Activate/Deactivate
1. Use the toggle switch in the Status column
2. Active plans are used for tier assignment
3. Inactive plans are excluded from calculations

#### Delete Plan
1. Click the plan row's dropdown menu
2. Select "Delete"
3. Confirm deletion
4. Plan can only be deleted if no customers are assigned to it

## API Reference

### Get All Membership Plans
```
GET /api/membership-plans

Response:
{
  "success": true,
  "data": [
    {
      "id": "plan-1",
      "name": "Blue",
      "tier_level": 1,
      "min_purchase": 0,
      "max_purchase": 49999.99,
      "discount_percentage": 0,
      "color": "blue",
      "status": "active"
    },
    ...
  ],
  "count": 5
}
```

### Create Membership Plan
```
POST /api/membership-plans

Request:
{
  "name": "Gold",
  "tier_level": 3,
  "description": "Gold tier membership",
  "min_purchase": 100000,
  "max_purchase": 199999.99,
  "discount_percentage": 15,
  "color": "yellow",
  "icon": "crown"
}

Response:
{
  "success": true,
  "data": { ...plan details... }
}
```

### Update Membership Plan
```
PUT /api/membership-plans/[id]

Request: Same as create, with updates

Response:
{
  "success": true,
  "message": "Membership plan updated successfully"
}
```

### Delete Membership Plan
```
DELETE /api/membership-plans/[id]

Response:
{
  "success": true,
  "message": "Membership plan deleted successfully"
}
```

### Assign Tier to Customer
```
POST /api/membership-plans/assign/[customerId]

Response:
{
  "success": true,
  "data": {
    "customerId": "cust-123",
    "totalSpent": 125000,
    "membershipTier": {
      "id": "plan-3",
      "name": "Gold",
      "tierLevel": 3,
      "discountPercentage": 15,
      "minPurchase": 100000,
      "maxPurchase": 199999.99
    }
  }
}
```

### Get Customer's Current Tier
```
GET /api/membership-plans/assign/[customerId]

Response:
{
  "success": true,
  "data": {
    "customerId": "cust-123",
    "name": "John Doe",
    "totalSpent": 125000,
    "membershipTier": {
      "id": "plan-3",
      "name": "Gold",
      "level": 3,
      "discountPercentage": 15,
      "minPurchase": 100000,
      "maxPurchase": 199999.99,
      "color": "yellow"
    }
  }
}
```

### Bulk Recalculate Memberships
```
PUT /api/membership-plans/recalculate

Response:
{
  "success": true,
  "data": {
    "totalCustomers": 250,
    "updated": 248,
    "errors": 2
  }
}
```

## Integration Guide

### With Order Processing
When order is completed:
```typescript
// After order is confirmed
const result = await fetch(`/api/membership-plans/assign/${customerId}`, {
  method: "POST"
})
// Customer tier is automatically updated
```

### In Customer Dashboard
Display customer's current tier:
```typescript
const response = await fetch(`/api/membership-plans/assign/${customerId}`)
const { data } = await response.json()
console.log(data.membershipTier.name) // "Gold"
console.log(data.membershipTier.discountPercentage) // 15
```

### Bulk Operations
Recalculate all customers' memberships:
```typescript
const response = await fetch("/api/membership-plans/recalculate", {
  method: "PUT"
})
const { data } = await response.json()
console.log(`Updated ${data.updated} customers`)
```

## Database Schema

### membership_plans Table
```sql
CREATE TABLE membership_plans (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  tier_level INT NOT NULL UNIQUE,
  description TEXT,
  min_purchase DECIMAL(12, 2) NOT NULL,
  max_purchase DECIMAL(12, 2),
  discount_percentage DECIMAL(5, 2) NOT NULL,
  color VARCHAR(20),
  icon VARCHAR(50),
  status ENUM('active', 'inactive'),
  created_at DATETIME,
  updated_at DATETIME
)
```

### customers Table Updates
```sql
ALTER TABLE customers ADD COLUMN membership_tier_id VARCHAR(36);
ALTER TABLE customers ADD COLUMN last_membership_recalculated_at DATETIME;
ALTER TABLE customers ADD FOREIGN KEY (membership_tier_id) 
  REFERENCES membership_plans(id);
```

## Utility Functions

### lib/membership-utils.ts

#### assignMembershipTier(customerId)
Automatically assign appropriate tier based on total_spent.

#### getCustomerMembershipTier(customerId)
Fetch customer's current tier details.

#### getAllActiveMembershipTiers()
Get all active tiers for dropdown/selection.

#### bulkAssignMembershipTiers()
Recalculate tiers for all customers.

#### calculateMembershipTierForAmount(totalSpent)
Preview what tier a customer would get for given amount.

## Usage Examples

### Check Customer's Eligibility for Next Tier
```typescript
import { getCustomerMembershipTier, calculateMembershipTierForAmount } from "@/lib/membership-utils"

const current = await getCustomerMembershipTier(customerId)
const nextTier = await calculateMembershipTierForAmount(current.total_spent + 1)

const spentToNextTier = nextTier?.min_purchase - current.total_spent
console.log(`Spend ${spentToNextTier} AED more to reach next tier`)
```

### Auto-Assign After Order
```typescript
import { assignMembershipTier } from "@/lib/membership-utils"

// After order is paid/confirmed
const result = await assignMembershipTier(customerId)
console.log(`Customer promoted to ${result.membershipTierName}`)
```

### Get Discount for Customer
```typescript
import { getCustomerMembershipTier } from "@/lib/membership-utils"

const tier = await getCustomerMembershipTier(customerId)
const discountAmount = orderTotal * (tier.discount_percentage / 100)
console.log(`Apply ${tier.discount_percentage}% discount: ${discountAmount} AED`)
```

## Testing

### Via API
```bash
# Get all plans
curl http://localhost:3000/api/membership-plans

# Create plan
curl -X POST http://localhost:3000/api/membership-plans \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","tier_level":6,"min_purchase":0,"discount_percentage":5}'

# Assign tier to customer
curl -X POST http://localhost:3000/api/membership-plans/assign/[customerId]

# Bulk recalculate
curl -X PUT http://localhost:3000/api/membership-plans/recalculate
```

### Via Dashboard
1. Navigate to Membership Plans page
2. View default tiers (Blue, Silver, Gold, Platinum, Diamond)
3. Try toggling status
4. Try editing a tier
5. Verify changes in database

## Troubleshooting

### Customer Not Being Assigned Tier
1. Check if customer has total_spent > 0
2. Verify membership plans exist and are active
3. Check logs: `[v0] Assigning membership tier`
4. Manually trigger: POST /api/membership-plans/assign/[customerId]

### Wrong Tier Being Assigned
1. Verify purchase ranges in membership plans
2. Check customer's total_spent value
3. Ensure no overlapping tiers
4. Review discount percentages

### Cannot Delete Tier
1. Check if any customers are assigned to it
2. Must manually reassign customers first
3. Or use bulk recalculation to reassign automatically

## Future Enhancements

- Tier-specific promotions and offers
- Anniversary bonuses for membership
- Tier upgrade notifications
- Historical tier progression tracking
- Referral tier bonuses
- Seasonal membership adjustments
- Integration with email campaigns for tier status
- Mobile app tier display
- Tier expiration after inactivity
