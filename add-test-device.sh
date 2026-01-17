#!/bin/bash

API_URL="http://localhost:3000/api/devices"
API_KEY="iteam-device-key"
DEVICE_ID="test-designer-001"

echo "Adding a new Designer device..."

curl -s -X PUT "$API_URL/$DEVICE_ID" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "name": "iMac Pro (Design)",
    "status": "online",
    "role": "designer",
    "metadata": {
      "cpu": "M3",
      "cpuUsage": 45,
      "memory": "32GB",
      "hostname": "design-studio-01",
      "version": "1.0.0"
    }
  }'

echo -e "\n\n✅ Designer Device added! Check the Team Topology page to see it in the 'Creative' cluster."
