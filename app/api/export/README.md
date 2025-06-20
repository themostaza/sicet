# Export API Endpoints

This directory contains GET API endpoints for exporting todolist data in various formats.

## Endpoints

### 1. `/api/export/data` - General Export Endpoint
Returns CSV data for todolist exports.

**Query Parameters:**
- `startDate` (required): Start date in YYYY-MM-DD format
- `endDate` (required): End date in YYYY-MM-DD format
- `deviceIds` (optional): Comma-separated list of device IDs to filter by
- `kpiIds` (optional): Comma-separated list of KPI IDs to filter by

**Example:**
```
GET /api/export/data?startDate=2024-01-01&endDate=2024-01-31&deviceIds=device1,device2&kpiIds=kpi1,kpi2
```

**Response:** CSV file download

---

### 2. `/api/export/csv` - CSV Export Endpoint
Returns CSV data with additional filename customization.

**Query Parameters:**
- `startDate` (required): Start date in YYYY-MM-DD format
- `endDate` (required): End date in YYYY-MM-DD format
- `deviceIds` (optional): Comma-separated list of device IDs to filter by
- `kpiIds` (optional): Comma-separated list of KPI IDs to filter by
- `filename` (optional): Custom filename prefix (default: "todolist-export")

**Example:**
```
GET /api/export/csv?startDate=2024-01-01&endDate=2024-01-31&filename=my-export
```

**Response:** CSV file download with filename like `my-export-2024-01-01-to-2024-01-31.csv`

---

### 3. `/api/export/json` - JSON Export Endpoint
Returns JSON data with structured format.

**Query Parameters:**
- `startDate` (required): Start date in YYYY-MM-DD format
- `endDate` (required): End date in YYYY-MM-DD format
- `deviceIds` (optional): Comma-separated list of device IDs to filter by
- `kpiIds` (optional): Comma-separated list of KPI IDs to filter by
- `filename` (optional): Custom filename prefix (default: "todolist-export")

**Example:**
```
GET /api/export/json?startDate=2024-01-01&endDate=2024-01-31
```

**Response:** JSON file with structure:
```json
{
  "success": true,
  "data": [
    {
      "id": "task-id",
      "date": "01/01/2024",
      "deviceId": "device-id",
      "deviceName": "Device Name",
      "kpiId": "kpi-id",
      "kpiName": "KPI Name",
      "status": "completed",
      "value": {...}
    }
  ],
  "count": 1,
  "exportInfo": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "deviceIds": ["device-id"],
    "kpiIds": ["kpi-id"],
    "exportedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 4. `/api/export/kpis-by-device` - Get KPIs by Device
Returns list of KPIs that have tasks for a specific device and date range.

**Query Parameters:**
- `startDate` (required): Start date in YYYY-MM-DD format
- `endDate` (required): End date in YYYY-MM-DD format
- `deviceId` (required): Device ID to get KPIs for

**Example:**
```
GET /api/export/kpis-by-device?startDate=2024-01-01&endDate=2024-01-31&deviceId=device1
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "kpi-id",
      "name": "KPI Name"
    }
  ],
  "count": 1
}
```

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200`: Success
- `400`: Bad request (missing or invalid parameters)
- `500`: Internal server error

Error responses include a JSON object with an `error` field describing the issue.

## Usage Examples

### Frontend JavaScript
```javascript
// Download CSV export
const downloadCSV = async () => {
  const response = await fetch('/api/export/csv?startDate=2024-01-01&endDate=2024-01-31');
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'export.csv';
  a.click();
  window.URL.revokeObjectURL(url);
};

// Get KPIs for a device
const getKPIs = async (deviceId) => {
  const response = await fetch(`/api/export/kpis-by-device?startDate=2024-01-01&endDate=2024-01-31&deviceId=${deviceId}`);
  const data = await response.json();
  return data.data;
};
```

### cURL Examples
```bash
# Download CSV
curl -o export.csv "http://localhost:3000/api/export/csv?startDate=2024-01-01&endDate=2024-01-31"

# Get JSON data
curl "http://localhost:3000/api/export/json?startDate=2024-01-01&endDate=2024-01-31"

# Get KPIs for device
curl "http://localhost:3000/api/export/kpis-by-device?startDate=2024-01-01&endDate=2024-01-31&deviceId=device1"
``` 