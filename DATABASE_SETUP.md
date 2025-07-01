# Database Setup Guide

This guide explains how to set up the MySQL database for the CxAlloy Equipment Mapping application.

## Prerequisites

- MySQL 8.0 or later running locally
- Node.js application with database integration
- Access to the local CxAlloy development database

## Environment Configuration

Create a `.env.local` file in the project root with the following configuration:

```bash
# Database Configuration for CxAlloy Local Development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=cxalloy_dev

# Database Connection Pool Settings (optional)
DB_CONNECTION_LIMIT=10
DB_ACQUIRE_TIMEOUT=60000
DB_TIMEOUT=60000
```

### Configuration Examples

**Local MySQL with default settings:**
```bash
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=cxalloy_dev
```

**Docker MySQL container:**
```bash
DB_HOST=localhost
DB_PORT=3306
DB_USER=cxalloy_user
DB_PASSWORD=cxalloy_password
DB_NAME=cxalloy_development
```

**Remote MySQL server:**
```bash
DB_HOST=192.168.1.100
DB_PORT=3306
DB_USER=cxalloy_app
DB_PASSWORD=secure_password
DB_NAME=cxalloy_mapping
```

## Database Initialization

The application will automatically create the required tables when first connecting. You can also manually initialize the database using the API endpoints.

### Option 1: Automatic Initialization
1. Start the application with correct database configuration
2. The application will attempt to create tables on first use

### Option 2: Manual Initialization via API
1. Start the application
2. Test database connection:
   ```bash
   curl http://localhost:3000/api/database
   ```

3. Initialize tables:
   ```bash
   curl -X POST http://localhost:3000/api/database \
     -H "Content-Type: application/json" \
     -d '{"action": "initialize"}'
   ```

## Database Schema

The application creates three main tables:

### 1. `equipment_mapping`
Stores processed equipment data with classification and metadata.

**Key Fields:**
- `id` - Unique equipment identifier
- `original_file_id` - Reference to source file
- `equipment_name` - Processed equipment name
- `equipment_type` - Classified equipment type (enum)
- `haystack_tags` - Generated Haystack tags (JSON)
- `metadata` - Processing metadata (JSON)

### 2. `point_mapping`
Stores normalized point data linked to equipment.

**Key Fields:**
- `id` - Unique point identifier
- `equipment_id` - Foreign key to equipment_mapping
- `original_name` - Original point name from file
- `normalized_name` - Processed/normalized name
- `category` - Point category (SENSOR, COMMAND, etc.)
- `data_type` - Point data type (ANALOG, BINARY, etc.)
- `haystack_tags` - Generated Haystack tags (JSON)

### 3. `mapping_sessions`
Tracks batch processing sessions for file uploads.

**Key Fields:**
- `id` - Unique session identifier
- `session_name` - Human-readable session name
- `total_files` - Number of files in session
- `status` - Processing status (processing, completed, failed)

## API Endpoints

### Database Status
- **GET** `/api/database` - Get database connection status and table information

### Database Actions
- **POST** `/api/database` - Perform database actions

**Available Actions:**
```bash
# Test connection
curl -X POST http://localhost:3000/api/database \
  -H "Content-Type: application/json" \
  -d '{"action": "test"}'

# Initialize tables
curl -X POST http://localhost:3000/api/database \
  -H "Content-Type: application/json" \
  -d '{"action": "initialize"}'

# Cleanup old data (30+ days)
curl -X POST http://localhost:3000/api/database \
  -H "Content-Type: application/json" \
  -d '{"action": "cleanup", "options": {"cleanupDays": 30}}'

# Reset database (DANGER: deletes all data)
curl -X POST http://localhost:3000/api/database \
  -H "Content-Type: application/json" \
  -d '{"action": "reset", "options": {"force": true}}'
```

## Troubleshooting

### Connection Issues

1. **"Connection refused"**
   - Verify MySQL is running: `mysql -u root -p`
   - Check host/port in `.env.local`

2. **"Access denied"**
   - Verify username/password in `.env.local`
   - Ensure user has CREATE, INSERT, SELECT, UPDATE, DELETE privileges

3. **"Database does not exist"**
   - Create database manually: `CREATE DATABASE cxalloy_dev;`
   - Or update `DB_NAME` to existing database

### Permission Issues

Grant required permissions to database user:
```sql
GRANT CREATE, INSERT, SELECT, UPDATE, DELETE, INDEX, ALTER 
ON cxalloy_dev.* 
TO 'your_user'@'localhost';
FLUSH PRIVILEGES;
```

### Performance Tuning

For large datasets, consider:
- Increase `DB_CONNECTION_LIMIT` (default: 10)
- Adjust MySQL `max_connections` setting
- Monitor query performance in application logs

## Integration with CxAlloy

The mapping tables are designed to integrate with the existing CxAlloy database structure:

1. **Equipment Mapping**: Links processed equipment to CxAlloy equipment records
2. **Point Mapping**: Provides normalized point data for CxAlloy point integration
3. **Session Tracking**: Enables batch import workflows

Future integration steps will include:
- Mapping CxAlloy equipment IDs to processed equipment
- Synchronizing point data with CxAlloy point records
- Building import/export workflows for CxAlloy integration

## Maintenance

### Regular Cleanup
```bash
# Clean up data older than 60 days
curl -X POST http://localhost:3000/api/database \
  -H "Content-Type: application/json" \
  -d '{"action": "cleanup", "options": {"cleanupDays": 60}}'
```

### Backup Database
```bash
mysqldump -u root -p cxalloy_dev > backup_$(date +%Y%m%d).sql
```

### Monitor Database Size
Check table sizes regularly:
```sql
SELECT 
  table_name,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.tables 
WHERE table_schema = 'cxalloy_dev'
ORDER BY (data_length + index_length) DESC;
``` 