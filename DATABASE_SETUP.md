# Database Setup Guide - Membership Plans

## Quick Setup

The membership plans database tables and default tiers can be set up automatically with a single API call.

### Method 1: Using the API Endpoint (Recommended)

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Call the setup endpoint in your browser or with curl:**
   ```
   POST http://localhost:3000/api/setup/membership-plans
   ```

   Using curl:
   ```bash
   curl -X POST http://localhost:3000/api/setup/membership-plans
   ```

3. **Check the response:**
   ```json
   {
     "success": true,
     "message": "Membership plans table and default tiers set up successfully"
   }
   ```

4. **Verify in console:**
   You should see logs like:
   ```
   [Setup] Connected to MySQL
   [Setup] Creating membership_plans table...
   [Setup] membership_plans table created
   [Setup] Updating customers table...
   [Setup] Added membership_tier_id column
   [Setup] Added last_membership_recalculated_at column
   [Setup] Added foreign key constraint
   [Setup] Added index on membership_tier_id
   [Setup] Inserting default membership tiers...
   [Setup] Default membership tiers inserted
   [Setup] SUCCESS: 5 membership tiers now in database
   ```

### Method 2: Using the Setup Script Directly

1. **Run the setup script:**
   ```bash
   node --env-file-if-exists=/vercel/share/.env.project scripts/setup-membership-plans.js
   ```

2. **Check output for success message**

## What Gets Created

### 1. membership_plans Table

Table structure:
```sql
CREATE TABLE membership_plans (
  id VARCHAR(36) PRIMARY KEY,           -- UUID
  name VARCHAR(100) NOT NULL UNIQUE,    -- Tier name (Blue, Silver, etc.)
  tier_level INT NOT NULL UNIQUE,       -- 1-5 for ordering
  description TEXT,                     -- Tier description
  min_purchase DECIMAL(12, 2),          -- Minimum purchase amount
  max_purchase DECIMAL(12, 2),          -- Maximum purchase amount (NULL for unlimited)
  discount_percentage DECIMAL(5, 2),    -- Discount % (0-25)
  color VARCHAR(20),                    -- Color for UI (blue, slate, yellow, etc.)
  icon VARCHAR(50),                     -- Icon name (droplet, gem, crown, etc.)
  status ENUM('active','inactive'),     -- Active/inactive status
  created_at DATETIME,                  -- Creation timestamp
  updated_at DATETIME                   -- Update timestamp
)
```

### 2. customers Table Updates

Added columns:
- `membership_tier_id` - Foreign key to membership_plans(id)
- `last_membership_recalculated_at` - Timestamp of last tier calculation

Added indexes and constraints:
- Foreign key constraint (ON DELETE SET NULL)
- Index on membership_tier_id for fast lookups

### 3. Default Membership Tiers

Five pre-configured tiers are automatically inserted:

| Tier | Level | Min Purchase | Max Purchase | Discount |
|------|-------|--------------|--------------|----------|
| Blue | 1 | 0 AED | 49,999.99 AED | 0% |
| Silver | 2 | 50,000 AED | 99,999.99 AED | 10% |
| Gold | 3 | 100,000 AED | 199,999.99 AED | 15% |
| Platinum | 4 | 200,000 AED | 499,999.99 AED | 20% |
| Diamond | 5 | 500,000+ AED | Unlimited | 25% |

## Verifying the Setup

### Option 1: Check via MySQL Client

```sql
-- Connect to your MySQL database
mysql -h MYSQL_HOST -u MYSQL_USER -p MYSQL_DATABASE

-- Verify membership_plans table
SELECT * FROM membership_plans;

-- Verify customers table updates
SHOW COLUMNS FROM customers LIKE 'membership_%';
```

### Option 2: Check via API

```bash
# Get all membership plans
curl http://localhost:3000/api/membership-plans

# Get customer's membership tier
curl http://localhost:3000/api/membership-plans/assign/[customerId]
```

### Option 3: Check via Dashboard

1. Navigate to: http://localhost:3000/dashboard
2. Go to: Inventory → Membership Plans
3. You should see all 5 tiers listed with their details

## Troubleshooting

### Error: "Connection lost"

**Cause:** MySQL server not running or connection failed

**Solution:**
- Verify MySQL is running
- Check MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD in environment
- Ensure MYSQL_DATABASE exists

```bash
# Check environment variables
env | grep MYSQL
```

### Error: "Table already exists"

**Cause:** Setup was already run

**Solution:** This is expected! The setup script is idempotent and safe to run multiple times. If you need a fresh setup:

```sql
-- Drop the membership_plans table (WARNING: deletes all data)
DROP TABLE IF EXISTS membership_plans;

-- Then run setup again
```

### Error: "Foreign key constraint failed"

**Cause:** Table structure mismatch

**Solution:** 
```sql
-- Check if column exists
SHOW COLUMNS FROM customers;

-- Check constraints
SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_NAME = 'customers' AND COLUMN_NAME = 'membership_tier_id';
```

### Error: "Column membership_tier_id already exists"

**Cause:** This column was already added in a previous setup

**Solution:** This is normal. The setup script handles this gracefully and continues. You can safely ignore this message.

## Database Structure

```
customers
├── id (PK)
├── name
├── email
├── phone
├── total_spent
├── membership_tier_id (FK) ──────────┐
├── last_membership_recalculated_at   │
└── ...                               │
                                      │
                    membership_plans ◄─┘
                    ├── id (PK)
                    ├── name
                    ├── tier_level
                    ├── min_purchase
                    ├── max_purchase
                    ├── discount_percentage
                    ├── color
                    ├── icon
                    ├── status
                    ├── created_at
                    └── updated_at
```

## How It Works

### Automatic Tier Assignment

When a customer's membership is recalculated:

1. **Calculate Total Spent:** Sum of all orders from the customer
2. **Find Matching Tier:** Match total_spent to appropriate tier range
3. **Update Customer:** Set membership_tier_id to the matching tier
4. **Record Timestamp:** Update last_membership_recalculated_at

Example flow:
```
Customer Ahmed
├── Order 1: 15,000 AED
├── Order 2: 30,000 AED
├── Order 3: 10,000 AED
└── Total: 55,000 AED
    └── Matched to: Silver (50k-100k)
    └── Discount: 10%
```

### Recalculating Tiers

Tiers can be recalculated anytime:

```bash
# Recalculate for specific customer
POST /api/membership-plans/assign/[customerId]

# Bulk recalculate all customers
PUT /api/membership-plans/recalculate
```

## Next Steps After Setup

1. **Access Admin Dashboard:**
   - Navigate to: http://localhost:3000/dashboard
   - Go to: Inventory → Membership Plans
   - Verify all 5 tiers are visible

2. **Test the System:**
   - Create a test customer
   - Place test orders
   - Check tier assignment

3. **Integrate with Orders:**
   - Call tier assignment when order completes
   - Apply discount percentage to orders

4. **Monitor Usage:**
   - Check API endpoints for tier details
   - View customer dashboard for tier information

## Additional Resources

- See MEMBERSHIP_PLANS_GUIDE.md for complete system documentation
- See membership plans API endpoints for integration examples
- Check app/api/membership-plans/* for API implementation

## Support

If you encounter issues:

1. Check the console logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure MySQL is running and accessible
4. Review the troubleshooting section above
5. Check database schema manually if needed
